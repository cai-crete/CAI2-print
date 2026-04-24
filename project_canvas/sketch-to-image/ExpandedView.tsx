'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { CanvasNode, SketchPanelSettings } from '@/types/canvas';
import ExpandedSidebar from '@/components/ExpandedSidebar';
import SketchCanvas, { SketchCanvasHandle, SketchTool, PEN_STROKE_WIDTHS, ERASER_STROKE_WIDTHS, DOT_VISUAL_SIZES } from '@/components/SketchCanvas';
import SketchToImagePanel from '@/components/panels/SketchToImagePanel';
import { useBlueprintGeneration, GenerationParams } from '@/hooks/useBlueprintGeneration';

export interface SketchToImageExpandedViewProps {
  node: CanvasNode;
  onCollapse: () => void;
  onCollapseWithSketch?: (sketchBase64: string, thumbnailBase64: string, panelSettings: SketchPanelSettings) => void;
  onGenerateError?: (nodeId: string) => void;
  onAbortControllerReady?: (ctrl: AbortController) => void;
  onGenerateComplete?: (params: { sketchBase64: string; thumbnailBase64: string; generatedBase64: string; nodeId: string }) => void;
  onGeneratingChange?: (v: boolean) => void;
  isGenerating?: boolean;
}

/* ── Stroke size panel ──────────────────────────────────────────── */
function StrokePanel({
  widths, selectedWidth, onSelect,
}: { widths: number[]; selectedWidth: number; onSelect: (w: number) => void }) {
  return (
    <div style={{
      position: 'absolute',
      left: 'calc(100% + 0.75rem)',
      top: '50%',
      transform: 'translateY(-50%)',
      display: 'flex', alignItems: 'center', gap: '0.25rem',
      padding: '0.375rem 0.625rem',
      background: 'rgba(255,255,255,0.9)',
      backdropFilter: 'blur(8px)',
      borderRadius: '9999px',
      border: '1px solid rgba(0,0,0,0.1)',
      boxShadow: 'var(--shadow-float)',
      zIndex: 200, pointerEvents: 'auto',
    }}>
      {widths.map((w, idx) => {
        const dotSize = DOT_VISUAL_SIZES[idx];
        const isSelected = w === selectedWidth;
        return (
          <button
            key={w}
            onClick={() => onSelect(w)}
            title={`${w}px`}
            style={{
              width: 32, height: 32, border: 'none', borderRadius: '50%',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isSelected ? '#000000' : 'transparent',
              transition: 'background-color 100ms ease',
            }}
          >
            <div style={{
              width: dotSize, height: dotSize, borderRadius: '50%',
              background: isSelected ? '#ffffff' : '#000000', flexShrink: 0,
            }} />
          </button>
        );
      })}
    </div>
  );
}

