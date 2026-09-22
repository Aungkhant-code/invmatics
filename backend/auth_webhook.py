"""
Invmatics Systems — Clerk Webhook Handler
Listens for Clerk events and syncs to Supabase.

Events handled:
    user.created    → create org + user row, set public_metadata
    user.updated    → sync email/name changes
    user.deleted    → deactivate user (soft delete)

Flow on signup:
    1. User signs up via Clerk
    2. Clerk fires user.created webhook to /api/auth/webhook
    3. We create an organisation row (slug from email domain or name)
    4. We create a user row linked to the org
    5. We write org_id + role back to Clerk public_metadata
       so the JWT template can embed them in every token
    6. Frontend gets a JWT with org_id + role → all API calls work
"""

import json
import hmac
import hashlib
import base64
import re
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Request, HTTPException, Header, Depends

from database import db_admin
from config import CLERK_SECRET_KEY, CLERK_WEBHOOK_SECRET
from auth import require_auth, get_client

router = APIRouter()


# ================================================================
# SIGNATURE VERIFICATION
# ================================================================

def _verify_svix(
    payload: bytes,
    svix_id: str,
    svix_timestamp: str,
    svix_signature: str,
) -> bool:
    """Verify Clerk webhook signature using svix standard."""
    if not CLERK_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="Webhook secret not configured")

    secret = CLERK_WEBHOOK_SECRET
    if secret.startswith("whsec_"):
        secret_bytes = base64.b64decode(secret[6:])
    else:
        secret_bytes = secret.encode()

    signed_content = f"{svix_id}.{svix_timestamp}.{payload.decode('utf-8')}"
    expected = base64.b64encode(
        hmac.new(secret_bytes, signed_content.encode(), hashlib.sha256).digest()
    ).decode()

    provided = [
        s.split(",", 1)[1] if "," in s else s
        for s in svix_signature.split(" ")
    ]
    return any(hmac.compare_digest(expected, sig) for sig in provided)


# ================================================================
# HELPERS
# ================================================================

def _slugify(text: str) -> str:
    """Convert text to a URL-safe slug."""
    slug = text.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_-]+", "-", slug)
    slug = re.sub(r"^-+|-+$", "", slug)
    return slug[:50]


def _unique_slug(base_slug: str) -> str:
    """Ensure slug is unique in organisations table."""
    slug = base_slug
    counter = 1
    while True:
        existing = (
            db_admin.table("organisations")
            .select("id")
            .eq("slug", slug)
            .execute()
        )
        if not existing.data:
            return slug
        slug = f"{base_slug}-{counter}"
        counter += 1


def _set_clerk_metadata(clerk_user_id: str, org_id: str, role: str = "admin"):
    """
    Write org_id and role to Clerk user's public_metadata.
    This is what the JWT template reads to embed claims in tokens.
    """
    response = httpx.patch(
        f"https://api.clerk.com/v1/users/{clerk_user_id}",
        headers={
            "Authorization": f"Bearer {CLERK_SECRET_KEY}",
            "Content-Type":  "application/json",
        },
        json={
            "public_metadata": {
                "org_id": org_id,
                "role":   role,
            }
        },
        timeout=10,
    )
    if response.status_code not in (200, 201):
        raise Exception(
            f"Failed to set Clerk metadata: {response.status_code} {response.text}"
        )
    return response.json()


# ================================================================
# EVENT HANDLERS
# ================================================================

def _handle_user_created(data: dict) -> dict:
    """
    On new signup:
        1. Determine org name from user's name or email
        2. Create organisation
        3. Create user linked to org
        4. Set Clerk public_metadata with org_id + role
    """
    clerk_user_id = data["id"]
    email         = (data.get("email_addresses") or [{}])[0].get("email_address", "")
    first_name    = data.get("first_name") or ""
    last_name     = data.get("last_name") or ""
    full_name     = f"{first_name} {last_name}".strip() or email.split("@")[0]

    org_name  = f"{full_name}'s Business"
    base_slug = _slugify(full_name)
    slug      = _unique_slug(base_slug)

    org_result = db_admin.table("organisations").insert({
        "name":     org_name,
        "slug":     slug,
        "email":    email,
        "currency": "USD",
        "timezone": "Asia/Bangkok",
        "country":  "TH",
        "plan":     "starter",
    }).execute()

    if not org_result.data:
        raise Exception("Failed to create organisation")

    org    = org_result.data[0]
    org_id = org["id"]

    user_result = db_admin.table("users").insert({
        "org_id":        org_id,
        "clerk_user_id": clerk_user_id,
        "email":         email,
        "full_name":     full_name,
        "role":          "admin",
        "is_active":     True,
        "last_login_at": datetime.now(timezone.utc).isoformat(),
    }).execute()

    if not user_result.data:
        raise Exception("Failed to create user")

    try:
        _set_clerk_metadata(clerk_user_id, org_id, "admin")
    except Exception as e:
        print(f"Warning: Failed to set Clerk metadata for {clerk_user_id}: {e}")

    return {
        "event":   "user.created",
        "org_id":  org_id,
        "user_id": user_result.data[0]["id"],
        "email":   email,
    }


