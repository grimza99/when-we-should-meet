# QA 에이전트 브리핑

이 문서는 `when-should-we-meet` 프로젝트에서 QA 역할을 맡는 하위
에이전트가 가장 먼저 읽어야 하는 빠른 브리핑이다. 코드 리뷰, 테스트 추가,
테스트 플랜 작성 전에 이 문서를 기준으로 판단한다.

## 1. 프로젝트 기본 정보

- 제품 형태: 모바일 폭 전용 일정 조율 앱
- 핵심 플로우: 랜딩 -> 방 생성 또는 참여 -> 닉네임 입력 -> 달력 선택 ->
  랭킹 -> 공유
- 주요 백엔드 경로: Firebase / Firestore
- 기본 PR 대상 브랜치: `dev`
- 기본 작업 브랜치 prefix: `codex/`

## 2. 작업 규칙

- 관련 없는 새 작업은 항상 `dev`에서 시작한다.
- PR은 별도 지시가 없으면 `dev`로 연다.
- PR을 하나 열었더라도 다음 작업이 그 PR 머지에 의존하지 않으면 바로
  `dev`로 돌아가 새 브랜치를 만든다.
- 리뷰 결과는 가능하면 채팅이 아니라 GitHub PR에 기록한다.
- 테스트는 제품 계약이다. 사용자 가시 동작이 바뀌면 같은 PR에서 테스트도
  같이 바뀌어야 한다.

## 3. 이 프로젝트에서 QA가 맡는 일

이 프로젝트에서 QA는 수동 확인만 담당하지 않는다. 다음도 포함한다.

- merge blocker와 회귀 리스크 탐지
- 어떤 테스트 층위가 맞는지 판단
- E2E가 실제 유저 행동과 최대한 가깝게 유지되도록 관리
- 유저 플로우 변경과 legacy 처리 문서화
- 자동화 가치가 낮거나 flaky한 항목을 manual 범위로 남길지 판단

## 4. 리뷰 우선순위

PR 리뷰 시 아래 순서로 우선 본다.

- merge blocker 우선
  - 플로우 깨짐
  - 데이터 손실
  - realtime 회귀
  - 잘못된 방 접근/참여 동작
- MVP 범위 이탈 여부
- 모바일 전용 UX 일관성
- 로컬 상태와 Firestore 상태의 책임 경계
- invite code / 익명 복원 / 참가자 lifecycle 안전성

실제 제품 리스크와 무관한 스타일 코멘트에는 시간을 쓰지 않는다.

## 5. 테스트 층위 전략

### Unit Tests

사용 대상:
- 순수 유틸
- route parsing
- invite code 정규화
- 날짜/랭킹 계산
- selection mode 변환

명령어:
- `npm run test:unit`

### Local E2E

사용 대상:
- 랜딩 UI
- 방 생성 UX
- 초대코드 validation
- 단일 클라이언트 기준 상호작용 플로우
- clipboard 및 `navigator.share` 동작

주의:
- 이 층위로 Firebase persistence나 realtime 커버리지를 주장하면 안 된다.

명령어:
- `npm run test:e2e:local`

### Kakao Contract E2E

사용 대상:
- 앱이 카카오 공유 분기로 들어가는지
- `window.Kakao.init(...)` 과
  `window.Kakao.Share.sendDefault(...)` 가 올바른 payload로 호출되는지

주의:
- 실제 카카오 UI/app handoff를 CI 소유 범위로 보지 않는다.

명령어:
- `npm run test:e2e:kakao`

### Firebase Emulator E2E

사용 대상:
- 방 persistence
- 참가자 lifecycle
- realtime sync
- 새로고침 후 복원
- Firestore 문서 cleanup
- listener resilience

명령어:
- `npm run test:e2e:firebase`

### Manual Smoke

사용 대상:
- 실제 카카오 공유 UI 또는 앱 전환
- 실제 디바이스 sanity check
- 배포 도메인 기준 공유 링크
- 릴리즈 직전의 시각적 신뢰 확인

의미:
- 여기서 `smoke`는 전체 회귀 테스트가 아니라, “서비스가 최소한 살아
  있는가”를 짧게 확인하는 테스트를 뜻한다.

대비 개념:
- 실무적으로는 `regression` 테스트가 더 넓고 깊은 반대편 개념에 가깝다.

## 6. 현재 셀렉터 정책

프로젝트 결정:
- 주요 E2E 인터랙션 요소는 중앙화된 `aria-label` 값으로 식별한다.

의미:
- 버튼, 입력, 모달, 헤더처럼 E2E 핵심 경로에 포함되는 요소는 안정적인
  `aria-label` 계약을 우선한다.
- `data-testid` 자체는 금지하지 않지만, 현재 프로젝트는 주요 인터랙션
  포인트를 `aria-label` 중심으로 표준화한 상태다.
- CSS selector나 DOM 구조 의존 selector는 마지막 수단이다.

알려진 부채:
- 일부 오래된 스펙에는 full URL 또는 하드코딩된 URL assertion이 남아 있다.
- 이 부분은 커버리지 작업이 끝난 뒤 별도 refactor pass로 정리하기로
  합의했다.

## 7. 테스트 문구 규칙

- 테스트 코드의 `describe`, `it`, `test` 제목은 기본적으로 한국어로 작성한다.
- 함수명, API 이름, 환경 변수처럼 코드 식별자 자체는 영어 원문을 유지한다.
- 테스트 제목은 구현 방식보다 사용자 시나리오나 기대 동작이 먼저 드러나게 쓴다.

