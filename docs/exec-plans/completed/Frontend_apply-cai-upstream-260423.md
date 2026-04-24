# 작업지시서: CAI 업스트림 변경 적용 (변경사항 1 & 2)

**일시**: 2026-04-23 (세션 12)  
**참조**: `https://github.com/cai-crete/CAI.git`  
**작업 과정**: 변경사항 1 (artboard-labeling-toolbar-sidebar 계열) + 변경사항 2 (bugfix-and-label 계열)

---

## 변경 범위 요약

| 파일 | 주요 변경 |
|------|----------|
| `types/canvas.ts` | 5개 상수 추가 + 2개 값 수정 |
| `components/NodeCard.tsx` | expand 버튼 재설계 + 더블클릭 expand + blank 스타일 통일 + 배지 동적 라벨 |
| `components/LeftToolbar.tsx` | '+' 드롭다운 메뉴 + 이미지 업로드 |
| `components/RightSidebar.tsx` | 탭 모드 통합 (비활성 판별) + NodePanel planners 분기 + toast 연동 |
| `app/page.tsx` | Auto Layout + 엣지 연결 + createChildNode + handleUploadImage + toast 타입 + duplicateNode 수정 |

---

## Phase 1: canvas.ts

### 추가할 상수

```typescript
// ARTBOARD_COMPATIBLE_NODES.thumbnail 수정
thumbnail: ['planners', 'print'],  // 기존: ['planners']

// NODE_TO_ARTBOARD_TYPE.print 수정
print: 'thumbnail',  // 기존: 'image'

// 새 상수 5개 추가
NODES_NAVIGATE_DISABLED: NodeType[] = ['elevation', 'viewpoint', 'diagram']

PANEL_CTA_MESSAGE: Partial<Record<NodeType, string>> = {
  plan:      '스케치를 선택해 주세요',
  image:     '스케치를 선택해 주세요',
  elevation: '이미지를 선택해 주세요',
  viewpoint: '이미지를 선택해 주세요',
  diagram:   '이미지를 선택해 주세요',
}

NODE_TARGET_ARTBOARD_TYPE: Partial<Record<NodeType, ArtboardType>> = {
  plan: 'image', image: 'image', elevation: 'image',
  viewpoint: 'image', diagram: 'image', print: 'thumbnail',
  planners: 'thumbnail', sketch: 'sketch',
}

NODE_GENERATED_LABEL: Partial<Record<NodeType, string>> = {
  plan: 'PLAN', image: 'IMAGE', elevation: 'ELEVATION',
  viewpoint: 'VIEWPOINT', diagram: 'DIAGRAM',
  print: 'THUMBNAIL', planners: 'THUMBNAIL', sketch: 'SKETCH',
}

DISABLED_TAB_MESSAGE: Partial<Record<NodeType, string>> = {
  elevation: '이미지를 선택해 주세요',
  viewpoint: '이미지를 선택해 주세요',
  diagram:   '이미지를 선택해 주세요',
  plan:      '스케치를 선택해 주세요',
  image:     '스케치를 선택해 주세요',
  planners:  '아트보드를 선택해 주세요',
  print:     '아트보드를 선택해 주세요',
}
```

### 유지할 것
- `SketchPanelSettings` 인터페이스 (로컬 전용)
- `generatedImageData`, `sketchPanelSettings` 필드 (sketch-to-image 전용)
- `'sketch'` in `NODE_ORDER`
- `NODE_DEFINITIONS.plan.displayLabel = 'PLAN'` (GitHub 'SKETCH TO PLAN' 채택 안 함)
- `NODE_DEFINITIONS.image.displayLabel = 'IMAGE'` (GitHub 'SKETCH TO IMAGE' 채택 안 함)

---

## Phase 2: NodeCard.tsx

### 2-1. imports 수정
```typescript
import { ..., NODE_GENERATED_LABEL, NODE_TARGET_ARTBOARD_TYPE } from '@/types/canvas';
```

