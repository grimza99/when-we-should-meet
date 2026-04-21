# Frontend Supabase Integration

This folder contains the frontend-side Supabase bootstrap and service helpers.

## Current scope

- `client.ts`: creates the typed Supabase client
- `database.types.ts`: app-local DB and RPC typings
- `services/roomService.ts`: room-oriented service helpers for room lifecycle, availability writes, snapshots, and Realtime

## Current service coverage

- create room
- find room by invite code
- join room through RPC
- restore participant through RPC
- hydrate a room snapshot through RPC
- update participant selection mode and weekday rules through RPC
- set or clear participant date overrides through RPC
- subscribe to room-level Realtime Broadcast events
- broadcast room-level change notifications after successful writes

## Notes

- The app still keeps a local optimistic state for immediate UI feedback.
- Supabase is the source of truth for room snapshots once configured.
- Realtime synchronization uses Broadcast events plus snapshot refresh rather than direct table reads.
- Direct table access for participant-owned state remains disabled by RLS; use RPC helpers instead.
