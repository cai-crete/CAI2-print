# [260424] Print 노드 Canvas 연동 실행 계획서

**작성일**: 2026-04-24  
**작성자**: AGENT A (Claude)  
**상태**: 승인 대기  
**관련 레포**: https://github.com/cai-crete/cai-print-v3  
**Print 인수인계 보고서**: connect_canvas/Print-Handover_Report-260424.md

---

## 1. 현황 요약

### Print 노드 측 완료 항목 (cai-print-v3)

| # | 항목 | 상태 |
|---|------|------|
| 1 | `Print_ExpandedView` Controlled 컴포넌트화 (`selectedImages`, `savedState`, `initialAction`, `apiBaseUrl`, `onSave`, `onDelete`) | ✅ 완료 |
| 2 | **Slot (Render Props) 패턴** 도입 — `renderToolbarWrapper`, `renderSidebarWrapper` (작업지시서 대비 추가 구현) | ✅ 완료 |
| 3 | `PrintSidebarPanel` 컴포넌트 신규 개발 | ✅ 완료 |
| 4 | `GET /api/print/limits` 엔드포인트 추가 | ✅ 완료 |
| 5 | CORS `middleware.ts` (Canvas 운영·로컬 허용) | ✅ 완료 |
| 6 | `x-canvas-api-secret` 헤더 검증 | ✅ 완료 |
| 7 | `print-tokens.css` CSS 변수화 (하드코딩 제거) | ✅ 완료 |
| 8 | `lib/index.ts` 배럴 export + `package.json` + `.npmrc` + GitHub Actions | ✅ 완료 |
| 9 | 로컬 standalone UI 깨짐 수정 | ✅ 완료 |

### 미확인 사항 (구현 전 반드시 확인)

| # | 확인 항목 | 담당 |
|---|-----------|------|
| A | `@cai-crete/print-components@0.1.0` GitHub Packages 실제 배포 완료 여부 | Print 개발자 |
| B | `CANVAS_API_SECRET` 값 생성 후 Print 개발자에게 전달 (보안 채널) | **Canvas 팀** → Print 개발자 |
| C | `renderToolbarWrapper`에 전달되는 `tools` 객체의 키 목록 확인 (코드 직접 확인) | Canvas 팀 |

---

## 2. Canvas 현재 상태 파악

| 항목 | 현황 | 비고 |
|------|------|------|
| `types/canvas.ts` — `NodeType` | `'print'` 이미 포함됨 | 추가 불필요 |
| `ARTBOARD_COMPATIBLE_NODES.image` | `'print'` 이미 포함됨 | 추가 불필요 |
| `NodeCard.tsx` | `hasThumbnail`, `thumbnailData` 썸네일 표시 로직 있음 | 재사용 가능 |
| `RightSidebar.tsx` | 패널 모드 구조 있음 (`SketchToImagePanel` 사례 참고) | 확장 방식 동일 |
| `ExpandedView.tsx` | 노드별 확대 뷰 분기 있음 | Print 분기 추가 필요 |
| `app/api/print-proxy/` | 없음 | 신규 생성 |
| `.env.local` | 없음 | 신규 생성 |
| `next.config.ts` — `transpilePackages` | 없음 | 추가 필요 |
| `@cai-crete/print-components` 패키지 | 미설치 | 설치 필요 |

---

## 3. 아키텍처 (확정)

