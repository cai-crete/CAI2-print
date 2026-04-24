---
title: 아트보드 시스템 origin/main → local master 적용 (260423)
created: 2026-04-23
status: completed
source: https://github.com/cai-crete/CAI.git (origin/main, commit 2fe4c8b)
---

## 목적

origin/main의 아트보드 시스템 변경 사항(커밋 341c17a ~ 2fe4c8b, 4개)을
로컬 master 브랜치에 반영한다.

---

## 변경 범위 요약

### 핵심 개념: ArtboardType 시스템
- `blank` — '+' 버튼으로 생성한 미배정 아트보드 (점선 테두리, 중앙 `—`)
- `sketch` — 스케치 입력용 (image/plan 노드와 호환)
- `image` — 이미지 기반 작업용 (elevation/viewpoint/diagram/print 노드와 호환)
- `thumbnail` — planners 노드 전용

### 동작 흐름 변화
| 이전 | 이후 |
|------|------|
| '+' 버튼 → `sketch` 노드 생성 | '+' 버튼 → `artboardType: 'blank'` 아트보드 생성 |
| 사이드바 탭 클릭 → 항상 새 노드/패널 | 아트보드 선택 상태 → 유형 배정 + expand 진입 |
| 사이드바 항상 동일 | `sketch`/`image` 아트보드 선택 시 → TOOLS 모드 |
| ExpandedView: A4 placeholder만 | sketch/blank → SketchInfiniteGrid (팬+줌 도트 그리드) |

---

## 변경 파일 목록

| 파일 | 변경 성격 |
|------|----------|
| `project_canvas/types/canvas.ts` | ArtboardType + 4개 상수 추가, CanvasNode.artboardType 필드 추가 |
| `project_canvas/app/page.tsx` | handleAddArtboard, handleNodeTabSelect 재설계, selectedArtboardType 파생값 |
| `project_canvas/components/LeftToolbar.tsx` | onAddSketch → onAddArtboard prop 이름 변경 |
| `project_canvas/components/NodeCard.tsx` | artboardType prop, blank 점선 스타일, 유형 배지 |
| `project_canvas/components/RightSidebar.tsx` | 3모드 렌더링 (TOOLS / PANEL / SELECT TOOLS) |
| `project_canvas/components/ExpandedView.tsx` | SketchInfiniteGrid 컴포넌트 추가, onAddArtboard prop |
| `project_canvas/components/InfiniteCanvas.tsx` | artboardType을 NodeCard로 전달 |
| `project_canvas/_context/brand-guidelines.md` | 신규 컨텍스트 문서 (origin/main에서 추가됨) |
| `project_canvas/_context/business-context.md` | 신규 컨텍스트 문서 (origin/main에서 추가됨) |
| `project_canvas/_context/design-style-guide-node.md` | 신규 컨텍스트 문서 (origin/main에서 추가됨) |

> `app/globals.css`, `components/EdgeLayer.tsx`, `lib/autoLayout.ts` — diff 없음, 적용 불필요

---

## 적용 전략

origin/main (2fe4c8b)이 로컬 master의 edge/port 시스템(090a320)을
이미 포함하므로 `git checkout origin/main -- <file>` 으로 파일별 안전 교체 가능.
소스 파일에 로컬 전용 미커밋 변경 없어 merge 충돌 없음.

---

## Phase 체크리스트

### Phase 1 — 소스 파일 교체
- [x] `git checkout origin/main -- project_canvas/types/canvas.ts`
- [x] `git checkout origin/main -- project_canvas/app/page.tsx`
- [x] `git checkout origin/main -- project_canvas/components/LeftToolbar.tsx`
- [x] `git checkout origin/main -- project_canvas/components/NodeCard.tsx`
- [x] `git checkout origin/main -- project_canvas/components/RightSidebar.tsx`
- [x] `git checkout origin/main -- project_canvas/components/ExpandedView.tsx`
- [x] `git checkout origin/main -- project_canvas/components/InfiniteCanvas.tsx`

### Phase 2 — 신규 컨텍스트 파일 추가
- [x] `git checkout origin/main -- project_canvas/_context/brand-guidelines.md`
- [x] `git checkout origin/main -- project_canvas/_context/business-context.md`
- [x] `git checkout origin/main -- project_canvas/_context/design-style-guide-node.md`

### Phase 3 — TypeScript 빌드 검증
- [x] `cd project_canvas && npm run build` → 에러 0 ✓ (Compiled successfully in 5.4s)

### Phase 4 — 브라우저 검증 (http://localhost:3900)
- [ ] '+' 버튼 → 빈 아트보드 생성 (점선 테두리, 중앙 `—`) 확인
- [ ] 빈 아트보드 선택 → 우측 사이드바 SELECT TOOLS 모드 확인
- [ ] 빈 아트보드 선택 + `IMAGE` 탭 클릭 → artboardType: 'sketch' 배정 + ExpandedView 오픈 확인
- [ ] sketch 아트보드 선택 → 우측 사이드바 "SKETCH TOOLS" 모드 (IMAGE / PLAN 탭만) 확인
- [ ] sketch 아트보드 ExpandedView → SketchInfiniteGrid (도트 그리드, 팬/줌) 확인
- [ ] 기존 demo 엣지 (planners → plan → image) 정상 렌더 확인 (회귀 없음)
- [ ] NodeCard 하단 artboardType 배지 표시 확인 (blank 카드 제외)

---

## 코드 변경 상세

### `types/canvas.ts` 신규 추가
```ts
export type ArtboardType = 'blank' | 'sketch' | 'image' | 'thumbnail';

// CanvasNode 인터페이스에 필드 추가
artboardType: ArtboardType;

// 신규 상수
export const ARTBOARD_COMPATIBLE_NODES: Record<Exclude<ArtboardType, 'blank'>, NodeType[]>
export const NODE_TO_ARTBOARD_TYPE: Partial<Record<NodeType, ArtboardType>>
export const NODES_THAT_EXPAND: NodeType[]   // ['image', 'plan', 'print', 'planners']
export const ARTBOARD_LABEL: Record<Exclude<ArtboardType, 'blank'>, string>
```

### `app/page.tsx` handleNodeTabSelect 재설계
```
아트보드 선택된 경우:
  blank → 탭 클릭 → artboardType + type 배정
  NODES_THAT_EXPAND 해당 → setExpandedNodeId(selectedNode.id)
  setActiveSidebarNodeType(null) → return

아트보드 미선택:
  DIRECT_EXPAND_NODES → createAndExpandNode (기존과 동일)
  기타 → activeSidebarNodeType 토글
```

### `components/RightSidebar.tsx` 3모드 렌더링
```
selectedArtboardType === 'sketch' | 'image'  → TOOLS 모드 (호환 탭 목록)
activeSidebarNodeType !== null               → PANEL 모드 (기존 동작)
else                                         → SELECT TOOLS 아코디언 (기존 동작)
```

### `components/ExpandedView.tsx` SketchInfiniteGrid
```ts
const isSketchMode = node.artboardType === 'sketch' || node.artboardType === 'blank';
// true  → <SketchInfiniteGrid /> (팬·줌 독립적인 도트 그리드, useRef 내부 구현)
// false → 기존 A4 비율 placeholder
```
