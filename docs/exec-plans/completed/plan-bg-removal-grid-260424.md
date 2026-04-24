---
title: Expand 시 Grid 항상 표시 + Plan 생성 이미지만 배경 제거
created: 2026-04-24
status: active
---

## 목적

Expand 화면에서 Grid가 Plan 생성 이미지의 흰색 배경에 가려지는 문제를 해결한다.
Plan에서 생성된 CAD 평면도 이미지는 흰색 배경을 제거하여 Grid가 투과 보이도록 하고,
그 외 모든 이미지는 원본을 유지한다.

---

## 해결 방안 및 구현 스펙

### 1. SketchCanvas.tsx — loadImage에 removeBackground 옵션 추가
- `SketchCanvasHandle` 인터페이스의 `loadImage` 시그니처에 `removeBackground?: boolean` 추가
- `useImperativeHandle` 내 구현에서: `removeBackground=true`이면 기존 `removeWhiteBackground` 적용, 아니면 원본 dataUrl 직접 주입

### 2. SketchToPlanExpandedView.tsx — generatedImageData 로드 시만 removeBackground 활성화
- `node.generatedImageData`가 있을 때: `loadImage(generatedImageData, true)` — 배경 제거
- `node.sketchData`만 있을 때: `loadImage(sketchData, false)` — 원본 유지

### 3. SketchToImageExpandedView.tsx — 변경 없음 (이미 removeBackground 미사용)
- 기존 코드 그대로 유지 (removeBackground 기본값 false)

---

## 작업 체크리스트

- [ ] `components/SketchCanvas.tsx` — `SketchCanvasHandle.loadImage` 시그니처 + 구현 수정
- [ ] `sketch-to-plan/ExpandedView.tsx` — loadImage 호출 시 removeBackground 조건부 전달
- [ ] 빌드 확인
