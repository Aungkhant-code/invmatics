"""
Invmatics Systems — Inventory router
Stock movements, adjustments, and stock level queries.

All stock changes go through record_stock_movement() in Postgres
ensuring atomicity and a complete audit trail.
"""

from uuid import UUID
from datetime import date
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from database import db_admin
from auth import require_auth, get_client
from models import StockAdjustment

router = APIRouter()


# ================================================================
# STOCK LEVELS
# ================================================================

@router.get("/inventory/stock")
async def list_stock_levels(
    search:      Optional[str]  = None,
    low_stock:   bool           = False,
    category_id: Optional[UUID] = None,
    user:   dict = Depends(require_auth),
    client       = Depends(get_client),
):
    """
    List all products with their current stock levels.
    Optionally filter by low stock or category.
    """
    query = (
        client.table("products")
        .select(
            "id, name, sku, barcode, reorder_point, reorder_qty, unit, "
            "cost_price, selling_price, "
            "stock_levels(qty_on_hand, qty_reserved, qty_on_order), "
            "categories(name), "
            "suppliers(name, lead_days)"
        )
        .eq("is_active", True)
        .order("name")
    )

    if search:
        query = query.or_(
            f"name.ilike.%{search}%,"
            f"sku.ilike.%{search}%,"
            f"barcode.ilike.%{search}%"
        )

    if category_id:
        query = query.eq("category_id", str(category_id))

    result = query.execute()
    products = result.data or []

    # Attach computed fields
    for p in products:
        sl = p.get("stock_levels") or {}
        qty = sl.get("qty_on_hand", 0)
        p["qty_on_hand"]    = qty
        p["qty_reserved"]   = sl.get("qty_reserved", 0)
        p["qty_on_order"]   = sl.get("qty_on_order", 0)
        p["qty_available"]  = max(0, qty - sl.get("qty_reserved", 0))
        p["stock_value"]    = round(qty * p["cost_price"], 2)
        p["is_low_stock"]   = qty <= p["reorder_point"]
        p["is_out_of_stock"] = qty == 0

        if qty == 0:
            p["severity"] = "out"
        elif qty <= p["reorder_point"] * 0.5:
            p["severity"] = "critical"
        elif qty <= p["reorder_point"]:
            p["severity"] = "low"
        else:
            p["severity"] = "ok"

    if low_stock:
        products = [p for p in products if p["is_low_stock"]]

    total_value     = round(sum(p["stock_value"] for p in products), 2)
    out_of_stock    = sum(1 for p in products if p["is_out_of_stock"])
    low_stock_count = sum(1 for p in products if p["is_low_stock"])

    return {
        "products":     products,
        "count":        len(products),
        "total_value":  total_value,
        "out_of_stock": out_of_stock,
        "low_stock":    low_stock_count,
    }


