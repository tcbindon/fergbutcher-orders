/*
# Create backups table

1. Purpose
   Stores application backups (customers + orders) as JSON blobs in Supabase
   so they survive browser clears and are available across devices. Replaces
   the previous browser-localStorage backup strategy.

2. New Tables
   - `backups`
     - `id` (uuid, primary key)
     - `type` (text, 'manual' or 'automatic')
     - `data` (jsonb, full backup payload: { customers, orders, timestamp, version })
     - `created_at` (timestamptz, defaults to now())

3. Security
   - Enable RLS on `backups`.
   - This is a single-tenant app with no sign-in screen, so the frontend talks
     to Supabase via the anon key. Policies allow anon + authenticated full CRUD
     because the backup data is intentionally shared (no per-user isolation).

4. Notes
   - A 30-backup retention cap is enforced in the server function (deletes oldest
     beyond 30) to avoid unbounded growth.
   - The `data` column is jsonb so it can be queried if needed later.
*/

CREATE TABLE IF NOT EXISTS backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'manual',
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE backups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_backups" ON backups;
CREATE POLICY "anon_select_backups" ON backups FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_backups" ON backups;
CREATE POLICY "anon_insert_backups" ON backups
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_backups" ON backups;
CREATE POLICY "anon_update_backups" ON backups
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_backups" ON backups;
CREATE POLICY "anon_delete_backups" ON backups
  FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS backups_created_at_idx ON backups (created_at DESC);
