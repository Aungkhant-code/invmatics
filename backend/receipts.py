"""
Invmatics Systems — Receipts router
PDF generation + CRUD backed by real Supabase data.
"""

from uuid import UUID
from datetime import date
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response

from database import db_admin
from auth import require_auth, get_client
from models import ReceiptCreate
from pdf_service import generate_receipt_pdf

router = APIRouter()


def _next_number(org_id: str) -> str:
    return db_admin.rpc(
        "next_order_number",
        {"p_org_id": org_id, "p_type": "RCT"}
    ).execute().data


def _fetch_org(client, org_id: str) -> dict:
    result = client.table("organisations").select("*").eq("id", org_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Organisation not found")
    return result.data


@router.get("/receipts")
async def list_receipts(
    customer_id: Optional[UUID] = None,
    user:   dict = Depends(require_auth),
    client       = Depends(get_client),
):
    query = (
        client.table("receipts")
        .select("*, customers(name)")
        .order("receipt_date", desc=True)
    )
    if customer_id:
        query = query.eq("customer_id", str(customer_id))

    result = query.execute()
    return {"receipts": result.data or [], "count": len(result.data or [])}


@router.get("/receipts/{receipt_id}")
async def get_receipt(
    receipt_id: UUID,
    user:   dict = Depends(require_auth),
    client       = Depends(get_client),
):
    result = (
        client.table("receipts")
        .select("*, customers(name, address, tax_id), invoices(invoice_number, total_amount)")
        .eq("id", str(receipt_id)).single().execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Receipt not found")
    return result.data


@router.post("/receipts", status_code=201)
async def create_receipt(
    body:  ReceiptCreate,
    user:  dict = Depends(require_auth),
    client      = Depends(get_client),
):
    org_id         = user["org_id"]
    receipt_number = _next_number(org_id)

    data = {
        "org_id":            org_id,
        "customer_id":       str(body.customer_id),
        "invoice_id":        str(body.invoice_id) if body.invoice_id else None,
        "payment_id":        str(body.payment_id) if body.payment_id else None,
        "receipt_number":    receipt_number,
        "receipt_date":      str(body.receipt_date or date.today()),
        "payment_method":    body.payment_method,
        "payment_reference": body.payment_reference,
        "total_amount":      body.total_amount,
        "amount_in_words":   body.amount_in_words,
        "notes":             body.notes,
    }

    result = db_admin.table("receipts").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create receipt")
    return result.data[0]


@router.get("/receipts/{receipt_number}/pdf")
async def get_receipt_pdf(
    receipt_number: str,
    user:  dict = Depends(require_auth),
    client      = Depends(get_client),
):
    result = (
        client.table("receipts")
        .select(
            "*, "
            "customers(name, contact_name, address, tax_id), "
            "invoices(invoice_number, total_amount, amount_paid)"
        )
        .eq("receipt_number", receipt_number).single().execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail=f"Receipt {receipt_number} not found")

    rct      = result.data
    customer = rct.get("customers") or {}
    invoice  = rct.get("invoices") or {}
    org      = _fetch_org(client, rct["org_id"])

    invoice_total = invoice.get("total_amount", rct["total_amount"])
    paid_to_date  = invoice.get("amount_paid", rct["total_amount"])
    remaining     = round(invoice_total - paid_to_date, 2)
    status        = "paid" if remaining <= 0 else "partial"

    STATUS_LABELS = {"paid": "Paid", "partial": "Partial payment"}

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
            "tax_id":       customer.get("tax_id"),
        },
        "currency":           org.get("currency", "$"),
        "doc_number":         rct["receipt_number"],
        "receipt_date":       rct["receipt_date"],
        "invoice_ref":        invoice.get("invoice_number", "—"),
        "payment_method":     rct.get("payment_method", "—"),
        "payment_reference":  rct.get("payment_reference"),
        "items": [
            {
                "description": f"Payment for Invoice {invoice.get('invoice_number', '')}",
                "amount":      rct["total_amount"],
            }
        ],
        "total_amount":      rct["total_amount"],
        "amount_in_words":   rct.get("amount_in_words"),
        "invoice_total":     invoice_total,
        "paid_to_date":      paid_to_date,
        "remaining_balance": remaining,
        "notes":             rct.get("notes"),
        "doc_status":        STATUS_LABELS.get(status, "Paid"),
        "doc_status_class":  status,
    }

    pdf_bytes = generate_receipt_pdf(ctx)
    return Response(
        content=pdf_bytes, media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{receipt_number}.pdf"'},
    )
