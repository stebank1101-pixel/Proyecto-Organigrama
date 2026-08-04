-- Run this once in the Supabase SQL Editor (Project -> SQL Editor -> New query -> Run).
-- Adds a column to store a custom uploaded icon/logo per work center (as a data URI
-- or image URL). Safe to run again.

alter table public.work_centers add column if not exists icon text;