```
[Canvas 브라우저]
  ├── RightSidebar (Print 아트보드 선택 시)
  │     └── PrintSidebarPanel (npm 패키지)
  │           onAction('generate'|'library'|'video')
  │                 ↓
  │           Canvas: initialAction 설정 + Print_ExpandedView 열기
  │
  ├── Print_ExpandedView (npm 패키지, ExpandedView 내부에 마운트)
  │     ├── props: selectedImages, savedState, initialAction, apiBaseUrl
  │     ├── renderToolbarWrapper → Canvas 좌측 툴바 슬롯
  │     ├── renderSidebarWrapper → Canvas 우측 사이드바 슬롯
  │     └── 내부 API: fetch(`${apiBaseUrl}/api/*`)
  │                          ↓
  │              [Canvas 서버 /api/print-proxy/*]
  │                          ↓ 서버-투-서버
  │              [Print 서버 https://cai-print-v3.vercel.app/api/*]
  │                    (헤더: x-canvas-api-secret)
  │
  └── NodeCard (Print 아트보드)
        ├── 썸네일: onSave({ thumbnail }) → thumbnailData 갱신
        └── 상태: Canvas IndexedDB 보관 (PrintSavedState)
```

### Slot (Render Props) 패턴 — 핵심 변경점

Print 개발자가 원래 작업지시서에 없던 `renderToolbarWrapper`, `renderSidebarWrapper` Slot 패턴을 추가 구현했습니다.

**의미**: `Print_ExpandedView`가 자체 Toolbar/Sidebar UI를 렌더링하는 대신, Canvas가 래퍼 함수를 주입하여 Print의 기능 버튼들을 Canvas 디자인 시스템 안에 재배치할 수 있음.

**Canvas 구현 예시:**
```tsx
<PrintExpandedView
  selectedImages={images}
  savedState={printState}
  initialAction={initialAction}
  apiBaseUrl="/api/print-proxy"
  onSave={handlePrintSave}
  onDelete={handlePrintDelete}
  renderToolbarWrapper={(tools) => (
    // tools.undo, tools.redo, tools.library, tools.save 등
    // Canvas LeftToolbar 스타일로 배치
    <div className="canvas-print-toolbar">
      {tools.undo}
      {tools.redo}
      <hr className="toolbar-divider" />
      {tools.library}
      {tools.save}
    </div>
  )}
  renderSidebarWrapper={(printPanels) => (
    // Canvas RightSidebar 스타일로 감싸기
    <div className="canvas-print-sidebar">
      {printPanels}
    </div>
  )}
/>
```

> `tools` 객체의 정확한 키 목록은 `cai-print-v3/components/Print_ExpandedView.tsx`를 직접 확인하여 파악해야 합니다. (미확인 사항 C)

---

## 4. 구현 계획 (Phase별)

### Phase 0 — 사전 확인 (구현 전, ~1시간)

**Canvas 팀 직접 처리:**

1. `CANVAS_API_SECRET` 값을 Canvas 팀이 직접 생성 (임의의 안전한 문자열)하고, Print 개발자에게 보안 채널로 전달.  
   Print 개발자는 이 값을 자신의 `.env.local`과 Vercel에 등록함.
   ```bash
   # 예시: 안전한 시크릿 생성
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. GitHub Packages 배포 확인:
   ```bash
   # GitHub → cai-print-v3 → Packages 탭에서 @cai-crete/print-components 확인
   ```
3. `cai-print-v3/components/Print_ExpandedView.tsx` 코드에서 `renderToolbarWrapper` 콜백으로 전달되는 `tools` 키 목록 확인

---

### Phase 1 — 환경 설정 (~1시간)

**파일 생성/수정:**

#### 1-A. `project_canvas/.npmrc` (신규)
```ini
@cai-crete:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

#### 1-B. `project_canvas/.env.local` (신규)
```env
PRINT_API_URL=https://cai-print-v3.vercel.app
CANVAS_API_SECRET=<Phase 0에서 Canvas 팀이 직접 생성한 값>
GITHUB_TOKEN=<packages:read 권한 GitHub PAT>
```
> 로컬 개발 시: `PRINT_API_URL=http://localhost:3777`  
> `CANVAS_API_SECRET` 동일 값을 Print 개발자에게도 전달해야 Print 서버에서 검증 가능

#### 1-C. 패키지 설치
```bash
cd project_canvas
npm install @cai-crete/print-components
```

#### 1-D. `project_canvas/next.config.ts` 수정
```typescript
const nextConfig: NextConfig = {
  images: { unoptimized: true },
  transpilePackages: ['@cai-crete/print-components'],
};
```

#### 1-E. `project_canvas/app/layout.tsx` 수정
```typescript
import '@cai-crete/print-components/styles/print-tokens.css';
// 기존 import 아래에 추가
```

---

### Phase 2 — 프록시 라우트 (~30분)

**파일 생성:** `project_canvas/app/api/print-proxy/[...path]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

const PRINT_API_URL = process.env.PRINT_API_URL!;
const CANVAS_API_SECRET = process.env.CANVAS_API_SECRET;

async function proxyRequest(request: NextRequest, params: { path: string[] }) {
  const targetPath = params.path.join('/');
  const targetUrl = `${PRINT_API_URL}/api/${targetPath}${
    request.nextUrl.search
  }`;

  const headers = new Headers(request.headers);
  headers.set('host', new URL(PRINT_API_URL).host);
  if (CANVAS_API_SECRET) {
    headers.set('x-canvas-api-secret', CANVAS_API_SECRET);
  }

  const body = ['GET', 'HEAD'].includes(request.method)
    ? undefined
    : await request.blob();

  const res = await fetch(targetUrl, {
    method: request.method,
    headers,
    body,
  });

  return new NextResponse(res.body, {
    status: res.status,
    headers: res.headers,
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(request, params);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(request, params);
}

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
```

---

### Phase 3 — Print 상태 타입 추가 (~20분)

**파일 수정:** `project_canvas/types/canvas.ts`

```typescript
// 하단에 추가
export interface PrintSavedState {
  html: string;
  mode: 'REPORT' | 'PANEL' | 'DRAWING' | 'VIDEO';
  prompt?: string;
  savedAt: string;
}

export interface PrintSaveResult {
  html: string;
  thumbnail: string;
  mode: 'REPORT' | 'PANEL' | 'DRAWING' | 'VIDEO';
  metadata: Record<string, unknown>;
}

export const PRINT_IMAGE_LIMITS = {
  REPORT:  { min: 1, max: 10 },
  PANEL:   { min: 1, max: 6  },
  DRAWING: { min: 1, max: 4  },
  VIDEO:   { min: 2, max: 2  },
} as const;
// 수치는 GET /api/print/limits 응답으로 교체하거나, Print 개발자 확인 후 정확히 업데이트
```

---

### Phase 4 — Print_ExpandedView 마운트 (~3시간)

**파일 수정:** `project_canvas/components/ExpandedView.tsx`

Print 아트보드 타입일 때 기존 확대 뷰 대신 `Print_ExpandedView`를 렌더링합니다.

```typescript
// import 추가
import { PrintExpandedView } from '@cai-crete/print-components';
import type { PrintSaveResult } from '@cai-crete/print-components';

// Print 노드 분기 (node.type === 'print' 또는 artboardType 기준)
if (node.type === 'print') {
  return (
    <PrintExpandedView
      selectedImages={selectedImages}           // Canvas에서 전달
      savedState={printSavedStates[node.id]}    // IndexedDB에서 복원
      initialAction={initialAction}             // 사이드바 액션에서 설정
      apiBaseUrl="/api/print-proxy"
      onSave={(result: PrintSaveResult) => {
        // 1. NodeCard 썸네일 갱신
        updateNodeThumbnail(node.id, result.thumbnail);
        // 2. Canvas 상태에 PrintSavedState 저장
        savePrintState(node.id, {
          html: result.html,
          mode: result.mode,
          savedAt: new Date().toISOString(),
        });
        // 3. IndexedDB 저장 (선택)
      }}
      onDelete={() => {
        deletePrintState(node.id);
      }}
      renderToolbarWrapper={(tools) => (
        // Phase 0에서 확인한 tools 키 목록 기반으로 구현
        // Canvas LeftToolbar 스타일 적용
        <div className="canvas-print-toolbar">
          {Object.values(tools)}
        </div>
      )}
      renderSidebarWrapper={(printPanels) => (
        <div className="canvas-print-sidebar-panels">
          {printPanels}
        </div>
      )}
    />
  );
}
```

> `renderToolbarWrapper`의 `tools` 키 목록은 Phase 0 확인 후 정확히 채웁니다.

---

### Phase 5 — PrintSidebarPanel 마운트 (~1시간)

**파일 수정:** `project_canvas/components/RightSidebar.tsx`

`SketchToImagePanel` 마운트 패턴과 동일하게 Print 분기를 추가합니다.

```typescript
// import 추가
import { PrintSidebarPanel } from '@cai-crete/print-components';

// Print 아트보드 선택 시 분기 (기존 패널 모드 분기 안에 추가)
if (activeSidebarNodeType === 'print') {
  return (
    <PrintSidebarPanel
      savedState={printSavedStates[selectedNodeId]}
      thumbnail={printThumbnails[selectedNodeId]}
      onAction={(action) => {
        setInitialAction(action);
        onNavigateToExpand(); // Canvas ExpandedView 열기
      }}
    />
  );
}
```

---

### Phase 6 — 이미지 선택 → Print 실행 플로우 (~2시간)

**파일 수정:** `project_canvas/app/page.tsx` (또는 상태 관리 파일)

Canvas에서 `image` 아트보드를 다중 선택한 뒤 Print 노드로 보내는 플로우입니다.

```typescript
// 이미지 아트보드 다중 선택 → Print 실행 핸들러
const handleSendToPrint = async (selectedImageNodes: CanvasNode[]) => {
  // 1. 이미지 base64 추출
  const images = await Promise.all(
    selectedImageNodes.map(async (node) => ({
      id: node.id,
      base64: node.thumbnailData!, // 기존 thumbnailData 사용
      mimeType: 'image/jpeg' as const,
    }))
  );

  // 2. 장수 사전 검증
  const currentMode = printSavedStates[printNodeId]?.mode ?? 'REPORT';
  const limit = PRINT_IMAGE_LIMITS[currentMode];
  if (images.length < limit.min || images.length > limit.max) {
    showToast(`이미지는 ${limit.min}~${limit.max}장이어야 합니다.`);
    return;
  }

  // 3. Print_ExpandedView로 전달
  setSelectedImages(images);
  setInitialAction('generate');
  openPrintExpandedView(printNodeId);
};
```

---

### Phase 7 — 디자인 오버라이드 (AGENT C 담당)

`print-tokens.css`의 CSS 변수를 CAI Canvas 디자인 시스템 토큰으로 덮어씁니다.

**파일 생성:** `project_canvas/app/print-canvas-overrides.css`

```css
/* CAI Canvas 디자인 시스템 → Print CSS 변수 매핑 */
:root {
  --print-color-primary:    #000000;  /* CAI black */
  --print-color-on-primary: #FFFFFF;
  --print-color-text:       #333333;  /* gray-500 */
  --print-color-text-muted: #666666;  /* gray-400 */
  --print-color-border:     #CCCCCC;  /* gray-200 */
  --print-color-bg:         #FFFFFF;
  --print-font-display:     'Bebas Neue', sans-serif;
  --print-font-body:        'Pretendard', sans-serif;
  --print-radius-pill:      5rem;
  --print-radius-box:       0.625rem;
}
```

`app/layout.tsx`에 `print-tokens.css` 다음 줄에 import 추가.

`/audit` 스킬로 디자인 컴플라이언스 검증 (목표: 14/20 이상).

---

## 5. 구현 순서 및 예상 소요 시간

| Phase | 작업 | 소요 예상 |
|-------|------|-----------|
| 0 | 사전 확인 (API_SECRET 수령, 패키지 배포 확인, tools 키 확인) | ~1시간 |
| 1 | 환경 설정 (.npmrc, .env.local, npm install, next.config.ts, layout.tsx) | ~1시간 |
| 2 | 프록시 라우트 | ~30분 |
| 3 | Print 상태 타입 추가 | ~20분 |
| 4 | Print_ExpandedView 마운트 (Slot 패턴 포함) | ~3시간 |
| 5 | PrintSidebarPanel 마운트 | ~1시간 |
| 6 | 이미지 선택 → Print 실행 플로우 | ~2시간 |
| 7 | 디자인 오버라이드 (AGENT C) | ~1~2시간 |
| — | **합계** | **약 9~11시간 (1.5~2일)** |

---

## 6. 리스크 및 주의사항

| 리스크 | 내용 | 대응 |
|--------|------|------|
| 패키지 미배포 | GitHub Packages v0.1.0이 실제로 배포되지 않았을 경우 | Print 개발자에게 배포 요청 또는 소스 직접 복사 임시 대응 |
| Slot tools 키 불일치 | `renderToolbarWrapper`에 전달되는 `tools`의 실제 구조가 예상과 다를 경우 | Phase 0에서 소스 코드 직접 확인 후 구현 |
| `CANVAS_API_SECRET` 미전달 | Canvas 팀이 생성한 값을 Print 개발자에게 전달하지 않은 경우 | 빈 값으로 개발 후 배포 전 양측 동기화 (Print 서버도 secret 없으면 통과하는 로직) |
| `print-tokens.css` import 누락 | Canvas 앱에서 Print 컴포넌트 UI 깨짐 | `app/layout.tsx` import 확인 필수 (인수인계 보고서 트러블슈팅 사례 참조) |
| `transpilePackages` 미적용 | TypeScript 소스 패키지 빌드 실패 | `next.config.ts` 반드시 먼저 적용 |

---

## 7. 체크리스트

### Phase 0: 사전 확인
- [ ] `@cai-crete/print-components@0.1.0` GitHub Packages 배포 확인
- [ ] `CANVAS_API_SECRET` 값 Canvas 팀이 직접 생성 → Print 개발자에게 전달 (보안 채널)
- [ ] `Print_ExpandedView.tsx` 코드에서 `tools` 객체 키 목록 확인

### Phase 1: 환경 설정
- [ ] `project_canvas/.npmrc` 생성
- [ ] `project_canvas/.env.local` 생성 (PRINT_API_URL, CANVAS_API_SECRET, GITHUB_TOKEN)
- [ ] `npm install @cai-crete/print-components` 성공
- [ ] `next.config.ts` — `transpilePackages` 추가
- [ ] `app/layout.tsx` — `print-tokens.css` import 추가

### Phase 2: 프록시 라우트
- [ ] `app/api/print-proxy/[...path]/route.ts` 생성
- [ ] GET / POST 모두 동작 확인
- [ ] `x-canvas-api-secret` 헤더 포함 확인

### Phase 3: 타입 추가
- [ ] `PrintSavedState`, `PrintSaveResult` 타입 추가
- [ ] `PRINT_IMAGE_LIMITS` 상수 추가 (실제 수치 확인 후 업데이트)

### Phase 4: Print_ExpandedView 마운트
- [ ] Print 노드 ExpandedView 분기 구현
- [ ] `renderToolbarWrapper` 슬롯 구현
- [ ] `renderSidebarWrapper` 슬롯 구현
- [ ] `onSave` → 썸네일 갱신 + 상태 저장 동작 확인
- [ ] `onDelete` → 상태 삭제 동작 확인

### Phase 5: PrintSidebarPanel 마운트
- [ ] RightSidebar에 Print 분기 추가
- [ ] `onAction` → ExpandedView 열기 동작 확인
- [ ] `savedState`, `thumbnail` 표시 확인

### Phase 6: 이미지 선택 → Print 실행
- [ ] 다중 이미지 선택 → Print 실행 버튼 UI
- [ ] 장수 초과/미달 시 토스트 표시
- [ ] `selectedImages` prop → Print_ExpandedView 전달 확인

### Phase 7: 디자인 오버라이드 (AGENT C)
- [ ] `print-canvas-overrides.css` 작성
- [ ] `/audit` 스킬 검증 ≥ 14/20

---

`COPYRIGHTS 2026. CRE-TE CO.,LTD. ALL RIGHTS RESERVED.`
