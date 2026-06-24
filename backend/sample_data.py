"""
Sample data for previewing all five PDF document types.
Mirrors the data already used across the React frontend
(Somchai Trading Co. / Kasem Construction / cable & conduit SKUs)
so the PDFs feel consistent with the dashboard mockups.
"""

ORG = {
    "name": "Somchai Trading Co., Ltd.",
    "address": "123 Sukhumvit Road, Bangkok 10110, Thailand",
    "tax_id": "0105562012345",
    "phone": "+66 2 123 4567",
    "email": "contact@somchaitrading.co.th",
}

CUSTOMER = {
    "name": "Kasem Construction Co., Ltd.",
    "contact_name": "Kasem Wongwit",
    "address": "45 Rama IV Road, Bangkok 10500, Thailand",
    "tax_id": "0105562011111",
    "phone": "+66 81 234 5678",
}

CURRENCY = "$"


# ----------------------------------------------------------------
# 1. QUOTATION
# ----------------------------------------------------------------

ITEMS_BASE = [
    {"description": "Cable 2.5mm (100m roll)", "sku": "CBL-2.5-100", "qty": 10, "unit_price": 1200},
    {"description": "Drain Cover 300×300mm", "sku": "DRN-300-300", "qty": 20, "unit_price": 290},
    {"description": "Steel Conduit 20mm (3m)", "sku": "CDT-20-3M", "qty": 15, "unit_price": 150},
]

def _calc_totals(items, tax_rate=7.0, discount=0):
    subtotal = sum(i["qty"] * i["unit_price"] for i in items)
    tax_amount = round((subtotal - discount) * tax_rate / 100, 2)
    total = subtotal - discount + tax_amount
    return subtotal, tax_amount, total


_subtotal, _tax, _total = _calc_totals(ITEMS_BASE)

QUOTATION_CTX = {
    "org": ORG,
    "customer": CUSTOMER,
    "currency": CURRENCY,
    "doc_number": "QUO-0012",
    "quote_date": "2025-06-09",
    "valid_until": "2025-06-23",
    "prepared_by": "Somchai Klahan",
    "payment_terms": "50% deposit, balance on delivery",
    "items": [
        {**ITEMS_BASE[0], "notes": "Subject to stock availability at time of order"},
        {**ITEMS_BASE[1], "notes": None},
        {**ITEMS_BASE[2], "notes": None},
    ],
    "subtotal": _subtotal,
    "tax_rate": 7.0,
    "tax_amount": _tax,
    "discount_amount": 0,
    "total_amount": _total,
    "notes": "Delivery lead time approximately 5-7 working days from order confirmation.",
    "doc_status": "Sent",
    "doc_status_class": "sent",
}


# ----------------------------------------------------------------
# 2. INVOICE
# ----------------------------------------------------------------

INVOICE_CTX = {
    "org": ORG,
    "customer": CUSTOMER,
    "currency": CURRENCY,
    "doc_number": "INV-00041",
    "invoice_date": "2025-06-09",
    "due_date": "2025-06-23",
    "order_ref": "SO-0041",
    "customer_ref": None,
    "items": [
        {"description": i["description"], "qty": i["qty"], "unit_price": i["unit_price"]}
        for i in ITEMS_BASE
    ],
    "subtotal": _subtotal,
    "tax_rate": 7.0,
    "tax_amount": _tax,
    "discount_amount": 0,
    "amount_paid": 0,
    "total_amount": _total,
    "bank_name": "Kasikorn Bank",
    "bank_account_no": "123-4-56789-0",
    "bank_account_name": "Somchai Trading Co. Ltd.",
    "promptpay_id": "0891234567",
    "notes": "Payment via bank transfer or PromptPay. Thank you for your business.",
    "doc_status": "Unpaid",
    "doc_status_class": "unpaid",
}

# A second variant showing the PAID stamp
INVOICE_PAID_CTX = {
    **INVOICE_CTX,
    "doc_number": "INV-00039",
    "due_date": "2025-06-21",
    "order_ref": "SO-0039",
    "amount_paid": _total,
    "doc_status": "Paid",
    "doc_status_class": "paid",
}


# ----------------------------------------------------------------
# 3. DELIVERY ORDER
# ----------------------------------------------------------------

