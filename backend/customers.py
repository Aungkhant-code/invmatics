"""
Invmatics Systems — Customers router
Full CRUD + order history + outstanding balance.
"""

from uuid import UUID
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from database import db_admin
from auth import require_auth, get_client
from models import CustomerCreate, CustomerUpdate

router = APIRouter()


# ── List customers ─────────────────────────────────────────────────

@router.get("/customers")
async def list_customers(
    search:    Optional[str]  = None,
    is_active: bool           = True,
    user:      dict           = Depends(require_auth),
    client                    = Depends(get_client),
):
    query = (
        client.table("customers")
        .select("*")
        .eq("is_active", is_active)
        .order("name")
    )

    if search:
        query = query.or_(
            f"name.ilike.%{search}%,"
            f"contact_name.ilike.%{search}%,"
            f"email.ilike.%{search}%"
        )

    result = query.execute()
    customers = result.data or []

    # Attach outstanding balance from invoices
    for c in customers:
        inv = (
            client.table("invoices")
            .select("total_amount, amount_paid")
            .eq("customer_id", c["id"])
            .neq("status", "void")
            .execute()
        )
        outstanding = sum(
            (i["total_amount"] - i["amount_paid"])
            for i in (inv.data or [])
        )
        c["outstanding_balance"] = round(outstanding, 2)

    return {"customers": customers, "count": len(customers)}


# ── Get single customer ────────────────────────────────────────────

@router.get("/customers/{customer_id}")
async def get_customer(
    customer_id: UUID,
    user:   dict = Depends(require_auth),
    client       = Depends(get_client),
):
    result = (
        client.table("customers")
        .select("*")
        .eq("id", str(customer_id))
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Customer not found")

    customer = result.data

    # Recent orders
    orders = (
        client.table("sales_orders")
        .select("id, order_number, status, payment_status, total_amount, order_date")
        .eq("customer_id", str(customer_id))
        .order("order_date", desc=True)
        .limit(10)
        .execute()
    )

    # Outstanding invoices
    invoices = (
        client.table("invoices")
        .select("invoice_number, status, total_amount, amount_paid, due_date")
        .eq("customer_id", str(customer_id))
        .neq("status", "void")
        .execute()
    )

    outstanding = sum(
        (i["total_amount"] - i["amount_paid"])
        for i in (invoices.data or [])
    )

    customer["recent_orders"]       = orders.data or []
    customer["invoices"]            = invoices.data or []
    customer["outstanding_balance"] = round(outstanding, 2)
    customer["total_orders"]        = len(orders.data or [])

    return customer


# ── Create customer ────────────────────────────────────────────────

@router.post("/customers", status_code=201)
async def create_customer(
    body:   CustomerCreate,
    user:   dict = Depends(require_auth),
):
    data = {
        "org_id": user["org_id"],
        **body.model_dump(exclude_none=True),
    }

    result = db_admin.table("customers").insert(data).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create customer")

    return result.data[0]


# ── Update customer ────────────────────────────────────────────────

@router.put("/customers/{customer_id}")
async def update_customer(
    customer_id: UUID,
    body:   CustomerUpdate,
    user:   dict = Depends(require_auth),
    client       = Depends(get_client),
):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = (
        client.table("customers")
        .update(updates)
        .eq("id", str(customer_id))
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Customer not found")

    return result.data[0]


# ── Delete (soft) ──────────────────────────────────────────────────

@router.delete("/customers/{customer_id}", status_code=204)
async def delete_customer(
    customer_id: UUID,
    user:   dict = Depends(require_auth),
    client       = Depends(get_client),
):
    result = (
        client.table("customers")
        .update({"is_active": False})
        .eq("id", str(customer_id))
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Customer not found")

    return None


# ── Customer order history ─────────────────────────────────────────

@router.get("/customers/{customer_id}/orders")
async def get_customer_orders(
    customer_id: UUID,
    user:   dict = Depends(require_auth),
    client       = Depends(get_client),
):
    orders = (
        client.table("sales_orders")
        .select(
            "*, "
            "sales_order_items(product_id, description, qty_ordered, unit_price, line_total)"
        )
        .eq("customer_id", str(customer_id))
        .order("order_date", desc=True)
        .execute()
    )

    return {"orders": orders.data or [], "count": len(orders.data or [])}


# ── Customer statement (all invoices + payments) ───────────────────

@router.get("/customers/{customer_id}/statement")
async def get_customer_statement(
    customer_id: UUID,
    user:   dict = Depends(require_auth),
    client       = Depends(get_client),
):
    invoices = (
        client.table("invoices")
        .select(
            "invoice_number, invoice_date, due_date, "
            "status, total_amount, amount_paid"
        )
        .eq("customer_id", str(customer_id))
        .neq("status", "void")
        .order("invoice_date", desc=True)
        .execute()
    )

    data = invoices.data or []
    total_invoiced    = sum(i["total_amount"] for i in data)
    total_paid        = sum(i["amount_paid"]  for i in data)
    total_outstanding = total_invoiced - total_paid

    return {
        "invoices":          data,
        "total_invoiced":    round(total_invoiced, 2),
        "total_paid":        round(total_paid, 2),
        "total_outstanding": round(total_outstanding, 2),
    }
