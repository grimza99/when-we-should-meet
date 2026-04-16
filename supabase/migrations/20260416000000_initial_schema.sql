create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

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
  updated_at timestamptz not null default now(),
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
  updated_at timestamptz not null default now(),
  unique (participant_id, target_date)
);

create index if not exists idx_participants_room_id on public.participants(room_id);
create index if not exists idx_availability_rules_room_id on public.availability_rules(room_id);
create index if not exists idx_date_overrides_room_id on public.date_overrides(room_id);
create index if not exists idx_date_overrides_target_date on public.date_overrides(target_date);
create index if not exists idx_rooms_invite_code on public.rooms(invite_code);
create index if not exists idx_participants_client_key on public.participants(client_key);

drop trigger if exists set_rooms_updated_at on public.rooms;
create trigger set_rooms_updated_at
before update on public.rooms
for each row
execute function public.set_updated_at();

drop trigger if exists set_participants_updated_at on public.participants;
create trigger set_participants_updated_at
before update on public.participants
for each row
execute function public.set_updated_at();

drop trigger if exists set_availability_rules_updated_at on public.availability_rules;
create trigger set_availability_rules_updated_at
before update on public.availability_rules
for each row
execute function public.set_updated_at();

drop trigger if exists set_date_overrides_updated_at on public.date_overrides;
create trigger set_date_overrides_updated_at
before update on public.date_overrides
for each row
execute function public.set_updated_at();

alter table public.rooms enable row level security;
alter table public.participants enable row level security;
alter table public.availability_rules enable row level security;
alter table public.date_overrides enable row level security;

create or replace function public.get_room_by_invite_code(input_invite_code text)
returns setof public.rooms
language sql
security definer
set search_path = public
as $$
  select *
  from public.rooms
  where invite_code = upper(trim(input_invite_code));
$$;

create or replace function public.join_room(
  input_room_id uuid,
  input_client_key text,
  input_nickname text
)
returns public.participants
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_participant public.participants;
  target_room public.rooms;
  next_color_index integer;
  created_participant public.participants;
begin
  select *
  into target_room
  from public.rooms
  where id = input_room_id;

  if not found then
    raise exception 'ROOM_NOT_FOUND';
  end if;

  select *
  into existing_participant
  from public.participants
  where room_id = input_room_id
    and client_key = input_client_key
  limit 1;

  if found then
    update public.participants
    set nickname = input_nickname
    where id = existing_participant.id
    returning * into created_participant;

    return created_participant;
  end if;

  if (
    select count(*)
    from public.participants
    where room_id = input_room_id
  ) >= target_room.max_participants then
    raise exception 'ROOM_CAPACITY_REACHED';
  end if;

  select color_index
  into next_color_index
  from generate_series(0, 9) as generated_color(color_index)
  where not exists (
    select 1
    from public.participants
    where room_id = input_room_id
      and participants.color_index = generated_color.color_index
  )
  order by generated_color.color_index
  limit 1;

  if next_color_index is null then
    raise exception 'COLOR_INDEX_UNAVAILABLE';
  end if;

  insert into public.participants (
    room_id,
    client_key,
    nickname,
    color_index
  )
  values (
    input_room_id,
    input_client_key,
    input_nickname,
    next_color_index
  )
  returning * into created_participant;

  insert into public.availability_rules (
    room_id,
    participant_id,
    selection_mode,
    weekday_rules
  )
  values (
    input_room_id,
    created_participant.id,
    'available',
    '{}'
  )
  on conflict (participant_id) do nothing;

  return created_participant;
end;
$$;

create or replace function public.restore_participant(
  input_room_id uuid,
  input_client_key text
)
returns setof public.participants
language sql
security definer
set search_path = public
as $$
  select *
  from public.participants
  where room_id = input_room_id
    and client_key = input_client_key
  limit 1;
$$;

drop policy if exists "rooms are readable by invite code rpc only" on public.rooms;
create policy "rooms are readable by invite code rpc only"
on public.rooms
for select
using (false);

drop policy if exists "clients can insert rooms" on public.rooms;
create policy "clients can insert rooms"
on public.rooms
for insert
with check (true);

drop policy if exists "participants can read their room" on public.participants;
create policy "participants direct reads are disabled" 
on public.participants
for select
using (false);

drop policy if exists "clients can create their participant row" on public.participants;
create policy "participants direct insert is disabled"
on public.participants
for insert
with check (false);

drop policy if exists "clients can update their participant row" on public.participants;
create policy "participants direct update is disabled"
on public.participants
for update
using (false)
with check (false);

drop policy if exists "participants can read room rules" on public.availability_rules;
create policy "availability_rules direct reads are disabled"
on public.availability_rules
for select
using (false);

drop policy if exists "participants can manage their own rules" on public.availability_rules;
create policy "availability_rules direct insert is disabled"
on public.availability_rules
for insert
with check (false);

create policy "availability_rules direct update is disabled"
on public.availability_rules
for update
using (false)
with check (false);

create policy "availability_rules direct delete is disabled"
on public.availability_rules
for delete
using (false);

drop policy if exists "participants can read room date overrides" on public.date_overrides;
create policy "date_overrides direct reads are disabled"
on public.date_overrides
for select
using (false);

drop policy if exists "participants can manage their own date overrides" on public.date_overrides;
create policy "date_overrides direct insert is disabled"
on public.date_overrides
for insert
with check (false);

create policy "date_overrides direct update is disabled"
on public.date_overrides
for update
using (false)
with check (false);

create policy "date_overrides direct delete is disabled"
on public.date_overrides
for delete
using (false);

comment on table public.rooms is 'Scheduling rooms shared by invite code.';
comment on table public.participants is 'Anonymous room participants restored by client key.';
comment on table public.availability_rules is 'Per-participant selection mode and weekday rules.';
comment on table public.date_overrides is 'Per-date overrides layered on top of weekday rules.';
comment on function public.get_room_by_invite_code is 'Lookup a room by public invite code without opening full table reads.';
comment on function public.join_room is 'Join a room by client_key while enforcing room capacity and color allocation.';
comment on function public.restore_participant is 'Restore an anonymous participant by room and client key.';
