# Print 노드 API화 및 Canvas 연동 작업지시서

**작성일**: 2026-04-24  
**작성자**: CRE-TE / CAI Team  
**대상**: Print 노드 담당 개발자  
**레포**: https://github.com/cai-crete/cai-print-v3

---

## 1. 개요

N07 Print 노드를 CAI Canvas 앱에 통합하기 위한 작업지시서입니다.

Print 노드는 두 가지 역할을 동시에 수행해야 합니다.

| 역할 | 현재 상태 | 목표 |
|------|-----------|------|
| **API** | 브라우저 → Print 서버 직접 호출 | Canvas 서버 → Print 서버 (서버-투-서버 프록시) |
| **UI** | Print 앱 내 독립 컴포넌트 | Canvas에 이식 가능한 Controlled 컴포넌트로 전환 |

---

## 2. 전체 아키텍처

```
[Canvas 브라우저]
  ├── RightSidebar
  │     └── PrintSidebarPanel (Print 개발자 제공)   ← 항상 노출
  │           └── 액션 클릭 → Print_ExpandedView 오픈
  │
  ├── Print_ExpandedView (Print 개발자 제공, Canvas에 이식)
  │     ├── props: selectedImages, savedState, initialAction, apiBaseUrl, onSave, onDelete
  │     └── 내부 API 호출: fetch(`${apiBaseUrl}/api/...`)
  │                              ↓ (Canvas가 프록시 라우트 구현)
  │                   [Canvas 서버 /api/print-proxy/*]
  │                              ↓ 서버-투-서버 (CORS 없음)
  │                   [Print 노드 서버 /api/*]
  │
  └── NodeCard (Print 아트보드 썸네일 표시)          ← Canvas 상태 관리
```

**핵심 설계 원칙:**
- **Canvas가 상태의 주인**: 저장된 문서, 썸네일은 Canvas IndexedDB에 보관
- **Print는 API + UI 공급자**: 생성 API와 컴포넌트를 제공
- **CORS 필수 설정**: Print 노드 서버에서 Canvas origin을 명시적으로 허용 (작업 6)
- **주 경로는 서버-투-서버 프록시**: Canvas 서버 → Print 서버로 프록시하여 API 키 노출 방지

> 허용 Origin (Print 노드 미들웨어에 등록):  
> - `https://cai-canvas-v2.vercel.app` (운영 Canvas 서버)  
> - `http://localhost:3900` (Canvas 로컬 개발)

---

## 3. Print 노드 개발자 작업 목록

---

### 작업 1 — Print_ExpandedView를 Controlled 컴포넌트로 전환 ⭐ (핵심)

Canvas에 이식하기 위해 Print_ExpandedView를 외부에서 상태를 주입하고  
결과를 callbacks으로 받는 **Controlled 컴포넌트** 구조로 전환합니다.

#### 1-A. 추가해야 할 Props 인터페이스

```typescript
// types/print-canvas.ts (신규 파일로 export)

export interface SelectedImage {
  id: string;
  base64: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  filename?: string;
}

export interface PrintSavedState {
  html: string;
  mode: 'REPORT' | 'PANEL' | 'DRAWING' | 'VIDEO';
  prompt?: string;
  savedAt: string; // ISO 8601
}

export interface PrintSaveResult {
  html: string;
  thumbnail: string;  // base64 PNG — html2canvas로 첫 페이지 캡처
  mode: 'REPORT' | 'PANEL' | 'DRAWING' | 'VIDEO';
  metadata: Record<string, unknown>; // masterData 그대로
}

export interface PrintExpandedViewProps {
  // Canvas에서 선택한 이미지들 → INSERT IMAGE에 자동 로드
  selectedImages?: SelectedImage[];

  // 이전에 저장된 문서 상태 → 편집 재개 시 복원
  savedState?: PrintSavedState;

  // 사이드바에서 시작된 액션 → 해당 기능으로 바로 진입
  // 'generate': 기본 생성 화면 (마지막 모드 또는 REPORT 기본값)
  // 'library' : 라이브러리 탭으로 바로 진입
  // 'video'   : VIDEO 모드 생성 화면으로 바로 진입
  initialAction?: 'generate' | 'library' | 'video' | null;

  // Canvas 프록시 경로 (standalone일 때는 '' 또는 생략)
  apiBaseUrl?: string;  // 기본값: '' (상대 경로 그대로 사용)

  // 저장 완료 시 호출 → Canvas가 NodeCard 썸네일 + 상태 업데이트
  onSave: (result: PrintSaveResult) => void;

  // 삭제 시 호출 → Canvas가 NodeCard 및 상태 삭제
  onDelete?: () => void;
}
```

#### 1-B. `selectedImages` 동작

