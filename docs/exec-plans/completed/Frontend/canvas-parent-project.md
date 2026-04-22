![alt text](image.png)# 작업지시서 — CAI CANVAS 부모 프로젝트 구축

**생성일**: 2026-04-21  
**완료일**: 2026-04-21  
**담당 에이전트**: AGENT C (디자인 에이전트)  
**프로젝트**: project_canvas/  
**목적**: 7개 노드를 한 화면에서 관리하는 무한 캔버스 부모 앱 구축 (API 연동 보류)

---

## 요구사항 요약

무한 캔버스 위에 7개의 노드 썸네일을 배치하고 관리하는 Next.js 앱.
`design-style-guide-CAI.md` 디자인 시스템 기준 적용.
데스크탑 및 태블릿 최적화.

---

## 최종 구현 구조

```
project_canvas/
├── app/
│   ├── layout.tsx           ← Bebas Neue (Google Fonts), 메타데이터
│   ├── page.tsx             ← 전체 상태 관리 (nodes, history, viewport, 선택, 확장)
│   └── globals.css          ← 디자인 토큰 §A.1~§A.9, 폰트, 유틸 클래스
├── components/
│   ├── InfiniteCanvas.tsx   ← 무한 그리드, 팬/줌, 선택 로직 (드래그 임계값 6px)
│   ├── LeftToolbar.tsx      ← 좌측 플로팅 툴바 (원형 CTA + Pill)
│   ├── NodeCard.tsx         ← 아트보드 카드 (선택 상태, 액션바, expand)
│   ├── RightSidebar.tsx     ← 7개 독립 pill 버튼 사이드바
│   └── ExpandedView.tsx     ← 확장 뷰 (축소 CTA + 워크스페이스 + 아코디언 사이드바)
├── types/
│   └── canvas.ts            ← CanvasNode, NODE_DEFINITIONS, toScreen/toWorld
├── package.json
├── tsconfig.json
├── next.config.ts
└── postcss.config.mjs
```

---

## 체크리스트

### 0. 프로젝트 기반
- [x] 작업지시서 생성
- [x] package.json — Next.js 15, React 19, Tailwind CSS v4
- [x] tsconfig.json
- [x] next.config.ts
- [x] postcss.config.mjs
- [x] types/canvas.ts — CanvasNode, ActiveTool, NODE_DEFINITIONS, toScreen/toWorld

### 1. 스타일 시스템
- [x] globals.css — 디자인 토큰 (§A.1~§A.9), 폰트 변수, `.toolbar-btn`, `.icon-frame`, `.divider-*`, `.no-scrollbar`

### 2. 레이아웃
- [x] layout.tsx — Bebas Neue (Google Fonts), 메타데이터, HTML 구조
- [x] page.tsx — nodes, history(undo/redo), viewport(scale/offset), activeTool, selectedNodeId, expandedNodeId, sidebarOpen/Expanded 상태 통합 관리

### 3. 컴포넌트 — 1차 구현

- [x] LeftToolbar.tsx
  - [x] cursor / handle 툴 토글
  - [x] undo / redo 버튼
  - [x] zoom +, N%, - + 배율 리셋
  - [x] 원형 추가 버튼 CTA (단독 분리)
- [x] NodeCard.tsx (1차)
  - [x] caption 텍스트 (상단 좌측 외부)
  - [x] 헤더: 편집 가능한 타이틀 + kebab 메뉴
  - [x] 아트보드: 흰 보드 + expand 버튼 (우측 하단)
  - [x] kebab → duplicate / download / delete
- [x] RightSidebar.tsx (1차)
  - [x] SELECT TOOLS 헤더 + 사이드바 토글
  - [x] 드롭다운: 7개 노드 버튼 (단일 패널)
  - [x] + ADD TOOLS 정적 버튼
- [x] InfiniteCanvas.tsx (1차)
  - [x] 무한 그리드 (CSS background, 동적 position/size)
  - [x] 마우스 드래그 팬 (handle 툴)
  - [x] 휠 줌 — 마우스 포인터 기준 확대/축소
  - [x] NodeCard 렌더링 (canvas 좌표계)
  - [x] 노드 드래그 이동 (cursor 툴)
  - [x] Ctrl+Z / Ctrl+Shift+Z 키보드 단축키

### 4. 컴포넌트 — 2차 수정 (UI 전용 + 구조 수정)

#### [UI 전용]
- [x] **아이콘 전면 교체** — 모든 stroke `strokeLinecap/Linejoin="round"` 적용. Undo/Redo U-턴 화살표, Hand 손 형태로 직관성 개선
- [x] **내부 버튼 곡률 통일** — Pill 컨테이너 내부 버튼 모두 `radius-pill` 적용 (외부 곡률과 통일). 이후 동일 원칙 유지
- [x] **Expand 버튼** — hover 전용 제거 → 항상 표시 (태블릿 대응). 위치: 아트보드 내부 우측 상단
- [x] **사이드바 버튼 분리** — 단일 패널 → 7개 독립 pill (각각 별도 `shadow-float`, 간격 6px)

#### [구조 수정]
- [x] **NodeCard 재설계** — 헤더·캡션 완전 제거. 아트보드만 남김
  - [x] 아트보드 클릭 → 선택 (2px black outline)
  - [x] 선택 시: 복제/다운로드/삭제 아이콘바 상단 좌측 고정 (항상 노출, 아이콘 전용, 수평 레이아웃)
  - [x] 아트보드 외부 클릭 → 선택 해제
- [x] **InfiniteCanvas 선택 로직**
  - [x] 드래그 임계값 6px — 이하: 클릭(선택), 이상: 드래그(이동)
  - [x] 배경 클릭 → `onNodeDeselect()` 호출
  - [x] `selectedNodeId` prop 추가
  - [x] `onNodeExpand`, `onNodeSelect`, `onNodeDeselect` 콜백 추가
- [x] **ExpandedView 신규 구현** (임시 테스트 화면 포함)
  - [x] 좌측 중앙: 원형 `축소` CTA (black, 52px, shadow-float)
  - [x] 중앙: 노드 워크스페이스 플레이스홀더
  - [x] 우측: 7개 노드별 아코디언 패널 — 현재 노드 기본 열림, 탭 클릭 접힘/펼침
  - [x] ESC 키로 캔버스 복귀
- [x] **page.tsx 상태 확장**
  - [x] `selectedNodeId` — 선택된 노드 ID
  - [x] `expandedNodeId` — 확장 중인 노드 ID
  - [x] 조건부 렌더링: 캔버스 뷰 / 확장 뷰

---

## 디자인 컴플라이언스 체크

- [x] 폰트: Bebas Neue (타이틀/CTA), 시스템폰트 Pretendard 폴백
- [x] 컬러: 흑백 7색 체계 (§A.3) — 유채색 0개
- [x] 버튼 높이: §A.4 기준 준수 (52px CTA-primary, 44px 툴바)
- [x] shadow-float 전용 — 테두리 없음 (§A.7.2)
- [x] 아이콘: 24px 프레임 / 20px 실질 크기 (§A.9)
- [x] hover/active 인터랙션 전환 150ms/80ms (§A.8)
- [x] Pill 내부 요소 곡률 통일 원칙 적용
- [x] 태블릿 대응 — hover 전용 CTA 제거

---

## 실행 방법

```bash
cd project_canvas
npm install
npm run dev   # → http://localhost:3900
```

---

`COPYRIGHTS 2026. CRE-TE CO.,LTD. ALL RIGHTS RESERVED.`
