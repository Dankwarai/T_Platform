-- Payments — real in-app payment processing via Paystack, replacing the
-- bare payment_status flag on jobs/orders with an actual checkout flow.
--
-- This table tracks provider-side transaction attempts, separate from
-- jobs.payment_status / orders.payment_status (which stay the
-- source-of-truth summary each page already reads). Only the
-- initialize-payment and paystack-webhook edge functions write here —
-- both use the service role, bypassing RLS — so there's no insert/update
-- policy for regular users, matching the order_items /
-- job_status_history "read-only from the client's perspective" pattern.

create type payment_target_type as enum ('job', 'order');
create type payment_status_value as enum ('pending', 'paid', 'failed');

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  target_type payment_target_type not null,
  job_id uuid references public.jobs (id) on delete cascade,
  order_id uuid references public.orders (id) on delete cascade,
  payer_id uuid not null references public.users (id) on delete cascade,
  amount numeric not null check (amount >= 0),
  provider text not null default 'paystack',
  provider_reference text not null unique,
  status payment_status_value not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (target_type = 'job' and job_id is not null and order_id is null)
    or (target_type = 'order' and order_id is not null and job_id is null)
  )
);

create index idx_payments_job_id on public.payments (job_id);
create index idx_payments_order_id on public.payments (order_id);
create index idx_payments_provider_reference on public.payments (provider_reference);

create function public.touch_payment_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_payment_update_touch
  before update on public.payments
  for each row execute function public.touch_payment_updated_at();

alter table public.payments enable row level security;

create policy "payer can view own payments" on public.payments
  for select using (payer_id = auth.uid ());
