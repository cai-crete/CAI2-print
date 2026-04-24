---
title: Next.js Runtime Error (Cannot find module './331.js') 해결 계획
created: 2026-04-24
status: active
---

## 1. 오류 파악 (Error Analysis)

업로드된 스크린샷에 나타난 오류는 다음과 같습니다.
- **오류 메시지**: `Cannot find module './331.js'`
- **발생 위치**: `.next\server\app\page.js` 및 `webpack-runtime.js`
- **원인 분석**: 
  이 오류는 전형적인 **Next.js 빌드 캐시(Cache) 충돌 및 손상** 문제입니다. 코드가 변경되거나 브랜치가 전환되는 등의 과정에서 이전 빌드(또는 Fast Refresh) 때 생성되었던 Webpack 청크 파일(`331.js`)이 삭제되었거나 경로가 꼬였음에도, `.next` 내부의 런타임이 이를 계속 참조하려고 할 때 발생합니다.
  특히 최근 모듈 분리나 파일 이동, 의존성(`localforage` 등) 추가 작업이 있었기 때문에 기존 `.next` 빌드 캐시와 충돌이 일어난 것으로 보입니다.

---

## 2. 해결 계획 (Resolution Plan)

이 문제는 소스 코드의 문법적 오류가 아니므로, Next.js의 빌드 캐시를 초기화하여 해결합니다.

### Step 1: 개발 서버 종료
- 현재 포트 `3900`에서 실행 중인 `npm run dev` 프로세스를 완전히 종료합니다.

### Step 2: `.next` 캐시 폴더 삭제
- `project_canvas/` 디렉토리 내부에 있는 `.next` 폴더를 완전히 삭제합니다.
  - Windows 명령어 예시: `rmdir /s /q .next` (cmd) 또는 `Remove-Item -Recurse -Force .next` (PowerShell)

### Step 3: (선택) 의존성 재설치
- 간혹 `node_modules` 충돌이 동반되는 경우가 있으므로, 필요 시 `node_modules`와 `package-lock.json`을 지우고 `npm install`을 다시 실행합니다. (보통은 Step 2만으로 해결됩니다.)

### Step 4: 개발 서버 재시작 및 검증
- 다시 `npm run dev` (또는 `npm run build` 후 실행)를 입력하여 서버를 구동합니다.
- 브라우저를 새로고침하여 에러 화면 대신 정상적인 캔버스 화면이 렌더링되는지 확인합니다.

---

## 3. 작업 체크리스트

- [x] 개발 서버 프로세스(3900번 포트) 강제 종료
- [x] `project_canvas/.next` 폴더 삭제 (Clean Build 준비)
- [x] `npm run dev` 재실행 후 정상 로드 확인

