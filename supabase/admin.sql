-- Run this in the Supabase SQL Editor (Project -> SQL Editor -> New query -> Run).
-- Safe to run again: uses IF NOT EXISTS / ON CONFLICT everywhere.
--
-- Without these tables, user profiles ("Perfiles"), login sessions, integration
-- API keys and sync logs are kept only in the API server's memory, which is wiped
-- on every restart and, in production on Vercel, on every serverless cold start.
-- That is why admin changes in those screens appeared to "not save".

create table if not exists public.app_users (
  id text primary key,
  name text not null,
  email text not null unique,
  password text not null,
  role text not null default 'viewer',
  created_by text references public.app_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  token text primary key,
  user_id text not null references public.app_users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.api_keys (
  id text primary key,
  name text not null,
  key text not null,
  provider text not null,
  status text not null default 'active',
  created date not null default current_date
);

create table if not exists public.sync_logs (
  id text primary key,
  timestamp timestamptz not null default now(),
  system text not null,
  status text not null,
  details text,
  nodes_updated integer not null default 0
);

-- Access control is enforced by the app's own admin session check (server-side),
-- not by Supabase Auth, so RLS is disabled here, same as org_nodes / work_centers.
alter table public.app_users disable row level security;
alter table public.sessions disable row level security;
alter table public.api_keys disable row level security;
alter table public.sync_logs disable row level security;

-- Seed the default admin login so you can still sign in after switching to Supabase.
-- IMPORTANT: change this password after your first login.
insert into public.app_users (id, name, email, password, role, created_by, created_at) values
  ('user-1', 'Administrador Principal', 'admin@empresa.com', 'admin123', 'admin', null, now())
on conflict (id) do nothing;

insert into public.api_keys (id, name, key, provider, status, created) values
  ('key-1', 'Workday Integration Key', 'org_live_wk982347x910283', 'Workday HR', 'active', '2026-01-15'),
  ('key-2', 'Factorial RRHH Webhook', 'org_live_fc102938475610', 'Factorial', 'active', '2026-03-10')
on conflict (id) do nothing;
