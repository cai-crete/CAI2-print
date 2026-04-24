---
title: Sketch-to-Image 이식 (cai-sketch-to-image-v2 → cai-canvas-v2)
created: 2026-04-23
status: completed
source: https://github.com/cai-crete/cai-sketch-to-image-v2
---

## 목적

cai-sketch-to-image-v2의 이미지 생성 기능을 cai-canvas-v2의 `'image'` 노드
ExpandedView에 이식한다.

---

## 확정 아키텍처 결정 (Q1~Q7)

| 항목 | 결정 |
|------|------|
| 드로잉 캔버스 위치 | image 노드 ExpandedView **only** |
| 스케치 입력 방법 | (1) 직접 드로잉 (2) 이미지 업로드 |
| 우측 패널 옵션 | 전체 이식 — prompt, CONCEPT/DETAIL, 7 styles, aspect ratio, resolution |
| 생성 결과 저장 | 원본 노드 → 스케치 thumbnail / 새 노드 → 생성 이미지 thumbnail + edge 연결 |
| GENERATE 후 UX | 자동 캔버스 복귀 + 중앙 하단 GeneratingToast 알약 (로더·경과시간·취소) |
| ExpandedView 진입 모드 | `hasThumbnail=false` → 빈 캔버스 / `hasThumbnail=true` → 생성 이미지 배경 로드 (edit 모드) |
| Edit 흐름 (Strategy A) | 생성 이미지 노드 expand → 배경 로드 → GENERATE → 새 노드 + edge 생성 (원본 보존) |
| 새 노드 타입 (Q8) | `type: 'image'`, `artboardType: 'sketch'` — 아트보드 시스템 적용으로 확정 |
| 트리거 연결 (Q2/Q5) | **아트보드 시스템으로 구현됨** — blank 아트보드 선택 + IMAGE 탭 클릭 → `artboardType: 'sketch'` 배정 + ExpandedView 자동 오픈 |

---

## 이식 제외 항목

- sketch-to-image-v2의 메인 무한 캔버스 (별도 화면 전체 시스템)
- 아트보드(artboard) 시스템 (cai-canvas-v2 노드 시스템 사용)
- lasso·select·pan 도구 (pen·eraser·text 3종만 이식, select·pan 2종은 기존 도구 사용)

## image 노드 ExpandedView 왼쪽 컨트롤 바 레이아웃

```
[cursor] [pan]  |  [pen] [eraser] [text]  |  [undo] [redo]  |  [+] [100%] [-]
 ↑ 기존 도구         ↑ 신규 이식 도구
```

- `cursor` / `pan` : 기존 cai-canvas-v2 LeftToolbar 도구 재사용
- `pen` / `eraser` / `text` : sketch-to-image-v2에서 이식
- `undo` / `redo` : 드로잉 히스토리 전용 (캔버스 노드 히스토리와 별개)
- `+` / `100%` / `-` : SketchCanvas 내부 줌 컨트롤

---

## GeneratingToast 알약 UI 스펙

GENERATE 직후 캔버스 복귀와 **동시에** 캔버스 중앙 하단에 고정 렌더.

```
[ ◌ 로테이팅 로더 ]  IMAGE GENERATING  ##s  [ ⨉ ]
```

| 항목 | 스펙 |
|------|------|
| 위치 | 캔버스 뷰포트 기준 `bottom: 32px` / `left: 50%` + `translateX(-50%)` / `position: fixed` |
| 카운터 | 경과 시간 카운트업 (0s → 1s → 2s …) |
| 로더 | CSS rotate 애니메이션 아이콘 |
| `⨉` 동작 | `AbortController.abort()` 호출 — 노드 상태 롤백 없음, 알약 즉시 소멸 |
| 성공 시 | 알약 자동 소멸 (별도 완료 상태 없음) |
| 실패 시 | 알약 소멸 + ExpandedView 재오픈 + 패널 에러 메시지 표시 |
| z-index | 캔버스 노드 위, ExpandedView 아래 |

