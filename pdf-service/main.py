"""
Invmatics PDF service.

Vercel's Python runtime has no Pango/GObject, which WeasyPrint needs, so PDFs are rendered
here instead (a small container) and the main API calls this over HTTPS:

    POST /render   {"template": "invoice.html", "context": {...}}   ->  application/pdf
    GET  /health

It reuses backend/pdf_service.py and backend/templates unchanged, so documents look
exactly the same as when rendered locally.

Environment:
    PDF_SERVICE_SECRET   shared secret; requests must send it in X-PDF-Secret
"""

import hmac
import os

from fastapi import FastAPI, Header, HTTPException, Response
from pydantic import BaseModel

# Never let this service call another one (it IS the renderer).
os.environ.pop("PDF_SERVICE_URL", None)

from pdf_service import _render, _env   # noqa: E402  (copied next to this file in the image)

SECRET = os.environ.get("PDF_SERVICE_SECRET", "")

app = FastAPI(title="Invmatics PDF service")


class RenderBody(BaseModel):
    template: str
    context: dict


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/render")
def render(body: RenderBody, x_pdf_secret: str = Header(None)):
    if not SECRET:
        raise HTTPException(status_code=500, detail="PDF_SERVICE_SECRET is not configured")
    if not x_pdf_secret or not hmac.compare_digest(x_pdf_secret, SECRET):
        raise HTTPException(status_code=401, detail="Unauthorized")

    # only known templates (no path tricks like ../../)
    if body.template not in _env.list_templates(extensions=["html"]) or body.template == "base.html":
        raise HTTPException(status_code=400, detail="Unknown template")

    try:
        pdf = _render(body.template, body.context)
    except Exception as e:
        print(f"Render failed for {body.template}: {e!r}")
        raise HTTPException(status_code=500, detail="Render failed")
    return Response(content=pdf, media_type="application/pdf")
