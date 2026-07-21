/*
# Create email_log and email_settings tables

1. Purpose
- Sets up the two Supabase tables needed for the email automation feature.
- `email_log` is a persistent audit trail of every email sent via Resend
  (order received, order confirmed, collection reminder, test emails).
- `email_settings` is a single-row table holding the global automation
  toggles and from/reply-to addresses.
- These are the ONLY tables that live in Supabase. All order, customer,
  and staff-note data stays on the existing PHP/SiteGround backend.

2. New Tables
- `email_log`
  - `id` (uuid, primary key, auto-generated)
  - `order_id` (text, nullable — links to PHP order ID)
  - `customer_id` (text, nullable — links to PHP customer ID)
  - `template_id` (text, not null — e.g. "order-received", "collection-reminder")
  - `recipient` (text, not null — email address sent to)
  - `subject` (text, not null — email subject line)
  - `status` (text, not null, default "sent" — "sent" or "failed")
  - `resend_message_id` (text, nullable — Resend API message ID)
  - `error` (text, nullable — error message if send failed)
  - `sent_by` (text, nullable — staff name or "scheduled-job")
  - `created_at` (timestamptz, not null, default now())
- `email_settings`
  - `id` (int, primary key, always 1 — single-row table)
  - `automation_enabled` (boolean, not null, default false)
  - `template_order_received` (boolean, not null, default false)
  - `template_order_confirmed` (boolean, not null, default false)
  - `template_collection_reminder` (boolean, not null, default false)
  - `from_address` (text, not null, default "orders@fergbutcher.com")
  - `reply_to_address` (text, nullable)
  - `updated_at` (timestamptz, not null, default now())

3. Indexes
- `email_log_order_id_idx` on `order_id` — lookup by order
- `email_log_template_id_idx` on `template_id` — filter by template
- `email_log_created_at_idx` on `created_at DESC` — recent log queries

4. Security (RLS)
- RLS enabled on both tables.
- Policies allow `anon` + `authenticated` full CRUD on both tables.
  This is intentional: the app has no sign-in screen, and the Netlify
  functions use the service role key which bypasses RLS anyway.
  The app is behind a Netlify login gate at the hosting layer.

5. Notes
- The `email_settings` table is seeded with a single row (id=1) so
  the app always has a settings row to read/update.
- Safe to re-run: uses IF NOT EXISTS and ON CONFLICT DO NOTHING.
- No order/customer data is stored here — those remain on the PHP backend.
*/

-- Email log table
CREATE TABLE IF NOT EXISTS public.email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text,
  customer_id text,
  template_id text NOT NULL,
  recipient text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  resend_message_id text,
  error text,
  sent_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_log_order_id_idx ON public.email_log (order_id);
CREATE INDEX IF NOT EXISTS email_log_template_id_idx ON public.email_log (template_id);
CREATE INDEX IF NOT EXISTS email_log_created_at_idx ON public.email_log (created_at DESC);

-- Email settings table (single-row)
CREATE TABLE IF NOT EXISTS public.email_settings (
  id int PRIMARY KEY DEFAULT 1,
  automation_enabled boolean NOT NULL DEFAULT false,
  template_order_received boolean NOT NULL DEFAULT false,
  template_order_confirmed boolean NOT NULL DEFAULT false,
  template_collection_reminder boolean NOT NULL DEFAULT false,
  from_address text NOT NULL DEFAULT 'orders@fergbutcher.com',
  reply_to_address text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed the single settings row
INSERT INTO public.email_settings (id) VALUES (1)
  ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;

-- email_log policies (anon + authenticated, intentionally shared)
DROP POLICY IF EXISTS "email_log_select_anon_auth" ON public.email_log;
CREATE POLICY "email_log_select_anon_auth" ON public.email_log
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "email_log_insert_anon_auth" ON public.email_log;
CREATE POLICY "email_log_insert_anon_auth" ON public.email_log
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "email_log_update_anon_auth" ON public.email_log;
CREATE POLICY "email_log_update_anon_auth" ON public.email_log
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "email_log_delete_anon_auth" ON public.email_log;
CREATE POLICY "email_log_delete_anon_auth" ON public.email_log
  FOR DELETE TO anon, authenticated USING (true);

-- email_settings policies (anon + authenticated, intentionally shared)
DROP POLICY IF EXISTS "email_settings_select_anon_auth" ON public.email_settings;
CREATE POLICY "email_settings_select_anon_auth" ON public.email_settings
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "email_settings_insert_anon_auth" ON public.email_settings;
CREATE POLICY "email_settings_insert_anon_auth" ON public.email_settings
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "email_settings_update_anon_auth" ON public.email_settings;
CREATE POLICY "email_settings_update_anon_auth" ON public.email_settings
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "email_settings_delete_anon_auth" ON public.email_settings;
CREATE POLICY "email_settings_delete_anon_auth" ON public.email_settings
  FOR DELETE TO anon, authenticated USING (true);
