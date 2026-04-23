---
title: 미들 버튼 팬(Middle Button Panning) 구현
created: 2026-04-22
status: active
---

## 목적

InfiniteCanvas에 마우스 휠 버튼(button=1) 클릭+드래그 패닝을 추가한다.
툴 모드(cursor/handle)와 무관하게 항상 작동해야 한다.

## 스펙 (사용자 제공)

```
e.button === 1 (휠 클릭) && pointerType !== 'touch'
  → isMiddleButtonPanning = true
  → dragStart, offsetAtDragStart 저장
  → setPointerCapture
  → cursor → 'grabbing'

pointerMove: isMiddleButtonPanning → offset 업데이트
pointerUp:   isMiddleButtonPanning = false → cursor 복구
```

cursor 복구 기준 (`canvasModeRef`):
- pan 버튼 클릭 중(isDraggingPan) → 'grabbing'
- pan 버튼 클릭 해제(handle 모드 대기) → 'grab'
- pen/eraser → 'none'
- 그 외 → 'default'

## 체크리스트

- [ ] `isMiddleButtonPanningRef` (Ref) + `isMiddleButtonPanning` (State) 추가
- [ ] `handleWrapperMouseDown`: button===1 분기 — 이른 반환, 팬 시작 저장
- [ ] global `onMove` useEffect: `isMiddleButtonPanningRef` 분기 → offset 갱신 (최우선)
- [ ] global `onUp` useEffect: `isMiddleButtonPanningRef` 분기 → flag 해제 + state 업데이트
- [ ] cursor 계산: `isMiddleButtonPanning` → 'grabbing' 최우선 / pan 모드 대기 → 'grab' / pan 드래그 중 → 'grabbing' / 그 외 → 'default'
- [ ] `auxclick` 기본 동작 방지 (e.button===1 mousedown에서 preventDefault)
- [ ] TypeScript 컴파일 오류 없음 확인