---

## 신규 의존성 & 환경 변수

```
dependencies:
  @google/generative-ai   # Gemini API SDK
  localforage             # IndexedDB 이미지 저장

env:
  GOOGLE_API_KEY          # .env.local (서버사이드 전용, 클라이언트 노출 금지)
```

---

## 이식 소스 파일 (fetch 대상)

| 소스 경로 (sketch-to-image-v2) | 역할 |
|-------------------------------|------|
| `_context/protocol-sketch-to-image-v2.3.txt` | 5-Room 생성 프로토콜 |
| `src/app/api/sketch-to-image/route.ts` | 2단계 API (분석→생성) |
| `src/lib/prompt.ts` | 프로토콜 로더 |
| `src/lib/imageDB.ts` | localforage 래퍼 |
| `src/hooks/useBlueprintGeneration.ts` | 생성 상태 관리 훅 |
| `src/components/panels/SketchToImagePanel.tsx` | 옵션 패널 UI |
| `src/app/page.tsx` | 드로잉 로직 추출 |

---

## Phase 체크리스트

### Phase 1 — 환경 설정
- [x] `project_canvas/package.json`에 `@google/generative-ai`, `localforage` 추가
- [x] `npm install` 실행
- [x] `project_canvas/.env.local`에 `GOOGLE_API_KEY=...` 추가
- [x] `project_canvas/.env.local.example` 작성 (키 값 없이 변수명만)

### Phase 2 — API Layer 이식
- [x] `project_canvas/_context/protocol-sketch-to-image-v2.3.txt` 생성 (원본 복사)
- [x] `project_canvas/app/api/sketch-to-image/route.ts` 생성 (원본 기반 어댑터)
  - GOOGLE_API_KEY 환경변수 서버사이드 전용 확인
  - 요청 검증: 이미지 ≤10MB, MIME whitelist, 프롬프트 ≤2000자
  - 2단계 처리: 분석(Gemini Pro) → 생성(Gemini Flash Image)
  - 재시도 로직: 지수 백오프 (1s→2s→4s, 최대 2회)
- [x] `project_canvas/lib/prompt.ts` 생성
- [x] `project_canvas/lib/imageDB.ts` 생성 (localforage 래퍼)

### Phase 3 — 타입 & 훅
- [x] `project_canvas/types/canvas.ts` 수정
  - `CanvasNode`에 `sketchData?: string` 추가 (드로잉 base64)
  - `CanvasNode`에 `generatedImageData?: string` 추가 (생성 결과 base64)
- [x] `project_canvas/hooks/useBlueprintGeneration.ts` 생성
  - API 호출 (`/api/sketch-to-image`)
  - 상태: `isLoading`, `error`, `generate()`, `reset()`
  - 성공 시 콜백으로 base64 이미지 반환 (저장은 호출자 책임)

### Phase 4 — 드로잉 캔버스 컴포넌트
- [x] `project_canvas/components/SketchCanvas.tsx` 생성
  - HTML Canvas 기반 드로잉 레이어
  - 이식 도구: pen (연필), eraser (지우개), text (텍스트)
  - 기존 도구 연동: cursor (선택), pan (팬) — cai-canvas-v2 activeTool 그대로 사용
  - 경로 렌더링 (points[] 기반)
  - 드로잉 전용 undo/redo 스택 (캔버스 노드 히스토리와 분리)
  - SketchCanvas 내부 줌 컨트롤 (+/−/100%) — 범위 100%~200%
    - 100%: 초기 뷰(pan offset 리셋)로 복귀
  - `exportAsBase64(): string` 메서드 (png)
  - 이미지 업로드 오버레이 (`<input type="file" accept="image/*">`)
  - cai-canvas-v2 디자인 토큰으로 컨트롤 바 스타일링
