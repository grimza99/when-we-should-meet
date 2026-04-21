# when should we meet?

Friends, family, and small groups can decide when to meet through a shared calendar without creating accounts. A host creates a room, shares an invite code or room link, and participants mark available or unavailable dates from a mobile-first calendar UI.

## Features

- Room creation from the landing page.
- Invite-code and shared-link room entry.
- Nickname modal for host and participants.
- Maximum participant count from 2 to 10.
- Date range presets for this month, this year, or a custom range.
- Available-date and unavailable-date selection modes.
- Weekday rules for repeated availability patterns.
- Dashboard ranking for the top meeting dates.
- Participant color dots on calendar dates.
- Local browser identity restore through localStorage.
- Firebase Firestore-backed room, participant, and availability state.
- Firestore realtime listeners for room snapshot synchronization.

## Tech Stack

- React
- TypeScript
- Vite
- Firebase Firestore

## Getting Started

```bash
npm install
npm run dev
```

For Firebase-backed flows, copy `.env.example` to `.env.local` and set:

```bash
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

If Firebase env variables are missing, the app falls back to localStorage-only behavior for development.

## Firebase

Firebase setup notes and Firestore rules live under [firebase](firebase).

Current Firestore model:

- `rooms/{roomId}` stores room metadata and participant count.
- `rooms/{roomId}/participants/{clientKey}` stores nickname, color, selection mode, weekday rules, and date overrides.
- `inviteCodes/{inviteCode}` maps a six-character invite code to a room id.

The current rules are MVP-oriented for a no-signup product. Before public launch, consider Firebase Anonymous Auth so Firestore rules can enforce stronger participant ownership.

## Quality Gates

```bash
npm run lint
npm run build
```

Use [docs/manual-qa-checklist.md](docs/manual-qa-checklist.md) before demo builds or ready-for-review PRs.
