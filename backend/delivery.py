from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from pdf_service import generate_delivery_order_pdf, generate_delivery_confirmation_pdf

router = APIRouter()

ORG = {
    "name": "Somchai Trading Co., Ltd.",
    "address": "123 Sukhumvit Road, Bangkok 10110, Thailand",
    "tax_id": "0105562012345",
    "phone": "+66 2 123 4567",
    "email": "contact@somchaitrading.co.th",
}

CUSTOMERS = {
    "Kasem Construction": {
        "name": "Kasem Construction Co., Ltd.",
        "contact_name": "Kasem Wongwit",
        "address": "45 Rama IV Road, Bangkok 10500, Thailand",
        "tax_id": "0105562011111",
        "phone": "+66 81 234 5678",
    },
    "Phuket Build Ltd.": {
        "name": "Phuket Build Ltd.",
        "contact_name": None,
        "address": "12 Patong Road, Phuket 83150, Thailand",
        "tax_id": None,
        "phone": "+66 76 345 6789",
    },
    "Central Hardware": {
        "name": "Central Hardware Co., Ltd.",
        "contact_name": None,
        "address": "89 Rama I Road, Bangkok 10330, Thailand",
        "tax_id": "0105562022222",
        "phone": "+66 2 234 5678",
    },
}

DELIVERY_ORDERS = {
    "DO-0033": {
        "customer": "Kasem Construction",
        "order_ref": "SO-0041",
        "customer_ref": "PO-KC-2206",
        "delivery_date": "2025-06-10",
        "delivery_address": "45 Rama IV Road, Site Office B, Bangkok 10500, Thailand",
        "driver_name": "Wichai Prateep",
        "driver_phone": "+66 81 555 1234",
        "vehicle_no": "1กข-2345 Bangkok",
        "items": [
            {"description": "Cable 2.5mm (100m roll)", "sku": "CBL-2.5-100", "qty_ordered": 10, "qty_delivered": 10},
            {"description": "Drain Cover 300×300mm",   "sku": "DRN-300-300", "qty_ordered": 20, "qty_delivered": 20},
            {"description": "Steel Conduit 20mm (3m)", "sku": "CDT-20-3M",   "qty_ordered": 15, "qty_delivered": 12},
        ],
        "notes": "Partial delivery on Steel Conduit 20mm — remaining 3 units on back order BO-0007.",
        "status": "dispatched",
    },
    "DO-0032": {
        "customer": "Central Hardware",
        "order_ref": "SO-0039",
        "customer_ref": None,
        "delivery_date": "2025-06-08",
        "delivery_address": None,
        "driver_name": "Wichai Prateep",
        "driver_phone": "+66 81 555 1234",
        "vehicle_no": "1กข-2345 Bangkok",
        "items": [
            {"description": "Cable 6mm (100m roll)",  "sku": "CBL-6-100",   "qty_ordered": 8,  "qty_delivered": 8},
            {"description": "Cable Tray 100mm (2m)",  "sku": "CTR-100-2M",  "qty_ordered": 30, "qty_delivered": 30},
            {"description": "Gland Plate 150×150mm",  "sku": "GLP-150-150", "qty_ordered": 50, "qty_delivered": 50},
        ],
        "notes": "",
        "status": "delivered",
    },
}

