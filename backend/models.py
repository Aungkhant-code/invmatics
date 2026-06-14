# models.py
# All database models (ORM table definitions)
#
# --- Catalogue ---
# Product
# ProductVariant (size, spec, grade)
# Category / Subcategory
# ProductImage
# ProductSpecField (custom specification fields)
#
# --- Inventory ---
# StockLevel (per product / variant)
# StockMovement (receive, write-off, damage, theft)
#
# --- Orders & Invoices ---
# SalesOrder
# SalesOrderLine
# BackOrder
# Invoice
# InvoiceLine
#
# --- Customers ---
# Customer
# CustomerContact
# VolumePricingTier (per customer)
# CustomerNote
#
# --- Suppliers ---
# Supplier
# PurchaseOrder
# PurchaseOrderLine
#
# --- Auth / Staff ---
# User (staff account)
# Role (Admin, Manager, Sales, Warehouse, Finance)
# ActivityLog
