# When Should We Meet

가입 없이 친구, 가족, 지인과 만날 날짜를 달력에서 가볍게 조율하는 공유 일정 앱입니다.

## Product Goal

메신저에서 "나는 8일, 10일 가능해. 너는?"처럼 텍스트로 날짜를 맞추는 흐름을 모바일 달력 UI로 바꿉니다. 참가자는 초대 코드나 링크로 방에 들어가 닉네임만 입력하고 가능한 날짜를 선택합니다. 방 화면은 상단 대시보드에서 상위 날짜를 보여주고, 캘린더에는 참가자별 색상 dot과 랭킹 정보를 표시합니다.

## Current MVP Scope

- 랜딩 페이지에서 방 생성
- 초대 코드로 방 참여
- 방 생성/참여 후 닉네임 입력
- 가능한 날짜/불가능한 날짜 선택 모드
- 요일 일괄 규칙과 날짜별 override
- 대시보드 랭킹 1~3위
- 참가자별 컬러 표시
- Supabase 기반 방/참가자/선택 상태 저장
- Supabase Realtime Broadcast 기반 room snapshot 동기화
- 모바일 폭 중심 UI

## Tech Stack

- React
- TypeScript
- Vite
- Supabase
- Plain CSS

## Getting Started

```bash
npm install
npm run dev
```

<<<<<<< HEAD
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

# Use [docs/manual-qa-checklist.md](docs/manual-qa-checklist.md) before demo builds or ready-for-review PRs.

For Supabase-backed flows, copy `.env.example` to `.env.local` and set:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Without these variables, the app keeps the local fallback behavior where possible.

## Validation

```bash
npm run build
npm run lint
```

For manual checks, use [docs/manual-qa-checklist.md](docs/manual-qa-checklist.md).

## Supabase

Supabase migrations and setup notes live under [supabase](supabase).

Important access rules:

- The frontend uses the anon key only.
- Participant-owned state is accessed through RPCs.
- Direct reads/writes for participant-owned tables are intentionally disabled by RLS.
- Room synchronization uses Realtime Broadcast events followed by `get_room_snapshot()`.

## Engineering Workflow

Working rules are documented in [docs/engineering-workflow.md](docs/engineering-workflow.md).

Default branch flow:

- Start work from `dev`.
- Use `codex/` branch names.
- Open draft PRs to `dev`.
- Record PR review comments on GitHub.
- Keep merge-blocked follow-up work in [docs/blocked-work.md](docs/blocked-work.md).
  > > > > > > > b993fc05fda8b857f02ba72c1f1a6ca7b44cdef4
