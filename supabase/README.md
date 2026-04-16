# Supabase Setup

This directory holds the Supabase-side assets for the project.

## Files
- `migrations/20260416000000_initial_schema.sql`: initial schema draft for rooms, participants, rules, and date overrides.

## Environment variables
Copy `.env.example` to `.env.local` and provide:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Planned usage
- frontend reads and writes room scheduling state directly through `@supabase/supabase-js`
- access control will be enforced through RLS policies
- realtime sync will be added with Supabase Realtime after the client flow is connected

## Current schema coverage
- `rooms`: room metadata and invite code
- `participants`: anonymous members restored by `client_key`
- `availability_rules`: selection mode and weekday rules
- `date_overrides`: explicit per-date overrides

## Current access pattern
- rooms are created directly from the client
- room lookup is expected to go through `get_room_by_invite_code()`
- participant restoration is expected to go through `restore_participant()`
- direct table access is constrained with RLS and scoped to the participant's room membership

## Follow-up work
- replace the current JWT-claim-based placeholder ownership model with the final anonymous access strategy
- add RPCs for room creation / participant join if direct client writes become too permissive
- add Realtime publication and client subscriptions for room-level sync
