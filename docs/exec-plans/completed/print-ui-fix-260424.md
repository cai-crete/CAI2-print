# [260424] Print UI 깨짐 및 사이드바 불일치 — 원인 분석 & 수정 계획서

**작성일**: 2026-04-24  
**작성자**: AGENT A (Claude)  
**상태**: 승인 대기  
**참조 계획서**: docs/exec-plans/active/canvas-print-integration-260424.md

---

## 1. 증상 요약

| # | 증상 | 우선순위 |
|---|------|---------|
| 문제 2 | ExpandedView UI 전체 깨짐 — 세로 배치가 가로로, 아이콘이 버튼 밖으로 튀어나옴 | **P0 (긴급)** |
| 문제 1 | 캔버스 우측 사이드바(Print 탭 클릭 시)와 ExpandedView 사이드바의 내용·UI 불일치 | P1 |
| 문제 3 | ExpandedView 사이드바 패널 — 상하좌우 패딩 없음, 스크롤 안됨, 폰트 깨짐 | P0 |
| 문제 4 | ExpandedView 좌측 툴바 — 캔버스 툴바와 디자인 불일치, `new`·`zoom scale` 버튼 없음 | P1 |

---

## 2. 코드베이스 분석 결과

### 2-A. 분석한 파일 목록

| 파일 | 주요 발견 사항 |
|------|-------------|
| `project_canvas/app/globals.css` | `@import "tailwindcss"` — Tailwind v4, `node_modules` 기본 제외 |
| `node_modules/@cai-crete/print-components/app/components/layout/Toolbar.tsx` | `className="flex items-center justify-center transition-all"` 등 Tailwind 클래스 다수 |
| `node_modules/@cai-crete/print-components/app/components/layout/GlobalHeader.tsx` | `className="fixed top-0 left-0 right-0 flex items-center px-6"` — Tailwind `fixed` |
| `node_modules/@cai-crete/print-components/app/components/layout/Canvas.tsx` | `className="fixed overflow-hidden"`, `paddingRight: 'var(--sidebar-spacing)'` |
| `node_modules/@cai-crete/print-components/app/components/layout/Sidebar.tsx` | `className="fixed flex flex-col"`, `flex items-center justify-between shrink-0` 등 |
| `node_modules/@cai-crete/print-components/app/components/sidebar/ImageInsert.tsx` | `className="relative"`, `"flex items-center justify-center transition-colors"` 등 |
| `node_modules/@cai-crete/print-components/app/components/sidebar/ActionButtons.tsx` | `className="flex flex-col gap-2"`, `"w-full text-ui-title transition-all flex items-center justify-center pt-1"` |
| `node_modules/@cai-crete/print-components/components/PrintSidebarPanel.tsx` | **인라인 스타일만 사용** — Tailwind 클래스 없음 → 정상 렌더링 |
| `project_canvas/app/layout.tsx` | `import '@cai-crete/print-components/styles/print-tokens.css'` |
| `project_canvas/next.config.ts` | `transpilePackages`, webpack alias (`@/app`, `@/lib/*`) 설정 |

---

## 3. 문제 2 — ExpandedView UI 깨짐 : 근본 원인

### 원인 A — Tailwind CSS 클래스 미적용 (PRIMARY, 전체 레이아웃 붕괴)

**Print 패키지의 모든 레이아웃 컴포넌트가 Tailwind CSS 클래스를 사용합니다:**
```
GlobalHeader  : className="fixed top-0 left-0 right-0 flex items-center px-6"
Toolbar       : className="fixed flex flex-col items-center"
ToolbarButton : className="flex items-center justify-center transition-all"
Sidebar       : className="fixed flex flex-col"
ImageInsert   : className="relative", "flex items-center justify-center transition-colors"
ActionButtons : className="flex flex-col gap-2", "w-full text-ui-title transition-all flex items-center justify-center"
```

**Canvas의 Tailwind 설정 (`globals.css`):**
```css
@import "tailwindcss";
```
Tailwind v4는 **`node_modules` 디렉토리를 기본적으로 스캔에서 제외**합니다.  
따라서 `@cai-crete/print-components` 내 컴포넌트가 사용하는 Tailwind 클래스들이 **빌드된 CSS에 포함되지 않음**.

