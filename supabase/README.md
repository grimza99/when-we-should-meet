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
