-- Run this in the Supabase SQL Editor (Project -> SQL Editor -> New query -> Run).
-- Safe to run again even if you already created this table before: uses
-- IF NOT EXISTS everywhere, so it only adds what's missing.
--
-- Stores the phone directory ("Directorio telefónico") contacts shown in the
-- "Directorio" tab: one row per contact, grouped by sede/área on the client.
-- Independent of org_nodes / work_centers — a contact isn't tied to the org chart.

create table if not exists public.directory_contacts (
  id text primary key,
  sede text not null default '',
  area text not null default '',
  name text not null default '',
  phone text not null default '',
  email text not null default '',
  created_at timestamptz not null default now()
);

-- Same reasoning as org_nodes / work_centers: access control is enforced by the app's
-- own admin session check (server-side), not by Supabase Auth, so RLS is disabled here too.
alter table public.directory_contacts disable row level security;
