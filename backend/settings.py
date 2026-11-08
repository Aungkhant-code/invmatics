"""
Invmatics Systems — Settings router
Company profile, bank/payment details, invoice defaults and alert preferences.

Everyone in the org can read settings; only admins can change them.
These values are what the PDFs print (company details, bank account).
"""

import base64
import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator

from auth import require_auth, require_role, get_client

router = APIRouter()

ORG_FIELDS = (
    "name, tax_id, phone, email, website, address, country, currency, timezone, "
    "bank_name, bank_account_no, bank_account_name, plan"
)
INVOICING_FIELDS = "default_payment_terms, default_tax_rate, default_invoice_notes"
NOTIFY_FIELDS = (
    "notify_low_stock, notify_out_of_stock, notify_new_order, "
    "notify_overdue, notify_payment_received"
)

INVOICING_DEFAULTS = {"default_payment_terms": 14, "default_tax_rate": 7.0, "default_invoice_notes": None}
NOTIFY_DEFAULTS = {
    "notify_low_stock": True, "notify_out_of_stock": True, "notify_new_order": True,
    "notify_overdue": True, "notify_payment_received": True,
}


# ── Models ─────────────────────────────────────────────────────────

def _blank_to_none(v):
    if isinstance(v, str):
        v = v.strip()
        return v or None
    return v


class OrganisationUpdate(BaseModel):
    name:              Optional[str] = Field(None, max_length=200)
    tax_id:            Optional[str] = Field(None, max_length=50)
    phone:             Optional[str] = Field(None, max_length=50)
    email:             Optional[str] = Field(None, max_length=200)
    website:           Optional[str] = Field(None, max_length=200)
    address:           Optional[str] = Field(None, max_length=500)
    country:           Optional[str] = Field(None, max_length=2)
    currency:          Optional[str] = Field(None, max_length=10)
    timezone:          Optional[str] = Field(None, max_length=60)
    bank_name:         Optional[str] = Field(None, max_length=100)
    bank_account_no:   Optional[str] = Field(None, max_length=50)
    bank_account_name: Optional[str] = Field(None, max_length=100)

    @field_validator("*", mode="before")
    @classmethod
    def _strip(cls, v):
        return _blank_to_none(v)

    @field_validator("currency", "country")
    @classmethod
    def _upper(cls, v):
        return v.upper() if v else v

    @field_validator("currency")
    @classmethod
    def _currency(cls, v):
        if v and not re.match(r"^[A-Z0-9]{2,10}$", v):
            raise ValueError("Currency must be 2–10 letters or digits (e.g. THB)")
        return v

    @field_validator("timezone")
    @classmethod
    def _tz(cls, v):
        if v and not re.match(r"^[A-Za-z][A-Za-z0-9_+\-]*(/[A-Za-z0-9_+\-]+){0,2}$", v):
            raise ValueError("Pick a timezone like Asia/Bangkok")
        return v

    @field_validator("email")
    @classmethod
    def _email(cls, v):
        if v and not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", v):
            raise ValueError("Enter a valid email address")
        return v


class InvoicingUpdate(BaseModel):
    default_payment_terms: Optional[int]   = Field(None, ge=0, le=365)
    default_tax_rate:      Optional[float] = Field(None, ge=0, le=100)
    default_invoice_notes: Optional[str]   = Field(None, max_length=1000)

    @field_validator("default_invoice_notes", mode="before")
    @classmethod
    def _strip(cls, v):
        return _blank_to_none(v)


class NotificationsUpdate(BaseModel):
    notify_low_stock:        Optional[bool] = None
    notify_out_of_stock:     Optional[bool] = None
    notify_new_order:        Optional[bool] = None
    notify_overdue:          Optional[bool] = None
    notify_payment_received: Optional[bool] = None


class LogoUpdate(BaseModel):
    logo: Optional[str] = None        # a data: URL, or null to remove


MAX_LOGO_BYTES = 300_000
_LOGO_MAGIC = {                      # claimed type -> the bytes a real file of that type starts with
    "png":  b"\x89PNG\r\n\x1a\n",
    "jpeg": b"\xff\xd8\xff",
    "webp": b"RIFF",
}


