# Test Plan Template

Use this template for feature-level or PR-level test planning whenever user
flows, persistence rules, or integration behavior change.

## 1. Metadata

- Feature or PR:
- Owner:
- Date:
- Related issue or spec:
- Related PR:
- Release target:

## 2. Change Summary

- What is changing?
- Why is it changing?
- Which user-facing behavior is affected?

## 3. Previous Flow

- Entry point:
- Main user steps:
- Expected result:

## 4. New Flow

- Entry point:
- Main user steps:
- Expected result:

## 5. Legacy Handling

- Is the previous flow removed, deprecated, or temporarily kept?
- If kept, until when?
- Which tests are updated, deleted, or run in parallel?
- Are any deep links, invite flows, or restore paths still supported?

## 6. Risk Assessment

- Highest user risk:
- Highest state-model risk:
- Highest integration risk:
- Known flaky area, if any:
- Assumptions:

## 7. Automated Test Scope

### Unit

- New tests:
- Updated tests:
- Not covered here:

### Local E2E

- New tests:
- Updated tests:
- Not covered here:

### Kakao Contract E2E

- New tests:
- Updated tests:
- Not covered here:

### Firebase Emulator E2E

- New tests:
- Updated tests:
- Not covered here:

## 8. Manual Smoke Scope

- Real device or browser checks:
- Third-party handoff checks:
- Visual or copy checks:
- Excluded manual scope:

## 9. Data And Environment Notes

- Required env vars:
- Emulator or backend dependency:
- Seed data or setup steps:
- Cleanup expectations:

## 10. Analytics Or Monitoring

- Which events or logs should be checked?
- Is there a rollout metric or failure indicator?
- What would indicate silent breakage after release?

## 11. Verification

- Commands run:
- Result:
- Remaining gap:

## 12. Sign-off

- Ready for review:
- Needs manual QA:
- Known follow-up:
