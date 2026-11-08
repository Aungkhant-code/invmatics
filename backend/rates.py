"""
Invmatics Systems — Exchange rates

Live rates from open.er-api.com (free, no key, ~160 currencies, updated daily), cached in
memory per server instance. If the service is down the last good copy is used. Currencies
the service doesn't know (custom codes) have no rate — callers must ask the user for one.
"""

import re
import time
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException

from auth import require_auth, get_client

router = APIRouter()

SOURCE   = "https://open.er-api.com/v6/latest/USD"
TTL_SECS = 6 * 3600

_cache = {"rates": {"USD": 1.0}, "as_of": None, "fetched": 0.0}

CODE_RE = re.compile(r"^[A-Z0-9]{2,10}$")


def normalise_code(code: Optional[str]) -> Optional[str]:
    code = (code or "").strip().upper()
    if not code:
        return None
    if not CODE_RE.match(code):
        raise HTTPException(status_code=400, detail="Currency must be 2–10 letters or digits (e.g. THB)")
    return code


def usd_rates() -> dict:
    """USD-based rate table (1 USD = x CCY), refreshed at most every 6 hours."""
    if time.time() - _cache["fetched"] > TTL_SECS:
        try:
            r = httpx.get(SOURCE, timeout=5.0)
            r.raise_for_status()
            data = r.json()
            if data.get("result") == "success" and data.get("rates"):
                _cache.update(rates={k: float(v) for k, v in data["rates"].items()},
                              as_of=data.get("time_last_update_utc"), fetched=time.time())
        except Exception:
            _cache["fetched"] = time.time() - TTL_SECS + 300   # retry in 5 min, keep stale copy
    return _cache["rates"]


def rate(src: Optional[str], dst: Optional[str]) -> Optional[float]:
    """Multiply an amount in `src` by this to get `dst`. None if either currency is unknown."""
    if not src or not dst or src == dst:
        return 1.0
    t = usd_rates()
    if src in t and dst in t and t[src]:
        return t[dst] / t[src]
    return None


def resolve_rate(order_cur: str, base_cur: str, given: Optional[float]) -> float:
    """Rate to freeze on a document: the user's override, else live; else a clear error."""
    if order_cur == base_cur:
        return 1.0
    if given is not None:
        if given <= 0:
            raise HTTPException(status_code=400, detail="Exchange rate must be greater than zero")
        return float(given)
    live = rate(order_cur, base_cur)
    if live is None:
        raise HTTPException(
            status_code=400,
            detail=f"No live rate for {order_cur} — enter the exchange rate to {base_cur}",
        )
    return round(live, 8)


def org_currency(client, org_id: str) -> str:
    rows = client.table("organisations").select("currency").eq("id", org_id).limit(1).execute().data
    return ((rows or [{}])[0].get("currency") or "USD").upper()


@router.get("/rates")
async def get_rates(user: dict = Depends(require_auth), client=Depends(get_client)):
    rows = client.table("organisations").select("currency, timezone").eq("id", user["org_id"]).limit(1).execute().data
    org = (rows or [{}])[0]
    usd_rates()
    return {
        "base":     (org.get("currency") or "USD").upper(),
        "timezone": org.get("timezone") or "UTC",
        "rates":    _cache["rates"],       # 1 USD = x
        "as_of":    _cache["as_of"],
    }
