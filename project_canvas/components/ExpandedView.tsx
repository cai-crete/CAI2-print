'use client';

import { useState, useRef, useEffect } from 'react';
import { CanvasNode, NodeType, NODE_DEFINITIONS, ActiveTool } from '@/types/canvas';
import LeftToolbar from '@/components/LeftToolbar';

interface Props {
  node: CanvasNode;
  onCollapse: () => void;
  activeTool: ActiveTool;
  scale: number;
  canUndo: boolean;
  canRedo: boolean;
  onToolChange: (t: ActiveTool) => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onAddArtboard: () => void;
}

const IC = { stroke: 'currentColor', fill: 'none', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

const IconChevronUp   = () => <svg viewBox="0 0 20 20" {...IC}><polyline points="4,13 10,7 16,13" /></svg>;
const IconChevronDown = () => <svg viewBox="0 0 20 20" {...IC}><polyline points="4,7 10,13 16,7" /></svg>;
const IconCollapse    = () => <svg viewBox="0 0 20 20" {...IC}><path d="M16 10H4M9 5L4 10L9 15" /></svg>;

/* ══════════════════════════════════════════════════════════════
   ExpandedSidebar — 확장 뷰 우측 사이드바
══════════════════════════════════════════════════════════════ */
function ExpandedSidebar({ currentNodeType, onCollapse }: { currentNodeType: NodeType; onCollapse: () => void }) {
  const [isOpen, setIsOpen] = useState(true);
  const def = NODE_DEFINITIONS[currentNodeType];

  const pillBase: React.CSSProperties = {
    background: 'var(--color-white)', borderRadius: 'var(--radius-pill)',
    boxShadow: 'var(--shadow-float)', flexShrink: 0,
  };

  const hoverOn  = (e: React.MouseEvent<HTMLButtonElement>) =>
    (e.currentTarget.style.backgroundColor = 'var(--color-gray-100)');
  const hoverOff = (e: React.MouseEvent<HTMLButtonElement>) =>
    (e.currentTarget.style.backgroundColor = 'transparent');

  return (
    <div style={{
      position: 'absolute', right: '1rem', top: '1rem', bottom: '1rem',
      width: 'var(--sidebar-w)', display: 'flex', flexDirection: 'column',
      gap: '0.5rem', zIndex: 90,
    }}>
      {/* 헤더 행: [축소 pill] + [노드탭 pill] */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch', flexShrink: 0 }}>
        <div style={{ ...pillBase, width: 'var(--h-cta-lg)', height: 'var(--h-cta-lg)' }}>
          <button
            onClick={onCollapse}
            title="캔버스로 돌아가기"
            style={{
              width: '100%', height: '100%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', border: 'none', background: 'transparent',
              cursor: 'pointer', borderRadius: 'var(--radius-pill)',
              color: 'var(--color-gray-500)', transition: 'background-color 100ms ease, color 100ms ease',
            }}
            onMouseEnter={e => { hoverOn(e); e.currentTarget.style.color = 'var(--color-black)'; }}
            onMouseLeave={e => { hoverOff(e); e.currentTarget.style.color = 'var(--color-gray-500)'; }}
          >
            <span style={{ width: 20, height: 20, display: 'flex' }}><IconCollapse /></span>
          </button>
        </div>

        <div style={{ ...pillBase, flex: 1 }}>
          <button
            onClick={() => setIsOpen(v => !v)}
            title={isOpen ? '패널 접기' : '패널 펼치기'}
            style={{
              width: '100%', height: 'var(--h-cta-lg)', display: 'flex',
              alignItems: 'center', justifyContent: 'space-between',
              padding: '0 0.875rem 0 1rem', border: 'none', background: 'transparent',
              cursor: 'pointer', borderRadius: 'var(--radius-pill)',
              transition: 'background-color 100ms ease',
            }}
            onMouseEnter={hoverOn}
            onMouseLeave={hoverOff}
          >
            <span className="text-title" style={{ color: 'var(--color-black)', letterSpacing: '0.04em' }}>
              {def.displayLabel}
            </span>
            <span style={{ width: 16, height: 16, display: 'flex', color: 'var(--color-gray-500)', flexShrink: 0 }}>
              {isOpen ? <IconChevronUp /> : <IconChevronDown />}
            </span>
          </button>
        </div>
      </div>

      {isOpen && (
        <div style={{
          ...pillBase,
          borderRadius: 'var(--radius-box)',
          flex: 1, minHeight: 0,
        }} />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SketchInfiniteGrid — sketch/blank 아트보드용 무한 그리드
   실제 드로잉 도구는 추후 구현
══════════════════════════════════════════════════════════════ */
const SKETCH_GRID_SIZE = 32;

function SketchInfiniteGrid() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [gridOffset, setGridOffset] = useState({ x: 0, y: 0 });
  const [localScale, setLocalScale] = useState(1);

  const isPanning    = useRef(false);
  const panStart     = useRef({ x: 0, y: 0 });
  const offsetSnap   = useRef({ x: 0, y: 0 });
  const scaleRef     = useRef(localScale);
  const offsetRef    = useRef(gridOffset);

  useEffect(() => { scaleRef.current  = localScale; },  [localScale]);
  useEffect(() => { offsetRef.current = gridOffset; }, [gridOffset]);

  /* 휠 줌 */
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const prev = scaleRef.current;
      const next = Math.max(0.2, Math.min(4, prev * (e.deltaY < 0 ? 1.1 : 0.9)));
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const off = offsetRef.current;
      setLocalScale(next);
      setGridOffset({ x: mx - (mx - off.x) * (next / prev), y: my - (my - off.y) * (next / prev) });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  /* 팬 */
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!isPanning.current) return;
      setGridOffset({
        x: offsetSnap.current.x + (e.clientX - panStart.current.x),
        y: offsetSnap.current.y + (e.clientY - panStart.current.y),
      });
    };
    const onUp = () => { isPanning.current = false; };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup',   onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup',   onUp);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    isPanning.current  = true;
    panStart.current   = { x: e.clientX, y: e.clientY };
    offsetSnap.current = { ...offsetRef.current };
  };

  const gs  = SKETCH_GRID_SIZE * localScale;
  const gox = ((gridOffset.x % gs) + gs) % gs;
  const goy = ((gridOffset.y % gs) + gs) % gs;

  return (
    <div
      ref={wrapperRef}
      onPointerDown={handlePointerDown}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        touchAction: 'none',
        cursor: 'crosshair',
        backgroundColor: 'var(--color-app-bg)',
        backgroundImage: `
          linear-gradient(var(--color-gray-100) 1px, transparent 1px),
          linear-gradient(90deg, var(--color-gray-100) 1px, transparent 1px)
        `,
        backgroundSize: `${gs}px ${gs}px`,
        backgroundPosition: `${gox}px ${goy}px`,
      }}
    >
      {/* 중앙 원점 마커 */}
      <div
        style={{
          position: 'absolute',
          left: gridOffset.x - 3,
          top:  gridOffset.y - 3,
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'var(--color-gray-200)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ExpandedView — 전체 화면 확장 뷰
══════════════════════════════════════════════════════════════ */
export default function ExpandedView({
  node, onCollapse,
  activeTool, scale, canUndo, canRedo,
  onToolChange, onUndo, onRedo, onZoomIn, onZoomOut, onZoomReset,
  onAddArtboard,
}: Props) {
  const def = NODE_DEFINITIONS[node.type];
  const isSketchMode = node.artboardType === 'sketch' || node.artboardType === 'blank';

  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'var(--color-app-bg)' }}>

      {isSketchMode ? (
        /* ── sketch/blank: 무한 그리드 전체 화면 ─────────────────── */
        <SketchInfiniteGrid />
      ) : (
        /* ── image/thumbnail: 기존 A4 프레임 플레이스홀더 ──────── */
        <div style={{
          position: 'absolute',
          inset: 0,
          left: 'calc(4rem + 1.5rem)',
          right: 'calc(var(--sidebar-w) + 2rem)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1.5rem',
          padding: '2rem',
        }}>
          <div style={{
            width: '100%',
            maxWidth: 800,
            aspectRatio: '297 / 210',
            background: 'var(--color-white)',
            borderRadius: 'var(--radius-box)',
            boxShadow: 'var(--shadow-float)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
          }}>
            <span className="text-title" style={{ fontSize: '1.25rem', color: 'var(--color-gray-300)', letterSpacing: '0.08em' }}>
              {def.displayLabel}
            </span>
            <span style={{ display: 'block', width: 48, height: 1, background: 'var(--color-gray-200)' }} />
            <span className="text-body-3" style={{ color: 'var(--color-gray-400)' }}>
              {node.title}
            </span>
            <span className="text-caption" style={{ color: 'var(--color-gray-300)', marginTop: 4 }}>
              API 연동 후 작업 화면이 표시됩니다.
            </span>
          </div>
        </div>
      )}

      {/* ── 좌측 툴바 ─────────────────────────────────────────────── */}
      <LeftToolbar
        activeTool={activeTool}
        scale={scale}
        canUndo={canUndo}
        canRedo={canRedo}
        onToolChange={onToolChange}
        onUndo={onUndo}
        onRedo={onRedo}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onZoomReset={onZoomReset}
        onAddArtboard={onAddArtboard}
      />

      {/* ── 우측 사이드바 ──────────────────────────────────────────── */}
      <ExpandedSidebar currentNodeType={node.type} onCollapse={onCollapse} />
    </div>
  );
}