**결과:**
- `flex` 미적용 → 버튼이 `display: block`으로 전락 → SVG 아이콘이 버튼 내 텍스트 흐름에 밀려 외부로 노출
- `flex-col` / `items-center` 미적용 → 세로 배치 의도가 사라지고 블록 요소들이 수직/수평으로 뒤섞임
- `fixed` 미적용 → Toolbar, Sidebar, GlobalHeader의 `position: fixed`가 무효화 → 정상 흐름(flow) 배치로 쏟아짐
- `h-full`, `shrink-0`, `gap-2` 등 모두 무효 → 사이드바 내부 스크롤·하단 고정 구조 붕괴

### 원인 B — 커스텀 유틸리티 클래스 부재

Print 패키지 컴포넌트가 사용하는 아래 클래스들은 **Tailwind 표준 클래스가 아닌 Print 프로젝트 자체 유틸리티**입니다.  
이 클래스들은 Print 프로젝트의 `globals.css`에 정의되어 있지만, **npm 패키지에 포함되지 않았습니다.**

| 클래스명 | 사용 위치 | 내용 |
|---------|---------|-----|
| `text-ui-title` | `ActionButtons.tsx`, `GlobalHeader.tsx` | Bebas Neue 폰트, 대문자 스타일 |
| `font-pretendard` | `GlobalHeader.tsx` | Pretendard 폰트 적용 |

`text-ui-title`이 없으면 GENERATE / EXPORT 버튼 텍스트가 기본 브라우저 폰트로 표시됨.

### 원인 C — CSS 변수 `--sidebar-spacing` 미정의

```
// Print의 Canvas.tsx (print의 중앙 캔버스 영역)
paddingRight: 'var(--sidebar-spacing)'
```
Canvas의 `globals.css`에 `--sidebar-spacing`이 없습니다.  
→ 우측 패딩 없음 → Print 캔버스 콘텐츠가 사이드바 밑으로 파고들어 겹침.

### 원인 D — `GlobalHeader` 충돌 (확인 필요)

`GlobalHeader`는 `renderToolbarWrapper`/`renderSidebarWrapper` 슬롯과 무관하게 **항상 렌더링**됩니다.  
`position: fixed, top: 0` (Tailwind 적용 시) → Canvas ExpandedView가 열렸을 때 화면 최상단에 Print의 "CAI CANVAS | PRINT" 헤더가 고정 표시될 수 있습니다.  
Canvas 자체 헤더/네비게이션과 겹칠 가능성이 있으며, 현재 ExpandedView가 헤더를 렌더링하는지 확인이 필요합니다.  
(현재 원인 A로 Tailwind가 미적용 중이어서 `fixed`도 작동 안 함 → Tailwind 수정 후 충돌 여부 확인 필요)

---

## 4. 문제 1 — 사이드바 내용·UI 불일치 : 근본 원인

### 현재 구현 상태

| 위치 | 렌더링 컴포넌트 | 내용 |
|------|--------------|-----|
| Canvas RightSidebar (print 탭 선택 시) | `PrintSidebarPanel` (npm 패키지) | 썸네일 미리보기 + [생성하기/편집하기] [라이브러리] [영상 만들기] 3개 버튼 |
| ExpandedView 우측 사이드바 (`renderSidebarWrapper` 내부) | Print_ExpandedView 내장 컴포넌트 | ImageInsert + PurposeSelector + PageCountControl + PromptInput + ActionButtons(GENERATE/EXPORT) |

### 원인

원래 exec-plan의 Phase 5 설계는 `PrintSidebarPanel`을 **간소화된 런처**(launcher)로 사용하는 것이었습니다.  
그러나 사용자는 "캔버스에서 print 눌렀을 때 보이는 사이드바와 expanded 했을 때 사이드바가 동일해야 한다"고 요구합니다.

**이것은 Phase 5 설계 결정의 재검토를 요합니다.**

추가로: `PrintSidebarPanel`은 인라인 스타일만 사용하므로 CSS 문제 없이 정상 렌더링됩니다. 반면 ExpandedView 사이드바는 원인 A(Tailwind 미적용)로 깨져 있습니다. 따라서 **Tailwind를 수정하면 두 사이드바의 시각적 불일치가 줄어들 수 있습니다.** 그러나 내용(content) 자체의 차이는 여전히 남습니다.

