# AGENTS

이 문서는 `when-should-we-meet` 레포에서 작업하는 에이전트의 공통 규칙, 세부 절차,
역할별 참고 문서, 상세 내용 문서 진입점을 정의한다.

<strong>버전 : </strong> v2

<strong>생성 날짜 : </strong> 2026-05-19

<strong>최신 업데이트 날짜 : </strong> 2026-05-20

## 프로젝트 기본 원칙

- 제품 성격: 모바일 폭 전용 일정 조율 서비스
- 핵심 플로우: 랜딩 -> 방 생성/참여 -> 닉네임 입력 -> 달력 선택 -> 랭킹 ->
  공유
- 백엔드 구조: Firebase / Firestore 클라이언트 직접 접근
- 구현 우선순위: 사용자 가시 버그, 상태 모델 안정성, 모바일 UX 일관성

## 검증 규칙

- 기본 검증은 `npm run lint`와 `npm run build`다.

## 문서화 규칙

- 사용자가 회의록, 착수 문서, 기획안, 설계 등에 대한 특정 내용을 담은 Notion 페이지 생성을 요청하면, 프로젝트에서 합의된 Notion 루트 아래 하위 페이지로 만든다.
- 노션 페이지는 사용자의 이해도를 높이기 위한 문서화 이기 때문에 들여쓰기, 줄바꿈, 구분선, 등을 충분히 활용하여 가독성을 최우선으로 만들고, 복잡한 내용의 경우 html 파일을 생성하여 첨부 한다.

## 역할별 진입 문서

- 각 에이전트들은 역할에 따라 작업전에 아래 문서를 읽는다.
- 프로젝트 진행중 해당 md 파일의 업데이트가 필요한경우, 에이전트는 사용자에게 변경전, 변경 예정 내용을 설명하고 승인을 받은뒤 수정한다.
- 사용자의 승인후 지침에 따라 md파일을 수정할시, 최신 업데이트 날짜와 버전 명시를 수정한다.
- 필요한 경우 md 파일 가장 하단에 수정 로그를 작성하며, 수정 내용, 날짜와 이유를 개요로 작성한다.

### 공통

<strong>개발 착수 전 </strong>

- 작업 전에 `skills/common/engineering-workflow.md` 해당 문서를 읽는다.

### QA 담당자

- 테스트 전략, QA 범위, 변경별 테스트 플랜은 `skills/qa` 디렉토리 하위 문서를 우선 기준으로
  삼는다.
- 기능 변경의 자동화 범위와 수동 검증 범위를 나누어 판단할 때 읽는다.
- 실제 디바이스, 실제 카카오 공유, 배포 환경 기준 수동 확인이 필요할 때 읽는다.

- `skills/qa/qa-agent-briefing.md`
- `skills/qa/test-master-plan.md`
- 필요 시 `skills/qa/test-plan-template.md`
- `skills/qa/manual-smoke-checklist.md`

### 코드 리뷰 담당자

- PR 리뷰, merge blocker 점검, 회귀 위험 평가를 할 때 읽는다.
- `skills/review/review-agent-briefing.md`

### 일반 문서 / 기록 담당자

- 사용자의 지시에 따라 기획안, 설계 문서, 회의 정리, 진행 요약 등 일반 문서화 작업 전에 읽는다.
- 사용자의 이해도를 높이는 구조와 정리 방식이 필요할 때 읽는다.

- `skills/docs/documentation-agent-briefing.md`

### 자동화 규칙 업무일지 문서 담당자

- 자동화된 업무일지 작성, 날짜별 진행 요약 문서를 만들 때 읽는다.
- `skills/docs/auto-worklog-agent.md`

### 배포 담당자

- production 배포 절차, GitHub Actions secret, Firebase Hosting 배포 흐름을 확인할 때 읽는다.
- `skills/deploy/firebase-hosting-deployment.md`

### Firebase 담당자

- Firestore 구조, Firebase 환경 변수, rules, realtime/analytics 관련 이슈를 볼 때 읽는다.
- `skills/firebase/firebase-agent-briefing.md`