- [x] ExpandedView 왼쪽 컨트롤 바 구성
  - `[cursor] [pan]` | `[pen] [eraser] [text]` | `[undo] [redo]` | `[+] [100%] [-]`

### Phase 4-A — 커스텀 커서 & Stroke 크기 패널

> 소스 레퍼런스: `cai-sketch-to-image/sketch-to-image/src/components/LeftToolbar.tsx`

#### 4-A-1. pen / eraser 두 번째 클릭 → Stroke 크기 팝업

**동작 규칙 (LeftToolbar.tsx 이식)**

| 클릭 순서 | 동작 |
|-----------|------|
| 비활성 상태에서 첫 클릭 | 해당 도구 활성화, `showStrokePanel = null` |
| 이미 활성 상태에서 클릭 | `showStrokePanel` 토글 (`'pen'` ↔ `null`, `'eraser'` ↔ `null`) |
| 다른 도구 클릭 | `showStrokePanel = null` 초기화 |

**팝업 UI 스펙**

- 위치: 버튼 오른쪽 `left-[calc(100%+0.75rem)]`, 버튼 세로 중앙 `top-1/2 -translate-y-1/2`
- 형태: 가로 pill (`rounded-full`, `backdrop-blur-sm`, `border border-black/10`)
- 내부: 5개 크기 버튼, 각 버튼 `w-8 h-8 rounded-full`

**Stroke 크기 값**

```
penStrokeWidths  = [0.5, 1, 2, 4, 6]     // 실제 stroke 두께
eraserStrokeWidths = [10, 15, 20, 25, 30] // 실제 지우개 반경
dotVisualSizes   = [2, 4, 6, 8, 10]      // 팝업 내 dot 시각 크기 (공통)
```

**Dot 렌더링 로직 (renderStrokeDot)**
- 선택된 크기: 검은 원 배경 + 흰 내부 dot
- 미선택: 검은 dot만 표시 (배경 없음)

**상태 변수 추가 위치: `ExpandedView.tsx` (또는 SketchCanvas.tsx 내부)**
```ts
const [showStrokePanel, setShowStrokePanel] = useState<'pen' | 'eraser' | null>(null);
const [penStrokeWidth, setPenStrokeWidth] = useState(2);
const [eraserStrokeWidth, setEraserStrokeWidth] = useState(20);
```

- [x] `ExpandedView.tsx` 내 image 노드 분기 — LeftToolbar 영역에 pen/eraser 버튼 클릭 핸들러 구현
- [x] Stroke 팝업 컴포넌트 (인라인 또는 별도 `StrokePanel.tsx`) 구현

---

#### 4-A-2. pen / eraser 활성 시 SketchCanvas 커스텀 커서

pen 또는 eraser 도구가 활성화된 동안, OS 기본 커서 대신 현재 stroke 크기를 시각적으로
반영한 원형 커서 오버레이를 SketchCanvas 위에 렌더링한다.

**커서 외형 규칙**

| 활성 도구 | 커서 외형 |
|-----------|-----------|
| `pen` | 현재 penStrokeWidth 직경, 검은 채움 원 |
| `eraser` | 현재 eraserStrokeWidth 직경, 흰색 반투명(`rgba(255,255,255,0.8)`) + 검은 테두리 1px |
| `cursor` / `pan` / `text` | OS 기본 커서 (커스텀 오버레이 숨김) |

**구현 스펙**

- [x] `SketchCanvas.tsx` 내 상태 추가:
  ```ts
  const [cursorPos, setCursorPos] = useState({ x: -200, y: -200 });
  const [showCursor, setShowCursor] = useState(false);
  ```
- [x] Canvas 요소 이벤트:
  - `onMouseMove`: `e.clientX/Y - rect.left/top` → `cursorPos` 업데이트
  - `onMouseEnter`: `showCursor = true`
  - `onMouseLeave`: `showCursor = false`
- [x] Canvas 요소 CSS 조건:
  - `activeTool === 'pen' || activeTool === 'eraser'` → `cursor: none`
  - 나머지 도구 → 기존 CSS cursor 값 유지
