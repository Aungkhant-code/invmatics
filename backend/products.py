"""
Invmatics Systems — Products router
Real Supabase queries. Every route verifies the Clerk token (require_auth) and
runs through the tenant-scoped client, so a caller can only ever see their own org.
"""

from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import require_auth, get_client

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


# ── Routes ─────────────────────────────────────────────────────────

@router.get("/products")
async def list_products(
    search:      Optional[str]  = None,
    category_id: Optional[UUID] = None,
    low_stock:   bool           = False,
    is_active:   bool           = True,
    user:   dict = Depends(require_auth),
    client       = Depends(get_client),
):
    """
    List all products for the authenticated org.
    Includes current stock level joined from stock_levels.
    Optionally filter by search (name/sku), category, or low stock flag.
    """
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


@router.get("/products/low-stock")
async def list_low_stock(
    user:   dict = Depends(require_auth),
    client       = Depends(get_client),
):
    """Returns all products at or below their reorder point."""
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
    user:   dict = Depends(require_auth),
    client       = Depends(get_client),
):
    """Get a single product with stock level and recent movements."""
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
    user:   dict = Depends(require_auth),
    client       = Depends(get_client),
):
    """
    Create a product and seed its stock_levels row in one go.
    Both inserts go through the tenant-scoped client, which stamps org_id.
    """
    org_id = user["org_id"]

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

    result = client.table("products").insert(product_data).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create product")

    product = result.data[0]

    # Seed stock_levels row (every product starts at 0)
    client.table("stock_levels").insert({
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
    user:   dict = Depends(require_auth),
    client       = Depends(get_client),
):
    """Update product fields. Partial update — only provided fields are changed."""
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
    user:   dict = Depends(require_auth),
    client       = Depends(get_client),
):
    """
    Soft delete — sets is_active=False rather than removing the row.
    Preserves stock movement history and order references.
    """
    result = (
        client.table("products")
        .update({"is_active": False})
        .eq("id", str(product_id))
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Product not found")

    return None
