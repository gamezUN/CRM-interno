-- Gámez Desarrollo Web · CRM en Supabase
-- Ejecutar una sola vez en Supabase > SQL Editor.
-- Las tablas quedan protegidas por RLS y solo usuarios autenticados
-- pueden consultar o modificar sus propios registros.

create table if not exists public.crm_projects (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  num integer not null check (num > 0),
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
  on public.crm_projects for all to authenticated
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
  on public.crm_meta for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Consecutivo atómico por usuario: evita duplicados entre pestañas/dispositivos.
create table if not exists public.crm_counters (
  user_id uuid primary key references auth.users(id) on delete cascade,
  next_num integer not null default 1 check (next_num > 0)
);
alter table public.crm_counters enable row level security;
revoke all on public.crm_counters from anon, authenticated;

create or replace function public.allocate_crm_project_number()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare allocated integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  insert into public.crm_counters(user_id, next_num)
  values (auth.uid(), 2)
  on conflict (user_id)
  do update set next_num = public.crm_counters.next_num + 1
  returning next_num - 1 into allocated;
  return allocated;
end;
$$;

revoke all on function public.allocate_crm_project_number() from public, anon;
grant execute on function public.allocate_crm_project_number() to authenticated;

-- La aplicación solo necesita permisos de cliente autenticado.
grant select, insert, update, delete on public.crm_projects to authenticated;
grant select, insert, update, delete on public.crm_meta to authenticated;
