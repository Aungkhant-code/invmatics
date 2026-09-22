"""
Invmatics Systems — Auth webhook router
Clerk webhook handler: auto-creates org + user on signup.
"""

from fastapi import APIRouter

router = APIRouter()

# TODO: implement Clerk webhook handler
# POST /api/webhooks/clerk
# - Verify svix signature (use verify_clerk_webhook from auth.py)
# - On user.created: create org + user row in Supabase
# - On user.deleted: deactivate user row