### 2-2. expand 버튼 재설계
- **제거**: 항상 보이는 expand 버튼 (아트보드 우상단)
- **추가**: `isSelected && artboardType === 'image'` 조건에만 표시되는 expand 버튼

### 2-3. 더블클릭 expand 추가
```typescript
const lastTapTimeRef = useRef<number>(0);

// handleArtboardPointerUp 수정:
if (dx < 6 && dy < 6) {
  const now = Date.now();
  if (now - lastTapTimeRef.current < 300 && !isBlank) {
    lastTapTimeRef.current = 0;
    onExpand(id);  // 더블클릭 → expand (blank 제외)
  } else {
    lastTapTimeRef.current = now;
    onSelect(id);  // 단일 클릭 → 선택
  }
}
```

### 2-4. blank 아트보드 스타일 통일
```typescript
const artboardBorder = 'none';  // 점선 제거
const artboardBoxShadow = isSelected ? '0 0 0 2px var(--color-black), var(--shadow-float)' : 'var(--shadow-float)';
// blank 여부 무관하게 동일한 shadow
```

### 2-5. blank 내부 콘텐츠 수정
- '—' 마크업 제거 → 빈 `<div>` placeholder만 유지

### 2-6. 이미지 표시 수정
```typescript
// objectFit: 'cover' → 'contain'
// src: `data:image/png;base64,${node.thumbnailData}` → node.thumbnailData (직접 사용)
// 분기: artboardType === 'image' && node.thumbnailData → <img>
```

### 2-7. 배지 동적 라벨
```typescript
// 기존: {ARTBOARD_LABEL[artboardType]}
// 신규:
{artboardType === NODE_TARGET_ARTBOARD_TYPE[node.type]
  ? (NODE_GENERATED_LABEL[node.type] || ARTBOARD_LABEL[artboardType])
  : ARTBOARD_LABEL[artboardType]}
```

---

## Phase 3: LeftToolbar.tsx

### 3-1. prop 추가
```typescript
onUploadImage?: (file: File) => void;
```

### 3-2. 드롭다운 상태 추가
```typescript
import { useState, useEffect, useRef } from 'react';
const [isDropdownOpen, setIsDropdownOpen] = useState(false);
const dropdownRef = useRef<HTMLDivElement>(null);
const fileInputRef = useRef<HTMLInputElement>(null);
```

### 3-3. 드롭다운 메뉴
- 외부 클릭 시 닫기 (useEffect + mousedown listener)
- "새 아트보드" 항목 → `onAddArtboard()`
- "이미지 업로드" 항목 → `fileInputRef.current?.click()`
- `<input type="file" accept="image/*" />` hidden input 추가
- '+' 버튼: `onClick` → `setIsDropdownOpen(v => !v)`
- '+' 버튼 배경: `isDropdownOpen ? 'var(--color-gray-700)' : 'var(--color-black)'`

---

## Phase 4: RightSidebar.tsx

### 4-1. imports 추가
```typescript
import { ..., NODES_NAVIGATE_DISABLED, PANEL_CTA_MESSAGE, DISABLED_TAB_MESSAGE } from '@/types/canvas';
```

### 4-2. props 추가
```typescript
hasSelectedArtboard: boolean;
onShowToast: (message: string, type?: 'warning' | 'success') => void;
```

### 4-3. NodePanel 업데이트
- props: `hasSelectedArtboard`, `onShowToast` 추가
- `planners` 타입: GENERATE 버튼 없는 전용 UI 반환
- `handleGenerateClick`: 아트보드 미선택 시 `PANEL_CTA_MESSAGE[type]` 토스트 → 선택 시 onGenerate

### 4-4. SKETCH TOOLS / IMAGE TOOLS 모드 제거
- 기존: sketch/image 아트보드 선택 시 별도 분기 표시
- 신규: 통합 SELECT TOOLS 모드로 모든 탭 상시 표시

