/* 노드 카드 규격 (rem → px @ 16px base) */
export const CARD_W_PX  = 280; // 17.5rem
export const CARD_H_PX  = 198; // 12.375rem
export const COL_GAP_PX = 40;  // 컬럼 간 수평 간격
export const ROW_GAP_PX = 16;  // 형제 노드 간 수직 간격

/* 포트 인디케이터 형태 */
export type PortShape =
  | 'none'
  | 'circle-solid'    // 부모 포트, 단일 연결
  | 'circle-outline'  // 자식 포트, 단일 연결
  | 'diamond-solid'   // 부모 포트, 다중 연결
  | 'diamond-outline' // 자식 포트, 다중 연결

export interface CanvasEdge {
  id: string;
  sourceId: string; // 부모 노드
  targetId: string; // 자식 노드
}

export type NodeType =
  | 'planners'
  | 'plan'
  | 'image'
  | 'elevation'
  | 'viewpoint'
  | 'diagram'
  | 'print'
  | 'sketch';

/* 아트보드 컨테이너 유형 */
export type ArtboardType = 'blank' | 'sketch' | 'imageStatic' | 'imageEditable' | 'thumbnail';

export type ActiveTool = 'cursor' | 'handle';

export interface CanvasNode {
  id: string;
  type: NodeType;
  title: string;
  position: { x: number; y: number };
  instanceNumber: number;
  hasThumbnail: boolean;
  artboardType: ArtboardType;  // 아트보드 컨테이너 유형
  thumbnailData?: string;
  parentId?: string;    // 파생 출처 노드 id
  autoPlaced?: boolean; // Auto Layout 배치 노드 (수동 드래그 시 false로 전환)
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
  'planners', 'plan', 'image', 'elevation', 'viewpoint', 'diagram', 'print',
];

/* 아트보드 유형별 호환 노드 탭 */
export const ARTBOARD_COMPATIBLE_NODES: Record<Exclude<ArtboardType, 'blank'>, NodeType[]> = {
  sketch:        ['image', 'plan'],
  imageStatic:   ['elevation', 'viewpoint', 'diagram'],
  imageEditable: ['elevation', 'viewpoint', 'diagram'],
  thumbnail:     ['planners', 'print'],
};

/* 노드 → 아트보드 유형 매핑 (탭 클릭 시 blank 아트보드에 유형 배정) */
export const NODE_TO_ARTBOARD_TYPE: Partial<Record<NodeType, ArtboardType>> = {
  image:     'sketch',
  plan:      'sketch',
  elevation: 'imageStatic',
  viewpoint: 'imageStatic',
  diagram:   'imageStatic',
  print:     'thumbnail',
  planners:  'thumbnail',
};

/* 아트보드 선택 + 탭 클릭 시 expand 진입하는 노드 */
export const NODES_THAT_EXPAND: NodeType[] = ['image', 'plan', 'print', 'planners'];

/* 아트보드 미선택 패널에서 → 버튼 비활성 노드 */
export const NODES_NAVIGATE_DISABLED: NodeType[] = ['elevation', 'viewpoint', 'diagram'];

/* 아트보드 미선택 패널 CTA 클릭 시 토스트 메시지 */
export const PANEL_CTA_MESSAGE: Partial<Record<NodeType, string>> = {
  plan:      '스케치를 선택해 주세요',
  image:     '스케치를 선택해 주세요',
  elevation: '이미지를 선택해 주세요',
  viewpoint: '이미지를 선택해 주세요',
  diagram:   '이미지를 선택해 주세요',
};

/* 아트보드 유형 배지 레이블 */
export const ARTBOARD_LABEL: Record<Exclude<ArtboardType, 'blank'>, string> = {
  sketch:        'SKETCH',
  imageStatic:   'IMAGE',
  imageEditable: 'IMAGE (EDIT)',
  thumbnail:     'THUMBNAIL',
};

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