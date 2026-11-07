"""
Invmatics Systems — Invoices router
PDF generation + CRUD backed by real Supabase data.
"""

from uuid import UUID
from datetime import date
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response

from database import db_admin
from org_sync import ensure_org_name
from auth import require_auth, get_client, db_user_id
from models import InvoiceCreate, InvoiceUpdate, RecordPayment
from pdf_service import generate_invoice_pdf

router = APIRouter()


# ================================================================
# HELPERS
# ================================================================

def _first(builder):
    """First row of a query or None (never raises on 0 rows, unlike .single())."""
    rows = builder.limit(1).execute().data
    return rows[0] if rows else None


def _next_number(org_id: str) -> str:
    result = db_admin.rpc(
        "next_order_number",
        {"p_org_id": org_id, "p_type": "INV"}
    ).execute()
    return result.data


def _build_org_context(org: dict) -> dict:
    return {
        "name":              org.get("name", ""),
        "address":           org.get("address", ""),
        "tax_id":            org.get("tax_id"),
        "phone":             org.get("phone"),
        "email":             org.get("email"),
        "logo":              org.get("logo_url"),
        "bank_name":         org.get("bank_name"),
        "bank_account_no":   org.get("bank_account_no"),
        "bank_account_name": org.get("bank_account_name"),
    }


def _build_customer_context(c: dict) -> dict:
    return {
        "name":         c.get("name", ""),
        "contact_name": c.get("contact_name"),
        "address":      c.get("address", ""),
        "tax_id":       c.get("tax_id"),
        "phone":        c.get("phone"),
    }


def _fetch_org(client, org_id: str) -> dict:
    org = _first(client.table("organisations").select("*").eq("id", org_id))
    if not org:
        raise HTTPException(status_code=404, detail="Organisation not found")
    return ensure_org_name(org)


# ================================================================
# LIST & GET
# ================================================================

@router.get("/invoices")
async def list_invoices(
    status:      Optional[str]  = None,
    customer_id: Optional[UUID] = None,
    user:   dict = Depends(require_auth),
    client       = Depends(get_client),
):
    # Nothing else flips invoices to overdue, so do it when they're listed.
    try:
        client.table("invoices").update({"status": "overdue"}) \
            .eq("status", "sent").lt("due_date", str(date.today())).execute()
    except Exception as e:
        print(f"Note: couldn't refresh overdue invoices: {e}")

    query = (
        client.table("invoices")
        .select(
            "*, "
            "customers(name, contact_name), "
            "sales_orders(order_number), "
            "invoice_items(description, qty, unit_price, line_total)"
        )
        .order("invoice_date", desc=True)
    )
    if status:
        query = query.eq("status", status)
    if customer_id:
        query = query.eq("customer_id", str(customer_id))

    result = query.execute()
    return {"invoices": result.data or [], "count": len(result.data or [])}


@router.get("/invoices/{invoice_id}")
async def get_invoice(
    invoice_id: UUID,
    user:   dict = Depends(require_auth),
    client       = Depends(get_client),
):
    invoice = _first(
        client.table("invoices")
        .select(
            "*, "
            "customers(id, name, contact_name, address, tax_id, phone, payment_terms), "
            "invoice_items(id, product_id, description, qty, unit_price, tax_rate, line_total), "
            "sales_orders(order_number), "
            "payments(id, amount, payment_method, reference, paid_at, notes)"
        )
        .eq("id", str(invoice_id))
    )
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


# ================================================================
# CREATE
# ================================================================

