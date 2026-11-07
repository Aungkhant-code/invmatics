"""
Invmatics Systems — account provisioning

Every Clerk user needs an organisation + users row before the API can serve them.
The Clerk signup webhook normally creates them, but webhooks fail, arrive late, or get
configured after the first signups. provision_user() is the single implementation of
"make sure this Clerk user has an organisation". It is:

  idempotent  — safe to call any number of times for the same user
  race-safe   — the dashboard fires several requests at once; concurrent calls for the
                same user converge on ONE organisation (the loser's org is deleted)
  non-lossy   — Clerk is asked for the user's details BEFORE anything is written, so a
                Clerk outage never leaves a half-made account behind

Called from:
    auth.require_auth          when a verified token has no org_id claim
    auth_webhook (user.created) so the webhook and the API can never disagree
"""

from __future__ import annotations

import re
import secrets
from datetime import datetime, timezone
from typing import Optional

import httpx

from database import db_admin
from config import CLERK_SECRET_KEY
from org_sync import PLACEHOLDER_SUFFIX, apply_org_name, clerk_org_for_user

CLERK_API = "https://api.clerk.com/v1"

_ROLES = {"admin", "manager", "sales", "warehouse", "finance"}

# (clerk_user_id, org_id, role) triples already written to Clerk by this process,
# so a burst of requests doesn't PATCH Clerk once per request.
_synced: set = set()


# ── Clerk helpers ──────────────────────────────────────────────────

def _clerk_headers() -> dict:
    return {
        "Authorization": f"Bearer {CLERK_SECRET_KEY}",
        "Content-Type":  "application/json",
    }


def fetch_clerk_user(clerk_user_id: str) -> dict:
    r = httpx.get(f"{CLERK_API}/users/{clerk_user_id}", headers=_clerk_headers(), timeout=10)
    if r.status_code != 200:
        raise RuntimeError(f"Clerk user lookup failed: {r.status_code} {r.text[:200]}")
    return r.json()


def sync_clerk_metadata(clerk_user_id: str, org_id: str, role: str) -> bool:
    """
    Write org_id + role into the user's Clerk public_metadata so the `invmatics`
    JWT template can embed them. Uses the merge endpoint, so other metadata
    survives. Best effort: returns False instead of raising.
    """
    key = (clerk_user_id, str(org_id), role)
    if key in _synced:
        return True
    try:
        r = httpx.patch(
            f"{CLERK_API}/users/{clerk_user_id}/metadata",
            headers=_clerk_headers(),
            json={"public_metadata": {"org_id": str(org_id), "role": role}},
            timeout=10,
        )
        if r.status_code not in (200, 201):
            raise RuntimeError(f"{r.status_code} {r.text[:200]}")
        _synced.add(key)
        return True
    except Exception as e:
        print(f"Warning: couldn't write Clerk metadata for {clerk_user_id}: {e}")
        return False


def _primary_email(clerk_user: dict) -> str:
    addrs = clerk_user.get("email_addresses") or []
    primary = clerk_user.get("primary_email_address_id")
    for a in addrs:
        if a.get("id") == primary and a.get("email_address"):
            return a["email_address"]
    return addrs[0].get("email_address", "") if addrs else ""


def _full_name(clerk_user: dict, email: str) -> str:
    name = f"{clerk_user.get('first_name') or ''} {clerk_user.get('last_name') or ''}".strip()
    return name or (email.split("@")[0] if email else "")


# ── Database helpers ───────────────────────────────────────────────

def _slugify(text: str) -> str:
    slug = re.sub(r"[^\w\s-]", "", (text or "").lower().strip())
    slug = re.sub(r"[\s_-]+", "-", slug)
    return re.sub(r"^-+|-+$", "", slug)[:50]


def _slug_taken(slug: str) -> bool:
    res = db_admin.table("organisations").select("id").eq("slug", slug).limit(1).execute()
    return bool(res.data)


def _invited_membership(meta: Optional[dict]):
    """
    (org_id, role) when this Clerk user was INVITED to an existing organisation.
    Invitations carry {org_id, role} in public_metadata, which only our backend can set
    (users can't edit public_metadata themselves), so it can be trusted. The organisation
    must still exist.
    """
    meta = meta or {}
    org_id, role = meta.get("org_id"), meta.get("role")
    if not org_id or role not in _ROLES:
        return None
    res = db_admin.table("organisations").select("id").eq("id", str(org_id)).limit(1).execute()
    return (res.data[0]["id"], role) if res.data else None


def _find_user(clerk_user_id: str) -> Optional[dict]:
    res = (
        db_admin.table("users")
        .select("id, org_id, role, is_active")
        .eq("clerk_user_id", clerk_user_id)
        .limit(1)
        .execute()
    )
    return res.data[0] if res.data else None