/* ── SketchToolBtn ───────────────────────────────────────────────── */
function SketchToolBtn({
  children, active, disabled = false, title, onClick,
}: { children: React.ReactNode; active: boolean; disabled?: boolean; title: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '2.75rem', height: '2.75rem',
        border: 'none',
        background: active ? 'var(--color-gray-100)' : 'transparent',
        borderRadius: 'var(--radius-pill)',
        color: disabled ? 'var(--color-gray-300)' : active ? 'var(--color-black)' : 'var(--color-gray-500)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background-color 100ms ease, color 100ms ease',
        flexShrink: 0,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.backgroundColor = 'var(--color-gray-100)'; }}
      onMouseLeave={e => { e.currentTarget.style.backgroundColor = active ? 'var(--color-gray-100)' : 'transparent'; }}
    >
      <span style={{ width: 20, height: 20, display: 'flex' }}>{children}</span>
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SketchToImageExpandedView
══════════════════════════════════════════════════════════════════ */
export default function SketchToImageExpandedView({
  node, onCollapse, onCollapseWithSketch, onGenerateError, onAbortControllerReady,
  onGenerateComplete, onGeneratingChange,
  isGenerating: globalIsGenerating = false,
}: SketchToImageExpandedViewProps) {

  /* ── Sketch tool state ─────────────────────────────────────────── */
  const [sketchTool,        setSketchTool]        = useState<SketchTool>('cursor');
  const [penStrokeWidth,    setPenStrokeWidth]    = useState(2);
  const [eraserStrokeWidth, setEraserStrokeWidth] = useState(20);
  const [showStrokePanel,   setShowStrokePanel]   = useState<'pen' | 'eraser' | null>(null);
  const [sketchCanUndo,     setSketchCanUndo]     = useState(false);
  const [sketchCanRedo,     setSketchCanRedo]     = useState(false);
  const [internalZoom,      setInternalZoom]      = useState(100);
  const [internalOffset,    setInternalOffset]    = useState({ x: 0, y: 0 });

  /* ── 패널 설정: node.sketchPanelSettings에서 복원 ─────────────── */
  const ps = node.sketchPanelSettings;
  const [sketchPrompt,  setSketchPrompt]  = useState(ps?.prompt      ?? '');
  const [sketchMode,    setSketchMode]    = useState(ps?.mode        ?? 'CONCEPT');
  const [sketchStyle,   setSketchStyle]   = useState<string | null>(ps?.style ?? 'NONE');
  const [aspectRatio,   setAspectRatio]   = useState<string | null>(ps?.aspectRatio ?? '4:3');
  const [resolution,    setResolution]    = useState(ps?.resolution  ?? 'NORMAL QUALITY');

  const sketchCanvasRef = useRef<SketchCanvasHandle>(null);
  const abortRef        = useRef<AbortController | null>(null);

  const { isLoading, error, generate } = useBlueprintGeneration();

  const effectiveIsGenerating = globalIsGenerating || isLoading;

  /* Expand 시 generatedImageData 우선 로드, 없으면 sketchData */
  useEffect(() => {
    const toLoad = node.generatedImageData ?? node.sketchData;
    if (toLoad) {
      sketchCanvasRef.current?.loadImage(toLoad);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.id]);

  useEffect(() => {
    onGeneratingChange?.(isLoading);
  }, [isLoading, onGeneratingChange]);

  /* ── 현재 패널 설정 수집 ───────────────────────────────────────── */
  const collectPanelSettings = useCallback((): SketchPanelSettings => ({
    prompt: sketchPrompt,
    mode:   sketchMode,
    style:  sketchStyle,
    aspectRatio,
    resolution,
  }), [sketchPrompt, sketchMode, sketchStyle, aspectRatio, resolution]);

  /* ── Sketch tool button handler ────────────────────────────────── */
  const handleSketchToolClick = useCallback((tool: SketchTool) => {
    if (tool === 'pen' || tool === 'eraser') {
      if (sketchTool === tool) {
        setShowStrokePanel(prev => prev === tool ? null : tool);
      } else {
        setSketchTool(tool);
        setShowStrokePanel(null);
      }
    } else {
      setSketchTool(tool);
      setShowStrokePanel(null);
    }
  }, [sketchTool]);

  /* ── [<-] 버튼: 스케치 + 패널 설정 저장 후 collapse ────────────── */
  const handleSketchCollapse = useCallback(() => {
    const sketchBase64   = sketchCanvasRef.current?.exportAsBase64()  ?? '';
    const thumbnailBase64 = sketchCanvasRef.current?.exportThumbnail() ?? '';
    onCollapseWithSketch?.(sketchBase64, thumbnailBase64, collectPanelSettings());
    onCollapse();
  }, [onCollapse, onCollapseWithSketch, collectPanelSettings]);

  /* ESC 키 캡처 */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        handleSketchCollapse();
      }
    };
    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, [handleSketchCollapse]);

  /* ── Generate ───────────────────────────────────────────────────── */
  const handleGenerate = useCallback(async () => {
    if (effectiveIsGenerating) return;
    const canvas = sketchCanvasRef.current;
    if (!canvas) return;

    const sketchBase64    = canvas.exportAsBase64();
    const thumbnailBase64 = canvas.exportThumbnail();
    if (!sketchBase64) return;

    abortRef.current = new AbortController();
    onAbortControllerReady?.(abortRef.current);

    const params: GenerationParams = {
      userPrompt:  sketchPrompt,
      vizMode:     sketchMode,
      styleMode:   sketchStyle ?? 'NONE',
      resolution:  resolution || 'NORMAL QUALITY',
      aspectRatio: aspectRatio ?? '4:3',
    };

    onGeneratingChange?.(true);
    onCollapseWithSketch?.(sketchBase64, thumbnailBase64, collectPanelSettings());
    onCollapse();

    const generatedBase64 = await generate(sketchBase64, params, abortRef.current.signal);
    if (generatedBase64) {
      onGenerateComplete?.({ sketchBase64, thumbnailBase64, generatedBase64, nodeId: node.id });
    } else {
      onGeneratingChange?.(false);
      onGenerateError?.(node.id);
    }
  }, [
    effectiveIsGenerating, sketchPrompt, sketchMode, sketchStyle, resolution, aspectRatio,
    generate, onGenerateComplete, onGenerateError, onGeneratingChange,
    onCollapseWithSketch, onCollapse, onAbortControllerReady, node.id, collectPanelSettings,
  ]);

  /* ── Sketch undo/redo ──────────────────────────────────────────── */
  const sketchUndo = useCallback(() => { sketchCanvasRef.current?.undo(); }, []);
  const sketchRedo = useCallback(() => { sketchCanvasRef.current?.redo(); }, []);

  /* ── Upload image ──────────────────────────────────────────────── */
  const handleUploadImage = useCallback(() => {
    sketchCanvasRef.current?.uploadTrigger();
  }, []);

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'var(--color-app-bg)', display: 'flex' }}>

      <div style={{ position: 'absolute', inset: 0 }}>
        <SketchCanvas
          ref={sketchCanvasRef}
          activeTool={sketchTool}
          penStrokeWidth={penStrokeWidth}
          eraserStrokeWidth={eraserStrokeWidth}
          onUndoAvailable={setSketchCanUndo}
          onRedoAvailable={setSketchCanRedo}
          internalZoom={internalZoom}
          internalOffset={internalOffset}
          onInternalZoomChange={setInternalZoom}
          onInternalOffsetChange={setInternalOffset}
        />
      </div>

      {/* 좌측 스케치 툴바 */}
      <div style={{
        position: 'absolute', left: '1rem', top: '50%',
        transform: 'translateY(-50%)', zIndex: 100,
      }}>
        {/* 업로드 [+] 버튼 */}
        <div style={{ marginBottom: '0.75rem' }}>
          <button
            onClick={handleUploadImage}
            title="이미지 업로드"
            style={{
              width: '3.5rem', height: '3.5rem',
              background: 'var(--color-black)', color: 'var(--color-white)',
              border: 'none', borderRadius: 'var(--radius-pill)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'var(--shadow-float)', cursor: 'pointer',
              transition: 'opacity 120ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" width={24} height={24}>
              <path d="M10 3V17M3 10H17" />
            </svg>
          </button>
        </div>

        {/* 도구 pill */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
          background: 'var(--color-white)', borderRadius: 'var(--radius-pill)',
          padding: '6px', boxShadow: 'var(--shadow-float)',
        }}>
          {/* cursor */}
          <SketchToolBtn active={sketchTool === 'cursor'} title="선택 (V)" onClick={() => handleSketchToolClick('cursor')}>
            <svg viewBox="0 0 20 20" fill="currentColor"><path d="M4 2.5 L4 15 L7.2 11.8 L9.8 17 L12.2 16 L9.6 10.8 H14.5 Z" /></svg>
          </SketchToolBtn>
          {/* pan */}
          <SketchToolBtn active={sketchTool === 'pan'} title="이동 (H)" onClick={() => handleSketchToolClick('pan')}>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.5 9V3.5A1.5 1.5 0 0 1 12.5 3.5V9" />
              <path d="M9.5 4A1.5 1.5 0 0 0 6.5 4V9" />
              <path d="M12.5 5A1.5 1.5 0 0 1 15.5 5V12A6 6 0 0 1 9.5 18H9A6 6 0 0 1 3.5 12V9A1.5 1.5 0 0 1 6.5 9" />
            </svg>
          </SketchToolBtn>

          <div style={{ width: 'calc(100% - 12px)', height: 1, background: 'var(--color-gray-100)', margin: '2px 6px' }} />

          {/* pen */}
          <div style={{ position: 'relative' }}>
            <SketchToolBtn active={sketchTool === 'pen'} title="펜" onClick={() => handleSketchToolClick('pen')}>
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 3L17 6L7 16L3 17L4 13L14 3Z" />
              </svg>
            </SketchToolBtn>
            {showStrokePanel === 'pen' && (
              <StrokePanel widths={PEN_STROKE_WIDTHS} selectedWidth={penStrokeWidth} onSelect={w => setPenStrokeWidth(w)} />
            )}
          </div>

          {/* eraser */}
          <div style={{ position: 'relative' }}>
            <SketchToolBtn active={sketchTool === 'eraser'} title="지우개" onClick={() => handleSketchToolClick('eraser')}>
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 17H17" />
                <path d="M4 12L12 4L17 9L9 17Z" />
              </svg>
            </SketchToolBtn>
            {showStrokePanel === 'eraser' && (
              <StrokePanel widths={ERASER_STROKE_WIDTHS} selectedWidth={eraserStrokeWidth} onSelect={w => setEraserStrokeWidth(w)} />
            )}
          </div>

          {/* text */}
          <SketchToolBtn active={sketchTool === 'text'} title="텍스트" onClick={() => handleSketchToolClick('text')}>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 5H16M10 5V17" />
            </svg>
          </SketchToolBtn>

          <div style={{ width: 'calc(100% - 12px)', height: 1, background: 'var(--color-gray-100)', margin: '2px 6px' }} />

          {/* undo / redo */}
          <SketchToolBtn active={false} disabled={!sketchCanUndo} title="실행 취소" onClick={sketchUndo}>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <path d="M7.5 12.5L2.5 7.5L7.5 2.5" /><path d="M2.5 7.5H12.5A5 5 0 0 1 12.5 17.5H10" />
            </svg>
          </SketchToolBtn>
          <SketchToolBtn active={false} disabled={!sketchCanRedo} title="다시 실행" onClick={sketchRedo}>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.5 12.5L17.5 7.5L12.5 2.5" /><path d="M17.5 7.5H7.5A5 5 0 0 0 7.5 17.5H10" />
            </svg>
          </SketchToolBtn>

          <div style={{ width: 'calc(100% - 12px)', height: 1, background: 'var(--color-gray-100)', margin: '2px 6px' }} />

          {/* zoom controls */}
          <SketchToolBtn active={false} title="확대" onClick={() => setInternalZoom(z => Math.min(400, z + 10))}>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 3V17M3 10H17" />
            </svg>
          </SketchToolBtn>
          <button
            onClick={() => { setInternalZoom(100); setInternalOffset({ x: 0, y: 0 }); }}
            title="100% (초기화)"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '2.75rem', height: '1.75rem',
              border: 'none', background: 'transparent',
              borderRadius: 'var(--radius-pill)', cursor: 'pointer',
              fontFamily: 'var(--font-family-pretendard)',
              fontSize: '0.7rem', fontWeight: 600,
              color: 'var(--color-gray-500)', letterSpacing: 0,
              transition: 'background-color 100ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-gray-100)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            {internalZoom}%
          </button>
          <SketchToolBtn active={false} title="축소" onClick={() => setInternalZoom(z => Math.max(100, z - 10))}>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 10H17" />
            </svg>
          </SketchToolBtn>
        </div>
      </div>

      {/* 우측 ExpandedSidebar */}
      <ExpandedSidebar currentNodeType={node.type} onCollapse={handleSketchCollapse}>
        <SketchToImagePanel
          isGenerating={effectiveIsGenerating}
          error={error}
          sketchPrompt={sketchPrompt}
          setSketchPrompt={setSketchPrompt}
          sketchMode={sketchMode}
          setSketchMode={setSketchMode}
          sketchStyle={sketchStyle}
          setSketchStyle={setSketchStyle}
          aspectRatio={aspectRatio}
          setAspectRatio={setAspectRatio}
          resolution={resolution}
          setResolution={setResolution}
          onGenerate={handleGenerate}
        />
      </ExpandedSidebar>
    </div>
  );
}
