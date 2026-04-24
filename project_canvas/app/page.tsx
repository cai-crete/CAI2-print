'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import localforage from 'localforage';
import {
  CanvasNode, CanvasEdge, NodeType,
  ArtboardType, NODE_TO_ARTBOARD_TYPE, NODES_THAT_EXPAND,
  NODE_DEFINITIONS, COL_GAP_PX, SketchPanelSettings, PlanPanelSettings,
  NODES_NAVIGATE_DISABLED, NODE_TARGET_ARTBOARD_TYPE,
} from '@/types/canvas';
import { placeNewChild } from '@/lib/autoLayout';
import InfiniteCanvas    from '@/components/InfiniteCanvas';
import LeftToolbar       from '@/components/LeftToolbar';
import RightSidebar      from '@/components/RightSidebar';
import ExpandedView      from '@/components/ExpandedView';
import GeneratingToast   from '@/components/GeneratingToast';

/* ── UUID 생성 (비보안 컨텍스트 폴백: HTTP 로컬 IP 접속 대응) ───── */
function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

/* ── 스토리지 키 ─────────────────────────────────────────────────── */
const LF_NODES = 'cai-canvas-nodes';
const LF_EDGES = 'cai-canvas-edges';
const LS_VIEW  = 'cai-canvas-view';

async function lfSaveNodes(nodes: CanvasNode[]) {
  try { await localforage.setItem(LF_NODES, nodes); } catch { /* quota */ }
}

async function lfLoadNodes(): Promise<CanvasNode[]> {
  try {
    const raw = await localforage.getItem<CanvasNode[]>(LF_NODES);
    if (!raw) return [];
    return raw.map(n => ({ ...n, artboardType: n.artboardType ?? 'sketch' }));
  } catch { return []; }
}

async function lfSaveEdges(edges: CanvasEdge[]) {
  try { await localforage.setItem(LF_EDGES, edges); } catch { /* quota */ }
}

async function lfLoadEdges(): Promise<CanvasEdge[]> {
  try { return (await localforage.getItem<CanvasEdge[]>(LF_EDGES)) || []; }
  catch { return []; }
}

function lsSaveView(scale: number, offset: { x: number; y: number }) {
  try { localStorage.setItem(LS_VIEW, JSON.stringify({ scale, offset })); } catch { /* quota */ }
}

function lsLoadView(): { scale: number; offset: { x: number; y: number } } {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_VIEW) || '{}');
    return {
      scale:  raw.scale  ?? 1,
      offset: raw.offset ?? { x: 80, y: 80 },
    };
  } catch { return { scale: 1, offset: { x: 80, y: 80 } }; }
}

const CARD_W    = 280;
const CARD_H    = 198;
const HEADER_H  = 56;   /* var(--header-h) = 3.5rem */
const MIN_SCALE = 0.1;
const MAX_SCALE = 4;

/* 아트보드 미선택 상태에서 탭 클릭 시 바로 expand 진입하는 노드 */
const DIRECT_EXPAND_NODES: NodeType[] = ['planners', 'image', 'plan'];

type ActiveTool = 'cursor' | 'handle';

