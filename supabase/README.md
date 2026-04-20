# Supabase Setup

This directory holds the Supabase-side assets for the project.

## Files

- `migrations/20260416000000_initial_schema.sql`: initial schema for rooms, participants, rules, date overrides, RLS policies, and room join/restore RPCs.
- `migrations/20260419000000_add_room_snapshot_rpc.sql`: room snapshot RPC for hydrating room state from the client.
- `migrations/20260420000000_add_availability_write_rpcs.sql`: participant availability and date override write RPCs.

## Environment variables

Copy `.env.example` to `.env.local` and provide:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Only the anon key should be exposed to the frontend. Do not commit service role
keys, database passwords, production dumps, or user data exports.

## Intended client access pattern

- The frontend talks to Supabase through `@supabase/supabase-js`.
- Room creation currently uses direct `rooms` insert.
- Room lookup uses `get_room_by_invite_code()`.
- Participant join uses `join_room()`.
- Participant restoration uses `restore_participant()`.
- Room hydration uses `get_room_snapshot()`.
- Participant availability writes use `update_participant_availability()`.
- Participant date override writes use `set_participant_date_override()`.
- Direct table access for participant-owned state is intentionally disabled.
- Participant-owned write RPCs landed in PR #14, so Realtime work should observe and reconcile against these persisted writes.

## Current schema coverage

- `rooms`: room metadata and invite code
- `participants`: anonymous members restored by `client_key`
- `availability_rules`: selection mode and weekday rules
- `date_overrides`: explicit per-date overrides

## Applying migrations

Use the Supabase dashboard SQL editor or Supabase CLI, depending on the current
environment.

Dashboard flow:

1. Open the target Supabase project.
2. Run migration files in timestamp order.
3. Confirm all functions exist under `public`.
4. Confirm RLS is enabled for all public tables.

CLI flow:

Prerequisites:

```bash
supabase --version
supabase login
supabase projects list
```

If these commands fail, install the Supabase CLI and authenticate before using
the CLI migration flow. Use the dashboard flow instead when CLI access is not
available.

```bash
supabase link --project-ref <project-ref>
supabase db push
```

Do not run migrations against production until the PR that introduced them has
been reviewed and merged.

## Manual smoke test

After applying migrations and setting `.env.local`:

1. Create a room from the landing page.
2. Confirm the app navigates to `/room/:roomId`.
3. Enter a nickname and confirm the participant appears in the dashboard.
4. Copy the room URL, open it in a fresh browser profile, and confirm the room snapshot loads.
5. Join with a second nickname and confirm color assignment remains unique.
6. Refresh the first browser and confirm participant restoration still works.
7. Toggle selection mode, weekday rules, and an explicit date override.
8. Refresh the room and confirm those availability choices are restored from Supabase.

## Follow-up work

- Start Supabase Realtime synchronization from the persisted availability write path introduced in PR #14.
- Decide whether room creation should stay as a direct client insert or move behind an RPC.
- Add Realtime publication and client subscriptions for room-level sync.
