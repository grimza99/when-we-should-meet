# Firebase Hosting Deployment

Production deploys are handled by GitHub Actions.

## Trigger

- `push` to `main`
- manual `workflow_dispatch`

All feature work should still be merged through `dev` first. Production deploys only happen after the production branch receives the change.

## Required GitHub Secrets

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `FIREBASE_SERVICE_ACCOUNT`

The `VITE_FIREBASE_*` values are Firebase web app config values that are embedded into the browser bundle. `FIREBASE_SERVICE_ACCOUNT` is sensitive and must only be stored as a GitHub secret.

## Hosting Config

`firebase.json` deploys the Vite build output from `dist`.

The rewrite rule sends every route to `index.html` so shared room links such as `/room/:roomId` work after a page refresh.

## Workflow

The production workflow runs:

1. `npm ci`
2. `npm run lint`
3. `npm run build`
4. Firebase Hosting deploy to the `live` channel
