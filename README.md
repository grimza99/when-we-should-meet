# 도대체 우리 언제 만나

<strong>버전 : </strong> v2

<strong>생성 날짜 : </strong> 2026-04-15

<strong>최신 업데이트 날짜 : </strong> 2026-05-20

가입 없이 친구, 가족, 지인과 만날 날짜를 달력에서 가볍게 조율하는 공유 일정 앱입니다.

## 제품 목표

- 메신저상에서 날짜를 맞추는 흐름을 모바일 달력 UI로 전환합니다.
- 참가자는 초대 코드나 링크로 방에 들어가 가능한 날짜를 선택합니다. 방 화면은 상단
- 대시보드에서 상위 날짜를 보여주고, 캘린더에는 참가자별 색상 dot를 표시합니다.

## 주요 기능

- 랜딩 페이지에서 방 생성 , 초대 코드/카카오 톡 공유로 방 참여
- 방 생성/참여 후 닉네임 입력 , 참가자별 컬러 표시
- 가능한 날짜/불가능한 날짜 선택 모드 , 요일 일괄 규칙과 날짜별 override
- 대시보드 랭킹 1~3위
- Firebase Firestore 기반 방/참가자/선택 상태 저장
- Firestore realtime listener 기반 room snapshot 동기화
- 방장 기반 참가자 제거 / 방삭제
- 모바일 폭 중심 UI

## 기술 스택

- React
- TypeScript
- Vite
- Firebase Firestore
- Plain CSS

## 시작하기

### command

```bash
npm install
npm run dev
```

### `env.example`

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

- Firebase 환경 변수가 없으면 개발 중에는 localStorage 기반 폴백 모드로 동작합니다.

- `VITE_KAKAO_JAVASCRIPT_KEY`가 없으면 방 공유는 Kakao Talk Share 대신 브라우저 공유 시트 또는 clipboard fallback으로 동작합니다.

- `VITE_FIREBASE_MEASUREMENT_ID`가 있으면 route 변경 시 Firebase Analytics `page_view` 이벤트가 자동 수집됩니다.

## Firebase

### docs

<strong>Firebase 설정, Firestore rules 관련 문서 : </strong> [skills/firebase/firebase-agent-briefing.md](skills/firebase/firebase-agent-briefing.md)

### firestore 모델

- `rooms/{roomId}`: 방 메타데이터, 참가자 수, host client key, 만료 시각 저장
- `rooms/{roomId}/participants/{clientKey}`: 닉네임, 색상, 선택 모드, 요일 규칙, 날짜 override 저장
- `inviteCodes/{inviteCode}`: 6자리 초대 코드를 room id에 매핑

현재 rules는 무가입 제품을 전제로 한 설계입니다. 방장 액션은 `hostClientKey` 기반 앱 로직으로 제어되지만, 강한 보안 경계는 아닙니다. 공개 서비스 단계로 가기 전에는 Firebase Anonymous Auth 또는 Cloud Functions 기반 권한 제어를 고려중입니다.

## 카카오톡 공유

방 페이지에서 Kakao 링크 공유를 활성화하려면 아래를 확인합니다.

1. `.env.local`에 `VITE_KAKAO_JAVASCRIPT_KEY`를 설정합니다.
2. Kakao Developers의 JavaScript SDK 도메인에 웹 도메인을 등록합니다.
3. 같은 웹 도메인을 Product Link에도 등록해 공유 버튼이 room URL을 열 수 있게 합니다.

## 검증

### 기본 검증

```bash
npm run lint
npm run build
```

데모 빌드 확인이나 `ready for review` 직전 점검에는 [skills/qa/manual-smoke-checklist.md](skills/qa/manual-smoke-checklist.md)를 사용합니다.

## 엔지니어링 워크플로우

작업 규칙은 [skills/common/engineering-workflow.md](skills/common/engineering-workflow.md)에 정리되어 있습니다.

기본 브랜치 흐름:

- 작업은 `dev`에서 시작합니다.
- 브랜치 이름은 `codex/` prefix를 사용합니다.
- PR은 기본적으로 `dev` 대상으로 draft로 엽니다.
- PR 리뷰 코멘트는 GitHub에 기록합니다.

## AGENTS

전역 `AGENTS.md`,`skills`와 로컬 `AGENTS.md`,`skills`를 함께 사용합니다.
각 `AGENTS.md`는 공통 작업 습관, 기능별 하위 문서 진입점을 담당합니다.

### 전역 AGENTS.md

개요

1. 공통 작업 원칙

- 모든 프로젝트에 공통으로 적용하는 기본 작업 태도와 검증 원칙을 정의합니다.

2. Open Question / Decision Check

- 개발 착수 전 확인이 필요한 질문 형식과 의사결정 형식문서의 링크를 안내합니다.

3. PR / Code Review

- 브랜치, 커밋, PR 작성, 리뷰 기록에 대한 공통 흐름 문서의 링크를 안내합니다.

### 전역 skills

1.  `global-codex-open-question-template.md`

- 열린 질문을 짧게 정리해 사용자에게 확인할 때 사용합니다.
-

2.  `global-codex-decision-check-template.md`

- 선택지와 추천안을 함께 제시해야 할 때 사용합니다.

3. `global-codex-pr-briefing.md`

- PR 발행 전후 기본 흐름을 확인할 때 사용합니다.

4. `global-codex-code-review`

- 리뷰 시 blocker, 회귀, 누락 테스트를 점검할 때 사용합니다.

### 로컬 AGENTS.md (해당 레포 전용 규칙)

> 이 레포의 로컬 `AGENTS.md`는 단순히 레포 전용 규칙 문서뿐 아니라, 하위 에이전트가 담당 역할에 맞는 세부 문서로 들어가기 위한 진입점 역할을 합니다.

- 모바일 폭 중심 UX, Firebase 구조, Notion 문서화 규칙 등 이 레포에만 적용되는 기준을 정의
- 역할별 진입점 :
  하위 에이전트가 자신의 담당 역할에 따라 어떤 로컬 문서를 읽어야 하는지 안내합니다.

### 로컬 skills (해당 레포 전용 skills)

#### common

- 이 프로젝트의 공통 개발 흐름과 작업 절차를 정의합니다.

#### qa

테스트 전략, 수동 QA 체크리스트, 테스트 플랜 기준을 제공합니다.

#### review

이 프로젝트 PR 리뷰 시 확인해야 할 포인트를 제공합니다.

#### docs

업무일지, 일반 문서화, 기록 작성 방식을 정의합니다.

#### firebase

Firestore rules, env, realtime, analytics 관련 점검 기준을 제공합니다.

#### deploy

Firebase Hosting 배포 절차와 배포 전 확인 사항을 제공합니다.
