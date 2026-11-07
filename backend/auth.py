"""
Invmatics Systems — Auth middleware
Verifies Clerk JWTs and extracts org_id + role.
Uses FastAPI dependency injection so any route
can require auth with a single line:

    @router.get("/products")
    async def list_products(user: dict = Depends(require_auth)):
        org_id = user["org_id"]
        ...
"""

import jwt
import httpx
import time
from functools import lru_cache
from fastapi import Header, HTTPException, Depends
from config import CLERK_SECRET_KEY
from provisioning import provision_user, _find_user
from tenant_client import TenantClient


# ── JWKS cache ─────────────────────────────────────────────────────
# Clerk publishes public keys at a JWKS endpoint.
# We cache them so we don't fetch on every request.

CLERK_JWKS_URL = "https://api.clerk.com/v1/jwks"


@lru_cache(maxsize=1)
def _get_jwks() -> dict:
    """Fetch and cache Clerk's public keys."""
    response = httpx.get(
        CLERK_JWKS_URL,
        headers={"Authorization": f"Bearer {CLERK_SECRET_KEY}"},
        timeout=10,
    )
    response.raise_for_status()
    return response.json()


def _get_public_key(kid: str):
    """Get the public key matching a JWT's kid header."""
    jwks = _get_jwks()
    for key in jwks.get("keys", []):
        if key["kid"] == kid:
            return jwt.algorithms.RSAAlgorithm.from_jwk(key)
    # Kid not found — clear cache and retry once (key rotation)
    _get_jwks.cache_clear()
    jwks = _get_jwks()
    for key in jwks.get("keys", []):
        if key["kid"] == kid:
            return jwt.algorithms.RSAAlgorithm.from_jwk(key)
    raise HTTPException(status_code=401, detail="Unable to find matching public key")


# ── Token extraction ───────────────────────────────────────────────

def _extract_token(authorization: str) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Missing or invalid Authorization header"
        )
    return authorization.split(" ", 1)[1]


# ── JWT verification ───────────────────────────────────────────────

def _verify_token(token: str) -> dict:
    """
    Verify a Clerk JWT and return the decoded claims.
    Expected claims from Clerk JWT template:
        sub      → Clerk user ID
        org_id   → KuiHua org UUID (set in Clerk JWT template)
        role     → user role (set in Clerk JWT template)
        email    → user email
    """
    try:
        # Decode header without verification to get kid
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        if not kid:
            raise HTTPException(status_code=401, detail="JWT missing kid header")

        public_key = _get_public_key(kid)

        claims = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            options={"verify_aud": False},   # Clerk doesn't always set aud
        )
        return claims

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


# ── FastAPI dependencies ───────────────────────────────────────────

VALID_ROLES = {"admin", "manager", "sales", "warehouse", "finance"}


def _app_role(claims: dict):
    """
    The user's Invmatics role from the token.

    The Clerk JWT template sends it as `app_role` (the plain `role` claim is
    reserved by Supabase for the Postgres role). Falls back to `role` only when
    it's a real app role. Returns None when the token carries no usable role.
    """
    role = claims.get("app_role") or claims.get("role")
    return role if role in VALID_ROLES else None


# ── Who is this user, according to OUR database? ───────────────────
#
# The database (not the token) is the source of truth for org, role and active status:
# a role change or deactivation must take effect without waiting for the Clerk token to
# be re-issued. Looked up once per MEMBER_TTL seconds per server instance.

MEMBER_TTL = 30
_members: dict = {}          # clerk_user_id -> (expires_at, row)


def forget_member(clerk_user_id: str) -> None:
    """Drop a cached user (called after their role/status changes, on this instance)."""
    _members.pop(clerk_user_id, None)


def _member(clerk_user_id: str):
    hit = _members.get(clerk_user_id)
    now = time.monotonic()
    if hit and hit[0] > now:
        return hit[1]
    row = _find_user(clerk_user_id)              # raises on DB errors; caller decides
    if row:
        _members[clerk_user_id] = (now + MEMBER_TTL, row)
    return row


def db_user_id(clerk_user_id: str):
    """users.id (uuid) for a Clerk user — what created_by / user_id columns expect."""
    try:
        row = _member(clerk_user_id)
        return row["id"] if row else None
    except Exception:
        return None


