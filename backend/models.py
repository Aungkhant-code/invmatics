"""
Invmatics Systems — Pydantic models
Shared request/response schemas used across all routers.
"""

from __future__ import annotations
from uuid import UUID
from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr


# ================================================================
# BASE
# ================================================================

class OrgBase(BaseModel):
    id:        UUID
    org_id:    UUID
    created_at: datetime
    updated_at: Optional[datetime] = None


# ================================================================
# ORGANISATION
# ================================================================

class OrgCreate(BaseModel):
    name:     str
    slug:     str
    currency: Optional[str] = "USD"
    timezone: Optional[str] = "Asia/Bangkok"
    country:  Optional[str] = "TH"


class OrgUpdate(BaseModel):
    name:             Optional[str] = None
    tax_id:           Optional[str] = None
    phone:            Optional[str] = None
    email:            Optional[str] = None
    website:          Optional[str] = None
    address:          Optional[str] = None
    currency:         Optional[str] = None
    timezone:         Optional[str] = None
    bank_name:        Optional[str] = None
    bank_account_no:  Optional[str] = None
    bank_account_name:Optional[str] = None
    promptpay_id:     Optional[str] = None


# ================================================================
# USER
# ================================================================

class UserCreate(BaseModel):
    email:     str
    full_name: str
    role:      str = "warehouse"


class UserUpdate(BaseModel):
    full_name:  Optional[str] = None
    role:       Optional[str] = None
    is_active:  Optional[bool] = None


class UserResponse(BaseModel):
    id:            UUID
    org_id:        UUID
    clerk_user_id: str
    email:         str
    full_name:     str
    role:          str
    is_active:     bool
    last_login_at: Optional[datetime] = None
    created_at:    datetime

    class Config:
        from_attributes = True


# ================================================================
# CATEGORY
# ================================================================

class CategoryCreate(BaseModel):
    name: str


class CategoryResponse(BaseModel):
    id:         UUID
    org_id:     UUID
    name:       str
    created_at: datetime

    class Config:
        from_attributes = True


# ================================================================
# SUPPLIER
# ================================================================

class SupplierCreate(BaseModel):
    name:         str
    contact_name: Optional[str] = None
    email:        Optional[str] = None
    phone:        Optional[str] = None
    address:      Optional[str] = None
    tax_id:       Optional[str] = None
    lead_days:    int = 7
    payment_terms:int = 30
    rating:       Optional[int] = None
    notes:        Optional[str] = None


class SupplierUpdate(BaseModel):
    name:         Optional[str] = None
    contact_name: Optional[str] = None
    email:        Optional[str] = None
    phone:        Optional[str] = None
    address:      Optional[str] = None
    tax_id:       Optional[str] = None
    lead_days:    Optional[int] = None
    payment_terms:Optional[int] = None
    rating:       Optional[int] = None
    notes:        Optional[str] = None
    is_active:    Optional[bool] = None


class SupplierResponse(BaseModel):
    id:           UUID
    org_id:       UUID
    name:         str
    contact_name: Optional[str]
    email:        Optional[str]
    phone:        Optional[str]
    address:      Optional[str]
    tax_id:       Optional[str]
    lead_days:    int
    payment_terms:int
    rating:       Optional[int]
    notes:        Optional[str]
    is_active:    bool
    created_at:   datetime

    class Config:
        from_attributes = True


# ================================================================
# CUSTOMER
# ================================================================

class CustomerCreate(BaseModel):
    name:          str
    contact_name:  Optional[str] = None
    email:         Optional[str] = None
    phone:         Optional[str] = None
    address:       Optional[str] = None
    tax_id:        Optional[str] = None
    credit_limit:  float = 0
    payment_terms: int = 14
    notes:         Optional[str] = None


class CustomerUpdate(BaseModel):
    name:          Optional[str] = None
    contact_name:  Optional[str] = None
    email:         Optional[str] = None
    phone:         Optional[str] = None
    address:       Optional[str] = None
    tax_id:        Optional[str] = None
    credit_limit:  Optional[float] = None
    payment_terms: Optional[int] = None
    notes:         Optional[str] = None
    is_active:     Optional[bool] = None