- [x] 커서 오버레이 DIV (Canvas 컨테이너 내부, `position: absolute`, `pointer-events: none`):
  ```
  left: {cursorPos.x}px   top: {cursorPos.y}px
  transform: translate(-50%, -50%)
  width/height: {dotDiameter * internalZoomScale}px
  border-radius: 9999px
  pointer-events: none
  ```
  - `dotDiameter`: pen → `penStrokeWidth * 2`, eraser → `eraserStrokeWidth`
  - SketchCanvas 내부 zoom scale 반영 (Phase 4 zoom 상태 구독)
- [x] 드로잉 중(`isPointerDown=true`)에도 커서 위치 추적 유지
- [x] Canvas 밖에서 `showCursor = false` → 오버레이 즉시 숨김

**검증 기준**

- pen 선택 후 stroke 크기 변경 → 커서 원 크기 즉시 반영
- eraser 선택 → 흰 반투명 원이 지우개 크기로 마우스 따라다님
- cursor/pan/text 전환 → 커스텀 커서 즉시 사라지고 OS 커서 복귀
- SketchCanvas 내부 zoom +/− → 커서 원 크기 비례 변경
- Stroke 팝업에서 크기 클릭 → 커서 크기 즉시 변경 확인

### Phase 4-B — Text 도구 동작

> 소스 레퍼런스: `cai-sketch-to-image/sketch-to-image/src/app/page.tsx` (lines 721–748, 892–923, 1341–1378)

text 버튼 클릭 후 SketchCanvas 위에서의 모든 인터랙션 흐름을 정의한다.
pen/eraser와 달리 **커스텀 커서 오버레이 없음** — OS `cursor: text` 사용.

#### 동작 흐름

| 상황 | 동작 |
|------|------|
| text 모드에서 빈 곳 클릭 | 기본 200×40 텍스트 박스 생성 + `<textarea autoFocus>` 즉시 편집 모드 |
| text 모드에서 드래그 | 파란 테두리 rect 미리보기 → pointerUp 시 드래그 크기로 텍스트 박스 생성 |
| 기존 텍스트 아이템 클릭 | 해당 아이템 편집 재활성화 |
| 편집 중 외부 클릭 | 텍스트 커밋 (비어있으면 아이템 삭제), 편집 모드 종료 |
| 편집 중 ESC | 텍스트 커밋 (비어있으면 아이템 삭제), 편집 모드 종료 |
| cursor 모드에서 텍스트 아이템 더블클릭 | 편집 재진입 |

#### 커서 동작

- `activeTool === 'text'` → Canvas 요소 `cursor: 'text'` (OS 기본 텍스트 커서)
- pen/eraser 커스텀 오버레이 미적용 (4-A-2 조건부 렌더에서 text 제외)

#### 구현 스펙

- [x] `SketchCanvas.tsx` 내 상태 추가:
  ```ts
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [textItems, setTextItems] = useState<TextItem[]>([]);
  const [textDragRect, setTextDragRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  ```
- [x] `TextItem` 타입: `{ id: string; x: number; y: number; width: number; height: number; text: string }`
- [x] pointerDown (text 모드):
  1. 이미 편집 중(`editingTextId`가 있음) → 커밋/삭제 후 편집 종료 (새 박스 생성 없음)
  2. 기존 텍스트 아이템 hit → 해당 아이템 편집 활성화
  3. 빈 곳 → `textDragStartRef` 시작
- [x] pointerMove (text 모드, drag 중):
  - `textDragRect` 상태 업데이트 → 파란 테두리 rect 미리보기 렌더
  - rect 미리보기 스타일: `border: '1.5px solid #4f9cf9'`, 배경 없음
