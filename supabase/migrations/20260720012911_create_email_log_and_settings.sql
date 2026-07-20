-- Email log: persistent audit trail of every email sent via Resend
create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid(),
  order_id text,
  customer_id text,
  template_id text not null,
  recipient text not null,
  subject text not null,
  status text not null default 'sent',
  resend_message_id text,
  error text,
  sent_by text,
  created_at timestamptz not null default now()
);

create index if not exists email_log_order_id_idx on public.email_log (order_id);
create index if not exists email_log_template_id_idx on public.email_log (template_id);
create index if not exists email_log_created_at_idx on public.email_log (created_at desc);

-- Email settings: single row holding automation toggles + from/reply-to
create table if not exists public.email_settings (
  id int primary key default 1,
  automation_enabled boolean not null default false,
  template_order_received boolean not null default false,
  template_order_confirmed boolean not null default false,
  template_collection_reminder boolean not null default false,
  from_address text not null default 'orders@fergbutcher.com',
  reply_to_address text,
  updated_at timestamptz not null default now()
);

-- Ensure exactly one row exists
insert into public.email_settings (id) values (1)
  on conflict (id) do nothing;

alter table public.email_log enable row level security;
alter table public.email_settings enable row level security;

-- Public read/write for authenticated + anon (app is behind Netlify login,
-- and the serverless functions use the service role key which bypasses RLS)
create policy "email_log_all_anon_auth" on public.email_log
  for all to anon, authenticated using (true) with check (true);
create policy "email_settings_all_anon_auth" on public.email_settings
  for all to anon, authenticated using (true) with check (true);
