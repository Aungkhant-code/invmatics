"""
Invmatics Systems — Suppliers router
Full CRUD + purchase order history.
"""

from uuid import UUID
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from database import db_admin
from auth import require_auth, get_client
from models import SupplierCreate, SupplierUpdate

router = APIRouter()


# ── List suppliers ─────────────────────────────────────────────────

@router.get("/suppliers")
async def list_suppliers(
    search:    Optional[str] = None,
    is_active: bool          = True,
    user:  dict              = Depends(require_auth),
    client                   = Depends(get_client),
):
    query = (
        client.table("suppliers")
        .select("*")
        .eq("is_active", is_active)
        .order("name")
    )

    if search:
        query = query.or_(
            f"name.ilike.%{search}%,"
            f"contact_name.ilike.%{search}%"
        )

    result = query.execute()
    suppliers = result.data or []

    # Attach outstanding payable per supplier
    for s in suppliers:
        pos = (
            client.table("purchase_orders")
            .select("total_amount, payment_status")
            .eq("supplier_id", s["id"])
            .eq("payment_status", "unpaid")
            .execute()
        )
        s["outstanding_payable"] = round(
            sum(po["total_amount"] for po in (pos.data or [])), 2
        )

    return {"suppliers": suppliers, "count": len(suppliers)}


# ── Get single supplier ────────────────────────────────────────────

@router.get("/suppliers/{supplier_id}")
async def get_supplier(
    supplier_id: UUID,
    user:   dict = Depends(require_auth),
    client       = Depends(get_client),
):
    result = (
        client.table("suppliers")
        .select("*")
        .eq("id", str(supplier_id))
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Supplier not found")

    supplier = result.data

    # Products supplied
    products = (
        client.table("products")
        .select("id, name, sku, cost_price, selling_price")
        .eq("supplier_id", str(supplier_id))
        .eq("is_active", True)
        .order("name")
        .execute()
    )

    # Recent POs
    pos = (
        client.table("purchase_orders")
        .select("po_number, status, payment_status, total_amount, order_date, expected_delivery")
        .eq("supplier_id", str(supplier_id))
        .order("order_date", desc=True)
        .limit(10)
        .execute()
    )

    outstanding = sum(
        po["total_amount"]
        for po in (pos.data or [])
        if po["payment_status"] == "unpaid"
    )

    supplier["products"]            = products.data or []
    supplier["recent_pos"]          = pos.data or []
    supplier["total_pos"]           = len(pos.data or [])
    supplier["outstanding_payable"] = round(outstanding, 2)
    supplier["total_spend"]         = round(
        sum(po["total_amount"] for po in (pos.data or [])), 2
    )

    return supplier


# ── Create supplier ────────────────────────────────────────────────

@router.post("/suppliers", status_code=201)
async def create_supplier(
    body:  SupplierCreate,
    user:  dict = Depends(require_auth),
):
    data = {
        "org_id": user["org_id"],
        **body.model_dump(exclude_none=True),
    }

    result = db_admin.table("suppliers").insert(data).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create supplier")

    return result.data[0]


# ── Update supplier ────────────────────────────────────────────────

@router.put("/suppliers/{supplier_id}")
async def update_supplier(
    supplier_id: UUID,
    body:   SupplierUpdate,
    user:   dict = Depends(require_auth),
    client       = Depends(get_client),
):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = (
        client.table("suppliers")
        .update(updates)
        .eq("id", str(supplier_id))
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Supplier not found")

    return result.data[0]


# ── Delete (soft) ──────────────────────────────────────────────────

@router.delete("/suppliers/{supplier_id}", status_code=204)
async def delete_supplier(
    supplier_id: UUID,
    user:   dict = Depends(require_auth),
    client       = Depends(get_client),
):
    result = (
        client.table("suppliers")
        .update({"is_active": False})
        .eq("id", str(supplier_id))
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Supplier not found")

    return None


# ── Supplier PO history ────────────────────────────────────────────

@router.get("/suppliers/{supplier_id}/purchase-orders")
async def get_supplier_pos(
    supplier_id: UUID,
    user:   dict = Depends(require_auth),
    client       = Depends(get_client),
):
    pos = (
        client.table("purchase_orders")
        .select(
            "*, "
            "purchase_order_items(product_id, qty_ordered, qty_received, unit_cost, line_total)"
        )
        .eq("supplier_id", str(supplier_id))
        .order("order_date", desc=True)
        .execute()
    )

    return {"purchase_orders": pos.data or [], "count": len(pos.data or [])}
