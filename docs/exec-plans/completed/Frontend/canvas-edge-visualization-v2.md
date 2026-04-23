# 작업지시서: 노드 연결선 시각화 v2 전면 재설계

**생성일**: 2026-04-22  
**담당**: Claude Code

## 변경 요약

1. SVG 렌더링 버그 수정 — transform layer 밖 viewport 레벨로 이동, 스크린 좌표 변환
2. 포트 인디케이터 차별화 — 부모(●검은 원) / 자식(○흰+stroke원), 다중부모는 다이아몬드
3. Auto Layout — 신규 생성 시 트리 전체 높이 계산 후 위치 배정, autoPlaced 플래그로 수동노드 보호
4. strokeWidth 고정 1.5 (viewport 레벨 SVG에선 scale 보정 불필요)

## 체크리스트

- [x] 작업지시서 생성
- [x] types/canvas.ts — autoPlaced, portLeft/portRight 타입
- [x] lib/autoLayout.ts — subtreeHeight + placeNewChild 알고리즘
- [x] components/EdgeLayer.tsx — viewport SVG, 스크린 좌표 변환, strokeWidth 고정
- [x] components/NodeCard.tsx — 포트 인디케이터 원/다이아몬드 + 솔리드/아웃라인
- [x] components/InfiniteCanvas.tsx — SVG EdgeLayer 위치 변경, 포트 타입 계산
- [x] app/page.tsx — 데모 다중부모 엣지(3번째), 드래그 commit 시 autoPlaced false
- [x] TypeScript 빌드 통과 (next build clean)
- [ ] dev 서버 실행 + UI 검증
- [ ] claude-progress.txt 업데이트

## 포트 props 명세

```typescript
type PortShape = 'none' | 'circle-solid' | 'circle-outline' | 'diamond-solid' | 'diamond-outline'

// NodeCard props:
portLeft?: PortShape   // 자식 측 (도착점)
portRight?: PortShape  // 부모 측 (출발점)

// 계산 로직 (InfiniteCanvas):
const inCount  = (id) => edges.filter(e => e.targetId === id).length
const outCount = (id) => edges.filter(e => e.sourceId === id).length

portRight = outCount > 0
  ? (엣지 중 하나라도 targetId가 다중부모 노드인가? → 'diamond-solid' : 'circle-solid')
  : 'none'

portLeft = inCount === 1 ? 'circle-outline'
         : inCount > 1  ? 'diamond-outline'
         : 'none'
```

## Auto Layout 알고리즘

```
COLUMN_GAP = 40px
ROW_GAP    = 16px  (1rem)

subtreeHeight(nodeId):
  children = 직계 자식 노드 목록
  if empty: return 198 (CARD_H_PX)
  total = sum(subtreeHeight(c)) + ROW_GAP × (children.length - 1)
  return max(198, total)

placeNewChild(parentId, newNodeId):
  childX = parent.x + 280 + 40  (= parent.x + 320)
  siblings = 부모의 기존 자식들 (Y 오름차순 정렬)
  
  if no siblings:
    childY = parent.y
  else:
    lastSibling = siblings.last
    childY = lastSibling.y + subtreeHeight(lastSibling) + 16
  
  // pushdown: childX 컬럼에서 childY ~ childY+198과 겹치는 autoPlaced 노드
  conflicts = nodes.filter(n =>
    n.autoPlaced &&
    n.position.x ≈ childX (±10px) &&
    overlap([childY, childY+198], [n.y, n.y+198])
  )
  for conflict in conflicts:
    delta = (childY + 198 + 16) - conflict.y
    pushdown(conflict, delta)  // 재귀적으로 서브트리 전체 이동
  
  return { x: childX, y: childY }
```

## 데모 다중 부모 엣지

```
planners(1) → plan(2)   (demo-edge-1)
plan(2)     → image(3)  (demo-edge-2)
planners(1) → image(3)  (demo-edge-3, 새 엣지)

→ image(3)의 inCount = 2 → portLeft = 'diamond-outline'
→ planners(1), plan(2)의 portRight = 'diamond-solid'
```
