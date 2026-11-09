-- Billing: run once in the Supabase SQL editor.
alter table organisations
  add column if not exists stripe_customer_id     text,
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_status    text,
  add column if not exists current_period_end     timestamptz,
  add column if not exists billing_interval       text,
  add column if not exists trial_ends_at          timestamptz default (now() + interval '14 days');

-- existing organisations start their 14-day trial now 
update organisations set trial_ends_at = now() + interval '14 days' where trial_ends_at is null;

create index if not exists organisations_stripe_customer_idx on organisations(stripe_customer_id);
