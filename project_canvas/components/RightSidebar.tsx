'use client';

import { useState } from 'react';
import { NodeType, NODE_DEFINITIONS, NODE_ORDER } from '@/types/canvas';

interface Props {
  activeSidebarNodeType: NodeType | null;
  onNodeTabSelect: (type: NodeType) => void;
  onNavigateToExpand: (type: NodeType) => void;
}

const IC = { stroke: 'currentColor', fill: 'none', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

const IconChevronUp = () => (
  <svg viewBox="0 0 20 20" {...IC}><polyline points="4,13 10,7 16,13" /></svg>
);
const IconChevronDown = () => (
  <svg viewBox="0 0 20 20" {...IC}><polyline points="4,7 10,13 16,7" /></svg>
);

/* → 오른쪽 화살표 — expand 진입 버튼 */
const IconNavigate = () => (
  <svg viewBox="0 0 20 20" {...IC}>
    <path d="M4 10H16M11 5L16 10L11 15" />
  </svg>
);

/* ── 노드별 임시 패널 ──────────────────────────────────────────────── */
function NodePanel({
  type,
  onGenerate,
}: {
  type: NodeType;
  onGenerate: () => void;
}) {
  const def = NODE_DEFINITIONS[type];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '100%',
        padding: '1.5rem 1rem 1rem',
        gap: '0.75rem',
      }}
    >
      {/* 상단 — 노드 설명 플레이스홀더 */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
        }}
      >
        <span
          className="text-title"
          style={{
            fontSize: '0.75rem',
            color: 'var(--color-gray-300)',
            letterSpacing: '0.08em',
          }}
        >
          {def.displayLabel}
        </span>
        <span
          style={{
            display: 'block',
            width: 28,
            height: 1,
            background: 'var(--color-gray-200)',
          }}
        />
        <span className="text-caption" style={{ color: 'var(--color-gray-300)', textAlign: 'center' }}>
          API 연동 후 활성화
        </span>
      </div>

      {/* 하단 — Generate CTA */}
      <button
        onClick={onGenerate}
        style={{
          width: '100%',
          height: 'var(--h-cta-lg)',
          border: 'none',
          borderRadius: 'var(--radius-pill)',
          background: 'var(--color-black)',
          color: 'var(--color-white)',
          fontFamily: 'var(--font-family-bebas)',
          fontSize: '1rem',
          letterSpacing: '0.08em',
          cursor: 'pointer',
          transition: 'opacity 120ms ease',
          flexShrink: 0,
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        GENERATE
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   RightSidebar
   - activeSidebarNodeType === null  →  SELECT TOOLS + 아코디언
   - activeSidebarNodeType !== null  →  노드탭 헤더 + 패널
══════════════════════════════════════════════════════════════════ */
export default function RightSidebar({
  activeSidebarNodeType,
  onNodeTabSelect,
  onNavigateToExpand,
}: Props) {
  /* 아코디언 열림/닫힘 — 패널 모드와 무관하게 기억 */
  const [accordionOpen, setAccordionOpen] = useState(true);

  const isPanelMode = activeSidebarNodeType !== null;

  /* 사이드바 외부 wrapper */
  const area: React.CSSProperties = {
    position: 'absolute',
    right: '1rem',
    top: '1rem',
    bottom: '1rem',
    width: 'var(--sidebar-w)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    zIndex: 90,
    pointerEvents: 'none',
    overflowY: isPanelMode ? 'hidden' : 'auto',
    overflowX: 'hidden',
  };

  const pill = (extra: React.CSSProperties = {}): React.CSSProperties => ({
    background: 'var(--color-white)',
    borderRadius: 'var(--radius-pill)',
    boxShadow: 'var(--shadow-float)',
    pointerEvents: 'all',
    flexShrink: 0,
    ...extra,
  });

  const hoverOn  = (e: React.MouseEvent<HTMLButtonElement>) =>
    (e.currentTarget.style.backgroundColor = 'var(--color-gray-100)');
  const hoverOff = (e: React.MouseEvent<HTMLButtonElement>) =>
    (e.currentTarget.style.backgroundColor = 'transparent');

  /* ── 패널 모드 ─────────────────────────────────────────────────── */
  if (isPanelMode) {
    return (
      <div style={{ ...area, overflowY: 'hidden' }}>
        {/* 헤더 행: [→ pill] + [노드탭 pill] */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch', flexShrink: 0 }}>
          {/* → 이동 버튼 */}
          <div style={{ ...pill(), width: 'var(--h-cta-lg)', height: 'var(--h-cta-lg)' }}>
            <button
              onClick={() => onNavigateToExpand(activeSidebarNodeType)}
              title="expand로 이동"
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
              onMouseEnter={e => { hoverOn(e); e.currentTarget.style.color = 'var(--color-black)'; }}
              onMouseLeave={e => { hoverOff(e); e.currentTarget.style.color = 'var(--color-gray-500)'; }}
            >
              <span style={{ width: 20, height: 20, display: 'flex' }}>
                <IconNavigate />
              </span>
            </button>
          </div>

          {/* 노드탭 — 클릭 시 SELECT TOOLS로 복귀 */}
          <div style={{ ...pill(), flex: 1 }}>
            <button
              onClick={() => onNodeTabSelect(activeSidebarNodeType)}
              style={{
                width: '100%',
                height: 'var(--h-cta-lg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 0.875rem 0 1rem',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                borderRadius: 'var(--radius-pill)',
                transition: 'background-color 100ms ease',
              }}
              onMouseEnter={hoverOn}
              onMouseLeave={hoverOff}
            >
              <span className="text-title" style={{ color: 'var(--color-black)', letterSpacing: '0.04em' }}>
                {NODE_DEFINITIONS[activeSidebarNodeType].displayLabel}
              </span>
              <span style={{ width: 16, height: 16, display: 'flex', color: 'var(--color-gray-500)', flexShrink: 0 }}>
                <IconChevronUp />
              </span>
            </button>
          </div>
        </div>

        {/* 패널 본문 */}
        <div
          style={{
            background: 'var(--color-white)',
            borderRadius: 'var(--radius-box)',
            boxShadow: 'var(--shadow-float)',
            flex: 1,
            minHeight: 0,
            pointerEvents: 'all',
          }}
        >
          <NodePanel
            type={activeSidebarNodeType}
            onGenerate={() => onNavigateToExpand(activeSidebarNodeType)}
          />
        </div>
      </div>
    );
  }

  /* ── SELECT TOOLS 모드 ─────────────────────────────────────────── */
  return (
    <div className="no-scrollbar" style={area}>
      {/* SELECT TOOLS 헤더 */}
      <div style={pill()}>
        <button
          onClick={() => setAccordionOpen(v => !v)}
          style={{
            width: '100%',
            height: 'var(--h-cta-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 0.875rem 0 1rem',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            borderRadius: 'var(--radius-pill)',
            transition: 'background-color 100ms ease',
          }}
          onMouseEnter={hoverOn}
          onMouseLeave={hoverOff}
        >
          <span className="text-title" style={{ color: 'var(--color-black)', letterSpacing: '0.04em' }}>
            SELECT TOOLS
          </span>
          <span style={{ width: 16, height: 16, display: 'flex', color: 'var(--color-gray-500)', flexShrink: 0 }}>
            {accordionOpen ? <IconChevronUp /> : <IconChevronDown />}
          </span>
        </button>
      </div>

      {/* 7개 노드 탭 — 아코디언 */}
      {accordionOpen && NODE_ORDER.map(type => (
        <div key={type} style={pill()}>
          <button
            onClick={() => onNodeTabSelect(type)}
            style={{
              width: '100%',
              height: 'var(--h-cta-lg)',
              display: 'flex',
              alignItems: 'center',
              padding: '0 1rem',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              borderRadius: 'var(--radius-pill)',
              fontFamily: 'var(--font-family-bebas)',
              fontSize: '1rem',
              letterSpacing: '0.04em',
              color: 'var(--color-black)',
              textAlign: 'left',
              transition: 'background-color 150ms ease',
            }}
            onMouseEnter={hoverOn}
            onMouseLeave={hoverOff}
            onMouseDown={e => (e.currentTarget.style.backgroundColor = 'var(--color-gray-200)')}
            onMouseUp={e => (e.currentTarget.style.backgroundColor = 'var(--color-gray-100)')}
          >
            {NODE_DEFINITIONS[type].displayLabel}
          </button>
        </div>
      ))}
    </div>
  );
}
