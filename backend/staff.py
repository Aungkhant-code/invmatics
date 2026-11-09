"""
Invmatics Systems — Team management (admin only; enforced in permissions.py)

    GET    /staff                    members + pending invitations
    POST   /staff/invite             invite by email with a role (Clerk sends the email)
    DELETE /staff/invites/{id}       revoke a pending invitation
    PUT    /staff/{user_id}          change role / deactivate / reactivate

Invitations are Clerk invitations carrying {org_id, role} in public_metadata. When the
invitee signs up, provisioning.provision_user() sees that metadata and puts them in THIS
organisation with THAT role instead of creating a new organisation.
"""

from typing import Optional
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import require_auth, get_client, forget_member, db_user_id
from config import CLERK_SECRET_KEY, FRONTEND_URL
from database import db_admin
from provisioning import sync_clerk_metadata, new_code, normalize_code, _discard_org
from datetime import datetime, timedelta, timezone

router = APIRouter()

ROLES = ("admin", "manager", "sales", "warehouse", "finance")
CLERK_API = "https://api.clerk.com/v1"


class InviteBody(BaseModel):
    email: str
    role:  str = "warehouse"


class CodeBody(BaseModel):
    role:     str = "warehouse"
    max_uses: int = 1
    days:     int = 7


class MemberUpdate(BaseModel):
    role:      Optional[str]  = None
    is_active: Optional[bool] = None


def _clerk(method: str, path: str, **kw):
    return httpx.request(
        method, f"{CLERK_API}{path}",
        headers={"Authorization": f"Bearer {CLERK_SECRET_KEY}", "Content-Type": "application/json"},
        timeout=10, **kw,
    )


def _active_admins(client) -> int:
    rows = client.table("users").select("id").eq("role", "admin").eq("is_active", True).execute().data
    return len(rows or [])


# ── List ───────────────────────────────────────────────────────────

@router.get("/staff")
async def list_staff(
    user:   dict = Depends(require_auth),
    client       = Depends(get_client),
):
    members = (
        client.table("users")
        .select("id, full_name, email, role, is_active, last_login_at, created_at")
        .order("created_at")
        .execute().data
    ) or []

    # Pending invitations for THIS org (Clerk can't filter by metadata, so filter here)
    invites = []
    try:
        r = _clerk("GET", "/invitations", params={"status": "pending", "limit": 100})
        if r.status_code == 200:
            payload = r.json()
            for i in (payload if isinstance(payload, list) else payload.get("data", [])):
                meta = i.get("public_metadata") or {}
                if str(meta.get("org_id")) == str(user["org_id"]):
                    invites.append({
                        "id":         i["id"],
                        "email":      i.get("email_address"),
                        "role":       meta.get("role"),
                        "created_at": i.get("created_at"),
                    })
    except Exception as e:
        print(f"Note: couldn't list Clerk invitations: {e}")

    codes = []
    try:
        codes = (
            db_admin.table("access_codes").select("id, code, role, max_uses, uses, expires_at, revoked, created_at")
            .eq("org_id", str(user["org_id"])).eq("revoked", False)
            .order("created_at", desc=True).limit(50).execute().data
        ) or []
    except Exception as e:
        print(f"Note: access_codes unavailable (run access_codes.sql?): {e}")

    return {"members": members, "invites": invites, "codes": codes,
            "me": db_user_id(user["clerk_user_id"])}


# ── Access codes ───────────────────────────────────────────────────

@router.post("/staff/codes", status_code=201)
async def create_code(body: CodeBody, user: dict = Depends(require_auth)):
    if body.role not in ROLES:
        raise HTTPException(status_code=400, detail=f"Role must be one of: {', '.join(ROLES)}")
    max_uses = max(1, min(body.max_uses, 100))
    days     = max(1, min(body.days, 90))
    for _ in range(5):
        code = new_code()
        try:
            rows = db_admin.table("access_codes").insert({
                "org_id": str(user["org_id"]), "code": code, "role": body.role,
                "max_uses": max_uses, "uses": 0, "revoked": False,
                "expires_at": (datetime.now(timezone.utc) + timedelta(days=days)).isoformat(),
                "created_by": db_user_id(user["clerk_user_id"]),
            }).execute().data
            if rows:
                return rows[0]
        except Exception as e:
            print(f"access code insert retry: {e}")
    raise HTTPException(status_code=500, detail="Couldn't create a code. Please try again.")


class JoinBody(BaseModel):
    code: str


