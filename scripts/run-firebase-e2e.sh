#!/usr/bin/env bash

# 현재 firebase-tools가 요구하는 JDK 버전으로 Firebase 기반 Playwright
# 스위트를 실행한다. 매번 사용자가 직접 JAVA_HOME을 설정하지 않아도 되도록
# npm 스크립트 안에서 필요한 런타임 준비를 끝내는 용도다.

set -euo pipefail

if ! command -v /usr/libexec/java_home >/dev/null 2>&1; then
  echo "Unable to locate /usr/libexec/java_home on this machine." >&2
  exit 1
fi

# macOS에서 JDK 21 경로를 찾은 뒤, 실제로도 Java 21이 맞는지 한 번 더 확인한다.
# java_home가 없을 경우 더 낮은 버전의 JDK로 fallback하는 경우가 있어서
# 경로만 믿지 않고 실행 버전까지 검증한다.
if ! JAVA_HOME_21="$(/usr/libexec/java_home -v 21 2>/dev/null)"; then
  echo "JDK 21 is required for Firebase Emulator Suite." >&2
  echo "Install it first, for example: brew install --cask temurin@21" >&2
  exit 1
fi

JAVA_VERSION_OUTPUT="$("$JAVA_HOME_21/bin/java" -version 2>&1 | head -n 1)"

if [[ ! "$JAVA_VERSION_OUTPUT" =~ version\ \"21\. ]]; then
  echo "JDK 21 is required for Firebase Emulator Suite." >&2
  echo "Current JAVA_HOME resolves to: $JAVA_HOME_21" >&2
  echo "Detected runtime: $JAVA_VERSION_OUTPUT" >&2
  echo "Install it first, for example: brew install --cask temurin@21" >&2
  exit 1
fi

export JAVA_HOME="$JAVA_HOME_21"
export PATH="$JAVA_HOME/bin:$PATH"

# `--headed` 같은 추가 인자는 그대로 Playwright 실행 명령으로 넘긴다.
firebase emulators:exec \
  --only firestore \
  --project demo-when-should-we-meet \
  "playwright test --config playwright.firebase.config.ts $*"
