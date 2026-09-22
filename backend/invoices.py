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
from auth import require_auth, get_client
from models import InvoiceCreate, InvoiceUpdate, RecordPayment
from pdf_service import generate_invoice_pdf

router = APIRouter()


# ================================================================
# HELPERS
# ================================================================

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
        "bank_name":         org.get("bank_name"),
        "bank_account_no":   org.get("bank_account_no"),
        "bank_account_name": org.get("bank_account_name"),
        "promptpay_id":      org.get("promptpay_id"),
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
    result = (
        client.table("organisations")
        .select("*")
        .eq("id", org_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Organisation not found")
    return result.data


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
    query = (
        client.table("invoices")
        .select(
            "*, "
            "customers(name, contact_name), "
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
    result = (
        client.table("invoices")
        .select(
            "*, "
            "customers(id, name, contact_name, address, tax_id, phone, payment_terms), "
            "invoice_items(id, product_id, description, qty, unit_price, tax_rate, line_total), "
            "sales_orders(order_number)"
        )
        .eq("id", str(invoice_id))
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return result.data


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

    cust = (
        client.table("customers")
        .select("id, name, payment_terms")
        .eq("id", str(body.customer_id))
        .single()
        .execute()
    )
    if not cust.data:
        raise HTTPException(status_code=404, detail="Customer not found")

    invoice_number = _next_number(org_id)

    resolved = []
    for item in body.items:
        product = (
            client.table("products")
            .select("name, selling_price")
            .eq("id", str(item.product_id))
            .single()
            .execute()
        )
        if not product.data:
            raise HTTPException(
                status_code=404,
                detail=f"Product {item.product_id} not found"
            )
        unit_price = item.unit_price or product.data["selling_price"]
        line_total = round(item.qty * unit_price * (1 - item.discount_pct / 100), 2)
        resolved.append({
            "description": item.description or product.data["name"],
            "qty":         item.qty,
            "unit_price":  unit_price,
            "tax_rate":    item.tax_rate,
            "line_total":  line_total,
        })

    subtotal   = sum(i["line_total"] for i in resolved)
    tax_amount = round(subtotal * body.tax_rate / 100, 2)
    total      = subtotal + tax_amount

    settings = (
        client.table("org_settings")
        .select("default_payment_terms, default_invoice_notes")
        .single()
        .execute()
    )
    payment_terms = (settings.data or {}).get("default_payment_terms", 14)

    invoice_date = body.invoice_date or date.today()
    due_date     = body.due_date or date.fromordinal(
        invoice_date.toordinal() + payment_terms
    )

    invoice_data = {
        "org_id":         org_id,
        "customer_id":    str(body.customer_id),
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
    inv = (
        client.table("invoices")
        .select("id, total_amount, amount_paid, status")
        .eq("id", str(invoice_id))
        .single()
        .execute()
    )
    if not inv.data:
        raise HTTPException(status_code=404, detail="Invoice not found")

    invoice  = inv.data
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
        "notes":          body.notes,
    }
    db_admin.table("payments").insert(payment_data).execute()

    db_admin.table("invoices").update({
        "amount_paid": new_paid,
        "status":      new_status,
        "paid_at":     str(date.today()) if new_status == "paid" else None,
    }).eq("id", str(invoice_id)).execute()

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
    result = (
        client.table("invoices")
        .select(
            "*, "
            "customers(name, contact_name, address, tax_id, phone), "
            "invoice_items(description, qty, unit_price, line_total), "
            "sales_orders(order_number)"
        )
        .eq("invoice_number", invoice_id)
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail=f"Invoice {invoice_id} not found")

    inv      = result.data
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
        "promptpay_id":      org.get("promptpay_id"),
        "doc_status":        STATUS_LABELS.get(inv["status"], inv["status"].title()),
        "doc_status_class":  inv["status"],
    }

    pdf_bytes = generate_invoice_pdf(ctx)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{inv["invoice_number"]}.pdf"'},
    )
