"""
Invmatics Systems — role permissions

One table says which roles may read and write each part of the API. It's enforced for
EVERY request by `enforce_permissions` (registered once in app.py), so a new route can't
accidentally be left open, and the rules are readable in one place.

Roles:
    admin      everything, including settings and team management
    manager    everything except settings and team management
    sales      customers, quotations, sales orders, invoices, receipts
    warehouse  products, suppliers, inventory, purchase orders, dispatch/delivery
    finance    invoices, receipts, payments, purchase orders (read), reports

A rule is (path prefix, roles that may READ, roles that may WRITE). The longest matching
prefix wins. Anything not listed is admin/manager only, so forgetting a rule fails closed.
"""

from fastapi import Depends, HTTPException, Request

from auth import require_auth

ALL = {"admin", "manager", "sales", "warehouse", "finance"}
ADMIN = {"admin"}
MGMT = {"admin", "manager"}

SALES_SIDE = MGMT | {"sales"}
STOCK_SIDE = MGMT | {"warehouse"}
MONEY_SIDE = MGMT | {"sales", "finance"}

# (prefix, read roles, write roles) — prefixes are matched against the path after "/api"
RULES = [
    ("/auth/me",                  ALL,                          ALL),
    ("/rates",                    ALL,                          ALL),
    ("/support",                  ALL,                          ALL),
    ("/settings",                 ALL,                          ADMIN),
    ("/staff",                    ADMIN,                        ADMIN),

    ("/products",                 ALL,                          STOCK_SIDE),
    ("/inventory",                ALL,                          STOCK_SIDE),
    ("/suppliers",                ALL,                          STOCK_SIDE),
    ("/customers",                ALL,                          SALES_SIDE),
    ("/quotations",               ALL,                          SALES_SIDE),

    ("/orders/sales",             ALL,                          SALES_SIDE),
    ("/orders/sales/{}/dispatch", ALL,                          STOCK_SIDE),
    ("/orders/sales/{}/mark-paid", ALL,                         MONEY_SIDE),
    ("/orders/sales/{}/invoice",  ALL,                          MONEY_SIDE),
    ("/orders/purchase",          STOCK_SIDE | {"finance"},     STOCK_SIDE),
    ("/orders/purchase/{}/mark-paid", STOCK_SIDE | {"finance"}, STOCK_SIDE | {"finance"}),

    ("/invoices",                 MONEY_SIDE,                   MONEY_SIDE),
    ("/receipts",                 MONEY_SIDE,                   MONEY_SIDE),
    ("/delivery-orders",          ALL,                          STOCK_SIDE | {"sales"}),
    ("/delivery-confirmations",   ALL,                          STOCK_SIDE | {"sales"}),

    ("/analytics",                MGMT | {"finance"},           MGMT),
]

_DEFAULT = (MGMT, MGMT)
_READ = {"GET", "HEAD", "OPTIONS"}


def _matches(pattern: str, parts: list) -> bool:
    """'/orders/sales/{}/dispatch' matches '/orders/sales/<anything>/dispatch'."""
    want = [p for p in pattern.split("/") if p]
    if len(parts) < len(want):
        return False
    return all(w == "{}" or w == p for w, p in zip(want, parts))


def allowed_roles(method: str, path: str) -> set:
    """Roles permitted to make this request."""
    parts = [p for p in path.split("/") if p]
    best, best_len = None, -1
    for prefix, read, write in RULES:
        n = len([p for p in prefix.split("/") if p])
        if n > best_len and _matches(prefix, parts):
            best, best_len = (read, write), n
    read, write = best or _DEFAULT
    return read if method.upper() in _READ else write


def enforce_permissions(request: Request, user: dict = Depends(require_auth)) -> None:
    path = request.url.path
    if path.startswith("/api"):
        path = path[4:]
    if request.method == "OPTIONS":
        return
    if user["role"] not in allowed_roles(request.method, path):
        raise HTTPException(
            status_code=403,
            detail=f"Your role ({user['role']}) doesn't have access to this.",
        )
