"""
Invmatics Systems — Configuration
Reads from environment variables.
Locally: loaded from .env via python-dotenv
Production: set directly in Vercel / Railway environment
"""

import os
from dotenv import load_dotenv

# Load .env then .env.local (local overrides) — no-ops in production
load_dotenv()
load_dotenv('.env.local', override=True)


def _require(key: str) -> str:
    """Get a required env var or raise a clear error on startup."""
    val = os.getenv(key)
    if not val:
        raise RuntimeError(
            f"Missing required environment variable: {key}\n"
            f"Add it to your .env file or Vercel environment settings."
        )
    return val


def _optional(key: str, default: str = None) -> str:
    return os.getenv(key, default)


# — Supabase ———————————————————————————————————————————————————————
SUPABASE_URL              = _require("SUPABASE_URL")
SUPABASE_ANON_KEY         = _require("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = _require("SUPABASE_SERVICE_ROLE_KEY")

# — Clerk ——————————————————————————————————————————————————————————
CLERK_SECRET_KEY      = _require("CLERK_SECRET_KEY")
CLERK_WEBHOOK_SECRET  = _optional("CLERK_WEBHOOK_SECRET")

# — App ——————————————————————————————————————————————————————————————
ENVIRONMENT = _optional("ENVIRONMENT", "production")
IS_DEV      = ENVIRONMENT == "development"

# — CORS ———————————————————————————————————————————————————————————
# In dev: allow local Vite server
# In prod: allow your deployed frontend URL
ALLOWED_ORIGINS = (
    ["http://localhost:5173", "http://localhost:3000"]
    if IS_DEV
    else [o.strip() for o in _optional("ALLOWED_ORIGINS", "").split(",") if o.strip()]
)

# ── Frontend URL (used for invitation email redirect links) ────────
FRONTEND_URL = _optional("FRONTEND_URL") or (
    "http://localhost:5173" if IS_DEV else (ALLOWED_ORIGINS[0] if ALLOWED_ORIGINS else "")
)