- [x] pointerUp (text 모드):
  - 드래그한 경우(`wasDragging=true`): `{ x, y, w, h }` = 드래그 영역 (최소 w: 120, h: 32)
  - 클릭한 경우(`wasDragging=false`): 기본 `w: 200, h: 40`
  - 새 TextItem 생성 → `editingTextId = newItem.id` → `<textarea autoFocus>` 렌더
- [x] `<textarea>` 인라인 렌더링:
  - `editingTextId === item.id` 조건 시 표시
  - `autoFocus`, `position: absolute, inset: 0`, `background: transparent`, `border: none`, `resize: none`
  - onChange: textItem.text 실시간 업데이트
  - onKeyDown(Escape): 커밋 → 빈 텍스트면 삭제, `editingTextId = null`
- [x] cursor 모드에서 텍스트 아이템 더블클릭 → `setEditingTextId(item.id)`
- [x] 외부 클릭(canvas pointerDown, editingTextId 존재) → 커밋/삭제 처리

#### 텍스트 아이템 exportAsBase64 통합

- [x] `exportAsBase64()` 호출 전 `editingTextId` 존재 시 자동 커밋
- [x] `<canvas>` 위에 텍스트 아이템 오버레이 렌더링이 아닌, export 시 Canvas 2D context에 `fillText()`로 합성
  - font: `14px sans-serif`, padding: 8px

#### 검증 기준

- text 모드 진입 시 커서가 `text` 형태로 변경됨
- 클릭 → 즉시 편집 가능한 textarea 생성
- 드래그 → 파란 rect 미리보기 → 지정 크기로 생성
- ESC / 외부 클릭 → 편집 종료 (비어있으면 박스 삭제)
- `exportAsBase64()` 결과에 텍스트 내용 포함 확인

---

### Phase 4-C — SketchCanvas Grid

> 소스 레퍼런스: `cai-sketch-to-image/sketch-to-image/src/components/InfiniteGrid.tsx`

#### 확정 사항

| 항목 | 결정 |
|------|------|
| Grid 방식 | InfiniteGrid 스타일 — `internalZoom` + `internalOffset` 추적 |
| 토글 | 없음 (항상 표시) |
| `hasThumbnail=true` (편집 모드) | Grid 숨김 — 배경 이미지만 표시 |

#### Grid 스펙 (InfiniteGrid.tsx 이식 기반)

| 항목 | 값 |
|------|-----|
| minor 간격 | `Math.round(12 * (internalZoom / 100))` px |
| major 간격 | minor × 5 |
| showMinor 조건 | `minor >= 6` |
| minor 선 색상 | `rgba(0,0,0,0.04)` |
| major 선 색상 | `rgba(0,0,0,0.14)` |
| backgroundPosition | `calc(50% + internalOffset.x px) calc(50% + internalOffset.y px)` |

#### SketchCanvas 내부 레이어 순서

| z-order | 레이어 | 표시 조건 |
|---------|--------|-----------|
| 0 (bottom) | 업로드 이미지 `<img>` | `uploadedImageData !== null` |
| 1 | Grid div | `!hasThumbnail` |
| 2 | 배경 이미지 `<img>` (edit 모드) | `hasThumbnail && thumbnailData` |
| 3 | HTML Canvas (드로잉) | 항상 |
| 4 | Text items overlay | 항상 |
| 5 | Custom cursor overlay | pen / eraser 활성 시 |

#### 구현 스펙

- [x] `project_canvas/components/InfiniteGrid.tsx` 생성
  - Props: `zoom: number`, `offset: { x: number; y: number }`
  - `cai-sketch-to-image/sketch-to-image/src/components/InfiniteGrid.tsx` 직접 이식
  - `theme` 파라미터 제거 (light 고정)
  - `className="absolute inset-0 pointer-events-none"`

- [x] `SketchCanvas.tsx` 내 Grid 렌더링 조건 추가
  - `!hasThumbnail` 시 `<InfiniteGrid zoom={internalZoom} offset={internalOffset} />` 렌더
  - `internalZoom`, `internalOffset` 상태는 Phase 4 줌 컨트롤과 공유 (별도 상태 불필요)
  - Grid div는 배경 이미지 `<img>` 보다 낮은 z-order에 위치