def require_auth(authorization: str = Header(None)) -> dict:
    """
    FastAPI dependency — verifies the Clerk JWT and returns the user context:
    {clerk_user_id, org_id, role, ...}. org_id / role come from our users table.
    """
    token = _extract_token(authorization)
    claims = _verify_token(token)

    clerk_user_id = claims.get("sub")
    org_id = claims.get("org_id")
    role   = _app_role(claims)

    try:
        row = _member(clerk_user_id)
    except Exception as e:
        # Database hiccup: fall back to the token's claims rather than lock everyone out.
        print(f"Member lookup failed for {clerk_user_id}: {e}")
        row = None
        if not (org_id and role):
            raise HTTPException(status_code=503, detail="Service temporarily unavailable. Please retry.")

    if row:
        if not row.get("is_active", True):
            raise HTTPException(status_code=403, detail="This account has been deactivated.")
        org_id, role = row["org_id"], row["role"]
    else:
        # Signed in with Clerk but no users row yet: a brand-new signup (webhook missed or
        # still in flight) or an invited teammate. Creates the org, or joins the inviting
        # org. Idempotent and race-safe, so parallel requests converge on one account.
        try:
            acct = provision_user(clerk_user_id)
        except Exception as e:
            print(f"Provisioning failed for {clerk_user_id}: {e}")
            raise HTTPException(
                status_code=503,
                detail="Your account is still being set up. Please try again in a moment.",
            )
        if not acct["is_active"]:
            raise HTTPException(status_code=403, detail="This account has been deactivated.")
        org_id, role = acct["org_id"], acct["role"]
        _members[clerk_user_id] = (time.monotonic() + MEMBER_TTL, {
            "id": acct["user_id"], "org_id": org_id, "role": role, "is_active": True,
        })

    return {
        "token":          token,
        "clerk_user_id":  clerk_user_id,
        "org_id":         org_id,
        "role":           role or "warehouse",
        "email":          claims.get("email"),
        "claims":         claims,
    }


def require_role(*allowed_roles: str):
    """
    FastAPI dependency factory — requires specific roles.

    Usage:
        @router.delete("/products/{id}")
        async def delete_product(
            product_id: UUID,
            user: dict = Depends(require_role("admin", "manager"))
        ):
            ...
    """
    def _check(user: dict = Depends(require_auth)) -> dict:
        if user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Role '{user['role']}' is not permitted. "
                       f"Required: {', '.join(allowed_roles)}"
            )
        return user
    return _check


# ── Clerk webhook verification ─────────────────────────────────────

import hmac
import hashlib
import base64
from config import CLERK_WEBHOOK_SECRET


def verify_clerk_webhook(
    payload: bytes,
    svix_id: str = Header(None, alias="svix-id"),
    svix_timestamp: str = Header(None, alias="svix-timestamp"),
    svix_signature: str = Header(None, alias="svix-signature"),
) -> bytes:
    """
    Verifies Clerk webhook signatures using svix.
    Returns raw payload if valid, raises 401 if not.
    """
    if not all([svix_id, svix_timestamp, svix_signature]):
        raise HTTPException(status_code=401, detail="Missing svix headers")

    if not CLERK_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="Webhook secret not configured")

    # Build signed content
    signed_content = f"{svix_id}.{svix_timestamp}.{payload.decode('utf-8')}"

    # Decode secret (remove whsec_ prefix if present)
    secret = CLERK_WEBHOOK_SECRET
    if secret.startswith("whsec_"):
        secret_bytes = base64.b64decode(secret[6:])
    else:
        secret_bytes = secret.encode()

    # Compute expected signature
    expected = hmac.new(secret_bytes, signed_content.encode(), hashlib.sha256).digest()
    expected_b64 = base64.b64encode(expected).decode()

    # Check against provided signatures (can be comma-separated)
    provided = [s.split(",", 1)[1] if "," in s else s
                for s in svix_signature.split(" ")]

    if not any(hmac.compare_digest(expected_b64, sig) for sig in provided):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    return payload


# ── Convenience: Supabase client scoped to the caller's organisation ─

def get_client(user: dict = Depends(require_auth)):
    """
    Returns a tenant-scoped Supabase client (see tenant_client.py).

    Supabase Auth can't validate Clerk tokens, so requests run through the
    server-side client and the wrapper forces `org_id = <caller's org>` onto every
    read, update, delete and insert.

    Usage:
        @router.get("/products")
        async def list_products(
            client = Depends(get_client),
            user: dict = Depends(require_auth)
        ):
            result = client.table("products").select("*").execute()
    """
    return TenantClient(user["org_id"])
