"""
Invmatics Systems — Stripe billing.

    GET  /billing            plan, trial / lock state, usage vs limits (every role)
    POST /billing/checkout   start a Stripe Checkout subscription for a plan (admin)
    POST /billing/portal     open the Stripe customer portal: card, invoices, cancel (admin)
    POST /billing/webhook    Stripe -> us (unauthenticated, signature verified)

Stripe is called over plain HTTPS (no SDK). The webhook is the single source of truth for
plan and status; checkout success just sends the user back to the app.
"""

import hashlib
import hmac
import json
import time
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from auth import require_auth
from config import FRONTEND_URL, STRIPE_PRICES, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
from database import db_admin
from billing_state import PLAN_LABEL, PLAN_LIMITS, forget, get_billing

router = APIRouter()           # behind the role rules
webhook_router = APIRouter()   # public: Stripe can't send a login token

STRIPE_API = "https://api.stripe.com/v1"
PLANS = ("starter", "growth", "business")


def _stripe(method: str, path: str, data: dict = None) -> dict:
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Payments aren't set up yet. Please contact support.")
    r = httpx.request(method, f"{STRIPE_API}{path}", data=data, auth=(STRIPE_SECRET_KEY, ""), timeout=20)
    if r.status_code >= 400:
        print(f"Stripe error {r.status_code}: {r.text[:300]}")
        try:
            msg = r.json().get("error", {}).get("message")
        except Exception:
            msg = None
        raise HTTPException(status_code=502, detail=msg or "Stripe couldn't complete that request.")
    return r.json()


def _plan_for_price(price_id):
    for (plan, interval), pid in STRIPE_PRICES.items():
        if pid and pid == price_id:
            return plan, ("year" if interval == "yearly" else "month")
    return None, None


def _org_front() -> str:
    return FRONTEND_URL.rstrip("/")


# ── Status ─────────────────────────────────────────────────────────

@router.get("/billing")
async def billing_status(user: dict = Depends(require_auth)):
    org_id = str(user["org_id"])
    b = get_billing(org_id, fresh=True)
    users = len(db_admin.table("users").select("id").eq("org_id", org_id).eq("is_active", True).execute().data or [])
    products = len(db_admin.table("products").select("id").eq("org_id", org_id).eq("is_active", True).execute().data or [])
    lim = PLAN_LIMITS[b["effective_plan"]]
    return {
        **b,
        "plan_label": PLAN_LABEL[b["effective_plan"]],
        "limits": {"staff": lim["staff"], "products": lim["products"]},
        "usage":  {"staff": users, "products": products},
        "payments_ready": bool(STRIPE_SECRET_KEY),
        "available": sorted({f"{p}_{i}" for (p, i), pid in STRIPE_PRICES.items() if pid}),
    }


# ── Checkout / portal ──────────────────────────────────────────────

class CheckoutBody(BaseModel):
    plan:     str
    interval: str = "monthly"      # monthly | yearly


@router.post("/billing/checkout")
async def checkout(body: CheckoutBody, user: dict = Depends(require_auth)):
    if body.plan not in PLANS or body.interval not in ("monthly", "yearly"):
        raise HTTPException(status_code=400, detail="Choose a valid plan.")
    price = STRIPE_PRICES.get((body.plan, body.interval))
    if not price:
        raise HTTPException(status_code=503, detail="That plan isn't available for purchase yet.")

    org_id = str(user["org_id"])
    b = get_billing(org_id, fresh=True)
    if b["has_subscription"] and not b["locked"]:
        raise HTTPException(status_code=409, detail="You already have a subscription. Use Manage billing to change plan.")

    org = (db_admin.table("organisations").select("stripe_customer_id").eq("id", org_id).limit(1).execute().data or [{}])[0]
    form = {
        "mode": "subscription",
        "line_items[0][price]": price,
        "line_items[0][quantity]": "1",
        "success_url": f"{_org_front()}/app?billing=success",
        "cancel_url":  f"{_org_front()}/app?billing=cancelled",
        "client_reference_id": org_id,
        "allow_promotion_codes": "true",
        "metadata[org_id]": org_id,
        "subscription_data[metadata][org_id]": org_id,
        "subscription_data[metadata][plan]": body.plan,
    }
    # No trial is set here: the 14-day trial is the in-app one (no card). Stripe prices
    # should have NO trial configured, so subscribing charges straight away.
    if org.get("stripe_customer_id"):
        form["customer"] = org["stripe_customer_id"]
    else:
        me = (db_admin.table("users").select("email").eq("clerk_user_id", user["clerk_user_id"]).limit(1).execute().data or [{}])[0]
        if me.get("email"):
            form["customer_email"] = me["email"]
    session = _stripe("POST", "/checkout/sessions", form)
    return {"url": session["url"]}


