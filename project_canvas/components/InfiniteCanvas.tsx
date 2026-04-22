'use client';

import { useRef, useCallback, useEffect } from 'react';
import { CanvasNode } from '@/types/canvas';
import NodeCard from './NodeCard';

type ActiveTool = 'cursor' | 'handle';

interface Props {
  nodes: CanvasNode[];
  scale: number;
  offset: { x: number; y: number };
  activeTool: ActiveTool;
  selectedNodeId: string | null;
  onScaleChange: (s: number) => void;
  onOffsetChange: (o: { x: number; y: number }) => void;
  onNodePositionChange: (id: string, pos: { x: number; y: number }) => void;
  onNodePositionCommit: () => void;
  onNodeSelect: (id: string) => void;
  onNodeDeselect: () => void;
  onNodeExpand: (id: string) => void;
  onNodeDuplicate: (id: string) => void;
  onNodeDelete: (id: string) => void;
}

const GRID_SIZE   = 40;
const MIN_SCALE   = 0.1;
const MAX_SCALE   = 4;
const DRAG_THRESH = 6; /* px — 이 이상 움직여야 드래그로 판정 */

export default function InfiniteCanvas({
  nodes, scale, offset, activeTool, selectedNodeId,
  onScaleChange, onOffsetChange,
  onNodePositionChange, onNodePositionCommit,
  onNodeSelect, onNodeDeselect, onNodeExpand,
  onNodeDuplicate, onNodeDelete,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  /* ── 최신 값 ref 추적 (클로저 문제 방지) ────────────────────────── */
  const scaleRef  = useRef(scale);
  const offsetRef = useRef(offset);
  const nodesRef  = useRef(nodes);
  useEffect(() => { scaleRef.current  = scale;  }, [scale]);
  useEffect(() => { offsetRef.current = offset; }, [offset]);
  useEffect(() => { nodesRef.current  = nodes;  }, [nodes]);

  /* ── 팬 상태 ────────────────────────────────────────────────────── */
  const isPanning      = useRef(false);
  const panStart       = useRef({ x: 0, y: 0 });
  const offsetSnapshot = useRef({ x: 0, y: 0 });

  /* ── 노드 드래그 상태 ────────────────────────────────────────────── */
  const pendingNodeId    = useRef<string | null>(null); /* 드래그 후보 */
  const draggingNodeId   = useRef<string | null>(null); /* 실제 드래그 중 */
  const dragStartMouse   = useRef({ x: 0, y: 0 });
  const dragStartNodePos = useRef({ x: 0, y: 0 });
  const dragMoved        = useRef(false);

  /* ── 휠 줌 ──────────────────────────────────────────────────────── */
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const prev = scaleRef.current;
      const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev * (e.deltaY < 0 ? 1.1 : 0.9)));
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const off = offsetRef.current;
      onScaleChange(next);
      onOffsetChange({ x: mx - (mx - off.x) * (next / prev), y: my - (my - off.y) * (next / prev) });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [onScaleChange, onOffsetChange]);

  /* ── 전역 mouseup / mousemove (드래그 중 포인터가 캔버스 밖 나가도 처리) */
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      /* 팬 */
      if (isPanning.current) {
        onOffsetChange({
          x: offsetSnapshot.current.x + (e.clientX - panStart.current.x),
          y: offsetSnapshot.current.y + (e.clientY - panStart.current.y),
        });
        return;
      }
      /* 노드 드래그 */
      if (pendingNodeId.current) {
        const dx = e.clientX - dragStartMouse.current.x;
        const dy = e.clientY - dragStartMouse.current.y;
        if (!draggingNodeId.current && Math.hypot(dx, dy) > DRAG_THRESH) {
          draggingNodeId.current = pendingNodeId.current;
          dragMoved.current = true;
        }
        if (draggingNodeId.current) {
          onNodePositionChange(draggingNodeId.current, {
            x: dragStartNodePos.current.x + dx / scaleRef.current,
            y: dragStartNodePos.current.y + dy / scaleRef.current,
          });
        }
      }
    };

    const onUp = (e: MouseEvent) => {
      if (isPanning.current) {
        isPanning.current = false;
        return;
      }
      if (pendingNodeId.current) {
        if (draggingNodeId.current) {
          /* 드래그 완료 → 히스토리 커밋 */
          draggingNodeId.current = null;
          onNodePositionCommit();
        } else {
          /* 클릭 판정 → 선택 */
          onNodeSelect(pendingNodeId.current);
        }
        pendingNodeId.current = null;
        dragMoved.current = false;
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [onOffsetChange, onNodePositionChange, onNodePositionCommit, onNodeSelect]);

  /* ── 캔버스 배경 클릭 → 선택 해제 ──────────────────────────────── */
  const handleWrapperMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    /* 노드 카드 위가 아닌 순수 배경 클릭 */
    if (target === wrapperRef.current || target.dataset.canvasLayer === 'true') {
      onNodeDeselect();
      if (activeTool === 'handle') {
        isPanning.current = true;
        panStart.current = { x: e.clientX, y: e.clientY };
        offsetSnapshot.current = { ...offsetRef.current };
      }
    }
  }, [activeTool, onNodeDeselect]);

  /* ── 노드 mousedown 위임 ─────────────────────────────────────────── */
  const handleNodeMouseDown = useCallback((id: string, e: React.MouseEvent) => {
    if (activeTool !== 'cursor') return;
    const node = nodesRef.current.find(n => n.id === id);
    if (!node) return;
    pendingNodeId.current = id;
    dragStartMouse.current = { x: e.clientX, y: e.clientY };
    dragStartNodePos.current = { ...node.position };
    dragMoved.current = false;
  }, [activeTool]);

  /* ── 커서 스타일 ─────────────────────────────────────────────────── */
  const cursor = activeTool === 'handle'
    ? (isPanning.current ? 'grabbing' : 'grab')
    : (draggingNodeId.current ? 'grabbing' : 'default');

  /* ── 그리드 ──────────────────────────────────────────────────────── */
  const gs  = GRID_SIZE * scale;
  const gox = ((offset.x % gs) + gs) % gs;
  const goy = ((offset.y % gs) + gs) % gs;

  return (
    <div
      ref={wrapperRef}
      onMouseDown={handleWrapperMouseDown}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        backgroundColor: 'var(--color-app-bg)',
        backgroundImage: `
          linear-gradient(var(--color-gray-100) 1px, transparent 1px),
          linear-gradient(90deg, var(--color-gray-100) 1px, transparent 1px)
        `,
        backgroundSize: `${gs}px ${gs}px`,
        backgroundPosition: `${gox}px ${goy}px`,
        cursor,
      }}
    >
      {/* ── 캔버스 변환 레이어 ──────────────────────────────────────── */}
      <div
        data-canvas-layer="true"
        style={{
          position: 'absolute',
          top: 0, left: 0,
          transformOrigin: '0 0',
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          willChange: 'transform',
        }}
      >
        {nodes.map(node => (
          <div
            key={node.id}
            style={{
              position: 'absolute',
              left: node.position.x,
              top: node.position.y,
            }}
          >
            <NodeCard
              node={node}
              isSelected={selectedNodeId === node.id}
              onSelect={onNodeSelect}
              onExpand={onNodeExpand}
              onDuplicate={onNodeDuplicate}
              onDelete={onNodeDelete}
              onMouseDown={handleNodeMouseDown}
              hasThumbnail={node.hasThumbnail}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
