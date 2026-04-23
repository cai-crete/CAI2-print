'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { CanvasNode, CanvasEdge, PortShape, toWorld, CARD_W_PX, CARD_H_PX } from '@/types/canvas';
import NodeCard from './NodeCard';
import EdgeLayer from './EdgeLayer';

type ActiveTool = 'cursor' | 'handle';

interface Props {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  newEdgeIds: Set<string>;
  scale: number;
  offset: { x: number; y: number };
  activeTool: ActiveTool;
  selectedNodeIds: string[];
  onScaleChange: (s: number) => void;
  onOffsetChange: (o: { x: number; y: number }) => void;
  onNodePositionChange: (id: string, pos: { x: number; y: number }) => void;
  onNodePositionCommit: (id: string) => void;
  onNodeSelect: (id: string) => void;
  onNodeDeselect: () => void;
  onNodesSelect: (ids: string[]) => void;
  onNodeExpand: (id: string) => void;
  onNodeDuplicate: (id: string) => void;
  onNodeDelete: (id: string) => void;
  onNodeConvertToEditable?: (id: string) => void;
}

const GRID_SIZE   = 40;
const MIN_SCALE   = 0.1;
const MAX_SCALE   = 4;
const DRAG_THRESH = 6; /* px — 이 이상 움직여야 드래그로 판정 */

