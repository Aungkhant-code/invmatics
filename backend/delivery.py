"""
Invmatics Systems — Delivery router
Delivery orders + delivery confirmations backed by real Supabase data.
"""

from uuid import UUID
from datetime import date
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response

from database import db_admin
from auth import require_auth, get_client
from models import DeliveryOrderCreate, DeliveryOrderUpdate
from pdf_service import generate_delivery_order_pdf, generate_delivery_confirmation_pdf

router = APIRouter()


def _next_number(org_id: str, seq_type: str) -> str:
    return db_admin.rpc(
        "next_order_number",
        {"p_org_id": org_id, "p_type": seq_type}
    ).execute().data


def _fetch_org(client, org_id: str) -> dict:
    result = client.table("organisations").select("*").eq("id", org_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Organisation not found")
    return result.data


# ================================================================
# DELIVERY ORDERS
# ================================================================

@router.get("/delivery-orders")
async def list_delivery_orders(
    status:      Optional[str]  = None,
    customer_id: Optional[UUID] = None,
    user:   dict = Depends(require_auth),
    client       = Depends(get_client),
):
    query = (
        client.table("delivery_orders")
        .select("*, customers(name), delivery_order_items(description, qty_ordered, qty_delivered)")
        .order("created_at", desc=True)
    )
    if status:
        query = query.eq("status", status)
    if customer_id:
        query = query.eq("customer_id", str(customer_id))

    result = query.execute()
    return {"delivery_orders": result.data or [], "count": len(result.data or [])}


@router.get("/delivery-orders/{do_id}")
async def get_delivery_order(
    do_id: UUID,
    user:  dict = Depends(require_auth),
    client      = Depends(get_client),
):
    result = (
        client.table("delivery_orders")
        .select(
            "*, customers(id, name, contact_name, address, phone), "
            "delivery_order_items(id, product_id, description, sku, qty_ordered, qty_delivered), "
            "sales_orders(order_number)"
        )
        .eq("id", str(do_id)).single().execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Delivery order not found")
    return result.data


@router.post("/delivery-orders", status_code=201)
async def create_delivery_order(
    body:  DeliveryOrderCreate,
    user:  dict = Depends(require_auth),
    client      = Depends(get_client),
):
    org_id    = user["org_id"]
    do_number = _next_number(org_id, "DO")

    cust = client.table("customers").select("id").eq("id", str(body.customer_id)).single().execute()
    if not cust.data:
        raise HTTPException(status_code=404, detail="Customer not found")

    do_data = {
        "org_id":           org_id,
        "customer_id":      str(body.customer_id),
        "sales_order_id":   str(body.sales_order_id) if body.sales_order_id else None,
        "do_number":        do_number,
        "status":           "pending",
        "delivery_date":    str(body.delivery_date) if body.delivery_date else None,
        "delivery_address": body.delivery_address,
        "driver_name":      body.driver_name,
        "driver_phone":     body.driver_phone,
        "vehicle_no":       body.vehicle_no,
        "notes":            body.notes,
    }

    do_result = db_admin.table("delivery_orders").insert(do_data).execute()
    if not do_result.data:
        raise HTTPException(status_code=500, detail="Failed to create delivery order")

    delivery_order = do_result.data[0]

    items = [
        {**item, "org_id": org_id, "delivery_order_id": delivery_order["id"]}
        for item in (body.items or [])
    ]
    if items:
        db_admin.table("delivery_order_items").insert(items).execute()

    return delivery_order


@router.put("/delivery-orders/{do_id}")
async def update_delivery_order(
    do_id: UUID,
    body:  DeliveryOrderUpdate,
    user:  dict = Depends(require_auth),
    client      = Depends(get_client),
):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    if "delivery_date" in updates:
        updates["delivery_date"] = str(updates["delivery_date"])

    result = (
        client.table("delivery_orders").update(updates)
        .eq("id", str(do_id)).execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Delivery order not found")
    return result.data[0]


@router.get("/delivery-orders/{do_number}/pdf")
async def get_delivery_order_pdf(
    do_number: str,
    user:  dict = Depends(require_auth),
    client      = Depends(get_client),
):
    result = (
        client.table("delivery_orders")
        .select(
            "*, customers(name, contact_name, address, phone), "
            "delivery_order_items(description, sku, qty_ordered, qty_delivered), "
            "sales_orders(order_number)"
        )
        .eq("do_number", do_number).single().execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail=f"Delivery order {do_number} not found")

    do       = result.data
    customer = do.get("customers") or {}
    org      = _fetch_org(client, do["org_id"])
    items    = do.get("delivery_order_items") or []
    total_units = sum(i.get("qty_delivered", 0) for i in items)

    ctx = {
        "org": {
            "name":    org.get("name", ""),
            "address": org.get("address", ""),
            "tax_id":  org.get("tax_id"),
            "phone":   org.get("phone"),
            "email":   org.get("email"),
        },
        "customer": {
            "name":         customer.get("name", ""),
            "contact_name": customer.get("contact_name"),
            "address":      customer.get("address", ""),
            "phone":        customer.get("phone"),
        },
        "doc_number":       do["do_number"],
        "delivery_date":    do.get("delivery_date", str(date.today())),
        "delivery_address": do.get("delivery_address"),
        "order_ref":        (do.get("sales_orders") or {}).get("order_number"),
        "customer_ref":     None,
        "driver_name":      do.get("driver_name"),
        "driver_phone":     do.get("driver_phone"),
        "vehicle_no":       do.get("vehicle_no"),
        "items":            items,
        "total_units":      total_units,
        "notes":            do.get("notes"),
        "doc_status":       do["status"].title(),
        "doc_status_class": do["status"],
    }

    pdf_bytes = generate_delivery_order_pdf(ctx)
    return Response(
        content=pdf_bytes, media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{do_number}.pdf"'},
    )


# ================================================================
# DELIVERY CONFIRMATIONS
# ================================================================

@router.get("/delivery-confirmations/{dc_number}/pdf")
async def get_delivery_confirmation_pdf(
    dc_number: str,
    user:  dict = Depends(require_auth),
    client      = Depends(get_client),
):
    result = (
        client.table("delivery_confirmations")
        .select(
            "*, delivery_orders(do_number, customers(name, contact_name, address, phone), "
            "sales_orders(order_number)), "
            "delivery_confirmation_items(description, sku, qty_delivered, qty_received, condition, condition_class)"
        )
        .eq("dc_number", dc_number).single().execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail=f"Delivery confirmation {dc_number} not found")

    dc       = result.data
    do       = dc.get("delivery_orders") or {}
    customer = do.get("customers") or {}
    org      = _fetch_org(client, dc["org_id"])

    ctx = {
        "org": {
            "name":    org.get("name", ""),
            "address": org.get("address", ""),
            "tax_id":  org.get("tax_id"),
            "phone":   org.get("phone"),
            "email":   org.get("email"),
        },
        "customer": {
            "name":         customer.get("name", ""),
            "contact_name": customer.get("contact_name"),
            "address":      customer.get("address", ""),
            "phone":        customer.get("phone"),
        },
        "doc_number":         dc["dc_number"],
        "delivery_date":      dc.get("confirmed_at", str(date.today()))[:10],
        "delivery_order_ref": do.get("do_number", ""),
        "order_ref":          (do.get("sales_orders") or {}).get("order_number"),
        "delivery_address":   None,
        "items":              dc.get("delivery_confirmation_items") or [],
        "notes":              dc.get("notes"),
        "photo_refs":         dc.get("photo_urls") or [],
        "doc_status":         "Confirmed",
        "doc_status_class":   "confirmed",
    }

    pdf_bytes = generate_delivery_confirmation_pdf(ctx)
    return Response(
        content=pdf_bytes, media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{dc_number}.pdf"'},
    )