@router.post("/staff/join")
async def join_with_code(body: JoinBody, user: dict = Depends(require_auth)):
    """
    Move a brand-new account (sole member of its own auto-created organisation) into the
    organisation that issued the access code. Safety net for when the code didn't make
    it through sign-up.
    """
    want = normalize_code(body.code)
    rows = db_admin.table("access_codes").select("*").execute().data or []
    row = next((r for r in rows if normalize_code(r["code"]) == want), None)
    if not want or not row or row.get("revoked"):
        raise HTTPException(status_code=400, detail="That access code isn't valid.")
    if str(row["org_id"]) == str(user["org_id"]):
        return {"joined": False, "already": True}
    exp = row.get("expires_at")
    if exp and datetime.fromisoformat(exp.replace("Z", "+00:00")) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="That access code has expired.")
    if row["uses"] >= row["max_uses"]:
        raise HTTPException(status_code=400, detail="That access code has already been used.")
    members = db_admin.table("users").select("id").eq("org_id", str(user["org_id"])).execute().data or []
    if len(members) != 1:
        raise HTTPException(status_code=409, detail="You already belong to a team with other members.")
    bumped = db_admin.table("access_codes").update({"uses": row["uses"] + 1}) \
        .eq("id", row["id"]).eq("uses", row["uses"]).execute().data
    if not bumped:
        raise HTTPException(status_code=400, detail="That access code has already been used.")
    old_org = str(user["org_id"])
    db_admin.table("users").update({"org_id": row["org_id"], "role": row["role"]}) \
        .eq("clerk_user_id", user["clerk_user_id"]).execute()
    forget_member(user["clerk_user_id"])
    try:
        sync_clerk_metadata(user["clerk_user_id"], row["org_id"], row["role"])
    except Exception as e:
        print(f"join: metadata sync failed: {e}")
    _discard_org(old_org)
    return {"joined": True}


@router.delete("/staff/codes/{code_id}", status_code=204)
async def revoke_code(code_id: str, user: dict = Depends(require_auth)):
    db_admin.table("access_codes").update({"revoked": True}) \
        .eq("id", code_id).eq("org_id", str(user["org_id"])).execute()


# ── Invite ─────────────────────────────────────────────────────────

@router.get("/staff/_clerk_debug")
async def clerk_debug(email: str = "", user: dict = Depends(require_auth)):
    """Temporary admin diagnostic: what THIS backend's Clerk key can actually see."""
    out = {"key_prefix": (CLERK_SECRET_KEY or "")[:8], "frontend_url": FRONTEND_URL, "by_status": {}}
    for st in ("pending", "accepted", "revoked"):
        r = _clerk("GET", "/invitations", params={"status": st, "limit": 100})
        try:
            body = r.json()
        except Exception:
            body = r.text[:200]
        items = body if isinstance(body, list) else (body.get("data", []) if isinstance(body, dict) else [])
        out["by_status"][st] = {
            "http": r.status_code,
            "count": len(items),
            "emails": [i.get("email_address") for i in items][:20],
        }
    if email:
        u = _clerk("GET", "/users", params={"email_address": email.strip().lower()})
        out["users_with_email"] = len(u.json()) if u.status_code == 200 else f"http {u.status_code}"
    return out


@router.post("/staff/invite", status_code=201)
async def invite(
    body:   InviteBody,
    user:   dict = Depends(require_auth),
    client       = Depends(get_client),
):
    email = body.email.strip().lower()
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Enter a valid email address")
    if body.role not in ROLES:
        raise HTTPException(status_code=400, detail=f"Role must be one of: {', '.join(ROLES)}")

    already = client.table("users").select("id").eq("email", email).limit(1).execute().data
    if already:
        raise HTTPException(status_code=409, detail="That person is already on your team")

    def _send():
        return _clerk("POST", "/invitations", json={
            "email_address":   email,
            "public_metadata": {"org_id": str(user["org_id"]), "role": body.role},
            "redirect_url":    f"{FRONTEND_URL.rstrip('/')}/sign-up",
            "notify":          True,
        })

    r = _send()
    if r.status_code not in (200, 201) and "pending" in r.text.lower():
        # A stale pending invite for this email blocks a new one. Replace it when it is
        # ours (or its organisation no longer exists); never touch another org's invite.
        lst = _clerk("GET", "/invitations", params={"status": "pending", "limit": 500})
        print(f"invite: pending list http={lst.status_code}")
        if lst.status_code == 200:
            payload = lst.json()
            items = payload if isinstance(payload, list) else payload.get("data", [])
            print(f"invite: {len(items)} pending in Clerk")
            for i in items:
                if (i.get("email_address") or "").strip().lower() == email:
                    rv = _clerk("POST", f"/invitations/{i['id']}/revoke")
                    print(f"invite: revoked stale {i['id']} -> {rv.status_code}")
            r = _send()
            print(f"invite: resend -> {r.status_code} {r.text[:200]}")
    if r.status_code not in (200, 201):
        msg = ""
        try:
            msg = (r.json().get("errors") or [{}])[0].get("long_message") or ""
        except Exception:
            pass
        if r.status_code == 422 or "already" in msg.lower():
            raise HTTPException(
                status_code=409,
                detail=msg or "That email already has an account or a pending invitation.",
            )
        print(f"Clerk invitation failed: {r.status_code} {r.text[:300]}")
        raise HTTPException(status_code=502, detail=f"Couldn't send the invitation (Clerk {r.status_code}): {r.text[:300]}")

    inv = r.json()
    return {"id": inv.get("id"), "email": email, "role": body.role}