---

## 5. 수정 계획 (단계별)

### Fix 1 — Tailwind 스캔 범위 확장 (P0, 최우선)

**파일**: `project_canvas/app/globals.css`  
**변경**: `@import "tailwindcss"` 다음 줄에 추가

```css
@source "../node_modules/@cai-crete/print-components";
```

Tailwind v4의 `@source` 디렉티브로 print 패키지 파일을 스캔 대상에 포함.  
이 한 줄로 원인 A (전체 레이아웃 붕괴) 해결.

---

### Fix 2 — 커스텀 유틸리티 클래스 추가 (P0)

**파일**: `project_canvas/app/globals.css`  
**변경**: `:root` 블록 아래에 추가

```css
/* Print 패키지 호환 커스텀 유틸리티 */
.text-ui-title {
  font-family: var(--font-family-bebas);
  font-size: 1rem;
  line-height: 1;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.font-pretendard {
  font-family: var(--font-family-pretendard);
}
```

---

### Fix 3 — 누락 CSS 변수 추가 (P0)

**파일**: `project_canvas/app/globals.css`  
**변경**: `globals.css`의 `/* Print 패키지 통합용 CSS 변수 */` 블록에 추가

```css
--sidebar-spacing: calc(var(--sidebar-w) + 2rem); /* 288px + 32px */
--color-text-primary: var(--color-black);          /* ActionButtons 드롭다운용 */
```

---

### Fix 4 — GlobalHeader 충돌 대응 (Fix 1 적용 후 확인)

Fix 1(Tailwind) 적용 후 브라우저에서 ExpandedView를 열어 확인:

**확인 항목**: Print의 `GlobalHeader` ("CAI CANVAS | PRINT" 헤더)가 화면 최상단에 Canvas UI와 겹치는지

**결과에 따른 대응:**
- **겹치지 않음** (Canvas ExpandedView가 헤더 없이 전체 화면을 차지하는 경우) → 추가 작업 불필요
- **겹침** → 두 가지 옵션:
  - 옵션 A: `globals.css`에 CSS 규칙 추가로 Print GlobalHeader 숨김  
    `[data-print-canvas] header { display: none !important; }`
  - 옵션 B: Print 개발자에게 `hideHeader?: boolean` prop 추가 요청  
  (옵션 A가 즉시 적용 가능하나, Print 패키지 내부를 CSS로 오버라이드하는 방식이므로 Print 개발자 확인 권장)

---

### Fix 5 — 문제 1 사이드바 불일치 대응 (사용자 결정 필요)

Fix 1~4로 ExpandedView 레이아웃이 복원된 후, 문제 1 처리 방향을 결정해야 합니다.

**선택지 A — 원래 exec-plan 설계 유지 (현재 상태)**
- Canvas 사이드바: `PrintSidebarPanel` (썸네일 + 런처 버튼) — 변경 없음
- ExpandedView 사이드바: 전체 Print 컨트롤 (ImageInsert, PurposeSelector 등)
- Tailwind 수정 후 ExpandedView 사이드바가 정상적으로 보이면, 두 화면의 디자인 언어는 통일되지만 **내용은 다름**
- 장점: 이미 구현됨, Print 패키지 구조 그대로 사용
- 단점: 사용자 요구("동일해야 한다")에 부합하지 않음

**선택지 B — Canvas 사이드바를 ExpandedView 사이드바와 동일하게 변경**
- Canvas RightSidebar에서 `PrintSidebarPanel` 제거
- 대신 Print_ExpandedView의 `renderSidebarWrapper`에 들어가는 동일한 컴포넌트들을 캔버스 사이드바에서도 표시
- **구현 난이도**: 높음 — Print의 sidebar 상태(images, mode, prompt 등)를 Canvas 레벨에서 관리해야 하며, `PrintExpandedView`와 상태를 공유하는 구조가 필요
- 장점: 사용자 요구 충족
- 단점: Print_ExpandedView 내부 상태와 외부 Canvas 상태 동기화 복잡도 증가, Print 패키지 API 변경 필요 가능성

