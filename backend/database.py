"""
Invmatics Systems — Supabase client
Two clients:
    db          — anon key, respects RLS (use for user-scoped queries
                  when you have a valid JWT)
    db_admin    — service role key, bypasses RLS (use for webhooks,
                  background jobs, admin operations only)
"""

from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY


# — Anon client (RLS enforced) ———————————————————————————————————
# Use this for all regular API routes where a user JWT is present.
# Pass the user's JWT so RLS policies can scope to their org.
db: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)


# — Admin client (RLS bypassed) ——————————————————————————————————
# Use ONLY for:
#   • Clerk webhook (creating org + user on signup)
#   • Stripe webhook (updating plan/subscription)
#   • Background jobs (overdue detection, stock alerts)
#   • CSV import / data migration (admin feature)
# Never expose this client to user-facing routes.
db_admin: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def get_authed_client(jwt: str) -> Client:
    """
    Returns a Supabase client with the user's JWT set,
    so RLS policies apply correctly for their org.

    Usage in a FastAPI route:
        client = get_authed_client(token)
        result = client.table("products").select("*").execute()
    """
    authed = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    authed.auth.set_session(access_token=jwt, refresh_token="")
    return authed
