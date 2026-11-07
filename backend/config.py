"""
Invmatics Systems — Configuration
Reads from environment variables set in Vercel.
Locally: load a .env file and set the same keys.
"""

import os
from dotenv import load_dotenv

load_dotenv()


_MISSING = []


def _require(key: str) -> str:
    val = os.getenv(key)
    if not val:
        _MISSING.append(key)
        return ""
    return val


def _optional(key: str, default: str = None) -> str:
    return os.getenv(key, default)


# — Supabase ————————————————————————————————————————————————————————
SUPABASE_URL              = _require("SUPABASE_URL")
SUPABASE_ANON_KEY         = _require("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = _require("SUPABASE_SERVICE_ROLE_KEY")

# — Clerk ———————————————————————————————————————————————————————————
CLERK_SECRET_KEY     = _require("CLERK_SECRET_KEY")
CLERK_WEBHOOK_SECRET = _optional("CLERK_WEBHOOK_SECRET")

# — Frontend ————————————————————————————————————————————————————————
FRONTEND_URL = _require("FRONTEND_URL")

# — CORS ————————————————————————————————————————————————————————————
ALLOWED_ORIGINS = [
    o.strip()
    for o in _optional("ALLOWED_ORIGINS", FRONTEND_URL).split(",")
    if o.strip()
]

if _MISSING:
    raise RuntimeError("Missing required environment variables: " + ", ".join(sorted(_MISSING)))