@router.post("/invoices", status_code=201)
async def create_invoice(
    body:  InvoiceCreate,
    user:  dict = Depends(require_auth),
    client      = Depends(get_client),
):
    org_id = user["org_id"]

    cust = _first(
        client.table("customers")
        .select("id, name, payment_terms")
        .eq("id", str(body.customer_id))
    )
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found")
    if not body.items:
        raise HTTPException(status_code=400, detail="Add at least one line item")

    invoice_number = _next_number(org_id)

    resolved = []
    for item in body.items:
        product = _first(
            client.table("products")
            .select("name, selling_price")
            .eq("id", str(item.product_id))
        )
        if not product:
            raise HTTPException(
                status_code=404,
                detail=f"Product {item.product_id} not found"
            )
        unit_price = item.unit_price or product["selling_price"]
        line_total = round(item.qty * unit_price * (1 - item.discount_pct / 100), 2)
        resolved.append({
            "product_id":  str(item.product_id),
            "description": item.description or product["name"],
            "qty":         item.qty,
            "unit_price":  unit_price,
            "tax_rate":    item.tax_rate,
            "line_total":  line_total,
        })

    subtotal   = sum(i["line_total"] for i in resolved)
    tax_amount = round(subtotal * body.tax_rate / 100, 2)
    total      = subtotal + tax_amount

    settings = _first(
        client.table("org_settings").select("default_payment_terms, default_invoice_notes")
    ) or {}
    payment_terms = settings.get("default_payment_terms") or 14

    invoice_date = body.invoice_date or date.today()
    due_date     = body.due_date or date.fromordinal(
        invoice_date.toordinal() + payment_terms
    )

    invoice_data = {
        "org_id":         org_id,
        "customer_id":    str(body.customer_id),
        "created_by":     db_user_id(user["clerk_user_id"]),
        "sales_order_id": str(body.sales_order_id) if body.sales_order_id else None,
        "invoice_number": invoice_number,
        "status":         "draft",
        "invoice_date":   str(invoice_date),
        "due_date":       str(due_date),
        "subtotal":       round(subtotal, 2),
        "tax_rate":       body.tax_rate,
        "tax_amount":     tax_amount,
        "total_amount":   round(total, 2),
        "amount_paid":    0,
        "notes":          body.notes,
    }

    inv_result = db_admin.table("invoices").insert(invoice_data).execute()
    if not inv_result.data:
        raise HTTPException(status_code=500, detail="Failed to create invoice")

    invoice = inv_result.data[0]

    for item in resolved:
        item["org_id"]     = org_id
        item["invoice_id"] = invoice["id"]

    db_admin.table("invoice_items").insert(resolved).execute()

    return invoice


# ================================================================
# CREATE FROM A SALES ORDER
# ================================================================

@router.post("/orders/sales/{order_id}/invoice", status_code=201)
async def create_invoice_from_order(
    order_id: UUID,
    user:  dict = Depends(require_auth),
    client      = Depends(get_client),
):
    """Turn a sales order into a draft invoice (items, customer and due date carried over)."""
    org_id = user["org_id"]

    order = _first(
        client.table("sales_orders")
        .select("*, sales_order_items(*)")
        .eq("id", str(order_id))
    )
    if not order:
        raise HTTPException(status_code=404, detail="Sales order not found")
    if order["status"] == "cancelled":
        raise HTTPException(status_code=400, detail="Can't invoice a cancelled order")
    if not order.get("sales_order_items"):
        raise HTTPException(status_code=400, detail="This order has no line items")

    existing = _first(
        client.table("invoices").select("invoice_number")
        .eq("sales_order_id", str(order_id)).neq("status", "void")
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Invoice {existing['invoice_number']} already exists for this order",
        )

    settings = _first(
        client.table("org_settings")
        .select("default_payment_terms, default_tax_rate, default_invoice_notes")
    ) or {}
    tax_rate = float(settings["default_tax_rate"]) if settings.get("default_tax_rate") is not None else 7.0
    terms    = settings.get("default_payment_terms") or 14

    items = [{
        "product_id":  i["product_id"],
        "description": i["description"],
        "qty":         i["qty_ordered"],
        "unit_price":  i["unit_price"],
        "tax_rate":    tax_rate,
        "line_total":  i["line_total"],
    } for i in order["sales_order_items"]]

    subtotal     = round(sum(i["line_total"] for i in items), 2)
    tax_amount   = round(subtotal * tax_rate / 100, 2)
    invoice_date = date.today()
    due_date     = order.get("due_date") or str(date.fromordinal(invoice_date.toordinal() + terms))

    try:
        inv = db_admin.table("invoices").insert({
            "org_id":         org_id,
            "customer_id":    order["customer_id"],
            "sales_order_id": str(order_id),
            "created_by":     db_user_id(user["clerk_user_id"]),
            "invoice_number": _next_number(org_id),
            "status":         "draft",
            "invoice_date":   str(invoice_date),
            "due_date":       str(due_date),
            "subtotal":       subtotal,
            "tax_rate":       tax_rate,
            "tax_amount":     tax_amount,
            "total_amount":   round(subtotal + tax_amount, 2),
            "amount_paid":    0,
            "notes":          order.get("notes") or settings.get("default_invoice_notes"),
        }).execute().data
    except Exception as e:
        # unique index on sales_order_id (if present) turns a double-click into a clean 409
        if "duplicate" in str(e).lower() or "unique" in str(e).lower():
            raise HTTPException(status_code=409, detail="An invoice already exists for this order")
        raise
    if not inv:
        raise HTTPException(status_code=500, detail="Failed to create invoice")
    invoice = inv[0]

    for i in items:
        i["org_id"] = org_id
        i["invoice_id"] = invoice["id"]
    db_admin.table("invoice_items").insert(items).execute()

    return invoice


# ================================================================
# UPDATE STATUS
# ================================================================

