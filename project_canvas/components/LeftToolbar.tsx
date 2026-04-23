'use client';

import { useState, useEffect, useRef } from 'react';

type ActiveTool = 'cursor' | 'handle';

interface Props {
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
  onUploadImage?: (file: File) => void;
}

const IC = { stroke: 'currentColor', fill: 'none', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

const IconCursor = () => (
  <svg viewBox="0 0 20 20" fill="currentColor">
    <path d="M4 2.5 L4 15 L7.2 11.8 L9.8 17 L12.2 16 L9.6 10.8 H14.5 Z" strokeLinejoin="round" />
  </svg>
);

const IconHand = () => (
  <svg viewBox="0 0 20 20" {...IC}>
    <path d="M9.5 9V3.5A1.5 1.5 0 0 1 12.5 3.5V9" />
    <path d="M9.5 4A1.5 1.5 0 0 0 6.5 4V9" />
    <path d="M12.5 5A1.5 1.5 0 0 1 15.5 5V12A6 6 0 0 1 9.5 18H9A6 6 0 0 1 3.5 12V9A1.5 1.5 0 0 1 6.5 9" />
  </svg>
);

const IconUndo = () => (
  <svg viewBox="0 0 20 20" {...IC}>
    <path d="M7.5 12.5L2.5 7.5L7.5 2.5" />
    <path d="M2.5 7.5H12.5A5 5 0 0 1 12.5 17.5H10" />
  </svg>
);

const IconRedo = () => (
  <svg viewBox="0 0 20 20" {...IC}>
    <path d="M12.5 12.5L17.5 7.5L12.5 2.5" />
    <path d="M17.5 7.5H7.5A5 5 0 0 0 7.5 17.5H10" />
  </svg>
);

const IconPlus = () => (
  <svg viewBox="0 0 20 20" {...IC}>
    <path d="M10 3V17M3 10H17" />
  </svg>
);

const IconMinus = () => (
  <svg viewBox="0 0 20 20" {...IC}>
    <path d="M3 10H17" />
  </svg>
);

const IconImage = () => (
  <svg viewBox="0 0 20 20" {...IC}>
    <rect x="2" y="4" width="16" height="12" rx="2" />
    <circle cx="7" cy="8" r="1.5" />
    <path d="M2 14L6 10L9 13L13 9L18 14" />
  </svg>
);

export default function LeftToolbar({
  activeTool, scale, canUndo, canRedo,
  onToolChange, onUndo, onRedo,
  onZoomIn, onZoomOut, onZoomReset,
  onAddArtboard, onUploadImage = () => {},
}: Props) {
  const pct = Math.round(scale * 100);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef   = useRef<HTMLDivElement>(null);
  const fileInputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isDropdownOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUploadImage(file);
    e.target.value = '';
    setIsDropdownOpen(false);
  };

  const btnBase: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '2.75rem',
    height: '2.75rem',
    border: 'none',
    background: 'transparent',
    borderRadius: 'var(--radius-pill)',
    color: 'var(--color-gray-500)',
    cursor: 'pointer',
    transition: 'background-color 100ms ease',
    flexShrink: 0,
  };

  const mkBtn = (
    onClick: () => void,
    icon: React.ReactNode,
    title: string,
    active = false,
    disabled = false,
  ) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        ...btnBase,
        color: disabled
          ? 'var(--color-gray-300)'
          : active
          ? 'var(--color-black)'
          : 'var(--color-gray-500)',
        backgroundColor: active ? 'var(--color-gray-100)' : 'transparent',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-gray-100)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = active ? 'var(--color-gray-100)' : 'transparent'; }}
      onMouseDown={e => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-gray-200)'; }}
      onMouseUp={e => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-gray-100)'; }}
    >
      <span className="icon-frame">{icon}</span>
    </button>
  );

  const dropdownItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    width: '100%',
    padding: '0 1rem',
    height: '2.75rem',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontFamily: 'var(--font-family-pretendard)',
    fontSize: '0.8125rem',
    color: 'var(--color-gray-600)',
    whiteSpace: 'nowrap',
    textAlign: 'left',
    transition: 'background-color 100ms ease',
    borderRadius: 'var(--radius-box)',
  };

  return (
    <div style={{
      position: 'absolute',
      left: '1rem',
      top: '50%',
      transform: 'translateY(-50%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.5rem',
      zIndex: 1000,
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2px',
        background: 'var(--color-white)',
        borderRadius: 'var(--radius-pill)',
        padding: '6px',
        boxShadow: 'var(--shadow-float)',
      }}>
        {mkBtn(
          () => onToolChange('cursor'),
          <IconCursor />,
          '선택 (V)',
          activeTool === 'cursor',
        )}
        {mkBtn(
          () => onToolChange('handle'),
          <IconHand />,
          '이동 (H)',
          activeTool === 'handle',
        )}

        <div style={{ width: 'calc(100% - 12px)', height: 1, background: 'var(--color-gray-100)', margin: '2px 6px' }} />

        {mkBtn(onUndo, <IconUndo />, '실행 취소 (Ctrl Z)',       false, !canUndo)}
        {mkBtn(onRedo, <IconRedo />, '다시 실행 (Ctrl Shift Z)', false, !canRedo)}

        <div style={{ width: 'calc(100% - 12px)', height: 1, background: 'var(--color-gray-100)', margin: '2px 6px' }} />

        {mkBtn(onZoomIn,  <IconPlus />,  '확대 (+')}
        <button
          onClick={onZoomReset}
          title="1클릭: 전체 보기  2클릭: 최근 아이템  3클릭: 원위치"
          style={{
            ...btnBase,
            fontFamily: 'var(--font-family-pretendard)',
            fontSize: '0.7rem',
            fontWeight: 600,
            color: 'var(--color-gray-500)',
            height: '1.75rem',
            letterSpacing: 0,
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-gray-100)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          {pct}%
        </button>
        {mkBtn(onZoomOut, <IconMinus />, '축소 (-)')}
      </div>

      {/* ── 상단 CTA: 새 아트보드 추가 / 이미지 업로드 ─────────────── */}
      <div
        ref={dropdownRef}
        style={{
          position: 'absolute',
          bottom: 'calc(100% + 0.75rem)',
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      >
        {/* 드롭다운 메뉴 */}
        {isDropdownOpen && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: 'calc(100% + 0.5rem)',
            transform: 'translateY(-50%)',
            background: 'var(--color-white)',
            borderRadius: 'var(--radius-box)',
            boxShadow: 'var(--shadow-float)',
            padding: '4px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            zIndex: 1001,
            minWidth: '9rem',
          }}
            onMouseDown={e => e.stopPropagation()}
          >
            <button
              style={dropdownItemStyle}
              onClick={() => { onAddArtboard(); setIsDropdownOpen(false); }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-gray-100)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <span style={{ width: 16, height: 16, display: 'flex', color: 'var(--color-gray-400)' }}><IconPlus /></span>
              새 아트보드
            </button>
            <button
              style={dropdownItemStyle}
              onClick={() => fileInputRef.current?.click()}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-gray-100)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <span style={{ width: 16, height: 16, display: 'flex', color: 'var(--color-gray-400)' }}><IconImage /></span>
              이미지 업로드
            </button>
          </div>
        )}

        {/* 숨겨진 파일 입력 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {/* + 버튼 */}
        <button
          onClick={() => setIsDropdownOpen(v => !v)}
          title="아트보드 추가"
          style={{
            width: '3.5rem',
            height: '3.5rem',
            background: isDropdownOpen ? 'var(--color-gray-700)' : 'var(--color-black)',
            color: 'var(--color-white)',
            border: 'none',
            borderRadius: 'var(--radius-pill)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-float)',
            cursor: 'pointer',
            transition: 'opacity 120ms ease, transform 120ms ease, background-color 120ms ease',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.opacity = '0.8';
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.opacity = '1';
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          }}
          onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.96)'; }}
          onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)'; }}
        >
          <span style={{ width: 24, height: 24, display: 'flex' }}>
            <IconPlus />
          </span>
        </button>
      </div>
    </div>
  );
}