#### 검증 기준

- `hasThumbnail=false` (빈 캔버스 진입): grid 표시 확인
- `hasThumbnail=true` (편집 모드 진입): grid 숨김, 배경 이미지만 표시
- 이미지 업로드 직후: 업로드 이미지(z=0) + grid(z=1) 동시 표시
- SketchCanvas 내부 zoom `+` 클릭 → grid 간격 비례 확대
- SketchCanvas 내부 pan 드래그 → grid가 드로잉 좌표와 함께 이동
- `100%` 버튼 클릭 → `internalOffset` 리셋 → grid 중앙 정렬 복귀

---

### Phase 4-D — `[+]` 버튼 이미지 업로드

> 소스 위치: `project_canvas/components/LeftToolbar.tsx` (`onAddArtboard` 버튼 분기)

#### 확정 사항

| 항목 | 결정 |
|------|------|
| 트리거 | image ExpandedView (`artboardType='sketch' && type='image'`) → `[+]` 버튼이 `onUploadImage` 호출 |
| 일반 캔버스 | `onAddArtboard` 기존 동작 유지 |
| 아이콘 | `<IconPlus />` 유지, tooltip만 `"이미지 업로드"`로 변경 |
| 저장 위치 | `SketchCanvas.uploadedImageData` 내부 상태 (노드 `thumbnailData` 미반영) |
| 제거 방식 | undo/redo 히스토리로 관리 — 업로드가 스냅샷으로 진입, undo 시 이전 상태 복귀 |
| Grid | 업로드 이미지 아래(z=0), grid는 `!hasThumbnail` 조건 유지 (변경 없음) |
| export | 업로드 이미지 → 드로잉 Canvas → Text items 순으로 합성 (grid 미포함) |

#### LeftToolbar.tsx 수정

> **구현 변경**: LeftToolbar prop 추가 대신 ExpandedView 스케치 전용 툴바에 `[+]` 버튼 직접 구현 (동일 기능)

- [x] Props에 `onUploadImage?: () => void` 추가 — ExpandedView 내부 `handleUploadImage`로 대체 구현
- [x] `[+]` 버튼: ExpandedView 스케치 툴바에서 `onClick={handleUploadImage}`, `title="이미지 업로드"` 적용

#### ExpandedView.tsx 수정

- [x] Props에 `onUploadImage?: () => void` 추가
- [x] sketch image 모드 분기(`node.artboardType === 'sketch' && node.type === 'image'`):
  - `handleUploadImage` → `sketchCanvasRef.current?.uploadTrigger()` 내부 처리
- [x] 기타 노드: `<LeftToolbar onAddArtboard={onAddArtboard} ...>` 기존 유지

#### SketchCanvas.tsx 수정

##### 히스토리 타입 확장

```ts
type HistoryEntry = {
  paths: Path[];
  uploadedImageData: string | null;
};
```
기존 path 배열 단독 스택 → `{ paths, uploadedImageData }` 스냅샷 방식으로 교체. undo/redo 시 두 상태를 함께 복원.

##### 상태 및 ref 추가

```ts
const [uploadedImageData, setUploadedImageData] = useState<string | null>(null);
const fileInputRef = useRef<HTMLInputElement>(null);
```

##### `uploadTrigger()` — `useImperativeHandle`에 추가

```ts
// SketchCanvasHandle 타입에 추가
uploadTrigger: () => void;
// 구현
uploadTrigger: () => fileInputRef.current?.click(),
```

##### `handleUpload(file: File)` 구현

1. `FileReader.readAsDataURL(file)` → base64 변환
2. 현재 `{ paths, uploadedImageData }` 스냅샷 → undo 스택 push
3. `setUploadedImageData(base64)` — 기존 paths 유지
4. redo 스택 초기화

