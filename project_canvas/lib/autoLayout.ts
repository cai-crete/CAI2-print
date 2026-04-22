import { CanvasNode, CanvasEdge, CARD_W_PX, CARD_H_PX, COL_GAP_PX, ROW_GAP_PX } from '@/types/canvas';

/* ── 서브트리 총 높이 계산 ──────────────────────────────────────────
   노드 자신(198px) + 직계 자식들의 서브트리 합 + 형제 간 간격
   ──────────────────────────────────────────────────────────────── */
export function subtreeHeight(
  nodeId: string,
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  visited = new Set<string>(),
): number {
  if (visited.has(nodeId)) return CARD_H_PX; // 순환 방지
  visited.add(nodeId);

  const children = edges
    .filter(e => e.sourceId === nodeId)
    .map(e => nodes.find(n => n.id === e.targetId))
    .filter((n): n is CanvasNode => n !== undefined);

  if (children.length === 0) return CARD_H_PX;

  const childTotal = children.reduce(
    (sum, c) => sum + subtreeHeight(c.id, nodes, edges, new Set(visited)),
    0,
  );
  const gaps = ROW_GAP_PX * (children.length - 1);
  return Math.max(CARD_H_PX, childTotal + gaps);
}

/* ── 신규 자식 노드 배치 위치 계산 ────────────────────────────────
   반환값: 새 노드의 position + 밀려야 할 기존 노드들의 위치 변경 map
   ──────────────────────────────────────────────────────────────── */
export interface LayoutResult {
  position: { x: number; y: number };
  pushdowns: Map<string, { x: number; y: number }>; // id → 새 position
}

export function placeNewChild(
  parentId: string,
  nodes: CanvasNode[],
  edges: CanvasEdge[],
): LayoutResult {
  const parent = nodes.find(n => n.id === parentId);
  if (!parent) return { position: { x: 0, y: 0 }, pushdowns: new Map() };

  const childX = parent.position.x + CARD_W_PX + COL_GAP_PX;

  /* 같은 부모의 기존 자식 목록 → Y 오름차순 */
  const siblings = edges
    .filter(e => e.sourceId === parentId)
    .map(e => nodes.find(n => n.id === e.targetId))
    .filter((n): n is CanvasNode => n !== undefined)
    .sort((a, b) => a.position.y - b.position.y);

  let childY: number;
  if (siblings.length === 0) {
    childY = parent.position.y;
  } else {
    const last = siblings[siblings.length - 1];
    childY = last.position.y + subtreeHeight(last.id, nodes, edges) + ROW_GAP_PX;
  }

  /* pushdown: 같은 컬럼에서 새 노드 영역과 겹치는 autoPlaced 노드 */
  const pushdowns = new Map<string, { x: number; y: number }>();
  const TOLERANCE = 10;
  const newBottom = childY + CARD_H_PX;

  const conflicts = nodes.filter(n =>
    n.autoPlaced &&
    Math.abs(n.position.x - childX) < TOLERANCE &&
    n.position.y < newBottom &&
    n.position.y + CARD_H_PX > childY,
  );

  for (const conflict of conflicts) {
    const delta = newBottom + ROW_GAP_PX - conflict.position.y;
    applyPushdown(conflict.id, delta, nodes, edges, pushdowns);
  }

  return { position: { x: childX, y: childY }, pushdowns };
}

/* ── 재귀적 pushdown: 노드와 그 서브트리 전체를 delta만큼 아래로 ── */
function applyPushdown(
  nodeId: string,
  delta: number,
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  result: Map<string, { x: number; y: number }>,
) {
  const node = nodes.find(n => n.id === nodeId);
  if (!node) return;

  const current = result.get(nodeId) ?? node.position;
  result.set(nodeId, { x: current.x, y: current.y + delta });

  const children = edges
    .filter(e => e.sourceId === nodeId)
    .map(e => nodes.find(n => n.id === e.targetId))
    .filter((n): n is CanvasNode => n !== undefined);

  for (const child of children) {
    applyPushdown(child.id, delta, nodes, edges, result);
  }
}