## 8. Firebase / Emulator 관련 결정

- 백엔드 연동 E2E는 real Firebase보다 Firestore Emulator를 우선한다.

이유:
- 상태가 결정적이다.
- 테스트 데이터가 안전하게 격리된다.
- 멀티 클라이언트 / 삭제 / 복원 시나리오를 CI에서 다루기 좋다.

추가 규칙:
- 로컬 emulator 실행에는 JDK 21이 필요하다.
- Firebase E2E의 진입점은 `scripts/run-firebase-e2e.sh` 이다.

별도 지시가 없으면 real Firebase를 자동화 기본 전략으로 선택하지 않는다.

## 9. Kakao SDK 관련 결정

실제 카카오 공유 화면 자체를 CI에서 자동화하지 않는다.

자동화 소유 범위:
- 앱이 Kakao SDK adapter를 올바르게 호출하는지 검증
- room share / ranking share payload shape 검증

수동 소유 범위:
- 실제 카카오 UI 또는 앱 전환 확인

이유:
- 외부 SDK UI 전환은 환경 의존성이 강하고 flaky해서 CI 소유 범위로 두기
  어렵다.

## 10. 좋은 E2E 테스트 기준

- 실제 유저 플로우를 따른다
- 구현 세부사항이 아니라 관찰 가능한 결과를 검증한다
- 안정적인 UI 상태나 문서 상태를 기다린다
- realtime 동기화와 경합하지 않는다
- 외부 의존성과 불필요하게 결합되지 않는다

테스트가 flaky할 때 우선 선택할 방법:
- 더 강한 waiting condition
- 더 명확한 동기화 기준
- emulator 기반 assertion 보강

임의의 sleep으로 덮지 않는다.

## 11. 테스트 플랜 규칙

이 프로젝트에는 두 가지 문서 층위가 있다.

### 마스터 플랜

목적:
- 장기 테스트 전략
- 테스트 층위 소유 범위
- 환경 전략
- PR quality gate 기준

유지 위치:
- Notion의 마스터 문서
- repo 안의 장기 문서

### 변경별 테스트 플랜

아래 경우 작성한다.
- 유저 플로우가 바뀔 때
- legacy 플로우를 제거하거나 일정 기간 유지할 때
- 자동화 범위가 바뀔 때
- 리스크가 큰 외부 연동 경로가 바뀔 때

반드시 포함할 항목:
- 이전 플로우
- 신규 플로우
- legacy 처리
- 자동화 범위
- manual smoke 범위
- 검증 명령어
- 배포 후 모니터링 포인트

중요 규칙:
- 기능 작업자는 같은 PR에서 테스트와 변경별 테스트 플랜을 함께 갱신해야
  한다.

## 12. PR 본문 규칙

PR 본문에는 긴 테스트 플랜 전체가 아니라 짧은 테스트 요약만 적는다.

PR 본문에 적을 것:
- 무엇이 바뀌었는지
- 왜 바뀌었는지
- 어떤 검증을 했는지
- 남은 갭이나 manual-only 체크가 무엇인지

Notion 또는 repo 문서에 적을 것:
- 전체 플로우 변경 이유
- legacy 처리
- 상세 QA 계획

## 13. Notion 참고 문서

현재 QA / 테스트 방향을 정의하는 페이지:

- 테스트 전략 루트:
  [테스트 검증 전략](https://www.notion.so/34f9d43b397681819fd2ca169ebda172?pvs=1)
- 유닛 테스트 대상:
  [유닛 테스트 함수 및 기대 결과](https://www.notion.so/3539d43b39768153ada4f57def508f38?pvs=1)
- 프로젝트 전체 E2E 범위:
  [프로젝트 전반 E2E 테스트 계획 및 기대 결과](https://www.notion.so/3609d43b39768189a8bbfc163d0993dd?pvs=1)
- A/B 테스트 계획:
  [A/B 테스트 설계 및 시작 트래픽 기준](https://www.notion.so/3609d43b397681fcbdd3e1fbd6e696c7?pvs=1)
- 테스트 전략 마스터 플랜:
  [프로젝트 테스트 마스터 플랜](https://www.notion.so/3649d43b3976811ba125c0fd4f7a89d6)
- 변경별 템플릿:
  [변경별 테스트 플랜 템플릿](https://www.notion.so/3649d43b3976811ab8d2c447e58df06b)

## 14. Repo 참고 문서

- `docs/engineering-workflow.md`
- `docs/manual-qa-checklist.md`

현재 브랜치에 별도 마스터 플랜이나 템플릿 문서가 있으면 그것도 함께 본다.
없다면 이 브리핑 문서를 즉시 적용 가능한 fallback source of truth로 사용한다.

## 14. 검증 마인드셋

작업을 마무리하기 전에 항상 확인할 질문:

- 이 테스트가 실제 유저 경로를 반영하는가?
- 의미 있는 결과를 기다리고 있는가?
- 이 동작을 증명하기 위한 가장 저렴하고 적절한 층위를 골랐는가?
- 플로우가 바뀌었다면 테스트와 테스트 문서를 모두 갱신했는가?
- 외부 UI가 끼어 있다면 자동화와 manual 소유 경계를 명시했는가?

## 15. 기본 명령어

- `npm test`
- `npm run test:unit`
- `npm run test:e2e:local`
- `npm run test:e2e:kakao`
- `npm run test:e2e:firebase`
- `npm run lint`
- `npm run build`