# Delivery confirmation linked to delivery orders
DELIVERY_CONFIRMATIONS = {
    "DC-0033": {
        "delivery_order_ref": "DO-0033",
        "customer": "Kasem Construction",
        "order_ref": "SO-0041",
        "delivery_date": "2025-06-10",
        "delivery_address": "45 Rama IV Road, Site Office B, Bangkok 10500, Thailand",
        "items": [
            {"description": "Cable 2.5mm (100m roll)", "sku": "CBL-2.5-100",
             "qty_delivered": 10, "qty_received": 10, "condition": "Good",    "condition_class": "good"},
            {"description": "Drain Cover 300×300mm",   "sku": "DRN-300-300",
             "qty_delivered": 20, "qty_received": 19, "condition": "1 Short", "condition_class": "short"},
            {"description": "Steel Conduit 20mm (3m)", "sku": "CDT-20-3M",
             "qty_delivered": 12, "qty_received": 12, "condition": "Good",    "condition_class": "good"},
        ],
        "notes": "1x Drain Cover 300×300mm missing from pallet — reported to driver on site. Credit note to follow.",
        "photo_refs": ["IMG_2025-06-10_delivery_01.jpg", "IMG_2025-06-10_delivery_02.jpg"],
        "status": "confirmed",
    },
    "DC-0032": {
        "delivery_order_ref": "DO-0032",
        "customer": "Central Hardware",
        "order_ref": "SO-0039",
        "delivery_date": "2025-06-08",
        "delivery_address": None,
        "items": [
            {"description": "Cable 6mm (100m roll)",  "sku": "CBL-6-100",
             "qty_delivered": 8,  "qty_received": 8,  "condition": "Good", "condition_class": "good"},
            {"description": "Cable Tray 100mm (2m)",  "sku": "CTR-100-2M",
             "qty_delivered": 30, "qty_received": 30, "condition": "Good", "condition_class": "good"},
            {"description": "Gland Plate 150×150mm",  "sku": "GLP-150-150",
             "qty_delivered": 50, "qty_received": 50, "condition": "Good", "condition_class": "good"},
        ],
        "notes": "",
        "photo_refs": [],
        "status": "confirmed",
    },
}


def _build_do_context(do_id: str, do: dict) -> dict:
    customer = CUSTOMERS.get(do["customer"], {"name": do["customer"], "contact_name": None,
                                               "address": "Thailand", "tax_id": None, "phone": None})
    total_units = sum(i["qty_delivered"] for i in do["items"])
    return {
        "org": ORG,
        "customer": customer,
        "doc_number": do_id,
        "delivery_date": do["delivery_date"],
        "delivery_address": do.get("delivery_address"),
        "order_ref": do["order_ref"],
        "customer_ref": do.get("customer_ref"),
        "driver_name": do.get("driver_name"),
        "driver_phone": do.get("driver_phone"),
        "vehicle_no": do.get("vehicle_no"),
        "items": do["items"],
        "total_units": total_units,
        "notes": do["notes"] or None,
        "doc_status": do["status"].title(),
        "doc_status_class": do["status"],
    }


def _build_dc_context(dc_id: str, dc: dict) -> dict:
    customer = CUSTOMERS.get(dc["customer"], {"name": dc["customer"], "contact_name": None,
                                               "address": "Thailand", "tax_id": None, "phone": None})
    return {
        "org": ORG,
        "customer": customer,
        "doc_number": dc_id,
        "delivery_date": dc["delivery_date"],
        "delivery_address": dc.get("delivery_address"),
        "delivery_order_ref": dc["delivery_order_ref"],
        "order_ref": dc["order_ref"],
        "items": dc["items"],
        "notes": dc["notes"] or None,
        "photo_refs": dc.get("photo_refs", []),
        "doc_status": dc["status"].title(),
        "doc_status_class": dc["status"],
    }


# ── Routes ─────────────────────────────────────────────────────────

@router.get("/delivery-orders/{do_id}/pdf")
async def get_delivery_order_pdf(do_id: str):
    do = DELIVERY_ORDERS.get(do_id)
    if not do:
        raise HTTPException(status_code=404, detail=f"Delivery order {do_id} not found")
    ctx = _build_do_context(do_id, do)
    pdf_bytes = generate_delivery_order_pdf(ctx)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{do_id}.pdf"'},
    )


@router.get("/delivery-confirmations/{dc_id}/pdf")
async def get_delivery_confirmation_pdf(dc_id: str):
    dc = DELIVERY_CONFIRMATIONS.get(dc_id)
    if not dc:
        raise HTTPException(status_code=404, detail=f"Delivery confirmation {dc_id} not found")
    ctx = _build_dc_context(dc_id, dc)
    pdf_bytes = generate_delivery_confirmation_pdf(ctx)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{dc_id}.pdf"'},
    )