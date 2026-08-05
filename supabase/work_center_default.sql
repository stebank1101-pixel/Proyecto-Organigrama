-- Run this once in the Supabase SQL Editor (Project -> SQL Editor -> New query -> Run).
-- Adds the flag marking which single work center should open automatically when the
-- Organigrama tab loads, instead of the "Centros de trabajo" picker screen. Safe to run
-- again; defaults to false so existing rows keep their current (picker-first) behavior.

alter table public.work_centers add column if not exists is_default boolean not null default false;