def _discard_org(org_id: str) -> None:
    """Remove an organisation we created but lost the race for (children cascade)."""
    try:
        db_admin.table("organisations").delete().eq("id", org_id).execute()
    except Exception as e:
        print(f"Warning: couldn't remove orphan organisation {org_id}: {e}")


def _result(row: dict, created: bool) -> dict:
    return {
        "org_id":    row["org_id"],
        "role":      row["role"],
        "user_id":   row["id"],
        "is_active": row.get("is_active", True),
        "created":   created,
    }


# ── Public API ─────────────────────────────────────────────────────

def provision_user(
    clerk_user_id: str,
    *,
    email: Optional[str] = None,
    full_name: Optional[str] = None,
    public_metadata: Optional[dict] = None,
) -> dict:
    """
    Ensure the Clerk user has an organisation and a users row.

    Returns {"org_id", "role", "user_id", "is_active", "created"}.
    `created` is True only for the call that actually made the account.
    """
    if not clerk_user_id:
        raise ValueError("clerk_user_id is required")

    # 1. Already provisioned (webhook ran, or an earlier request did)?
    existing = _find_user(clerk_user_id)
    if existing:
        if existing.get("is_active", True):
            sync_clerk_metadata(clerk_user_id, existing["org_id"], existing["role"])
        return _result(existing, False)

    # 2. Ask Clerk who this is — BEFORE writing anything.
    if not (email and full_name) or public_metadata is None:
        cu = fetch_clerk_user(clerk_user_id)
        email = email or _primary_email(cu)
        full_name = full_name or _full_name(cu, email)
        if public_metadata is None:
            public_metadata = cu.get("public_metadata") or {}
    full_name = full_name or (email.split("@")[0] if email else "New user")

    # 2b. Invited teammate? Join the inviting organisation instead of creating a new one.
    invited = _invited_membership(public_metadata)
    if invited:
        inv_org, inv_role = invited
        try:
            rows = db_admin.table("users").insert({
                "org_id":        inv_org,
                "clerk_user_id": clerk_user_id,
                "email":         email or "",
                "full_name":     full_name,
                "role":          inv_role,
                "is_active":     True,
                "last_login_at": datetime.now(timezone.utc).isoformat(),
            }).execute().data
            if not rows:
                raise RuntimeError("Failed to create user")
            return _result(rows[0], True)
        except Exception:
            winner = _find_user(clerk_user_id)      # lost a race: use the existing row
            if winner:
                return _result(winner, False)
            raise

    # 3. Use the organization name entered at sign-up, if Clerk has one.
    clerk_org_id, org_name = None, None
    try:
        found = clerk_org_for_user(clerk_user_id)
        if found:
            clerk_org_id, org_name = found
    except Exception as e:
        print(f"Note: couldn't read the Clerk organization for {clerk_user_id}: {e}")
    org_name = org_name or f"{full_name}{PLACEHOLDER_SUFFIX}"

    # 4. Create the organisation (DB triggers seed settings + number sequences).
    base = _slugify(org_name) or "org"
    last_err: Optional[Exception] = None
    org = None
    for attempt in range(3):
        slug = base if (attempt == 0 and not _slug_taken(base)) else f"{base}-{secrets.token_hex(3)}"
        try:
            rows = db_admin.table("organisations").insert({
                "name":     org_name,
                "slug":     slug,
                "email":    email or None,
                "currency": "USD",
                "timezone": "Asia/Bangkok",
                "country":  "TH",
                "plan":     "starter",
            }).execute().data
            if not rows:
                raise RuntimeError("Failed to create organisation")
            org = rows[0]
            break
        except Exception as e:
            winner = _find_user(clerk_user_id)       # a concurrent call may have finished
            if winner:
                return _result(winner, False)
            last_err = e
    if org is None:
        raise last_err or RuntimeError("Failed to create organisation")

    # 5. Create the user. clerk_user_id is UNIQUE, so exactly one concurrent call wins.
    try:
        rows = db_admin.table("users").insert({
            "org_id":        org["id"],
            "clerk_user_id": clerk_user_id,
            "email":         email or "",
            "full_name":     full_name,
            "role":          "admin",              # the first user of an org is its admin
            "is_active":     True,
            "last_login_at": datetime.now(timezone.utc).isoformat(),
        }).execute().data
        if not rows:
            raise RuntimeError("Failed to create user")
        user = rows[0]
    except Exception:
        _discard_org(org["id"])
        winner = _find_user(clerk_user_id)
        if winner:                                   # lost the race: use the winner's org
            return _result(winner, False)
        raise

    if clerk_org_id:
        apply_org_name(org["id"], org_name, clerk_org_id)

    # 6. Put org_id + role into Clerk so future tokens carry them.
    sync_clerk_metadata(clerk_user_id, org["id"], "admin")

    return _result(user, True)
