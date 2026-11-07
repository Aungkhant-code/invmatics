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


_SUPABASE_SERVICE_SUFFIXES = (
    "/rest/v1", "/auth/v1", "/storage/v1", "/functions/v1", "/realtime/v1", "/graphql/v1",
)


def _clean_supabase_url(raw: str) -> str:
    """
    The Supabase client wants the BASE url only: https://<project>.supabase.co
    A pasted "/rest/v1" (or a trailing slash) makes it build doubled paths, which
    PostgREST rejects with PGRST125 "Invalid path specified in request URL".
    Strip those known mistakes; leave any other path alone (self-hosted gateways).
    """
    url = (raw or "").strip().strip("\"'").rstrip("/")
    if not url:
        return ""
    if "://" not in url:
        url = "https://" + url
    changed = True
    while changed:
        changed = False
        for suffix in _SUPABASE_SERVICE_SUFFIXES:
            if url.endswith(suffix):
                print(f"Note: SUPABASE_URL ended with '{suffix}'; using the base URL instead.")
                url = url[: -len(suffix)].rstrip("/")
                changed = True
    return url


# — Supabase ————————————————————————————————————————————————————————
SUPABASE_URL              = _clean_supabase_url(_require("SUPABASE_URL"))
SUPABASE_ANON_KEY         = _require("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = _require("SUPABASE_SERVICE_ROLE_KEY")

# — Clerk ———————————————————————————————————————————————————————————
CLERK_SECRET_KEY     = _require("CLERK_SECRET_KEY")
CLERK_WEBHOOK_SECRET = _optional("CLERK_WEBHOOK_SECRET")

# — Frontend ————————————————————————————————————————————————————————
FRONTEND_URL = _optional("FRONTEND_URL", "https://www.invmatics.com")

# — CORS ————————————————————————————————————————————————————————————
ALLOWED_ORIGINS = [
    o.strip()
    for o in _optional("ALLOWED_ORIGINS", FRONTEND_URL).split(",")
    if o.strip()
]

if _MISSING:
    raise RuntimeError("Missing required environment variables: " + ", ".join(sorted(_MISSING)))