`selectedImages` prop이 주입되면:
- INSERT IMAGE 섹션에 해당 이미지들을 **자동으로 로드**
- 기존에 선택된 이미지가 있다면 대체(replace)
- 이미지 장수가 현재 모드의 제한을 초과하면 토스트 표시 (기존 로직 재사용)

```typescript
// 예시 — selectedImages prop 처리
useEffect(() => {
  if (!props.selectedImages?.length) return;
  setInsertedImages(props.selectedImages);
  // 장수 초과 시 기존 토스트 로직 호출
  validateImageCount(props.selectedImages.length, currentMode);
}, [props.selectedImages]);
```

#### 1-C. `apiBaseUrl` 적용 — CORS 방지 핵심

컴포넌트 내부의 **모든 fetch 호출**에 `apiBaseUrl` prefix를 적용합니다.

```typescript
// 변경 전 (CORS 발생)
const res = await fetch('/api/print', { method: 'POST', body: formData });
const res = await fetch('/api/library');

// 변경 후 (Canvas 프록시 경유)
const res = await fetch(`${apiBaseUrl}/api/print`, { method: 'POST', body: formData });
const res = await fetch(`${apiBaseUrl}/api/library`);
```

standalone 모드에서는 `apiBaseUrl = ''` 이므로 기존과 동일하게 동작합니다.

#### 1-D. `onSave` 콜백 — 썸네일 생성 포함

Save 버튼 클릭 시 `onSave()`를 호출하기 **직전에** html2canvas로 썸네일을 생성합니다.  
(html2canvas는 이미 의존성에 포함되어 있습니다)

```typescript
// 예시 — onSave 호출 패턴
const handleSave = async () => {
  // 1. 기존 localStorage 저장 로직 (standalone 모드 유지용)
  if (!props.onSave) {
    saveToLocalStorage(currentHtml);
    return;
  }

  // 2. Canvas 모드: 썸네일 생성 후 onSave 호출
  const previewEl = document.getElementById('print-preview-first-page');
  const canvas = await html2canvas(previewEl, { scale: 0.5, useCORS: true });
  const thumbnail = canvas.toDataURL('image/png');

  props.onSave({
    html: currentHtml,
    thumbnail,
    mode: currentMode,
    metadata: masterData,
  });
};
```

#### 1-E. Standalone / Canvas 임베드 모드 분기

`props.onSave` 유무로 모드를 판단합니다.

```typescript
const isCanvasMode = !!props.onSave;
// isCanvasMode === true → props/callbacks 사용, localStorage 저장 스킵
// isCanvasMode === false → 기존 localStorage 동작 유지 (standalone)
```

---

### 작업 2 — PrintSidebarPanel 컴포넌트 제공 (필수)

Canvas의 RightSidebar에 상시 표시될 Print 전용 사이드바 패널 컴포넌트를 제공합니다.

#### 요구사항

- Print 아트보드가 선택되었을 때 Canvas의 RightSidebar에 렌더링됨
- 사이드바에서 특정 액션을 클릭하면 → Canvas가 `initialAction` prop을 설정하여 Print_ExpandedView를 열고, 해당 기능이 바로 시작됨
- 현재 저장된 문서의 썸네일, 모드, 상태를 표시

#### Props 인터페이스

```typescript
export interface PrintSidebarPanelProps {
  // 현재 저장된 문서 (없으면 신규 생성 상태)
  savedState?: PrintSavedState;
  thumbnail?: string; // base64 PNG

  // 사이드바 액션 → Canvas가 이 값으로 initialAction 설정 후 Expand
  onAction: (action: 'generate' | 'library' | 'video') => void;
}
```

#### 표시할 항목 (참고)

```
[ Print 썸네일 미리보기 ]
[ 문서 모드 배지: REPORT / PANEL / DRAWING / VIDEO ]
──────────────────────────────
[ 생성하기 버튼 ]       → onAction('generate')
[ 라이브러리 버튼 ]     → onAction('library')
[ 영상 만들기 버튼 ]    → onAction('video')
```

---

### 작업 3 — 컴포넌트 내부 API 호출 목록 제공 (필수)

Print_ExpandedView 및 하위 컴포넌트가 내부적으로 호출하는  
**모든 API 경로**를 아래 형식으로 Canvas 팀에 문서로 제공합니다.

Canvas 서버가 이 경로들을 모두 `/api/print-proxy/*` 하위에 프록시해야 합니다.

**제공 형식 (아래를 채워서 Canvas 팀에 전달):**

