# 작업지시서: Sketch-Image ExpandedView 버그 수정 v2

**일시**: 2026-04-23  
**파일 대상**: SketchCanvas.tsx, ExpandedView.tsx, app/page.tsx

---

## 수행 목표

sketch-image ExpandedView 에서 발생하는 6가지 이슈 수정

---

## 이슈 분석

### 이슈 1 — 태블릿 pen 미작동 (Palm rejection + drag 방지)
- **원인**: `handlePointerDown/Move/Up`이 `pointerType` 구분 없이 모든 포인터를 `pointerPositions` Map에 추가.
  Apple Pencil로 그리는 중 Palm이 스크린에 닿으면 `pointerPositions.size >= 2` → 핀치 모드 진입 → drawing 차단.
- **추가**: pencil 사용 중 브라우저가 drag로 인식하는 문제 방지 필요.
- **수정 방향**:
  - `penActiveRef` 추가 — pencil(`pointerType === 'pen'`)이 활성 중이면 touch 이벤트 무시
  - canvas에 `onDragStart={e => e.preventDefault()}` + `draggable={false}` + `userSelect: 'none'`

### 이슈 2 — 줌 배율 100%~200%
- **원인**: 현재 줌 범위 20~400%.
- **수정 방향**:
  - SketchCanvas.tsx: 핀치/휠 줌 범위 → `Math.max(100, Math.min(200, ...))`
  - ExpandedView.tsx: zoom 버튼 상하한 100~200 (zoom-out 버튼 유지)

### 이슈 3 — 업로드 이미지 줌 미연동
- **원인**: 업로드 이미지가 `<img objectFit:contain>` 별도 레이어로 렌더링 — 캔버스 zoom/offset transform 미적용.
- **수정 방향**:
  - `<img>` 태그 제거
  - `uploadedImgElRef` + `imgVersion` state 추가 → 이미지 로드 추적
  - canvas 렌더링 useEffect 내부 (zoom/offset transform 적용 후) 이미지 그리기
  - objectFit:contain 로직: `scale = Math.min(W/iW, H/iH)`, 세계 좌표 중심 배치

### 이슈 4 — [<-] 클릭 시 스케치 썸네일 표시
- **원인**: `handleReturnFromExpand`에서 sketch-image 노드는 thumbnail 미설정. 현재는 GENERATE 완료 시에만 설정됨.
- **수정 방향**:
  - ExpandedView에 `onCollapseWithSketch?: (sketchBase64: string) => void` prop 추가
  - [<-] 클릭 시 `handleSketchCollapse`: `exportAsBase64()` 캡처 → `onCollapseWithSketch` 호출 → `onCollapse`
  - page.tsx: `handleCollapseWithSketch` — `hasThumbnail: true`, `thumbnailData: sketchBase64` 설정

### 이슈 5 — GENERATE 클릭 시 즉시 캔버스 표시 (실패 시 ExpandedView 복귀)
- **원인**: 현재 ExpandedView 안에서 생성 완료까지 대기 후 자동 collapse.
- **수정 방향**:
  - `handleGenerate`: sketch 캡처 → `onGeneratingChange(true)` → `onCollapseWithSketch(sketchBase64)` → `onCollapse()` → 백그라운드 생성
  - 성공: `onGenerateComplete` 호출
  - 실패: `onGenerateError(nodeId)` 호출 → page.tsx에서 `setExpandedNodeId(nodeId)` 재진입
  - `onAbortControllerReady` prop 추가 → page.tsx의 `abortControllerRef` 동기화 (취소 버튼 작동)

### 이슈 6 — Expand 진입 시 항상 grid 표시
- **원인**: SketchCanvas에서 `!hasThumbnail &&` 조건으로 grid 숨김.
- **수정 방향**:
  - `!hasThumbnail &&` 조건 제거 → grid 항상 표시
  - z=2 thumbnail 배경 레이어 제거 (이슈 4 "기존 썸네일 로직 제거")

---

## 체크리스트

### SketchCanvas.tsx
- [x] **이슈1** `penActiveRef` 추가 — pen pointerType 활성 여부 추적
- [x] **이슈1** `handlePointerDown`: `pointerType === 'pen'` → `penActiveRef=true`, `pointerPositions` 미등록, 드로잉 처리
- [x] **이슈1** `handlePointerDown`: `pointerType === 'touch'` → `penActiveRef.current` 이면 즉시 return (palm 무시)
- [x] **이슈1** `handlePointerMove`: pen 이벤트면 `pointerPositions` 업데이트 skip, touch 이벤트면 pen 활성 시 무시
- [x] **이슈1** `handlePointerUp`: pen up → `penActiveRef=false`
- [x] **이슈1** canvas 요소: `draggable={false}`, `onDragStart={e => e.preventDefault()}`, style에 `userSelect: 'none'`
- [x] **이슈2** 휠 줌 범위: `Math.max(100, Math.min(200, ...))`
- [x] **이슈2** 핀치 줌 범위: `Math.max(100, Math.min(200, ...))`
- [x] **이슈3** `uploadedImgElRef` + `imgVersion` state 추가
- [x] **이슈3** uploadedImageData useEffect: Image 객체 로드 → ref 저장 → imgVersion 증가
- [x] **이슈3** canvas 렌더링 useEffect: transform 내부에서 업로드 이미지 그리기 (objectFit:contain)
- [x] **이슈3** `<img>` 태그 제거
- [x] **이슈6** `!hasThumbnail &&` 조건 제거 (grid 항상 표시)
- [x] **이슈6** z=2 thumbnail 배경 레이어 제거

### ExpandedView.tsx
- [x] **이슈4** `onCollapseWithSketch?: (sketchBase64: string) => void` prop 추가
- [x] **이슈5** `onGenerateError?: (nodeId: string) => void` prop 추가
- [x] **이슈5** `onAbortControllerReady?: (ctrl: AbortController) => void` prop 추가
- [x] **이슈4** `handleSketchCollapse`: exportAsBase64 → onCollapseWithSketch → onCollapse
- [x] **이슈5** `handleGenerate` 수정: 즉시 collapse + 백그라운드 생성 + 실패 시 onGenerateError
- [x] **이슈2** zoom-in/out 버튼 상하한 100~200

### page.tsx
- [x] **이슈4** `handleCollapseWithSketch`: `hasThumbnail: true`, `thumbnailData: sketchBase64` 노드 업데이트
- [x] **이슈5** `handleGenerateError`: `setExpandedNodeId(nodeId)`, `setIsGenerating(false)`
- [x] **이슈5** `handleAbortControllerReady`: `abortControllerRef.current = ctrl`
- [x] **이슈5** ExpandedView에 3개 새 prop 전달
