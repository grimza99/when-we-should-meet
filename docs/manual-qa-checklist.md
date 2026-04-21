# Manual QA Checklist

Use this checklist before moving a feature PR from draft to ready or before a
demo build. The app is mobile-width only, so run these checks in a narrow
viewport.

## Setup

- Start from a clean browser profile or clear local storage.
- Set the `VITE_FIREBASE_*` variables from `.env.example` when testing server-backed flows.
- Open two browser profiles or two devices for multi-participant checks.
- Keep one window on the landing page and one ready for a shared room URL.

## Landing And Room Creation

- The landing page shows the hero copy, room creation CTA, invite-code input, and info cards.
- Opening the create-room modal does not navigate away.
- Participant count accepts only 2 to 10.
- Preset ranges for this month and this year show a valid start/end range.
- Custom range rejects missing dates and start dates after end dates.
- Creating a valid room navigates to `/room/:roomId`.
- Failed room creation keeps the modal open and shows a useful message.

## Invite Code Join

- Invite-code input strips spaces, uppercases letters, and caps input at 6 characters.
- Empty invite-code submit is blocked.
- Invalid invite code shows a clear error.
- Valid invite code navigates to the room.
- Direct shared room URL loads the room snapshot instead of flashing the not-found screen.

## Nickname And Participants

- First room entry shows the nickname modal.
- Empty nickname submit is blocked.
- Successful nickname join adds the participant to the dashboard.
- Refreshing the same browser restores the same participant identity.
- A second browser can join with a different nickname and gets a different color.
- When the room is full, non-participants see the full-room message instead of the nickname modal.
- Existing participants can still view and edit a full room.

## Calendar Interaction

- Selecting possible dates adds the current participant color dot.
- Switching to unavailable mode changes the meaning of date clicks.
- Clicking the same date again removes that override.
- Weekday rules toggle on and off without clearing explicit date overrides.
- Dashboard rankings update after date changes.
- Calendar rank badges match the dashboard top dates.
- Month navigation stays within the room date range.

## Firebase And Realtime

- Room creation writes a `rooms/{roomId}` document and `inviteCodes/{inviteCode}` lookup document.
- Joining writes or restores a participant under `rooms/{roomId}/participants/{clientKey}`.
- Selection mode and weekday changes persist after refresh.
- Date overrides persist after refresh.
- Two open clients in the same room receive updated participant/ranking/calendar state after one client changes availability.
- Firestore listener failure does not lose the local saved change.

## Regression Sweep

- `npm run build` passes.
- `npm run lint` passes.
- No secret values are committed.
- All PRs target `dev`.
- PR review comments are recorded on GitHub.
