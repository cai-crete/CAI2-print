# PRINT 노드 통합 가이드 (CAI Canvas)

본 문서는 CAI Canvas 프로젝트에 외부 노드(PRINT 노드)를 연결하고 통합하기 위해 수행된 작업의 전체 흐름과 변경 사항을 정리한 문서입니다. 다른 개발자가 CAI/ 프로젝트를 클론하여 PRINT 노드를 이식하거나, 새로운 종류의 외부 노드를 연결할 때 참고할 수 있는 가이드 역할을 합니다.

## 1. 노드 통합 아키텍처 개요

PRINT 노드는 캔버스(Canvas) 메인 프로젝트와 독립적으로 개발된 패키지(`project.10_print`)입니다. 캔버스 앱은 이 패키지를 불러와 화면에 렌더링하고, 노드 자체의 비즈니스 로직(Agent API 등)과 통신하기 위해 다음 세 가지 주요 통합 레이어를 가집니다.

1. **패키지 의존성 (Dependencies):** 로컬 파일 패키지 또는 npm 패키지 형태로 외부 UI 및 로직을 가져옵니다.
2. **UI 통합 (Slot / Render Props):** 캔버스의 일관된 레이아웃(툴바, 사이드바 등)을 유지하면서 외부 노드의 UI 컴포넌트를 렌더링합니다.
3. **API 프록시 (API Proxy):** 외부 노드의 백엔드 통신을 캔버스의 도메인(또는 API 라우트)을 거쳐 전달하여 CORS 문제를 해결하고 페이로드 크기를 제어합니다.

---

## 2. 주요 변경 파일 및 역할

PRINT 노드를 연결하기 위해 CAI/ 프로젝트 내에서 수정 및 추가된 핵심 파일들은 다음과 같습니다.

### 📦 의존성 및 설정 파일
- **`package.json`**
  - `@cai-crete/print-components` 패키지를 로컬 경로(`file:../../cai-harness-print/project.10_print`)로 연결했습니다.
  - *이식 시 주의:* 실제 배포 시에는 npm 레지스트리를 사용하거나 올바른 워크스페이스/서브모듈 경로로 변경해야 합니다.
- **`tsconfig.json`**
  - PRINT 노드 내부의 절대 경로 별칭(`@/`)이 캔버스 프로젝트의 경로를 덮어쓰지 않도록 불필요한 별칭을 제거했습니다. (`@/*: ["./*"]` 만 남김)

### 🎨 스타일 및 전역 설정
- **`app/globals.css`**
  - PRINT 노드의 UI가 참조하는 누락된 CSS 변수(예: `--color-placeholder`)를 추가하여 노드가 캔버스의 디자인 시스템 환경 내에서 정상적으로 렌더링되도록 했습니다.

### 🌐 API 및 네트워크
- **`app/api/print-proxy/[...path]/route.ts`** (신규 추가)
  - 캔버스의 클라이언트에서 PRINT 노드의 API를 호출할 때 이를 처리하는 **API 프록시 라우트**입니다.
  - 클라이언트가 `/api/print-proxy/...`로 요청을 보내면, 이 라우트가 `https://cai-print-v3.vercel.app` (또는 로컬 서버)로 요청을 포워딩합니다.
  - 긴 생성 시간(agent pipeline)을 지원하기 위해 `maxDuration` 설정이 포함되어 있습니다.

### 🧩 컴포넌트 및 UI 통합
- **`components/ExpandedView.tsx`**
  - PRINT 노드의 메인 UI인 `Print_ExpandedView` 컴포넌트를 불러와 렌더링합니다.
  - **Slot / Render Props 패턴**을 적용하여, PRINT 모듈이 자신의 툴바 내용과 사이드바 내용을 렌더링할 때, 캔버스 측에서 외곽 컨테이너(스타일, 그림자, 닫기 버튼 등)를 감싸서(`renderToolbarWrapper`, `renderSidebarWrapper`) 제공하도록 구조화했습니다.
- **`components/NodeCard.tsx`**
  - 캔버스 상에서 PRINT 노드 카드가 렌더링될 때의 시각적 형태 및 클릭 이벤트 처리를 추가했습니다.
- **`app/page.tsx`**
  - PRINT 노드와 관련된 상태(State)를 관리합니다. (`printDraftState`, `printSavedState`, `printInitialAction` 등)
  - 선택된 이미지나 데이터를 PRINT 노드로 넘겨주는 브릿지 역할을 수행합니다.

---

## 3. 다른 환경으로 PRINT 노드 이식(Transplant) 가이드

새로운 환경이나 다른 개발자의 환경에서 PRINT 노드를 동일하게 연결하려면 다음 단계를 순서대로 수행하십시오.

### Step 1. 패키지 의존성 연결
1. `package.json` 파일의 `dependencies` 항목에 PRINT 패키지를 추가합니다.
   ```json
   "@cai-crete/print-components": "file:<로컬 경로 또는 npm 버전>"
   ```
2. 터미널에서 `npm install`을 실행하여 의존성을 설치합니다.

