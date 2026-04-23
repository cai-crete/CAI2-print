# Exec-Plan: 아트보드 시스템 리디자인 v1

**작성일**: 2026-04-23  
**담당**: AGENT C (디자인·프론트엔드)  
**우선순위**: High

---

## 목표

A. '+' 버튼 → 기능이 정해지지 않은 빈 아트보드 추가  
B. 아트보드 유형 라벨링 (blank / sketch / image / thumbnail)  
C. sketch 아트보드 확장 시 무한 그리드 뷰 (드로잉 도구 미구현)

---

## 설계 요약 (Design Brief 확정)

### 아트보드 유형 분류

| ArtboardType | 배정 조건 | 사이드바 탭 | 직접 실행 |
|---|---|---|---|
| `blank` | '+' 버튼 | SELECT TOOLS 전체 | — |
| `sketch` | IMAGE / PLAN 탭 클릭 | IMAGE, PLAN | expand 진입 |
| `image` | ELEVATION / VIEWPOINT / DIAGRAM / PRINT 탭 클릭 | ELEVATION, VIEWPOINT, DIAGRAM, PRINT | 인-캔버스(EL/VP/DI), expand(PRINT) |
| `thumbnail` | PLANNERS 탭 클릭 / PRINT generate 후 | PLANNERS | expand 진입 |

### 핵심 인터랙션

- **아트보드 선택 + 사이드바 탭 클릭** → 패널 없이 즉시 기능 작동
- **아트보드 미선택 + 사이드바 탭 클릭** → 기존 패널 동작 유지
- **ELEVATION / VIEWPOINT / DIAGRAM**: 인-캔버스 실행 (현재 no-op, 추후 구현)
- **PRINT**: image 아트보드에서 expand 진입

---

## 변경 파일 체크리스트

### 1. `project_canvas/types/canvas.ts`
- [ ] `ArtboardType = 'blank' | 'sketch' | 'image' | 'thumbnail'` 추가
- [ ] `CanvasNode.artboardType: ArtboardType` 필드 추가
- [ ] `NODE_TO_ARTBOARD_TYPE` 매핑 상수 추가
- [ ] `ARTBOARD_COMPATIBLE_NODES` 필터링 상수 추가
- [ ] `NODES_THAT_EXPAND` 상수 추가
- [ ] `ARTBOARD_LABEL` 배지 텍스트 상수 추가

### 2. `project_canvas/app/page.tsx`
- [ ] `handleCreateEmptySketch` → `handleAddArtboard` 리네임 (blank 생성)
- [ ] `handleNodeTabSelect` 재작성 (artboard selected → 직접 액션)
- [ ] `handleNodeCardSelect` 수정 (thumbnail artboard 선택 시 자동 패널)
- [ ] `createAndExpandNode` artboardType 할당 추가
- [ ] `handleReturnFromExpand` 유지 (hasThumbnail 로직 그대로)
- [ ] `selectedArtboardType` 파생값 계산 후 RightSidebar 전달
- [ ] LeftToolbar `onAddSketch` → `onAddArtboard` 전달

### 3. `project_canvas/components/LeftToolbar.tsx`
- [ ] Props: `onAddSketch` → `onAddArtboard` 리네임
- [ ] 버튼 title: "새 스케치 아트보드 추가" → "새 아트보드 추가"

### 4. `project_canvas/components/NodeCard.tsx`
- [ ] `artboardType: ArtboardType` prop 추가
- [ ] blank: 점선 테두리 (`border: '1.5px dashed var(--color-gray-200)'`)
- [ ] blank: "—" 플레이스홀더 (`#CCCCCC`)
- [ ] blank: 유형 배지 없음
- [ ] typed: 내부 하단 좌측에 유형 배지 (SKETCH / IMAGE / THUMBNAIL, `#999999`, Bebas 0.625rem)

### 5. `project_canvas/components/RightSidebar.tsx`
- [ ] Props: `selectedArtboardType: ArtboardType | null` 추가
- [ ] sketch 아트보드 선택 시: "SKETCH TOOLS" 헤더 + IMAGE, PLAN 탭만
- [ ] image 아트보드 선택 시: "IMAGE TOOLS" 헤더 + ELEVATION, VIEWPOINT, DIAGRAM, PRINT 탭만
- [ ] thumbnail / blank: 기존 SELECT TOOLS + 패널 동작 유지

### 6. `project_canvas/components/ExpandedView.tsx`
- [ ] `node.artboardType === 'sketch'` 또는 `'blank'` 시: 무한 그리드 레이아웃 (A4 프레임 제거)
- [ ] 그리드: InfiniteCanvas 배경과 동일 패턴 재사용
- [ ] 실제 드로잉 도구 미구현 (추후 개발)

### 7. `project_canvas/components/InfiniteCanvas.tsx`
- [ ] NodeCard에 `artboardType` prop 전달

---

## 데이터 모델 변경

### CanvasNode (before → after)
```typescript
// Before
interface CanvasNode {
  id: string;
  type: NodeType;
  title: string;
  position: { x: number; y: number };
  instanceNumber: number;
  hasThumbnail: boolean;
  thumbnailData?: string;
  parentId?: string;
  autoPlaced?: boolean;
}

// After
interface CanvasNode {
  ...위 동일...
  artboardType: ArtboardType;  // NEW
}
```

### '+' 버튼 생성 노드
```typescript
{
  type: 'sketch',         // 기본값 (legacy 호환)
  artboardType: 'blank',  // NEW — 유형 미지정
  title: `ARTBOARD #${num}`,
}
```

---

## 오픈 이슈 (추후 구현)

- ELEVATION / VIEWPOINT / DIAGRAM 인-캔버스 실행 로직
- PRINT generate 후 thumbnail 아트보드 자동 생성
- image 아트보드 생성 경로 (sketch generate 결과물)
- 아트보드 유형 재배정 정책

---

`COPYRIGHTS 2026. CRE-TE CO.,LTD. ALL RIGHTS RESERVED.`