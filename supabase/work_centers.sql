-- Run this in the Supabase SQL Editor (Project -> SQL Editor -> New query -> Run).
-- Safe to run again even if you already created this table before: uses
-- IF NOT EXISTS everywhere, so it only adds what's missing.
--
-- Stores work centers ("centros de trabajo"): their name (used to link org_nodes.sede)
-- plus their own profile info (address, contact, headcount, budget), independent of
-- the employees assigned to them. Centers that already have at least one employee are
-- still listed even without a row here, but won't have profile data until edited.

create table if not exists public.work_centers (
  name text primary key,
  address text not null default '',
  email text not null default '',
  phone text not null default '',
  headcount integer not null default 0,
  budget text not null default '',
  created_at timestamptz not null default now()
);

alter table public.work_centers add column if not exists address text not null default '';
alter table public.work_centers add column if not exists email text not null default '';
alter table public.work_centers add column if not exists phone text not null default '';
alter table public.work_centers add column if not exists headcount integer not null default 0;
alter table public.work_centers add column if not exists budget text not null default '';

-- Same reasoning as org_nodes: access control is enforced by the app's own admin
-- session check (server-side), not by Supabase Auth, so RLS is disabled here too.
alter table public.work_centers disable row level security;