```markdown
## Print 컴포넌트 내부 API 호출 목록

| 컴포넌트 | 메서드 | 경로 | 목적 |
|----------|--------|------|------|
| PrintExpandedView | POST | /api/print | 문서 생성 |
| LibraryPanel | GET | /api/library | 라이브러리 폴더/이미지 목록 |
| LibraryPanel | GET | /api/library/image?folder=&file= | 라이브러리 이미지 |
| PrintPreview | GET | /api/fonts/[name] | 폰트 파일 |
| ConvertPanel | POST | /api/convert | DXF 변환 |
| (기타 추가) | | | |
```

> 이 목록 없이는 Canvas가 프록시 라우트를 완성할 수 없습니다.

---

### 작업 4 — 이미지 장수 제한 규칙 문서화 및 API 노출 (필수)

Canvas에서 이미지를 선택하여 Print를 실행할 때,  
선택 단계부터 동일한 장수 제한이 적용되고 초과 시 Canvas가 토스트를 표시합니다.

#### 4-A. 장수 제한 문서 제공

아래 형식으로 실제 제한 수치를 채워 Canvas 팀에 전달합니다.

```typescript
// Canvas 팀이 사용할 상수
const PRINT_IMAGE_LIMITS = {
  REPORT:  { min: 1, max: __ },  // ← 실제 값으로 채워주세요
  PANEL:   { min: 1, max: __ },
  DRAWING: { min: 1, max: __ },
  VIDEO:   { min: 2, max: 2  },  // VIDEO는 정확히 2장
};
```

#### 4-B. `GET /api/print/limits` 엔드포인트 추가 (권장)

Canvas가 하드코딩 없이 동적으로 제한을 가져올 수 있도록 API로도 노출합니다.

```typescript
// app/api/print/limits/route.ts
export async function GET() {
  return Response.json({
    REPORT:  { min: 1, max: 10 }, // 실제 값으로 수정
    PANEL:   { min: 1, max: 6  },
    DRAWING: { min: 1, max: 4  },
    VIDEO:   { min: 2, max: 2  },
  });
}
```

---

### 작업 5 — API 시크릿 검증 추가 (필수)

`/api/print` 및 컴포넌트가 호출하는 **모든 API 라우트**에 동일하게 적용합니다.

```typescript
// 각 route.ts 최상단
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const CANVAS_API_SECRET = process.env.CANVAS_API_SECRET;

export async function POST(request: NextRequest) {
  if (CANVAS_API_SECRET) {
    const provided = request.headers.get('x-canvas-api-secret');
    if (provided !== CANVAS_API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }
  // 기존 로직 유지
}
```

**환경변수:**
- `.env.local`: `CANVAS_API_SECRET=<팀 합의 시크릿>`
- Vercel Dashboard: 동일 값 추가

---

### 작업 6 — CORS 설정 (필수)

Canvas 앱이 Print 노드 API를 호출할 수 있도록 CORS를 설정합니다.  
서버-투-서버 프록시를 사용하더라도, 컴포넌트 내부 직접 호출·향후 구조 변경 등에 대비하여  
**무조건 설정합니다.**

**허용 Origin:**

| 환경 | Origin |
|------|--------|
| 운영 Canvas 서버 | `https://cai-canvas-v2.vercel.app` |
| Canvas 로컬 개발 | `http://localhost:3900` |

**구현: `project.10_print/middleware.ts` (신규 파일)**

Next.js App Router의 Middleware를 사용하여 모든 `/api/*` 라우트에 일괄 적용합니다.  
각 route.ts를 개별 수정하는 방식보다 안전하고 누락 위험이 없습니다.

```typescript
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ORIGINS = [
  'https://cai-canvas-v2.vercel.app',
  'http://localhost:3900',
];

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin') ?? '';
  const isAllowed = ALLOWED_ORIGINS.includes(origin);

  // Preflight (브라우저가 본 요청 전 OPTIONS로 사전 허가 요청)
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin':  isAllowed ? origin : 'null',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-canvas-api-secret',
        'Access-Control-Max-Age':       '86400',
      },
    });
  }

  const response = NextResponse.next();
  if (isAllowed) {
    response.headers.set('Access-Control-Allow-Origin',  origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-canvas-api-secret');
  }
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
```

> Canvas 측 origin이 추가될 경우 (예: 스테이징 서버) `ALLOWED_ORIGINS` 배열에 추가하면 됩니다.

**동작 확인:**

```bash
# Preflight 허용 확인
curl -X OPTIONS http://localhost:3777/api/print \
  -H "Origin: http://localhost:3900" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type, x-canvas-api-secret" \
  -i

# 기대: HTTP 204, Access-Control-Allow-Origin: http://localhost:3900

# 차단 확인 (허용되지 않은 origin)
curl -X OPTIONS http://localhost:3777/api/print \
  -H "Origin: http://localhost:9999" \
  -i

# 기대: Access-Control-Allow-Origin 헤더 없음 (또는 'null')
```

---

### 작업 7 — 에러 응답 표준화 (필수)

