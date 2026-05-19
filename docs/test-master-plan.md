# Test Master Plan

This document defines the long-lived test strategy for the
`when-should-we-meet` project. Use it as the source of truth for which test
layers exist, what each layer proves, and how feature changes should update the
test suite.

## Goals

- Keep the mobile-width-only room flow stable from landing to sharing.
- Prefer automated checks for deterministic product behavior.
- Keep external SDK UI handoff and true device behaviors in manual smoke scope.
- Treat tests as product contracts, not as one-time implementation artifacts.

## Product Flows We Protect

- Landing load and room creation
- Invite-code join and deep-link room entry
- Nickname join and participant restoration
- Calendar selection, unavailable mode, weekday rules, and ranking updates
- Host-only actions such as participant removal and room deletion
- Sharing flows for invite code, room URL, ranking copy, and Kakao adapter calls
- Firestore-backed realtime synchronization and persistence after refresh

## Test Layers

### Unit Tests

Purpose:
- Prove deterministic utilities, route parsing, invite-code normalization, date
  calculations, ranking logic, and selection-mode transforms.

Rules:
- Add unit coverage when behavior is pure, branch-heavy, or easy to express as
  input/output.
- Keep these tests fast and environment-free.

Primary command:
- `npm run test:unit`

### Local E2E

Purpose:
- Prove the core single-client product flow without Firebase.
- Cover local fallback behavior, landing UX, room creation, join validation,
  clipboard flows, and Web Share API usage.

Rules:
- Use this layer for fast browser confidence on UI flow and accessibility
  selectors.
- Do not use this layer to prove Firestore persistence or realtime sync.

Primary command:
- `npm run test:e2e:local`

### Kakao Contract E2E

Purpose:
- Prove the app enters the Kakao sharing branch and calls the Kakao SDK adapter
  with the expected payload.

Rules:
- Mock `window.Kakao` and validate `init` plus `Share.sendDefault(...)`.
- Do not treat actual Kakao UI/app handoff as CI-owned behavior.

Primary command:
- `npm run test:e2e:kakao`

### Firebase Emulator E2E

Purpose:
- Prove Firestore-backed room flows, participant lifecycle, realtime sync,
  persistence after refresh, document cleanup, and listener resilience.

Rules:
- Use the emulator for deterministic multi-client flows.
- Keep these scenarios user-visible first, then add document assertions where
  the product risk justifies it.

Primary command:
- `npm run test:e2e:firebase`

### Manual Smoke

Purpose:
- Prove a release build is alive in a real browser/device context for the
  highest-risk flows that are hard to own in CI.

Scope:
- Real Kakao share UI or app handoff
- Final mobile device layout sanity
- Final deployment-domain share URLs
- Human-visible regressions that are not worth automating

Reference:
- `docs/manual-qa-checklist.md`

## Environment Strategy

### Local Fallback Environment

Use when:
- Validating UI and interaction flow without backend state

Notes:
- Firebase variables stay empty on purpose.
- Tests should not claim Firestore coverage in this mode.

### Firebase Emulator Environment

Use when:
- Validating realtime sync, persistence, participant documents, and deletion
  behavior

Notes:
- Requires JDK 21 for the Firestore emulator.
- This is the default automation target for backend-backed E2E.

### Real Browser Or Device Environment

Use when:
- Validating third-party UI handoff or release-domain behavior

Notes:
- This is manual smoke territory, not primary CI territory.

## Pull Request Requirements

- Every PR must explain what changed and why.
- Every PR must update tests in the same branch when user-visible behavior or
  state rules change.
- Every PR to `dev` must pass:
  - `quality`
  - `local-e2e`
  - `kakao-e2e`
  - `firebase-e2e`

## Ownership

### Feature Author

- Update or add tests in the same PR as the feature change.
- Update the change-specific test plan when user flow or product contract
  changes.
- Note any intentional test gaps or manual-only checks in the PR body.

### Reviewer Or QA Owner

- Check whether the changed flow is covered at the right layer.
- Reject brittle tests that only mirror implementation detail.
- Confirm legacy handling is documented when old and new flows differ.

## When To Update This Master Plan

Update this document only when the long-lived strategy changes, for example:

- a new test layer is introduced
- CI ownership changes
- an external integration moves between automated and manual scope
- release blocking criteria change

Do not edit this master plan for normal feature-level flow changes. Those belong
in a separate change-specific test plan.

## Change-Specific Test Plans

Use `docs/test-plan-template.md` whenever:

- a user flow changes
- a legacy flow is removed or temporarily kept
- a new risk area is introduced
- automation is added, removed, or moved between layers

The template records:
- previous flow
- new flow
- legacy handling
- automated scope
- manual smoke scope
- verification commands
- rollout or monitoring notes

## Current Commands

- `npm test`
- `npm run test:e2e:all`
- `npm run test:e2e:local`
- `npm run test:e2e:kakao`
- `npm run test:e2e:firebase`
- `npm run test:unit`
- `npm run lint`
- `npm run build`
