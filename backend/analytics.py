"""
Invmatics Systems — Analytics router
KPI summaries, revenue trends, top products/customers.
Powers the Reports page on the frontend.
"""

from datetime import date, datetime, timedelta
from typing import Optional
from calendar import monthrange

from fastapi import APIRouter, Depends
from auth import require_auth, get_client

router = APIRouter()


# ================================================================
# HELPERS
# ================================================================

def _period_dates(period: str) -> tuple[str, str]:
    """
    Returns (start_date, end_date) strings for a named period.
    period: 'this_month' | 'last_month' | 'last_3_months' | 'this_year'
    """
    today = date.today()

    if period == "this_month":
        start = today.replace(day=1)
        end   = today

    elif period == "last_month":
        first_this = today.replace(day=1)
        last_month = first_this - timedelta(days=1)
        start = last_month.replace(day=1)
        end   = last_month.replace(
            day=monthrange(last_month.year, last_month.month)[1]
        )

    elif period == "last_3_months":
        start = (today - timedelta(days=90)).replace(day=1)
        end   = today

    elif period == "this_year":
        start = today.replace(month=1, day=1)
        end   = today

    else:
        start = today.replace(day=1)
        end   = today

    return str(start), str(end)


def _months_in_range(start_str: str, end_str: str) -> list[dict]:
    """Returns list of {year, month, label} dicts for a date range."""
    start = date.fromisoformat(start_str)
    end   = date.fromisoformat(end_str)
    months = []
    current = start.replace(day=1)
    while current <= end:
        months.append({
            "year":  current.year,
            "month": current.month,
            "label": current.strftime("%b"),
            "start": str(current),
            "end":   str(current.replace(
                day=monthrange(current.year, current.month)[1]
            )),
        })
        if current.month == 12:
            current = current.replace(year=current.year + 1, month=1)
        else:
            current = current.replace(month=current.month + 1)
    return months


# ================================================================
# KPI SUMMARY
# ================================================================

@router.get("/analytics/summary")
async def get_summary(
    period: str  = "this_month",
    user:   dict = Depends(require_auth),
    client       = Depends(get_client),
):
    """
    Dashboard KPI cards:
        → Revenue (MTD or selected period)
        → Cost of goods sold
        → Gross profit + margin %
        → Pending orders count
        → Stock value
        → Outstanding receivables
        → Overdue invoices
    """
    start, end = _period_dates(period)

    orders = (
        client.table("sales_orders")
        .select("total_amount, subtotal, tax_amount, status, payment_status, order_date")
        .gte("order_date", start)
        .lte("order_date", end)
        .in_("status", ["dispatched", "delivered"])
        .execute()
    )

    order_data = orders.data or []
    revenue    = sum(o["total_amount"] for o in order_data)

    movements = (
        client.table("stock_movements")
        .select("qty_change, products(cost_price)")
        .eq("movement_type", "sale")
        .gte("created_at", start)
        .lte("created_at", end + "T23:59:59")
        .execute()
    )

    cogs = sum(
        abs(m["qty_change"]) * (m.get("products") or {}).get("cost_price", 0)
        for m in (movements.data or [])
    )

    gross_profit = revenue - cogs
    gross_margin = round((gross_profit / revenue * 100) if revenue > 0 else 0, 1)

    pending = (
        client.table("sales_orders")
        .select("id", count="exact")
        .in_("status", ["draft", "confirmed"])
        .execute()
    )
    pending_count = pending.count or 0

    invoices = (
        client.table("invoices")
        .select("total_amount, amount_paid, status, due_date")
        .neq("status", "void")
        .neq("status", "paid")
        .execute()
    )
    inv_data    = invoices.data or []
    outstanding = sum(i["total_amount"] - i["amount_paid"] for i in inv_data)

    today_str = str(date.today())
    overdue_count = sum(
        1 for i in inv_data
        if i.get("due_date") and i["due_date"] < today_str
    )

    products = (
        client.table("products")
        .select("cost_price, stock_levels(qty_on_hand)")
        .eq("is_active", True)
        .execute()
    )
    stock_value = sum(
        p["cost_price"] * (p.get("stock_levels") or {}).get("qty_on_hand", 0)
        for p in (products.data or [])
    )

    prev_start, prev_end = _period_dates(
        "last_month" if period == "this_month" else "this_month"
    )
    prev_orders = (
        client.table("sales_orders")
        .select("total_amount")
        .gte("order_date", prev_start)
        .lte("order_date", prev_end)
        .in_("status", ["dispatched", "delivered"])
        .execute()
    )
    prev_revenue  = sum(o["total_amount"] for o in (prev_orders.data or []))
    revenue_delta = round(
        ((revenue - prev_revenue) / prev_revenue * 100)
        if prev_revenue > 0 else 0, 1
    )

    return {
        "period":                  period,
        "start":                   start,
        "end":                     end,
        "revenue":                 round(revenue, 2),
        "cogs":                    round(cogs, 2),
        "gross_profit":            round(gross_profit, 2),
        "gross_margin":            gross_margin,
        "revenue_delta":           revenue_delta,
        "pending_orders":          pending_count,
        "outstanding_receivables": round(outstanding, 2),
        "overdue_count":           overdue_count,
        "stock_value":             round(stock_value, 2),
    }


