#!/usr/bin/env bash

# 현재 firebase-tools가 요구하는 JDK 버전으로 Firebase 기반 Playwright
# 스위트를 실행한다. 매번 사용자가 직접 JAVA_HOME을 설정하지 않아도 되도록
# npm 스크립트 안에서 필요한 런타임 준비를 끝내는 용도다.

set -euo pipefail

resolve_java_21_home() {
  if [[ -n "${JAVA_HOME:-}" && -x "${JAVA_HOME}/bin/java" ]]; then
    local java_version_output
    java_version_output="$("${JAVA_HOME}/bin/java" -version 2>&1 | head -n 1)"

    if [[ "$java_version_output" =~ version\ \"21\. ]]; then
      echo "${JAVA_HOME}"
      return 0
    fi
  fi

  if [[ "$(uname -s)" == "Darwin" && -x /usr/libexec/java_home ]]; then
    local mac_java_home
    mac_java_home="$(/usr/libexec/java_home -v 21 2>/dev/null || true)"

    if [[ -n "$mac_java_home" && -x "${mac_java_home}/bin/java" ]]; then
      local mac_java_version_output
      mac_java_version_output="$("${mac_java_home}/bin/java" -version 2>&1 | head -n 1)"

      if [[ "$mac_java_version_output" =~ version\ \"21\. ]]; then
        echo "${mac_java_home}"
        return 0
      fi
    fi
  fi

  return 1
}

# CI에서는 setup-java가 JAVA_HOME을 잡아주고, 로컬 macOS에서는 java_home로
# 설치된 JDK 21을 찾는다.
if ! JAVA_HOME_21="$(resolve_java_21_home)"; then
  echo "JDK 21 is required for Firebase Emulator Suite." >&2

  if [[ "$(uname -s)" == "Darwin" ]]; then
    echo "Install it first, for example: brew install --cask temurin@21" >&2
  else
    echo "Set JAVA_HOME to a JDK 21 installation before running this script." >&2
  fi

  exit 1
fi

export JAVA_HOME="${JAVA_HOME_21}"
export PATH="${JAVA_HOME}/bin:${PATH}"

# `--headed` 같은 추가 인자는 그대로 Playwright 실행 명령으로 넘긴다.
firebase emulators:exec \
  --only firestore \
  --project demo-when-should-we-meet \
  "playwright test --config playwright.firebase.config.ts $*"