##### 숨겨진 파일 input

```tsx
<input
  type="file"
  accept="image/*"
  ref={fileInputRef}
  style={{ display: 'none' }}
  onChange={e => {
    const f = e.target.files?.[0];
    if (f) handleUpload(f);
    e.target.value = '';
  }}
/>
```

##### 레이어 렌더링

- [x] `uploadedImageData !== null` 시 `<img src={uploadedImageData} />` 추가 (z-order 0, `object-fit: contain`, `pointer-events: none`, `position: absolute inset-0`)
- [x] Grid 조건은 `!hasThumbnail` 그대로 유지 (Phase 4-C 변경 없음)

##### `exportAsBase64()` 수정

1. 임시 Canvas 생성 (SketchCanvas 실제 픽셀 크기)
2. `uploadedImageData` 존재 시 → 최하단에 `drawImage`
3. 드로잉 Canvas 내용 합성
4. Text items `fillText` 합성 (Phase 4-B 기준)
5. `toDataURL('image/png')` 반환
- grid는 export 대상 아님 (시각 보조선)

#### page.tsx 수정

- [x] `sketchCanvasRef` 타입에 `uploadTrigger` 포함 확인 — ExpandedView 내부 ref로 처리
- [x] `handleUploadImage` 핸들러: ExpandedView 내부에서 `sketchCanvasRef.current?.uploadTrigger()` 직접 호출
- [x] `<ExpandedView onUploadImage={handleUploadImage} ...>` 전달 — 내부 처리로 대체

#### 검증 기준

- image ExpandedView 진입 → `[+]` 버튼 tooltip `"이미지 업로드"` 확인
- `[+]` 클릭 → 파일 선택 다이얼로그 오픈
- 이미지 선택 → SketchCanvas 배경(z=0)에 이미지 표시, grid(z=1)가 위에 겹쳐 표시
- 이미지 위에 pen 드로잉 → 드로잉 레이어(z=3)가 이미지 + grid 위에 합성
- undo → 이미지 제거, 이전 paths 복귀, grid 그대로 표시
- redo → 이미지 재표시
- 두 번째 이미지 업로드 → undo 시 이전 이미지 복원
- GENERATE → `exportAsBase64()` 결과: 업로드 이미지 + 드로잉 합성 확인 (grid 미포함)
- 일반 캔버스(image ExpandedView 외) → `[+]` 버튼 아트보드 추가 동작 유지

---

### Phase 5 — SketchToImagePanel 컴포넌트
- [x] `project_canvas/components/panels/SketchToImagePanel.tsx` 생성
  - 텍스트 프롬프트 textarea (max 2000자, 글자수 표시)
  - Sketch Mode 토글: CONCEPT / DETAIL
  - Style 그리드: A~G + NONE (8개, 각 설명 포함)
  - Aspect Ratio 셀렉터: 1:1 / 4:3 / 16:9
  - Resolution 셀렉터: FAST / NORMAL / HIGH QUALITY
  - GENERATE 버튼 (로딩 중 비활성, 스피너 표시)
  - 에러 메시지 표시 영역
  - 디자인: Bebas Neue 레이블, `--shadow-float`, `--radius-box` 토큰 적용

### Phase 6 — GeneratingToast 컴포넌트
- [x] `project_canvas/components/GeneratingToast.tsx` 생성
  - Props: `elapsedSeconds: number`, `onCancel: () => void`
  - 회전 로더 (CSS `animate-spin` 또는 커스텀 rotate 키프레임)
  - "IMAGE GENERATING ##s" 텍스트 (`elapsedSeconds` 실시간 반영)
  - `⨉` 버튼 → `onCancel` 호출
  - `position: fixed`, `bottom: 32px`, `left: 50%`, `transform: translateX(-50%)`
  - 알약 스타일: `border-radius` 9999px, `--shadow-float` 토큰 적용
  - 카운트업 타이머: `useEffect` 1초 인터벌, 언마운트 시 `clearInterval`

