"""
Invmatics Systems — FastAPI Application
All routers registered, CORS from config, no hardcoded values.
"""

import os
import sys

# Vercel imports this file by path, so its own folder isn't on sys.path;
# without this, `from config import ...` and every other sibling import fails.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from config import ALLOWED_ORIGINS
from permissions import enforce_permissions

# Routers
from auth_webhook import router as auth_router
from products     import router as products_router
from customers    import router as customers_router
from suppliers    import router as suppliers_router
from orders       import router as orders_router
from inventory    import router as inventory_router
from analytics    import router as analytics_router
from invoices     import router as invoices_router
from quotations   import router as quotations_router
from delivery     import router as delivery_router
from receipts     import router as receipts_router
from settings     import router as settings_router
from staff        import router as staff_router

app = FastAPI(
    title="Invmatics Systems API",
    version="1.0.0",
    description="B2B inventory and operations management for SMBs in SEA",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Every router except auth (the Clerk webhook is unauthenticated) goes through the role rules
GUARD = [Depends(enforce_permissions)]

# Auth
app.include_router(auth_router,      prefix="/api")

# Core operations
app.include_router(products_router,  prefix="/api", dependencies=GUARD)
app.include_router(customers_router, prefix="/api", dependencies=GUARD)
app.include_router(suppliers_router, prefix="/api", dependencies=GUARD)
app.include_router(orders_router,    prefix="/api", dependencies=GUARD)
app.include_router(inventory_router, prefix="/api", dependencies=GUARD)
app.include_router(analytics_router, prefix="/api", dependencies=GUARD)

# Documents + PDF
app.include_router(invoices_router,   prefix="/api", dependencies=GUARD)
app.include_router(quotations_router, prefix="/api", dependencies=GUARD)
app.include_router(delivery_router,   prefix="/api", dependencies=GUARD)
app.include_router(receipts_router,   prefix="/api", dependencies=GUARD)
app.include_router(settings_router,   prefix="/api", dependencies=GUARD)
app.include_router(staff_router,      prefix="/api", dependencies=GUARD)


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "1.0.0"}
