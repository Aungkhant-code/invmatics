# invoices.py
# Invoice generation and management
#
# - Auto-generate sequential invoice numbers
# - Build invoice data with client company branding
# - Multi-currency pricing with configurable tax rate (pre-tax, tax, total)
# - Include payment details on invoice (bank transfer, wire, ACH, online link)
# - Accepted payment methods display on invoice
# - Per-line discount display
# - Mark invoice as paid (triggers PAID stamp on PDF)
# - Render and download invoice as PDF
# - Invoice history and search
