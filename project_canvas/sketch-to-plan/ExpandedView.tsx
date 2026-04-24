'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { CanvasNode, PlanPanelSettings } from '@/types/canvas';
import ExpandedSidebar from '@/components/ExpandedSidebar';
import SketchCanvas, { SketchCanvasHandle, SketchTool, PEN_STROKE_WIDTHS, ERASER_STROKE_WIDTHS, DOT_VISUAL_SIZES } from '@/components/SketchCanvas';
import { usePlanGeneration } from '@/hooks/usePlanGeneration';

/* ── 건물 유형 정의 ─────────────────────────────────────────────── */
const FLOOR_TYPES: { value: string; label: string }[] = [
  { value: 'RESIDENTIAL',         label: '주거시설' },
  { value: 'COMMERCIAL',          label: '상업시설' },
  { value: 'OFFICE',              label: '업무시설' },
  { value: 'MIXED_USE',           label: '복합시설' },
  { value: 'CULTURAL_PUBLIC',     label: '문화공공시설' },
  { value: 'EDUCATION_RESEARCH',  label: '교육연구시설' },
  { value: 'HEALTHCARE_WELFARE',  label: '의료복지시설' },
  { value: 'HOSPITALITY_LEISURE', label: '숙박여가시설' },
  { value: 'MASTERPLAN_URBANISM', label: '마스터플랜/도시' },
];

/* ── 그리드 모듈 정의 ────────────────────────────────────────────── */
const GRID_MODULES = [1000, 2000, 4000, 8000, 16000, 24000];

function formatGridLabel(mm: number): string {
  return mm < 1000 ? `${mm}mm` : `${mm / 1000}m`;
}

/* ── Props ───────────────────────────────────────────────────────── */
export interface SketchToPlanExpandedViewProps {
  node: CanvasNode;
  onCollapse: () => void;
  onCollapseWithPlanSketch?: (sketchBase64: string, thumbnailBase64: string, planSettings: PlanPanelSettings) => void;
  onGeneratePlanComplete?: (params: {
    sketchBase64: string;
    thumbnailBase64: string;
    generatedPlanBase64: string;
    roomAnalysis: string;
    nodeId: string;
  }) => void;
  onGeneratingChange?: (v: boolean) => void;
  isGenerating?: boolean;
}

/* ── StrokePanel ─────────────────────────────────────────────────── */
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

