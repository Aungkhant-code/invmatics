"""
Invmatics Systems — Products router
Real Supabase queries, RLS enforced via JWT.
"""

from uuid import UUID
from typing import Optional

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

from database import get_authed_client, db_admin

router = APIRouter()


# ── Pydantic models ────────────────────────────────────────────────

class ProductCreate(BaseModel):
    name:          str
    sku:           str
    barcode:       Optional[str] = None
    description:   Optional[str] = None
    unit:          Optional[str] = "unit"
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


# ── Helper ─────────────────────────────────────────────────────────

def _get_token(authorization: str) -> str:
    """Extract Bearer token from Authorization header."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    return authorization.split(" ", 1)[1]


# ── Routes ─────────────────────────────────────────────────────────

@router.get("/products")
async def list_products(
    search:      Optional[str]  = None,
    category_id: Optional[UUID] = None,
    low_stock:   bool           = False,
    is_active:   bool           = True,
    authorization: str = Header(None),
):
    """
    List all products for the authenticated org.
    Includes current stock level joined from stock_levels.
    Optionally filter by search (name/sku), category, or low stock flag.
    """
    token = _get_token(authorization)
    client = get_authed_client(token)

    query = (
        client.table("products")
        .select(
            "*, "
            "stock_levels(qty_on_hand, qty_reserved, qty_on_order), "
            "categories(name), "
            "suppliers(name)"
        )
        .eq("is_active", is_active)
        .order("name")
    )

    if search:
        query = query.or_(f"name.ilike.%{search}%,sku.ilike.%{search}%")

    if category_id:
        query = query.eq("category_id", str(category_id))

    result = query.execute()

    products = result.data or []

    # Filter low stock in Python (simpler than a complex Supabase filter)
    if low_stock:
        products = [
            p for p in products
            if p.get("stock_levels") and
               p["stock_levels"]["qty_on_hand"] <= p["reorder_point"]
        ]

    return {"products": products, "count": len(products)}


# Temporary test route — remove before production
@router.get("/products/test")
async def test_products():
    result = (
        db_admin.table("products")
        .select("*, stock_levels(qty_on_hand)")
        .eq("org_id", "c907fa55-2169-4b90-bad9-0a199e28d50a")
        .order("name")
        .execute()
    )
    return {"products": result.data, "count": len(result.data or [])}


@router.get("/products/low-stock")
async def list_low_stock(
    authorization: str = Header(None),
):
    """Returns all products at or below their reorder point."""
    token = _get_token(authorization)
    client = get_authed_client(token)

    result = (
        client.table("products")
        .select(
            "id, name, sku, reorder_point, reorder_qty, "
            "stock_levels(qty_on_hand), "
            "suppliers(name, lead_days)"
        )
        .eq("is_active", True)
        .execute()
    )

    products = result.data or []
    low = [
        p for p in products
        if p.get("stock_levels") and
           p["stock_levels"]["qty_on_hand"] <= p["reorder_point"]
    ]

    # Sort: out of stock first, then by % remaining
    low.sort(key=lambda p: p["stock_levels"]["qty_on_hand"] / max(p["reorder_point"], 1))

    return {"products": low, "count": len(low)}


@router.get("/products/{product_id}")
async def get_product(
    product_id: UUID,
    authorization: str = Header(None),
):
    """Get a single product with stock level and recent movements."""
    token = _get_token(authorization)
    client = get_authed_client(token)

    result = (
        client.table("products")
        .select(
            "*, "
            "stock_levels(qty_on_hand, qty_reserved, qty_on_order), "
            "categories(id, name), "
            "suppliers(id, name, lead_days, payment_terms)"
        )
        .eq("id", str(product_id))
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Product not found")

    # Fetch recent stock movements separately
    movements = (
        client.table("stock_movements")
        .select("movement_type, qty_change, qty_before, qty_after, ref_type, notes, created_at")
        .eq("product_id", str(product_id))
        .order("created_at", desc=True)
        .limit(10)
        .execute()
    )

    product = result.data
    product["recent_movements"] = movements.data or []

    return product


@router.post("/products", status_code=201)
async def create_product(
    body: ProductCreate,
    authorization: str = Header(None),
):
    """
    Create a product and seed its stock_levels row in one go.
    Uses db_admin so we can insert into both tables atomically.
    """
    token = _get_token(authorization)
    client = get_authed_client(token)

    # Get org_id from the users table (RLS will ensure this is their org)
    me = client.table("users").select("org_id").limit(1).execute()
    if not me.data:
        raise HTTPException(status_code=401, detail="User not found")

    org_id = me.data[0]["org_id"]

    # Check SKU is unique within org
    existing = (
        client.table("products")
        .select("id")
        .eq("org_id", org_id)
        .eq("sku", body.sku)
        .execute()
    )
    if existing.data:
        raise HTTPException(status_code=409, detail=f"SKU '{body.sku}' already exists")

    # Create product
    product_data = {
        "org_id": org_id,
        **body.model_dump(exclude_none=True),
        "category_id": str(body.category_id) if body.category_id else None,
        "supplier_id": str(body.supplier_id) if body.supplier_id else None,
    }

    result = db_admin.table("products").insert(product_data).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create product")

    product = result.data[0]

    # Seed stock_levels row (every product starts at 0)
    db_admin.table("stock_levels").insert({
        "org_id":     org_id,
        "product_id": product["id"],
        "qty_on_hand": 0,
        "qty_reserved": 0,
        "qty_on_order": 0,
    }).execute()

    return product


@router.put("/products/{product_id}")
async def update_product(
    product_id: UUID,
    body: ProductUpdate,
    authorization: str = Header(None),
):
    """Update product fields. Partial update — only provided fields are changed."""
    token = _get_token(authorization)
    client = get_authed_client(token)

    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    # Convert UUIDs to strings for Supabase
    if "category_id" in updates and updates["category_id"]:
        updates["category_id"] = str(updates["category_id"])
    if "supplier_id" in updates and updates["supplier_id"]:
        updates["supplier_id"] = str(updates["supplier_id"])

    result = (
        client.table("products")
        .update(updates)
        .eq("id", str(product_id))
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Product not found")

    return result.data[0]


@router.delete("/products/{product_id}", status_code=204)
async def delete_product(
    product_id: UUID,
    authorization: str = Header(None),
):
    """
    Soft delete — sets is_active=False rather than removing the row.
    Preserves stock movement history and order references.
    """
    token = _get_token(authorization)
    client = get_authed_client(token)

    result = (
        client.table("products")
        .update({"is_active": False})
        .eq("id", str(product_id))
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Product not found")

    return None