모든 API 에러 응답의 최상위 키를 `"error"`로 통일합니다.

```json
{ "error": "메시지", "step": "실패 단계 (선택)", "executionLog": {} }
```

---

### 작업 8 — 배포 URL 확정 및 Canvas 팀 통보 (필수)

| 환경 | URL |
|------|-----|
| Production | `https://cai-print-v3.vercel.app` |
| Local Dev | `http://localhost:3777` |

Canvas 팀에 전달할 항목:
1. 위 URL 공식 확정 여부
2. `CANVAS_API_SECRET` 값 (보안 채널 사용)
3. 컴포넌트 내부 API 목록 (작업 3)
4. 이미지 장수 제한 수치 (작업 4)
5. `@cai-crete/print-components` 첫 릴리즈 배포 완료 알림 (작업 10)

---

### 작업 9 — UI 디자인 시스템 연동 준비 (필수)

Print 컴포넌트(Print_ExpandedView, PrintSidebarPanel)는 Canvas에 이식될 때  
**CAI Canvas 디자인 시스템**에 맞게 재스타일링됩니다.  
Print 개발자는 컴포넌트를 "스타일 주입 가능한 구조"로 납품하고,  
최종 스타일링은 Canvas 팀(AGENT C)이 담당합니다.
- 좌측 Toolbar에 Print 전용 기능과 CAI CANVAS 공통 기능을 분리하여 Print 전용 기능은 유지하되 스타일만 통일하고 위계에 맞게 재배치합니다.
- Sidebar 또한 기능 및 전체 구성은 동일하되, 확장/축소 등 공통 기능은 CAI CANVAS에 맞게 구현합니다.
- 생성한 문서 view, 문서 미리보기 (preview) 등은 Print 전용 기능으로 유지하되 스타일만 통일합니다. (CAI CANVAS 공통 기능으로 분류하지 않습니다.)

**컴포넌트 전달 방법:**  
파일 직접 복사가 아닌 **npm 패키지(GitHub Packages)** 방식으로 배포합니다.  
Print 노드를 포함한 모든 외부 노드가 동일한 패턴으로 Canvas에 연결됩니다.  
→ **작업 10** 참조

---

#### 9-A. Print 개발자 역할 — 컴포넌트 스타일 가변 구조로 전환

**① `className` prop 추가**

두 컴포넌트 모두 루트 엘리먼트에 `className` prop을 수락해야 합니다.  
Canvas 팀이 이 prop으로 스타일 오버라이드를 주입합니다.

```typescript
// PrintExpandedViewProps에 추가
className?: string;

// PrintSidebarPanelProps에 추가
className?: string;

// 컴포넌트 루트에 적용
<div className={`print-expanded-view ${props.className ?? ''}`}>
```

**② CSS 커스텀 프로퍼티(변수) 기반 스타일링으로 전환**

모든 색상·폰트·간격·곡률 값을 CSS 변수로 선언하고,  
컴포넌트 내부에서는 변수만 참조합니다. 하드코딩 금지.

```css
/* print-tokens.css — 컴포넌트와 함께 export */
:root {
  /* 색상 */
  --print-color-primary:     #000000;
  --print-color-on-primary:  #FFFFFF;
  --print-color-text:        #333333;
  --print-color-text-muted:  #666666;
  --print-color-placeholder: #999999;
  --print-color-border:      #CCCCCC;
  --print-color-divider:     #EEEEEE;
  --print-color-bg:          #FFFFFF;
  --print-color-bg-subtle:   #EEEEEE;

  /* 폰트 */
  --print-font-display: 'Bebas Neue', sans-serif;
  --print-font-body:    'Pretendard', sans-serif;

  /* 버튼 높이 */
  --print-btn-height-lg: 3.25rem;  /* 52px — 주 액션 버튼 */
  --print-btn-height-md: 2.75rem;  /* 44px — 보조 버튼, 옵션 */
  --print-btn-height-sm: 2.25rem;  /* 36px — 소형 버튼 */

  /* 곡률 */
  --print-radius-pill: 5rem;      /* CTA 버튼 */
  --print-radius-box:  0.625rem;  /* 입력 필드, 옵션 버튼, 카드 */

  /* 간격 */
  --print-space-1: 0.5rem;   /* 8px */
  --print-space-2: 1rem;     /* 16px */
  --print-space-3: 1.25rem;  /* 20px */
  --print-space-4: 2rem;     /* 32px */
}
```

컴포넌트 내부에서는 이 변수만 사용합니다.

```css
/* 예시 — 기존 하드코딩 → 변수 치환 */

/* 변경 전 */
background-color: #1a1a1a;
font-family: 'SomeOtherFont', sans-serif;
border-radius: 8px;

/* 변경 후 */
background-color: var(--print-color-primary);
font-family: var(--print-font-display);
border-radius: var(--print-radius-box);
```

