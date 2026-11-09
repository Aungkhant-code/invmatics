"""
Invmatics Systems — public contact form (landing page "Contact sales").

POST /api/contact   no login. Stored in `contact_requests` (see contact.sql) and, when
RESEND_API_KEY is set, emailed to CONTACT_TO (default contact@kuihua.org).
Abuse guards: honeypot field, length limits, per-IP rate limit.
"""

import re
import time

import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, field_validator

from config import CONTACT_FROM, CONTACT_TO, RESEND_API_KEY
from database import db_admin

router = APIRouter()

_tries: dict = {}
MAX_PER_HOUR = 5


class ContactIn(BaseModel):
    name:    str = Field(..., max_length=100)
    email:   str = Field(..., max_length=200)
    company: str = Field("", max_length=150)
    message: str = Field(..., max_length=3000)
    website: str = ""                      # honeypot: real people leave this empty

    @field_validator("name", "message")
    @classmethod
    def _need(cls, v):
        v = (v or "").strip()
        if not v:
            raise ValueError("This field can't be empty")
        return v

    @field_validator("email")
    @classmethod
    def _email(cls, v):
        v = (v or "").strip()
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", v):
            raise ValueError("Enter a valid email address")
        return v


def _ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for", "")
    return (fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else "?"))


@router.post("/contact", status_code=201)
async def contact(body: ContactIn, request: Request):
    if body.website:                                  # bots fill hidden fields; pretend success
        return {"ok": True}

    ip, now = _ip(request), time.monotonic()
    recent = [t for t in _tries.get(ip, []) if now - t < 3600]
    if len(recent) >= MAX_PER_HOUR:
        raise HTTPException(status_code=429, detail="Too many messages. Please try again later.")
    _tries[ip] = recent + [now]

    row = {"name": body.name, "email": body.email, "company": body.company or None,
           "message": body.message, "ip": ip}
    try:
        db_admin.table("contact_requests").insert(row).execute()
    except Exception as e:
        print(f"contact: couldn't store message (run contact.sql?): {e}")
        if not RESEND_API_KEY:
            raise HTTPException(status_code=503, detail="We couldn't send your message right now. Please email us directly.")

    if RESEND_API_KEY:
        try:
            r = httpx.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
                json={
                    "from": CONTACT_FROM, "to": [CONTACT_TO], "reply_to": body.email,
                    "subject": f"Invmatics sales enquiry from {body.name}",
                    "text": f"Name: {body.name}\nEmail: {body.email}\nCompany: {body.company or '-'}\n\n{body.message}",
                },
                timeout=10,
            )
            if r.status_code >= 300:
                print(f"contact: email failed {r.status_code} {r.text[:200]}")
        except Exception as e:
            print(f"contact: email error {e}")
    return {"ok": True}