def _check_logo(data_url: str) -> None:
    m = re.match(r"^data:image/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$", data_url or "")
    if not m:
        raise HTTPException(status_code=400, detail="Logo must be a PNG, JPEG or WebP image")
    kind, payload = m.groups()
    try:
        raw = base64.b64decode(payload, validate=True)
    except Exception:
        raise HTTPException(status_code=400, detail="That image couldn't be read")
    if len(raw) > MAX_LOGO_BYTES:
        raise HTTPException(status_code=413, detail="Logo is too large — keep it under 300 KB")
    if not raw.startswith(_LOGO_MAGIC[kind]):
        raise HTTPException(status_code=400, detail="That file isn't a valid image")


# ── Helpers ────────────────────────────────────────────────────────

def _first(builder):
    rows = builder.limit(1).execute().data
    return rows[0] if rows else None


def _settings_row(client) -> dict:
    return _first(client.table("org_settings").select(f"{INVOICING_FIELDS}, {NOTIFY_FIELDS}")) or {}


def _save_org_settings(client, values: dict) -> dict:
    """org_settings has one row per org; create it on first save."""
    res = client.table("org_settings").upsert(values, on_conflict="org_id").execute()
    return res.data[0] if res.data else values


# ── Routes ─────────────────────────────────────────────────────────

@router.get("/settings")
async def get_settings(
    user:   dict = Depends(require_auth),
    client       = Depends(get_client),
):
    org = _first(client.table("organisations").select(ORG_FIELDS).eq("id", user["org_id"]))
    if not org:
        raise HTTPException(status_code=404, detail="Organisation not found")

    # logo_url needs `alter table organisations add column logo_url text`; until that's run,
    # the rest of Settings must keep working.
    logo, logo_ok = None, True
    try:
        r = _first(client.table("organisations").select("logo_url").eq("id", user["org_id"]))
        logo = (r or {}).get("logo_url")
    except Exception:
        logo_ok = False

    row = _settings_row(client)
    return {
        "organisation":  {**org, "logo_url": logo},
        "logo_supported": logo_ok,
        "invoicing":     {k: row.get(k, d) if row.get(k) is not None else d
                          for k, d in INVOICING_DEFAULTS.items()},
        "notifications": {k: row.get(k) if row.get(k) is not None else d
                          for k, d in NOTIFY_DEFAULTS.items()},
        "can_edit":      user["role"] == "admin",
    }


@router.put("/settings/organisation")
async def update_organisation(
    body:   OrganisationUpdate,
    user:   dict = Depends(require_role("admin")),
    client       = Depends(get_client),
):
    # exclude_unset: a field sent as null/"" CLEARS that value; one not sent is left alone
    updates = body.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    if "name" in updates and not updates["name"]:
        raise HTTPException(status_code=400, detail="Company name can't be empty")
    for required in ("currency", "country", "timezone"):
        if required in updates and not updates[required]:
            updates.pop(required)          # these have defaults; blank means "unchanged"

    res = client.table("organisations").update(updates).eq("id", user["org_id"]).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Organisation not found")
    return {k: res.data[0].get(k) for k in ORG_FIELDS.replace(" ", "").split(",")}


@router.put("/settings/invoicing")
async def update_invoicing(
    body:   InvoicingUpdate,
    user:   dict = Depends(require_role("admin")),
    client       = Depends(get_client),
):
    updates = body.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    row = _save_org_settings(client, updates)
    return {k: row.get(k, d) if row.get(k) is not None else d for k, d in INVOICING_DEFAULTS.items()}


@router.put("/settings/notifications")
async def update_notifications(
    body:   NotificationsUpdate,
    user:   dict = Depends(require_role("admin")),
    client       = Depends(get_client),
):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    row = _save_org_settings(client, updates)
    return {k: row.get(k) if row.get(k) is not None else d for k, d in NOTIFY_DEFAULTS.items()}


@router.put("/settings/logo")
async def update_logo(
    body:   LogoUpdate,
    user:   dict = Depends(require_role("admin")),
    client       = Depends(get_client),
):
    """Set (data: URL) or remove (null) the company logo printed on documents."""
    if body.logo is not None:
        _check_logo(body.logo)
    try:
        res = client.table("organisations").update({"logo_url": body.logo}).eq("id", user["org_id"]).execute()
    except Exception as e:
        if "logo_url" in str(e):
            raise HTTPException(
                status_code=503,
                detail="Logos need a one-time database update (add the logo_url column to organisations).",
            )
        raise
    if not res.data:
        raise HTTPException(status_code=404, detail="Organisation not found")
    return {"logo_url": res.data[0].get("logo_url")}
