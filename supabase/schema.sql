-- Gámez Desarrollo Web · CRM
-- Ejecutar en Supabase > SQL Editor después de crear el proyecto.
-- Cada usuario solo puede leer y modificar sus propios registros.

create table if not exists public.crm_projects (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  num integer not null,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null default now(),
  constraint crm_projects_pkey primary key (user_id, id),
  constraint crm_projects_user_num_key unique (user_id, num)
);

create index if not exists crm_projects_user_updated_idx
  on public.crm_projects (user_id, updated_at desc);

alter table public.crm_projects enable row level security;

drop policy if exists "Users manage their own CRM projects" on public.crm_projects;
create policy "Users manage their own CRM projects"
  on public.crm_projects
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.crm_meta (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value jsonb,
  updated_at timestamptz not null default now(),
  constraint crm_meta_pkey primary key (user_id, key)
);

alter table public.crm_meta enable row level security;

drop policy if exists "Users manage their own CRM metadata" on public.crm_meta;
create policy "Users manage their own CRM metadata"
  on public.crm_meta
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- No se concede acceso a anon. La app deberá autenticar al usuario
-- y utilizar la clave pública/publishable con estas políticas RLS.