# ================================================================
# MONTHLY REVENUE + COGS TREND
# ================================================================

@router.get("/analytics/revenue-trend")
async def revenue_trend(
    period: str  = "this_year",
    user:   dict = Depends(require_auth),
    client       = Depends(get_client),
):
    """
    Monthly revenue vs COGS breakdown.
    Powers the dual bar chart on the Reports page.
    """
    start, end = _period_dates(period)
    months = _months_in_range(start, end)

    result = []
    for m in months:
        orders = (
            client.table("sales_orders")
            .select("total_amount, subtotal")
            .gte("order_date", m["start"])
            .lte("order_date", m["end"])
            .in_("status", ["dispatched", "delivered"])
            .execute()
        )
        revenue = sum(o["total_amount"] for o in (orders.data or []))

        movements = (
            client.table("stock_movements")
            .select("qty_change, products(cost_price)")
            .eq("movement_type", "sale")
            .gte("created_at", m["start"])
            .lte("created_at", m["end"] + "T23:59:59")
            .execute()
        )
        cogs = sum(
            abs(mv["qty_change"]) * (mv.get("products") or {}).get("cost_price", 0)
            for mv in (movements.data or [])
        )

        result.append({
            "label":        m["label"],
            "year":         m["year"],
            "month":        m["month"],
            "revenue":      round(revenue, 2),
            "cogs":         round(cogs, 2),
            "gross_profit": round(revenue - cogs, 2),
            "gross_margin": round(
                ((revenue - cogs) / revenue * 100) if revenue > 0 else 0, 1
            ),
        })

    return {"trend": result, "period": period}


# ================================================================
# TOP PRODUCTS
# ================================================================

@router.get("/analytics/top-products")
async def top_products(
    period: str = "this_month",
    limit:  int = 10,
    user:   dict = Depends(require_auth),
    client       = Depends(get_client),
):
    """
    Top products by revenue in the selected period.
    Includes units sold, revenue, and margin %.
    """
    start, end = _period_dates(period)

    movements = (
        client.table("stock_movements")
        .select(
            "product_id, qty_change, "
            "products(id, name, sku, cost_price, selling_price)"
        )
        .eq("movement_type", "sale")
        .gte("created_at", start)
        .lte("created_at", end + "T23:59:59")
        .execute()
    )

    product_stats: dict = {}
    for m in (movements.data or []):
        pid     = m["product_id"]
        product = m.get("products") or {}
        qty     = abs(m["qty_change"])

        if pid not in product_stats:
            product_stats[pid] = {
                "product_id": pid,
                "name":       product.get("name", "Unknown"),
                "sku":        product.get("sku", ""),
                "units_sold": 0,
                "revenue":    0,
                "cogs":       0,
            }

        product_stats[pid]["units_sold"] += qty
        product_stats[pid]["revenue"]    += qty * product.get("selling_price", 0)
        product_stats[pid]["cogs"]       += qty * product.get("cost_price", 0)

    stats = list(product_stats.values())
    for s in stats:
        s["gross_profit"] = round(s["revenue"] - s["cogs"], 2)
        s["margin_pct"]   = round(
            (s["gross_profit"] / s["revenue"] * 100) if s["revenue"] > 0 else 0, 1
        )
        s["revenue"] = round(s["revenue"], 2)
        s["cogs"]    = round(s["cogs"], 2)

    stats.sort(key=lambda x: x["revenue"], reverse=True)
    top = stats[:limit]

    total_revenue = sum(s["revenue"] for s in top)
    for s in top:
        s["revenue_share"] = round(
            (s["revenue"] / total_revenue * 100) if total_revenue > 0 else 0, 1
        )

    return {"products": top, "period": period, "total_revenue": round(total_revenue, 2)}


