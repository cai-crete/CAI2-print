'use client';

import { useState, useEffect } from 'react';

interface Props {
  label?: string;
  onCancel: () => void;
}

const IC = { stroke: 'currentColor', fill: 'none', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

const IconLoader = () => (
  <svg viewBox="0 0 20 20" width={18} height={18} {...IC}>
    <circle cx="10" cy="10" r="7" strokeOpacity={0.25} />
    <path d="M10 3A7 7 0 0 1 17 10" />
  </svg>
);

const IconX = () => (
  <svg viewBox="0 0 20 20" width={14} height={14} {...IC}>
    <path d="M5 5L15 15M15 5L5 15" />
  </svg>
);

export default function GeneratingToast({ label = 'IMAGE GENERATING', onCancel }: Props) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <style>{`
        @keyframes toast-spin { to { transform: rotate(360deg); } }
      `}</style>
      <div style={{
        position: 'fixed',
        bottom: 32,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9000,
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0 1.25rem 0 1rem',
        height: '2.75rem',
        borderRadius: '9999px',
        background: 'var(--color-white)',
        boxShadow: 'var(--shadow-float)',
        border: '1px solid var(--color-gray-100)',
        userSelect: 'none',
        whiteSpace: 'nowrap',
      }}>
        <span style={{ display: 'flex', animation: 'toast-spin 1s linear infinite', color: 'var(--color-gray-500)' }}>
          <IconLoader />
        </span>

        <span style={{
          fontFamily: 'var(--font-family-bebas)',
          fontSize: '0.875rem',
          letterSpacing: '0.1em',
          color: 'var(--color-black)',
        }}>
          {label}
        </span>

        <span style={{
          fontFamily: 'var(--font-family-pretendard)',
          fontSize: '0.75rem',
          color: 'var(--color-gray-400)',
          minWidth: '2.5rem',
        }}>
          {elapsed}s
        </span>

        <button
          onClick={onCancel}
          title="생성 취소"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--color-gray-400)',
            transition: 'background-color 100ms ease, color 100ms ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = 'var(--color-gray-100)';
            e.currentTarget.style.color = 'var(--color-black)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--color-gray-400)';
          }}
        >
          <IconX />
        </button>
      </div>
    </>
  );
}
