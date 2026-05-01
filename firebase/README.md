# Firebase Setup

This directory holds Firebase-side assets for the project.

## Firestore Data Model

- `rooms/{roomId}`
  - `inviteCode`
  - `maxParticipants`
  - `participantCount`
  - `dateRangeType`
  - `startDate`
  - `endDate`
  - `createdAt`
  - `expiresAt`
  - `hostClientKey`
  - `updatedAt`
- `rooms/{roomId}/participants/{clientKey}`
  - `clientKey`
  - `nickname`
  - `colorIndex`
  - `selectionMode`
  - `weekdayRules`
  - `overrides`
  - `joinedAt`
  - `updatedAt`
- `inviteCodes/{inviteCode}`
  - `roomId`
  - `createdAt`

## Client Environment

Copy `.env.example` to `.env.local` and fill the Firebase web app config values:

```bash
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_KAKAO_JAVASCRIPT_KEY=your-kakao-javascript-key
```

If these values are missing, the app keeps using the localStorage-only fallback for development.

If `VITE_KAKAO_JAVASCRIPT_KEY` is missing, room share falls back to Web Share API or clipboard instead of Kakao Talk Share.

If `VITE_FIREBASE_MEASUREMENT_ID` is set, the web app initializes Firebase Analytics and sends `page_view` events on route changes.

## Firestore Rules

Deploy `firestore.rules` through the Firebase console or Firebase CLI:

```bash
firebase deploy --only firestore:rules --project <firebase-project-id>
```

These rules are intentionally MVP-oriented because the product does not use visible signup/login yet. They validate the rough document shape, but they do not provide strong per-user ownership. Before public launch, prefer adding Firebase Anonymous Auth so rules can bind participant writes to `request.auth.uid`.

Room management is currently enforced by app logic with the room creator's local `clientKey` stored as `hostClientKey`. Firestore rules allow the required participant and room delete operations for this MVP shape, so this is not a strong security boundary. Move host-only actions behind Firebase Anonymous Auth or Cloud Functions before public abuse becomes a realistic risk.

## Manual Smoke Test

1. Create a Firebase project and enable Firestore.
2. Create a web app in Firebase project settings.
3. Copy the web app config values into `.env.local`.
4. Apply `firebase/firestore.rules`.
5. Run `npm run dev`.
6. Create a room and confirm a document appears under `rooms`.
7. Join from a second browser and confirm a participant document appears under `rooms/{roomId}/participants`.
8. Change selection mode, weekday rules, and date overrides.
9. Refresh both browsers and confirm the state is restored from Firestore.
10. Keep both browsers open and confirm room state updates through Firestore realtime listeners.