# ================================================================
# TOP CUSTOMERS
# ================================================================

@router.get("/analytics/top-customers")
async def top_customers(
    period: str = "this_month",
    limit:  int = 10,
    user:   dict = Depends(require_auth),
    client       = Depends(get_client),
):
    """Top customers by spend in the selected period."""
    start, end = _period_dates(period)

    orders = (
        client.table("sales_orders")
        .select(
            "customer_id, total_amount, "
            "customers(id, name)"
        )
        .gte("order_date", start)
        .lte("order_date", end)
        .in_("status", ["dispatched", "delivered"])
        .execute()
    )

    customer_stats: dict = {}
    for o in (orders.data or []):
        cid      = o["customer_id"]
        customer = o.get("customers") or {}

        if cid not in customer_stats:
            customer_stats[cid] = {
                "customer_id": cid,
                "name":        customer.get("name", "Unknown"),
                "order_count": 0,
                "total_spend": 0,
            }

        customer_stats[cid]["order_count"] += 1
        customer_stats[cid]["total_spend"] += o["total_amount"]

    stats = list(customer_stats.values())
    for s in stats:
        s["avg_order_value"] = round(
            s["total_spend"] / s["order_count"] if s["order_count"] > 0 else 0, 2
        )
        s["total_spend"] = round(s["total_spend"], 2)

    stats.sort(key=lambda x: x["total_spend"], reverse=True)
    return {"customers": stats[:limit], "period": period}


# ================================================================
# REVENUE BY CATEGORY
# ================================================================

@router.get("/analytics/revenue-by-category")
async def revenue_by_category(
    period: str  = "this_month",
    user:   dict = Depends(require_auth),
    client       = Depends(get_client),
):
    """Revenue breakdown by product category. Powers the donut chart."""
    start, end = _period_dates(period)

    movements = (
        client.table("stock_movements")
        .select(
            "qty_change, "
            "products(selling_price, categories(name))"
        )
        .eq("movement_type", "sale")
        .gte("created_at", start)
        .lte("created_at", end + "T23:59:59")
        .execute()
    )

    category_revenue: dict = {}
    total = 0

    for m in (movements.data or []):
        product  = m.get("products") or {}
        category = (product.get("categories") or {}).get("name", "Uncategorised")
        revenue  = abs(m["qty_change"]) * product.get("selling_price", 0)

        category_revenue[category] = category_revenue.get(category, 0) + revenue
        total += revenue

    result = [
        {
            "category": cat,
            "revenue":  round(rev, 2),
            "share_pct":round((rev / total * 100) if total > 0 else 0, 1),
        }
        for cat, rev in sorted(category_revenue.items(), key=lambda x: x[1], reverse=True)
    ]

    return {
        "categories":    result,
        "total_revenue": round(total, 2),
        "period":        period,
    }


# ================================================================
# STOCK VALUE TREND (historical)
# ================================================================