@router.get("/inventory/stock/{product_id}")
async def get_stock_level(
    product_id: UUID,
    user:   dict = Depends(require_auth),
    client       = Depends(get_client),
):
    """Get stock level for a single product."""
    result = (
        client.table("stock_levels")
        .select("*, products(name, sku, reorder_point, reorder_qty, cost_price)")
        .eq("product_id", str(product_id))
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Stock level not found")

    return result.data


# ================================================================
# STOCK MOVEMENTS (audit log)
# ================================================================

@router.get("/inventory/movements")
async def list_movements(
    product_id:    Optional[UUID] = None,
    movement_type: Optional[str]  = None,
    ref_type:      Optional[str]  = None,
    date_from:     Optional[date] = None,
    date_to:       Optional[date] = None,
    limit:         int            = 50,
    offset:        int            = 0,
    user:   dict = Depends(require_auth),
    client       = Depends(get_client),
):
    """
    Full stock movement audit log.
    Filterable by product, type, reference, and date range.
    """
    query = (
        client.table("stock_movements")
        .select(
            "*, "
            "products(name, sku), "
            "users(full_name)"
        )
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
    )

    if product_id:
        query = query.eq("product_id", str(product_id))
    if movement_type:
        query = query.eq("movement_type", movement_type)
    if ref_type:
        query = query.eq("ref_type", ref_type)
    if date_from:
        query = query.gte("created_at", str(date_from))
    if date_to:
        query = query.lte("created_at", str(date_to))

    result = query.execute()
    return {
        "movements": result.data or [],
        "count":     len(result.data or []),
        "offset":    offset,
        "limit":     limit,
    }


@router.get("/inventory/movements/{movement_id}")
async def get_movement(
    movement_id: UUID,
    user:   dict = Depends(require_auth),
    client       = Depends(get_client),
):
    result = (
        client.table("stock_movements")
        .select("*, products(name, sku), users(full_name)")
        .eq("id", str(movement_id))
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Movement not found")

    return result.data


# ================================================================
# STOCK ADJUSTMENTS
# ================================================================

@router.post("/inventory/adjust")
async def record_adjustment(
    body: StockAdjustment,
    user: dict = Depends(require_auth),
):
    """
    Record a manual stock adjustment.
    Types: adjustment | damage | theft | return | write_off

    For damage/theft: qty_change should be negative.
    For return/adjustment increase: qty_change positive.
    Calls record_stock_movement() atomically in Postgres.
    """
    org_id = user["org_id"]

    allowed_manual_types = {"adjustment", "damage", "theft", "return", "write_off"}
    if body.movement_type not in allowed_manual_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid movement type. Allowed: {', '.join(allowed_manual_types)}"
        )

    if body.movement_type in ("damage", "theft", "write_off"):
        qty = -abs(body.qty_change)
    elif body.movement_type == "return":
        qty = abs(body.qty_change)
    else:
        qty = body.qty_change

    try:
        result = db_admin.rpc("record_stock_movement", {
            "p_org_id":     org_id,
            "p_product_id": str(body.product_id),
            "p_user_id":    None,
            "p_type":       body.movement_type,
            "p_qty_change": qty,
            "p_ref_type":   body.ref_type,
            "p_ref_id":     str(body.ref_id) if body.ref_id else None,
            "p_notes":      body.notes,
        }).execute()

        return {
            "message":     "Stock adjustment recorded",
            "movement_id": result.data,
            "product_id":  str(body.product_id),
            "qty_change":  qty,
            "type":        body.movement_type,
        }

    except Exception as e:
        error_msg = str(e)
        if "Insufficient stock" in error_msg:
            raise HTTPException(
                status_code=400,
                detail="Insufficient stock for this adjustment"
            )
        raise HTTPException(status_code=500, detail=f"Failed to record movement: {error_msg}")


# ================================================================
# STOCK COUNT (stocktake)
# ================================================================

@router.post("/inventory/stocktake")
async def record_stocktake(
    counts: list[dict],
    notes:  Optional[str] = None,
    user:   dict = Depends(require_auth),
    client       = Depends(get_client),
):
    """
    Record a full or partial stocktake.
    For each product counted:
        → Compares counted_qty to current qty_on_hand
        → If different, records an 'adjustment' movement
          with the difference (+/-)
    Returns a summary of all changes made.
    """
    org_id = user["org_id"]
    changes   = []
    no_change = []

    for count in counts:
        product_id  = count.get("product_id")
        counted_qty = count.get("counted_qty")

        if product_id is None or counted_qty is None:
            continue

        current = (
            client.table("stock_levels")
            .select("qty_on_hand, products(name, sku)")
            .eq("product_id", product_id)
            .single()
            .execute()
        )

        if not current.data:
            continue

        current_qty = current.data["qty_on_hand"]
        diff = counted_qty - current_qty

        if diff == 0:
            no_change.append({
                "product_id": product_id,
                "name":       current.data["products"]["name"],
                "qty":        current_qty,
            })
            continue

        try:
            db_admin.rpc("record_stock_movement", {
                "p_org_id":     org_id,
                "p_product_id": product_id,
                "p_user_id":    None,
                "p_type":       "adjustment",
                "p_qty_change": diff,
                "p_ref_type":   "stocktake",
                "p_ref_id":     None,
                "p_notes":      notes or "Stocktake adjustment",
            }).execute()

            changes.append({
                "product_id": product_id,
                "name":       current.data["products"]["name"],
                "before":     current_qty,
                "counted":    counted_qty,
                "adjustment": diff,
            })
        except Exception as e:
            changes.append({
                "product_id": product_id,
                "error":      str(e),
            })

    return {
        "message":        "Stocktake recorded",
        "changes":        changes,
        "no_change":      no_change,
        "total_adjusted": len(changes),
    }


# ================================================================
# LOW STOCK SUMMARY
# ================================================================

@router.get("/inventory/low-stock")
async def low_stock_summary(
    user:   dict = Depends(require_auth),
    client       = Depends(get_client),
):
    """
    Returns all products at or below reorder point,
    grouped by severity. Used by the Low Stock page
    and dashboard alert panel.
    """
    result = (
        client.table("products")
        .select(
            "id, name, sku, reorder_point, reorder_qty, cost_price, "
            "stock_levels(qty_on_hand, qty_on_order), "
            "suppliers(name, lead_days)"
        )
        .eq("is_active", True)
        .execute()
    )

    products = result.data or []

    critical = []
    low      = []
    warning  = []

    from datetime import datetime, timedelta

    for p in products:
        sl  = p.get("stock_levels") or {}
        qty = sl.get("qty_on_hand", 0)
        rop = p["reorder_point"]

        if qty > rop:
            continue

        supplier  = p.get("suppliers") or {}
        lead_days = supplier.get("lead_days", 7)
        est_arrival = (datetime.today() + timedelta(days=lead_days)).strftime("%Y-%m-%d")

        enriched = {
            **p,
            "qty_on_hand":      qty,
            "qty_on_order":     sl.get("qty_on_order", 0),
            "est_reorder_cost": round(p["reorder_qty"] * p["cost_price"], 2),
            "est_arrival":      est_arrival,
            "stock_pct":        round((qty / rop * 100) if rop > 0 else 0, 1),
        }

        if qty == 0 or qty <= rop * 0.5:
            enriched["severity"] = "critical"
            critical.append(enriched)
        elif qty < rop:
            enriched["severity"] = "low"
            low.append(enriched)
        else:
            enriched["severity"] = "warning"
            warning.append(enriched)

    return {
        "critical": critical,
        "low":      low,
        "warning":  warning,
        "total":    len(critical) + len(low) + len(warning),
    }


# ================================================================
# STOCK VALUE TREND (for reports)
# ================================================================

@router.get("/inventory/value-trend")
async def stock_value_trend(
    user:   dict = Depends(require_auth),
    client       = Depends(get_client),
):
    """
    Returns current total stock value.
    Historical trend data comes from analytics.py.
    """
    result = (
        client.table("products")
        .select("cost_price, stock_levels(qty_on_hand)")
        .eq("is_active", True)
        .execute()
    )

    products = result.data or []
    total_value = sum(
        p["cost_price"] * (p.get("stock_levels") or {}).get("qty_on_hand", 0)
        for p in products
    )

    return {
        "total_stock_value": round(total_value, 2),
        "product_count":     len(products),
    }
