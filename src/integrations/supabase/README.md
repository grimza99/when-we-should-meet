# Frontend Supabase Integration

This folder contains the frontend-side Supabase bootstrap and service helpers.

## Current scope
- `client.ts`: creates the typed Supabase client
- `database.types.ts`: app-local DB and RPC typings
- `services/roomService.ts`: initial room-oriented service helpers

## Current service coverage
- create room
- find room by invite code
- join room through RPC
- restore participant through RPC

## Notes
- These services are intentionally introduced before the main app state is switched from local-only storage.
- A later PR should connect `useAppState` to these services behind a clear loading/error strategy.
