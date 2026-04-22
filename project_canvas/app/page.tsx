'use client';

import { useState, useCallback, useEffect } from 'react';
import { CanvasNode, CanvasEdge, NodeType, NODE_DEFINITIONS, NODE_ORDER, CARD_W_PX } from '@/types/canvas';
import InfiniteCanvas from '@/components/InfiniteCanvas';
import LeftToolbar    from '@/components/LeftToolbar';
import RightSidebar   from '@/components/RightSidebar';
import ExpandedView   from '@/components/ExpandedView';

/* ── 데모 레이아웃
   NODE_ORDER 인덱스: planners=0, plan=1, image=2, elevation=3,
                      viewpoint=4, diagram=5, print=6, sketch=7
   id = String(index + 1)

   Group A (상단): planners(1) → plan(2) + image(3)  ← 1부모 여러자식, circle 포트
   Group B (하단): sketch(8) + diagram(6) → elevation(4)  ← 다중부모, diamond 포트
   나머지: viewpoint(5), print(7) — 연결 없음
   ─────────────────────────────────────────────────────────────── */
const CX = CARD_W_PX + 200; // 컬럼 간격: 카드 폭(280) + 200px gap = 480px

const DEMO_POSITIONS: Record<string, { x: number; y: number }> = {
  planners:  { x: 0,      y: 0   },  // Group A 부모
  plan:      { x: CX,     y: 0   },  // Group A 자식 1
  image:     { x: CX,     y: 214 },  // Group A 자식 2
  sketch:    { x: 0,      y: 460 },  // Group B 부모 1
  diagram:   { x: 0,      y: 674 },  // Group B 부모 2
  elevation: { x: CX,     y: 567 },  // Group B 자식 (다중부모)
  viewpoint: { x: CX * 2, y: 0   },  // 독립
  print:     { x: CX * 2, y: 214 },  // 독립
};

const INITIAL_NODES: CanvasNode[] = NODE_ORDER.map((type, i) => ({
  id: String(i + 1),
  type,
  title: `${NODE_DEFINITIONS[type].caption} #1`,
  position: DEMO_POSITIONS[type],
  instanceNumber: 1,
  hasThumbnail: ['planners', 'plan', 'image'].includes(type),
}));

/* ── 데모 엣지 4개
   Group A: planners→plan, planners→image  (portRight=circle-solid)
   Group B: sketch→elevation, diagram→elevation  (portRight=diamond-solid)
   ─────────────────────────────────────────────────────────────── */
const INITIAL_EDGES: CanvasEdge[] = [
  { id: 'demo-edge-1', sourceId: '1', targetId: '2' }, // planners → plan
  { id: 'demo-edge-2', sourceId: '1', targetId: '3' }, // planners → image
  { id: 'demo-edge-3', sourceId: '8', targetId: '4' }, // sketch → elevation
  { id: 'demo-edge-4', sourceId: '6', targetId: '4' }, // diagram → elevation
];

/* 클릭 시 패널 없이 즉시 expand로 진입하는 노드 타입 */
const DIRECT_EXPAND_NODES: NodeType[] = ['planners', 'image'];

type ActiveTool = 'cursor' | 'handle';

