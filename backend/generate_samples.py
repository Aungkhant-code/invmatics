"""
Generates one sample PDF per document type into ./output/
Run with: python generate_samples.py
"""

import os
from pdf_service import (
    generate_quotation_pdf,
    generate_invoice_pdf,
    generate_delivery_order_pdf,
    generate_delivery_confirmation_pdf,
    generate_receipt_pdf,
)
from sample_data import (
    QUOTATION_CTX,
    INVOICE_CTX,
    INVOICE_PAID_CTX,
    DELIVERY_ORDER_CTX,
    DELIVERY_CONFIRMATION_CTX,
    RECEIPT_CTX,
    RECEIPT_PARTIAL_CTX,
)

OUT_DIR = os.path.join(os.path.dirname(__file__), "output")
os.makedirs(OUT_DIR, exist_ok=True)

jobs = [
    ("1_quotation.pdf",              generate_quotation_pdf,             QUOTATION_CTX),
    ("2_invoice_unpaid.pdf",         generate_invoice_pdf,                INVOICE_CTX),
    ("3_invoice_paid.pdf",           generate_invoice_pdf,                INVOICE_PAID_CTX),
    ("4_delivery_order.pdf",         generate_delivery_order_pdf,         DELIVERY_ORDER_CTX),
    ("5_delivery_confirmation.pdf",  generate_delivery_confirmation_pdf,  DELIVERY_CONFIRMATION_CTX),
    ("6_receipt_full.pdf",           generate_receipt_pdf,                RECEIPT_CTX),
    ("7_receipt_partial.pdf",        generate_receipt_pdf,                RECEIPT_PARTIAL_CTX),
]

for filename, fn, ctx in jobs:
    out_path = os.path.join(OUT_DIR, filename)
    pdf_bytes = fn(ctx)
    with open(out_path, "wb") as f:
        f.write(pdf_bytes)
    print(f"  generated {filename}  ({len(pdf_bytes):,} bytes)")

print("\nAll sample PDFs generated in:", OUT_DIR)
