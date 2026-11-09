create table if not exists access_codes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organisations(id) on delete cascade,
  code text not null unique,
  role text not null,
  max_uses int not null default 1,
  uses int not null default 0,
  expires_at timestamptz,
  revoked boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists access_codes_org_idx on access_codes(org_id);
alter table access_codes enable row level security;