**③ 스타일 격리 — 외부 스타일이 오버라이드 가능해야 함**

- `!important` 사용 금지 (오버라이드 불가능해짐)
- CSS Modules를 사용 중이라면 `:global()` 탈출구를 `data-print` 어트리뷰트 기반으로 제공
- 인라인 style 속성에 색상·폰트를 직접 지정하지 않음

```tsx
// 권장: data 어트리뷰트로 스코프 제공
<div data-print-canvas className={props.className}>

// 금지: 인라인 스타일로 색상 고정
<button style={{ backgroundColor: '#1a1a1a', color: 'white' }}>
```

**④ UI 컴포넌트 인벤토리 제공**

아래 형식으로 Canvas 팀(AGENT C)에 제공합니다.  
AGENT C가 이 목록을 기반으로 각 요소에 CAI 디자인 토큰을 매핑합니다.

```markdown
## Print_ExpandedView UI 컴포넌트 인벤토리

| 역할 | 엘리먼트 | 현재 CSS 변수 | 비고 |
|------|----------|---------------|------|
| 주 액션 버튼 (GENERATE) | `<button>` | --print-color-primary | 화면당 1개 |
| 보조 버튼 (EXPORT, SAVE) | `<button>` | --print-color-border | |
| 모드 선택 탭 (REPORT/PANEL/...) | `<button>` | --print-color-border | 선택 시 --print-color-primary |
| 텍스트 입력 (prompt) | `<textarea>` | --print-color-border | |
| 이미지 삽입 카드 | `<div>` | --print-color-divider | |
| 사이드바 섹션 구분선 | `<hr>` | --print-color-divider | |
| 토스트 알림 | `<div>` | (오류: 붉은 계열) | |
| (기타 추가) | | | |
```

---

#### 9-B. CAI Canvas 디자인 시스템 참고 (Canvas 팀 적용 기준)

> Print 개발자는 아래 토큰 체계를 참고하여 CSS 변수 이름과 기본값을 맞춰두면  
> Canvas 팀의 오버라이드 작업이 최소화됩니다.

**색상 (흑백 단색 체계 — 무채색 외 색상 사용 금지)**

| CAI 토큰 | Hex | 주요 용도 |
|----------|-----|-----------|
| `black` | `#000000` | CTA-primary 배경, 주 텍스트, 테두리 |
| `white` | `#FFFFFF` | 사이드바·헤더 배경, CTA-primary 텍스트 |
| `gray-500` | `#333333` | 보조 텍스트, 아이콘 기본 색상 |
| `gray-400` | `#666666` | 캡션, 힌트 텍스트 |
| `gray-300` | `#999999` | 비활성, placeholder |
| `gray-200` | `#CCCCCC` | 입력·버튼 보더 |
| `gray-100` | `#EEEEEE` | 구분선 전용 / hover 배경 |

**타이포그래피**

| 폰트 | 용도 |
|------|------|
| **Bebas Neue** | 헤더, 탭 타이틀, CTA 버튼 텍스트, 사이드바 섹션 타이틀 |
| **Pretendard** | Body, 입력 필드, 캡션, 안내 문구 |

**버튼 규격**

| 버튼 종류 | 높이 | 곡률 | 배경 | 텍스트 | 테두리 |
|-----------|------|------|------|--------|--------|
| CTA-primary (GENERATE) | 52px | pill (80px) | black | white | 없음 |
| CTA-secondary (EXPORT/SAVE) | 52px | pill | white | black | 1.5px solid black |
| CTA-options (모드 선택 탭) | 44px | box (10px) | white | black | 1.5px solid gray-200 / 선택: solid black |
| CTA-tertiary-small (인라인) | 28px | box | white | gray-500 | 1px solid gray-200 |

**사이드바 규격**

| 속성 | 값 |
|------|-----|
| 너비 | `18rem` (288px) |
| 내부 패딩 | `1.25rem` (20px) |
| 배치 | Floating (right: 1rem, top: 8rem, bottom: 1rem) |
| 그림자 | `0 10px 15px -3px rgba(0,0,0,0.1)` — 보더 없음 |

**인터랙션 전환**

| 전환 종류 | 속도 |
|-----------|------|
| 색상·배경 전환 | `150ms ease` |
| 크기·transform | `80ms ease` |
| 오버레이 등장 | `200ms ease-out` |

---

#### 9-C. Canvas 팀 역할 (AGENT C 담당 — Print 개발자 불필요)

Print 개발자가 작업 9-A를 완료한 후, Canvas 팀(AGENT C)이 수행합니다.

