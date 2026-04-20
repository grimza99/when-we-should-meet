create or replace function public.update_participant_availability(
  input_room_id uuid,
  input_participant_id uuid,
  input_client_key text,
  input_selection_mode text,
  input_weekday_rules integer[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_participant public.participants;
  sanitized_weekday_rules integer[];
begin
  select *
  into target_participant
  from public.participants
  where id = input_participant_id
    and room_id = input_room_id
    and client_key = input_client_key;

  if not found then
    raise exception 'PARTICIPANT_NOT_FOUND';
  end if;

  if input_selection_mode not in ('available', 'unavailable') then
    raise exception 'INVALID_SELECTION_MODE';
  end if;

  select coalesce(array_agg(distinct weekday order by weekday), '{}'::integer[])
  into sanitized_weekday_rules
  from unnest(coalesce(input_weekday_rules, '{}'::integer[])) as weekday
  where weekday between 0 and 6;

  if cardinality(sanitized_weekday_rules) <> cardinality(coalesce(input_weekday_rules, '{}'::integer[])) then
    raise exception 'INVALID_WEEKDAY_RULES';
  end if;

  insert into public.availability_rules (
    room_id,
    participant_id,
    selection_mode,
    weekday_rules
  )
  values (
    input_room_id,
    input_participant_id,
    input_selection_mode,
    sanitized_weekday_rules
  )
  on conflict (participant_id) do update
  set
    selection_mode = excluded.selection_mode,
    weekday_rules = excluded.weekday_rules;

  return jsonb_build_object(
    'participant_id', input_participant_id,
    'selection_mode', input_selection_mode,
    'weekday_rules', sanitized_weekday_rules
  );
end;
$$;

create or replace function public.set_participant_date_override(
  input_room_id uuid,
  input_participant_id uuid,
  input_client_key text,
  input_target_date date,
  input_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_participant public.participants;
  target_room public.rooms;
begin
  select *
  into target_participant
  from public.participants
  where id = input_participant_id
    and room_id = input_room_id
    and client_key = input_client_key;

  if not found then
    raise exception 'PARTICIPANT_NOT_FOUND';
  end if;

  select *
  into target_room
  from public.rooms
  where id = input_room_id;

  if not found then
    raise exception 'ROOM_NOT_FOUND';
  end if;

  if input_target_date < target_room.start_date or input_target_date > target_room.end_date then
    raise exception 'DATE_OUT_OF_RANGE';
  end if;

  if input_status is null then
    delete from public.date_overrides
    where room_id = input_room_id
      and participant_id = input_participant_id
      and target_date = input_target_date;

    return jsonb_build_object(
      'participant_id', input_participant_id,
      'target_date', input_target_date,
      'status', null
    );
  end if;

  if input_status not in ('available', 'unavailable') then
    raise exception 'INVALID_OVERRIDE_STATUS';
  end if;

  insert into public.date_overrides (
    room_id,
    participant_id,
    target_date,
    status
  )
  values (
    input_room_id,
    input_participant_id,
    input_target_date,
    input_status
  )
  on conflict (participant_id, target_date) do update
  set status = excluded.status;

  return jsonb_build_object(
    'participant_id', input_participant_id,
    'target_date', input_target_date,
    'status', input_status
  );
end;
$$;

comment on function public.update_participant_availability is 'Update a participant selection mode and weekday rules after validating the anonymous client key.';
comment on function public.set_participant_date_override is 'Upsert or remove a participant date override after validating the anonymous client key.';
