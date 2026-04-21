# Merge-Blocked Work Notes

This document tracks work that should not start from `dev` until a specific PR
has merged. Use it to resume follow-up work without losing context.

## Current Status

No merge-blocked follow-up work is currently recorded.

## Completed Items

### PR #14 -> Realtime Synchronization

- Completed work: Supabase Realtime room synchronization.
- Original blocker: [#14 persist availability changes to supabase](https://github.com/grimza99/when-we-should-meet/pull/14)
- Follow-up completed by: [#21 sync room snapshots over realtime](https://github.com/grimza99/when-we-should-meet/pull/21)
- Result: room pages subscribe to room-level Broadcast events, then refresh the room snapshot after participant or availability changes.
