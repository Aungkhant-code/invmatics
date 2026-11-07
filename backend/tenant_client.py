"""
Invmatics Systems — tenant-scoped Supabase client

Why this exists
---------------
The routers used to talk to Supabase "as the user" by handing it the Clerk token
(`set_session`). Supabase Auth only accepts its own tokens, so that call fails for a
Clerk token. Instead, requests now run through the server-side client, and THIS
wrapper guarantees tenant isolation in code:

    select / update / delete   always get   WHERE org_id = <the caller's org>
    insert / upsert            always get   org_id = <the caller's org>  stamped in
    organisations              is keyed by  id  rather than org_id
    org_id set to another org  is refused   (PermissionError)

Routers keep calling `client.table(...)` exactly as before; only `get_client`
changed. Nothing else about the client is exposed (no rpc / auth / storage), so
there is no way around the scoping from a router.

Trade-off: this replaces database-level RLS as the thing keeping tenants apart.
Every user-facing query MUST go through this wrapper (never `db_admin` directly
with a request-supplied id). To get RLS back later, enable Supabase "Third-Party
Auth" for Clerk and return to a per-user client.
"""

from typing import Any

from database import db_admin

_ORG_COLUMN = {"organisations": "id"}      # every other table uses "org_id"


class TenantTable:
    """Query builder entry point for one table, bound to one organisation."""

    __slots__ = ("_name", "_org", "_col", "_t")

    def __init__(self, name: str, org_id: str):
        self._name = name
        self._org = org_id
        self._col = _ORG_COLUMN.get(name, "org_id")
        self._t = db_admin.table(name)

    # -- reads / filtered writes: the org filter is applied before the caller sees the builder
    def select(self, *args: Any, **kwargs: Any):
        return self._t.select(*args, **kwargs).eq(self._col, self._org)

    def update(self, values: dict, *args: Any, **kwargs: Any):
        if self._name != "organisations" and values.get("org_id", self._org) != self._org:
            raise PermissionError("cross-tenant write blocked: org_id can't be changed")
        return self._t.update(values, *args, **kwargs).eq(self._col, self._org)

    def delete(self, *args: Any, **kwargs: Any):
        return self._t.delete(*args, **kwargs).eq(self._col, self._org)

    # -- inserts: org_id is stamped onto every row
    def insert(self, rows: Any, *args: Any, **kwargs: Any):
        return self._t.insert(self._stamp(rows), *args, **kwargs)

    def upsert(self, rows: Any, *args: Any, **kwargs: Any):
        return self._t.upsert(self._stamp(rows), *args, **kwargs)

    def _stamp(self, rows: Any):
        if self._name == "organisations":
            raise PermissionError("organisations can't be created through the tenant client")

        def one(row: Any) -> dict:
            if not isinstance(row, dict):
                raise TypeError("rows must be dicts")
            if row.get("org_id", self._org) != self._org:
                raise PermissionError("cross-tenant write blocked: row belongs to another org")
            return {**row, "org_id": self._org}

        return [one(r) for r in rows] if isinstance(rows, list) else one(rows)

    def __getattr__(self, item: str):
        raise AttributeError(
            f"'{item}' is not available on the tenant-scoped client "
            f"(supported: select, insert, upsert, update, delete)"
        )


class TenantClient:
    """Drop-in for the old per-user Supabase client: only `.table()` is exposed."""

    __slots__ = ("org_id",)

    def __init__(self, org_id: str):
        if not org_id:
            raise ValueError("org_id is required")
        self.org_id = str(org_id)

    def table(self, name: str) -> TenantTable:
        return TenantTable(name, self.org_id)