### Phase 7 — ExpandedView 업데이트
- [x] `project_canvas/components/ExpandedView.tsx` 수정
  - `node.artboardType === 'sketch' && node.type === 'image'` 분기: 전용 레이아웃 렌더
    - 메인 영역 (좌): `<SketchCanvas>` (드로잉 + 업로드)
      - `node.hasThumbnail = false` → 빈 캔버스로 진입
      - `node.hasThumbnail = true` → `node.thumbnailData`를 배경 레이어로 자동 로드 (edit 모드)
    - 우측 패널: `<SketchToImagePanel>` (옵션 + GENERATE)
  - GENERATE 클릭 흐름:
    1. `sketchCanvas.exportAsBase64()` → 스케치 base64 추출
    2. `useBlueprintGeneration.generate(params)` 호출
    3. 성공 → `onGenerateComplete({ sketchBase64, generatedBase64 })` 콜백 호출
       - 원본 노드: `thumbnailData = sketchBase64`, `hasThumbnail = true`
       - 새 노드 자동 생성: `thumbnailData = generatedBase64`, `hasThumbnail = true`
       - 새 노드 type: `type: 'image'`, `artboardType: 'sketch'`
       - edge 자동 생성: 원본 노드 → 새 노드
       - ExpandedView 닫힘 → 캔버스 자동 복귀
    4. 실패 → 에러 메시지 표시 (ExpandedView 유지)
  - `node.type !== 'image'` 분기: 기존 placeholder 유지

### Phase 8 — NodeCard 썸네일 표시
- [x] `project_canvas/components/NodeCard.tsx` 수정
  - `hasThumbnail && thumbnailData` 조건 시 `<img src={thumbnailData} />` 렌더링
  - 이미지: `object-fit: cover`, 전체 카드 크기 맞춤
  - 기존 그라디언트 placeholder는 `!thumbnailData` 조건으로 유지

### Phase 9 — page.tsx 콜백 연결
- [x] `project_canvas/app/page.tsx` 수정
  - `AbortController` 인스턴스 생성 → `useBlueprintGeneration.generate()` 에 전달
  - `isGenerating` 상태로 `<GeneratingToast>` 마운트/언마운트 제어
    - GENERATE 시작 → `isGenerating = true` → Toast 마운트
    - 성공/실패/취소 → `isGenerating = false` → Toast 언마운트
  - Toast `onCancel` → `abortController.abort()` 호출
  - `handleGenerateComplete({ sketchBase64, generatedBase64 })` 핸들러 추가
    - 원본 노드 업데이트: `thumbnailData = sketchBase64`, `hasThumbnail = true`
    - 새 노드 생성: `type: 'image'`, `artboardType: 'sketch'`, `thumbnailData = generatedBase64`, `hasThumbnail = true`
      - 위치: 기존 `autoLayout.ts` 활용, 원본 노드 우측 배치
    - edge 생성: 원본 노드 id → 새 노드 id
    - history push (undo 가능)
    - `expandedNodeId = null` → 캔버스 자동 복귀

### Phase 10 — TypeScript 빌드 + 브라우저 검증
- [x] `npm run build` 실행 → 에러 0 목표
- [x] 브라우저 검증: image 노드 expand → 드로잉 → GENERATE → 카드 썸네일 확인

---

## 다음 업데이트 (향후 처리)

> Q2/Q5 관련 항목은 `artboard-system-apply-260423` 완료로 처리됨

- ~~빈 아트보드(type-less) 생성 시스템 전환~~ ✓ 아트보드 시스템 적용 완료
- ~~아트보드 선택 → 오른쪽 패널 'image' 클릭 → ExpandedView 자동 오픈 트리거~~ ✓ 아트보드 시스템 적용 완료
- sketch 노드 드로잉 데이터 → image 노드 자동 전달 연결 (Phase 7·9에서 처리)
