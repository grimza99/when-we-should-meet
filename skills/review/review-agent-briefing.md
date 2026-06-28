# 리뷰 에이전트 브리핑

이 문서는 `when-should-we-meet` 프로젝트 PR을 리뷰하는 에이전트용 기준 문서다.
<strong>버전 : </strong> v2

<strong>생성 날짜 : </strong> 2026-04-15

<strong>최신 업데이트 날짜 : </strong> 2026-05-19

## 리뷰 목표

- MVP 범위를 벗어나는 구현을 경계한다.
- 모바일 전용 UX와 상태 모델을 우선 검토한다.

## 우선 확인 항목

- 랜딩 -> 방 생성/참여 -> 닉네임 -> 달력 -> 랭킹 -> 공유 플로우가 깨지지 않는가
- 로컬 상태와 Firestore 상태 경계가 흐려지지 않았는가
- 방 접근, 참여, 복원, 강퇴, 삭제 흐름이 회귀하지 않았는가
- 공통 UI를 재사용하지 않고 중복 구현하지 않았는가
- Firestore rules나 데이터 접근이 의도보다 넓어지지 않았는가

## 자주 보는 리스크

- 모바일에서 sticky / fixed UI가 핵심 컨트롤을 가리는 문제
- 모드 전환, 랭킹 계산, 실시간 동기화에서 stale state가 남는 문제
- Firestore persistence와 optimistic update 충돌
- 외부 SDK 공유 분기에서 fallback이 깨지는 문제

## 리뷰 원칙

- 이 프로젝트의 리뷰 기준은 `wswm-reviewer` 관점을 따른다.
  - merge blocker 우선
  - MVP 범위 유지
  - 모바일 전용 UX 일관성
  - 상태 모델 명확성
  - Firebase / Firestore rules 안전성

## PR 기본 기대사항

- 데모 직전 또는 리뷰 직전 점검은 `skills/qa/manual-smoke-checklist.md`를 참고한다.
- 장기 테스트 전략은 `skills/qa/test-master-plan.md`를 참고한다.
- 기능 변경으로 유저 플로우나 테스트 범위가 달라지면
  `skills/qa/test-plan-template.md` 기준으로 변경별 테스트 플랜을 작성한다.
- QA 역할의 기본 온보딩 문서는 `skills/qa/qa-agent-briefing.md`다.

## 현재 로컬 리뷰 체크리스트

- 랜딩 -> 방 생성/참여 -> 닉네임 -> 달력 플로우가 자연스럽게 이어지는가
- 로컬 상태와 서버 상태의 책임 경계가 유지되는가
- 공통 UI를 재사용하고 있는가
- 모바일 폭 전용 레이아웃이 깨지지 않는가
- Firestore rules 변경이 접근 범위를 의도보다 넓히지 않는가

## 메모

- Firestore rules는 접근 정책의 일부이므로 Git에 포함해 관리하는 것이 맞다.
- 비밀값, 운영 데이터 덤프, 민감한 환경 변수 값은 커밋하지 않는다.
