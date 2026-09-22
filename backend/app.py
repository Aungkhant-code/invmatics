from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config      import ALLOWED_ORIGINS
from invoices    import router as invoices_router
from quotations  import router as quotations_router
from delivery    import router as delivery_router
from receipts    import router as receipts_router
from products    import router as products_router
from customers   import router as customers_router
from suppliers   import router as suppliers_router
from orders      import router as orders_router
from inventory   import router as inventory_router
from analytics   import router as analytics_router

app = FastAPI(title="Invmatics Systems API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(invoices_router,   prefix="/api")
app.include_router(quotations_router, prefix="/api")
app.include_router(delivery_router,   prefix="/api")
app.include_router(receipts_router,   prefix="/api")
app.include_router(products_router,   prefix="/api")
app.include_router(customers_router,  prefix="/api")
app.include_router(suppliers_router,  prefix="/api")
app.include_router(orders_router,     prefix="/api")
app.include_router(inventory_router,  prefix="/api")
app.include_router(analytics_router,  prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "1.0.0"}