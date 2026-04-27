# Phase D — Canvas 사이드바 이식 계획
> 작성: 2026-04-24 | 담당 에이전트: AGENT C (프론트엔드)

---

## 1. 목표 및 현황 분석

### 현재 UX 흐름
```
사용자 → PRINT 탭 클릭
  → RightSidebar: PrintSidebarPanel (썸네일 + 3버튼 요약) 표시
  → "생성하기" 클릭
  → ExpandedView 진입
  → PrintExpandedView 내 풀 사이드바 표시
     (NodeSelector + ImageInsert + PurposeSelector + PageCountControl + PromptInput + GENERATE)
```

### 목표 UX 흐름
```
사용자 → PRINT 탭 클릭
  → RightSidebar: 풀 사이드바 바로 표시 (expanded와 동일한 내용)
     (ImageInsert + PurposeSelector + PageCountControl + PromptInput + GENERATE)
  → GENERATE 클릭
  → ExpandedView 자동 진입 + 사이드바에서 입력한 상태(mode, prompt, images, pageCount) 이어받음
  → 생성 작업 연속 진행
```

---

## 2. 코드베이스 현황

### 관련 파일 맵

| 레포 | 파일 | 역할 |
|------|------|------|
| `cai-harness-print` | `components/Print_ExpandedView.tsx` | 풀 사이드바 상태 + 렌더링 통합 관리 |
| `cai-harness-print` | `components/PrintSidebarPanel.tsx` | Canvas 사이드바 요약 패널 (현재) |
| `cai-harness-print` | `app/components/sidebar/*.tsx` | 사이드바 sub-components (재사용 대상) |
| `cai-harness-print` | `types/print-canvas.ts` | 공유 타입 정의 |
| `CAI/project_canvas` | `components/RightSidebar.tsx` | PrintSidebarPanel 마운트 지점 |
| `CAI/project_canvas` | `components/ExpandedView.tsx` | PrintExpandedView 마운트 지점 |
| `CAI/project_canvas` | `app/page.tsx` | printSavedState / printInitialAction 상태 관리 |

### 핵심 구조적 사실
- `Print_ExpandedView.tsx`가 mode / prompt / images / pageCount 상태를 내부에서 소유
- Canvas는 `renderSidebarWrapper` render prop으로 사이드바 **셸(shell)** 만 제공
- 사이드바 **내용(content)** 은 `printPanels` 로 `PrintExpandedView` 내부에서 조립됨
- `@cai-crete/print-components` 패키지를 통해 canvas에 배포됨

---

## 3. 설계 원칙

**복사-붙여넣기 금지** → 기존 sub-components를 그대로 import하는 새 조합 컴포넌트 추가

| 원칙 | 적용 방법 |
|------|-----------|
| 단일 소유 | 상태는 `PrintCanvasSidebarPanel` 내부에서 소유 |
| 단방향 전달 | 사이드바 draft state → canvas page.tsx → PrintExpandedView |
| 재사용 우선 | ImageInsert / PurposeSelector / PageCountControl / PromptInput 그대로 import |
| 컴포넌트 격리 | `PrintCanvasSidebarPanel`은 generate를 직접 호출하지 않음 |

---

## 4. 구현 계획

### D-1. `cai-harness-print`: 신규 타입 추가
**파일:** `types/print-canvas.ts`

```ts
/** 사이드바에서 GENERATE 클릭 전까지 쌓인 Draft 상태 */
export interface PrintDraftState {
  mode: PrintMode                  // 'REPORT' | 'PANEL' | 'DRAWING' | 'VIDEO'
  prompt: string
  images: File[]
  videoStartImage: File | null
  videoEndImage: File | null
  pageCount: number
}
```

**이유:** Canvas → PrintExpandedView 간 상태 인계 계약 타입이 필요. 기존 `PrintSavedState`는 저장 완료 후의 타입이므로 별도 정의.

---

### D-2. `cai-harness-print`: `PrintCanvasSidebarPanel` 신규 컴포넌트
**파일:** `components/PrintCanvasSidebarPanel.tsx` (신규)

```
PrintCanvasSidebarPanel
  ├── 내부 상태: mode, prompt, images, videoStartImage, videoEndImage, pageCount
  ├── 초기값: savedState가 있으면 mode/thumbnail에서 복원, 없으면 기본값
  ├── 렌더 구성 (기존 sub-components import, 복사 없음):
  │   ├── PurposeSelector   (mode 선택)
  │   ├── ImageInsert       (이미지 업로드)
  │   ├── PageCountControl  (페이지 수)
  │   ├── PromptInput       (프롬프트 입력)
  │   └── ActionButtons-lite (GENERATE / LIBRARY 버튼)
  └── onAction(action: 'generate'|'library'|'saves', draft: PrintDraftState) 콜백 호출
```

