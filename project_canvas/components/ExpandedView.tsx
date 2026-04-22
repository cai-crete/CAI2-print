'use client';

import { useState } from 'react';
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
  onAddSketch: () => void;
}

/* ══════════════════════════════════════════════════════════════
   아이콘
══════════════════════════════════════════════════════════════ */
const IC = {
  stroke: 'currentColor',
  fill: 'none',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const IconChevronUp = () => (
  <svg viewBox="0 0 20 20" {...IC}><polyline points="4,13 10,7 16,13" /></svg>
);
const IconChevronDown = () => (
  <svg viewBox="0 0 20 20" {...IC}><polyline points="4,7 10,13 16,7" /></svg>
);

/* IconCollapse — 단순 좌측 화살표 (캔버스 복귀 의미 명확) */
const IconCollapse = () => (
  <svg viewBox="0 0 20 20" {...IC}>
    <path d="M16 10H4M9 5L4 10L9 15" />
  </svg>
);

/* ══════════════════════════════════════════════════════════════
   ExpandedSidebar — 선택 노드 단일 패널
   구조: [축소 pill] + [노드탭 pill] 한 행 / [패널 pill] 아래
   디자인 토큰 준수: radius-pill, --h-cta-lg, gap 0.5rem
══════════════════════════════════════════════════════════════ */
function ExpandedSidebar({
  currentNodeType,
  onCollapse,
}: {
  currentNodeType: NodeType;
  onCollapse: () => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const def = NODE_DEFINITIONS[currentNodeType];

  /*
    pill 컨테이너 기본 스타일 — RightSidebar의 pill()과 동일하게 유지
    radius-pill + shadow-float + white background
  */
  const pillBase: React.CSSProperties = {
    background: 'var(--color-white)',
    borderRadius: 'var(--radius-pill)',
    boxShadow: 'var(--shadow-float)',
    flexShrink: 0,
  };

  /* hover 핸들러 재사용 */
  const hoverOn  = (e: React.MouseEvent<HTMLButtonElement>) =>
    (e.currentTarget.style.backgroundColor = 'var(--color-gray-100)');
  const hoverOff = (e: React.MouseEvent<HTMLButtonElement>) =>
    (e.currentTarget.style.backgroundColor = 'transparent');

  return (
    <div
      style={{
        position: 'absolute',
        right: '1rem',
        top: '1rem',
        bottom: '1rem',
        width: 'var(--sidebar-w)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',        /* 8px — RightSidebar와 동일 */
        zIndex: 90,
      }}
    >
      {/* ── 헤더 행: [축소 pill] + [노드탭 pill] ───────────────── */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'stretch',
          flexShrink: 0,
        }}
      >
        {/* 축소 버튼 — 44×44px 정사각 pill, 아이콘만 */}
        <div style={{ ...pillBase, width: 'var(--h-cta-lg)', height: 'var(--h-cta-lg)' }}>
          <button
            onClick={onCollapse}
            title="캔버스로 돌아가기"
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              borderRadius: 'var(--radius-pill)',
              color: 'var(--color-gray-500)',
              transition: 'background-color 100ms ease, color 100ms ease',
            }}
            onMouseEnter={e => {
              hoverOn(e);
              e.currentTarget.style.color = 'var(--color-black)';
            }}
            onMouseLeave={e => {
              hoverOff(e);
              e.currentTarget.style.color = 'var(--color-gray-500)';
            }}
          >
            <span style={{ width: 20, height: 20, display: 'flex' }}>
              <IconCollapse />
            </span>
          </button>
        </div>

        {/* 노드 탭 — RightSidebar SELECT TOOLS와 동일한 pill 형태 */}
        <div style={{ ...pillBase, flex: 1 }}>
          <button
            onClick={() => setIsOpen(v => !v)}
            title={isOpen ? '패널 접기' : '패널 펼치기'}
            style={{
              width: '100%',
              height: 'var(--h-cta-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 0.875rem 0 1rem',   /* SELECT TOOLS와 동일 */
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              borderRadius: 'var(--radius-pill)',
              transition: 'background-color 100ms ease',
            }}
            onMouseEnter={hoverOn}
            onMouseLeave={hoverOff}
          >
            <span
              className="text-title"
              style={{ color: 'var(--color-black)', letterSpacing: '0.04em' }}
            >
              {def.displayLabel}
            </span>
            <span
              style={{
                width: 16,
                height: 16,
                display: 'flex',
                color: 'var(--color-gray-500)',
                flexShrink: 0,
              }}
            >
              {isOpen ? <IconChevronUp /> : <IconChevronDown />}
            </span>
          </button>
        </div>
      </div>

      {/* ── 패널 — full sidebar width, 남은 높이 채움 ──────────── */}
      {isOpen && (
        <div
          style={{
            ...pillBase,
            borderRadius: 'var(--radius-box)',  /* 0.625rem = 10px — 콘텐츠 클리핑 방지 */
            flex: 1,
            minHeight: 0,
          }}
        />
      )}
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
  onAddSketch,
}: Props) {
  const def = NODE_DEFINITIONS[node.type];

  return (
    <div
      style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--color-app-bg)',
      }}
    >
      {/* ── 메인 워크스페이스 ──────────────────────────────────────── */}
      <div
        style={{
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
        }}
      >
        <div
          style={{
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
          }}
        >
          <span
            className="text-title"
            style={{
              fontSize: '1.25rem',
              color: 'var(--color-gray-300)',
              letterSpacing: '0.08em',
            }}
          >
            {def.displayLabel}
          </span>
          <span
            style={{
              display: 'block',
              width: 48,
              height: 1,
              background: 'var(--color-gray-200)',
            }}
          />
          <span className="text-body-3" style={{ color: 'var(--color-gray-400)' }}>
            {node.title}
          </span>
          <span
            className="text-caption"
            style={{ color: 'var(--color-gray-300)', marginTop: 4 }}
          >
            API 연동 후 작업 화면이 표시됩니다.
          </span>
        </div>
      </div>

      {/* ── 좌측 툴바 ──────────────────────────────────────────────── */}
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
        onAddSketch={onAddSketch}
      />

      {/* ── 우측 사이드바 ───────────────────────────────────────────── */}
      <ExpandedSidebar currentNodeType={node.type} onCollapse={onCollapse} />
    </div>
  );
}