@router.post("/billing/portal")
async def portal(user: dict = Depends(require_auth)):
    org_id = str(user["org_id"])
    org = (db_admin.table("organisations").select("stripe_customer_id").eq("id", org_id).limit(1).execute().data or [{}])[0]
    if not org.get("stripe_customer_id"):
        raise HTTPException(status_code=400, detail="There's no billing account yet. Subscribe to a plan first.")
    s = _stripe("POST", "/billing_portal/sessions", {
        "customer": org["stripe_customer_id"], "return_url": f"{_org_front()}/app",
    })
    return {"url": s["url"]}


# ── Webhook ────────────────────────────────────────────────────────

def _verify(payload: bytes, header: str) -> None:
    if not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="Webhook secret not configured")
    try:
        parts = dict(p.split("=", 1) for p in header.split(","))
        ts, sig = parts["t"], [v for k, v in (p.split("=", 1) for p in header.split(",")) if k == "v1"]
    except Exception:
        raise HTTPException(status_code=400, detail="Bad signature header")
    expected = hmac.new(STRIPE_WEBHOOK_SECRET.encode(), f"{ts}.".encode() + payload, hashlib.sha256).hexdigest()
    if not any(hmac.compare_digest(expected, s) for s in sig):
        raise HTTPException(status_code=400, detail="Invalid signature")
    if abs(time.time() - int(ts)) > 600:
        raise HTTPException(status_code=400, detail="Timestamp outside tolerance")


def _iso(ts):
    return datetime.fromtimestamp(int(ts), tz=timezone.utc).isoformat() if ts else None


def _org_for(obj: dict):
    org_id = (obj.get("metadata") or {}).get("org_id")
    if org_id:
        return org_id
    cid = obj.get("customer")
    if cid:
        rows = db_admin.table("organisations").select("id").eq("stripe_customer_id", cid).limit(1).execute().data
        if rows:
            return rows[0]["id"]
    return None


def _apply_subscription(sub: dict) -> None:
    org_id = _org_for(sub)
    if not org_id:
        print("Stripe webhook: subscription with no organisation, ignored")
        return
    item = ((sub.get("items") or {}).get("data") or [{}])[0]
    price = item.get("price") or {}
    plan, interval = _plan_for_price(price.get("id"))
    plan = plan or (sub.get("metadata") or {}).get("plan")
    interval = interval or (price.get("recurring") or {}).get("interval")
    upd = {
        "stripe_customer_id":     sub.get("customer"),
        "stripe_subscription_id": sub.get("id"),
        "subscription_status":    sub.get("status"),
        "current_period_end":     _iso(sub.get("current_period_end") or item.get("current_period_end")),
        "billing_interval":       interval,
    }
    if plan in PLANS:
        upd["plan"] = plan
    db_admin.table("organisations").update(upd).eq("id", org_id).execute()
    forget(org_id)


@webhook_router.post("/billing/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    _verify(payload, request.headers.get("stripe-signature", ""))
    event = json.loads(payload)
    kind, obj = event.get("type"), (event.get("data") or {}).get("object") or {}

    if kind == "checkout.session.completed" and obj.get("subscription"):
        org_id = obj.get("client_reference_id") or (obj.get("metadata") or {}).get("org_id")
        if org_id and obj.get("customer"):
            db_admin.table("organisations").update({"stripe_customer_id": obj["customer"]}).eq("id", org_id).execute()
        _apply_subscription(_stripe("GET", f"/subscriptions/{obj['subscription']}"))
    elif kind in ("customer.subscription.created", "customer.subscription.updated"):
        _apply_subscription(obj)
    elif kind == "customer.subscription.deleted":
        obj["status"] = "canceled"
        _apply_subscription(obj)
    return {"received": True}
