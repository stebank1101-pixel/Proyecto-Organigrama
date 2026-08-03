-- Run this once in the Supabase SQL Editor (Project -> SQL Editor -> New query -> Run).
-- Creates the table the app uses to persist org chart nodes, and seeds it with the
-- default demo data so the app looks the same as it did with the in-memory store.

create table if not exists public.org_nodes (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Access control is enforced by the app's own admin session check (server-side),
-- not by Supabase Auth, so RLS is disabled for this table.
alter table public.org_nodes disable row level security;

insert into public.org_nodes (id, data) values
  ('node-1', '{"id":"node-1","name":"Dra. Carolina Alarcón","title":"Chief Executive Officer (CEO)","department":"Dirección General","sede":"Madrid - Sede Central","email":"carolina.alarcon@empresa.com","phone":"+34 912 345 678","avatar":"https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80","roleType":"executive","parentId":null,"freeX":450,"freeY":60,"metrics":{"headcount":42,"budget":"€2.8M"},"status":"active","customBadge":"Comité Ejecutivo","iconName":"Crown","assignees":[]}'),
  ('node-2', '{"id":"node-2","name":"Ing. Roberto Benítez","title":"VP de Tecnología e Innovación","department":"Tecnología","sede":"Madrid - Sede Central","email":"roberto.benitez@empresa.com","phone":"+34 912 345 679","avatar":"https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80","roleType":"director","parentId":"node-1","freeX":180,"freeY":220,"metrics":{"headcount":18,"budget":"€1.1M"},"status":"active","customBadge":"Tech Core","iconName":"Cpu","assignees":[]}'),
  ('node-3', '{"id":"node-3","name":"Lic. Mariana Valenzuela","title":"Director Global de Recursos Humanos","department":"Recursos Humanos","sede":"CDMX - Tech Hub","email":"mariana.valenzuela@empresa.com","phone":"+52 55 1234 5678","avatar":"https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80","roleType":"director","parentId":"node-1","freeX":450,"freeY":220,"metrics":{"headcount":12,"budget":"€650K"},"status":"active","customBadge":"Talent & Culture","iconName":"Users","assignees":[]}'),
  ('node-4', '{"id":"node-4","name":"Mtr. Fernando Sotomayor","title":"Chief Financial Officer (CFO)","department":"Finanzas y Riesgos","sede":"Bogotá - Sede Regional","email":"fernando.sotomayor@empresa.com","phone":"+57 1 987 6543","avatar":"https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80","roleType":"executive","parentId":"node-1","freeX":720,"freeY":220,"metrics":{"headcount":8,"budget":"€850K"},"status":"active","customBadge":"Compliance & Finance","iconName":"Briefcase","assignees":[]}'),
  ('node-5', '{"id":"node-5","name":"Ing. Sofía Morales","title":"Lead Systems Architect","department":"Tecnología","sede":"CDMX - Tech Hub","email":"sofia.morales@empresa.com","phone":"+52 55 9876 5432","avatar":"https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80","roleType":"manager","parentId":"node-2","freeX":80,"freeY":390,"metrics":{"headcount":6,"budget":"€320K"},"status":"active","customBadge":"Cloud Infrastructure","iconName":"Server","assignees":[]}'),
  ('node-6', '{"id":"node-6","name":"Carlos Eduardo Paez","title":"Head of Product Design & UX","department":"Producto","sede":"Remote / Global","email":"carlos.paez@empresa.com","phone":"+34 600 112 233","avatar":"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80","roleType":"manager","parentId":"node-2","freeX":280,"freeY":390,"metrics":{"headcount":5,"budget":"€280K"},"status":"active","customBadge":"Design System Lead","iconName":"Palette","assignees":[]}')
on conflict (id) do nothing;
