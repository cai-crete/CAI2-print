# Exec Plan: sketch-expanded-view 기능 확장 v3
**생성일**: 2026-04-23  
**세션**: 9  
**담당**: AGENT C

---

## 배경

이전 세션(8)에서 BUG-1(ExpandedView 재진입 시 스케치 복원)에 대한 1차 픽스를 적용했으나,
root cause가 해소되지 않아 여전히 정보 유실이 발생함.

---

## 근본 원인 분석

### BUG-1 Root Cause A
`SketchCanvas.loadImage(rawBase64)` → `img.src = rawBase64` (prefix 없음)
→ Image 로드 실패 → 캔버스 빈 상태

`exportAsBase64()`는 `.split(',')[1]`로 raw base64만 반환하지만,
`img.src`는 `data:image/png;base64,...` prefix가 있어야 로드됨.

### BUG-1 Root Cause B
ESC 키 핸들러 (`page.tsx`) → `handleReturnFromExpand()` 호출
→ `exportAsBase64()` 없이 닫힘 → `sketchData` 미저장

### BUG-1 Root Cause C
생성된 자식 노드에 `sketchData` 없고 `generatedImageData`만 있음
→ useEffect 복원 불가

---

## 작업 체크리스트

### [1] BUG-1: ExpandedView 재진입 정보 유실 완전 수정

- [x] `SketchCanvas.tsx`: `uploadedImageData` img.src prefix 정규화
  - `img.src = data.startsWith('data:') ? data : \`data:image/png;base64,\${data}\``
- [x] `ExpandedView.tsx`: ESC 키 캡처 → `handleSketchCollapse` 호출 (stopPropagation)
- [x] `ExpandedView.tsx`: `useEffect([node.id])` fallback → `node.generatedImageData`
- [x] `page.tsx`: `handleGenerateComplete`에서 child node에 `sketchData: generatedBase64` 추가
- [x] `types/canvas.ts`: `SketchPanelSettings` 인터페이스 추가, `CanvasNode`에 필드 추가
- [x] `ExpandedView.tsx`: 패널 설정 `node.sketchPanelSettings`에서 초기화
- [x] `ExpandedView.tsx`: 닫힐 때 패널 설정 → `onCollapseWithSketch(base64, settings)` 전달
- [x] `page.tsx`: `handleCollapseWithSketch` → 패널 설정 저장

### [2] 줌 최대 400%

- [x] `SketchCanvas.tsx`: 핀치 줌 max `200 → 400`
- [x] `SketchCanvas.tsx`: 휠 줌 max `200 → 400`
- [x] `SketchCanvas.tsx`: 확대 버튼 max `200 → 400`

### [3] 마우스 가운데 휠 클릭 패닝

- [x] `SketchCanvas.tsx`: `e.button === 1` 감지 → `isPanning.current = true`
- [x] `SketchCanvas.tsx`: 기존 pan 로직 재사용 (`isPanning.current` 통합)
- [x] `SketchCanvas.tsx`: mousedown 리스너에서 middle button default 방지

### [4] undo/redo 업로드 이미지 포함

- [x] `SketchCanvas.tsx`: `handleUpload`에서 `pushSnapshot(paths, newBase64)` (신규 이미지 포함)

### [5] eraser → 업로드 이미지 제외

- [x] `SketchCanvas.tsx`: render useEffect → offscreen canvas에 drawing layer
- [x] `SketchCanvas.tsx`: `exportAsBase64` → offscreen으로 drawing layer 재구성

### [6] 업로드 이미지 흰색 배경 제거

- [x] `SketchCanvas.tsx`: `removeWhiteBackground(dataUrl)` 헬퍼 추가
- [x] `SketchCanvas.tsx`: `handleUpload` async로 변경, 업로드 시 자동 적용

### [7] 태블릿 단일 터치 패닝

- [x] `SketchCanvas.tsx`: `pointerType === 'touch'` && single finger → 항상 pan
- [x] `SketchCanvas.tsx`: `handlePointerMove` pan 조건 통합 (`isPanning.current`)

### [8] GENERATE 전역 비활성화

- [x] `ExpandedView.tsx`: `isGenerating?: boolean` prop 추가
- [x] `page.tsx`: `<ExpandedView isGenerating={isGenerating} />`
- [x] `SketchToImagePanel`: `effectiveIsGenerating = globalIsGenerating || isLoading`

---

## 완료 기준

- ExpandedView 재진입 시 스케치/업로드/생성 이미지 및 패널 설정 복원됨
- ESC 키로 닫아도 데이터 유지됨
- 줌 400% 동작
- 가운데 마우스 버튼 패닝 동작
- undo/redo에 업로드 이미지 포함됨
- eraser가 업로드 이미지에 영향 없음
- 업로드 시 흰색 배경 자동 제거
- 태블릿 단일 터치 패닝 동작
- GENERATE 토스트 중 모든 GENERATE 버튼 비활성화

---

COPYRIGHTS 2026. CRE-TE CO.,LTD. ALL RIGHTS RESERVED.
