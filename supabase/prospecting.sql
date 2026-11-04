-- GMZ Prospecting Engine · CRM prospects
-- Run once in Supabase SQL Editor.
create table if not exists public.crm_prospects (
  user_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null default gen_random_uuid(),
  name text not null,
  business_type text not null default '',
  website text not null default '',
  email text not null default '',
  phone text not null default '',
  city text not null default '',
  source text not null default '',
  notes text not null default '',
  score integer not null default 0 check (score between 0 and 10),
  channel text not null default 'whatsapp' check (channel in ('whatsapp','email')),
  message text not null default '',
  status text not null default 'new' check (status in ('new','qualified','ready','opened','sent','replied','meeting','proposal','won','lost','do_not_contact')),
  contact_permission boolean not null default false,
  next_followup date,
  last_contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id,id)
);

create index if not exists crm_prospects_user_status_idx
  on public.crm_prospects(user_id,status,created_at desc);
create index if not exists crm_prospects_user_followup_idx
  on public.crm_prospects(user_id,next_followup)
  where next_followup is not null;

alter table public.crm_prospects enable row level security;
drop policy if exists "Users manage their own prospects" on public.crm_prospects;
create policy "Users manage their own prospects"
  on public.crm_prospects for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.crm_prospects to authenticated;
