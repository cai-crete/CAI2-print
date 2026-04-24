'use client';

import {
  useState, useRef, useEffect, useCallback,
  useImperativeHandle, forwardRef,
} from 'react';
import { InfiniteGrid } from '@/components/InfiniteGrid';

/* ── Types ──────────────────────────────────────────────────────── */
export type SketchTool = 'cursor' | 'pan' | 'pen' | 'eraser' | 'text';

interface Point { x: number; y: number }

interface Path {
  tool: 'pen' | 'eraser';
  points: Point[];
  strokeWidth: number;
  color: string;
}

interface TextItem {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
}

type HistoryEntry = {
  paths: Path[];
  uploadedImageData: string | null;
};

export interface SketchCanvasHandle {
  exportAsBase64: () => string;
  exportThumbnail: () => string;
  uploadTrigger: () => void;
  clearAll: () => void;
  loadImage: (base64: string) => void;
  undo: () => void;
  redo: () => void;
}

interface Props {
  activeTool: SketchTool;
  penStrokeWidth: number;
  eraserStrokeWidth: number;
  onUndoAvailable?: (v: boolean) => void;
  onRedoAvailable?: (v: boolean) => void;
  internalZoom: number;
  internalOffset: { x: number; y: number };
  onInternalZoomChange: (z: number) => void;
  onInternalOffsetChange: (o: { x: number; y: number }) => void;
}

/* ── Stroke widths ──────────────────────────────────────────────── */
export const PEN_STROKE_WIDTHS    = [0.5, 1, 2, 4, 6];
export const ERASER_STROKE_WIDTHS = [10, 15, 20, 25, 30];
export const DOT_VISUAL_SIZES     = [2, 4, 6, 8, 10];

/* ── White background removal ───────────────────────────────────── */
function removeWhiteBackground(dataUrl: string, threshold = 220): Promise<string> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height);
      for (let i = 0; i < d.data.length; i += 4) {
        if (d.data[i] >= threshold && d.data[i + 1] >= threshold && d.data[i + 2] >= threshold) {
          d.data[i + 3] = 0;
        }
      }
      ctx.putImageData(d, 0, 0);
      resolve(c.toDataURL('image/png'));
    };
    img.src = dataUrl;
  });
}

/* ── Drawing layer renderer (offscreen) ─────────────────────────── */
function renderDrawingLayer(
  paths: Path[],
  width: number, height: number,
  ox: number, oy: number, zs: number,
): HTMLCanvasElement {
  const off = document.createElement('canvas');
  off.width = width; off.height = height;
  const dCtx = off.getContext('2d')!;
  dCtx.save();
  dCtx.translate(ox, oy);
  dCtx.scale(zs, zs);
  for (const path of paths) {
    if (!path?.points || path.points.length < 2) continue;
    dCtx.beginPath();
    dCtx.moveTo(path.points[0].x, path.points[0].y);
    for (let i = 1; i < path.points.length; i++) {
      dCtx.lineTo(path.points[i].x, path.points[i].y);
    }
    if (path.tool === 'eraser') {
      dCtx.globalCompositeOperation = 'destination-out';
      dCtx.strokeStyle = 'rgba(0,0,0,1)';
      dCtx.lineWidth   = path.strokeWidth;
    } else {
      dCtx.globalCompositeOperation = 'source-over';
      dCtx.strokeStyle = path.color;
      dCtx.lineWidth   = path.strokeWidth;
    }
    dCtx.lineCap  = 'round';
    dCtx.lineJoin = 'round';
    dCtx.stroke();
    dCtx.globalCompositeOperation = 'source-over';
  }
  dCtx.restore();
  return off;
}

