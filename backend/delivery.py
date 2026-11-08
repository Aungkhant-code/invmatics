"""
Invmatics Systems — Delivery router
Delivery orders + delivery confirmations backed by real Supabase data.
"""

from uuid import UUID
from datetime import date
from typing import Optional

import base64, re
from datetime import datetime, timezone
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response

from database import db_admin
from org_sync import ensure_org_name
from auth import require_auth, get_client, db_user_id
from models import DeliveryOrderCreate, DeliveryOrderUpdate
from pdf_service import generate_delivery_order_pdf, generate_delivery_confirmation_pdf

router = APIRouter()


def _next_number(org_id: str, seq_type: str) -> str:
    return db_admin.rpc(
        "next_order_number",
        {"p_org_id": org_id, "p_type": seq_type}
    ).execute().data


def _first(builder):
    rows = builder.limit(1).execute().data
    return rows[0] if rows else None


def _fetch_org(client, org_id: str) -> dict:
    row = _first(client.table("organisations").select("*").eq("id", org_id))
    if not row:
        raise HTTPException(status_code=404, detail="Organisation not found")
    return ensure_org_name(row)


MAX_PHOTOS      = 4
MAX_PHOTO_BYTES = 450_000
_MAGIC = {"png": b"\x89PNG", "jpeg": b"\xff\xd8\xff", "webp": b"RIFF"}


def _check_photo(data_url: str) -> None:
    m = re.match(r"^data:image/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$", data_url or "")
    if not m:
        raise HTTPException(status_code=400, detail="Photos must be PNG, JPEG or WebP images")
    kind, payload = m.groups()
    try:
        raw = base64.b64decode(payload, validate=True)
    except Exception:
        raise HTTPException(status_code=400, detail="A photo couldn't be read")
    if len(raw) > MAX_PHOTO_BYTES:
        raise HTTPException(status_code=413, detail="A photo is too large (max ~450 KB after resizing)")
    if not raw.startswith(_MAGIC[kind]):
        raise HTTPException(status_code=400, detail="A file isn't a valid image")


class ProofIn(BaseModel):
    received_by: Optional[str] = None
    notes:       Optional[str] = None
    photos:      list[str] = []
    items:       list[dict] = []   # [{item_id, qty_received, condition}]


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
    row = _first(
        client.table("delivery_orders")
        .select(
            "*, customers(id, name, contact_name, address, phone), "
            "delivery_order_items(id, product_id, description, sku, qty_ordered, qty_delivered), "
            "sales_orders(order_number), "
            "delivery_confirmations(id, dc_number, confirmed_by_name, confirmed_at, notes, photo_urls)"
        )
        .eq("id", str(do_id))
    )
    if not row:
        raise HTTPException(status_code=404, detail="Delivery order not found")
    return row


@router.post("/delivery-orders", status_code=201)
async def create_delivery_order(
    body:  DeliveryOrderCreate,
    user:  dict = Depends(require_auth),
    client      = Depends(get_client),
):
    org_id    = user["org_id"]
    do_number = _next_number(org_id, "DO")

    cust = _first(client.table("customers").select("id").eq("id", str(body.customer_id)))
    if not cust:
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
        "created_by":       db_user_id(user["clerk_user_id"]),
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


@router.post("/delivery-orders/from-order/{order_id}", status_code=201)
async def create_from_sales_order(
    order_id: UUID,
    user:  dict = Depends(require_auth),
    client      = Depends(get_client),
):
    """Create a delivery order from a sales order, copying its lines."""
    org_id = user["org_id"]
    order = _first(
        client.table("sales_orders")
        .select("id, customer_id, status, sales_order_items(product_id, description, qty_ordered)")
        .eq("id", str(order_id))
    )
    if not order:
        raise HTTPException(status_code=404, detail="Sales order not found")
    if order["status"] in ("draft", "cancelled"):
        raise HTTPException(status_code=409, detail=f"A {order['status']} order can't be delivered")
    existing = _first(
        client.table("delivery_orders").select("id, do_number")
        .eq("sales_order_id", str(order_id)).neq("status", "cancelled")
    )
    if existing:
        raise HTTPException(status_code=409, detail=f"Delivery order {existing['do_number']} already exists for this order")

    cust = _first(client.table("customers").select("address").eq("id", order["customer_id"]))
    do = db_admin.table("delivery_orders").insert({
        "org_id": org_id, "customer_id": order["customer_id"], "sales_order_id": str(order_id),
        "do_number": _next_number(org_id, "DO"), "status": "pending",
        "delivery_date": str(date.today()),
        "delivery_address": (cust or {}).get("address"),
        "created_by": db_user_id(user["clerk_user_id"]),
    }).execute().data[0]
    lines = [{
        "org_id": org_id, "delivery_order_id": do["id"], "product_id": l.get("product_id"),
        "description": l["description"], "qty_ordered": l["qty_ordered"], "qty_delivered": 0,
    } for l in (order.get("sales_order_items") or [])]
    if lines:
        db_admin.table("delivery_order_items").insert(lines).execute()
    return do