@router.delete("/staff/invites/{invite_id}", status_code=204)
async def revoke_invite(
    invite_id: str,
    user:   dict = Depends(require_auth),
):
    # Only revoke invitations that belong to this org
    r = _clerk("GET", "/invitations", params={"status": "pending", "limit": 100})
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail="Couldn't reach the invitation service.")
    payload = r.json()
    items = payload if isinstance(payload, list) else payload.get("data", [])
    mine = next((i for i in items if i.get("id") == invite_id
                 and str((i.get("public_metadata") or {}).get("org_id")) == str(user["org_id"])), None)
    if not mine:
        raise HTTPException(status_code=404, detail="Invitation not found")

    rv = _clerk("POST", f"/invitations/{invite_id}/revoke")
    if rv.status_code not in (200, 201):
        raise HTTPException(status_code=502, detail="Couldn't revoke the invitation.")
    return None


# ── Change role / deactivate ───────────────────────────────────────

@router.put("/staff/{user_id}")
async def update_member(
    user_id: UUID,
    body:    MemberUpdate,
    user:    dict = Depends(require_auth),
    client         = Depends(get_client),
):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to change")
    if "role" in updates and updates["role"] not in ROLES:
        raise HTTPException(status_code=400, detail=f"Role must be one of: {', '.join(ROLES)}")

    rows = client.table("users").select("id, clerk_user_id, role, is_active") \
        .eq("id", str(user_id)).limit(1).execute().data
    if not rows:
        raise HTTPException(status_code=404, detail="Team member not found")
    target = rows[0]

    losing_admin = target["role"] == "admin" and target["is_active"] and (
        updates.get("role", "admin") != "admin" or updates.get("is_active", True) is False
    )
    if losing_admin and _active_admins(client) <= 1:
        raise HTTPException(
            status_code=400,
            detail="Your organisation needs at least one active admin. Make someone else an admin first.",
        )
    if target["clerk_user_id"] == user["clerk_user_id"] and updates.get("is_active") is False:
        raise HTTPException(status_code=400, detail="You can't deactivate your own account.")

    res = client.table("users").update(updates).eq("id", str(user_id)).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Team member not found")
    member = res.data[0]

    forget_member(target["clerk_user_id"])          # takes effect now on this instance
    if "role" in updates:
        # keep the Clerk token claim in step (best effort; the database is authoritative)
        sync_clerk_metadata(target["clerk_user_id"], member["org_id"], member["role"])

    return {k: member.get(k) for k in ("id", "full_name", "email", "role", "is_active")}


# ── Delete a deactivated member ────────────────────────────────────

@router.delete("/staff/{user_id}", status_code=204)
async def delete_member(
    user_id: UUID,
    user:    dict = Depends(require_auth),
    client         = Depends(get_client),
):
    """
    Permanently remove a DEACTIVATED member: their Clerk account (so the email can sign up
    again) and their users row. If the row is referenced by past records (created_by etc.)
    it is anonymised instead, so history stays intact but the person is gone.
    """
    rows = client.table("users").select("id, clerk_user_id, is_active") \
        .eq("id", str(user_id)).limit(1).execute().data
    if not rows:
        raise HTTPException(status_code=404, detail="Team member not found")
    target = rows[0]
    if target["clerk_user_id"] == user["clerk_user_id"]:
        raise HTTPException(status_code=400, detail="You can't delete your own account.")
    if target["is_active"]:
        raise HTTPException(status_code=400, detail="Deactivate this member before deleting them.")

    cu = target["clerk_user_id"]
    if cu and not str(cu).startswith("deleted:"):
        r = _clerk("DELETE", f"/users/{cu}")
        if r.status_code not in (200, 204, 404):
            print(f"Clerk user delete failed: {r.status_code} {r.text[:200]}")
            raise HTTPException(status_code=502, detail="Couldn't remove their sign-in account. Please try again.")

    forget_member(cu)
    try:
        client.table("users").delete().eq("id", str(user_id)).execute()
    except Exception as e:
        print(f"users row kept (has history), anonymising: {e}")
        client.table("users").update({
            "clerk_user_id": f"deleted:{user_id}",
            "email":         f"deleted+{user_id}@invalid.local",
            "full_name":     "Deleted user",
            "is_active":     False,
        }).eq("id", str(user_id)).execute()
    return None
