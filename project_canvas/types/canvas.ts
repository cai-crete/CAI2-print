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