/* ── Icons ───────────────────────────────────────────────────────── */
const IC = { stroke: 'currentColor', fill: 'none', strokeWidth: 1.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const IconLoader = () => (
  <svg viewBox="0 0 20 20" width={18} height={18} {...IC} style={{ animation: 'spin 1s linear infinite' }}>
    <circle cx="10" cy="10" r="7" strokeOpacity={0.3} />
    <path d="M10 3A7 7 0 0 1 17 10" />
  </svg>
);

/* ══════════════════════════════════════════════════════════════════
   SketchToPlanExpandedView
══════════════════════════════════════════════════════════════════ */
export default function SketchToPlanExpandedView({
  node, onCollapse, onCollapseWithPlanSketch,
  onGeneratePlanComplete, onGeneratingChange,
  isGenerating: globalIsGenerating = false,
}: SketchToPlanExpandedViewProps) {

  /* ── Sketch tool state ─────────────────────────────────────────── */
  const [sketchTool,        setSketchTool]        = useState<SketchTool>('cursor');
  const [penStrokeWidth,    setPenStrokeWidth]    = useState(2);
  const [eraserStrokeWidth, setEraserStrokeWidth] = useState(20);
  const [showStrokePanel,   setShowStrokePanel]   = useState<'pen' | 'eraser' | null>(null);
  const [sketchCanUndo,     setSketchCanUndo]     = useState(false);
  const [sketchCanRedo,     setSketchCanRedo]     = useState(false);
  const [internalZoom,      setInternalZoom]      = useState(100);
  const [internalOffset,    setInternalOffset]    = useState({ x: 0, y: 0 });

  /* ── 패널 설정: node.planPanelSettings에서 복원 ────────────────── */
  const ps = node.planPanelSettings;
  const defaultGridIdx = GRID_MODULES.indexOf(4000);
  const initGridIdx = ps?.gridModule != null
    ? Math.max(0, GRID_MODULES.indexOf(ps.gridModule))
    : defaultGridIdx;

  const [planPrompt,  setPlanPrompt]  = useState(ps?.prompt    ?? '');
  const [floorType,   setFloorType]   = useState(ps?.floorType ?? 'RESIDENTIAL');
  const [gridModIdx,  setGridModIdx]  = useState(initGridIdx < 0 ? defaultGridIdx : initGridIdx);

  const sketchCanvasRef = useRef<SketchCanvasHandle>(null);

  const { isLoading, error, generate } = usePlanGeneration();
  const effectiveIsGenerating = globalIsGenerating || isLoading;

  /* Expand 시 generatedImageData 우선 로드 (배경 제거), 없으면 sketchData (원본 유지) */
  useEffect(() => {
    if (node.generatedImageData) {
      sketchCanvasRef.current?.loadImage(node.generatedImageData, true);
    } else if (node.sketchData) {
      sketchCanvasRef.current?.loadImage(node.sketchData, false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.id]);

  useEffect(() => {
    onGeneratingChange?.(isLoading);
  }, [isLoading, onGeneratingChange]);

  /* ── 현재 패널 설정 수집 ───────────────────────────────────────── */
  const collectPlanSettings = useCallback((): PlanPanelSettings => ({
    prompt:     planPrompt,
    floorType:  floorType,
    gridModule: GRID_MODULES[gridModIdx],
  }), [planPrompt, floorType, gridModIdx]);

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

  /* ── [<-] 버튼: 스케치 + 패널 설정 저장 후 collapse ───────────── */
  const handlePlanCollapse = useCallback(() => {
    const sketchBase64    = sketchCanvasRef.current?.exportAsBase64()  ?? '';
    const thumbnailBase64 = sketchCanvasRef.current?.exportThumbnail() ?? '';
    onCollapseWithPlanSketch?.(sketchBase64, thumbnailBase64, collectPlanSettings());
    onCollapse();
  }, [onCollapse, onCollapseWithPlanSketch, collectPlanSettings]);

  /* ESC 키 캡처 */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        handlePlanCollapse();
      }
    };
    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, [handlePlanCollapse]);

  /* ── Generate ───────────────────────────────────────────────────── */
  const handleGenerate = useCallback(async () => {
    if (effectiveIsGenerating) return;
    const canvas = sketchCanvasRef.current;
    if (!canvas) return;

    const sketchBase64    = canvas.exportAsBase64();
    const thumbnailBase64 = canvas.exportThumbnail();
    if (!sketchBase64) return;

    const settings = collectPlanSettings();

    onGeneratingChange?.(true);
    onCollapseWithPlanSketch?.(sketchBase64, thumbnailBase64, settings);
    onCollapse();

    const result = await generate(sketchBase64, {
      userPrompt: settings.prompt,
      floorType:  settings.floorType,
      gridModule: settings.gridModule,
    });

    if (result.image) {
      onGeneratePlanComplete?.({
        sketchBase64,
        thumbnailBase64,
        generatedPlanBase64: result.image,
        roomAnalysis: result.roomAnalysis,
        nodeId: node.id,
      });
    } else {
      onGeneratingChange?.(false);
    }
  }, [
    effectiveIsGenerating, collectPlanSettings, generate,
    onGeneratePlanComplete, onGeneratingChange,
    onCollapseWithPlanSketch, onCollapse, node.id,
  ]);

  /* ── Sketch undo/redo ──────────────────────────────────────────── */
  const sketchUndo = useCallback(() => { sketchCanvasRef.current?.undo(); }, []);
  const sketchRedo = useCallback(() => { sketchCanvasRef.current?.redo(); }, []);

  /* ── Upload image ──────────────────────────────────────────────── */
  const handleUploadImage = useCallback(() => {
    sketchCanvasRef.current?.uploadTrigger();
  }, []);

  /* ── 공통 스타일 ────────────────────────────────────────────────── */
  const sectionLabel: React.CSSProperties = {
    fontFamily: 'var(--font-family-bebas)',
    fontSize: '0.75rem',
    color: 'var(--color-gray-400)',
    letterSpacing: '0.1em',
    display: 'block',
    marginBottom: '0.5rem',
  };

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'var(--color-app-bg)', display: 'flex' }}>

      {/* 스케치 캔버스 */}
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
      <ExpandedSidebar currentNodeType={node.type} onCollapse={handlePlanCollapse}>
        <div style={{
          height: '100%', width: '100%',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Scrollable content */}
          <div style={{
            flex: 1, overflowY: 'auto', overflowX: 'hidden',
            padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem',
            minHeight: 0,
          }}>

            {/* PROMPT */}
            <div>
              <span style={sectionLabel}>Prompt</span>
              <textarea
                value={planPrompt}
                onChange={e => setPlanPrompt(e.target.value)}
                placeholder="건물의 용도, 공간 구성, 특이사항을 설명하세요..."
                maxLength={2000}
                style={{
                  width: '100%', height: '7rem',
                  resize: 'none',
                  borderRadius: '0.75rem',
                  border: '1px solid var(--color-gray-200)',
                  background: 'rgba(255,255,255,0.6)',
                  padding: '0.75rem',
                  fontFamily: 'var(--font-family-pretendard)',
                  fontSize: '0.75rem',
                  color: 'var(--color-black)',
                  outline: 'none',
                  boxSizing: 'border-box',
                  lineHeight: 1.5,
                }}
              />
              <div style={{ textAlign: 'right', fontSize: '0.625rem', color: 'var(--color-gray-300)', marginTop: 2 }}>
                {planPrompt.length} / 2000
              </div>
            </div>

            {/* BUILDING TYPE */}
            <div>
              <span style={sectionLabel}>Building Type</span>
              <select
                value={floorType}
                onChange={e => setFloorType(e.target.value)}
                style={{
                  width: '100%', height: '2.75rem',
                  borderRadius: '0.75rem',
                  border: '1px solid var(--color-gray-200)',
                  background: 'rgba(255,255,255,0.6)',
                  padding: '0 0.75rem',
                  fontFamily: 'var(--font-family-pretendard)',
                  fontSize: '0.8125rem',
                  color: 'var(--color-black)',
                  outline: 'none',
                  cursor: 'pointer',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4L6 8L10 4' stroke='%23999' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.75rem center',
                  paddingRight: '2rem',
                  boxSizing: 'border-box',
                }}
              >
                {FLOOR_TYPES.map(ft => (
                  <option key={ft.value} value={ft.value}>{ft.label}</option>
                ))}
              </select>
            </div>

            {/* GRID MODULE */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={sectionLabel}>Grid Module</span>
                <span style={{
                  fontFamily: 'var(--font-family-bebas)',
                  fontSize: '0.75rem',
                  color: 'var(--color-black)',
                  letterSpacing: '0.08em',
                }}>
                  {formatGridLabel(GRID_MODULES[gridModIdx])}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={GRID_MODULES.length - 1}
                step={1}
                value={gridModIdx}
                onChange={e => setGridModIdx(Number(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: 'var(--color-black)',
                  cursor: 'pointer',
                }}
              />
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                marginTop: '0.375rem',
              }}>
                {GRID_MODULES.map((mm, idx) => (
                  <span key={mm} style={{
                    fontSize: '0.5625rem',
                    color: idx === gridModIdx ? 'var(--color-black)' : 'var(--color-gray-300)',
                    fontFamily: 'var(--font-family-pretendard)',
                    transition: 'color 100ms ease',
                  }}>
                    {formatGridLabel(mm)}
                  </span>
                ))}
              </div>
            </div>

            {/* PARAMETER REPORT */}
            <div>
              <span style={sectionLabel}>Parameter Report</span>
              <div style={{
                borderRadius: '0.75rem',
                border: '1px solid var(--color-gray-200)',
                background: 'rgba(0,0,0,0.02)',
                padding: '0.75rem',
                minHeight: '6rem',
                maxHeight: '14rem',
                overflowY: 'auto',
              }}>
                {node.roomAnalysis ? (
                  <pre style={{
                    margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    fontFamily: 'var(--font-family-pretendard)',
                    fontSize: '0.6875rem',
                    color: 'var(--color-black)',
                    lineHeight: 1.6,
                  }}>
                    {node.roomAnalysis}
                  </pre>
                ) : (
                  <span style={{
                    fontFamily: 'var(--font-family-pretendard)',
                    fontSize: '0.6875rem',
                    color: 'var(--color-gray-300)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '4rem',
                  }}>
                    No report yet.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div style={{
              margin: '0 1rem',
              padding: '0.625rem 0.75rem',
              borderRadius: '0.75rem',
              background: 'rgba(220,38,38,0.08)',
              border: '1px solid rgba(220,38,38,0.2)',
              fontSize: '0.6875rem',
              color: '#dc2626',
              fontFamily: 'var(--font-family-pretendard)',
              lineHeight: 1.4,
            }}>
              {error}
            </div>
          )}

          {/* GENERATE button (fixed at bottom) */}
          <div style={{ padding: '0.75rem 1rem 1rem', flexShrink: 0 }}>
            <button
              onClick={handleGenerate}
              disabled={effectiveIsGenerating}
              style={{
                width: '100%', height: '2.75rem',
                borderRadius: '9999px',
                border: '1px solid var(--color-gray-200)',
                background: effectiveIsGenerating ? 'var(--color-gray-200)' : 'var(--color-black)',
                color: effectiveIsGenerating ? 'var(--color-gray-400)' : 'var(--color-white)',
                fontFamily: 'var(--font-family-bebas)',
                fontSize: '1rem',
                letterSpacing: '0.1em',
                cursor: effectiveIsGenerating ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'opacity 150ms ease, background-color 150ms ease',
              }}
            >
              {effectiveIsGenerating ? (
                <>
                  <IconLoader />
                  <span>GENERATING...</span>
                </>
              ) : (
                'GENERATE'
              )}
            </button>
          </div>

          {/* Footer */}
          <div style={{ paddingBottom: '0.75rem', textAlign: 'center' }}>
            <span style={{ fontSize: '0.5625rem', color: 'var(--color-gray-300)', fontFamily: 'var(--font-family-pretendard)', letterSpacing: '0.04em' }}>
              © CRETE CO.,LTD. 2026
            </span>
          </div>

          <style>{`
            @keyframes spin { to { transform: rotate(360deg); } }
          `}</style>
        </div>
      </ExpandedSidebar>
    </div>
  );
}
