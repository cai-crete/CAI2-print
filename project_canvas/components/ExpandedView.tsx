'use client';

import { useState, useRef, useEffect } from 'react';
import { CanvasNode, NODE_DEFINITIONS, ActiveTool, SketchPanelSettings, PlanPanelSettings, PrintSavedState, PrintSaveResult, SelectedImage } from '@/types/canvas';
import LeftToolbar from '@/components/LeftToolbar';
import ExpandedSidebar from '@/components/ExpandedSidebar';
import SketchToImageExpandedView from '@/sketch-to-image/ExpandedView';
import SketchToPlanExpandedView from '@/sketch-to-plan/ExpandedView';
import { PrintExpandedView } from '@cai-crete/print-components';
import type { PrintToolbarTools, PrintDraftState } from '@cai-crete/print-components';
import type { ReactNode } from 'react';

/* ── Print 프록시 fetch 인터셉터 ───────────────────────────────────
   /api/print-proxy/* 요청/응답을 브라우저 콘솔에 출력.
   컴포넌트 마운트 시 설치, 언마운트 시 원복하여 전역 오염 방지.
─────────────────────────────────────────────────────────────────── */
function usePrintProxyLogger() {
  useEffect(() => {
    const origFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
          ? input.href
          : (input as Request).url;

      if (typeof url === 'string' && url.includes('/api/print-proxy')) {
        const method = (init?.method ?? 'GET').toUpperCase();
        const bodySize =
          init?.body instanceof Blob
            ? `${init.body.size}B`
            : typeof init?.body === 'string'
            ? `${init.body.length}B`
            : init?.body
            ? '(stream)'
            : '-';
        console.log(`[print-proxy] ▶ ${method} ${url}  body=${bodySize}`);
        const t0 = Date.now();
        try {
          const res = await origFetch(input, init);
          const elapsed = Date.now() - t0;
          const resLen = res.headers.get('content-length') ?? '?';
          console.log(`[print-proxy] ◀ ${res.status} ${res.statusText}  (${elapsed}ms, ${resLen}B)`);
          return res;
        } catch (err) {
          console.error(`[print-proxy] ✕ FETCH FAILED (${Date.now() - t0}ms):`, err);
          throw err;
        }
      }
      return origFetch(input, init);
    };
    return () => { window.fetch = origFetch; };
  }, []);
}

interface Props {
  node: CanvasNode;
  onCollapse: () => void;
  onCollapseWithSketch?: (sketchBase64: string, thumbnailBase64: string, panelSettings: SketchPanelSettings) => void;
  onCollapseWithPlanSketch?: (sketchBase64: string, thumbnailBase64: string, planSettings: PlanPanelSettings) => void;
  onGenerateError?: (nodeId: string) => void;
  onAbortControllerReady?: (ctrl: AbortController) => void;
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
  onUploadImage?: () => void;
  onGenerateComplete?: (params: { sketchBase64: string; thumbnailBase64: string; generatedBase64: string; nodeId: string }) => void;
  onGeneratePlanComplete?: (params: { sketchBase64: string; thumbnailBase64: string; generatedPlanBase64: string; roomAnalysis: string; nodeId: string }) => void;
  onGeneratingChange?: (v: boolean) => void;
  isGenerating?: boolean;
  /* Print 전용 */
  printSavedState?: PrintSavedState;
  printInitialAction?: 'generate' | 'library' | 'export' | 'video' | null;
  printDraftState?: PrintDraftState | null;
  selectedImages?: SelectedImage[];
  onPrintSave?: (result: PrintSaveResult) => void;
  onPrintDelete?: () => void;
}

