# 작업지시서: 노드 실행 및 썸네일 로직 전면 개편

- **분류**: Frontend
- **작성일**: 2026-04-22
- **작성자**: AGENT C (디자인 에이전트)
- **상태**: 승인 대기 → 구현 예정

---

## 배경 및 목표

기존 노드 탭 클릭 → 썸네일 즉시 추가 방식을 폐기하고, 사이드바 패널 기반 노드 실행 흐름으로 전면 재설계한다.

- **제거**: LeftToolbar 추가 버튼, 노드 탭 클릭 시 즉시 addNode 호출
- **도입**: 노드 탭 선택 → 패널 열림 → (CTA 또는 "→" 버튼) → expand 진입 → 돌아올 때 썸네일 생성

---

## 확정된 설계 결정

| 항목 | 결정 |
|------|------|
| 즉시 expand 진입 노드 | `planners`, `image` |
| 썸네일 생성 트리거 | expand에서 돌아오는 시점에 항상 생성 (임시 로직) |
| 사이드바 패널 전환 | SELECT TOOLS 헤더 텍스트 교체 + 아코디언 → 패널 대체 |
| 캔버스 뷰 이동 버튼 | "→" 아이콘 pill (노드 탭 선택 시에만 노출) |
| 빈 캔버스 클릭 시 | 패널 닫힘 + SELECT TOOLS 복귀 |
| 썸네일 단일 선택 시 | 해당 노드 타입 패널 자동 열림 |
| 다중 선택 시 | 패널 열리지 않음, SELECT TOOLS 유지 |
| 통합 사이드바 상태 | `activeSidebarNodeType: NodeType \| null` 단일 state |

---

## 영향 범위 (파일별)

```
project_canvas/
├── types/canvas.ts              ← CanvasNode에 썸네일 필드 추가
├── app/page.tsx                 ← 상태 재설계, 핸들러 정비
├── components/RightSidebar.tsx  ← 패널 전환 로직 전면 개편
├── components/NodeCard.tsx      ← 썸네일 렌더링 추가
├── components/ExpandedView.tsx  ← onCollapse 시 thumbnail 콜백 호출
└── components/LeftToolbar.tsx   ← 추가 버튼 제거
```

---

## 상세 구현 체크리스트

### PHASE 1 — 타입 및 상태 기반 정비

- [x] **1-1** `types/canvas.ts`: `CanvasNode`에 `hasThumbnail: boolean` 및 `thumbnailData?: string` 필드 추가
  - `INITIAL_NODES` 생성 시 `hasThumbnail: false`로 초기화
- [x] **1-2** `app/page.tsx`: `activeSidebarNodeType: NodeType | null` state 추가
- [x] **1-3** `app/page.tsx`: `addMessage` state 및 관련 토스트 UI 제거 (추가 버튼 폐기에 따른 정리)
- [x] **1-4** `app/page.tsx`: `addNode` 함수를 expand 진입 전용 `createAndExpandNode(type: NodeType)` 로 리팩터
  - 호출 시: 새 `CanvasNode` 생성(`hasThumbnail: false`) → `pushHistory` → `setExpandedNodeId`
- [x] **1-5** `app/page.tsx`: `handleReturnFromExpand()` 함수 신설
  - `expandedNodeId`가 있는 경우 해당 노드의 `hasThumbnail: true`로 갱신 → `pushHistory`
  - 이후 `setExpandedNodeId(null)` 호출

---

### PHASE 2 — RightSidebar 전면 개편

현재 구조(SELECT TOOLS 토글 + 아코디언 7개)를 아래 로직으로 교체한다.

#### 상태별 UI

| 상태 | 헤더 텍스트 | 본문 |
|------|------------|------|
| `activeSidebarNodeType === null` | SELECT TOOLS + 화살표(▼/▲) | 아코디언 7개 |
| `activeSidebarNodeType !== null` | 해당 노드 displayLabel + 화살표(▼/▲) | 해당 노드 패널 |

- [x] **2-1** Props 인터페이스 변경
- [x] **2-2** 헤더 pill: `activeSidebarNodeType` 유무에 따라 텍스트 분기
- [x] **2-3** 아코디언 목록: `activeSidebarNodeType === null`일 때만 렌더링
- [x] **2-4** "→" 이동 버튼 pill: `activeSidebarNodeType !== null`일 때만 헤더 왼쪽에 렌더링
- [x] **2-5** 패널 영역: `activeSidebarNodeType !== null`일 때 헤더 아래에 렌더링 (Generate CTA 포함)
- [x] **2-6** `sidebarExpanded` state를 `RightSidebar` 내부 `accordionOpen`으로 이전

---

### PHASE 3 — page.tsx 핸들러 정비

- [x] **3-1** `handleNodeTabSelect(type)` 신설 (토글 로직)
- [x] **3-2** `handleNodeCardSelect(id)` — 단일 선택 + `activeSidebarNodeType` 연동
- [x] **3-3** `handleNodeDeselect()` — 선택 해제 + 패널 닫힘
- [x] **3-4** `handleNavigateToExpand(type)` — 기존 노드 재사용 또는 신규 생성
- [x] **3-5** `planners`, `image` 즉시 expand 분기 (`DIRECT_EXPAND_NODES`)
- [x] **3-6** `handleReturnFromExpand` → `onCollapse` 연결
- [x] **3-7** `RightSidebar` props 교체 완료
- [x] **3-8** `onAddClick` + `addMessage` 토스트 제거 완료