class CustomerResponse(BaseModel):
    id:            UUID
    org_id:        UUID
    name:          str
    contact_name:  Optional[str]
    email:         Optional[str]
    phone:         Optional[str]
    address:       Optional[str]
    tax_id:        Optional[str]
    credit_limit:  float
    payment_terms: int
    notes:         Optional[str]
    is_active:     bool
    created_at:    datetime

    class Config:
        from_attributes = True


# ================================================================
# PRODUCT
# ================================================================

class ProductCreate(BaseModel):
    name:          str
    sku:           str
    barcode:       Optional[str] = None
    description:   Optional[str] = None
    unit:          str = "unit"
    cost_price:    float = 0
    selling_price: float = 0
    tax_rate:      Optional[float] = None
    reorder_point: int = 0
    reorder_qty:   int = 0
    category_id:   Optional[UUID] = None
    supplier_id:   Optional[UUID] = None


class ProductUpdate(BaseModel):
    name:          Optional[str] = None
    sku:           Optional[str] = None
    barcode:       Optional[str] = None
    description:   Optional[str] = None
    unit:          Optional[str] = None
    cost_price:    Optional[float] = None
    selling_price: Optional[float] = None
    tax_rate:      Optional[float] = None
    reorder_point: Optional[int] = None
    reorder_qty:   Optional[int] = None
    category_id:   Optional[UUID] = None
    supplier_id:   Optional[UUID] = None
    is_active:     Optional[bool] = None


class ProductResponse(BaseModel):
    id:            UUID
    org_id:        UUID
    name:          str
    sku:           str
    barcode:       Optional[str]
    description:   Optional[str]
    unit:          str
    cost_price:    float
    selling_price: float
    tax_rate:      Optional[float]
    reorder_point: int
    reorder_qty:   int
    is_active:     bool
    category_id:   Optional[UUID]
    supplier_id:   Optional[UUID]
    created_at:    datetime

    class Config:
        from_attributes = True


# ================================================================
# STOCK
# ================================================================

class StockAdjustment(BaseModel):
    product_id:  UUID
    movement_type: str        # adjustment | damage | theft | return | write_off
    qty_change:  int          # positive or negative
    ref_type:    Optional[str] = None
    ref_id:      Optional[UUID] = None
    notes:       Optional[str] = None


class StockMovementResponse(BaseModel):
    id:            UUID
    org_id:        UUID
    product_id:    UUID
    user_id:       Optional[UUID]
    movement_type: str
    qty_change:    int
    qty_before:    int
    qty_after:     int
    ref_type:      Optional[str]
    ref_id:        Optional[UUID]
    notes:         Optional[str]
    created_at:    datetime

    class Config:
        from_attributes = True


# ================================================================
# LINE ITEMS (shared by orders, invoices, quotations)
# ================================================================

class LineItem(BaseModel):
    product_id:  UUID
    description: Optional[str] = None   # falls back to product name if None
    qty:         int
    unit_price:  float
    tax_rate:    float = 0
    discount_pct:float = 0


class LineItemResponse(BaseModel):
    id:          UUID
    product_id:  Optional[UUID]
    description: str
    qty:         int
    unit_price:  float
    tax_rate:    float
    line_total:  float

    class Config:
        from_attributes = True


# ================================================================
# SALES ORDER
# ================================================================

class SalesOrderCreate(BaseModel):
    customer_id:    UUID
    order_date:     date = None
    due_date:       Optional[date] = None
    customer_ref:   Optional[str] = None
    notes:          Optional[str] = None
    internal_notes: Optional[str] = None
    items:          List[LineItem]


class SalesOrderUpdate(BaseModel):
    status:         Optional[str] = None
    payment_status: Optional[str] = None
    due_date:       Optional[date] = None
    delivered_at:   Optional[datetime] = None
    notes:          Optional[str] = None
    internal_notes: Optional[str] = None


