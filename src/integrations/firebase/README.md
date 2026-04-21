# Frontend Firebase Integration

This folder contains the client-side Firebase bootstrap and Firestore service helpers.

## Files

- `client.ts`: initializes Firebase and exports the Firestore instance.
- `services/roomService.ts`: maps room creation, invite lookup, participant restore, availability writes, and realtime room snapshots to Firestore.

## Firestore Shape

- `rooms/{roomId}`: room metadata, date range, max participants, participant count.
- `rooms/{roomId}/participants/{clientKey}`: nickname, color, selection mode, weekday rules, and date overrides for one local browser identity.
- `inviteCodes/{inviteCode}`: lookup document that maps a six-character invite code to a room id.

The app still keeps a local fallback for development when Firebase env variables are not configured.
