"""
Invmatics Systems – PDF Generation Service
============================================

Generates the five core PDF documents:
    - Quotation
    - Invoice
    - Delivery Order
    - Delivery Confirmation Receipt
    - Cash / Payment Receipt

Approach
--------
Each document is an HTML + CSS template (Jinja2), rendered to PDF
with WeasyPrint. This keeps the visual design consistent with the
web app and means future template tweaks are just CSS/HTML edits —
no Python redeploy needed for cosmetic changes.

Usage (FastAPI route example)
------------------------------
    from pdf_service import generate_invoice_pdf

    @router.get("/invoices/{invoice_id}/pdf")
    async def get_invoice_pdf(invoice_id: UUID, ...):
        data = await build_invoice_context(invoice_id)   # fetch + shape data
        pdf_bytes = generate_invoice_pdf(data)
        return Response(content=pdf_bytes, media_type="application/pdf")

Each generate_*_pdf() function takes a single context dict matching
the shape documented in sample_data.py and returns raw PDF bytes.
Upload the bytes to Supabase Storage and store the resulting URL on
the invoice / quotation / etc. row (see `pdf_url` column on invoices).
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML

# ----------------------------------------------------------------
# Setup
# ----------------------------------------------------------------

TEMPLATES_DIR = Path(__file__).parent / "templates"

_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(["html"]),
)

with open(TEMPLATES_DIR / "base.css", "r", encoding="utf-8") as f:
    BASE_CSS = f.read()


def _render(template_name: str, context: dict[str, Any]) -> bytes:
    """Render a Jinja2 template to PDF bytes."""
    template = _env.get_template(template_name)
    html_string = template.render(base_css=BASE_CSS, **context)
    return HTML(string=html_string).write_pdf()


def _render_to_file(template_name: str, context: dict[str, Any], out_path: str) -> str:
    """Render and write to disk. Returns the output path."""
    pdf_bytes = _render(template_name, context)
    with open(out_path, "wb") as f:
        f.write(pdf_bytes)
    return out_path


# ----------------------------------------------------------------
# Document-specific generators
#
# Each function expects `org` (organisation dict) and `customer`
# (customer dict) plus document-specific fields. See sample_data.py
# for the exact shape of every context dict.
# ----------------------------------------------------------------

def generate_quotation_pdf(ctx: dict[str, Any]) -> bytes:
    """
    Required context keys:
        org, customer, items[], doc_number, quote_date, valid_until,
        subtotal, tax_rate, tax_amount, total_amount, currency,
        doc_status, doc_status_class
    Optional:
        prepared_by, payment_terms, notes, discount_amount
    """
    ctx = {
        "doc_title": "QUOTATION",
        "page_stamp": "DRAFT" if ctx.get("doc_status_class") == "draft" else None,
        "page_stamp_class": "draft",
        **ctx,
    }
    return _render("quotation.html", ctx)


def generate_invoice_pdf(ctx: dict[str, Any]) -> bytes:
    """
    Required context keys:
        org, customer, items[], doc_number, invoice_date, due_date,
        subtotal, tax_rate, tax_amount, total_amount, currency,
        doc_status, doc_status_class
    Optional:
        order_ref, customer_ref, notes, discount_amount, amount_paid,
        bank_name, bank_account_no, bank_account_name, promptpay_id
    """
    status_class = ctx.get("doc_status_class")
    stamp_map = {"paid": "PAID", "overdue": "OVERDUE"}
    ctx = {
        "doc_title": "INVOICE",
        "page_stamp": stamp_map.get(status_class),
        "page_stamp_class": status_class,
        **ctx,
    }
    return _render("invoice.html", ctx)


def generate_delivery_order_pdf(ctx: dict[str, Any]) -> bytes:
    """
    Required context keys:
        org, customer, items[] (each with description, sku,
        qty_ordered, qty_delivered), doc_number, delivery_date,
        order_ref, total_units, doc_status, doc_status_class
    Optional:
        delivery_address, customer_ref, driver_name, driver_phone,
        vehicle_no, notes
    """
    ctx = {
        "doc_title": "DELIVERY ORDER",
        "page_stamp": None,
        "page_stamp_class": None,
        **ctx,
    }
    return _render("delivery_order.html", ctx)


def generate_delivery_confirmation_pdf(ctx: dict[str, Any]) -> bytes:
    """
    Required context keys:
        org, customer, items[] (each with description, sku,
        qty_delivered, qty_received, condition, condition_class),
        doc_number, delivery_date, delivery_order_ref, order_ref,
        doc_status, doc_status_class
    Optional:
        delivery_address, notes, photo_refs[]
    """
    status_class = ctx.get("doc_status_class")
    ctx = {
        "doc_title": "DELIVERY CONFIRMATION",
        "page_stamp": "CONFIRMED" if status_class == "confirmed" else None,
        "page_stamp_class": "confirmed",
        **ctx,
    }
    return _render("delivery_confirmation.html", ctx)


def generate_receipt_pdf(ctx: dict[str, Any]) -> bytes:
    """
    Required context keys:
        org, customer, items[] (each with description, amount),
        doc_number, receipt_date, invoice_ref, payment_method,
        total_amount, currency, doc_status, doc_status_class
    Optional:
        payment_reference, amount_in_words, invoice_total,
        paid_to_date, remaining_balance, notes
    """
    ctx = {
        "doc_title": "RECEIPT",
        "page_stamp": "RECEIVED",
        "page_stamp_class": "received",
        **ctx,
    }
    return _render("receipt.html", ctx)


# ----------------------------------------------------------------
# Filename helpers — used when uploading to Supabase Storage
# ----------------------------------------------------------------

def storage_path(org_slug: str, doc_type: str, doc_number: str) -> str:
    """
    Returns the storage path for a generated PDF, e.g.:
        somchai-trading/invoices/INV-00041.pdf
        somchai-trading/quotations/QUO-0012.pdf
        somchai-trading/delivery-orders/DO-0033.pdf
        somchai-trading/delivery-confirmations/DC-0033.pdf
        somchai-trading/receipts/RCT-0027.pdf

    doc_type is one of:
        'invoices' | 'quotations' | 'delivery-orders'
        | 'delivery-confirmations' | 'receipts'
    """
    safe_number = doc_number.replace("/", "-")
    return f"{org_slug}/{doc_type}/{safe_number}.pdf"