/* ── 두 손가락 핀치 헬퍼 ─────────────────────────────────────────── */
function getTouchDistance(t: React.TouchList): number {
  const dx = t[0].clientX - t[1].clientX;
  const dy = t[0].clientY - t[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}
function getTouchCenter(t: React.TouchList): { x: number; y: number } {
  return { x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2 };
}

export default function InfiniteCanvas({
  nodes, edges, newEdgeIds, scale, offset, activeTool, selectedNodeIds,
  onScaleChange, onOffsetChange,
  onNodePositionChange, onNodePositionCommit,
  onNodeSelect, onNodeDeselect, onNodesSelect, onNodeExpand,
  onNodeDuplicate, onNodeDelete, onNodeConvertToEditable,
}: Props) {
  /* ── 포트 계산 ──────────────────────────────────────────────────── */
  const inCount  = (id: string) => edges.filter(e => e.targetId === id).length;
  const outCount = (id: string) => edges.filter(e => e.sourceId === id).length;
  const getPortRight = (id: string): PortShape => {
    if (outCount(id) === 0) return 'none';
    const anyMultiParent = edges.filter(e => e.sourceId === id).some(e => inCount(e.targetId) > 1);
    return anyMultiParent ? 'diamond-solid' : 'circle-solid';
  };
  const getPortLeft = (id: string): PortShape => {
    const ins = inCount(id);
    if (ins === 0) return 'none';
    return ins === 1 ? 'circle-outline' : 'diamond-outline';
  };
  const highlightNodeId = selectedNodeIds.length === 1 ? selectedNodeIds[0] : null;
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
  const [isDraggingPan, setIsDraggingPan] = useState(false);
  const panStart       = useRef({ x: 0, y: 0 });
  const offsetSnapshot = useRef({ x: 0, y: 0 });

  /* ── 미들 버튼 팬 상태 ──────────────────────────────────────────── */
  const isMiddleButtonPanningRef = useRef(false);
  const [isMiddleButtonPanning, setIsMiddleButtonPanning] = useState(false);

  /* ── 터치 포인터 카운트 (멀티터치 충돌 방지) ────────────────────── */
  const activeTouchCount = useRef(0);

  /* ── 두 손가락 핀치 줌 상태 ──────────────────────────────────────── */
  const lastTouchDist   = useRef(0);
  const lastTouchCenter = useRef({ x: 0, y: 0 });

  /* ── 노드 드래그 상태 ────────────────────────────────────────────── */
  const pendingNodeId    = useRef<string | null>(null); /* 드래그 후보 */
  const draggingNodeId   = useRef<string | null>(null); /* 실제 드래그 중 */
  const dragStartMouse   = useRef({ x: 0, y: 0 });
  const dragStartNodePos = useRef({ x: 0, y: 0 });
  const dragMoved        = useRef(false);

  /* ── rubber band 선택 상태 ───────────────────────────────────────── */
  const [dragSelectRect, setDragSelectRect] = useState<{
    startX: number; startY: number; endX: number; endY: number;
  } | null>(null);
  const dragSelectStartRef = useRef<{ ptX: number; ptY: number } | null>(null);
  const dragSelectEndRef   = useRef<{ x: number; y: number } | null>(null);
  const isDragSelectingRef = useRef(false);

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

  /* ── 전역 pointermove / pointerup (캔버스 밖 나가도 처리) ──────── */
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      /* 미들 버튼 팬 */
      if (isMiddleButtonPanningRef.current) {
        onOffsetChange({
          x: offsetSnapshot.current.x + (e.clientX - panStart.current.x),
          y: offsetSnapshot.current.y + (e.clientY - panStart.current.y),
        });
        return;
      }
      /* 팬 (툴 모드 무관 — touch isPanning도 여기서 처리) */
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
        return;
      }
      /* rubber band rect 갱신 */
      if (dragSelectStartRef.current) {
        const canvasEl = wrapperRef.current;
        if (!canvasEl) return;
        const canvasRect = canvasEl.getBoundingClientRect();
        const pt = toWorld(
          e.clientX - canvasRect.left,
          e.clientY - canvasRect.top,
          { offset: offsetRef.current, scale: scaleRef.current },
        );
        isDragSelectingRef.current  = true;
        dragSelectEndRef.current    = { x: pt.x, y: pt.y };
        setDragSelectRect({
          startX: dragSelectStartRef.current.ptX,
          startY: dragSelectStartRef.current.ptY,
          endX: pt.x,
          endY: pt.y,
        });
      }
    };

    const onUp = (e: PointerEvent) => {
      /* touch 카운트 감소 */
      if (e.pointerType === 'touch') {
        activeTouchCount.current = Math.max(0, activeTouchCount.current - 1);
      }
      /* 미들 버튼 팬 해제 */
      if (isMiddleButtonPanningRef.current) {
        isMiddleButtonPanningRef.current = false;
        setIsMiddleButtonPanning(false);
        return;
      }
      /* 팬 드래그 state는 pointerup 시 항상 리셋 */
      setIsDraggingPan(false);
      if (isPanning.current) {
        isPanning.current = false;
        return;
      }
      if (pendingNodeId.current) {
        if (draggingNodeId.current) {
          const committedId = draggingNodeId.current;
          draggingNodeId.current = null;
          onNodePositionCommit(committedId);
        } else {
          onNodeSelect(pendingNodeId.current);
        }
        pendingNodeId.current = null;
        dragMoved.current = false;
        return;
      }
      /* rubber band 확정 */
      if (dragSelectStartRef.current) {
        if (isDragSelectingRef.current && dragSelectEndRef.current) {
          const { ptX: sX, ptY: sY } = dragSelectStartRef.current;
          const { x: eX, y: eY }     = dragSelectEndRef.current;
          const minX = Math.min(sX, eX), maxX = Math.max(sX, eX);
          const minY = Math.min(sY, eY), maxY = Math.max(sY, eY);
          const selected = nodesRef.current
            .filter(n =>
              n.position.x < maxX && n.position.x + CARD_W_PX > minX &&
              n.position.y < maxY && n.position.y + CARD_H_PX > minY,
            )
            .map(n => n.id);
          onNodesSelect(selected);
        }
        setDragSelectRect(null);
        dragSelectStartRef.current = null;
        dragSelectEndRef.current   = null;
        isDragSelectingRef.current = false;
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup',   onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup',   onUp);
    };
  }, [onOffsetChange, onNodePositionChange, onNodePositionCommit, onNodeSelect, onNodesSelect]);

  /* ── 캔버스 배경 pointerdown → 선택 해제 / 팬 / rubber band ────── */
  const handleWrapperPointerDown = useCallback((e: React.PointerEvent) => {
    /* 미들 버튼 팬 — 툴 모드 무관 */
    if (e.button === 1) {
      e.preventDefault();
      isMiddleButtonPanningRef.current = true;
      setIsMiddleButtonPanning(true);
      panStart.current       = { x: e.clientX, y: e.clientY };
      offsetSnapshot.current = { ...offsetRef.current };
      return;
    }
    if (e.button !== 0) return;

    /* touch: 카운트 증가 후 멀티터치면 팬 취소 */
    if (e.pointerType === 'touch') {
      activeTouchCount.current += 1;
      if (activeTouchCount.current >= 2) {
        isPanning.current = false;
        setIsDraggingPan(false);
        return;
      }
      /* 1개 터치 — 모드 무관하게 팬 시작 */
      isPanning.current = true;
      setIsDraggingPan(true);
      panStart.current       = { x: e.clientX, y: e.clientY };
      offsetSnapshot.current = { ...offsetRef.current };
      onNodeDeselect();
      return;
    }

    const target = e.target as HTMLElement;
    /* 노드 카드 위가 아닌 순수 배경 클릭 */
    if (target === wrapperRef.current || target.dataset.canvasLayer === 'true') {
      onNodeDeselect();
      if (activeTool === 'handle') {
        isPanning.current = true;
        setIsDraggingPan(true);
        panStart.current       = { x: e.clientX, y: e.clientY };
        offsetSnapshot.current = { ...offsetRef.current };
      } else {
        /* cursor 모드 — rubber band 시작 */
        const canvasRect = wrapperRef.current!.getBoundingClientRect();
        const pt = toWorld(
          e.clientX - canvasRect.left,
          e.clientY - canvasRect.top,
          { offset: offsetRef.current, scale: scaleRef.current },
        );
        dragSelectStartRef.current = { ptX: pt.x, ptY: pt.y };
        dragSelectEndRef.current   = null;
        isDragSelectingRef.current = false;
      }
    }
  }, [activeTool, onNodeDeselect]);

  /* ── 두 손가락 핀치 줌 + 팬 ────────────────────────────────────── */
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      lastTouchDist.current   = getTouchDistance(e.touches);
      lastTouchCenter.current = getTouchCenter(e.touches);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 2) return;
    const el = wrapperRef.current;
    if (!el) return;

    const dist   = getTouchDistance(e.touches);
    const center = getTouchCenter(e.touches);
    const rect   = el.getBoundingClientRect();

    const prev = scaleRef.current;
    const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev * (dist / lastTouchDist.current)));
    const s    = next / prev;

    const cx  = center.x - rect.left;
    const cy  = center.y - rect.top;
    const off = offsetRef.current;

    onScaleChange(next);
    onOffsetChange({
      x: cx - (cx - off.x) * s + (center.x - lastTouchCenter.current.x),
      y: cy - (cy - off.y) * s + (center.y - lastTouchCenter.current.y),
    });

    lastTouchDist.current   = dist;
    lastTouchCenter.current = center;
  }, [onScaleChange, onOffsetChange]);

  /* ── 노드 pointerdown 위임 ──────────────────────────────────────── */
  const handleNodeMouseDown = useCallback((id: string, e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if (activeTool !== 'cursor') return;
    const node = nodesRef.current.find(n => n.id === id);
    if (!node) return;
    pendingNodeId.current = id;
    dragStartMouse.current = { x: e.clientX, y: e.clientY };
    dragStartNodePos.current = { ...node.position };
    dragMoved.current = false;
  }, [activeTool]);

  /* ── 커서 스타일 ─────────────────────────────────────────────────── */
  const cursor = isMiddleButtonPanning || isDraggingPan
    ? 'grabbing'
    : activeTool === 'handle'
      ? 'grab'
      : 'default';

  /* ── 그리드 ──────────────────────────────────────────────────────── */
  const gs  = GRID_SIZE * scale;
  const gox = ((offset.x % gs) + gs) % gs;
  const goy = ((offset.y % gs) + gs) % gs;

  return (
    <div
      ref={wrapperRef}
      onPointerDown={handleWrapperPointerDown}
      onPointerCancel={handleWrapperPointerDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
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
      {/* ── 엣지 레이어 (viewport 좌표계 SVG) ──────────────────────── */}
      <EdgeLayer
        nodes={nodes}
        edges={edges}
        selectedNodeId={highlightNodeId}
        newEdgeIds={newEdgeIds}
        scale={scale}
        offset={offset}
      />

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
              isSelected={selectedNodeIds.includes(node.id)}
              onSelect={onNodeSelect}
              onExpand={onNodeExpand}
              onDuplicate={onNodeDuplicate}
              onDelete={onNodeDelete}
              onMouseDown={handleNodeMouseDown}
              hasThumbnail={node.hasThumbnail}
              artboardType={node.artboardType}
              portLeft={getPortLeft(node.id)}
              portRight={getPortRight(node.id)}
              onConvertToEditable={onNodeConvertToEditable}
            />
          </div>
        ))}
      </div>

      {/* ── rubber band 선택 rect overlay ───────────────────────────── */}
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
    </div>
  );
}