@router.get("/analytics/stock-value-trend")
async def stock_value_trend(
    months: int  = 6,
    user:   dict = Depends(require_auth),
    client       = Depends(get_client),
):
    """
    Approximates historical stock value by working backwards
    from current stock using stock movements.
    Powers the line chart on the Reports page.
    """
    today  = date.today()
    result = []

    products = (
        client.table("products")
        .select("id, cost_price, stock_levels(qty_on_hand)")
        .eq("is_active", True)
        .execute()
    )

    current_by_product = {
        p["id"]: {
            "cost_price": p["cost_price"],
            "qty":        (p.get("stock_levels") or {}).get("qty_on_hand", 0),
        }
        for p in (products.data or [])
    }

    current_value = sum(
        v["qty"] * v["cost_price"]
        for v in current_by_product.values()
    )

    for i in range(months - 1, -1, -1):
        if today.month - i <= 0:
            year  = today.year - 1
            month = 12 + (today.month - i)
        else:
            year  = today.year
            month = today.month - i

        month_start = date(year, month, 1)
        month_end   = date(year, month, monthrange(year, month)[1])

        if i == 0:
            result.append({
                "label": today.strftime("%b"),
                "year":  year,
                "month": month,
                "value": round(current_value, 2),
            })
        else:
            since = str(month_end + timedelta(days=1))

            movements_since = (
                client.table("stock_movements")
                .select("product_id, qty_change, products(cost_price)")
                .gte("created_at", since)
                .execute()
            )

            adjustment = sum(
                m["qty_change"] * (m.get("products") or {}).get("cost_price", 0)
                for m in (movements_since.data or [])
            )
            estimated_value = current_value - adjustment

            result.append({
                "label": month_start.strftime("%b"),
                "year":  year,
                "month": month,
                "value": round(max(0, estimated_value), 2),
            })

    return {"trend": result, "months": months}


# ================================================================
# FINANCIAL SUMMARY (bottom panel on Reports page)
# ================================================================

@router.get("/analytics/financial-summary")
async def financial_summary(
    period: str  = "this_month",
    user:   dict = Depends(require_auth),
    client       = Depends(get_client),
):
    """
    The 6-cell financial summary grid on the Reports page:
        Total Revenue, COGS, Gross Profit,
        Outstanding Receivables, Stock Purchased, Overdue Payments
    """
    start, end = _period_dates(period)
    today_str  = str(date.today())

    orders = (
        client.table("sales_orders")
        .select("total_amount, subtotal")
        .gte("order_date", start)
        .lte("order_date", end)
        .in_("status", ["dispatched", "delivered"])
        .execute()
    )
    revenue = sum(o["total_amount"] for o in (orders.data or []))

    movements = (
        client.table("stock_movements")
        .select("qty_change, products(cost_price)")
        .eq("movement_type", "sale")
        .gte("created_at", start)
        .lte("created_at", end + "T23:59:59")
        .execute()
    )
    cogs = sum(
        abs(m["qty_change"]) * (m.get("products") or {}).get("cost_price", 0)
        for m in (movements.data or [])
    )

    invoices = (
        client.table("invoices")
        .select("total_amount, amount_paid, due_date, status")
        .neq("status", "void")
        .neq("status", "paid")
        .execute()
    )
    inv_data    = invoices.data or []
    outstanding = sum(i["total_amount"] - i["amount_paid"] for i in inv_data)
    overdue_amt = sum(
        i["total_amount"] - i["amount_paid"]
        for i in inv_data
        if i.get("due_date") and i["due_date"] < today_str
    )
    overdue_count = sum(
        1 for i in inv_data
        if i.get("due_date") and i["due_date"] < today_str
    )

    pos = (
        client.table("purchase_orders")
        .select("total_amount")
        .gte("order_date", start)
        .lte("order_date", end)
        .in_("status", ["received", "partial"])
        .execute()
    )
    stock_purchased = sum(po["total_amount"] for po in (pos.data or []))
    po_count        = len(pos.data or [])

    gross_profit = revenue - cogs
    gross_margin = round((gross_profit / revenue * 100) if revenue > 0 else 0, 1)

    return {
        "period":                  period,
        "start":                   start,
        "end":                     end,
        "revenue":                 round(revenue, 2),
        "cogs":                    round(cogs, 2),
        "gross_profit":            round(gross_profit, 2),
        "gross_margin":            gross_margin,
        "outstanding_receivables": round(outstanding, 2),
        "overdue_payments":        round(overdue_amt, 2),
        "overdue_count":           overdue_count,
        "stock_purchased":         round(stock_purchased, 2),
        "po_count":                po_count,
    }