### 4-5. 비활성 탭 판별
```typescript
const isTabDisabled = (type: NodeType): boolean => {
  if (!selectedArtboardType) return false;
  if (selectedArtboardType === 'blank') return NODES_NAVIGATE_DISABLED.includes(type);
  const compatible = ARTBOARD_COMPATIBLE_NODES[selectedArtboardType];
  return !compatible.includes(type);
};
```

### 4-6. 탭 버튼 비활성 스타일
- disabled 시: `color: 'var(--color-gray-300)'`, `cursor: 'not-allowed'`
- disabled 탭 클릭: `DISABLED_TAB_MESSAGE[type]` 토스트 표시

---

## Phase 5: page.tsx

### 5-1. imports 수정
```typescript
// 추가
import { ..., NODES_NAVIGATE_DISABLED, NODE_TARGET_ARTBOARD_TYPE } from '@/types/canvas';
import { placeNewChild } from '@/lib/autoLayout';
// 유지: SketchPanelSettings, COL_GAP_PX (handleGenerateComplete에서 사용)
```

### 5-2. Toast 시스템 추가
```typescript
type ToastType = 'warning' | 'success';
interface ToastState { message: string; type: ToastType; visible: boolean; fadingOut: boolean; }

const showToast = useCallback((message: string, type: ToastType = 'warning') => { ... });

// ToastIconWarning, ToastIconSuccess, Toast 컴포넌트 추가
// @keyframes toastSlideUp CSS 추가
```

### 5-3. createAndExpandNode: Auto Layout 통합
```typescript
// 부모 선택 시: placeNewChild로 위치 계산 + pushdowns 적용
// 엣지 자동 생성 (parentId → newNode.id)
// autoPlaced: !!selectedNodeId
```

### 5-4. createChildNode 신규 (elevation/viewpoint/diagram 전용)
```typescript
const createChildNode = useCallback((parentId: string, type: NodeType, artboardType: ArtboardType) => {
  // placeNewChild로 위치 계산
  // 엣지 생성
  // pushHistory
}, [...]);
```

### 5-5. handleReturnFromExpand 업데이트
```typescript
// NODE_TARGET_ARTBOARD_TYPE[n.type] 기반 artboardType 업데이트
// 기존 sketch-image 분기 유지하되 artboardType 업데이트 로직 추가
```

### 5-6. handleUploadImage 신규
```typescript
const handleUploadImage = useCallback((file: File) => {
  // FileReader → dataURL
  // image 아트보드 생성 (artboardType: 'image', thumbnailData: dataUrl)
}, [...]);
```

### 5-7. handleNodeTabSelect 업데이트
```typescript
// NODES_NAVIGATE_DISABLED 검증: image 아트보드만 허용
// createChildNode 호출 분기 추가
```

### 5-8. duplicateNode 수정
```typescript
// hasThumbnail: false 제거 → 원본 속성 그대로 복사
// (thumbnailData, sketchData, generatedImageData 등 모두 보존)
```

### 5-9. 컴포넌트 props 업데이트
```typescript
<LeftToolbar onUploadImage={handleUploadImage} ... />
<RightSidebar hasSelectedArtboard={selectedNodeId !== null} onShowToast={showToast} ... />
```

---

## 체크리스트

- [x] Phase 1: `types/canvas.ts` — 5개 상수 추가, 2개 값 수정
- [x] Phase 2: `components/NodeCard.tsx` — expand 재설계 + 더블클릭 + 스타일 통일 + 배지 동적화
- [x] Phase 3: `components/LeftToolbar.tsx` — 드롭다운 + 이미지 업로드
- [x] Phase 4: `components/RightSidebar.tsx` — 통합 탭 모드 + 비활성 판별 + toast
- [x] Phase 5: `app/page.tsx` — Auto Layout + createChildNode + upload + toast + duplicateNode
- [x] 빌드 확인 (`npm run build` 또는 dev 서버에서 오류 없음)

---

COPYRIGHTS 2026. CRE-TE CO.,LTD. ALL RIGHTS RESERVED.