1. `print-canvas-overrides.css` 작성 — Print CSS 변수를 CAI 토큰으로 덮어씌움
2. Bebas Neue / Pretendard 폰트 로드 확인 (Canvas 앱에 이미 포함)
3. Print_ExpandedView / PrintSidebarPanel에 `className` prop으로 오버라이드 주입
4. `/audit` 스킬로 디자인 컴플라이언스 검증 (≥ 14/20 필요)

---

### 작업 10 — GitHub Packages 패키징 및 배포 (필수)

Print 컴포넌트를 npm 패키지(`@cai-crete/print-components`)로 배포합니다.  
Canvas를 포함한 모든 외부 노드 연결 프로젝트가 이 패키지를 통해 컴포넌트를 가져옵니다.

**배포 방식: 소스 배포 (Source Distribution)**  
별도 빌드 도구(tsup, rollup 등) 없이 TypeScript 소스 파일 그대로 배포합니다.  
Canvas Next.js 앱이 `transpilePackages` 설정으로 직접 컴파일합니다.

---

#### 10-A. 배럴 export 파일 생성

`project.10_print/lib/` 디렉토리를 신규 생성합니다.  
Canvas가 import할 항목만 이 창구를 통해 노출합니다.

```
project.10_print/
├── lib/                         ← NEW: 패키지 공개 API
│   ├── index.ts                 ← 배럴 export (Canvas가 import하는 진입점)
│   └── styles/
│       └── print-tokens.css     ← 작업 9-A에서 작성한 파일 복사
├── components/                  ← 기존 (변경 없음)
├── types/
│   └── print-canvas.ts          ← 작업 1에서 신규 작성
└── package.json                 ← 수정
```

```typescript
// project.10_print/lib/index.ts
export { PrintExpandedView } from '../components/Print_ExpandedView';
export { PrintSidebarPanel } from '../components/PrintSidebarPanel';
export type {
  PrintExpandedViewProps,
  PrintSidebarPanelProps,
  PrintSavedState,
  PrintSaveResult,
  SelectedImage,
} from '../types/print-canvas';
```

---

#### 10-B. `package.json` 업데이트

`project.10_print/package.json`에 패키지 배포 설정을 추가합니다.  
기존 `scripts`, `dependencies`는 그대로 유지합니다.

```json
{
  "name": "@cai-crete/print-components",
  "version": "0.1.0",
  "private": false,
  "main": "./lib/index.ts",
  "exports": {
    ".": "./lib/index.ts",
    "./styles/*": "./lib/styles/*"
  },
  "files": [
    "lib/",
    "components/",
    "types/print-canvas.ts"
  ],
  "peerDependencies": {
    "next": ">=15.0.0",
    "react": ">=19.0.0",
    "react-dom": ">=19.0.0"
  },
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  }
}
```

> `"files"` 배열: `Print_ExpandedView`와 `PrintSidebarPanel`이 내부 import하는  
> 하위 컴포넌트 디렉토리도 실제 구조에 맞게 추가합니다.  
> (예: `"components/panels/"`, `"hooks/"`, `"utils/"` 등)  
> `lib/`에서 상대 경로로 import하는 모든 파일이 누락 없이 포함되어야 합니다.

---

#### 10-C. `.npmrc` 생성

```ini
# project.10_print/.npmrc
@cai-crete:registry=https://npm.pkg.github.com
```

---

#### 10-D. GitHub Actions 워크플로우 생성

GitHub Release를 생성할 때마다 자동으로 패키지를 배포합니다.

```yaml
# cai-print-v3/.github/workflows/publish.yml
name: Publish @cai-crete/print-components

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://npm.pkg.github.com'
          scope: '@cai-crete'
      - name: Install dependencies
        working-directory: project.10_print
        run: npm ci
      - name: Publish to GitHub Packages
        working-directory: project.10_print
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

#### 10-E. 첫 릴리즈 배포

1. `package.json` version이 `0.1.0`인지 확인
2. GitHub → `cai-print-v3` 레포 → **Releases** → **"Create a new release"**
3. Tag: `v0.1.0` / Title: `v0.1.0 — Initial Canvas integration`
4. **Publish release** → GitHub Actions 자동 실행 → `@cai-crete/print-components@0.1.0` 배포 완료
5. Canvas 팀에 배포 완료 알림 (작업 8 항목 5)

---

#### 10-F. 이후 업데이트 버전 관리

컴포넌트 수정 시 semver 규칙에 따라 version을 올리고 새 GitHub Release를 생성합니다.

| 변경 유형 | 버전 | 예시 상황 |
|-----------|------|-----------|
| Patch `0.1.x` | 버그 수정, 스타일 미세 조정 | 토스트 타이밍 수정 |
| Minor `0.x.0` | 신규 prop 추가 (기존 코드 그대로 동작) | 옵션 prop 1개 추가 |
| Major `x.0.0` | Props 인터페이스 파괴적 변경 | `onSave` 시그니처 변경 |

> **Major 버전 업 시** Canvas 팀 코드 수정이 필요합니다. 반드시 사전에 알리고 일정을 조율합니다.

---

#### 10-G. Canvas 팀 일회성 설정 (Canvas 팀 담당 — Print 개발자 불필요)

Print 개발자가 10-E 첫 릴리즈를 배포한 후, Canvas 팀이 아래를 한 번만 설정합니다.

**① `project_canvas/.npmrc` 생성**

```ini
@cai-crete:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