**Props:**
```ts
interface PrintCanvasSidebarPanelProps {
  savedState?: PrintSavedState      // 기존 저장 상태로 초기화
  thumbnail?: string
  onAction: (action: 'generate' | 'library' | 'saves', draft: PrintDraftState) => void
  className?: string
}
```

**GENERATE 버튼 동작:** 실제 API 호출 없이 `onAction('generate', draft)` 호출만.
**LIBRARY 버튼:** `onAction('library', draft)` 호출만 — expanded에서 라이브러리 모달 오픈.

---

### D-3. `cai-harness-print`: `PrintExpandedView`에 `initialDraftState` prop 추가
**파일:** `components/Print_ExpandedView.tsx` (수정)

```ts
interface PrintExpandedViewProps {
  // 기존 props ...
  initialDraftState?: PrintDraftState   // 사이드바에서 인계받은 상태
}
```

**내부 적용:**
```ts
// 기존
const [mode, setMode] = useState<PrintMode>(savedState?.mode ?? 'REPORT')
const [prompt, setPrompt] = useState('')

// 변경 후
const [mode, setMode] = useState<PrintMode>(
  initialDraftState?.mode ?? savedState?.mode ?? 'REPORT'
)
const [prompt, setPrompt] = useState(initialDraftState?.prompt ?? '')
const [pageCount, setPageCount] = useState(initialDraftState?.pageCount ?? 1)
// images: initialDraftState?.images가 있으면 세팅 (useEffect로 마운트 시 1회)
```

**이미지 인계 시 주의:**
- `File` 객체는 컴포넌트 간 전달 가능 (직렬화 불필요)
- `PrintExpandedView` 마운트 시 `initialDraftState.images`로 imageList 초기화

---

### D-4. `cai-harness-print`: 패키지 export 추가
**파일:** `index.ts` (또는 패키지 진입점)

```ts
export { PrintCanvasSidebarPanel } from './components/PrintCanvasSidebarPanel'
export type { PrintDraftState } from './types/print-canvas'
```

패키지 빌드: `npm run build` → canvas에서 재설치 또는 심볼릭 링크 업데이트.

---

### D-5. `project_canvas`: `RightSidebar.tsx` 업데이트

```tsx
// 기존
import { PrintSidebarPanel } from '@cai-crete/print-components'

// 변경
import { PrintCanvasSidebarPanel } from '@cai-crete/print-components'
import type { PrintDraftState } from '@cai-crete/print-components'
```

**Props 추가:**
```ts
interface Props {
  // 기존 props ...
  onPrintSidebarAction?: (action: 'generate' | 'library' | 'saves', draft: PrintDraftState) => void
  // 기존 onPrintSidebarAction?: (action: 'generate' | 'library' | 'video') => void 대체
}
```

**렌더 교체 (PANEL 모드, activeSidebarNodeType === 'print'):**
```tsx
// 기존
<PrintSidebarPanel
  savedState={printSavedState}
  thumbnail={printThumbnail}
  onAction={onPrintSidebarAction ?? (() => {})}
/>

// 변경
<PrintCanvasSidebarPanel
  savedState={printSavedState}
  thumbnail={printThumbnail}
  onAction={(action, draft) => onPrintSidebarAction?.(action, draft)}
/>
```

---

### D-6. `project_canvas`: `page.tsx` 업데이트

**상태 추가:**
```ts
const [printDraftState, setPrintDraftState] = useState<PrintDraftState | null>(null)
```

**핸들러 수정:**
```ts
// 기존
const handlePrintSidebarAction = (action: 'generate' | 'library' | 'video') => {
  setPrintInitialAction(action)
  handleNavigateToExpand(printNodeId)
}

// 변경
const handlePrintSidebarAction = (action: 'generate' | 'library' | 'saves', draft: PrintDraftState) => {
  setPrintDraftState(draft)
  setPrintInitialAction(action)
  handleNavigateToExpand(printNodeId)  // 자동으로 expanded print 진입
}
```

**RightSidebar에 prop 전달:**
```tsx
<RightSidebar
  // 기존 props ...
  onPrintSidebarAction={handlePrintSidebarAction}
/>
```

**ExpandedView에 prop 전달:**
```tsx
<ExpandedView
  // 기존 props ...
  printDraftState={printDraftState}
/>
```

---

### D-7. `project_canvas`: `ExpandedView.tsx` 업데이트

**Props 추가:**
```ts
interface Props {
  // 기존 props ...
  printDraftState?: PrintDraftState | null
}
```

