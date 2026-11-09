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

# — Stripe (all optional until billing goes live) ——————————————————————
STRIPE_SECRET_KEY     = _optional("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = _optional("STRIPE_WEBHOOK_SECRET")
# price ids: STRIPE_PRICE_<PLAN>_<MONTHLY|YEARLY>, e.g. STRIPE_PRICE_GROWTH_MONTHLY
STRIPE_PRICES = {
    (plan, interval): _optional(f"STRIPE_PRICE_{plan.upper()}_{interval.upper()}")
    for plan in ("starter", "growth", "business") for interval in ("monthly", "yearly")
}

# — Contact form email (optional: messages are always stored in the database) ——
RESEND_API_KEY = _optional("RESEND_API_KEY")
CONTACT_TO     = _optional("CONTACT_TO", "contact@kuihua.org")
CONTACT_FROM   = _optional("CONTACT_FROM", "Invmatics <noreply@kuihua.org>")

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