---

### PHASE 4 — NodeCard 썸네일 렌더링

- [x] **4-1** Props에 `hasThumbnail: boolean` 추가
- [x] **4-2** 아트보드 내부 플레이스홀더 분기 (그라디언트 썸네일 / 빈 플레이스홀더)

---

### PHASE 5 — ExpandedView 콜백 연결

- [x] **5-1** `onCollapse` → `handleReturnFromExpand` 연결 (page.tsx에서)
- [x] **5-2** Escape 키 핸들러도 `handleReturnFromExpand` 호출로 변경

---

### PHASE 6 — LeftToolbar 추가 버튼 제거

- [x] **6-1** `LeftToolbar.tsx`에서 `onAddClick` prop 및 추가 버튼 UI 완전 제거
- [x] **6-2** `hideAddButton` prop도 함께 제거
- [x] **6-3** `ExpandedView`에서 `onAddClick={() => {}}` 및 `hideAddButton` 전달 제거

---

## 아이콘 명세

| 위치 | 아이콘 | SVG path |
|------|--------|----------|
| 캔버스 뷰 사이드바 이동 버튼 | → (right arrow) | `M4 10H16M11 5L16 10L11 15` |
| expand 뷰 축소 버튼 | ← (left arrow, 기존 유지) | `M16 10H4M9 5L4 10L9 15` |

---

## 임시 패널 플레이스홀더 명세

모든 노드 패널(planners·image 제외)은 동일한 임시 구조를 사용한다.

```
[패널 pill - radius-box]
  ┌──────────────────────────┐
  │  (중앙)                   │
  │  {displayLabel}          │  text-title, gray-300
  │  ──────────────          │  구분선
  │  API 연동 후 활성화       │  text-caption, gray-300
  │                          │
  │  [  GENERATE  ]          │  CTA 버튼, bottom-fixed
  └──────────────────────────┘
```

Generate 버튼: `--h-cta-lg`, `radius-pill`, `color-black` bg, `color-white` text, Bebas Neue

---

## 상태 흐름 다이어그램

```
캔버스 뷰
  │
  ├─ 사이드바 노드탭 클릭 (planners/image)
  │     └─ createAndExpandNode → expand 뷰 진입
  │
  ├─ 사이드바 노드탭 클릭 (기타 5종)
  │     └─ activeSidebarNodeType 변경 → 패널 열림
  │           └─ "→" 버튼 or Generate 클릭
  │                 └─ createAndExpandNode → expand 뷰 진입
  │
  ├─ 캔버스 썸네일 단일 클릭 (hasThumbnail: true)
  │     └─ selectedNodeId + activeSidebarNodeType 변경 → 패널 열림
  │           └─ "→" 버튼 or Generate 클릭
  │                 └─ 기존 노드 expand (새 노드 생성 없음)
  │
  └─ 빈 캔버스 클릭
        └─ selectedNodeId: null + activeSidebarNodeType: null → SELECT TOOLS 복귀

expand 뷰
  └─ "←" 버튼 or Escape
        └─ handleReturnFromExpand:
              (1) expandedNode.hasThumbnail = true (항상)
              (2) pushHistory
              (3) setExpandedNodeId(null) → 캔버스 뷰 복귀
```

---

## 구현 순서

1. PHASE 1 (타입·상태)
2. PHASE 6 (추가 버튼 제거 — 의존성 없음)
3. PHASE 2 (RightSidebar 재설계)
4. PHASE 3 (page.tsx 핸들러)
5. PHASE 4 (NodeCard 썸네일)
6. PHASE 5 (ExpandedView 콜백)
7. 전체 수동 검증

---

## 검증 체크리스트

- [x] TypeScript 오류 없음 (`npx tsc --noEmit` 통과)
- [x] Next.js 빌드 성공 (`npm run build` ✓)
- [ ] 사이드바 `planners` 탭 클릭 → 즉시 expand 진입, 캔버스에 노드 생성 (수동 검증 필요)
- [ ] 사이드바 `image` 탭 클릭 → 즉시 expand 진입 (수동 검증 필요)
- [ ] 사이드바 `plan` 탭 클릭 → 패널 열림, "→" 버튼 노출 (수동 검증 필요)
- [ ] 사이드바 `plan` 탭 재클릭 → SELECT TOOLS 복귀, 아코디언 노출 (수동 검증 필요)
- [ ] "→" 버튼 클릭 → expand 진입, canvas에 plan 노드 추가 (수동 검증 필요)
- [ ] expand에서 "←" 클릭 → canvas 복귀, 해당 노드 hasThumbnail: true (수동 검증 필요)
- [ ] 썸네일 카드 클릭 → 해당 노드 타입 패널 자동 열림 (수동 검증 필요)
- [ ] 빈 캔버스 클릭 → 패널 닫힘, SELECT TOOLS 복귀 (수동 검증 필요)
- [ ] Escape 키 → expand에서 canvas 복귀 + 썸네일 생성 (수동 검증 필요)