export default function CanvasPage() {
  /* ── viewport ──────────────────────────────────────────────────── */
  const [scale,  setScale]  = useState(1);
  const [offset, setOffset] = useState({ x: 80, y: 80 });

  /* ── tool ───────────────────────────────────────────────────────── */
  const [activeTool, setActiveTool] = useState<ActiveTool>('cursor');

  /* ── nodes + history ─────────────────────────────────────────────── */
  const [nodes,        setNodes]        = useState<CanvasNode[]>([]);
  const [history,      setHistory]      = useState<{ nodes: CanvasNode[]; edges: CanvasEdge[] }[]>([{ nodes: [], edges: [] }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  /* ── edges + 신규 엣지 애니메이션 ───────────────────────────────── */
  const [edges,      setEdges]      = useState<CanvasEdge[]>([]);
  const [newEdgeIds] = useState<Set<string>>(new Set());

  /* ── edges 최신값 ref (stale closure 방지) ──────────────────────── */
  const edgesRef = useRef<CanvasEdge[]>([]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);

  /* ── localStorage 복원 완료 플래그 (persist effect 선실행 방지) ─── */
  const isRestoredRef = useRef(false);

  /* ── 줌 배율 버튼 사이클 상태 (0: idle, 1: fit-all, 2: focus-latest) */
  const zoomCycleStateRef = useRef(0);
  const savedViewRef      = useRef<{ scale: number; offset: { x: number; y: number } } | null>(null);

  /* ── 선택 / 확장 상태 ────────────────────────────────────────────── */
  const [selectedNodeIds,      setSelectedNodeIds]      = useState<string[]>([]);
  const [expandedNodeId,       setExpandedNodeId]       = useState<string | null>(null);
  const selectedNodeId = selectedNodeIds.length === 1 ? selectedNodeIds[0] : null;

  /* ── 생성 상태 ──────────────────────────────────────────────────── */
  const [isGenerating,    setIsGenerating]    = useState(false);
  const [generatingLabel, setGeneratingLabel] = useState('IMAGE GENERATING');
  const abortControllerRef = useRef<AbortController | null>(null);

  /* ── 통합 사이드바 상태 ──────────────────────────────────────────── */
  const [activeSidebarNodeType, setActiveSidebarNodeType] = useState<NodeType | null>(null);

  /* ── Toast 시스템 ─────────────────────────────────────────────── */
  type ToastType = 'warning' | 'success';
  interface ToastState { message: string; type: ToastType; visible: boolean; fadingOut: boolean; }
  const [toast, setToast] = useState<ToastState>({ message: '', type: 'warning', visible: false, fadingOut: false });
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'warning') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type, visible: true, fadingOut: false });
    toastTimerRef.current = setTimeout(() => {
      setToast(prev => ({ ...prev, fadingOut: true }));
      toastTimerRef.current = setTimeout(() => {
        setToast(prev => ({ ...prev, visible: false, fadingOut: false }));
      }, 300);
    }, 2500);
  }, []);

  /* ── 선택된 아트보드 유형 (파생값) ──────────────────────────────── */
  const selectedArtboardType: ArtboardType | null = selectedNodeId
    ? (nodes.find(n => n.id === selectedNodeId)?.artboardType ?? null)
    : null;

  /* ── history helpers ─────────────────────────────────────────────── */
  const pushHistory = useCallback((nextNodes: CanvasNode[], nextEdges?: CanvasEdge[]) => {
    const edgesToSave = nextEdges ?? edgesRef.current;
    setHistory(prev => [...prev.slice(0, historyIndex + 1), { nodes: nextNodes, edges: edgesToSave }]);
    setHistoryIndex(i => i + 1);
    setNodes(nextNodes);
    if (nextEdges !== undefined) setEdges(nextEdges);
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    const idx = historyIndex - 1;
    setHistoryIndex(idx);
    setNodes(history[idx].nodes);
    setEdges(history[idx].edges);
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const idx = historyIndex + 1;
    setHistoryIndex(idx);
    setNodes(history[idx].nodes);
    setEdges(history[idx].edges);
  }, [historyIndex, history]);

  /* ── keyboard shortcuts ──────────────────────────────────────────── */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.shiftKey ? redo() : undo();
        e.preventDefault();
      }
      if (e.key === 'Escape') {
        setSelectedNodeIds([]);
        if (expandedNodeId) handleReturnFromExpand();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undo, redo, expandedNodeId]);

  /* ── persist: nodes → IndexedDB (복원 완료 후에만) ─────────────── */
  useEffect(() => {
    if (!isRestoredRef.current) return;
    lfSaveNodes(nodes);
  }, [nodes]);

  /* ── persist: edges → IndexedDB (복원 완료 후에만) ─────────────── */
  useEffect(() => {
    if (!isRestoredRef.current) return;
    lfSaveEdges(edges);
  }, [edges]);

  /* ── persist: viewport → localStorage (복원 완료 후에만) ───────── */
  useEffect(() => {
    if (!isRestoredRef.current) return;
    lsSaveView(scale, offset);
  }, [scale, offset]);

  /* ── mount: IndexedDB 복원 → isRestoredRef = true ──────────────── */
  useEffect(() => {
    const view = lsLoadView();
    setScale(view.scale);
    setOffset(view.offset);

    Promise.all([lfLoadNodes(), lfLoadEdges()]).then(([savedNodes, savedEdges]) => {
      if (savedNodes.length > 0) {
        setNodes(savedNodes);
        setEdges(savedEdges);
        setHistory([{ nodes: savedNodes, edges: savedEdges }]);
      }
      isRestoredRef.current = true;
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── 노드 생성 후 즉시 expand 진입 ──────────────────────────────── */
  const createAndExpandNode = useCallback((type: NodeType) => {
    const currentNodes = nodes;
    const currentEdges = edgesRef.current;
    const existing = currentNodes.filter(n => n.type === type);
    const num = existing.length + 1;
    const artboardType: ArtboardType = NODE_TO_ARTBOARD_TYPE[type] ?? 'blank';
    const newId = generateId();

    const cwx = (window.innerWidth  / 2 - offset.x) / scale - CARD_W / 2;
    const cwy = (window.innerHeight / 2 - offset.y) / scale - 120;
    let position = { x: cwx, y: cwy };

    if (selectedNodeId) {
      const { position: childPos, pushdowns } = placeNewChild(selectedNodeId, currentNodes, currentEdges);
      position = childPos;
      const newNode: CanvasNode = {
        id: newId, type,
        title: `${NODE_DEFINITIONS[type].caption} #${num}`,
        position, instanceNumber: num, hasThumbnail: false, artboardType,
        parentId: selectedNodeId, autoPlaced: true,
      };
      let nextNodes = [...currentNodes, newNode];
      if (pushdowns.size > 0) {
        nextNodes = nextNodes.map(n => {
          const np = pushdowns.get(n.id);
          return np ? { ...n, position: np } : n;
        });
      }
      const newEdge: CanvasEdge = { id: generateId(), sourceId: selectedNodeId, targetId: newId };
      pushHistory(nextNodes, [...currentEdges, newEdge]);
    } else {
      const newNode: CanvasNode = {
        id: newId, type,
        title: `${NODE_DEFINITIONS[type].caption} #${num}`,
        position, instanceNumber: num, hasThumbnail: false, artboardType,
      };
      pushHistory([...currentNodes, newNode]);
    }

    setExpandedNodeId(newId);
    setActiveSidebarNodeType(null);
  }, [nodes, offset, scale, pushHistory, selectedNodeId]);

  /* ── '+' 버튼: 빈 아트보드 생성 ─────────────────────────────────── */
  const handleAddArtboard = useCallback(() => {
    const currentNodes = nodes;
    const num = currentNodes.length + 1;
    const cwx = (window.innerWidth  / 2 - offset.x) / scale - CARD_W / 2;
    const cwy = (window.innerHeight / 2 - offset.y) / scale - 120;
    const newNode: CanvasNode = {
      id: generateId(),
      type: 'sketch',
      title: `ARTBOARD #${num}`,
      position: { x: cwx, y: cwy },
      instanceNumber: num,
      hasThumbnail: false,
      artboardType: 'blank',
    };
    pushHistory([...currentNodes, newNode]);
    setSelectedNodeIds([newNode.id]);
    setActiveSidebarNodeType(null);
  }, [nodes, offset, scale, pushHistory]);

  /* ── elevation/viewpoint/diagram 전용 자식 노드 생성 ─────────── */
  const createChildNode = useCallback((parentId: string, type: NodeType, artboardType: ArtboardType) => {
    const currentNodes = nodes;
    const currentEdges = edgesRef.current;
    const existing = currentNodes.filter(n => n.type === type);
    const num = existing.length + 1;
    const newId = generateId();

    const { position, pushdowns } = placeNewChild(parentId, currentNodes, currentEdges);
    const newNode: CanvasNode = {
      id: newId, type,
      title: `${NODE_DEFINITIONS[type].caption} #${num}`,
      position, instanceNumber: num, hasThumbnail: false,
      artboardType, parentId, autoPlaced: true,
    };

    let nextNodes = [...currentNodes, newNode];
    if (pushdowns.size > 0) {
      nextNodes = nextNodes.map(n => {
        const np = pushdowns.get(n.id);
        return np ? { ...n, position: np } : n;
      });
    }

    const newEdge: CanvasEdge = { id: generateId(), sourceId: parentId, targetId: newId };
    pushHistory(nextNodes, [...currentEdges, newEdge]);
  }, [nodes, pushHistory]);

  /* ── 이미지 파일 업로드 → image 아트보드 생성 ────────────────── */
  const handleUploadImage = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) return;
      const currentNodes = nodes;
      const num = currentNodes.filter(n => n.type === 'image').length + 1;
      const cwx = (window.innerWidth  / 2 - offset.x) / scale - CARD_W / 2;
      const cwy = (window.innerHeight / 2 - offset.y) / scale - 120;
      const newNode: CanvasNode = {
        id: generateId(),
        type: 'image',
        title: `${NODE_DEFINITIONS['image'].caption} #${num}`,
        position: { x: cwx, y: cwy },
        instanceNumber: num,
        hasThumbnail: true,
        artboardType: 'image',
        thumbnailData: dataUrl,
      };
      pushHistory([...currentNodes, newNode]);
      setSelectedNodeIds([newNode.id]);
    };
    reader.readAsDataURL(file);
  }, [nodes, offset, scale, pushHistory]);

  /* ── expand에서 돌아올 때 썸네일 생성 */
  const handleReturnFromExpand = useCallback(() => {
    if (!expandedNodeId) { setExpandedNodeId(null); return; }
    const node = nodes.find(n => n.id === expandedNodeId);
    const isSketchImage = node?.artboardType === 'sketch' && node?.type === 'image';
    const isSketchPlan  = node?.artboardType === 'sketch' && node?.type === 'plan';
    if (!isSketchImage && !isSketchPlan) {
      setNodes(prev => {
        const next = prev.map(n => {
          if (n.id !== expandedNodeId) return n;
          const targetArtboardType = NODE_TARGET_ARTBOARD_TYPE[n.type] || n.artboardType;
          return { ...n, hasThumbnail: true, artboardType: targetArtboardType };
        });
        setHistory(h => [...h.slice(0, historyIndex + 1), { nodes: next, edges: edgesRef.current }]);
        setHistoryIndex(i => i + 1);
        return next;
      });
    }
    setExpandedNodeId(null);
  }, [expandedNodeId, nodes, historyIndex]);

  /* ── sketch-image [<-]: 스케치 + 패널 설정 저장 ─────────────────── */
  const handleCollapseWithSketch = useCallback((sketchBase64: string, thumbnailBase64: string, panelSettings?: SketchPanelSettings) => {
    if (!expandedNodeId) return;
    setGeneratingLabel('IMAGE GENERATING');
    setNodes(prev => prev.map(n => {
      if (n.id !== expandedNodeId) return n;
      const updates: Partial<CanvasNode> = { sketchPanelSettings: panelSettings };
      if (sketchBase64) {
        updates.hasThumbnail  = true;
        /* generatedImageData가 있으면 원본 AI 이미지를 썸네일로 유지, 없으면 100% zoom 썸네일 */
        updates.thumbnailData = n.generatedImageData ?? thumbnailBase64;
        updates.sketchData    = sketchBase64;
      }
      return { ...n, ...updates };
    }));
  }, [expandedNodeId]);

  /* ── sketch-plan [<-]: 스케치 + 패널 설정 저장 ────────────────────── */
  const handleCollapseWithPlanSketch = useCallback((sketchBase64: string, thumbnailBase64: string, planSettings?: PlanPanelSettings) => {
    if (!expandedNodeId) return;
    setGeneratingLabel('PLAN GENERATING');
    setNodes(prev => prev.map(n => {
      if (n.id !== expandedNodeId) return n;
      const updates: Partial<CanvasNode> = { planPanelSettings: planSettings };
      if (sketchBase64) {
        updates.hasThumbnail  = true;
        updates.thumbnailData = n.generatedImageData ?? thumbnailBase64;
        updates.sketchData    = sketchBase64;
      }
      return { ...n, ...updates };
    }));
  }, [expandedNodeId]);

  /* ── sketch-plan GENERATE 완료 ─────────────────────────────────────── */
  const handleGeneratePlanComplete = useCallback(({
    sketchBase64, thumbnailBase64, generatedPlanBase64, roomAnalysis, nodeId,
  }: { sketchBase64: string; thumbnailBase64: string; generatedPlanBase64: string; roomAnalysis: string; nodeId: string }) => {
    setIsGenerating(false);
    abortControllerRef.current = null;

    setNodes(prev => {
      const origin = prev.find(n => n.id === nodeId);
      if (!origin) return prev;

      const updatedOrigin = {
        ...origin,
        hasThumbnail: true,
        thumbnailData: thumbnailBase64,
        sketchData: sketchBase64,
      };

      const existingOfType = prev.filter(n => n.type === origin.type);
      const num = existingOfType.length + 1;
      const newNode: CanvasNode = {
        id: generateId(),
        type: 'plan',
        artboardType: 'sketch',
        title: `${NODE_DEFINITIONS['plan'].caption} #${num}`,
        position: {
          x: origin.position.x + CARD_W + COL_GAP_PX,
          y: origin.position.y,
        },
        instanceNumber: num,
        hasThumbnail: true,
        thumbnailData: generatedPlanBase64,
        sketchData: generatedPlanBase64,
        generatedImageData: generatedPlanBase64,
        roomAnalysis,
        parentId: nodeId,
        autoPlaced: true,
      };

      const next = prev.map(n => n.id === nodeId ? updatedOrigin : n).concat(newNode);

      const newEdge: CanvasEdge = {
        id: generateId(),
        sourceId: nodeId,
        targetId: newNode.id,
      };
      const nextEdges = [...edgesRef.current, newEdge];

      pushHistory(next, nextEdges);
      setExpandedNodeId(null);
      return next;
    });
  }, [pushHistory]);

  /* ── sketch-image GENERATE 실패 → ExpandedView 재진입 ─────────────── */
  const handleGenerateError = useCallback((nodeId: string) => {
    setIsGenerating(false);
    abortControllerRef.current = null;
    setExpandedNodeId(nodeId);
  }, []);

  /* ── AbortController 동기화 (취소 버튼 연결) ────────────────────── */
  const handleAbortControllerReady = useCallback((ctrl: AbortController) => {
    abortControllerRef.current = ctrl;
  }, []);

  /* ── node position ───────────────────────────────────────────────── */
  const updateNodePosition = useCallback((id: string, pos: { x: number; y: number }) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, position: pos } : n));
  }, []);

  const commitNodePosition = useCallback((id: string) => {
    setNodes(prev => {
      const next = prev.map(n => n.id === id ? { ...n, autoPlaced: false } : n);
      setHistory(h => [...h.slice(0, historyIndex + 1), { nodes: next, edges: edgesRef.current }]);
      setHistoryIndex(i => i + 1);
      return next;
    });
  }, [historyIndex]);

  /* ── 사이드바 노드 탭 선택 ────────────────────────────────────────── */
  const handleNodeTabSelect = useCallback((type: NodeType) => {
    const selectedNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null;

    /* ── 아트보드가 선택된 경우: 직접 액션 ──────────────────────── */
    if (selectedNode) {
      /* elevation/viewpoint/diagram: image 아트보드에서만 자식 생성 */
      if (NODES_NAVIGATE_DISABLED.includes(type)) {
        if (selectedNode.artboardType === 'image') {
          createChildNode(selectedNode.id, type, 'image');
        }
        setActiveSidebarNodeType(null);
        return;
      }

      const targetArtboardType = NODE_TO_ARTBOARD_TYPE[type];
      if (!targetArtboardType) return;

      /* blank 아트보드: 유형 배정 */
      if (selectedNode.artboardType === 'blank') {
        const next = nodes.map(n =>
          n.id === selectedNode.id
            ? { ...n, artboardType: targetArtboardType, type }
            : n
        );
        pushHistory(next);
      }

      /* expand 진입 노드 → 즉시 expand */
      if (NODES_THAT_EXPAND.includes(type)) {
        setExpandedNodeId(selectedNode.id);
      }

      setActiveSidebarNodeType(null);
      return;
    }

    /* ── 아트보드 미선택: 기존 동작 ─────────────────────────────── */
    if (NODES_NAVIGATE_DISABLED.includes(type)) return;
    if (DIRECT_EXPAND_NODES.includes(type)) {
      createAndExpandNode(type);
      return;
    }
    setActiveSidebarNodeType(prev => prev === type ? null : type);
  }, [selectedNodeId, nodes, pushHistory, createAndExpandNode, createChildNode]);

  /* ── "→" 버튼: 사이드바 패널에서 expand 진입 ──────────────────────── */
  const handleNavigateToExpand = useCallback((type: NodeType) => {
    if (NODES_NAVIGATE_DISABLED.includes(type)) return;
    if (selectedNodeId) {
      const selected = nodes.find(n => n.id === selectedNodeId);
      if (selected && selected.type === type) {
        setExpandedNodeId(selectedNodeId);
        setActiveSidebarNodeType(null);
        return;
      }
    }
    createAndExpandNode(type);
  }, [selectedNodeId, nodes, createAndExpandNode]);

  /* ── 썸네일 단일 클릭 → 선택 + 패널 열기 ───────────────────────── */
  const handleNodeCardSelect = useCallback((id: string) => {
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    setSelectedNodeIds([id]);
    /* thumbnail 아트보드: 자동으로 PLANNERS 패널 표시 */
    if (node.artboardType === 'thumbnail') {
      setActiveSidebarNodeType('planners');
    } else {
      setActiveSidebarNodeType(null);
    }
  }, [nodes]);

  /* ── 빈 캔버스 클릭 → 선택 해제 + 패널 닫기 ────────────────────── */
  const handleNodeDeselect = useCallback(() => {
    setSelectedNodeIds([]);
    setActiveSidebarNodeType(null);
  }, []);

  const handleNodesSelect = useCallback((ids: string[]) => {
    setSelectedNodeIds(ids);
    setActiveSidebarNodeType(null);
  }, []);

  /* ── node duplicate / delete ─────────────────────────────────────── */
  const duplicateNode = useCallback((id: string) => {
    const src = nodes.find(n => n.id === id);
    if (!src) return;
    const num = nodes.filter(n => n.type === src.type).length + 1;
    pushHistory([...nodes, {
      ...src,
      id: generateId(),
      title: `${NODE_DEFINITIONS[src.type].caption} #${num}`,
      instanceNumber: num,
      position: { x: src.position.x + 24, y: src.position.y + 24 },
    }]);
  }, [nodes, pushHistory]);

  const deleteNode = useCallback((id: string) => {
    setSelectedNodeIds(prev => {
      if (prev.includes(id)) setActiveSidebarNodeType(null);
      return prev.filter(sid => sid !== id);
    });
    const nextNodes = nodes.filter(n => n.id !== id);
    const nextEdges = edgesRef.current.filter(e => e.sourceId !== id && e.targetId !== id);
    pushHistory(nextNodes, nextEdges);
  }, [nodes, pushHistory]);

  /* ── Sketch-to-Image 생성 완료 핸들러 ───────────────────────────── */
  const handleGenerateComplete = useCallback(({
    sketchBase64, thumbnailBase64, generatedBase64, nodeId,
  }: { sketchBase64: string; thumbnailBase64: string; generatedBase64: string; nodeId: string }) => {
    setIsGenerating(false);
    abortControllerRef.current = null;

    setNodes(prev => {
      /* 원본 노드: sketchData + thumbnailData(100% zoom) 업데이트 */
      const origin = prev.find(n => n.id === nodeId);
      if (!origin) return prev;

      const updatedOrigin = {
        ...origin,
        hasThumbnail: true,
        thumbnailData: thumbnailBase64,
        sketchData: sketchBase64,
      };

      /* 새 노드: 생성 이미지 */
      const existingOfType = prev.filter(n => n.type === origin.type);
      const num = existingOfType.length + 1;
      const newNode: CanvasNode = {
        id: generateId(),
        type: 'image',
        artboardType: 'sketch',
        title: `${NODE_DEFINITIONS['image'].caption} #${num}`,
        position: {
          x: origin.position.x + CARD_W + COL_GAP_PX,
          y: origin.position.y,
        },
        instanceNumber: num,
        hasThumbnail: true,
        thumbnailData: generatedBase64,
        sketchData: generatedBase64,
        generatedImageData: generatedBase64,
        parentId: nodeId,
        autoPlaced: true,
      };

      const next = prev.map(n => n.id === nodeId ? updatedOrigin : n).concat(newNode);

      /* edge 생성 */
      const newEdge: CanvasEdge = {
        id: generateId(),
        sourceId: nodeId,
        targetId: newNode.id,
      };
      const nextEdges = [...edgesRef.current, newEdge];

      pushHistory(next, nextEdges);
      setExpandedNodeId(null);
      return next;
    });
  }, [pushHistory]);

  /* ── 확장 뷰 ─────────────────────────────────────────────────────── */
  const expandedNode = expandedNodeId ? nodes.find(n => n.id === expandedNodeId) ?? null : null;

  /* ── zoom ───────────────────────────────────────────────────────── */
  const zoomIn  = () => setScale(s => Math.min(MAX_SCALE, parseFloat((s * 1.25).toFixed(2))));
  const zoomOut = () => setScale(s => Math.max(MIN_SCALE, parseFloat((s * 0.8).toFixed(2))));

  const handleZoomCycle = useCallback(() => {
    const state = zoomCycleStateRef.current;
    const vpW   = window.innerWidth;
    const vpH   = window.innerHeight - HEADER_H;

    if (state === 0) {
      savedViewRef.current = { scale, offset };

      if (nodes.length === 0) {
        setScale(1); setOffset({ x: 80, y: 80 });
        zoomCycleStateRef.current = 1;
        return;
      }
      const pad  = 80;
      const minX = Math.min(...nodes.map(n => n.position.x));
      const minY = Math.min(...nodes.map(n => n.position.y));
      const maxX = Math.max(...nodes.map(n => n.position.x + CARD_W));
      const maxY = Math.max(...nodes.map(n => n.position.y + CARD_H));
      const cW   = maxX - minX;
      const cH   = maxY - minY;
      const ns   = Math.min(
        (vpW - pad * 2) / cW,
        (vpH - pad * 2) / cH,
        MAX_SCALE,
      );
      const clampedScale = Math.max(MIN_SCALE, ns);
      setScale(clampedScale);
      setOffset({
        x: vpW / 2 - ((minX + maxX) / 2) * clampedScale,
        y: vpH / 2 - ((minY + maxY) / 2) * clampedScale,
      });
      zoomCycleStateRef.current = 1;
      return;
    }

    if (state === 1) {
      const last = nodes[nodes.length - 1];
      if (last) {
        const ns = 1;
        setScale(ns);
        setOffset({
          x: vpW / 2 - (last.position.x + CARD_W / 2) * ns,
          y: vpH / 2 - (last.position.y + CARD_H / 2) * ns,
        });
      }
      zoomCycleStateRef.current = 2;
      return;
    }

    const saved = savedViewRef.current;
    if (saved) { setScale(saved.scale); setOffset(saved.offset); }
    else        { setScale(1); setOffset({ x: 80, y: 80 }); }
    savedViewRef.current      = null;
    zoomCycleStateRef.current = 0;
  }, [scale, offset, nodes]);

  /* ── 헤더 ───────────────────────────────────────────────────────── */
  const Header = () => (
    <header style={{
      height: 'var(--header-h)',
      background: 'var(--color-white)',
      borderBottom: '1px solid var(--color-gray-100)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1.25rem',
      flexShrink: 0,
      position: 'relative',
      zIndex: 10,
    }}>
      <span className="text-title" style={{ fontSize: '1.25rem', letterSpacing: '0.05em' }}>
        CAI&nbsp;&nbsp;CANVAS
      </span>
    </header>
  );

  /* ── render ─────────────────────────────────────────────────────── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', userSelect: 'none' }}>
      <Header />

      {expandedNode ? (
        <ExpandedView
          node={expandedNode}
          onCollapse={handleReturnFromExpand}
          onCollapseWithSketch={handleCollapseWithSketch}
          onGenerateError={handleGenerateError}
          onAbortControllerReady={handleAbortControllerReady}
          activeTool={activeTool}
          scale={scale}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
          onToolChange={setActiveTool}
          onUndo={undo}
          onRedo={redo}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onZoomReset={handleZoomCycle}
          onAddArtboard={handleAddArtboard}
          onGenerateComplete={handleGenerateComplete}
          onCollapseWithPlanSketch={handleCollapseWithPlanSketch}
          onGeneratePlanComplete={handleGeneratePlanComplete}
          onGeneratingChange={setIsGenerating}
          isGenerating={isGenerating}
        />
      ) : (
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <InfiniteCanvas
            nodes={nodes}
            edges={edges}
            newEdgeIds={newEdgeIds}
            scale={scale}
            offset={offset}
            activeTool={activeTool}
            selectedNodeIds={selectedNodeIds}
            onScaleChange={setScale}
            onOffsetChange={setOffset}
            onNodePositionChange={updateNodePosition}
            onNodePositionCommit={commitNodePosition}
            onNodeSelect={handleNodeCardSelect}
            onNodeDeselect={handleNodeDeselect}
            onNodesSelect={handleNodesSelect}
            onNodeExpand={setExpandedNodeId}
            onNodeDuplicate={duplicateNode}
            onNodeDelete={deleteNode}
          />

          <LeftToolbar
            activeTool={activeTool}
            scale={scale}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
            onToolChange={setActiveTool}
            onUndo={undo}
            onRedo={redo}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onZoomReset={handleZoomCycle}
            onAddArtboard={handleAddArtboard}
            onUploadImage={handleUploadImage}
          />

          <RightSidebar
            activeSidebarNodeType={activeSidebarNodeType}
            selectedArtboardType={selectedArtboardType}
            onNodeTabSelect={handleNodeTabSelect}
            onNavigateToExpand={handleNavigateToExpand}
            hasSelectedArtboard={selectedNodeId !== null}
            onShowToast={showToast}
          />
        </div>
      )}

      {isGenerating && (
        <GeneratingToast
          label={generatingLabel}
          onCancel={() => {
            abortControllerRef.current?.abort();
            setIsGenerating(false);
          }}
        />
      )}

      {toast.visible && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          left: '50%',
          transform: `translateX(-50%) translateY(${toast.fadingOut ? '8px' : '0'})`,
          opacity: toast.fadingOut ? 0 : 1,
          transition: 'opacity 300ms ease, transform 300ms ease',
          zIndex: 9999,
          pointerEvents: 'none',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: 'var(--color-white)', borderRadius: 'var(--radius-pill)',
            boxShadow: 'var(--shadow-float)', padding: '0.625rem 1rem',
            fontFamily: 'var(--font-family-pretendard)', fontSize: '0.8125rem',
            color: 'var(--color-gray-700)', whiteSpace: 'nowrap',
          }}>
            {toast.type === 'warning' ? (
              <svg viewBox="0 0 16 16" style={{ width: 16, height: 16, flexShrink: 0 }} fill="none">
                <path d="M8 2L14 13H2L8 2Z" fill="#FFC107" stroke="none" />
                <line x1="8" y1="6.5" x2="8" y2="9.5" stroke="#333" strokeWidth="1.4" strokeLinecap="round" />
                <circle cx="8" cy="11.5" r="0.7" fill="#333" />
              </svg>
            ) : (
              <svg viewBox="0 0 16 16" style={{ width: 16, height: 16, flexShrink: 0 }} fill="none">
                <circle cx="8" cy="8" r="6.5" stroke="#22C55E" strokeWidth="1.4" />
                <polyline points="5,8.5 7,10.5 11,6" stroke="#22C55E" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}