-- Run this in the Supabase SQL Editor (Project -> SQL Editor -> New query -> Run).
-- Safe to run again even if you already created this table before: uses
-- IF NOT EXISTS everywhere, so it only adds what's missing.
--
-- Stores the "Usuarios CHEC" reference sheet: logins for third-party government/health/
-- payroll platforms (SIRE, EPS providers, cajas de compensación, etc.), shown in the
-- "Usuarios CHEC" tab. Independent of app_users — these are NOT login accounts for this
-- app, just a reference list of external credentials.

create table if not exists public.platform_credentials (
  id text primary key,
  empresa text not null default '',
  tipo_id text not null default '',
  usuario text not null default '',
  clave text not null default '',
  objetivo text not null default '',
  link text not null default '',
  created_at timestamptz not null default now()
);

-- Same reasoning as the other tables: access control is enforced by the app's own
-- session check (server-side: requireAuth for reads, requireAdmin for writes), not by
-- Supabase Auth, so RLS is disabled here too.
alter table public.platform_credentials disable row level security;