/* ── SketchCanvas ───────────────────────────────────────────────── */
const SketchCanvas = forwardRef<SketchCanvasHandle, Props>(function SketchCanvas(
  {
    activeTool,
    penStrokeWidth, eraserStrokeWidth,
    onUndoAvailable, onRedoAvailable,
    internalZoom, internalOffset,
    onInternalZoomChange, onInternalOffsetChange,
  },
  ref
) {
  const canvasRef       = useRef<HTMLCanvasElement>(null);
  const containerRef    = useRef<HTMLDivElement>(null);
  const fileInputRef    = useRef<HTMLInputElement>(null);

  /* ── Drawing state ─────────────────────────────────────────────── */
  const [paths,             setPaths]             = useState<Path[]>([]);
  const [uploadedImageData, setUploadedImageData] = useState<string | null>(null);
  const [textItems,         setTextItems]         = useState<TextItem[]>([]);
  const [editingTextId,     setEditingTextId]     = useState<string | null>(null);
  const [textDragRect,      setTextDragRect]      = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  /* ── History ────────────────────────────────────────────────────── */
  const undoStack = useRef<HistoryEntry[]>([{ paths: [], uploadedImageData: null }]);
  const redoStack = useRef<HistoryEntry[]>([]);

  const notifyHistory = useCallback(() => {
    onUndoAvailable?.(undoStack.current.length > 1);
    onRedoAvailable?.(redoStack.current.length > 0);
  }, [onUndoAvailable, onRedoAvailable]);

  const pushSnapshot = useCallback((nextPaths: Path[], nextImage: string | null) => {
    undoStack.current.push({ paths: nextPaths, uploadedImageData: nextImage });
    redoStack.current = [];
    notifyHistory();
  }, [notifyHistory]);

  const handleUndo = useCallback(() => {
    if (undoStack.current.length <= 1) return;
    const current = undoStack.current.pop()!;
    redoStack.current.push(current);
    const prev = undoStack.current[undoStack.current.length - 1];
    setPaths(prev.paths);
    setUploadedImageData(prev.uploadedImageData);
    notifyHistory();
  }, [notifyHistory]);

  const handleRedo = useCallback(() => {
    if (redoStack.current.length === 0) return;
    const next = redoStack.current.pop()!;
    undoStack.current.push(next);
    setPaths(next.paths);
    setUploadedImageData(next.uploadedImageData);
    notifyHistory();
  }, [notifyHistory]);

  /* ── Custom cursor ─────────────────────────────────────────────── */
  const [cursorPos,   setCursorPos]   = useState({ x: -200, y: -200 });
  const [showCursor,  setShowCursor]  = useState(false);

  /* ── Drawing refs ──────────────────────────────────────────────── */
  const isDrawing      = useRef(false);
  const currentPath    = useRef<Path | null>(null);
  const pathsRef       = useRef<Path[]>([]);
  const uploadImgRef   = useRef<string | null>(null);
  useEffect(() => { pathsRef.current      = paths; },             [paths]);
  useEffect(() => { uploadImgRef.current  = uploadedImageData; }, [uploadedImageData]);

  /* ── Uploaded image element (for zoom-aware canvas rendering) ───── */
  const uploadedImgElRef = useRef<HTMLImageElement | null>(null);
  const [imgVersion, setImgVersion] = useState(0);
  useEffect(() => {
    if (!uploadedImageData) {
      uploadedImgElRef.current = null;
      setImgVersion(v => v + 1);
      return;
    }
    const img = new Image();
    img.onload = () => { uploadedImgElRef.current = img; setImgVersion(v => v + 1); };
    /* BUG-1 fix: normalize src — raw base64 needs the data: prefix */
    img.src = uploadedImageData.startsWith('data:')
      ? uploadedImageData
      : `data:image/png;base64,${uploadedImageData}`;
  }, [uploadedImageData]);

  /* ── Zoom / offset ref (stale closure 방지) ────────────────────── */
  const internalZoomRef   = useRef(internalZoom);
  const internalOffsetRef = useRef(internalOffset);
  useEffect(() => { internalZoomRef.current   = internalZoom;   }, [internalZoom]);
  useEffect(() => { internalOffsetRef.current = internalOffset; }, [internalOffset]);

  /* ── 패닝 offset clamp 헬퍼 ─────────────────────────────────────── */
  const clampOffset = useCallback((ox: number, oy: number, zs: number): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: ox, y: oy };
    const maxX = canvas.width  / 2 * (zs - 1);
    const maxY = canvas.height / 2 * (zs - 1);
    return {
      x: Math.max(-maxX, Math.min(maxX, ox)),
      y: Math.max(-maxY, Math.min(maxY, oy)),
    };
  }, []);

  /* ── Pan state ──────────────────────────────────────────────────── */
  const isPanning     = useRef(false);
  const panStart      = useRef<Point>({ x: 0, y: 0 });
  const panOffsetSnap = useRef<Point>({ x: 0, y: 0 });

  /* ── Pinch zoom state ───────────────────────────────────────────── */
  const pointerPositions = useRef(new Map<number, Point>());
  const lastPinchDist    = useRef(0);

  /* ── Pen/stylus priority (palm rejection) ───────────────────────── */
  const penActiveRef = useRef(false);

  /* ── Text drag state ────────────────────────────────────────────── */
  const textDragStart  = useRef<Point | null>(null);
  const textWasDragged = useRef(false);

  /* ── Canvas rendering ───────────────────────────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const zs = internalZoom / 100;
    const ox = internalOffset.x + canvas.width  / 2;
    const oy = internalOffset.y + canvas.height / 2;

    /* Layer 1: 업로드 이미지 (eraser 영향 없음) */
    const imgEl = uploadedImgElRef.current;
    if (imgEl) {
      const iW = imgEl.naturalWidth;
      const iH = imgEl.naturalHeight;
      const imgScale = Math.min(canvas.width / iW, canvas.height / iH);
      const dw = iW * imgScale;
      const dh = iH * imgScale;
      ctx.save();
      ctx.translate(ox, oy);
      ctx.scale(zs, zs);
      ctx.drawImage(imgEl, -dw / 2, -dh / 2, dw, dh);
      ctx.restore();
    }

    /* Layer 2: drawing layer (eraser는 이 레이어만 지움) */
    ctx.drawImage(renderDrawingLayer(paths, canvas.width, canvas.height, ox, oy, zs), 0, 0);
  }, [paths, internalZoom, internalOffset, imgVersion]);

  /* ── Canvas resize observer ────────────────────────────────────── */
  useEffect(() => {
    const container = containerRef.current;
    const canvas    = canvasRef.current;
    if (!container || !canvas) return;

    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        canvas.width  = width;
        canvas.height = height;
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  /* ── World ↔ Screen coords ─────────────────────────────────────── */
  const toWorld = useCallback((clientX: number, clientY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    const zs = internalZoom / 100;
    const ox = internalOffset.x + canvas.width  / 2;
    const oy = internalOffset.y + canvas.height / 2;
    return { x: (sx - ox) / zs, y: (sy - oy) / zs };
  }, [internalZoom, internalOffset]);

  /* ── Pointer handlers ───────────────────────────────────────────── */
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    /* Palm rejection: pen이 활성 중이면 touch(palm) 무시 */
    if (e.pointerType === 'touch' && penActiveRef.current) return;

    /* 가운데 버튼 패닝 */
    if (e.button === 1) {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      isPanning.current     = true;
      panStart.current      = { x: e.clientX, y: e.clientY };
      panOffsetSnap.current = { ...internalOffsetRef.current };
      return;
    }

    if (e.button !== 0) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    if (e.pointerType === 'pen') {
      penActiveRef.current = true;
    } else if (e.pointerType === 'touch') {
      pointerPositions.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointerPositions.current.size >= 2) {
        /* 두 손가락: 핀치 줌으로 전환 */
        isPanning.current = false;
        isDrawing.current = false;
        currentPath.current = null;
        const pts = [...pointerPositions.current.values()];
        lastPinchDist.current = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      } else {
        /* 한 손가락: 항상 패닝 */
        isPanning.current     = true;
        panStart.current      = { x: e.clientX, y: e.clientY };
        panOffsetSnap.current = { ...internalOffsetRef.current };
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect  = canvas.getBoundingClientRect();
    const sx    = e.clientX - rect.left;
    const sy    = e.clientY - rect.top;

    if (activeTool === 'pan') {
      isPanning.current     = true;
      panStart.current      = { x: e.clientX, y: e.clientY };
      panOffsetSnap.current = { ...internalOffsetRef.current };
      return;
    }

    if (activeTool === 'text') {
      if (editingTextId !== null) {
        setTextItems(prev => prev.filter(t => t.text.trim() !== '' || t.id !== editingTextId));
        setEditingTextId(null);
        return;
      }
      const zs = internalZoom / 100;
      const ox = internalOffsetRef.current.x + canvas.width / 2;
      const oy = internalOffsetRef.current.y + canvas.height / 2;
      const wx = (sx - ox) / zs;
      const wy = (sy - oy) / zs;
      const hit = textItems.find(t => wx >= t.x && wx <= t.x + t.width && wy >= t.y && wy <= t.y + t.height);
      if (hit) {
        setEditingTextId(hit.id);
        return;
      }
      textDragStart.current  = { x: sx, y: sy };
      textWasDragged.current = false;
      return;
    }

    if (activeTool === 'pen' || activeTool === 'eraser') {
      isDrawing.current = true;
      const wp = toWorld(e.clientX, e.clientY);
      const newPath: Path = {
        tool: activeTool,
        points: [wp],
        strokeWidth: activeTool === 'pen' ? penStrokeWidth : eraserStrokeWidth,
        color: '#000000',
      };
      currentPath.current = newPath;
    }
  }, [activeTool, editingTextId, textItems, internalZoom, toWorld, penStrokeWidth, eraserStrokeWidth]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    /* Palm rejection */
    if (e.pointerType === 'touch' && penActiveRef.current) return;

    if (e.pointerType === 'touch') {
      pointerPositions.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointerPositions.current.size >= 2) {
        /* 핀치 줌 */
        const pts = [...pointerPositions.current.values()];
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (lastPinchDist.current > 0) {
          const ratio = dist / lastPinchDist.current;
          const next  = Math.max(100, Math.min(400, internalZoomRef.current * ratio));
          onInternalZoomChange(Math.round(next));
        }
        lastPinchDist.current = dist;
        return;
      }
      /* 단일 터치: 아래 isPanning 블록에서 처리 */
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx   = e.clientX - rect.left;
    const sy   = e.clientY - rect.top;

    setCursorPos({ x: sx, y: sy });

    /* 통합 패닝 (tool pan / middle button / 단일 터치) */
    if (isPanning.current) {
      const rawX = panOffsetSnap.current.x + (e.clientX - panStart.current.x);
      const rawY = panOffsetSnap.current.y + (e.clientY - panStart.current.y);
      onInternalOffsetChange(clampOffset(rawX, rawY, internalZoomRef.current / 100));
      return;
    }

    /* touch는 패닝만 — drawing 코드로 진입 안 함 */
    if (e.pointerType === 'touch') return;

    if (activeTool === 'text' && textDragStart.current) {
      const dx = sx - textDragStart.current.x;
      const dy = sy - textDragStart.current.y;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        textWasDragged.current = true;
        const x = Math.min(textDragStart.current.x, sx);
        const y = Math.min(textDragStart.current.y, sy);
        setTextDragRect({ x, y, w: Math.abs(dx), h: Math.abs(dy) });
      }
      return;
    }

    if ((activeTool === 'pen' || activeTool === 'eraser') && isDrawing.current && currentPath.current) {
      const wp = toWorld(e.clientX, e.clientY);
      currentPath.current.points.push(wp);
      const captured = currentPath.current;
      setPaths(prev => {
        const withoutCurrent = prev.filter(p => p !== captured);
        return [...withoutCurrent, { ...captured, points: [...captured.points] }];
      });
    }
  }, [activeTool, toWorld, onInternalOffsetChange, onInternalZoomChange, clampOffset]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    /* 가운데 버튼 릴리즈 */
    if (e.button === 1) {
      isPanning.current = false;
      return;
    }

    if (e.pointerType === 'pen') {
      penActiveRef.current = false;
    } else if (e.pointerType === 'touch') {
      pointerPositions.current.delete(e.pointerId);
      if (pointerPositions.current.size < 2) {
        lastPinchDist.current = 0;
        isPanning.current = false;
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx   = e.clientX - rect.left;
    const sy   = e.clientY - rect.top;

    if (activeTool === 'pan') {
      isPanning.current = false;
      return;
    }

    if (activeTool === 'text' && textDragStart.current) {
      const zs  = internalZoom / 100;
      const ox  = internalOffset.x + canvas.width  / 2;
      const oy  = internalOffset.y + canvas.height / 2;

      let newItem: TextItem;
      if (textWasDragged.current && textDragRect) {
        const wx = (textDragRect.x - ox) / zs;
        const wy = (textDragRect.y - oy) / zs;
        newItem = {
          id: Math.random().toString(36).slice(2),
          x: wx, y: wy,
          width:  Math.max(120, textDragRect.w / zs),
          height: Math.max(32,  textDragRect.h / zs),
          text: '',
        };
      } else {
        const wx = (sx - ox) / zs;
        const wy = (sy - oy) / zs;
        newItem = {
          id: Math.random().toString(36).slice(2),
          x: wx - 100, y: wy - 20,
          width: 200, height: 40, text: '',
        };
      }
      setTextItems(prev => [...prev, newItem]);
      setEditingTextId(newItem.id);
      textDragStart.current  = null;
      textWasDragged.current = false;
      setTextDragRect(null);
      return;
    }

    if ((activeTool === 'pen' || activeTool === 'eraser') && isDrawing.current && currentPath.current) {
      isDrawing.current = false;
      const finalPaths = pathsRef.current;
      pushSnapshot(finalPaths, uploadImgRef.current);
      currentPath.current = null;
    }
  }, [activeTool, internalZoom, internalOffset, textDragRect, pushSnapshot]);

  /* ── Wheel zoom + middle button default prevention ─────────────── */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;

      const prevZoom = internalZoomRef.current;
      const prevZs   = prevZoom / 100;
      const delta    = e.deltaY < 0 ? 1.1 : 0.9;
      const nextZoom = Math.max(100, Math.min(400, prevZoom * delta));
      const nextZs   = nextZoom / 100;

      const rect  = canvas.getBoundingClientRect();
      const px    = e.clientX - rect.left;
      const py    = e.clientY - rect.top;
      const prevOx = internalOffsetRef.current.x + canvas.width  / 2;
      const prevOy = internalOffsetRef.current.y + canvas.height / 2;
      const wx    = (px - prevOx) / prevZs;
      const wy    = (py - prevOy) / prevZs;

      const rawX  = px - wx * nextZs - canvas.width  / 2;
      const rawY  = py - wy * nextZs - canvas.height / 2;

      onInternalZoomChange(Math.round(nextZoom));
      onInternalOffsetChange(clampOffset(rawX, rawY, nextZs));
    };

    /* 가운데 버튼 auto-scroll 방지 */
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 1) e.preventDefault();
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('mousedown', onMouseDown);
    return () => {
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('mousedown', onMouseDown);
    };
  }, [onInternalZoomChange, onInternalOffsetChange, clampOffset]);

  /* ── exportThumbnail: 항상 100% zoom/offset={0,0}으로 export ────── */
  const exportThumbnail = useCallback((): string => {
    const canvas = canvasRef.current;
    if (!canvas) return '';

    const offscreen = document.createElement('canvas');
    offscreen.width  = canvas.width;
    offscreen.height = canvas.height;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return '';

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, offscreen.width, offscreen.height);

    const expZs = 1;
    const expOx = canvas.width  / 2;
    const expOy = canvas.height / 2;

    const imgEl = uploadedImgElRef.current;
    if (imgEl) {
      const iW = imgEl.naturalWidth;
      const iH = imgEl.naturalHeight;
      const imgScale = Math.min(canvas.width / iW, canvas.height / iH);
      const dw = iW * imgScale;
      const dh = iH * imgScale;
      ctx.save();
      ctx.translate(expOx, expOy);
      ctx.scale(expZs, expZs);
      ctx.drawImage(imgEl, -dw / 2, -dh / 2, dw, dh);
      ctx.restore();
    }

    ctx.drawImage(
      renderDrawingLayer(pathsRef.current, canvas.width, canvas.height, expOx, expOy, expZs),
      0, 0,
    );

    ctx.save();
    ctx.translate(expOx, expOy);
    ctx.scale(expZs, expZs);
    ctx.font         = '14px sans-serif';
    ctx.fillStyle    = '#000000';
    ctx.textBaseline = 'top';
    for (const item of textItems) {
      if (item.text.trim()) ctx.fillText(item.text, item.x + 8, item.y + 8);
    }
    ctx.restore();

    return offscreen.toDataURL('image/png').split(',')[1];
  }, [textItems]);

  /* ── exportAsBase64 ─────────────────────────────────────────────── */
  const exportAsBase64 = useCallback((): string => {
    const canvas = canvasRef.current;
    if (!canvas) return '';

    if (editingTextId !== null) {
      setTextItems(prev => prev.filter(t => t.text.trim() !== '' || t.id !== editingTextId));
      setEditingTextId(null);
    }

    const offscreen = document.createElement('canvas');
    offscreen.width  = canvas.width;
    offscreen.height = canvas.height;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return '';

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, offscreen.width, offscreen.height);

    const expZs = internalZoom / 100;
    const expOx = internalOffset.x + canvas.width  / 2;
    const expOy = internalOffset.y + canvas.height / 2;

    /* Layer 1: 업로드 이미지 */
    const imgEl = uploadedImgElRef.current;
    if (imgEl) {
      const iW = imgEl.naturalWidth;
      const iH = imgEl.naturalHeight;
      const imgScale = Math.min(canvas.width / iW, canvas.height / iH);
      const dw = iW * imgScale;
      const dh = iH * imgScale;
      ctx.save();
      ctx.translate(expOx, expOy);
      ctx.scale(expZs, expZs);
      ctx.drawImage(imgEl, -dw / 2, -dh / 2, dw, dh);
      ctx.restore();
    }

    /* Layer 2: drawing layer (eraser isolation) */
    ctx.drawImage(
      renderDrawingLayer(pathsRef.current, canvas.width, canvas.height, expOx, expOy, expZs),
      0, 0,
    );

    /* Layer 3: text items */
    const zs = internalZoom / 100;
    const ox = internalOffset.x + canvas.width  / 2;
    const oy = internalOffset.y + canvas.height / 2;
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(zs, zs);
    ctx.font         = '14px sans-serif';
    ctx.fillStyle    = '#000000';
    ctx.textBaseline = 'top';
    for (const item of textItems) {
      if (item.text.trim()) {
        ctx.fillText(item.text, item.x + 8, item.y + 8);
      }
    }
    ctx.restore();

    return offscreen.toDataURL('image/png').split(',')[1];
  }, [editingTextId, textItems, internalZoom, internalOffset]);

  /* ── File upload (흰색 배경 제거 + undo 포함) ─────────────────── */
  const handleUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const raw = ev.target?.result as string;
      const base64 = await removeWhiteBackground(raw);
      /* push snapshot with NEW image so undo/redo includes it */
      pushSnapshot(pathsRef.current, base64);
      setUploadedImageData(base64);
    };
    reader.readAsDataURL(file);
  }, [pushSnapshot]);

  /* ── Imperative handle ──────────────────────────────────────────── */
  useImperativeHandle(ref, () => ({
    exportAsBase64,
    exportThumbnail,
    uploadTrigger: () => fileInputRef.current?.click(),
    clearAll: () => {
      setPaths([]);
      setUploadedImageData(null);
      setTextItems([]);
      undoStack.current = [{ paths: [], uploadedImageData: null }];
      redoStack.current = [];
      notifyHistory();
    },
    loadImage: (base64: string) => {
      setPaths([]);
      setTextItems([]);
      const dataUrl = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
      removeWhiteBackground(dataUrl).then(processed => {
        setUploadedImageData(processed);
        undoStack.current = [{ paths: [], uploadedImageData: processed }];
        redoStack.current = [];
        notifyHistory();
      });
    },
    undo: handleUndo,
    redo: handleRedo,
  }), [exportAsBase64, exportThumbnail, notifyHistory, handleUndo, handleRedo]);

  /* ── Cursor style per tool ──────────────────────────────────────── */
  const canvasCursorStyle = (): string => {
    if (activeTool === 'pen' || activeTool === 'eraser') return 'none';
    if (activeTool === 'text') return 'text';
    if (activeTool === 'pan')  return 'grab';
    return 'default';
  };

  const dotDiameter = activeTool === 'pen'
    ? penStrokeWidth * 2
    : eraserStrokeWidth;
  const zs = internalZoom / 100;

  const canvas = canvasRef.current;
  const cw = canvas?.width  ?? 0;
  const ch = canvas?.height ?? 0;
  const ox = internalOffset.x + cw / 2;
  const oy = internalOffset.y + ch / 2;

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: 'var(--color-app-bg)' }}
    >
      {/* z=1 Grid */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <InfiniteGrid zoom={internalZoom} offset={internalOffset} />
      </div>

      {/* z=3 드로잉 캔버스 */}
      <canvas
        ref={canvasRef}
        draggable={false}
        style={{
          position: 'absolute', inset: 0, zIndex: 3,
          cursor: canvasCursorStyle(), touchAction: 'none',
          userSelect: 'none', WebkitUserSelect: 'none',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDragStart={e => e.preventDefault()}
        onMouseEnter={() => setShowCursor(true)}
        onMouseLeave={() => setShowCursor(false)}
      />

      {/* z=4 Text items overlay */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none' }}>
        {textItems.map(item => {
          const screenX = item.x * zs + ox;
          const screenY = item.y * zs + oy;
          const isEditing = editingTextId === item.id;
          return (
            <div
              key={item.id}
              style={{
                position: 'absolute',
                left: screenX, top: screenY,
                width: item.width * zs, height: item.height * zs,
                pointerEvents: isEditing ? 'auto' : 'none',
                border: isEditing ? '1px solid rgba(79,156,249,0.8)' : 'none',
                boxSizing: 'border-box',
              }}
            >
              {isEditing ? (
                <textarea
                  autoFocus
                  value={item.text}
                  onChange={e => setTextItems(prev => prev.map(t => t.id === item.id ? { ...t, text: e.target.value } : t))}
                  onKeyDown={e => {
                    if (e.key === 'Escape') {
                      setTextItems(prev => prev.filter(t => t.id !== item.id || t.text.trim() !== ''));
                      setEditingTextId(null);
                    }
                  }}
                  onBlur={() => {
                    setTextItems(prev => prev.filter(t => t.id !== item.id || t.text.trim() !== ''));
                    setEditingTextId(null);
                  }}
                  style={{
                    position: 'absolute', inset: 0,
                    background: 'transparent', border: 'none', resize: 'none',
                    outline: 'none', padding: '4px 8px',
                    font: `${14 * zs}px sans-serif`,
                    color: '#000000', lineHeight: 1.4,
                    width: '100%', height: '100%',
                  }}
                />
              ) : (
                <span style={{
                  display: 'block', padding: '4px 8px',
                  font: `${14 * zs}px sans-serif`,
                  color: '#000000', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {item.text}
                </span>
              )}
            </div>
          );
        })}

        {textDragRect && (
          <div style={{
            position: 'absolute',
            left: textDragRect.x, top: textDragRect.y,
            width: textDragRect.w, height: textDragRect.h,
            border: '1.5px solid #4f9cf9',
            pointerEvents: 'none',
          }} />
        )}
      </div>

      {/* z=5 Custom cursor overlay */}
      {(activeTool === 'pen' || activeTool === 'eraser') && showCursor && (
        <div
          style={{
            position: 'absolute',
            left: cursorPos.x,
            top:  cursorPos.y,
            transform: 'translate(-50%, -50%)',
            width:  dotDiameter,
            height: dotDiameter,
            borderRadius: '9999px',
            pointerEvents: 'none',
            zIndex: 5,
            ...(activeTool === 'pen'
              ? { background: '#000000' }
              : {
                  background: 'rgba(255,255,255,0.8)',
                  border: '1px solid #000000',
                }
            ),
          }}
        />
      )}

      {/* Hidden file input */}
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) handleUpload(f);
          e.target.value = '';
        }}
      />

      {/* Undo/Redo keyboard shortcut listener */}
      <UndoRedoListener onUndo={handleUndo} onRedo={handleRedo} />
    </div>
  );
});

/* ── UndoRedoListener ───────────────────────────────────────────── */
function UndoRedoListener({ onUndo, onRedo }: { onUndo: () => void; onRedo: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key !== 'z' && e.key !== 'Z') return;
      e.preventDefault();
      e.stopPropagation();
      if (e.shiftKey) onRedo();
      else onUndo();
    };
    window.addEventListener('keydown', h, { capture: true });
    return () => window.removeEventListener('keydown', h, { capture: true });
  }, [onUndo, onRedo]);
  return null;
}

export default SketchCanvas;
