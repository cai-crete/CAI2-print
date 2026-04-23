# 작업지시서: Drag Select (Rubber Band Selection) 구현

**작성일:** 2026-04-22  
**우선순위:** 캔버스 핵심 인터랙션  
**참조 문서:** `drag-select-rubber-band.md` (사용자 업로드)

---

## 현황 분석 (Gap Analysis)

| 항목 | 현재 | 목표 |
|------|------|------|
| 선택 모델 | `selectedNodeId: string \| null` (단일) | `selectedNodeIds: string[]` (다중) |
| 배경 이벤트 | Mouse Events (global listener) | 기존 유지 + rubber band 통합 |
| 좌표 변환 | `toWorld()` — `canvas.ts`에 이미 존재 | 재사용 |
| 노드 크기 | CARD_W=280, CARD_H=198 (NodeCard 고정값) | AABB 상수로 정의 |
| Rubber band rect | 없음 | `dragSelectRect` state + overlay JSX |

### 특이사항

- `canvas.ts`에 `toWorld(screenX, screenY, viewport)` 함수가 이미 구현되어 있어 `getCanvasCoords()` 역할을 대체함
- 기존 이벤트 시스템이 global `mousemove`/`mouseup`이므로 Pointer Events가 아닌 기존 방식에 통합
- `handleWrapperMouseDown`의 배경 판정 로직(`target === wrapperRef || data-canvas-layer`)을 그대로 활용

---

## 구현 체크리스트

### Step 1: 선택 모델 확장 — `page.tsx`

- [ ] `selectedNodeId: string | null` → `selectedNodeIds: string[]` (빈 배열 초기값)
- [ ] `setActiveTool`과 연동된 기존 `handleNodeCardSelect` 수정
  - 단일 클릭: `setSelectedNodeIds([id])` + 사이드바 열기
  - 다중 선택(rubber band): `setSelectedNodeIds(ids)` + 사이드바 닫기
- [ ] `onNodeDeselect` → `setSelectedNodeIds([])` + 사이드바 닫기
- [ ] `InfiniteCanvas`에 `onNodesSelect: (ids: string[]) => void` prop 추가
- [ ] `selectedNodeId` 참조 전체를 `selectedNodeIds` 배열로 교체

### Step 2: NodeCard — `isSelected` 수정

- [ ] Props: `isSelected: boolean` 유지 (계산은 상위에서)
- [ ] `InfiniteCanvas` 내 렌더링: `isSelected={selectedNodeIds.includes(node.id)}`

### Step 3: `InfiniteCanvas.tsx` — rubber band 상태 및 refs 추가

```ts
// 추가할 state
const [dragSelectRect, setDragSelectRect] = useState<{
  startX: number; startY: number; endX: number; endY: number;
} | null>(null);

// 추가할 refs
const dragSelectStartRef = useRef<{ ptX: number; ptY: number } | null>(null);
const isDragSelectingRef = useRef(false);
```

- [ ] `useState` import에 추가
- [ ] 위 state/refs 선언

### Step 4: `InfiniteCanvas.tsx` — AABB 상수 정의

```ts
const CARD_W = 280;  // NodeCard 고정 픽셀 (17.5rem)
const CARD_H = 198;  // NodeCard 고정 픽셀 (12.375rem)
```

- [ ] 파일 상단 상수 영역에 추가

### Step 5: `InfiniteCanvas.tsx` — `handleWrapperMouseDown` 수정

cursor 모드 + 배경 클릭 시 rubber band 시작:

```ts
if (activeTool === 'cursor') {
  onNodeDeselect();
  const rect = wrapperRef.current!.getBoundingClientRect();
  const pt = toWorld(e.clientX - rect.left, e.clientY - rect.top, { offset: offsetRef.current, scale: scaleRef.current });
  dragSelectStartRef.current = { ptX: pt.x, ptY: pt.y };
  isDragSelectingRef.current = false;
}
```

- [ ] `cursor` 모드 분기 추가
- [ ] `toWorld` import 확인 (`@/types/canvas`)