/* ── SketchInfiniteGrid (sketch/blank 아트보드용) ───────────────── */
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
        position: 'absolute', inset: 0, overflow: 'hidden',
        touchAction: 'none', cursor: 'crosshair',
        backgroundColor: 'var(--color-app-bg)',
        backgroundImage: `
          linear-gradient(var(--color-gray-100) 1px, transparent 1px),
          linear-gradient(90deg, var(--color-gray-100) 1px, transparent 1px)
        `,
        backgroundSize: `${gs}px ${gs}px`,
        backgroundPosition: `${gox}px ${goy}px`,
      }}
    >
      <div style={{
        position: 'absolute',
        left: gridOffset.x - 3, top: gridOffset.y - 3,
        width: 6, height: 6, borderRadius: '50%',
        background: 'var(--color-gray-200)', pointerEvents: 'none',
      }} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PrintViewWrapper — Print 전용 뷰 (fetch 인터셉터 포함)
══════════════════════════════════════════════════════════════════ */
interface PrintViewWrapperProps {
  onCollapse: () => void;
  printSavedState?: PrintSavedState;
  printInitialAction?: 'generate' | 'library' | 'export' | 'video' | null;
  printDraftState?: PrintDraftState | null;
  selectedImages?: SelectedImage[];
  onPrintSave?: (result: PrintSaveResult) => void;
  onPrintDelete?: () => void;
}