**PrintViewWrapper에 전달:**
```tsx
<PrintViewWrapper
  onCollapse={onCollapse}
  printSavedState={printSavedState}
  printInitialAction={printInitialAction}
  printDraftState={printDraftState}   // 추가
  selectedImages={selectedImages}
  onPrintSave={onPrintSave}
  onPrintDelete={onPrintDelete}
/>
```

**PrintExpandedView에 전달:**
```tsx
<PrintExpandedView
  // 기존 props ...
  initialDraftState={printDraftState ?? undefined}
/>
```

---

## 5. 작업 체크리스트

### cai-harness-print
- [x] D-1: `types/print-canvas.ts`에 `PrintDraftState` 타입 추가
- [x] D-2: `components/PrintCanvasSidebarPanel.tsx` 신규 작성
  - [ ] 기존 sidebar sub-components import (복사 없음)
  - [ ] mode / prompt / images / pageCount 내부 상태 관리
  - [ ] savedState로 초기값 복원 로직
  - [ ] onAction 콜백 연결
  - [ ] Blob URL: effect 내부 생성 + 동일 클로저 revoke 패턴 준수 (§6-A)
  - [ ] 내부 레이아웃: 스크롤 영역 + 고정 footer 구조 (§6-B)
- [x] D-3: `components/Print_ExpandedView.tsx`에 `initialDraftState` prop 추가
  - [ ] mode / prompt / pageCount 초기화 로직
  - [ ] images 마운트 시 초기화 (useEffect)
- [x] D-4: 패키지 export에 신규 컴포넌트/타입 추가
- [x] 패키지 빌드 (`npm run build`) + tsc 에러 0 확인

### project_canvas (CAI)
- [x] D-5: `RightSidebar.tsx` — `PrintCanvasSidebarPanel`으로 교체, Props 타입 업데이트
- [x] D-6: `page.tsx` — `printDraftState` 상태 추가, `handlePrintSidebarAction` 수정
- [x] D-7: `ExpandedView.tsx` — `printDraftState` prop 추가 및 전달
- [x] `tsc --noEmit` 에러 0 확인

### 수동 검증
- [ ] Canvas 사이드바에서 PRINT 탭 클릭 → 풀 사이드바 표시 확인
- [ ] 모드 선택 → ExpandedView 진입 후 동일 모드 유지 확인
- [ ] 프롬프트 입력 → ExpandedView 진입 후 프롬프트 이어받기 확인
- [ ] 이미지 업로드 → ExpandedView 진입 후 이미지 인계 확인
- [ ] LIBRARY 클릭 → ExpandedView 진입 + 라이브러리 모달 자동 오픈 확인
- [ ] GENERATE → 생성 시작 및 결과 저장 후 Canvas 복귀 확인

---

## 6. 리스크 & 대응

| 리스크 | 가능성 | 대응 |
|--------|--------|------|
| `File` 객체 컴포넌트 간 전달 시 null 참조 | 낮음 | `initialDraftState.images` 방어적 처리 (빈 배열 폴백) |
| 패키지 빌드 후 canvas 재설치 시 버전 불일치 | 중간 | 심볼릭 링크(`npm link`) 또는 path alias로 로컬 참조 |
| `PrintCanvasSidebarPanel` 내부 상태와 `PrintExpandedView` 상태 불일치 | 낮음 | `initialDraftState`가 항상 우선순위 최상위 |
| Blob URL 미해제로 인한 브라우저 메모리 누수 | 중간 | effect 내부에서 생성 + 동일 클로저에서 revoke (아래 §6-A 참조) |
| GENERATE 버튼이 스크롤 영역 아래로 밀려 비가시 | 중간 | `PrintCanvasSidebarPanel` 내부를 fixed-footer 레이아웃으로 구성 (아래 §6-B 참조) |

---

### §6-A. Blob URL 메모리 관리 — 구현 규칙

이미지 미리보기를 위해 `URL.createObjectURL(file)`을 호출하는 모든 컴포넌트는 아래 패턴을 준수합니다.

```ts
useEffect(() => {
  const url = URL.createObjectURL(file)   // effect 내부에서 생성
  setPreviewUrl(url)
  return () => URL.revokeObjectURL(url)   // 동일 클로저에서 revoke
}, [file])
```

**이 패턴이 필요한 이유:**
- Blob URL은 GC 대상이 아니므로 명시적 revoke 없이는 문서가 닫힐 때까지 메모리를 점유함
- effect 바깥에서 URL을 선언하면 React Strict Mode의 이중 실행 시 첫 번째 URL이 revoke되지 않고 누락됨
- `url`을 effect 클로저 안에서 생성하면 cleanup이 항상 같은 URL을 참조하여 Strict Mode에서도 안전함