def _handle_user_updated(data: dict) -> dict:
    """Sync name and email changes from Clerk to Supabase."""
    clerk_user_id = data["id"]
    email         = (data.get("email_addresses") or [{}])[0].get("email_address", "")
    first_name    = data.get("first_name") or ""
    last_name     = data.get("last_name") or ""
    full_name     = f"{first_name} {last_name}".strip() or email.split("@")[0]

    existing = (
        db_admin.table("users")
        .select("id")
        .eq("clerk_user_id", clerk_user_id)
        .single()
        .execute()
    )

    if not existing.data:
        return _handle_user_created(data)

    db_admin.table("users").update({
        "email":     email,
        "full_name": full_name,
    }).eq("clerk_user_id", clerk_user_id).execute()

    return {"event": "user.updated", "clerk_user_id": clerk_user_id}


def _handle_user_deleted(data: dict) -> dict:
    """Soft-delete user on Clerk deletion."""
    clerk_user_id = data["id"]

    db_admin.table("users").update({
        "is_active": False,
    }).eq("clerk_user_id", clerk_user_id).execute()

    return {"event": "user.deleted", "clerk_user_id": clerk_user_id}


# ================================================================
# WEBHOOK ENDPOINT
# ================================================================

@router.post("/auth/webhook")
async def clerk_webhook(
    request:        Request,
    svix_id:        str = Header(None, alias="svix-id"),
    svix_timestamp: str = Header(None, alias="svix-timestamp"),
    svix_signature: str = Header(None, alias="svix-signature"),
):
    """
    Receives Clerk webhook events.
    Register this URL in Clerk Dashboard → Webhooks:
        https://api.yourdomain.com/api/auth/webhook
    or for local dev:
        Use ngrok and set the tunnel URL in Clerk dashboard
    """
    payload = await request.body()

    if not all([svix_id, svix_timestamp, svix_signature]):
        raise HTTPException(status_code=400, detail="Missing svix headers")

    if not _verify_svix(payload, svix_id, svix_timestamp, svix_signature):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    try:
        event = json.loads(payload)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event_type = event.get("type")
    data       = event.get("data", {})

    handlers = {
        "user.created": _handle_user_created,
        "user.updated": _handle_user_updated,
        "user.deleted": _handle_user_deleted,
    }

    handler = handlers.get(event_type)
    if handler:
        try:
            result = handler(data)
            return {"status": "ok", **result}
        except Exception as e:
            print(f"Webhook handler error for {event_type}: {e}")
            return {"status": "error", "detail": str(e)}

    return {"status": "ignored", "event": event_type}


# ================================================================
# CURRENT USER INFO
# ================================================================

@router.get("/auth/me")
async def get_me(
    user:   dict = Depends(require_auth),
    client       = Depends(get_client),
):
    """
    Returns the current user's profile, org, and settings.
    Used by the frontend on initial load to bootstrap the app.
    """
    user_result = (
        client.table("users")
        .select("id, email, full_name, role, is_active, last_login_at")
        .eq("clerk_user_id", user["clerk_user_id"])
        .single()
        .execute()
    )

    if not user_result.data:
        raise HTTPException(status_code=404, detail="User not found in database")

    org_result = (
        client.table("organisations")
        .select(
            "id, name, slug, currency, timezone, country, plan, "
            "bank_name, bank_account_no, bank_account_name, promptpay_id, "
            "email, phone, address, tax_id"
        )
        .eq("id", user["org_id"])
        .single()
        .execute()
    )

    settings_result = (
        client.table("org_settings")
        .select(
            "default_payment_terms, default_tax_rate, default_invoice_notes, "
            "notify_low_stock, notify_overdue"
        )
        .single()
        .execute()
    )

    db_admin.table("users").update({
        "last_login_at": datetime.now(timezone.utc).isoformat()
    }).eq("clerk_user_id", user["clerk_user_id"]).execute()

    return {
        "user":     user_result.data,
        "org":      org_result.data,
        "settings": settings_result.data,
        "role":     user["role"],
        "org_id":   user["org_id"],
    }