### Step 2. TypeScript 설정 정리
1. `tsconfig.json` 내의 `paths` 설정에서 외부 모듈의 `@/` 맵핑이 캔버스의 맵핑을 간섭하지 않도록 정리합니다.

### Step 3. API 프록시 구축
1. `app/api/print-proxy/[...path]/route.ts` 파일을 생성합니다.
2. 이 파일 내에서 외부 PRINT API 서버(운영 서버 또는 로컬 서버)로 요청을 전달하는 GET/POST/PUT/DELETE 메서드 핸들러를 작성합니다.
   - *팁:* Vercel 등 배포 환경에서는 AI 생성 대기시간을 고려하여 `export const maxDuration = 300;`과 같은 타임아웃 연장 설정이 필수입니다.

### Step 4. UI Layout 슬롯 적용 (ExpandedView)
1. `components/ExpandedView.tsx`에서 `@cai-crete/print-components`의 `Print_ExpandedView`를 임포트합니다.
2. 단순한 렌더링 대신, 캔버스의 디자인 프레임(닫기 버튼이 포함된 툴바, 스크롤이 가능한 사이드바 패널)을 인자로 넘겨주는 Render Props 패턴을 유지해야 합니다.
   ```tsx
   <Print_ExpandedView
     renderToolbarWrapper={(printTools) => (
       <캔버스_툴바_컨테이너>{printTools}</캔버스_툴바_컨테이너>
     )}
     renderSidebarWrapper={(printPanels) => (
       <캔버스_사이드바_컨테이너>{printPanels}</캔버스_사이드바_컨테이너>
     )}
   />
   ```

### Step 5. CSS 변수 확인
1. PRINT 노드가 캔버스의 디자인 시스템을 상속받으므로, `app/globals.css` 내에 필요한 `--color-xxx` 변수들이 모두 정의되어 있는지 확인합니다. 렌더링 시 스타일이 깨지거나 투명해지는 경우 대부분 이 문제입니다.

---

## 4. 기타 문제 해결 요약
* **Hydration 에러 및 `[object Event]` 에러:** 외부 패키지를 렌더링하는 과정에서 클라이언트와 서버 간의 상태 불일치 혹은 이벤트 핸들러 충돌이 일어날 수 있습니다. 캔버스 측 상태 관리(Page)와 노드 자체의 상태가 충돌하지 않도록 이벤트 인터페이스를 명확히 해야 합니다.
* **이미지 페이로드 한계 (413 Payload Too Large):** Next.js API 라우트를 통과할 때 페이로드 제한이 발생할 수 있으므로, 클라이언트 측에서 이미지를 리사이징/압축(`compressImage`)하여 프록시로 전달하는 로직이 적용되어 있습니다.

이 가이드를 기반으로 CAI Canvas 생태계에 다양한 외부 노드를 일관된 규격으로 통합할 수 있습니다.

---

## 5. ⚠️ 체크리스트: 이식 시 필수 확인 파일 목록

새로운 캔버스 환경에 PRINT 노드(또는 신규 외부 노드)를 성공적으로 이식하기 위해 **반드시 열어보고 수정 및 적용해야 하는 파일들**입니다.

1. **`package.json`**
   - **역할:** 외부 노드 패키지 의존성 선언
   - **확인 사항:** `@cai-crete/print-components` (또는 신규 노드명) 패키지의 경로 혹은 버전이 올바르게 맵핑되어 있는지 확인합니다.
2. **`tsconfig.json`**
   - **역할:** 모듈 경로 충돌 방지
   - **확인 사항:** 캔버스 앱의 내부 경로와 외부 노드 내부의 경로가 충돌하는 낡은 `@/` 별칭(alias) 맵핑이 남아있지 않은지 정리합니다.
3. **`app/globals.css`**
   - **역할:** 전역 디자인 토큰 및 CSS 변수 제공
   - **확인 사항:** 외부 노드 UI가 요구하는 핵심 색상 변수(예: `--color-placeholder` 등)가 캔버스 전역 CSS에 모두 정의되어 있는지 확인합니다.
4. **`app/api/print-proxy/[...path]/route.ts`** (경로는 노드명에 맞게 변경)
   - **역할:** 외부 API 통신 우회 및 타임아웃 확장 설정
   - **확인 사항:** 타겟 백엔드 URL과 프록시의 `maxDuration` 설정이 실제 배포 환경(예: Vercel)의 요구사항에 맞게 적절히 세팅되었는지 확인합니다.
5. **`components/ExpandedView.tsx`**
   - **역할:** 노드 UI 슬롯(Slot) 레이아웃 적용
   - **확인 사항:** `Print_ExpandedView`를 불러와 렌더링할 때, 캔버스의 디자인 프레임인 `renderToolbarWrapper` 및 `renderSidebarWrapper` 컨테이너 규격을 완벽하게 감싸서 호출하고 있는지 확인합니다.
6. **`app/page.tsx`**
   - **역할:** 캔버스 통합 상태 관리
   - **확인 사항:** 노드의 전용 상태(State: 예 `printDraftState`, `printSavedState` 등)가 최상위 캔버스 컴포넌트에 올바르게 등록되고 하위 컴포넌트로 데이터 흐름이 이어지고 있는지 점검합니다.
