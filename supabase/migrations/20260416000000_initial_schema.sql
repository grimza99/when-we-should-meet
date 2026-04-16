create extension if not exists "pgcrypto";

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  invite_code text not null unique,
  max_participants integer not null check (max_participants between 2 and 10),
  date_range_type text not null check (date_range_type in ('this_month', 'this_year', 'custom')),
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_date <= end_date)
);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  client_key text not null,
  nickname text not null,
  color_index integer not null check (color_index between 0 and 9),
  joined_at timestamptz not null default now(),
  unique (room_id, client_key)
);

create table if not exists public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  selection_mode text not null check (selection_mode in ('available', 'unavailable')),
  weekday_rules integer[] not null default '{}',
  updated_at timestamptz not null default now(),
  unique (participant_id)
);

create table if not exists public.date_overrides (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  target_date date not null,
  status text not null check (status in ('available', 'unavailable')),
  created_at timestamptz not null default now(),
  unique (participant_id, target_date)
);

create index if not exists idx_participants_room_id on public.participants(room_id);
create index if not exists idx_availability_rules_room_id on public.availability_rules(room_id);
create index if not exists idx_date_overrides_room_id on public.date_overrides(room_id);
create index if not exists idx_date_overrides_target_date on public.date_overrides(target_date);

alter table public.rooms enable row level security;
alter table public.participants enable row level security;
alter table public.availability_rules enable row level security;
alter table public.date_overrides enable row level security;

comment on table public.rooms is 'Scheduling rooms shared by invite code.';
comment on table public.participants is 'Anonymous room participants restored by client key.';
comment on table public.availability_rules is 'Per-participant selection mode and weekday rules.';
comment on table public.date_overrides is 'Per-date overrides layered on top of weekday rules.';