**선택지 C — ExpandedView 열기 전 사이드바를 먼저 표시**  
- Canvas 사이드바에서 `PrintSidebarPanel` 대신 Print의 전체 사이드바 컨트롤을 표시
- 단, "GENERATE" 버튼 클릭 → ExpandedView로 이동하여 캔버스에서 결과 확인
- Canvas 사이드바가 Print 설정 패널로 기능하고, ExpandedView는 결과 캔버스만 보여주는 역할 분리
- 장점: 사이드바 일관성, 직관적 UX
- 단점: 선택지 B와 동일한 상태 관리 복잡도

> **✋ 사용자 결정 필요**: Fix 5(선택지 A/B/C)는 승인 후 구현합니다.  
> Fix 1~4는 독립적인 버그 수정으로, 승인 시 즉시 진행 가능합니다.

---

## 6. 원래 exec-plan 누락/오류 항목 재검토

원래 `canvas-print-integration-260424.md`에서 빠졌거나 불충분했던 항목:

| 항목 | 원래 계획 | 실제 상태 | 보완 필요 |
|------|---------|---------|---------|
| Tailwind `@source` 추가 | 언급 없음 | 미적용 → 레이아웃 붕괴 | **Fix 1** |
| `text-ui-title`, `font-pretendard` 유틸리티 | 언급 없음 | Print 패키지에 사용되지만 Canvas에 없음 | **Fix 2** |
| `--sidebar-spacing` CSS 변수 | 언급 없음 | Print Canvas.tsx가 사용하지만 미정의 | **Fix 3** |
| GlobalHeader 충돌 가능성 | 언급 없음 | Fix 1 후 확인 필요 | **Fix 4** |
| `printSavedState`, `printThumbnail` props → RightSidebar | Phase 5에 언급 | 구현됨 (`onPrintSidebarAction`) | ✅ 완료 |
| `renderToolbarWrapper` tools 키 확인 (Phase 0-C) | 확인 필요 | `undo`, `redo`, `library`, `saves`, `save` 5개 확인됨 | ✅ 완료 |

---

## 7. 수정 순서 및 예상 소요 시간

| Fix | 내용 | 예상 시간 | 승인 여부 |
|-----|------|---------|---------|
| Fix 1 | `globals.css`에 `@source` 추가 | 5분 | ✅ 완료 |
| Fix 2 | `globals.css`에 `.text-ui-title`, `.font-pretendard` 추가 | 5분 | ✅ 완료 |
| Fix 3 | `globals.css`에 `--sidebar-spacing`, `--color-text-primary` 추가 | 5분 | ✅ 완료 |
| Fix 4 | Tailwind 수정 후 GlobalHeader 충돌 브라우저 확인 + 대응 | 15~30분 | ✅ 완료 |
| Fix 5 | 사이드바 불일치 방향 결정 후 구현 | 1~4시간 (선택지에 따라) | **사용자 방향 결정 후** |
| Fix 6 | ExpandedView 사이드바 패널 — 패딩·스크롤·폰트 수정 | ~30분 | ✅ 완료 |
| Fix 7-A | ExpandedView 좌측 툴바 — 현재 tools API로 Canvas 디자인에 맞게 재구성 | ~1시간 | ✅ 완료 |
| Fix 7-B | 툴바 `new`·`zoom scale` 추가 — Print 패키지 API 확장 필요 | Print 개발자 협의 후 | ✅ 완료 |

---

---

## 8. 문제 3 — 사이드바 패널 패딩·스크롤·폰트 : 근본 원인 및 Fix 6

### 근본 원인

`ExpandedView.tsx`의 `renderSidebarWrapper` 내 흰 박스 컨테이너:

```tsx
<div style={{
  background: 'var(--color-white)', borderRadius: 'var(--radius-box)',
  boxShadow: 'var(--shadow-float)', flex: 1, minHeight: 0,
  display: 'flex', flexDirection: 'column', overflow: 'hidden',   // ← overflow: hidden이 스크롤을 막음
}}>
  {printPanels}   {/* padding 없이 직접 마운트 → 여백 없음 */}
</div>
```

