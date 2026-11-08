"""
Invmatics Systems — Orders router
Handles both sales orders and purchase orders.

Key behaviours:
    Sales order confirmed   → reserves stock (qty_reserved++)
    Sales order dispatched  → records sale movement (qty_on_hand--)
    Sales order cancelled   → releases reservation (qty_reserved--)

    PO created              → marks stock on order (qty_on_order++)
    PO received             → records receive movement (qty_on_hand++)
                              updates qty_received per line item
                              sets PO status to partial or received
    PO cancelled            → releases on-order qty (qty_on_order--)

All stock changes go through record_stock_movement() in Postgres
so they're atomic and logged in stock_movements.
"""

from uuid import UUID
from datetime import date
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from database import db_admin
from rates import normalise_code, resolve_rate, rate as live_rate, org_currency
from auth import require_auth, get_client, db_user_id
from models import (
    SalesOrderCreate, SalesOrderUpdate,
    PurchaseOrderCreate, PurchaseOrderUpdate,
    ReceiveStock,
)

router = APIRouter()


# ================================================================
# HELPERS
# ================================================================

def _calc_totals(items: list, tax_rate: float = 0) -> dict:
    """Calculate subtotal, tax, and total from line items."""
    subtotal = sum(i["qty"] * i["unit_price"] for i in items)
    tax_amount = round(subtotal * tax_rate / 100, 2)
    total = subtotal + tax_amount
    return {
        "subtotal":     round(subtotal, 2),
        "tax_amount":   tax_amount,
        "total_amount": round(total, 2),
    }


def _next_number(org_id: str, seq_type: str) -> str:
    """Call the Postgres sequence function to get next document number."""
    result = db_admin.rpc(
        "next_order_number",
        {"p_org_id": org_id, "p_type": seq_type}
    ).execute()
    return result.data


def _first(builder):
    """Run a query and return its first row (or None). Unlike .single(), never raises on 0 rows."""
    rows = builder.limit(1).execute().data
    return rows[0] if rows else None


def _get_product(client, product_id: str) -> dict:
    """Fetch a product or raise 404."""
    product = _first(
        client.table("products")
        .select("id, name, selling_price, cost_price, tax_rate, currency")
        .eq("id", product_id)
    )
    if not product:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")
    return product


def _price_in(product: dict, field: str, order_cur: str, base_cur: str) -> float:
    """A product's price expressed in the order's currency (products default to the org currency)."""
    price = float(product[field] or 0)
    pc = (product.get("currency") or base_cur).upper()
    if pc == order_cur:
        return price
    r = live_rate(pc, order_cur)
    if r is None:
        raise HTTPException(status_code=400,
            detail=f"No live rate to convert {product['name']} from {pc} to {order_cur} — enter the price yourself")
    return round(price * r, 4)


# ================================================================
# SALES ORDERS
# ================================================================

@router.get("/orders/sales")
async def list_sales_orders(
    status:      Optional[str] = None,
    customer_id: Optional[UUID] = None,
    search:      Optional[str] = None,
    user:   dict = Depends(require_auth),
    client       = Depends(get_client),
):
    query = (
        client.table("sales_orders")
        .select(
            "*, "
            "customers(name, contact_name, phone), "
            "invoices(id, invoice_number, status), "
            "sales_order_items(id, product_id, description, qty_ordered, qty_dispatched, unit_price, line_total)"
        )
        .order("created_at", desc=True)
    )

    if status:
        query = query.eq("status", status)
    if customer_id:
        query = query.eq("customer_id", str(customer_id))
    if search:
        query = query.or_(
            f"order_number.ilike.%{search}%,"
            f"customer_ref.ilike.%{search}%"
        )

    result = query.execute()
    return {"orders": result.data or [], "count": len(result.data or [])}


@router.get("/orders/sales/{order_id}")
async def get_sales_order(
    order_id: UUID,
    user:   dict = Depends(require_auth),
    client       = Depends(get_client),
):
    order = _first(
        client.table("sales_orders")
        .select(
            "*, "
            "customers(id, name, contact_name, phone, address, tax_id, payment_terms), "
            "sales_order_items(*, products(name, sku))"
        )
        .eq("id", str(order_id))
    )
    if not order:
        raise HTTPException(status_code=404, detail="Sales order not found")
    return order


