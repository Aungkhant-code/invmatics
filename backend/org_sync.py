"""
Invmatics Systems — keep the organisation name in sync with Clerk Organizations.

Sign-up asks for an organization name and Clerk stores it as a Clerk Organization.
Our `organisations.name` is what the PDFs print, so it has to be copied across.

Two paths feed it:
    1. Webhooks (auth_webhook.py): organization.created / organizationMembership.created
       name the org the moment it exists; organization.updated keeps renames in sync.
    2. ensure_org_name(): called wherever the org is read for a document. If the org is
       still on the placeholder ("<Name>'s Business", set at signup before Clerk's
       organization exists) it asks Clerk for the real name — a safety net for missed
       webhooks and accounts created before this existed.

Optional migration for rename sync (everything else works without it):
    alter table organisations add column if not exists clerk_org_id text unique;
"""

from typing import Optional, Tuple

import httpx

from database import db_admin
from config import CLERK_SECRET_KEY

CLERK_API = "https://api.clerk.com/v1"
PLACEHOLDER_SUFFIX = "'s Business"      # must match the name used in _handle_user_created


def is_placeholder(name: Optional[str]) -> bool:
    """True while an org still carries the auto-generated signup name."""
    return (not name) or name.strip().endswith(PLACEHOLDER_SUFFIX)


def clerk_org_for_user(clerk_user_id: str) -> Optional[Tuple[str, str]]:
    """
    (clerk_org_id, name) of the user's Clerk organization, preferring one they admin.
    Returns None if they have no named organization. Raises on API errors.
    """
    r = httpx.get(
        f"{CLERK_API}/users/{clerk_user_id}/organization_memberships",
        headers={"Authorization": f"Bearer {CLERK_SECRET_KEY}"},
        params={"limit": 10},
        timeout=10,
    )
    if r.status_code != 200:
        raise RuntimeError(f"Clerk memberships lookup failed: {r.status_code} {r.text[:200]}")

    payload = r.json()
    items = payload.get("data", []) if isinstance(payload, dict) else payload
    named = [
        m for m in items
        if ((m.get("organization") or {}).get("name") or "").strip()
    ]
    if not named:
        return None

    named.sort(key=lambda m: m.get("role") != "org:admin")      # admin memberships first
    org = named[0]["organization"]
    return org["id"], org["name"].strip()


def apply_org_name(org_id: str, name: str, clerk_org_id: Optional[str] = None) -> None:
    """Write the name (and, if the column exists, the Clerk org id) to organisations."""
    db_admin.table("organisations").update({"name": name}).eq("id", org_id).execute()
    if clerk_org_id:
        try:
            db_admin.table("organisations").update(
                {"clerk_org_id": clerk_org_id}
            ).eq("id", org_id).execute()
        except Exception as e:
            print(f"Note: couldn't store clerk_org_id (add the column to enable rename sync): {e}")


def ensure_org_name(org: Optional[dict]) -> Optional[dict]:
    """
    Return the org row with its real name. Free when the org is already named;
    otherwise one Clerk lookup, then the name is saved so it never repeats.
    Never raises: on any failure the org comes back unchanged and the document
    still renders (with the placeholder name) instead of erroring.
    """
    if not org or not is_placeholder(org.get("name")):
        return org
    try:
        admins = (
            db_admin.table("users")
            .select("clerk_user_id")
            .eq("org_id", org["id"])
            .eq("role", "admin")
            .eq("is_active", True)
            .order("created_at")
            .limit(5)
            .execute()
        ).data or []
        for admin in admins:
            found = clerk_org_for_user(admin["clerk_user_id"])
            if found:
                clerk_org_id, name = found
                apply_org_name(org["id"], name, clerk_org_id)
                return {**org, "name": name}
    except Exception as e:
        print(f"Warning: couldn't sync organisation name from Clerk: {e}")
    return org
