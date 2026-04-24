---
title: 태블릿/캔버스 4종 버그 수정
created: 2026-04-23
status: active
---

## 버그 목록

| # | 증상 | 원인 파일 | 핵심 원인 |
|---|------|-----------|-----------|
| 1 | 아트보드 해상도 낮음 | InfiniteCanvas.tsx | 노드 position 부동소수점 → 서브픽셀 블러 |
| 2 | 태블릿 펜슬 드래그 시 툴바 아이템 선택됨 | LeftToolbar.tsx, NodeCard.tsx | onMouseEnter/Leave/Down/Up 이 pen pointerType에도 발화 |
| 3 | 태블릿 한 손가락 터치 → 버튼 클릭도 패닝으로 처리 | InfiniteCanvas.tsx | handleNodeMouseDown에서 touch pointerType 분기 없음 |
| 4 | 노드 삭제 후 undo 시 연결 선 미복구 | page.tsx | history가 nodes[][]만 저장, edges 미포함 |

---

## Phase 체크리스트

### Phase 1 — Bug 1: 아트보드 해상도
- [x] `InfiniteCanvas.tsx`: 노드 렌더링 시 position을 `Math.round()` 적용

### Phase 2 — Bug 2: 펜슬 드래그 → 툴바 선택
- [x] `LeftToolbar.tsx`: `onMouseEnter/Leave/Down/Up` → `onPointerEnter/Leave/Down/Up` + `pointerType === 'mouse'` 체크
- [x] `NodeCard.tsx`: 액션 버튼 + 확대 버튼 동일 처리

### Phase 3 — Bug 3: 단일 터치 → 패닝 강제
- [x] `InfiniteCanvas.tsx > handleNodeMouseDown`: `pointerType === 'touch'` 시 노드 드래그 대신 패닝 시작

### Phase 4 — Bug 4: Undo 시 edge 복구
- [x] `page.tsx`: history 타입을 `{nodes: CanvasNode[], edges: CanvasEdge[]}[]` 로 변경
- [x] `page.tsx`: `edgesRef` 추가 (stale closure 방지)
- [x] `page.tsx`: `pushHistory(nextNodes, nextEdges?)` 시그니처 변경
- [x] `page.tsx`: `undo()` / `redo()` 에서 `setEdges` 복구 추가
- [x] `page.tsx`: `deleteNode()` 에서 `setEdges()` 별도 호출 제거, `pushHistory(nextNodes, nextEdges)` 통합
- [x] `page.tsx`: `handleReturnFromExpand` / `commitNodePosition` — setHistory 직접 호출 시 edges 포함

### Phase 5 — 검증
- [x] `npm run build` 에러 0 (TypeScript 에러 0)
- [ ] 브라우저 검증: 노드 2개 생성 → 연결 → 노드 삭제 → undo → 선 복구 확인
- [ ] 태블릿 모드: 펜슬 드래그 시 툴바 호버 없음 확인
- [ ] 태블릿 모드: 노드 위 한 손가락 터치 드래그 → 패닝 확인
- [ ] 아트보드 카드 선명도 개선 확인
