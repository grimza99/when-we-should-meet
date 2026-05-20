# Firebase Hosting 배포

이 문서는 `when-should-we-meet` 프로젝트 프로덕션 배포를 담당하는 에이전트용 기준 문서다.
현재 production 배포는 GitHub Actions로 처리한다.
<strong>버전 : </strong> v2

<strong>생성 날짜 : </strong> 2026-04-20

<strong>최신 업데이트 날짜 : </strong> 2026-05-19

## 트리거

- `main` 브랜치에 `push`
- 수동 `workflow_dispatch`

기능 작업은 계속 `dev`를 거쳐 머지하는 흐름을 유지한다.  
실제 production 배포는 production 브랜치에 변경이 반영된 뒤에만 일어난다.

## 필요한 GitHub Secrets

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `FIREBASE_SERVICE_ACCOUNT`
- `VITE_FIREBASE_MEASUREMENT_ID`

`VITE_FIREBASE_*` 값은 브라우저 번들에 포함되는 Firebase 웹 앱 설정값이다.  
`FIREBASE_SERVICE_ACCOUNT`는 민감 정보이므로 GitHub secret으로만 관리해야 한다.

## Hosting 설정

`firebase.json`은 Vite 빌드 결과물인 `dist`를 배포 대상으로 사용한다.

rewrite rule은 모든 경로를 `index.html`로 보내므로, `/room/:roomId` 같은 공유 링크도
새로고침 후 정상 동작한다.

## 배포 워크플로우

production 배포 워크플로우는 아래 순서로 실행된다.

1. `npm ci`
2. `npm run lint`
3. `npm run build`
4. Firebase Hosting `live` 채널 배포