function PrintViewWrapper({
  onCollapse,
  printSavedState, printInitialAction, printDraftState, selectedImages,
  onPrintSave, onPrintDelete,
}: PrintViewWrapperProps) {
  usePrintProxyLogger();

  const hoverOn  = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = 'var(--color-gray-100)';
    e.currentTarget.style.color = 'var(--color-black)';
  };
  const hoverOff = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = 'transparent';
    e.currentTarget.style.color = 'var(--color-gray-500)';
  };
  const pillBase: React.CSSProperties = {
    background: 'var(--color-white)', borderRadius: 'var(--radius-pill)',
    boxShadow: 'var(--shadow-float)',
  };

  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'var(--color-app-bg)' }}>
      <PrintExpandedView
        selectedImages={selectedImages}
        savedState={printSavedState}
        initialAction={printInitialAction ?? null}
        initialDraftState={printDraftState ?? undefined}
        apiBaseUrl="/api/print-proxy"
        onSave={onPrintSave!}
        onDelete={onPrintDelete}
        renderToolbarWrapper={(tools: PrintToolbarTools) => {
          const btnBase: React.CSSProperties = {
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '2.75rem', height: '2.75rem', border: 'none', background: 'transparent',
            borderRadius: 'var(--radius-pill)', color: 'var(--color-gray-500)',
            cursor: 'pointer', transition: 'background-color 100ms ease', flexShrink: 0,
          };
          const mkBtn = (onClick: () => void, icon: React.ReactNode, title: string, active = false, disabled = false) => (
            <button
              onClick={onClick} disabled={disabled} title={title}
              style={{
                ...btnBase,
                color: disabled ? 'var(--color-gray-300)' : active ? 'var(--color-black)' : 'var(--color-gray-500)',
                backgroundColor: active ? 'var(--color-gray-100)' : 'transparent',
                cursor: disabled ? 'not-allowed' : 'pointer',
              }}
              onPointerEnter={e => { if (e.pointerType !== 'mouse') return; if (!disabled) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-gray-100)'; }}
              onPointerLeave={e => { if (e.pointerType !== 'mouse') return; (e.currentTarget as HTMLButtonElement).style.backgroundColor = active ? 'var(--color-gray-100)' : 'transparent'; }}
              onPointerDown={e => { if (e.pointerType !== 'mouse') return; if (!disabled) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-gray-200)'; }}
              onPointerUp={e => { if (e.pointerType !== 'mouse') return; if (!disabled) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-gray-100)'; }}
            >
              <span className="icon-frame">{icon}</span>
            </button>
          );

          return (
          <div style={{
            position: 'absolute', left: '1rem', top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: '0.5rem', zIndex: 90,
          }}>
            {/* 상단 CTA: New Project */}
            <div style={{ position: 'absolute', bottom: 'calc(100% + 0.75rem)', left: '50%', transform: 'translateX(-50%)' }}>
              <button
                onClick={tools.onNewProject}
                title="NEW PROJECT"
                style={{
                  width: '3.5rem', height: '3.5rem', background: 'var(--color-black)', color: 'var(--color-white)',
                  border: 'none', borderRadius: 'var(--radius-pill)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: 'var(--shadow-float)', cursor: 'pointer', transition: 'opacity 120ms ease, transform 120ms ease',
                }}
                onPointerEnter={e => { if (e.pointerType !== 'mouse') return; (e.currentTarget as HTMLButtonElement).style.opacity = '0.8'; (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)'; }}
                onPointerLeave={e => { if (e.pointerType !== 'mouse') return; (e.currentTarget as HTMLButtonElement).style.opacity = '1'; (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                onPointerDown={e => { if (e.pointerType !== 'mouse') return; (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.96)'; }}
                onPointerUp={e => { if (e.pointerType !== 'mouse') return; (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)'; }}
              >
                <span style={{ width: 24, height: 24, display: 'flex' }}>
                  <svg viewBox="0 0 20 20" stroke="currentColor" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3V17M3 10H17" /></svg>
                </span>
              </button>
            </div>

            {/* Pill 묶음: cursor/handle / undo/redo / library / zoom */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: '2px', background: 'var(--color-white)',
              borderRadius: 'var(--radius-pill)', padding: '6px',
              boxShadow: 'var(--shadow-float)',
            }}>
              {/* cursor / handle 도구 선택 */}
              {mkBtn(
                () => tools.onToolChange('cursor'),
                <svg viewBox="0 0 20 20" fill="currentColor"><path d="M4 2.5 L4 15 L7.2 11.8 L9.8 17 L12.2 16 L9.6 10.8 H14.5 Z" strokeLinejoin="round" /></svg>,
                '선택 (V)',
                tools.activeTool === 'cursor',
              )}
              {mkBtn(
                () => tools.onToolChange('handle'),
                <svg viewBox="0 0 20 20" stroke="currentColor" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 9V3.5A1.5 1.5 0 0 1 12.5 3.5V9" /><path d="M9.5 4A1.5 1.5 0 0 0 6.5 4V9" /><path d="M12.5 5A1.5 1.5 0 0 1 15.5 5V12A6 6 0 0 1 9.5 18H9A6 6 0 0 1 3.5 12V9A1.5 1.5 0 0 1 6.5 9" /></svg>,
                '이동 (H)',
                tools.activeTool === 'handle',
              )}

              <div style={{ width: 'calc(100% - 12px)', height: 1, background: 'var(--color-gray-100)', margin: '2px 6px' }} />

              {mkBtn(tools.onUndo, <svg viewBox="0 0 20 20" stroke="currentColor" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M7.5 12.5L2.5 7.5L7.5 2.5" /><path d="M2.5 7.5H12.5A5 5 0 0 1 12.5 17.5H10" /></svg>, 'Undo', false, !tools.canUndo)}
              {mkBtn(tools.onRedo, <svg viewBox="0 0 20 20" stroke="currentColor" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12.5 12.5L17.5 7.5L12.5 2.5" /><path d="M17.5 7.5H7.5A5 5 0 0 0 7.5 17.5H10" /></svg>, 'Redo', false, !tools.canRedo)}

              <div style={{ width: 'calc(100% - 12px)', height: 1, background: 'var(--color-gray-100)', margin: '2px 6px' }} />

              {mkBtn(tools.onOpenLibrary, <svg viewBox="0 0 20 20" stroke="currentColor" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="16" height="12" rx="2" /><circle cx="7" cy="8.5" r="1.5" /><polyline points="2,14 6,10 9,13 12,10 18,15" /></svg>, 'Library')}

              <div style={{ width: 'calc(100% - 12px)', height: 1, background: 'var(--color-gray-100)', margin: '2px 6px' }} />

              {mkBtn(tools.onZoomIn, <svg viewBox="0 0 20 20" stroke="currentColor" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3V17M3 10H17" /></svg>, '확대 (+')}
              <button
                onClick={tools.onZoomReset}
                title="줌 초기화 (더블클릭)"
                style={{
                  ...btnBase, fontFamily: 'var(--font-family-pretendard)', fontSize: '0.7rem', fontWeight: 600,
                  color: 'var(--color-gray-500)', height: '1.75rem', letterSpacing: 0,
                }}
                onPointerEnter={e => { if (e.pointerType !== 'mouse') return; e.currentTarget.style.backgroundColor = 'var(--color-gray-100)'; }}
                onPointerLeave={e => { if (e.pointerType !== 'mouse') return; e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                {Math.round((tools.zoom ?? 1) * 100)}%
              </button>
              {mkBtn(tools.onZoomOut, <svg viewBox="0 0 20 20" stroke="currentColor" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10H17" /></svg>, '축소 (-)')}
            </div>

            {/* 하단 분리된 원형 버튼: save */}
            <div style={{ marginTop: '0.5rem' }}>
              <button
                onClick={tools.onSave}
                title="SAVE"
                style={{
                  width: '3.75rem', height: '3.75rem', borderRadius: '50%', background: 'var(--color-white)', color: 'var(--color-black)',
                  border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: 'var(--shadow-float)', cursor: 'pointer', transition: 'opacity 120ms ease',
                }}
                onPointerEnter={e => { if (e.pointerType !== 'mouse') return; (e.currentTarget as HTMLButtonElement).style.opacity = '0.8'; }}
                onPointerLeave={e => { if (e.pointerType !== 'mouse') return; (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
              >
                <span className="icon-frame">
                  <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                </span>
              </button>
            </div>
          </div>
          );
        }}
        renderSidebarWrapper={(printPanels: ReactNode) => (
          <div style={{
            position: 'absolute', right: '1rem', top: '1rem', bottom: '1rem',
            width: 'var(--sidebar-w)', display: 'flex', flexDirection: 'column',
            gap: '0.5rem', zIndex: 90,
          }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch', flexShrink: 0 }}>
              <div style={{ ...pillBase, width: 'var(--h-cta-lg)', height: 'var(--h-cta-lg)', flexShrink: 0 }}>
                <button
                  onClick={onCollapse}
                  title="캔버스로 돌아가기"
                  style={{
                    width: '100%', height: '100%', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', border: 'none', background: 'transparent',
                    cursor: 'pointer', borderRadius: 'var(--radius-pill)',
                    color: 'var(--color-gray-500)', transition: 'background-color 100ms ease, color 100ms ease',
                  }}
                  onMouseEnter={hoverOn}
                  onMouseLeave={hoverOff}
                >
                  <span style={{ width: 20, height: 20, display: 'flex' }}><IconCollapse /></span>
                </button>
              </div>
              <div style={{ ...pillBase, flex: 1, display: 'flex', alignItems: 'center', padding: '0 1rem' }}>
                <span className="text-title" style={{ color: 'var(--color-black)', letterSpacing: '0.04em' }}>
                  PRINT
                </span>
              </div>
            </div>
            <div style={{
              background: 'var(--color-white)', borderRadius: 'var(--radius-box)',
              boxShadow: 'var(--shadow-float)', flex: 1, minHeight: 0,
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}>
              <div style={{
                flex: 1, overflowY: 'auto', padding: '1.25rem',
                display: 'flex', flexDirection: 'column',
              }}>
                {printPanels}
              </div>
            </div>
          </div>
        )}
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   ExpandedView — 라우터: 노드 유형별 전용 뷰로 위임
══════════════════════════════════════════════════════════════════ */
const IC = { stroke: 'currentColor', fill: 'none', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const IconCollapse = () => <svg viewBox="0 0 20 20" {...IC}><path d="M16 10H4M9 5L4 10L9 15" /></svg>;

export default function ExpandedView({
  node, onCollapse, onCollapseWithSketch, onCollapseWithPlanSketch, onGenerateError, onAbortControllerReady,
  activeTool, scale, canUndo, canRedo,
  onToolChange, onUndo, onRedo, onZoomIn, onZoomOut, onZoomReset,
  onAddArtboard, onGenerateComplete, onGeneratePlanComplete, onGeneratingChange,
  isGenerating = false,
  printSavedState, printInitialAction, printDraftState, selectedImages,
  onPrintSave, onPrintDelete,
}: Props) {
  const def = NODE_DEFINITIONS[node.type];
  const isSketchImageMode = node.artboardType === 'sketch' && node.type === 'image';
  const isSketchPlanMode  = node.artboardType === 'sketch' && node.type === 'plan';
  const isSketchMode      = node.artboardType === 'sketch' || node.artboardType === 'blank';

  /* ── Print 전용 뷰 ──────────────────────────────────────────────── */
  if (node.type === 'print') {
    return (
      <PrintViewWrapper
        onCollapse={onCollapse}
        printSavedState={printSavedState}
        printInitialAction={printInitialAction}
        printDraftState={printDraftState}
        selectedImages={selectedImages}
        onPrintSave={onPrintSave}
        onPrintDelete={onPrintDelete}
      />
    );
  }

  /* ── sketch-to-image 전용 뷰 ────────────────────────────────────── */
  if (isSketchImageMode) {
    return (
      <SketchToImageExpandedView
        node={node}
        onCollapse={onCollapse}
        onCollapseWithSketch={onCollapseWithSketch}
        onGenerateError={onGenerateError}
        onAbortControllerReady={onAbortControllerReady}
        onGenerateComplete={onGenerateComplete}
        onGeneratingChange={onGeneratingChange}
        isGenerating={isGenerating}
      />
    );
  }

  /* ── sketch-to-plan 전용 뷰 ─────────────────────────────────────── */
  if (isSketchPlanMode) {
    return (
      <SketchToPlanExpandedView
        node={node}
        onCollapse={onCollapse}
        onCollapseWithPlanSketch={onCollapseWithPlanSketch}
        onGeneratePlanComplete={onGeneratePlanComplete}
        onGeneratingChange={onGeneratingChange}
        isGenerating={isGenerating}
      />
    );
  }

  /* ── 기존 레이아웃 (sketch/blank 아트보드, image 외 노드) ───────── */
  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'var(--color-app-bg)' }}>

      {isSketchMode ? (
        <SketchInfiniteGrid />
      ) : (
        <div style={{
          position: 'absolute', inset: 0,
          left: 'calc(4rem + 1.5rem)',
          right: 'calc(var(--sidebar-w) + 2rem)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: '1.5rem', padding: '2rem',
        }}>
          <div style={{
            width: '100%', maxWidth: 800,
            aspectRatio: '297 / 210',
            background: 'var(--color-white)',
            borderRadius: 'var(--radius-box)',
            boxShadow: 'var(--shadow-float)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
          }}>
            <span className="text-title" style={{ fontSize: '1.25rem', color: 'var(--color-gray-300)', letterSpacing: '0.08em' }}>
              {def.displayLabel}
            </span>
            <span style={{ display: 'block', width: 48, height: 1, background: 'var(--color-gray-200)' }} />
            <span className="text-body-3" style={{ color: 'var(--color-gray-400)' }}>{node.title}</span>
            <span className="text-caption" style={{ color: 'var(--color-gray-300)', marginTop: 4 }}>
              API 연동 후 작업 화면이 표시됩니다.
            </span>
          </div>
        </div>
      )}

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

      <ExpandedSidebar currentNodeType={node.type} onCollapse={onCollapse} />
    </div>
  );
}