**② 패키지 설치**

```bash
cd project_canvas
npm install @cai-crete/print-components
```

**③ `project_canvas/next.config.ts` 업데이트**

```typescript
const nextConfig = {
  transpilePackages: ['@cai-crete/print-components'],
  // 향후 다른 노드 패키지 추가 시 이 배열에 추가
  // '@cai-crete/elevation-components', '@cai-crete/diagram-components', ...
};
export default nextConfig;
```

**④ CSS 전역 import (`project_canvas/app/layout.tsx`)**

```typescript
import '@cai-crete/print-components/styles/print-tokens.css';
```

**⑤ Vercel 환경변수 추가**

Vercel Dashboard → Settings → Environment Variables:
- `GITHUB_TOKEN`: GitHub Personal Access Token (`packages:read` 권한)

**⑥ 컴포넌트 사용 방식**

```typescript
import { PrintExpandedView, PrintSidebarPanel } from '@cai-crete/print-components';
import type { PrintExpandedViewProps } from '@cai-crete/print-components';
```

---

## 4. API 계약 (동결 대상)

### `POST /api/print` — 문서/영상 생성

**요청 헤더:**
```
x-canvas-api-secret: <시크릿>
Content-Type: multipart/form-data
```

**요청 본문 (`multipart/form-data`):**

| 필드 | 타입 | 필수 | 설명 |
|------|------|:----:|------|
| `mode` | string | ✅ | `REPORT` / `PANEL` / `DRAWING` / `VIDEO` |
| `prompt` | string | - | 최대 2,000자 |
| `pageCount` | number | - | 생성 페이지 수 |
| `images` | File[] | ✅ (VIDEO 제외) | JPEG/PNG/WebP, 최대 20MB/장 |
| `videoStartImage` | File | VIDEO만 | 영상 시작 이미지 |
| `videoEndImage` | File | VIDEO만 | 영상 끝 이미지 (정확히 2장) |

**응답 (200):**

| 필드 | 타입 | 설명 |
|------|------|------|
| `html` | string | 완성 HTML (인라인 Base64 이미지 포함) |
| `slotMapping` | object | 슬롯 ID → 콘텐츠 매핑 |
| `masterData` | object | 프로젝트 메타데이터 |
| `executionLog` | object | 단계별 실행 로그 |
| `videoUri` | string | (VIDEO만) 생성 영상 URL |

**에러 응답:**

| HTTP 상태 | 원인 |
|-----------|------|
| `400` | 입력 형식 오류 |
| `401` | API 시크릿 불일치 |
| `500` | 에이전트 파이프라인 실패 |

---

### `GET /api/print/limits` — 모드별 이미지 장수 제한 (신규)

**응답 (200):**
```json
{
  "REPORT":  { "min": 1, "max": 10 },
  "PANEL":   { "min": 1, "max": 6 },
  "DRAWING": { "min": 1, "max": 4 },
  "VIDEO":   { "min": 2, "max": 2 }
}
```

> 수치는 Print 개발자가 실제 값으로 교체합니다.

---

## 5. Canvas 측 연동 흐름 (참고 — Canvas 팀 담당)

### A. 이미지 선택 → Print 실행

```
1. 사용자가 Canvas에서 'image' 아트보드 다중 선택
2. RightSidebar → PrintSidebarPanel의 '생성하기' 클릭
3. Canvas: 선택 이미지 수 사전 검사
      - savedState.mode 있음 → 해당 모드의 제한으로 검사
      - savedState 없음(신규) → 가장 관대한 제한(REPORT max)으로 사전 검사
      → 초과/미달 시 토스트 표시 후 중단 (최종 검사는 Print_ExpandedView 내부에서 재수행)
4. Canvas: 선택 이미지 base64 추출
5. Print_ExpandedView 오픈 (selectedImages + initialAction='generate' prop 주입)
6. Print_ExpandedView: INSERT IMAGE에 이미지 자동 로드 후 생성 즉시 시작
7. 생성 완료 → onSave({ html, thumbnail, mode, metadata }) 호출
8. Canvas: NodeCard 썸네일 갱신 + IndexedDB에 상태 저장
```

