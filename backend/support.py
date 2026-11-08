"""
Invmatics Systems — Support requests
Any signed-in user can send a message to the Invmatics team. Requests are stored in
`support_requests` (read them in the Supabase table editor).
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator

from database import db_admin
from auth import require_auth, db_user_id

router = APIRouter()

CATEGORIES = {"question", "problem", "feature", "billing"}
MAX_PER_HOUR = 5


class SupportIn(BaseModel):
    category: str = "question"
    subject:  str = Field(..., max_length=150)
    message:  str = Field(..., max_length=4000)

    @field_validator("subject", "message")
    @classmethod
    def _strip(cls, v):
        v = (v or "").strip()
        if not v:
            raise ValueError("This field can't be empty")
        return v

    @field_validator("category")
    @classmethod
    def _cat(cls, v):
        return v if v in CATEGORIES else "question"


@router.post("/support", status_code=201)
async def send_support_request(body: SupportIn, user: dict = Depends(require_auth)):
    uid = db_user_id(user["clerk_user_id"])
    since = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    recent = (
        db_admin.table("support_requests").select("id", count="exact")
        .eq("org_id", user["org_id"]).eq("user_id", uid).gte("created_at", since)
        .limit(1).execute()
    )
    if (recent.count or 0) >= MAX_PER_HOUR:
        raise HTTPException(status_code=429, detail="You've sent several messages recently — please wait a bit before sending more")

    row = db_admin.table("support_requests").insert({
        "org_id":     user["org_id"],
        "user_id":    uid,
        "user_email": user.get("email"),
        "category":   body.category,
        "subject":    body.subject,
        "message":    body.message,
    }).execute().data
    if not row:
        raise HTTPException(status_code=500, detail="Couldn't send your message — please try again")
    return {"id": row[0]["id"], "status": "open"}