@router.post("/orders/sales", status_code=201)
async def create_sales_order(
    body:  SalesOrderCreate,
    user:  dict = Depends(require_auth),
    client      = Depends(get_client),
):
    org_id = user["org_id"]

    # Validate customer exists
    cust = _first(
        client.table("customers")
        .select("id, name, payment_terms")
        .eq("id", str(body.customer_id))
    )
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found")

    if not body.items:
        raise HTTPException(status_code=400, detail="Add at least one line item")
    if any(i.qty <= 0 for i in body.items):
        raise HTTPException(status_code=400, detail="Quantities must be greater than zero")

    order_number = _next_number(org_id, "SO")

    base_cur  = org_currency(client, org_id)
    order_cur = normalise_code(body.currency) or base_cur
    fx        = resolve_rate(order_cur, base_cur, body.exchange_rate)

    # Resolve line items
    resolved_items = []
    for item in body.items:
        product = _get_product(client, str(item.product_id))
        default_price = _price_in(product, "selling_price", order_cur, base_cur) if item.unit_price is None else None
        resolved_items.append({
            "product_id":     str(item.product_id),
            "description":    item.description or product["name"],
            "qty_ordered":    item.qty,
            "qty_dispatched": 0,
            "unit_price":     item.unit_price if item.unit_price is not None else default_price,
            "tax_rate":       item.tax_rate,
            "discount_pct":   item.discount_pct,
            "line_total":     round(
                item.qty * (item.unit_price if item.unit_price is not None else default_price) *
                (1 - item.discount_pct / 100), 2
            ),
        })

    totals = _calc_totals(
        [{"qty": i["qty_ordered"], "unit_price": i["unit_price"]} for i in resolved_items]
    )

    # Create order header
    order_data = {
        "org_id":        org_id,
        "customer_id":   str(body.customer_id),
        "created_by":    db_user_id(user["clerk_user_id"]),
        "order_number":  order_number,
        "status":        "confirmed",
        "payment_status":"unpaid",
        "order_date":    str(body.order_date or date.today()),
        "due_date":      str(body.due_date) if body.due_date else None,
        "customer_ref":  body.customer_ref,
        "notes":         body.notes,
        "internal_notes":body.internal_notes,
        "currency":      order_cur,
        "exchange_rate": fx,
        **totals,
    }

    order_result = db_admin.table("sales_orders").insert(order_data).execute()
    if not order_result.data:
        raise HTTPException(status_code=500, detail="Failed to create sales order")

    order = order_result.data[0]

    # Insert line items
    for item in resolved_items:
        item["org_id"]   = org_id
        item["order_id"] = order["id"]

    db_admin.table("sales_order_items").insert(resolved_items).execute()

    # Reserve stock for confirmed orders
    for item in resolved_items:
        current = (
            db_admin.table("stock_levels")
            .select("qty_reserved")
            .eq("product_id", item["product_id"])
            .execute()
        )
        if current.data:
            db_admin.table("stock_levels").update({
                "qty_reserved": current.data[0]["qty_reserved"] + item["qty_ordered"]
            }).eq("product_id", item["product_id"]).execute()

    return order


