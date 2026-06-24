from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from pdf_service import generate_receipt_pdf

router = APIRouter()

ORG = {
    "name": "Somchai Trading Co., Ltd.",
    "address": "123 Sukhumvit Road, Bangkok 10110, Thailand",
    "tax_id": "0105562012345",
    "phone": "+66 2 123 4567",
    "email": "contact@somchaitrading.co.th",
}

CUSTOMERS = {
    "Central Hardware": {
        "name": "Central Hardware Co., Ltd.",
        "contact_name": None,
        "address": "89 Rama I Road, Bangkok 10330, Thailand",
        "tax_id": "0105562022222",
        "phone": "+66 2 234 5678",
    },
    "Siam Industrial": {
        "name": "Siam Industrial Supplies Co., Ltd.",
        "contact_name": None,
        "address": "55 Silom Road, Bangkok 10500, Thailand",
        "tax_id": "0105562033333",
        "phone": "+66 2 456 7890",
    },
    "Kasem Construction": {
        "name": "Kasem Construction Co., Ltd.",
        "contact_name": "Kasem Wongwit",
        "address": "45 Rama IV Road, Bangkok 10500, Thailand",
        "tax_id": "0105562011111",
        "phone": "+66 81 234 5678",
    },
}

RECEIPTS = {
    "RCT-0027": {
        "customer": "Central Hardware",
        "invoice_ref": "INV-00039",
        "receipt_date": "2025-06-09",
        "payment_method": "Bank transfer",
        "payment_reference": "KBANK-TXN-88213452",
        "items": [
            {"description": "Payment for Invoice INV-00039", "amount": 167154.00},
        ],
        "total_amount": 167154.00,
        "amount_in_words": "One hundred sixty-seven thousand, one hundred fifty-four dollars only",
        "invoice_total": 167154.00,
        "paid_to_date": 167154.00,
        "remaining_balance": 0.00,
        "notes": "Paid in full. Thank you for your prompt payment.",
        "status": "paid",
    },
    "RCT-0026": {
        "customer": "Siam Industrial",
        "invoice_ref": "INV-00037",
        "receipt_date": "2025-06-07",
        "payment_method": "PromptPay",
        "payment_reference": "PROMPTPAY-TXN-77654321",
        "items": [
            {"description": "Payment for Invoice INV-00037", "amount": 28926.00},
        ],
        "total_amount": 28926.00,
        "amount_in_words": "Twenty-eight thousand, nine hundred twenty-six dollars only",
        "invoice_total": 28926.00,
        "paid_to_date": 28926.00,
        "remaining_balance": 0.00,
        "notes": "",
        "status": "paid",
    },
    "RCT-0028": {
        "customer": "Kasem Construction",
        "invoice_ref": "INV-00041",
        "receipt_date": "2025-06-10",
        "payment_method": "Bank transfer",
        "payment_reference": "KBANK-TXN-88219999",
        "items": [
            {"description": "Deposit — 50% of Invoice INV-00041", "amount": 10726.75},
        ],
        "total_amount": 10726.75,
        "amount_in_words": "Ten thousand, seven hundred twenty-six dollars and seventy-five cents only",
        "invoice_total": 21453.50,
        "paid_to_date": 10726.75,
        "remaining_balance": 10726.75,
        "notes": "Deposit received. Balance due on delivery.",
        "status": "partial",
    },
}

STATUS_LABELS = {
    "paid":    "Paid",
    "partial": "Partial payment",
}


def _build_context(rct_id: str, rct: dict) -> dict:
    customer = CUSTOMERS.get(rct["customer"], {
        "name": rct["customer"],
        "contact_name": None,
        "address": "Thailand",
        "tax_id": None,
        "phone": None,
    })
    status = rct["status"]
    return {
        "org": ORG,
        "customer": customer,
        "currency": "$",
        "doc_number": rct_id,
        "receipt_date": rct["receipt_date"],
        "invoice_ref": rct["invoice_ref"],
        "payment_method": rct["payment_method"],
        "payment_reference": rct.get("payment_reference"),
        "items": rct["items"],
        "total_amount": rct["total_amount"],
        "amount_in_words": rct.get("amount_in_words"),
        "invoice_total": rct.get("invoice_total"),
        "paid_to_date": rct.get("paid_to_date"),
        "remaining_balance": rct.get("remaining_balance"),
        "notes": rct["notes"] or None,
        "doc_status": STATUS_LABELS.get(status, status.title()),
        "doc_status_class": status,
    }


# ── Routes ─────────────────────────────────────────────────────────

@router.get("/receipts/{rct_id}/pdf")
async def get_receipt_pdf(rct_id: str):
    rct = RECEIPTS.get(rct_id)
    if not rct:
        raise HTTPException(status_code=404, detail=f"Receipt {rct_id} not found")
    ctx = _build_context(rct_id, rct)
    pdf_bytes = generate_receipt_pdf(ctx)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{rct_id}.pdf"'},
    )