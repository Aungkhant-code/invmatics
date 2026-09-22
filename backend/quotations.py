"""
Invmatics Systems — Quotations router
PDF generation + CRUD backed by real Supabase data.
"""

from uuid import UUID
from datetime import date
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response

from database import db_admin
from auth import require_auth, get_client
from models import QuotationCreate, QuotationUpdate
from pdf_service import generate_quotation_pdf

router = APIRouter()


def _next_number(org_id: str) -> str:
    return db_admin.rpc(
        "next_order_number",
        {"p_org_id": org_id, "p_type": "QUO"}
    ).execute().data


def _fetch_org(client, org_id: str) -> dict:
    result = (
        client.table("organisations").select("*")
        .eq("id", org_id).single().execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Organisation not found")
    return result.data


@router.get("/quotations")
async def list_quotations(
    status:      Optional[str]  = None,
    customer_id: Optional[UUID] = None,
    user:   dict = Depends(require_auth),
    client       = Depends(get_client),
):
    query = (
        client.table("quotations")
        .select("*, customers(name), quotation_items(qty, unit_price, line_total)")
        .order("quote_date", desc=True)
    )
    if status:
        query = query.eq("status", status)
    if customer_id:
        query = query.eq("customer_id", str(customer_id))

    result = query.execute()
    return {"quotations": result.data or [], "count": len(result.data or [])}


@router.get("/quotations/{quotation_id}")
async def get_quotation(
    quotation_id: UUID,
    user:   dict = Depends(require_auth),
    client       = Depends(get_client),
):
    result = (
        client.table("quotations")
        .select(
            "*, "
            "customers(id, name, contact_name, address, tax_id, phone), "
            "quotation_items(id, product_id, description, notes, qty, unit_price, line_total)"
        )
        .eq("id", str(quotation_id))
        .single().execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Quotation not found")
    return result.data


@router.post("/quotations", status_code=201)
async def create_quotation(
    body:  QuotationCreate,
    user:  dict = Depends(require_auth),
    client      = Depends(get_client),
):
    org_id = user["org_id"]

    cust = (
        client.table("customers").select("id, name")
        .eq("id", str(body.customer_id)).single().execute()
    )
    if not cust.data:
        raise HTTPException(status_code=404, detail="Customer not found")

    quote_number = _next_number(org_id)
    resolved = []
    for item in body.items:
        product = (
            client.table("products").select("name, selling_price")
            .eq("id", str(item.product_id)).single().execute()
        )
        if not product.data:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        unit_price = item.unit_price or product.data["selling_price"]
        resolved.append({
            "description": item.description or product.data["name"],
            "notes":       None,
            "qty":         item.qty,
            "unit_price":  unit_price,
            "line_total":  round(item.qty * unit_price, 2),
        })

    subtotal   = sum(i["line_total"] for i in resolved)
    tax_rate   = 7.0
    tax_amount = round(subtotal * tax_rate / 100, 2)
    total      = subtotal + tax_amount

    quo_data = {
        "org_id":        org_id,
        "customer_id":   str(body.customer_id),
        "quote_number":  quote_number,
        "status":        "draft",
        "quote_date":    str(body.quote_date or date.today()),
        "valid_until":   str(body.valid_until),
        "payment_terms": body.payment_terms,
        "notes":         body.notes,
        "subtotal":      round(subtotal, 2),
        "tax_rate":      tax_rate,
        "tax_amount":    tax_amount,
        "total_amount":  round(total, 2),
    }

    quo_result = db_admin.table("quotations").insert(quo_data).execute()
    if not quo_result.data:
        raise HTTPException(status_code=500, detail="Failed to create quotation")

    quotation = quo_result.data[0]
    for item in resolved:
        item["org_id"]      = org_id
        item["quotation_id"] = quotation["id"]
    db_admin.table("quotation_items").insert(resolved).execute()
    return quotation


@router.put("/quotations/{quotation_id}")
async def update_quotation(
    quotation_id: UUID,
    body:  QuotationUpdate,
    user:  dict = Depends(require_auth),
    client      = Depends(get_client),
):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    if "valid_until" in updates:
        updates["valid_until"] = str(updates["valid_until"])
    result = (
        client.table("quotations").update(updates)
        .eq("id", str(quotation_id)).execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Quotation not found")
    return result.data[0]


@router.post("/quotations/{quotation_id}/convert")
async def convert_to_order(
    quotation_id: UUID,
    user:  dict = Depends(require_auth),
    client      = Depends(get_client),
):
    """Convert an accepted quotation into a confirmed sales order."""
    quo = (
        client.table("quotations")
        .select("*, quotation_items(*)")
        .eq("id", str(quotation_id)).single().execute()
    )
    if not quo.data:
        raise HTTPException(status_code=404, detail="Quotation not found")

    db_admin.table("quotations").update({"status": "accepted"}).eq("id", str(quotation_id)).execute()

    org_id       = user["org_id"]
    order_number = db_admin.rpc(
        "next_order_number", {"p_org_id": org_id, "p_type": "SO"}
    ).execute().data
    q = quo.data

    order_data = {
        "org_id":          org_id,
        "customer_id":     q["customer_id"],
        "order_number":    order_number,
        "status":          "confirmed",
        "payment_status":  "unpaid",
        "order_date":      str(date.today()),
        "subtotal":        q["subtotal"],
        "tax_amount":      q["tax_amount"],
        "discount_amount": q.get("discount_amount", 0),
        "total_amount":    q["total_amount"],
        "notes":           f"Converted from {q['quote_number']}",
    }

    order_result = db_admin.table("sales_orders").insert(order_data).execute()
    if not order_result.data:
        raise HTTPException(status_code=500, detail="Failed to create sales order")

    order = order_result.data[0]
    items = [
        {
            "org_id":      org_id,
            "order_id":    order["id"],
            "product_id":  item["product_id"],
            "description": item["description"],
            "qty_ordered": item["qty"],
            "qty_dispatched": 0,
            "unit_price":  item["unit_price"],
            "tax_rate":    0,
            "discount_pct":0,
            "line_total":  item["line_total"],
        }
        for item in q["quotation_items"] if item.get("product_id")
    ]
    if items:
        db_admin.table("sales_order_items").insert(items).execute()

    return {"message": "Converted to sales order", "order_number": order_number, "order": order}


@router.get("/quotations/{quote_number}/pdf")
async def get_quotation_pdf(
    quote_number: str,
    user:  dict = Depends(require_auth),
    client      = Depends(get_client),
):
    result = (
        client.table("quotations")
        .select(
            "*, customers(name, contact_name, address, tax_id, phone), "
            "quotation_items(description, notes, qty, unit_price, line_total)"
        )
        .eq("quote_number", quote_number).single().execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail=f"Quotation {quote_number} not found")

    quo      = result.data
    customer = quo.get("customers") or {}
    org      = _fetch_org(client, quo["org_id"])

    STATUS_LABELS = {
        "draft": "Draft", "sent": "Sent",
        "accepted": "Accepted", "rejected": "Rejected", "expired": "Expired",
    }

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
            "phone":        customer.get("phone"),
        },
        "currency":         org.get("currency", "$"),
        "doc_number":       quo["quote_number"],
        "quote_date":       quo["quote_date"],
        "valid_until":      quo["valid_until"],
        "prepared_by":      None,
        "payment_terms":    quo.get("payment_terms"),
        "items":            [
            {
                "description": i["description"],
                "notes":       i.get("notes"),
                "qty":         i["qty"],
                "unit_price":  i["unit_price"],
            }
            for i in (quo.get("quotation_items") or [])
        ],
        "subtotal":         quo["subtotal"],
        "tax_rate":         quo["tax_rate"],
        "tax_amount":       quo["tax_amount"],
        "discount_amount":  quo.get("discount_amount", 0),
        "total_amount":     quo["total_amount"],
        "notes":            quo.get("notes"),
        "doc_status":       STATUS_LABELS.get(quo["status"], quo["status"].title()),
        "doc_status_class": quo["status"],
    }

    pdf_bytes = generate_quotation_pdf(ctx)
    return Response(
        content=pdf_bytes, media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{quote_number}.pdf"'},
    )