@router.put("/invoices/{invoice_id}")
async def update_invoice(
    invoice_id: UUID,
    body:  InvoiceUpdate,
    user:  dict = Depends(require_auth),
    client      = Depends(get_client),
):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    if "due_date" in updates:
        updates["due_date"] = str(updates["due_date"])

    result = (
        client.table("invoices")
        .update(updates)
        .eq("id", str(invoice_id))
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return result.data[0]


# ================================================================
# RECORD PAYMENT
# ================================================================

@router.post("/invoices/{invoice_id}/payments")
async def record_payment(
    invoice_id: UUID,
    body:  RecordPayment,
    user:  dict = Depends(require_auth),
    client      = Depends(get_client),
):
    invoice = _first(
        client.table("invoices")
        .select("id, sales_order_id, total_amount, amount_paid, status")
        .eq("id", str(invoice_id))
    )
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if invoice["status"] == "void":
        raise HTTPException(status_code=400, detail="This invoice has been voided")
    if body.amount <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be greater than zero")

    new_paid = round(invoice["amount_paid"] + body.amount, 2)

    if new_paid > invoice["total_amount"]:
        raise HTTPException(
            status_code=400,
            detail=f"Payment of {body.amount} exceeds remaining balance of "
                   f"{invoice['total_amount'] - invoice['amount_paid']:.2f}"
        )

    new_status = "paid" if new_paid >= invoice["total_amount"] else invoice["status"]

    payment_data = {
        "org_id":         user["org_id"],
        "invoice_id":     str(invoice_id),
        "amount":         body.amount,
        "payment_method": body.payment_method,
        "reference":      body.reference,
        "paid_at":        str(body.paid_at or date.today()),
        "recorded_by":    db_user_id(user["clerk_user_id"]),
        "notes":          body.notes,
    }
    db_admin.table("payments").insert(payment_data).execute()

    db_admin.table("invoices").update({
        "amount_paid": new_paid,
        "status":      new_status,
        "paid_at":     str(date.today()) if new_status == "paid" else None,
    }).eq("id", str(invoice_id)).execute()

    # Fully paid invoice -> the sales order it came from is paid too
    if new_status == "paid" and invoice.get("sales_order_id"):
        client.table("sales_orders").update({"payment_status": "paid"}) \
            .eq("id", invoice["sales_order_id"]).execute()

    return {
        "message":     "Payment recorded",
        "amount_paid": new_paid,
        "status":      new_status,
        "remaining":   round(invoice["total_amount"] - new_paid, 2),
    }


# ================================================================
# PDF GENERATION
# ================================================================

@router.get("/invoices/{invoice_id}/pdf")
async def get_invoice_pdf(
    invoice_id: str,
    user:  dict = Depends(require_auth),
    client      = Depends(get_client),
):
    inv = _first(
        client.table("invoices")
        .select(
            "*, "
            "customers(name, contact_name, address, tax_id, phone), "
            "invoice_items(description, qty, unit_price, line_total), "
            "sales_orders(order_number)"
        )
        .eq("invoice_number", invoice_id)
    )

    if not inv:
        raise HTTPException(status_code=404, detail=f"Invoice {invoice_id} not found")

    customer = inv.get("customers") or {}
    org      = _fetch_org(client, inv["org_id"])

    STATUS_LABELS = {
        "draft": "Draft", "sent": "Sent",
        "paid": "Paid", "overdue": "Overdue", "void": "Void",
    }

    ctx = {
        "org":              _build_org_context(org),
        "customer":         _build_customer_context(customer),
        "currency":         org.get("currency", "$"),
        "doc_number":       inv["invoice_number"],
        "invoice_date":     inv["invoice_date"],
        "due_date":         inv["due_date"],
        "order_ref":        (inv.get("sales_orders") or {}).get("order_number"),
        "items":            [
            {
                "description": i["description"],
                "qty":         i["qty"],
                "unit_price":  i["unit_price"],
            }
            for i in (inv.get("invoice_items") or [])
        ],
        "subtotal":          inv["subtotal"],
        "tax_rate":          inv["tax_rate"],
        "tax_amount":        inv["tax_amount"],
        "discount_amount":   inv.get("discount_amount", 0),
        "amount_paid":       inv["amount_paid"],
        "total_amount":      inv["total_amount"],
        "notes":             inv.get("notes"),
        "bank_name":         org.get("bank_name"),
        "bank_account_no":   org.get("bank_account_no"),
        "bank_account_name": org.get("bank_account_name"),
        "doc_status":        STATUS_LABELS.get(inv["status"], inv["status"].title()),
        "doc_status_class":  inv["status"],
    }

    pdf_bytes = generate_invoice_pdf(ctx)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{inv["invoice_number"]}.pdf"'},
    )