### Step 6: `InfiniteCanvas.tsx` — global `onMove` 수정

rubber band rect 갱신:

```ts
// drag select rect update (cursor mode)
if (dragSelectStartRef.current) {
  const rect = (wrapperRef.current as HTMLElement).getBoundingClientRect();
  const pt = toWorld(e.clientX - rect.left, e.clientY - rect.top, { offset: offsetRef.current, scale: scaleRef.current });
  isDragSelectingRef.current = true;
  setDragSelectRect({
    startX: dragSelectStartRef.current.ptX,
    startY: dragSelectStartRef.current.ptY,
    endX: pt.x,
    endY: pt.y,
  });
}
```

- [ ] pan/노드 드래그 이후 순서로 추가

### Step 7: `InfiniteCanvas.tsx` — global `onUp` 수정

rubber band 확정 + AABB 교차 판정:

```ts
if (dragSelectStartRef.current) {
  if (isDragSelectingRef.current) {
    setDragSelectRect(prev => {
      if (!prev) return null;
      const minX = Math.min(prev.startX, prev.endX);
      const maxX = Math.max(prev.startX, prev.endX);
      const minY = Math.min(prev.startY, prev.endY);
      const maxY = Math.max(prev.startY, prev.endY);
      const selected = nodesRef.current
        .filter(n =>
          n.position.x < maxX && n.position.x + CARD_W > minX &&
          n.position.y < maxY && n.position.y + CARD_H > minY
        )
        .map(n => n.id);
      onNodesSelect(selected);
      return null;
    });
  }
  dragSelectStartRef.current = null;
  isDragSelectingRef.current = false;
  return;
}
```

- [ ] 추가

### Step 8: `InfiniteCanvas.tsx` — rubber band overlay JSX 추가

```tsx
{dragSelectRect && (() => {
  const left   = Math.min(dragSelectRect.startX, dragSelectRect.endX);
  const top    = Math.min(dragSelectRect.startY, dragSelectRect.endY);
  const width  = Math.abs(dragSelectRect.endX - dragSelectRect.startX);
  const height = Math.abs(dragSelectRect.endY - dragSelectRect.startY);
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 103 }}>
      <div style={{
        position: 'absolute', top: 0, left: 0,
        transformOrigin: '0 0',
        transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
      }}>
        <div style={{
          position: 'absolute',
          left, top, width, height,
          border: '1.5px dashed #4f9cf9',
          background: 'rgba(79,156,249,0.08)',
          pointerEvents: 'none',
        }} />
      </div>
    </div>
  );
})()}
```

- [ ] 캔버스 변환 레이어 바깥, wrapper div 내부 마지막에 추가

### Step 9: Props 인터페이스 업데이트

- [ ] `InfiniteCanvas` Props:
  - `selectedNodeId: string | null` → `selectedNodeIds: string[]`
  - `onNodesSelect: (ids: string[]) => void` 추가
- [ ] `page.tsx`에서 해당 props 전달

### Step 10: 검증

- [ ] `npm run dev` 실행
- [ ] cursor 모드에서 빈 캔버스 드래그 → 파란 점선 rect 표시 확인
- [ ] 드래그 종료 → 범위 내 노드 다중 선택(검정 border) 확인
- [ ] 빈 캔버스 클릭 → 전체 선택 해제 확인
- [ ] 단일 노드 클릭 → 단일 선택 + 사이드바 열림 확인
- [ ] pan 모드에서는 rubber band 미작동 확인

---

## 영향 범위

| 파일 | 변경 유형 |
|------|----------|
| `project_canvas/app/page.tsx` | 선택 모델 확장 |
| `project_canvas/components/InfiniteCanvas.tsx` | rubber band 전체 구현 |
| `project_canvas/components/NodeCard.tsx` | 변경 없음 (isSelected 계산 위임) |
| `project_canvas/types/canvas.ts` | 변경 없음 (toWorld 재사용) |

---

`COPYRIGHTS 2026. CRE-TE CO.,LTD. ALL RIGHTS RESERVED.`