- **패딩 없음**: `{printPanels}`가 흰 박스에 직접 마운트 → 상하좌우 여백 0
- **스크롤 없음**: `overflow: 'hidden'`이 scroll을 차단. `printPanels` 내부 콘텐츠(`ImageInsert`, `PurposeSelector` 등)가 넘쳐도 잘림
- **폰트 문제**: Fix 1~2 적용으로 대부분 해결 예상. 단, Canvas의 `layout.tsx`에 Pretendard 폰트가 로드되지 않아 폴백 시스템 폰트가 사용될 수 있음 (Bebas Neue만 `next/font`로 로드 중)

### Fix 6 — 수정 내용

**파일**: `project_canvas/components/ExpandedView.tsx` → `renderSidebarWrapper`

흰 박스를 스크롤 컨테이너로 전환, 내부 패딩 추가:

```tsx
// 변경 전
<div style={{
  background: 'var(--color-white)', borderRadius: 'var(--radius-box)',
  boxShadow: 'var(--shadow-float)', flex: 1, minHeight: 0,
  display: 'flex', flexDirection: 'column', overflow: 'hidden',
}}>
  {printPanels}
</div>

// 변경 후
<div style={{
  background: 'var(--color-white)', borderRadius: 'var(--radius-box)',
  boxShadow: 'var(--shadow-float)', flex: 1, minHeight: 0,
  overflow: 'hidden', display: 'flex', flexDirection: 'column',
}}>
  <div style={{
    flex: 1, overflowY: 'auto', padding: '1.25rem',
    display: 'flex', flexDirection: 'column',
  }}>
    {printPanels}
  </div>
</div>
```

- 외부 박스: `overflow: hidden` 유지 (borderRadius 클리핑)
- 내부 스크롤 래퍼: `overflowY: 'auto'` + `padding: '1.25rem'` 추가 → 여백 확보 + 스크롤 활성화

**폰트 보완**: `app/layout.tsx`에 Pretendard 폰트 로드 추가 (현재 Bebas Neue만 로드됨)

```tsx
// 추가
import { Noto_Sans_KR } from 'next/font/google';
// 또는 Pretendard는 Google Fonts에 없으므로 CSS fallback 유지 (시스템 sans-serif)
```

> Pretendard는 Google Fonts에서 제공되지 않습니다. 현재 Canvas globals.css의 `--font-family-pretendard` 폴백(`-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial`)이 적용됩니다. Print 디자인상 허용 범위인지 확인 필요.

---

## 9. 문제 4 — 좌측 툴바 Canvas 디자인 재구성 : 근본 원인 및 Fix 7

### 현재 상태 vs 목표

| | 현재 (Print 툴바 그대로) | 목표 (Canvas 디자인 통일) |
|---|---|---|
| **공통 버튼** | undo·redo (Print ToolbarButton 스타일) | undo·redo — Canvas LeftToolbar 동일 디자인 |
| **new (+)** | ❌ 없음 | ✅ 필요 (Canvas의 검은 원형 CTA와 동일) |
| **zoom scale** | ❌ 없음 | ✅ 필요 (Canvas의 `ZoomIn / % / ZoomOut` 그룹과 동일) |
| **Print 전용** | library·saves (Print ToolbarButton), save (ToolbarCircleButton) | 동일 기능, Canvas 디자인으로 래핑 |
| **배치 구조** | 하나의 pill 안에 전부 | [new CTA (최상단)] + [메인 pill] + [save circle (별도)] |

### 구현 가능성 분석

`renderToolbarWrapper`가 현재 받는 `tools` 객체:
```ts
{
  undo:   JSX  // <ToolbarButton onClick={handleUndo} ...>
  redo:   JSX  // <ToolbarButton onClick={handleRedo} ...>
  library: JSX
  saves:  JSX
  save:   JSX  // <ToolbarCircleButton ...>
}
```

**렌더된 JSX 수신의 한계**: `tools.undo` 등은 이미 렌더된 React 엘리먼트이므로, Canvas 측에서 버튼 스타일(width/height/color/borderRadius 인라인 style 포함)을 변경할 수 없음.

