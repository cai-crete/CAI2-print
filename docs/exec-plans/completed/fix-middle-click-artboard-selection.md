---
작업명: 아트보드 미들 클릭 선택 방지
생성일: 2026-04-22
상태: active
---

## 문제

마우스 중간 휠(미들 버튼) 클릭 시 아트보드가 선택됨.
- 캔버스 배경에서 미들 클릭 → 팬(pan) 정상 동작
- 아트보드 위에서 미들 클릭 → 팬은 되지만 동시에 아트보드 선택됨

## 원인

`NodeCard.handleArtboardPointerDown/Up`이 버튼 종류를 구분하지 않아,
미들 버튼(e.button === 1) 클릭도 `pendingNodeId` 설정 및 `onSelect` 호출로 이어짐.

## 수정 계획

- [ ] `NodeCard.tsx` — `handleArtboardPointerDown`: `e.button === 1` 시 early return
- [ ] `NodeCard.tsx` — `handleArtboardPointerUp`: `e.button === 1` 시 early return
- [ ] `InfiniteCanvas.tsx` — `handleNodeMouseDown`: `e.button !== 0` 시 early return
- [ ] `docs/exec-plans/progress/claude-progress.txt` 업데이트