@router.post("/delivery-orders/{do_id}/proof")
async def submit_proof(
    do_id: UUID,
    body:  ProofIn,
    user:  dict = Depends(require_auth),
    client      = Depends(get_client),
):
    """Record delivery: confirmation + proof photos; marks the delivery (and order) delivered."""
    org_id = user["org_id"]
    if len(body.photos) > MAX_PHOTOS:
        raise HTTPException(status_code=400, detail=f"At most {MAX_PHOTOS} photos")
    for p in body.photos:
        _check_photo(p)

    do = _first(
        client.table("delivery_orders")
        .select("id, do_number, status, sales_order_id, delivery_order_items(id, product_id, description, sku, qty_ordered)")
        .eq("id", str(do_id))
    )
    if not do:
        raise HTTPException(status_code=404, detail="Delivery order not found")
    if do["status"] in ("cancelled", "confirmed"):
        raise HTTPException(status_code=409, detail=f"This delivery is already {do['status']}")
    if _first(client.table("delivery_confirmations").select("id").eq("delivery_order_id", str(do_id))):
        raise HTTPException(status_code=409, detail="Proof of delivery was already submitted")

    now = datetime.now(timezone.utc).isoformat()
    dc = db_admin.table("delivery_confirmations").insert({
        "org_id": org_id, "delivery_order_id": str(do_id),
        "dc_number": "DC-" + do["do_number"].split("-", 1)[-1],
        "confirmed_by_name": (body.received_by or "").strip() or None,
        "confirmed_at": now, "notes": body.notes, "photo_urls": body.photos,
    }).execute().data[0]

    by_id = {str(i.get("item_id")): i for i in body.items}
    rows, updates = [], []
    for it in do.get("delivery_order_items") or []:
        given = by_id.get(str(it["id"]), {})
        qty = given.get("qty_received", it["qty_ordered"])
        try:
            qty = max(0, min(int(qty), int(it["qty_ordered"])))
        except (TypeError, ValueError):
            qty = it["qty_ordered"]
        cond = (given.get("condition") or "Good")[:40]
        rows.append({
            "org_id": org_id, "delivery_confirmation_id": dc["id"], "product_id": it.get("product_id"),
            "description": it["description"], "sku": it.get("sku"),
            "qty_delivered": it["qty_ordered"], "qty_received": qty,
            "condition": cond, "condition_class": "good" if cond.lower() == "good" else "damaged",
        })
        updates.append((it["id"], qty))
    if rows:
        db_admin.table("delivery_confirmation_items").insert(rows).execute()
    for item_id, qty in updates:
        db_admin.table("delivery_order_items").update({"qty_delivered": qty}).eq("id", item_id).eq("org_id", org_id).execute()

    db_admin.table("delivery_orders").update({"status": "delivered"}).eq("id", str(do_id)).eq("org_id", org_id).execute()
    if do.get("sales_order_id"):
        db_admin.table("sales_orders").update({"status": "delivered", "delivered_at": now}) \
            .eq("id", do["sales_order_id"]).eq("org_id", org_id).eq("status", "dispatched").execute()
    return {"dc_number": dc["dc_number"], "status": "delivered"}


@router.get("/delivery-orders/{do_number}/pdf")
async def get_delivery_order_pdf(
    do_number: str,
    user:  dict = Depends(require_auth),
    client      = Depends(get_client),
):
    do = _first(
        client.table("delivery_orders")
        .select(
            "*, customers(name, contact_name, address, phone), "
            "delivery_order_items(description, sku, qty_ordered, qty_delivered), "
            "sales_orders(order_number)"
        )
        .eq("do_number", do_number)
    )
    if not do:
        raise HTTPException(status_code=404, detail=f"Delivery order {do_number} not found")

    customer = do.get("customers") or {}
    org      = _fetch_org(client, do["org_id"])
    items    = do.get("delivery_order_items") or []
    total_units = sum(i.get("qty_delivered") or 0 for i in items)

    ctx = {
        "org": {
            "name":    org.get("name", ""),
            "address": org.get("address", ""),
            "tax_id":  org.get("tax_id"),
            "phone":   org.get("phone"),
            "email":   org.get("email"),
            "logo":    org.get("logo_url"),
        },
        "customer": {
            "name":         customer.get("name", ""),
            "contact_name": customer.get("contact_name"),
            "address":      customer.get("address", ""),
            "phone":        customer.get("phone"),
        },
        "doc_number":       do["do_number"],
        "delivery_date":    do.get("delivery_date") or str(date.today()),
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
    dc = _first(
        client.table("delivery_confirmations")
        .select(
            "*, delivery_orders(do_number, customers(name, contact_name, address, phone), "
            "sales_orders(order_number)), "
            "delivery_confirmation_items(description, sku, qty_delivered, qty_received, condition, condition_class)"
        )
        .eq("dc_number", dc_number)
    )
    if not dc:
        raise HTTPException(status_code=404, detail=f"Delivery confirmation {dc_number} not found")

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
            "logo":    org.get("logo_url"),
        },
        "customer": {
            "name":         customer.get("name", ""),
            "contact_name": customer.get("contact_name"),
            "address":      customer.get("address", ""),
            "phone":        customer.get("phone"),
        },
        "doc_number":         dc["dc_number"],
        "delivery_date":      (dc.get("confirmed_at") or str(date.today()))[:10],
        "delivery_order_ref": do.get("do_number", ""),
        "order_ref":          (do.get("sales_orders") or {}).get("order_number"),
        "delivery_address":   None,
        "items":              dc.get("delivery_confirmation_items") or [],
        "notes":              dc.get("notes"),
        "photo_refs":         [f"Photo {i+1}" for i, _ in enumerate(dc.get("photo_urls") or [])],
        "doc_status":         "Confirmed",
        "doc_status_class":   "confirmed",
    }

    pdf_bytes = generate_delivery_confirmation_pdf(ctx)
    return Response(
        content=pdf_bytes, media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{dc_number}.pdf"'},
    )
