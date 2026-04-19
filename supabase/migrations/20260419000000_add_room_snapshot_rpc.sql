create or replace function public.get_room_snapshot(input_room_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with target_room as (
    select *
    from public.rooms
    where id = input_room_id
  )
  select case
    when exists (select 1 from target_room) then jsonb_build_object(
      'room',
      (select to_jsonb(target_room) from target_room),
      'participants',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', participant.id,
              'nickname', participant.nickname,
              'color_index', participant.color_index,
              'selection_mode', coalesce(rule.selection_mode, 'available'),
              'weekday_rules', coalesce(rule.weekday_rules, '{}'::integer[]),
              'overrides',
              coalesce(
                (
                  select jsonb_object_agg(
                    date_override.target_date::text,
                    date_override.status
                    order by date_override.target_date
                  )
                  from public.date_overrides as date_override
                  where date_override.participant_id = participant.id
                ),
                '{}'::jsonb
              )
            )
            order by participant.joined_at, participant.id
          )
          from public.participants as participant
          left join public.availability_rules as rule
            on rule.participant_id = participant.id
          where participant.room_id = input_room_id
        ),
        '[]'::jsonb
      )
    )
    else null
  end;
$$;

comment on function public.get_room_snapshot(uuid) is 'Return a room plus hydrated participants, rules, and date overrides for dashboard rendering.';
