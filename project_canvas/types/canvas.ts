/* 노드 카드 규격 (rem → px @ 16px base) */
export const CARD_W_PX  = 280; // 17.5rem
export const CARD_H_PX  = 198; // 12.375rem
export const COL_GAP_PX = 40;  // 컬럼 간 수평 간격
export const ROW_GAP_PX = 16;  // 형제 노드 간 수직 간격 (1rem)

/* 포트 인디케이터 형태 */
export type PortShape =
  | 'none'
  | 'circle-solid'    // 부모 포트, 단일 연결
  | 'circle-outline'  // 자식 포트, 단일 연결
  | 'diamond-solid'   // 부모 포트, 다중 연결
  | 'diamond-outline' // 자식 포트, 다중 연결

export type NodeType =
  | 'planners'
  | 'plan'
  | 'image'
  | 'elevation'
  | 'viewpoint'
  | 'diagram'
  | 'print'
  | 'sketch';

export type ActiveTool = 'cursor' | 'handle';

export interface CanvasNode {
  id: string;
  type: NodeType;
  title: string;
  position: { x: number; y: number };
  instanceNumber: number;
  hasThumbnail: boolean;
  thumbnailData?: string;
  parentId?: string;    // 파생 출처 노드 id
  autoPlaced?: boolean; // Auto Layout으로 배치된 노드 (수동 드래그 시 false로 전환)
}

export interface CanvasEdge {
  id: string;
  sourceId: string; // 부모 노드
  targetId: string; // 자식 노드
}

export interface CanvasViewport {
  offset: { x: number; y: number };
  scale: number;
}

export const NODE_DEFINITIONS: Record<NodeType, { label: string; displayLabel: string; caption: string }> = {
  planners:  { label: 'PLANNERS',           displayLabel: 'PLANNERS',   caption: 'Planners' },
  plan:      { label: 'SKETCH TO PLAN',     displayLabel: 'PLAN',       caption: 'Sketch to Plan' },
  image:     { label: 'SKETCH TO IMAGE',    displayLabel: 'IMAGE',      caption: 'Sketch to Image' },
  elevation: { label: 'IMAGE TO ELEVATION', displayLabel: 'ELEVATION',  caption: 'Image to Elevation' },
  viewpoint: { label: 'CHANGE VIEWPOINT',   displayLabel: 'CHANGE VIEWPOINT', caption: 'Change Viewpoint' },
  diagram:   { label: 'PLAN TO DIAGRAM',    displayLabel: 'DIAGRAM',    caption: 'Plan to Diagram' },
  print:     { label: 'PRINT',              displayLabel: 'PRINT',      caption: 'Print' },
  sketch:    { label: 'SKETCH',             displayLabel: 'SKETCH',     caption: 'Sketch Artboard' },
};

export const NODE_ORDER: NodeType[] = [
  'planners', 'plan', 'image', 'elevation', 'viewpoint', 'diagram', 'print', 'sketch',
];

/* 캔버스 좌표(world) → 화면 좌표(screen) */
export function toScreen(
  worldX: number,
  worldY: number,
  viewport: CanvasViewport,
): { x: number; y: number } {
  return {
    x: worldX * viewport.scale + viewport.offset.x,
    y: worldY * viewport.scale + viewport.offset.y,
  };
}

/* 화면 좌표(screen) → 캔버스 좌표(world) */
export function toWorld(
  screenX: number,
  screenY: number,
  viewport: CanvasViewport,
): { x: number; y: number } {
  return {
    x: (screenX - viewport.offset.x) / viewport.scale,
    y: (screenY - viewport.offset.y) / viewport.scale,
  };
}