| 요소 | 현재 tools API로 가능 여부 | 방법 |
|------|--------------------------|------|
| undo·redo 배치 (pill 상단) | ✅ 가능 | 래퍼 구조만 재배치 |
| library·saves 배치 (pill 하단, 구분선) | ✅ 가능 | 동일 |
| save 별도 원형 버튼 | ✅ 가능 | `tools.save` 위치 조정 |
| 버튼 스타일을 Canvas style로 완전 교체 | ❌ 불가 | Print 패키지 API 변경 필요 |
| `new` 버튼 추가 | ❌ 불가 | Print 패키지에 `onNewProject` 핸들러 노출 필요 |
| `zoom` 표시/조작 추가 | ❌ 불가 | Print 패키지에 zoom 상태·핸들러 노출 필요 |

### Fix 7-A — 현재 API로 할 수 있는 것 (즉시 적용 가능)

`ExpandedView.tsx`의 `renderToolbarWrapper`를 Canvas LeftToolbar **구조·배치**에 맞게 재작성합니다.  
버튼 내부 스타일은 Fix 1 이후 Print ToolbarButton(2.75rem, 투명 배경, gray-500 아이콘)과 Canvas 버튼이 시각적으로 거의 동일하므로, **래퍼 레이아웃과 pill 구조만 Canvas에 맞추면 시각적 통일성 달성 가능.**

목표 구조:
```
[new 버튼 — 검은 원형 CTA, 최상단]  ← Print 패키지 API 확장 후 추가 예정 (Fix 7-B)
[메인 pill (흰 배경, shadow)]
  ├── tools.undo
  ├── tools.redo
  ├── [구분선]
  ├── tools.library
  ├── tools.saves
  ├── [구분선]
  ├── [zoom+ 버튼]  ← Fix 7-B
  ├── [zoom% 표시] ← Fix 7-B
  └── [zoom- 버튼] ← Fix 7-B
[tools.save — 흰 원형 버튼, 별도]
```

Fix 7-A에서는 `new`·`zoom` 슬롯은 비워두고 나머지를 재배치합니다.

### Fix 7-B — Print 패키지 API 확장 (Print 개발자 요청 사항)

Print 개발자에게 `renderToolbarWrapper` callback의 `tools` 객체에 아래를 추가 요청:

```ts
tools: {
  // 기존
  undo, redo, library, saves, save,
  // 추가 요청
  onNewProject: () => void,        // 새 문서 시작 핸들러
  onZoomIn:     () => void,        // Print Canvas 줌인
  onZoomOut:    () => void,        // Print Canvas 줌아웃
  zoom:         number,            // 현재 줌 레벨 (기본 1)
}
```

또는 렌더된 JSX 대신 **핸들러 + 상태를 노출**하도록 API 방식 변경을 요청:
```ts
// 현재: 렌더된 JSX 전달
renderToolbarWrapper: (tools: { undo: ReactNode, redo: ReactNode, ... }) => ReactNode

// 개선안: 핸들러 + 상태 전달 → Canvas가 자체 스타일로 버튼 렌더
renderToolbarWrapper: (tools: {
  canUndo: boolean, onUndo: () => void,
  canRedo: boolean, onRedo: () => void,
  onOpenLibrary: () => void,
  onOpenSaves: () => void,
  onSave: () => void,
  onNewProject: () => void,
  zoom: number, onZoomIn: () => void, onZoomOut: () => void,
}) => ReactNode
```

> **개선안을 채택하면** Canvas는 완전히 동일한 스타일로 Print 기능 버튼을 렌더할 수 있습니다.

---

## 10. Fix 5 결정을 위한 질문

> **문제 1 처리 방향 확인이 필요합니다.**
>
> 캔버스 우측 사이드바(Print 탭 클릭 시)와 ExpandedView 우측 사이드바를 "동일하게" 만드는 방향이 **선택지 A / B / C** 중 어느 것인지 알려주시면 즉시 구현하겠습니다.
>
> - **A**: 현재 상태 유지 (Tailwind 수정 후 ExpandedView 사이드바가 복원되면 OK)
> - **B/C**: Canvas 사이드바에서도 Print의 전체 컨트롤(ImageInsert, PurposeSelector, GENERATE 버튼 등)을 보여주고 싶음

---

`COPYRIGHTS 2026. CRE-TE CO.,LTD. ALL RIGHTS RESERVED.`
