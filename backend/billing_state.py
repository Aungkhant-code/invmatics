"""
Invmatics Systems — plan limits and paywall state (no Stripe calls in here).

An organisation is in one of these states:
    trial     no subscription yet, inside the 14-day trial   -> Growth features, not locked
    active    subscribed (Stripe active / trialing / past_due) -> its plan, not locked
    locked    trial over with no subscription, or subscription cancelled/unpaid
              -> READ-ONLY: everything stays visible and exportable, writes are refused (402)

Columns (see billing.sql): plan, subscription_status, stripe_customer_id,
stripe_subscription_id, trial_ends_at, current_period_end, billing_interval.
If the columns don't exist yet (SQL not run) nobody is ever locked, so deploying first is safe.
"""

import time
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException

from database import db_admin

ALL_ROLES = {"admin", "manager", "sales", "warehouse", "finance"}

PLAN_LIMITS = {
    "starter":  {"staff": 3,    "products": 500,  "roles": {"admin", "manager"}},
    "growth":   {"staff": 10,   "products": None, "roles": ALL_ROLES},
    "business": {"staff": None, "products": None, "roles": ALL_ROLES},
}
PLAN_LABEL = {"starter": "Starter", "growth": "Growth", "business": "Business"}

# Starter doesn't include these (matches the pricing page)
GROWTH_ONLY = (
    "/delivery-orders", "/delivery-confirmations",
    "/analytics/revenue-trend", "/analytics/top-products", "/analytics/top-customers",
    "/analytics/revenue-by-category", "/analytics/financial-summary",
)
# Still allowed when locked (so people can pay, sign in, and ask for help)
LOCK_EXEMPT = ("/billing", "/auth", "/support")

_TTL = 30
_cache: dict = {}


def _parse(ts) -> Optional[datetime]:
    if not ts:
        return None
    try:
        return datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
    except Exception:
        return None


def forget(org_id: str) -> None:
    _cache.pop(str(org_id), None)


def get_billing(org_id: str, fresh: bool = False) -> dict:
    org_id = str(org_id)
    hit = _cache.get(org_id)
    if hit and hit[0] > time.monotonic() and not fresh:
        return hit[1]

    row = {}
    columns_ok = True
    try:
        rows = db_admin.table("organisations").select(
            "plan, subscription_status, stripe_customer_id, stripe_subscription_id, "
            "trial_ends_at, current_period_end, billing_interval"
        ).eq("id", org_id).limit(1).execute().data
        row = rows[0] if rows else {}
    except Exception as e:
        columns_ok = False
        print(f"Note: billing columns unavailable (run billing.sql?): {e}")

    now = datetime.now(timezone.utc)
    trial_end = _parse(row.get("trial_ends_at"))
    has_sub = bool(row.get("stripe_subscription_id"))
    sstatus = (row.get("subscription_status") or "").lower()
    plan = row.get("plan") if row.get("plan") in PLAN_LIMITS else "starter"

    locked, state, effective = False, "trial", "growth"
    trial_days_left = None
    if not columns_ok:
        state, effective = "trial", "growth"
    elif has_sub:
        effective = plan
        if sstatus in ("active", "trialing", "past_due"):
            state = "active"
        else:
            state, locked = "locked", True
    else:
        if trial_end is None:
            state, effective = "trial", "growth"          # legacy org: not locked
        elif now < trial_end:
            state, effective = "trial", "growth"
            trial_days_left = max(0, (trial_end - now).days + (1 if (trial_end - now).seconds else 0))
        else:
            state, locked, effective = "locked", True, plan

    out = {
        "state": state, "locked": locked, "plan": plan, "effective_plan": effective,
        "subscription_status": sstatus or None, "past_due": sstatus == "past_due",
        "trial_ends_at": row.get("trial_ends_at"), "trial_days_left": trial_days_left,
        "current_period_end": row.get("current_period_end"),
        "interval": row.get("billing_interval"),
        "has_customer": bool(row.get("stripe_customer_id")),
        "has_subscription": has_sub,
        "columns_ok": columns_ok,
    }
    _cache[org_id] = (time.monotonic() + _TTL, out)
    return out


def limits_for(org_id: str) -> dict:
    return PLAN_LIMITS[get_billing(org_id)["effective_plan"]]


def gate(org_id: str, method: str, path: str) -> None:
    """Called for every request: read-only lock + Starter feature gating. Raises 402."""
    b = get_billing(org_id)
    if b["effective_plan"] == "starter" and not b["locked"]:
        if any(path == p or path.startswith(p + "/") or path.startswith(p) for p in GROWTH_ONLY):
            raise HTTPException(status_code=402, detail="This feature is part of the Growth plan. Upgrade in Billing to use it.")
    if b["locked"] and method.upper() not in ("GET", "HEAD", "OPTIONS"):
        if not any(path == p or path.startswith(p + "/") for p in LOCK_EXEMPT):
            raise HTTPException(
                status_code=402,
                detail="Your trial or subscription has ended, so Invmatics is read-only. Choose a plan in Billing to keep editing.",
            )


def check_role_allowed(org_id: str, role: str) -> None:
    lim = limits_for(org_id)
    if role not in lim["roles"]:
        raise HTTPException(status_code=402, detail="Your plan only includes the Admin and Manager roles. Upgrade to Growth to use all five roles.")


def check_staff_limit(org_id: str, adding: int = 1) -> None:
    cap = limits_for(org_id)["staff"]
    if cap is None:
        return
    n = len(db_admin.table("users").select("id").eq("org_id", str(org_id)).eq("is_active", True).execute().data or [])
    if n + adding > cap:
        raise HTTPException(status_code=402, detail=f"Your plan allows {cap} staff accounts. Upgrade in Billing to add more people.")


def check_product_limit(org_id: str, adding: int = 1) -> None:
    cap = limits_for(org_id)["products"]
    if cap is None:
        return
    n = len(db_admin.table("products").select("id").eq("org_id", str(org_id)).eq("is_active", True).execute().data or [])
    if n + adding > cap:
        raise HTTPException(status_code=402, detail=f"Your plan allows {cap} products. Upgrade in Billing to add more.")
