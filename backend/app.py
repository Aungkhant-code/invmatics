from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config      import ALLOWED_ORIGINS
from invoices    import router as invoices_router
from quotations  import router as quotations_router
from delivery    import router as delivery_router
from receipts    import router as receipts_router

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


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "1.0.0"}