### B. 동기화 전략

Canvas가 상태의 주인이므로 별도의 실시간 동기화 인프라 불필요합니다.

| 이벤트 | 처리 |
|--------|------|
| Print 문서 생성 | `onSave()` → Canvas 상태 + NodeCard 썸네일 갱신 |
| Canvas에서 Print 아트보드 삭제 | Canvas 상태 삭제 (Print API 호출 불필요) |
| Print UI에서 문서 편집 | 편집 완료 후 `onSave()` → Canvas 상태 + 썸네일 갱신 |

### C. 환경변수 (Canvas 팀 추가 예정)

```
PRINT_API_URL=http://localhost:3777
PRINT_API_SECRET=<공유 시크릿>
```

---

## 6. 로컬 동시 실행

```bash
# 터미널 1 — Print 노드 (포트 3777)
cd cai-print-v3/project.10_print
npm run dev

# 터미널 2 — Canvas (포트 3900)
cd CAI/project_canvas
npm run dev
```

Canvas `.env.local`:
```
PRINT_API_URL=http://localhost:3777
PRINT_API_SECRET=<로컬 개발용 시크릿 또는 빈 값>
```

---

## 7. 완료 체크리스트

Print 노드 담당 개발자가 아래 항목 완료 후 Canvas 팀에 통보합니다.

**컴포넌트 전환:**
- [ ] `PrintExpandedViewProps` 인터페이스 구현 및 export
- [ ] `selectedImages` prop → INSERT IMAGE 자동 로드 동작
- [ ] `initialAction` prop → 해당 기능으로 즉시 진입
- [ ] `apiBaseUrl` prop → 모든 내부 fetch 호출에 prefix 적용
- [ ] `onSave` 호출 시 html2canvas 썸네일 생성 포함
- [ ] Standalone 모드 (onSave 없음) 기존 동작 유지 확인
- [ ] `PrintSidebarPanel` 컴포넌트 구현 및 export

**API 추가:**
- [ ] `GET /api/print/limits` 엔드포인트 구현 (실제 수치 입력)
- [ ] `maxDuration = 60` + `dynamic = 'force-dynamic'` — 모든 관련 route.ts 확인
- [ ] `CANVAS_API_SECRET` 검증 — /api/print 및 모든 연관 라우트 적용

**CORS 설정 (작업 6):**
- [ ] `project.10_print/middleware.ts` 신규 생성
- [ ] 허용 Origin: `https://cai-canvas-v2.vercel.app`, `http://localhost:3900`
- [ ] OPTIONS Preflight 처리 확인 (HTTP 204 응답)
- [ ] 미허용 Origin 차단 확인 (헤더 미포함)

**문서 제공 (Canvas 팀에 전달):**
- [ ] 컴포넌트 내부 API 호출 경로 전체 목록 (작업 3 형식)
- [ ] 이미지 장수 제한 실제 수치 (작업 4)
- [ ] `CANVAS_API_SECRET` 값 (보안 채널)
- [ ] Vercel 배포 URL 확정
- [ ] UI 컴포넌트 인벤토리 (작업 9-A ④ 형식)

**디자인 시스템 연동 준비 (작업 9):**
- [ ] `className` prop 추가 — PrintExpandedView, PrintSidebarPanel 루트 엘리먼트
- [ ] `print-tokens.css` 작성 및 export — 색상·폰트·간격·곡률 전부 CSS 변수화
- [ ] 컴포넌트 내부 하드코딩 색상·폰트 → CSS 변수로 전면 교체
- [ ] 인라인 style 속성에서 색상·폰트 제거 (`!important` 사용 금지)
- [ ] 최종 스타일링은 Canvas 팀(AGENT C)이 진행 — Print 개발자 불필요

**GitHub Packages 패키징 및 배포 (작업 10):**
- [ ] `project.10_print/lib/index.ts` 생성 — `PrintExpandedView`, `PrintSidebarPanel`, 타입 전체 export
- [ ] `lib/styles/print-tokens.css` 복사
- [ ] `package.json` 업데이트 — `name`, `version`, `main`, `exports`, `files`, `publishConfig` 추가
- [ ] `files` 배열에 하위 컴포넌트 디렉토리 전체 포함 확인 (누락 시 Canvas 빌드 오류)
- [ ] `project.10_print/.npmrc` 생성 (`@cai-crete:registry=https://npm.pkg.github.com`)
- [ ] `.github/workflows/publish.yml` 생성
- [ ] GitHub Release `v0.1.0` 생성 → Actions 자동 실행 → 패키지 배포 확인
- [ ] Canvas 팀에 배포 완료 및 버전 알림

---

`COPYRIGHTS 2026. CRE-TE CO.,LTD. ALL RIGHTS RESERVED.`
