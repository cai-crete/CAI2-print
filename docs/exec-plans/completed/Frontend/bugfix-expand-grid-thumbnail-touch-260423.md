# Exec Plan: 세 가지 버그 수정 — Expand Grid / Thumbnail Ratio / Touch Select
**생성일**: 2026-04-23  
**세션**: 10  
**담당**: AGENT C

---

## 배경

이전 v3 exec-plan(completed) 이후 신규 세 가지 버그 보고.
사용자 수정 지시: "Expand 시 sketch 데이터가 아닌 generated image에서 입력 정보를 갖도록 변경"

---

## 근본 원인 분석

### BUG-1: Expand 시 Grid 소실 (흰 배경 확장)
- `ExpandedView.tsx`: `loadImage(node.sketchData ?? node.generatedImageData)` — sketch 우선
- `sketchData` = `exportAsBase64()` 결과 (흰 배경 포함) → canvas 전체 흰색 → InfiniteGrid 가림

### BUG-2: Collapse 후 썸네일 비율 변경
- `handleCollapseWithSketch`: `thumbnailData = exportAsBase64()` — 뷰포트 크기 레터박스
- 원본 `generatedImageData`(AI 출력, cover 비율)와 달라져 썸네일 왜곡

### BUG-3: 터치 'select' 미작동
- `handleNodeMouseDown` touch → 항상 isPanning=true
- 이벤트 버블링 → `handleWrapperPointerDown`에서 activeTouchCount 이중 증가(=2) → 즉시 panning 취소
- 결과: panning/selection 모두 안 됨

---

## 작업 체크리스트

### [1] BUG-1: Expand 입력 소스 변경 + Grid 가시성
- [x] `ExpandedView.tsx`: `useEffect` — `node.generatedImageData ?? node.sketchData` (generated 우선)
- [x] `SketchCanvas.tsx`: `loadImage` imperative handle — `removeWhiteBackground()` 비동기 적용
  - 흰 배경 제거 → InfiniteGrid 가시성 확보

### [2] BUG-2: Collapse 시 thumbnailData 원본 유지
- [x] `page.tsx`: `handleCollapseWithSketch`
  - `updates.thumbnailData = n.generatedImageData ?? sketchBase64`
  - `generatedImageData` 있는 노드: 원본 AI 이미지 유지
  - 없는 노드(스케치 소스): 기존대로 sketchBase64

### [3] BUG-3: 터치 'select' 기능 구현
- [x] `InfiniteCanvas.tsx`: `handleWrapperPointerDown`
  - `isBackground = target === wrapperRef.current || target.dataset.canvasLayer === 'true'`
  - 노드에서 버블된 터치(`!isBackground`) → `return` (이중 카운트 방지)
- [x] `InfiniteCanvas.tsx`: `handleNodeMouseDown`
  - `handle` 모드: isPanning 시작 (기존)
  - `cursor` 모드: pendingNodeId 설정 → 선택/드래그
  - count >= 2: isPanning 취소, pendingNodeId 초기화

---

## 완료 기준

- Expand 시 `generatedImageData` 우선 로드
- InfiniteGrid 격자선 정상 표시 (흰 배경 제거)
- Collapse 후 썸네일이 원본 AI 이미지 비율 유지
- 'cursor' 모드 단일 터치 → 노드 선택 동작
- 'handle' 모드 단일 터치 → 팬 동작 유지

---

COPYRIGHTS 2026. CRE-TE CO.,LTD. ALL RIGHTS RESERVED.
