# Firebase 가이드

이 문서는 `when-should-we-meet` 프로젝트에서 Firebase 관련 작업을 맡는
에이전트의 기준 문서다.

단순 설치 안내가 아니라, **사람과 에이전트가 모두 참고할 수 있는 Firebase 작업
브리핑 문서**로 사용한다.

<strong>버전 : </strong> v2

<strong>생성 날짜 : </strong> 2026-05-15

<strong>최신 업데이트 날짜 : </strong> 2026-05-19

## 이 문서를 먼저 봐야 하는 경우

- Firestore 데이터 구조를 확인해야 할 때
- Firebase 환경 변수를 맞출 때
- Firestore rules를 수정하거나 배포할 때
- 로컬 상태와 Firebase 상태의 책임 경계를 이해해야 할 때
- Firebase 관련 버그를 재현하거나 smoke test를 해야 할 때

## Firestore 데이터 모델

### `rooms/{roomId}`

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

### `rooms/{roomId}/participants/{clientKey}`

- `clientKey`
- `nickname`
- `colorIndex`
- `selectionMode`
- `weekdayRules`
- `overrides`
- `joinedAt`
- `updatedAt`

### `inviteCodes/{inviteCode}`

- `roomId`
- `createdAt`

## 클라이언트 환경 변수

`.env.example`를 복사해 `.env.local`을 만들고, Firebase 웹 앱 설정 값을 채운다.

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

### 주의

- `VITE_FIREBASE_MEASUREMENT_ID`는 공백 없이 작성해야 한다.
  - 예: `VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX`
- Firebase 환경 변수가 없으면 앱은 개발 편의를 위해 localStorage 기반 폴백으로
  동작한다.
- `VITE_KAKAO_JAVASCRIPT_KEY`가 없으면 방 공유는 Kakao 대신 Web Share API 또는
  clipboard fallback으로 동작한다.
- `VITE_FIREBASE_MEASUREMENT_ID`가 있으면 웹 앱은 Firebase Analytics를 초기화하고,
  route 변경 기준 `page_view`를 수집한다.

## Firestore Rules

Firestore rules는 Firebase Console 또는 Firebase CLI로 배포한다.

```bash
firebase deploy --only firestore:rules --project <firebase-project-id>
```

### 현재 rules 성격

- 사용자가 명시적으로 회원가입/로그인을 하지 않는 구조를 전제로 작성되어 있다.
- 문서 shape 검증과 기본적인 접근 제한은 하지만, 강한 사용자 소유권 보장을
  제공하지는 않는다.

### 현재 보안 한계

- 방 관리 권한은 앱 로직의 `hostClientKey`에 크게 의존한다.
- 즉, 현재 구조에서 host-only 액션은 **강한 보안 경계가 아니다**.
- 공개 서비스 단계로 가기 전에는 Firebase Anonymous Auth 또는 Cloud Functions로
  주요 관리 동작을 옮기는 것이 바람직하다.

## 에이전트 작업 규칙

Firebase 관련 작업을 하는 에이전트는 아래 원칙을 따른다.

- Firestore rules는 접근 정책의 일부이므로 Git에 포함해 관리한다.
- secrets, 실제 민감 환경 변수 값, 운영 데이터 dump는 커밋하지 않는다.
- 상태 버그를 볼 때는 로컬 optimistic update와 Firestore snapshot 병합 경로를
  함께 확인한다.
- Firebase 이슈를 `rules 문제`, `env 문제`, `상태 병합 문제`, `실시간 listener 문제`
  중 어디에 속하는지 먼저 분류한다.
- Analytics 이슈를 볼 때는 일반 이벤트 화면보다 `Realtime` 또는 `DebugView`를
  먼저 확인한다.

## Firebase 관련 자주 보는 체크포인트

### 1. 방 생성이 안 될 때

- `.env.local` 값이 올바른지
- Firestore rules가 최신인지
- `rooms` / `inviteCodes` write가 rules에 막히지 않는지

### 2. 참가자 상태가 실시간으로 안 맞을 때

- room listener가 반복 재구독되고 있지 않은지
- stale local state가 snapshot을 덮어쓰고 있지 않은지
- participant `overrides`, `weekdayRules`, `selectionMode`가 기대대로 저장되는지

### 3. Analytics 이벤트가 안 보일 때

- `VITE_FIREBASE_MEASUREMENT_ID` 값이 정확한지
- 공백 포함 오타가 없는지
- dev 서버를 measurement id 수정 후 재시작했는지
- Firebase Console의 `DebugView` 또는 `Realtime`에서 확인했는지

## 수동 Smoke Test

1. Firebase 프로젝트를 생성하고 Firestore를 활성화한다.
2. Firebase 프로젝트 설정에서 웹 앱을 만든다.
3. 웹 앱 설정 값을 `.env.local`에 넣는다.
4. `firebase/firestore.rules`를 적용한다.
5. `npm run dev`로 앱을 실행한다.
6. 방을 생성하고 `rooms` 컬렉션에 문서가 생기는지 확인한다.
7. 두 번째 브라우저에서 참여하고 `rooms/{roomId}/participants`에 참가자 문서가
   생기는지 확인한다.
8. 선택 모드, 요일 규칙, 날짜 override를 바꿔본다.
9. 새로고침 후 Firestore 상태가 복원되는지 확인한다.
10. 두 브라우저를 동시에 켜고 realtime listener로 상태가 갱신되는지 확인한다.

## 배포 전 체크

- production 환경에도 `VITE_FIREBASE_MEASUREMENT_ID`가 설정되어 있는지
- GitHub Actions secret에 measurement id가 등록되어 있는지
- rules를 수정했다면 Firebase에 실제 배포했는지
- Kakao / Firebase Analytics / Firestore가 각각 올바른 프로젝트를 바라보는지
