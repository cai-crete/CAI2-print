'use client';

import { useState } from 'react';
import { NodeType, NODE_DEFINITIONS } from '@/types/canvas';

const IC = { stroke: 'currentColor', fill: 'none', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

const IconChevronUp   = () => <svg viewBox="0 0 20 20" {...IC}><polyline points="4,13 10,7 16,13" /></svg>;
const IconChevronDown = () => <svg viewBox="0 0 20 20" {...IC}><polyline points="4,7 10,13 16,7" /></svg>;
export const IconCollapse = () => <svg viewBox="0 0 20 20" {...IC}><path d="M16 10H4M9 5L4 10L9 15" /></svg>;

export default function ExpandedSidebar({ currentNodeType, onCollapse, children }: {
  currentNodeType: NodeType;
  onCollapse: () => void;
  children?: React.ReactNode;
}) {
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
          overflow: 'hidden',
          padding: 0,
        }}>
          {children ?? <div />}
        </div>
      )}
    </div>
  );
}
