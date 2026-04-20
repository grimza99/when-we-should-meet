# Merge-Blocked Work Notes

This document tracks work that should not start from `dev` until a specific PR
has merged. Use it to resume follow-up work without losing context.

## Completed: PR #14

- Blocked work: Supabase Realtime room synchronization.
- Required merge: [#14 persist availability changes to supabase](https://github.com/grimza99/when-we-should-meet/pull/14)
- Status: unblocked after PR #14 merged. Follow-up is being implemented in the Realtime synchronization PR.
- Reason: Realtime should subscribe to the persisted availability state. PR #14
  adds the RPC write path for selection mode, weekday rules, and date overrides,
  so wiring Realtime before that merge would either duplicate work or subscribe
  to state that is still local-only on `dev`.
- Resume after merge:
  - Add room-level Realtime subscription setup in the Supabase service layer.
  - Refresh or patch room snapshots when participant/rule/override changes arrive.
  - Keep local optimistic updates, but reconcile them with server events.
  - Review whether subscription cleanup is safe on route changes.
