"""
Invmatics Systems — Users router
Staff management for an organisation. Changes are admin-only.

These endpoints use the admin Supabase client with an explicit org_id filter
taken from the verified Clerk JWT, so they don't depend on RLS being wired up
for Clerk tokens.

Invite flow:
    1. Admin POSTs /users/invite  -> invitations row + Clerk invitation email
    2. Invitee signs up via the emailed link (email arrives pre-verified)
    3. Clerk fires user.created -> webhook finds the pending invitation and
       attaches the user to THIS org with the invited role (see auth_webhook.py)
"""

import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import require_auth, require_role
from config import CLERK_SECRET_KEY, FRONTEND_URL
from database import db_admin

router = APIRouter()

ROLES = {"admin", "manager", "sales", "warehouse", "finance"}
CLERK_API = "https://api.clerk.com/v1"


class InviteRequest(BaseModel):
    email: str
    role: str = "warehouse"


class RoleUpdate(BaseModel):
    role: str


# ── Helpers ────────────────────────────────────────────────────────

def _clerk_headers() -> dict:
    return {
        "Authorization": f"Bearer {CLERK_SECRET_KEY}",
        "Content-Type":  "application/json",
    }


def _clerk_patch_metadata(clerk_user_id: str, public_metadata: dict) -> None:
    """Merge into a Clerk user's public_metadata (a null value deletes the key)."""
    r = httpx.patch(
        f"{CLERK_API}/users/{clerk_user_id}/metadata",
        headers=_clerk_headers(),
        json={"public_metadata": public_metadata},
        timeout=10,
    )
    if r.status_code not in (200, 201):
        raise RuntimeError(f"Clerk metadata update failed: {r.status_code} {r.text}")


def _get_org_user(org_id: str, user_id: UUID) -> dict:
    res = (
        db_admin.table("users")
        .select("*")
        .eq("id", str(user_id))
        .eq("org_id", org_id)
        .limit(1)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")
    return res.data[0]


def _check_role(role: str) -> str:
    role = (role or "").strip().lower()
    if role not in ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role. Allowed: {', '.join(sorted(ROLES))}",
        )
    return role


# ── List staff + pending invitations ───────────────────────────────

@router.get("/users")
async def list_users(user: dict = Depends(require_role("admin", "manager"))):
    org_id = user["org_id"]

    staff = (
        db_admin.table("users")
        .select("id, email, full_name, role, is_active, last_login_at, created_at")
        .eq("org_id", org_id)
        .order("full_name")
        .execute()
    )

    invites = (
        db_admin.table("invitations")
        .select("id, email, role, expires_at, created_at")
        .eq("org_id", org_id)
        .is_("accepted_at", "null")
        .order("created_at", desc=True)
        .execute()
    )

    return {
        "users":       staff.data or [],
        "invitations": invites.data or [],
    }


# ── Invite ─────────────────────────────────────────────────────────

@router.post("/users/invite", status_code=201)
async def invite_user(
    body: InviteRequest,
    user: dict = Depends(require_role("admin")),
):
    org_id = user["org_id"]
    email  = body.email.strip().lower()
    role   = _check_role(body.role)

    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Enter a valid email address")

    # Already has an active account (in this or any other org)?
    existing = (
        db_admin.table("users")
        .select("id, org_id")
        .eq("email", email)
        .eq("is_active", True)
        .limit(1)
        .execute()
    )
    if existing.data:
        raise HTTPException(
            status_code=409,
            detail="That email already has an Invmatics account",
        )

    me = (
        db_admin.table("users")
        .select("id")
        .eq("clerk_user_id", user["clerk_user_id"])
        .limit(1)
        .execute()
    )
    invited_by = me.data[0]["id"] if me.data else None

    # One invitation row per (org, email): re-inviting refreshes it
    now = datetime.now(timezone.utc)
    row = {
        "org_id":      org_id,
        "invited_by":  invited_by,
        "email":       email,
        "role":        role,
        "token":       secrets.token_hex(32),
        "expires_at":  (now + timedelta(days=7)).isoformat(),
        "accepted_at": None,
    }
    saved = (
        db_admin.table("invitations")
        .upsert(row, on_conflict="org_id,email")
        .execute()
    )
    if not saved.data:
        raise HTTPException(status_code=500, detail="Failed to create invitation")
    invitation = saved.data[0]

    # Ask Clerk to send the signup email (link arrives with the email pre-verified)
    try:
        r = httpx.post(
            f"{CLERK_API}/invitations",
            headers=_clerk_headers(),
            json={
                "email_address":   email,
                "public_metadata": {"org_id": org_id, "role": role},
                "redirect_url":    f"{FRONTEND_URL}/sign-up",
                "notify":          True,
                "ignore_existing": True,
            },
            timeout=15,
        )
        if r.status_code not in (200, 201):
            raise RuntimeError(f"{r.status_code} {r.text}")
    except Exception as e:
        # Don't leave an invitation behind that nobody was emailed about
        db_admin.table("invitations").delete().eq("id", invitation["id"]).execute()
        raise HTTPException(
            status_code=502,
            detail=f"Could not send the invitation email: {e}",
        )

    return {
        "message": f"Invitation sent to {email}",
        "invitation": {
            "id":         invitation["id"],
            "email":      email,
            "role":       role,
            "expires_at": invitation["expires_at"],
        },
    }


@router.delete("/users/invitations/{invitation_id}", status_code=204)
async def cancel_invitation(
    invitation_id: UUID,
    user: dict = Depends(require_role("admin")),
):
    db_admin.table("invitations").delete() \
        .eq("id", str(invitation_id)).eq("org_id", user["org_id"]).execute()
    return None


# ── Change role ────────────────────────────────────────────────────

@router.put("/users/{user_id}/role")
async def change_role(
    user_id: UUID,
    body: RoleUpdate,
    user: dict = Depends(require_role("admin")),
):
    org_id = user["org_id"]
    role   = _check_role(body.role)
    target = _get_org_user(org_id, user_id)

    if target["clerk_user_id"] == user["clerk_user_id"]:
        # Guarantees the org always keeps at least one admin
        raise HTTPException(status_code=400, detail="You can't change your own role")

    if target["role"] == role:
        return {"id": str(user_id), "role": role}

    db_admin.table("users").update({"role": role}).eq("id", str(user_id)).execute()
    try:
        _clerk_patch_metadata(target["clerk_user_id"], {"role": role})
    except Exception as e:
        # Roll back so the database and the JWT claims never disagree
        db_admin.table("users").update({"role": target["role"]}).eq("id", str(user_id)).execute()
        raise HTTPException(status_code=502, detail=str(e))

    return {"id": str(user_id), "role": role}


# ── Deactivate ─────────────────────────────────────────────────────

@router.delete("/users/{user_id}", status_code=204)
async def deactivate_user(
    user_id: UUID,
    user: dict = Depends(require_role("admin")),
):
    org_id = user["org_id"]
    target = _get_org_user(org_id, user_id)

    if target["clerk_user_id"] == user["clerk_user_id"]:
        raise HTTPException(status_code=400, detail="You can't deactivate your own account")

    db_admin.table("users").update({"is_active": False}).eq("id", str(user_id)).execute()

    # require_auth only reads JWT claims, so strip them: once the current
    # short-lived token expires, this person can no longer call the API.
    try:
        _clerk_patch_metadata(target["clerk_user_id"], {"org_id": None, "role": None})
    except Exception as e:
        db_admin.table("users").update({"is_active": True}).eq("id", str(user_id)).execute()
        raise HTTPException(status_code=502, detail=str(e))

    return None