@router.put("/orders/sales/{order_id}")
async def update_sales_order(
    order_id: UUID,
    body: SalesOrderUpdate,
    user:   dict = Depends(require_auth),
    client       = Depends(get_client),
):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    for field in ("due_date", "delivered_at"):
        if field in updates:
            updates[field] = str(updates[field])

    result = (
        client.table("sales_orders")
        .update(updates)
        .eq("id", str(order_id))
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Sales order not found")

    return result.data[0]


@router.post("/orders/sales/{order_id}/dispatch")
async def dispatch_sales_order(
    order_id: UUID,
    user: dict = Depends(require_auth),
    client     = Depends(get_client),
):
    """
    Mark order as dispatched.
    Reduces qty_on_hand and releases qty_reserved for each line item.
    Records a 'sale' stock movement per product.
    """
    org_id = user["org_id"]

    order = _first(
        client.table("sales_orders")
        .select("*, sales_order_items(*)")
        .eq("id", str(order_id))
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order["status"] not in ("confirmed", "draft"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot dispatch order with status '{order['status']}'"
        )

    # Check ALL lines have enough stock before moving any, so a shortfall can't leave
    # the order half-dispatched.
    short = []
    for item in order["sales_order_items"]:
        sl = _first(client.table("stock_levels").select("qty_on_hand")
                    .eq("product_id", item["product_id"]))
        have = sl["qty_on_hand"] if sl else 0
        if have < item["qty_ordered"]:
            short.append(f"{item['description']} (need {item['qty_ordered']}, have {have})")
    if short:
        raise HTTPException(status_code=400, detail="Not enough stock: " + "; ".join(short))

    for item in order["sales_order_items"]:
        db_admin.rpc("record_stock_movement", {
            "p_org_id":     org_id,
            "p_product_id": item["product_id"],
            "p_user_id":    db_user_id(user["clerk_user_id"]),
            "p_type":       "sale",
            "p_qty_change": -item["qty_ordered"],
            "p_ref_type":   "sales_order",
            "p_ref_id":     str(order_id),
            "p_notes":      f"Dispatched on order {order['order_number']}",
        }).execute()

        current = (
            db_admin.table("stock_levels")
            .select("qty_reserved")
            .eq("product_id", item["product_id"])
            .execute()
        )
        if current.data:
            db_admin.table("stock_levels").update({
                "qty_reserved": max(0, current.data[0]["qty_reserved"] - item["qty_ordered"])
            }).eq("product_id", item["product_id"]).execute()

    db_admin.table("sales_orders").update(
        {"status": "dispatched"}
    ).eq("id", str(order_id)).execute()

    return {"message": "Order dispatched", "order_id": str(order_id)}


@router.post("/orders/sales/{order_id}/mark-paid")
async def mark_sales_order_paid(
    order_id: UUID,
    user: dict = Depends(require_auth),
    client     = Depends(get_client),
):
    result = (
        client.table("sales_orders")
        .update({"payment_status": "paid"})
        .eq("id", str(order_id))
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Order not found")
    return result.data[0]


# ================================================================
# PURCHASE ORDERS
# ================================================================

@router.get("/orders/purchase")
async def list_purchase_orders(
    status:      Optional[str]  = None,
    supplier_id: Optional[UUID] = None,
    user:   dict = Depends(require_auth),
    client       = Depends(get_client),
):
    query = (
        client.table("purchase_orders")
        .select(
            "*, "
            "suppliers(name, contact_name, phone, lead_days), "
            "purchase_order_items(id, product_id, qty_ordered, qty_received, unit_cost, line_total, products(name, sku))"
        )
        .order("created_at", desc=True)
    )

    if status:
        query = query.eq("status", status)
    if supplier_id:
        query = query.eq("supplier_id", str(supplier_id))

    result = query.execute()
    return {"purchase_orders": result.data or [], "count": len(result.data or [])}


@router.get("/orders/purchase/{po_id}")
async def get_purchase_order(
    po_id: UUID,
    user:   dict = Depends(require_auth),
    client       = Depends(get_client),
):
    po = _first(
        client.table("purchase_orders")
        .select(
            "*, "
            "suppliers(id, name, contact_name, phone, address, tax_id, payment_terms), "
            "purchase_order_items(*, products(name, sku))"
        )
        .eq("id", str(po_id))
    )
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return po


@router.post("/orders/purchase", status_code=201)
async def create_purchase_order(
    body:  PurchaseOrderCreate,
    user:  dict = Depends(require_auth),
    client      = Depends(get_client),
):
    org_id = user["org_id"]

    sup = (
        client.table("suppliers")
        .select("id, name")
        .eq("id", str(body.supplier_id))
        .limit(1)
        .execute()
    )
    if not sup.data:
        raise HTTPException(status_code=404, detail="Supplier not found")

    if not body.items:
        raise HTTPException(status_code=400, detail="Add at least one line item")
    if any(i.qty <= 0 for i in body.items):
        raise HTTPException(status_code=400, detail="Quantities must be greater than zero")

    po_number = _next_number(org_id, "PO")

    base_cur  = org_currency(client, org_id)
    order_cur = normalise_code(body.currency) or base_cur
    fx        = resolve_rate(order_cur, base_cur, body.exchange_rate)

    resolved_items = []
    for item in body.items:
        product = _get_product(client, str(item.product_id))
        cost = item.unit_price if item.unit_price is not None else _price_in(product, "cost_price", order_cur, base_cur)
        resolved_items.append({
            "product_id":  str(item.product_id),
            "qty_ordered": item.qty,
            "qty_received":0,
            "unit_cost":   cost,
            "line_total":  round(item.qty * cost, 2),
        })

    subtotal = sum(i["line_total"] for i in resolved_items)

    po_data = {
        "org_id":            org_id,
        "supplier_id":       str(body.supplier_id),
        "created_by":        db_user_id(user["clerk_user_id"]),
        "po_number":         po_number,
        "status":            "draft",
        "payment_status":    "unpaid",
        "order_date":        str(body.order_date or date.today()),
        "expected_delivery": str(body.expected_delivery) if body.expected_delivery else None,
        "subtotal":          round(subtotal, 2),
        "tax_amount":        0,
        "total_amount":      round(subtotal, 2),
        "notes":             body.notes,
        "currency":          order_cur,
        "exchange_rate":     fx,
    }

    po_result = db_admin.table("purchase_orders").insert(po_data).execute()
    if not po_result.data:
        raise HTTPException(status_code=500, detail="Failed to create purchase order")

    po = po_result.data[0]

    for item in resolved_items:
        item["org_id"] = org_id
        item["po_id"]  = po["id"]

    db_admin.table("purchase_order_items").insert(resolved_items).execute()

    # Mark stock as on order
    for item in resolved_items:
        current = (
            db_admin.table("stock_levels")
            .select("qty_on_order")
            .eq("product_id", item["product_id"])
            .execute()
        )
        if current.data:
            db_admin.table("stock_levels").update({
                "qty_on_order": current.data[0]["qty_on_order"] + item["qty_ordered"]
            }).eq("product_id", item["product_id"]).execute()

    return po


@router.put("/orders/purchase/{po_id}")
async def update_purchase_order(
    po_id: UUID,
    body:  PurchaseOrderUpdate,
    user:  dict = Depends(require_auth),
    client      = Depends(get_client),
):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    for field in ("expected_delivery", "received_at"):
        if field in updates:
            updates[field] = str(updates[field])

    result = (
        client.table("purchase_orders")
        .update(updates)
        .eq("id", str(po_id))
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    return result.data[0]


@router.post("/orders/purchase/{po_id}/send")
async def send_purchase_order(
    po_id: UUID,
    user:  dict = Depends(require_auth),
    client      = Depends(get_client),
):
    """Mark PO as sent to supplier."""
    from datetime import datetime
    result = (
        client.table("purchase_orders")
        .update({"status": "sent", "sent_at": datetime.utcnow().isoformat()})
        .eq("id", str(po_id))
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return result.data[0]


@router.post("/orders/purchase/{po_id}/receive")
async def receive_purchase_order(
    po_id: UUID,
    body:  ReceiveStock,
    user:  dict = Depends(require_auth),
    client      = Depends(get_client),
):
    """
    Receive stock against a purchase order.
    For each line item received:
        → Calls record_stock_movement (atomic, logged)
        → Updates qty_received on PO item
        → Reduces qty_on_order on stock_levels
    Then sets PO status to 'partial' or 'received'.
    """
    org_id = user["org_id"]
    from datetime import datetime

    po = _first(
        client.table("purchase_orders")
        .select("*, purchase_order_items(*)")
        .eq("id", str(po_id))
    )
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    if po["status"] == "received":
        raise HTTPException(status_code=400, detail="Purchase order already fully received")

    po_items = {item["id"]: item for item in po["purchase_order_items"]}

    total_ordered         = sum(i["qty_ordered"]  for i in po["purchase_order_items"])
    total_received_before = sum(i["qty_received"] for i in po["purchase_order_items"])
    total_received_now    = 0

    for receive_item in body.items:
        po_item = po_items.get(str(receive_item.po_item_id))
        if not po_item:
            raise HTTPException(
                status_code=404,
                detail=f"PO item {receive_item.po_item_id} not found"
            )

        qty = receive_item.qty_received
        if qty <= 0:
            continue

        remaining = po_item["qty_ordered"] - po_item["qty_received"]
        if qty > remaining:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot receive {qty} units — only {remaining} remaining on order"
            )

        db_admin.rpc("record_stock_movement", {
            "p_org_id":     org_id,
            "p_product_id": po_item["product_id"],
            "p_user_id":    db_user_id(user["clerk_user_id"]),
            "p_type":       "receive",
            "p_qty_change": qty,
            "p_ref_type":   "purchase_order",
            "p_ref_id":     str(po_id),
            "p_notes":      body.notes or f"Received on {po['po_number']}",
        }).execute()

        db_admin.table("purchase_order_items").update({
            "qty_received": po_item["qty_received"] + qty
        }).eq("id", str(receive_item.po_item_id)).execute()

        current = (
            db_admin.table("stock_levels")
            .select("qty_on_order")
            .eq("product_id", po_item["product_id"])
            .execute()
        )
        if current.data:
            db_admin.table("stock_levels").update({
                "qty_on_order": max(0, current.data[0]["qty_on_order"] - qty)
            }).eq("product_id", po_item["product_id"]).execute()

        total_received_now += qty

    total_received_after = total_received_before + total_received_now
    new_status = "received" if total_received_after >= total_ordered else "partial"

    db_admin.table("purchase_orders").update({
        "status":      new_status,
        "received_at": datetime.utcnow().isoformat() if new_status == "received" else None,
    }).eq("id", str(po_id)).execute()

    return {
        "message":        f"Stock received — PO status: {new_status}",
        "po_id":          str(po_id),
        "status":         new_status,
        "units_received": total_received_now,
    }


@router.post("/orders/purchase/{po_id}/mark-paid")
async def mark_po_paid(
    po_id: UUID,
    user:  dict = Depends(require_auth),
    client      = Depends(get_client),
):
    result = (
        client.table("purchase_orders")
        .update({"payment_status": "paid"})
        .eq("id", str(po_id))
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return result.data[0]
