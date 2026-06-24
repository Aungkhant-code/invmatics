from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from pdf_service import generate_invoice_pdf

router = APIRouter()

# ── Organisation ───────────────────────────────────────────────────
ORG = {
    "name": "Somchai Trading Co., Ltd.",
    "address": "123 Sukhumvit Road, Bangkok 10110, Thailand",
    "tax_id": "0105562012345",
    "phone": "+66 2 123 4567",
    "email": "contact@somchaitrading.co.th",
}

BANK = {
    "bank_name": "Kasikorn Bank",
    "bank_account_no": "123-4-56789-0",
    "bank_account_name": "Somchai Trading Co. Ltd.",
    "promptpay_id": "0891234567",
}

# ── Customer lookup ────────────────────────────────────────────────
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
    "Nonthaburi Works": {
        "name": "Nonthaburi Works Co., Ltd.",
        "contact_name": None,
        "address": "22 Nonthaburi Road, Nonthaburi 11000, Thailand",
        "tax_id": None,
        "phone": "+66 2 345 6789",
    },
    "Siam Industrial": {
        "name": "Siam Industrial Supplies Co., Ltd.",
        "contact_name": None,
        "address": "55 Silom Road, Bangkok 10500, Thailand",
        "tax_id": "0105562033333",
        "phone": "+66 2 456 7890",
    },
    "BKK Contractors": {
        "name": "BKK Contractors Co., Ltd.",
        "contact_name": None,
        "address": "101 Sukhumvit Soi 71, Bangkok 10110, Thailand",
        "tax_id": None,
        "phone": "+66 2 567 8901",
    },
}

# ── Invoice data (mirrors Invoices.jsx static list) ────────────────
INVOICES = {
    "INV-00041": {
        "order_ref": "SO-0041", "customer": "Kasem Construction",
        "invoice_date": "2025-06-09", "due_date": "2025-06-23", "status": "unpaid",
        "items": [
            {"description": "Cable 2.5mm (100m roll)", "qty": 10, "unit_price": 1200},
            {"description": "Drain Cover 300×300mm",   "qty": 20, "unit_price": 290},
            {"description": "Steel Conduit 20mm (3m)", "qty": 15, "unit_price": 150},
        ],
        "tax_rate": 7.0,
        "notes": "Payment via bank transfer or PromptPay",
    },
    "INV-00040": {
        "order_ref": "SO-0040", "customer": "Phuket Build Ltd.",
        "invoice_date": "2025-06-08", "due_date": "2025-06-22", "status": "unpaid",
        "items": [
            {"description": "Cable 4mm (100m roll)", "qty": 5,  "unit_price": 1800},
            {"description": "PVC Junction Box 4\"",  "qty": 40, "unit_price": 75},
        ],
        "tax_rate": 7.0,
        "notes": "",
    },
    "INV-00039": {
        "order_ref": "SO-0039", "customer": "Central Hardware",
        "invoice_date": "2025-06-07", "due_date": "2025-06-21", "status": "paid",
        "items": [
            {"description": "Cable 6mm (100m roll)",  "qty": 8,  "unit_price": 2500},
            {"description": "Cable Tray 100mm (2m)",  "qty": 30, "unit_price": 420},
            {"description": "Gland Plate 150×150mm",  "qty": 50, "unit_price": 110},
        ],
        "tax_rate": 7.0,
        "notes": "",
    },
    "INV-00038": {
        "order_ref": "SO-0038", "customer": "Nonthaburi Works",
        "invoice_date": "2025-06-06", "due_date": "2025-06-20", "status": "overdue",
        "items": [
            {"description": "Drain Cover 450×450mm",   "qty": 25, "unit_price": 490},
            {"description": "Steel Conduit 25mm (3m)", "qty": 10, "unit_price": 185},
        ],
        "tax_rate": 7.0,
        "notes": "Net 14 payment terms",
    },
    "INV-00037": {
        "order_ref": "SO-0037", "customer": "Siam Industrial",
        "invoice_date": "2025-06-05", "due_date": "2025-06-19", "status": "paid",
        "items": [
            {"description": "Cable 2.5mm (100m roll)", "qty": 20, "unit_price": 1200},
            {"description": "PVC Junction Box 4\"",    "qty": 60, "unit_price": 75},
        ],
        "tax_rate": 7.0,
        "notes": "",
    },
    "INV-00036": {
        "order_ref": "SO-0036", "customer": "BKK Contractors",
        "invoice_date": "2025-06-04", "due_date": "2025-06-18", "status": "overdue",
        "items": [
            {"description": "Steel Conduit 20mm (3m)", "qty": 40, "unit_price": 150},
            {"description": "Gland Plate 150×150mm",   "qty": 30, "unit_price": 110},
        ],
        "tax_rate": 7.0,
        "notes": "",
    },
}

STATUS_LABELS = {
    "paid":    "Paid",
    "unpaid":  "Unpaid",
    "overdue": "Overdue",
}


def _build_context(invoice_id: str, inv: dict) -> dict:
    subtotal = sum(i["qty"] * i["unit_price"] for i in inv["items"])
    tax_amount = round(subtotal * inv["tax_rate"] / 100, 2)
    total_amount = subtotal + tax_amount
    status = inv["status"]
    amount_paid = total_amount if status == "paid" else 0

    customer_name = inv["customer"]
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
        "doc_number": invoice_id,
        "invoice_date": inv["invoice_date"],
        "due_date": inv["due_date"],
        "order_ref": inv["order_ref"],
        "customer_ref": None,
        "items": inv["items"],
        "subtotal": subtotal,
        "tax_rate": inv["tax_rate"],
        "tax_amount": tax_amount,
        "discount_amount": 0,
        "amount_paid": amount_paid,
        "total_amount": total_amount,
        **BANK,
        "notes": inv["notes"] or None,
        "doc_status": STATUS_LABELS[status],
        "doc_status_class": status,
    }


# ── Routes ─────────────────────────────────────────────────────────

@router.get("/invoices/{invoice_id}/pdf")
async def get_invoice_pdf(invoice_id: str):
    inv = INVOICES.get(invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail=f"Invoice {invoice_id} not found")

    ctx = _build_context(invoice_id, inv)
    pdf_bytes = generate_invoice_pdf(ctx)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{invoice_id}.pdf"'},
    )
