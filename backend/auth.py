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
from functools import lru_cache
from fastapi import Header, HTTPException, Depends
from config import CLERK_SECRET_KEY


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

def require_auth(authorization: str = Header(None)) -> dict:
    """
    FastAPI dependency — verifies JWT and returns user context.

    Usage:
        @router.get("/products")
        async def list_products(user: dict = Depends(require_auth)):
            org_id = user["org_id"]
            role   = user["role"]
            token  = user["token"]
    """
    token = _extract_token(authorization)
    claims = _verify_token(token)

    org_id = claims.get("org_id")
    if not org_id:
        raise HTTPException(
            status_code=401,
            detail="Token missing org_id claim. "
                   "Check your Clerk JWT template includes org_id."
        )

    return {
        "token":          token,
        "clerk_user_id":  claims.get("sub"),
        "org_id":         org_id,
        "role":           claims.get("role", "warehouse"),
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


# ── Convenience: get Supabase client scoped to user ────────────────

from database import get_authed_client


def get_client(user: dict = Depends(require_auth)):
    """
    Returns a Supabase client authenticated with the user's JWT.
    RLS policies will automatically scope queries to their org.

    Usage:
        @router.get("/products")
        async def list_products(
            client = Depends(get_client),
            user: dict = Depends(require_auth)
        ):
            result = client.table("products").select("*").execute()
    """
    return get_authed_client(user["token"])
