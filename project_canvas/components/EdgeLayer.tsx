'use client';

import { CanvasNode, CanvasEdge, CARD_W_PX, CARD_H_PX } from '@/types/canvas';

/* ── 월드 좌표 → 스크린 좌표 ────────────────────────────────────── */
function toScreen(
  wx: number, wy: number,
  scale: number, offset: { x: number; y: number },
) {
  return { x: wx * scale + offset.x, y: wy * scale + offset.y };
}

/* ── 포트 위치 (월드 좌표) ──────────────────────────────────────── */
const PORT_Y = CARD_H_PX / 2; // 99

function sourceWorld(node: CanvasNode) {
  return { x: node.position.x + CARD_W_PX, y: node.position.y + PORT_Y };
}
function targetWorld(node: CanvasNode) {
  return { x: node.position.x, y: node.position.y + PORT_Y };
}

/* ── 베지어 경로 (스크린 좌표) ──────────────────────────────────── */
function bezierPath(sx: number, sy: number, tx: number, ty: number): string {
  const isReverse = tx < sx - 20;
  if (!isReverse) {
    const t = Math.min(Math.max(Math.abs(tx - sx) * 0.45, 60), 160);
    return `M${sx},${sy} C${sx + t},${sy} ${tx - t},${ty} ${tx},${ty}`;
  }
  /* 역방향: 아래쪽 우회 */
  const oy = Math.max(80, Math.abs(ty - sy) * 0.5 + 60);
  return `M${sx},${sy} C${sx + 60},${sy + oy} ${tx - 60},${ty + oy} ${tx},${ty}`;
}

interface Props {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  selectedNodeId: string | null;
  newEdgeIds: Set<string>;
  scale: number;
  offset: { x: number; y: number };
}

/* ── EdgeLayer — viewport 레벨 SVG ────────────────────────────── */
export default function EdgeLayer({
  nodes, edges, selectedNodeId, newEdgeIds, scale, offset,
}: Props) {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const hasSelection = selectedNodeId !== null;
  const highlightedEdgeIds = hasSelection
    ? new Set(
        edges
          .filter(e => e.sourceId === selectedNodeId || e.targetId === selectedNodeId)
          .map(e => e.id),
      )
    : new Set<string>();

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0, left: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    >
      {edges.map(edge => {
        const src = nodeMap.get(edge.sourceId);
        const tgt = nodeMap.get(edge.targetId);
        if (!src || !tgt) return null;

        const sp = toScreen(sourceWorld(src).x, sourceWorld(src).y, scale, offset);
        const tp = toScreen(targetWorld(tgt).x, targetWorld(tgt).y, scale, offset);
        const d  = bezierPath(sp.x, sp.y, tp.x, tp.y);

        const isNew       = newEdgeIds.has(edge.id);
        const isHighlight = highlightedEdgeIds.has(edge.id);

        const stroke  = hasSelection ? (isHighlight ? '#000000' : '#666666') : '#666666';
        const opacity = hasSelection ? (isHighlight ? 1 : 0.2) : 0.6;

        return (
          <path
            key={edge.id}
            d={d}
            stroke={stroke}
            strokeWidth={1.5}
            fill="none"
            opacity={opacity}
            pathLength={isNew ? 1 : undefined}
            className={isNew ? 'edge-entrance' : undefined}
            style={{ transition: 'opacity 200ms ease, stroke 200ms ease' }}
          />
        );
      })}
    </svg>
  );
}