DELIVERY_ORDER_CTX = {
    "org": ORG,
    "customer": CUSTOMER,
    "doc_number": "DO-0033",
    "delivery_date": "2025-06-10",
    "delivery_address": "45 Rama IV Road, Site Office B, Bangkok 10500, Thailand",
    "order_ref": "SO-0041",
    "customer_ref": "PO-KC-2206",
    "driver_name": "Wichai Prateep",
    "driver_phone": "+66 81 555 1234",
    "vehicle_no": "1กก-2345 Bangkok",
    "items": [
        {"description": "Cable 2.5mm (100m roll)", "sku": "CBL-2.5-100", "qty_ordered": 10, "qty_delivered": 10},
        {"description": "Drain Cover 300×300mm", "sku": "DRN-300-300", "qty_ordered": 20, "qty_delivered": 20},
        {"description": "Steel Conduit 20mm (3m)", "sku": "CDT-20-3M", "qty_ordered": 15, "qty_delivered": 12},
    ],
    "total_units": 42,
    "notes": "Partial delivery on Steel Conduit 20mm — remaining 3 units to follow on next delivery (back order BO-0007).",
    "doc_status": "Dispatched",
    "doc_status_class": "sent",
}


# ----------------------------------------------------------------
# 4. DELIVERY CONFIRMATION RECEIPT
# ----------------------------------------------------------------

DELIVERY_CONFIRMATION_CTX = {
    "org": ORG,
    "customer": CUSTOMER,
    "doc_number": "DC-0033",
    "delivery_date": "2025-06-10",
    "delivery_address": "45 Rama IV Road, Site Office B, Bangkok 10500, Thailand",
    "delivery_order_ref": "DO-0033",
    "order_ref": "SO-0041",
    "items": [
        {"description": "Cable 2.5mm (100m roll)", "sku": "CBL-2.5-100", "qty_delivered": 10, "qty_received": 10, "condition": "Good", "condition_class": "good"},
        {"description": "Drain Cover 300×300mm", "sku": "DRN-300-300", "qty_delivered": 20, "qty_received": 19, "condition": "1 short", "condition_class": "short"},
        {"description": "Steel Conduit 20mm (3m)", "sku": "CDT-20-3M", "qty_delivered": 12, "qty_received": 12, "condition": "Good", "condition_class": "good"},
    ],
    "notes": "1x Drain Cover 300×300mm missing from pallet — reported to driver on site. Credit note to follow.",
    "photo_refs": ["IMG_2025-06-10_delivery_01.jpg", "IMG_2025-06-10_delivery_02.jpg"],
    "doc_status": "Confirmed",
    "doc_status_class": "confirmed",
}


# ----------------------------------------------------------------
# 5. CASH / PAYMENT RECEIPT
# ----------------------------------------------------------------

RECEIPT_CTX = {
    "org": ORG,
    "customer": CUSTOMER,
    "currency": CURRENCY,
    "doc_number": "RCT-0027",
    "receipt_date": "2025-06-09",
    "invoice_ref": "INV-00039",
    "payment_method": "Bank transfer",
    "payment_reference": "KBANK-TXN-88213452",
    "items": [
        {"description": "Payment for Invoice INV-00039", "amount": 167154.00},
    ],
    "total_amount": 167154.00,
    "amount_in_words": "One hundred sixty-seven thousand, one hundred fifty-four baht only",
    "invoice_total": 167154.00,
    "paid_to_date": 167154.00,
    "remaining_balance": 0.00,
    "notes": "Paid in full. Thank you for your prompt payment.",
    "doc_status": "Paid",
    "doc_status_class": "paid",
}

# Partial payment variant
RECEIPT_PARTIAL_CTX = {
    **RECEIPT_CTX,
    "doc_number": "RCT-0028",
    "invoice_ref": "INV-00041",
    "items": [
        {"description": "Partial payment for Invoice INV-00041", "amount": 50000.00},
    ],
    "total_amount": 50000.00,
    "amount_in_words": "Fifty thousand baht only",
    "invoice_total": 92095.00,
    "paid_to_date": 50000.00,
    "remaining_balance": 42095.00,
    "notes": "Deposit received. Balance due on delivery.",
    "doc_status": "Partial payment",
    "doc_status_class": "partial",
}
