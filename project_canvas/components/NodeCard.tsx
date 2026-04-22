'use client';

import { useRef } from 'react';
import { CanvasNode, NODE_DEFINITIONS, PortShape } from '@/types/canvas';

interface Props {
  node: CanvasNode;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onExpand: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onMouseDown: (id: string, e: React.MouseEvent) => void;
  hasThumbnail: boolean;
  portLeft?: PortShape;  // 자식 측 (도착점)
  portRight?: PortShape; // 부모 측 (출발점)
}

/* ══════════════════════════════════════════════════════════════
   아이콘 (strokeLinecap/strokeLinejoin="round" — §A.9)
══════════════════════════════════════════════════════════════ */
const IC = { stroke: 'currentColor', fill: 'none', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

const IconDuplicate = () => (
  <svg viewBox="0 0 20 20" {...IC}>
    <rect x="7" y="7" width="10" height="10" rx="2" />
    <path d="M5 13H4A2 2 0 0 1 2 11V4A2 2 0 0 1 4 2H11A2 2 0 0 1 13 4V5" />
  </svg>
);

const IconDownload = () => (
  <svg viewBox="0 0 20 20" {...IC}>
    <path d="M10 3V13M6 9L10 13L14 9" />
    <path d="M3 16V17A2 2 0 0 0 5 19H15A2 2 0 0 0 17 17V16" />
  </svg>
);

const IconDelete = () => (
  <svg viewBox="0 0 20 20" {...IC}>
    <path d="M5 5L5 16A2 2 0 0 0 7 18H13A2 2 0 0 0 15 16V5" />
    <path d="M3 5H17M8 2H12" />
    <line x1="8" y1="9" x2="8" y2="13" />
    <line x1="12" y1="9" x2="12" y2="13" />
  </svg>
);

const IconExpand = () => (
  <svg viewBox="0 0 20 20" {...IC}>
    <polyline points="12,3 17,3 17,8" />
    <polyline points="3,12 3,17 8,17" />
    <line x1="17" y1="3" x2="11" y2="9" />
    <line x1="3" y1="17" x2="9" y2="11" />
  </svg>
);

/* ══════════════════════════════════════════════════════════════
   NodeCard — 아트보드 크기: 가로 A4 비율 (297:210), rem 기준
   width 17.5rem (≈280px), height 12.375rem (≈198px)
══════════════════════════════════════════════════════════════ */
const CARD_W_REM = '17.5rem';
const CARD_H_REM = '12.375rem';
const PORT_SIZE  = 8; // px — 원/다이아몬드 공통 box 크기

/* ── 포트 인디케이터 렌더링 ──────────────────────────────────── */
function PortIndicator({
  shape,
  side,
}: {
  shape: PortShape;
  side: 'left' | 'right';
}) {
  if (shape === 'none') return null;

  const isSolid   = shape.endsWith('-solid');
  const isDiamond = shape.startsWith('diamond');

  const base: React.CSSProperties = {
    position: 'absolute',
    [side]: -(PORT_SIZE / 2),
    top: '50%',
    width: PORT_SIZE,
    height: PORT_SIZE,
    zIndex: 5,
    pointerEvents: 'none',
    background: isSolid ? 'var(--color-black)' : 'var(--color-white)',
    border: isSolid ? 'none' : '1.5px solid var(--color-black)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  };

  if (isDiamond) {
    return (
      <div style={{ ...base, transform: 'translateY(-50%) rotate(45deg)' }} />
    );
  }

  return (
    <div style={{ ...base, borderRadius: '50%', transform: 'translateY(-50%)' }} />
  );
}

export default function NodeCard({
  node, isSelected, onSelect, onExpand, onDuplicate, onDelete, onMouseDown, hasThumbnail,
  portLeft = 'none', portRight = 'none',
}: Props) {
  const { id, type } = node;
  const def = NODE_DEFINITIONS[type];

  const mouseDownPos = useRef<{ x: number; y: number } | null>(null);

  const handleArtboardMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    mouseDownPos.current = { x: e.clientX, y: e.clientY };
    onMouseDown(id, e);
  };

  const handleArtboardMouseUp = (e: React.MouseEvent) => {
    if (!mouseDownPos.current) return;
    const dx = Math.abs(e.clientX - mouseDownPos.current.x);
    const dy = Math.abs(e.clientY - mouseDownPos.current.y);
    mouseDownPos.current = null;
    if (dx < 6 && dy < 6) onSelect(id);
  };

  /* 액션 바 내 버튼 공통 스타일 — §A.4 CTA-tertiary-small (28px) */
  const actionBtnBase: React.CSSProperties = {
    width: 36,
    height: 36,
    border: 'none',
    borderRadius: 'var(--radius-pill)',
    background: 'var(--color-white)',
    boxShadow: 'var(--shadow-float)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--color-gray-500)',
    transition: 'background-color 100ms ease, color 100ms ease',
    flexShrink: 0,
  };

  return (
    /* 외부 wrapper — overflow: visible 으로 액션 바·포트가 카드 바깥에 노출됨 */
    <div style={{ width: CARD_W_REM, userSelect: 'none', position: 'relative' }}>

      {/* ── 액션 바 — 아트보드 외부 상단 우측 (선택 시 노출) ────── */}
      {isSelected && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 0.5rem)',
            right: 0,
            display: 'flex',
            gap: '0.25rem',
            zIndex: 20,
            pointerEvents: 'all',
          }}
        >
          <button
            title="복제"
            style={actionBtnBase}
            onClick={e => { e.stopPropagation(); onDuplicate(id); }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-gray-100)'; e.currentTarget.style.color = 'var(--color-black)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--color-white)'; e.currentTarget.style.color = 'var(--color-gray-500)'; }}
          >
            <span style={{ width: 16, height: 16, display: 'flex' }}><IconDuplicate /></span>
          </button>

          <button
            title="다운로드"
            style={actionBtnBase}
            onClick={e => e.stopPropagation()}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-gray-100)'; e.currentTarget.style.color = 'var(--color-black)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--color-white)'; e.currentTarget.style.color = 'var(--color-gray-500)'; }}
          >
            <span style={{ width: 16, height: 16, display: 'flex' }}><IconDownload /></span>
          </button>

          <button
            title="삭제"
            style={actionBtnBase}
            onClick={e => { e.stopPropagation(); onDelete(id); }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#fff0f0'; e.currentTarget.style.color = '#cc0000'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--color-white)'; e.currentTarget.style.color = 'var(--color-gray-500)'; }}
          >
            <span style={{ width: 16, height: 16, display: 'flex' }}><IconDelete /></span>
          </button>
        </div>
      )}

      {/* ── 아트보드 ─────────────────────────────────────────────── */}
      <div
        onMouseDown={handleArtboardMouseDown}
        onMouseUp={handleArtboardMouseUp}
        style={{
          width: CARD_W_REM,
          height: CARD_H_REM,
          background: 'var(--color-white)',
          borderRadius: 'var(--radius-box)',
          boxShadow: isSelected
            ? '0 0 0 2px var(--color-black), var(--shadow-float)'
            : 'var(--shadow-float)',
          position: 'relative',
          overflow: 'hidden',
          cursor: 'default',
          transition: 'box-shadow 150ms ease',
        }}
      >
        {/* ── 확대 버튼 — 내부 우측 상단, 원형 ───────────────────── */}
        <button
          title="전체 화면으로 열기"
          onClick={e => { e.stopPropagation(); onExpand(id); }}
          style={{
            position: 'absolute',
            top: 8, right: 8,
            zIndex: 10,
            width: 32, height: 32,
            borderRadius: '50%',
            border: '1.5px solid var(--color-gray-200)',
            background: 'var(--color-white)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-gray-500)',
            transition: 'border-color 100ms ease, color 100ms ease, box-shadow 100ms ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--color-black)';
            e.currentTarget.style.color = 'var(--color-black)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.18)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--color-gray-200)';
            e.currentTarget.style.color = 'var(--color-gray-500)';
            e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.12)';
          }}
        >
          <span style={{ width: 14, height: 14, display: 'flex' }}><IconExpand /></span>
        </button>

        {/* ── 아트보드 내용 ─────────────────────────────────────── */}
        {hasThumbnail ? (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(135deg, var(--color-gray-100), var(--color-gray-200))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <span className="text-title" style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', letterSpacing: '0.08em' }}>
              {def.displayLabel}
            </span>
          </div>
        ) : (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 6, pointerEvents: 'none',
          }}>
            <span className="text-title" style={{ fontSize: '0.75rem', color: 'var(--color-gray-300)', letterSpacing: '0.08em' }}>
              {def.displayLabel}
            </span>
            <span style={{ display: 'block', width: 28, height: 1, background: 'var(--color-gray-200)' }} />
            <span className="text-caption" style={{ color: 'var(--color-gray-300)' }}>
              썸네일 없음
            </span>
          </div>
        )}
      </div>

      {/* ── 포트 인디케이터 ──────────────────────────────────────── */}
      <PortIndicator shape={portLeft}  side="left"  />
      <PortIndicator shape={portRight} side="right" />
    </div>
  );
}