export default function CanvasPage() {
  /* ── viewport ──────────────────────────────────────────────────── */
  const [scale,  setScale]  = useState(1);
  const [offset, setOffset] = useState({ x: 80, y: 80 });

  /* ── tool ───────────────────────────────────────────────────────── */
  const [activeTool, setActiveTool] = useState<ActiveTool>('cursor');

  /* ── nodes + history ─────────────────────────────────────────────── */
  const [nodes,        setNodes]        = useState<CanvasNode[]>(INITIAL_NODES);
  const [history,      setHistory]      = useState<CanvasNode[][]>([INITIAL_NODES]);
  const [historyIndex, setHistoryIndex] = useState(0);

  /* ── edges ───────────────────────────────────────────────────────── */
  const [edges,      setEdges]      = useState<CanvasEdge[]>(INITIAL_EDGES);
  const [newEdgeIds, setNewEdgeIds] = useState<Set<string>>(new Set());

  /* ── 선택 / 확장 상태 ────────────────────────────────────────────── */
  const [selectedNodeId,       setSelectedNodeId]       = useState<string | null>(null);
  const [expandedNodeId,       setExpandedNodeId]       = useState<string | null>(null);

  /* ── 통합 사이드바 상태 ──────────────────────────────────────────── */
  const [activeSidebarNodeType, setActiveSidebarNodeType] = useState<NodeType | null>(null);

  /* ── history helpers ─────────────────────────────────────────────── */
  const pushHistory = useCallback((next: CanvasNode[]) => {
    setHistory(prev => [...prev.slice(0, historyIndex + 1), next]);
    setHistoryIndex(i => i + 1);
    setNodes(next);
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    const idx = historyIndex - 1;
    setHistoryIndex(idx);
    setNodes(history[idx]);
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const idx = historyIndex + 1;
    setHistoryIndex(idx);
    setNodes(history[idx]);
  }, [historyIndex, history]);

  /* ── keyboard shortcuts ──────────────────────────────────────────── */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.shiftKey ? redo() : undo();
        e.preventDefault();
      }
      if (e.key === 'Escape') {
        setSelectedNodeId(null);
        if (expandedNodeId) handleReturnFromExpand();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undo, redo, expandedNodeId]);
  /* ── node 생성 후 즉시 expand 진입 ──────────────────────────────── */
  const createAndExpandNode = useCallback((type: NodeType) => {
    const currentNodes = nodes;
    const existing = currentNodes.filter(n => n.type === type);
    const num = existing.length + 1;
    const cwx = (window.innerWidth  / 2 - offset.x) / scale - CARD_W_PX / 2;
    const cwy = (window.innerHeight / 2 - offset.y) / scale - 120;
    const newNode: CanvasNode = {
      id: crypto.randomUUID(),
      type,
      title: `${NODE_DEFINITIONS[type].caption} #${num}`,
      position: { x: cwx, y: cwy },
      instanceNumber: num,
      hasThumbnail: false,
    };
    const next = [...currentNodes, newNode];
    pushHistory(next);
    setExpandedNodeId(newNode.id);
    setActiveSidebarNodeType(null);
  }, [nodes, offset, scale, pushHistory]);

  const handleCreateEmptySketch = useCallback(() => {
    const currentNodes = nodes;
    const existing = currentNodes.filter(n => n.type === 'sketch');
    const num = existing.length + 1;
    const cwx = (window.innerWidth  / 2 - offset.x) / scale - CARD_W_PX / 2;
    const cwy = (window.innerHeight / 2 - offset.y) / scale - 120;
    const newNode: CanvasNode = {
      id: crypto.randomUUID(),
      type: 'sketch',
      title: `SKETCH #${num}`,
      position: { x: cwx, y: cwy },
      instanceNumber: num,
      hasThumbnail: false,
    };
    pushHistory([...currentNodes, newNode]);
    setSelectedNodeId(newNode.id);
    setActiveSidebarNodeType(null);
  }, [nodes, offset, scale, pushHistory]);

  /* ── expand에서 돌아올 때 항상 썸네일 생성 ──────────────────────── */
  const handleReturnFromExpand = useCallback(() => {
    if (!expandedNodeId) { setExpandedNodeId(null); return; }
    setNodes(prev => {
      const next = prev.map(n =>
        n.id === expandedNodeId ? { ...n, hasThumbnail: true } : n
      );
      setHistory(h => [...h.slice(0, historyIndex + 1), next]);
      setHistoryIndex(i => i + 1);
      return next;
    });
    setExpandedNodeId(null);
  }, [expandedNodeId, historyIndex]);

  /* ── node position ───────────────────────────────────────────────── */
  const updateNodePosition = useCallback((id: string, pos: { x: number; y: number }) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, position: pos } : n));
  }, []);

  const commitNodePosition = useCallback((id: string) => {
    const next = nodes.map(n => n.id === id ? { ...n, autoPlaced: false } : n);
    setNodes(next);
    setHistory(prev => [...prev.slice(0, historyIndex + 1), next]);
    setHistoryIndex(i => i + 1);
  }, [nodes, historyIndex]);

  /* ── 사이드바 노드 탭 선택 ────────────────────────────────────────── */
  const handleNodeTabSelect = useCallback((type: NodeType) => {
    /* 즉시 expand 노드 + 썸네일 없는 신규 진입 */
    if (DIRECT_EXPAND_NODES.includes(type) && !selectedNodeId) {
      createAndExpandNode(type);
      return;
    }
    /* 토글: 같은 탭 재클릭 시 SELECT TOOLS로 복귀 */
    setActiveSidebarNodeType(prev => prev === type ? null : type);
    // setSelectedNodeId(null); // 사용자의 요청으로 선택 상태를 유지합니다.
  }, [selectedNodeId, createAndExpandNode]);

  /* ── "→" 버튼: 사이드바 패널에서 expand 진입 ──────────────────────── */
  const handleNavigateToExpand = useCallback((type: NodeType) => {
    /* 기존 썸네일이 있는 노드가 선택되어 있으면 그 노드로 expand */
    if (selectedNodeId) {
      const selected = nodes.find(n => n.id === selectedNodeId);
      if (selected && selected.type === type) {
        setExpandedNodeId(selectedNodeId);
        setActiveSidebarNodeType(null);
        return;
      }
    }
    /* 아니면 새 노드 생성 후 expand */
    createAndExpandNode(type);
  }, [selectedNodeId, nodes, createAndExpandNode]);

  /* ── 썸네일 단일 클릭 → 선택 + 패널 열기 ───────────────────────── */
  const handleNodeCardSelect = useCallback((id: string) => {
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    setSelectedNodeId(id);
    setActiveSidebarNodeType(node.type);
  }, [nodes]);

  /* ── 빈 캔버스 클릭 → 선택 해제 + 패널 닫기 ────────────────────── */
  const handleNodeDeselect = useCallback(() => {
    setSelectedNodeId(null);
    setActiveSidebarNodeType(null);
  }, []);

  /* ── node duplicate / delete ─────────────────────────────────────── */
  const duplicateNode = useCallback((id: string) => {
    const src = nodes.find(n => n.id === id);
    if (!src) return;
    const num = nodes.filter(n => n.type === src.type).length + 1;
    pushHistory([...nodes, {
      ...src,
      id: crypto.randomUUID(),
      title: `${NODE_DEFINITIONS[src.type].caption} #${num}`,
      instanceNumber: num,
      position: { x: src.position.x + 24, y: src.position.y + 24 },
      hasThumbnail: false,
    }]);
  }, [nodes, pushHistory]);

  const deleteNode = useCallback((id: string) => {
    setSelectedNodeId(prev => {
      if (prev === id) setActiveSidebarNodeType(null);
      return prev === id ? null : prev;
    });
    setEdges(prev => prev.filter(e => e.sourceId !== id && e.targetId !== id));
    pushHistory(nodes.filter(n => n.id !== id));
  }, [nodes, pushHistory]);

  /* ── 확장 뷰 ─────────────────────────────────────────────────────── */
  const expandedNode = expandedNodeId ? nodes.find(n => n.id === expandedNodeId) ?? null : null;

  /* ── zoom ───────────────────────────────────────────────────────── */
  const zoomIn    = () => setScale(s => Math.min(4,   parseFloat((s * 1.25).toFixed(2))));
  const zoomOut   = () => setScale(s => Math.max(0.1, parseFloat((s * 0.8).toFixed(2))));
  const zoomReset = () => { setScale(1); setOffset({ x: 80, y: 80 }); };

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Header />

      {/* ── 확장 뷰 ─────────────────────────────────────────────────── */}
      {expandedNode ? (
        <ExpandedView
          node={expandedNode}
          onCollapse={handleReturnFromExpand}
          activeTool={activeTool}
          scale={scale}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
          onToolChange={setActiveTool}
          onUndo={undo}
          onRedo={redo}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onZoomReset={zoomReset}
          onAddSketch={handleCreateEmptySketch}
        />
      ) : (
        /* ── 캔버스 뷰 ────────────────────────────────────────────── */
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <InfiniteCanvas
            nodes={nodes}
            edges={edges}
            newEdgeIds={newEdgeIds}
            scale={scale}
            offset={offset}
            activeTool={activeTool}
            selectedNodeId={selectedNodeId}
            onScaleChange={setScale}
            onOffsetChange={setOffset}
            onNodePositionChange={updateNodePosition}
            onNodePositionCommit={commitNodePosition}
            onNodeSelect={handleNodeCardSelect}
            onNodeDeselect={handleNodeDeselect}
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
            onZoomReset={zoomReset}
            onAddSketch={handleCreateEmptySketch}
          />

          <RightSidebar
            activeSidebarNodeType={activeSidebarNodeType}
            onNodeTabSelect={handleNodeTabSelect}
            onNavigateToExpand={handleNavigateToExpand}
          />
        </div>
      )}
    </div>
  );
}