**`PrintCanvasSidebarPanel` → `PrintExpandedView` 전환 시:**
- 사이드바가 unmount되면 cleanup이 사이드바의 Blob URL을 revoke함
- `PrintExpandedView`는 전달받은 `File` 객체에서 **새 Blob URL을 독립적으로 생성**함
- File 객체 자체는 Blob URL 해제와 무관하게 메모리에 유지됨 → 안전

---

### §6-B. UIUX 과밀 — Fixed Footer 레이아웃

`overflow-y: auto`를 사이드바 전체에 적용하면 GENERATE가 스크롤 끝에 묻혀 비가시 상태가 됩니다. 이는 대응책이 문제를 악화시키는 경우입니다.

`PrintCanvasSidebarPanel` 내부 레이아웃을 `cai-harness-print/Sidebar.tsx`의 footerSlot 패턴과 동일하게 구성합니다.

```tsx
// PrintCanvasSidebarPanel 내부 구조
<div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

  {/* 스크롤 영역: 컨트롤들 */}
  <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
    <PurposeSelector ... />
    <ImageInsert ... />
    <PageCountControl ... />
    <PromptInput ... />
  </div>

  {/* 고정 footer: GENERATE — 항상 하단에 노출 */}
  <div style={{ flexShrink: 0, padding: '1.25rem', borderTop: '1px solid var(--color-gray-100)' }}>
    <button onClick={() => onAction('generate', draft)}>GENERATE</button>
    <button onClick={() => onAction('library', draft)}>라이브러리</button>
  </div>

</div>
```

이 구조로 컨트롤이 많아도 GENERATE는 항상 하단 고정 노출되며, print 확장 뷰와 동일한 UX 패턴을 유지합니다.

---

## 7. 작업 순서 요약

```
1. cai-harness-print 수정 (D-1 → D-2 → D-3 → D-4)
2. 패키지 빌드
3. project_canvas 업데이트 (D-5 → D-6 → D-7)
4. tsc 검증
5. 수동 검증
```

---

## 8. 이슈 수정 계획 (2026-04-24 추가)

### 발견된 문제
1. **컴포넌트 순서 불일치:** `INSERT IMAGE`가 `PURPOSE` 아래에 위치함 (원래는 상단이어야 함).
2. **Secondary CTA 오류:** `GENERATE` 버튼 하단의 버튼이 `LIBRARY`로 되어 있으나, 실제 `Print` 확장 뷰와 동일하게 `EXPORT`가 되어야 함.

### 원인 분석
1. **순서 불일치 원인:** 기존 계획서(D-2 섹션)의 컴포넌트 트리 작성 시 `PurposeSelector`를 먼저, `ImageInsert`를 나중에 기재했습니다. 이를 바탕으로 `PrintCanvasSidebarPanel.tsx`가 구현되면서 실제 기존 `Print_ExpandedView.tsx` 내부 사이드바 구조(이미지가 먼저 위치)와 불일치가 발생했습니다.
2. **Secondary CTA 오류 원인:** 계획서 설계 시 Secondary CTA를 라이브러리 모달 진입용으로 잘못 상정했습니다. 실제 기존 `ActionButtons` 컴포넌트를 확인한 결과, 하단 버튼은 `EXPORT` 기능을 담당하며, 생성된 결과물이 있을 때만 활성화되는 구조입니다.

### 해결책 (D-8)
- **[x] D-8.1: `PrintCanvasSidebarPanel.tsx` 렌더링 순서 변경**
  - 스크롤 영역 내 JSX 순서를 `<ImageInsert />` → `<PurposeSelector />` 순서로 교체.
- **[x] D-8.2: Secondary CTA 텍스트 및 로직 수정 (`PrintCanvasSidebarPanel.tsx`)**
  - 'LIBRARY' 버튼 텍스트를 'EXPORT'로 변경.
  - `savedState`(또는 결과물 유무)에 따라 EXPORT 버튼의 활성화/비활성화 로직(`disabled={!savedState}`) 적용.
- **[x] D-8.3: `onAction` 타입 및 핸들러 연쇄 수정**
  - `cai-harness-print` 패키지 내 `types/print-canvas.ts`의 `onAction` 속성 타입을 `'generate' | 'export' | 'saves'` 등으로 수정.
  - `project_canvas` 내부의 `RightSidebar.tsx`와 `page.tsx`에 선언된 `onAction` 핸들러 파라미터를 `'export'`로 업데이트.
  - `page.tsx` 내 핸들러가 `'export'` 액션을 받을 때 `printInitialAction` 상태를 올바르게 인계하여 확장 뷰 진입 즉시 EXPORT 동작이 이루어지도록 처리.

---

`COPYRIGHTS 2026. CRE-TE CO.,LTD. ALL RIGHTS RESERVED.`
