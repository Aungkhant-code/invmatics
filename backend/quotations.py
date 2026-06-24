from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from pdf_service import generate_quotation_pdf

router = APIRouter()

# ── Shared data (import from a shared module once DB is wired) ─────
ORG = {
    "name": "Somchai Trading Co., Ltd.",
    "address": "123 Sukhumvit Road, Bangkok 10110, Thailand",
    "tax_id": "0105562012345",
    "phone": "+66 2 123 4567",
    "email": "contact@somchaitrading.co.th",
}

CUSTOMERS = {
    "Kasem Construction": {
        "name": "Kasem Construction Co., Ltd.",
        "contact_name": "Kasem Wongwit",
        "address": "45 Rama IV Road, Bangkok 10500, Thailand",
        "tax_id": "0105562011111",
        "phone": "+66 81 234 5678",
    },
    "Phuket Build Ltd.": {
        "name": "Phuket Build Ltd.",
        "contact_name": None,
        "address": "12 Patong Road, Phuket 83150, Thailand",
        "tax_id": None,
        "phone": "+66 76 345 6789",
    },
    "Central Hardware": {
        "name": "Central Hardware Co., Ltd.",
        "contact_name": None,
        "address": "89 Rama I Road, Bangkok 10330, Thailand",
        "tax_id": "0105562022222",
        "phone": "+66 2 234 5678",
    },
}

QUOTATIONS = {
    "QUO-0012": {
        "customer": "Kasem Construction",
        "quote_date": "2025-06-09",
        "valid_until": "2025-06-23",
        "prepared_by": "Somchai Klahan",
        "payment_terms": "50% deposit, balance on delivery",
        "status": "sent",
        "items": [
            {"description": "Cable 2.5mm (100m roll)", "qty": 10, "unit_price": 1200,
             "notes": "Subject to stock availability at time of order"},
            {"description": "Drain Cover 300×300mm",   "qty": 20, "unit_price": 290,  "notes": None},
            {"description": "Steel Conduit 20mm (3m)", "qty": 15, "unit_price": 150,  "notes": None},
        ],
        "tax_rate": 7.0,
        "discount_amount": 0,
        "notes": "Delivery lead time approximately 5-7 working days from order confirmation.",
    },
    "QUO-0011": {
        "customer": "Phuket Build Ltd.",
        "quote_date": "2025-06-05",
        "valid_until": "2025-06-19",
        "prepared_by": "Somchai Klahan",
        "payment_terms": "Net 30",
        "status": "draft",
        "items": [
            {"description": "Cable 4mm (100m roll)", "qty": 10, "unit_price": 1800, "notes": None},
            {"description": "Cable 6mm (100m roll)", "qty": 5,  "unit_price": 2500, "notes": None},
        ],
        "tax_rate": 7.0,
        "discount_amount": 0,
        "notes": "",
    },
    "QUO-0010": {
        "customer": "Central Hardware",
        "quote_date": "2025-06-01",
        "valid_until": "2025-06-15",
        "prepared_by": "Somchai Klahan",
        "payment_terms": "Net 30",
        "status": "accepted",
        "items": [
            {"description": "Cable Tray 100mm (2m)",  "qty": 50,  "unit_price": 420, "notes": None},
            {"description": "Gland Plate 150×150mm",  "qty": 100, "unit_price": 110, "notes": None},
            {"description": "PVC Junction Box 4\"",   "qty": 80,  "unit_price": 75,  "notes": None},
        ],
        "tax_rate": 7.0,
        "discount_amount": 0,
        "notes": "Bulk discount applied on next order.",
    },
}

STATUS_LABELS = {
    "draft":    "Draft",
    "sent":     "Sent",
    "accepted": "Accepted",
    "rejected": "Rejected",
    "expired":  "Expired",
}


def _build_context(quo_id: str, quo: dict) -> dict:
    subtotal = sum(i["qty"] * i["unit_price"] for i in quo["items"])
    discount = quo.get("discount_amount", 0)
    tax_amount = round((subtotal - discount) * quo["tax_rate"] / 100, 2)
    total_amount = subtotal - discount + tax_amount
    status = quo["status"]

    customer_name = quo["customer"]
    customer = CUSTOMERS.get(customer_name, {
        "name": customer_name,
        "contact_name": None,
        "address": "Thailand",
        "tax_id": None,
        "phone": None,
    })

    return {
        "org": ORG,
        "customer": customer,
        "currency": "$",
        "doc_number": quo_id,
        "quote_date": quo["quote_date"],
        "valid_until": quo["valid_until"],
        "prepared_by": quo.get("prepared_by"),
        "payment_terms": quo.get("payment_terms"),
        "items": quo["items"],
        "subtotal": subtotal,
        "tax_rate": quo["tax_rate"],
        "tax_amount": tax_amount,
        "discount_amount": discount,
        "total_amount": total_amount,
        "notes": quo["notes"] or None,
        "doc_status": STATUS_LABELS.get(status, status.title()),
        "doc_status_class": status,
    }


# ── Routes ─────────────────────────────────────────────────────────

@router.get("/quotations/{quo_id}/pdf")
async def get_quotation_pdf(quo_id: str):
    quo = QUOTATIONS.get(quo_id)
    if not quo:
        raise HTTPException(status_code=404, detail=f"Quotation {quo_id} not found")

    ctx = _build_context(quo_id, quo)
    pdf_bytes = generate_quotation_pdf(ctx)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{quo_id}.pdf"'},
    )