class SalesOrderResponse(BaseModel):
    id:             UUID
    org_id:         UUID
    customer_id:    UUID
    order_number:   str
    status:         str
    payment_status: str
    order_date:     date
    due_date:       Optional[date]
    subtotal:       float
    tax_amount:     float
    discount_amount:float
    total_amount:   float
    customer_ref:   Optional[str]
    notes:          Optional[str]
    created_at:     datetime

    class Config:
        from_attributes = True


# ================================================================
# PURCHASE ORDER
# ================================================================

class PurchaseOrderCreate(BaseModel):
    supplier_id:      UUID
    order_date:       date = None
    expected_delivery:Optional[date] = None
    notes:            Optional[str] = None
    items:            List[LineItem]


class PurchaseOrderUpdate(BaseModel):
    status:           Optional[str] = None
    payment_status:   Optional[str] = None
    expected_delivery:Optional[date] = None
    received_at:      Optional[datetime] = None
    notes:            Optional[str] = None


class ReceiveStockItem(BaseModel):
    po_item_id:  UUID
    qty_received:int


class ReceiveStock(BaseModel):
    items: List[ReceiveStockItem]
    notes: Optional[str] = None


# ================================================================
# INVOICE
# ================================================================

class InvoiceCreate(BaseModel):
    customer_id:    UUID
    sales_order_id: Optional[UUID] = None
    invoice_date:   date = None
    due_date:       date = None
    tax_rate:       float = 7.0
    notes:          Optional[str] = None
    items:          List[LineItem]


class InvoiceUpdate(BaseModel):
    status:         Optional[str] = None
    due_date:       Optional[date] = None
    notes:          Optional[str] = None


class RecordPayment(BaseModel):
    amount:         float
    payment_method: Optional[str] = None
    reference:      Optional[str] = None
    paid_at:        date = None
    notes:          Optional[str] = None


# ================================================================
# QUOTATION
# ================================================================

class QuotationCreate(BaseModel):
    customer_id:   UUID
    quote_date:    date = None
    valid_until:   date
    payment_terms: Optional[str] = None
    notes:         Optional[str] = None
    items:         List[LineItem]


class QuotationUpdate(BaseModel):
    status:        Optional[str] = None
    valid_until:   Optional[date] = None
    notes:         Optional[str] = None


# ================================================================
# DELIVERY ORDER
# ================================================================

class DeliveryOrderCreate(BaseModel):
    sales_order_id:  Optional[UUID] = None
    customer_id:     UUID
    delivery_date:   Optional[date] = None
    delivery_address:Optional[str] = None
    driver_name:     Optional[str] = None
    driver_phone:    Optional[str] = None
    vehicle_no:      Optional[str] = None
    notes:           Optional[str] = None
    items:           List[dict]     # [{product_id, description, sku, qty_ordered, qty_delivered}]


class DeliveryOrderUpdate(BaseModel):
    status:          Optional[str] = None
    delivery_date:   Optional[date] = None
    driver_name:     Optional[str] = None
    driver_phone:    Optional[str] = None
    vehicle_no:      Optional[str] = None
    notes:           Optional[str] = None


# ================================================================
# RECEIPT
# ================================================================

class ReceiptCreate(BaseModel):
    customer_id:      UUID
    invoice_id:       Optional[UUID] = None
    payment_id:       Optional[UUID] = None
    receipt_date:     date = None
    payment_method:   Optional[str] = None
    payment_reference:Optional[str] = None
    total_amount:     float
    amount_in_words:  Optional[str] = None
    notes:            Optional[str] = None


# ================================================================
# ANALYTICS
# ================================================================

class ReportPeriod(BaseModel):
    start_date: date
    end_date:   date


class KPISummary(BaseModel):
    revenue:        float
    cogs:           float
    gross_profit:   float
    gross_margin:   float
    pending_orders: int
    stock_value:    float
    outstanding_receivables: float
    overdue_count:  int
