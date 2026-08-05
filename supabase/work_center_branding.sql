-- Run this once in the Supabase SQL Editor (Project -> SQL Editor -> New query -> Run).
-- Adds per-center branding: a logo shown on that center's org chart, and a custom
-- background (solid color and/or a tiled image) for its canvas. Safe to run again.

alter table public.work_centers add column if not exists logo text;
alter table public.work_centers add column if not exists background_color text;
alter table public.work_centers add column if not exists background_image text;
