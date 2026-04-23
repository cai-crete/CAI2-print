# Frontend Plan — image 아트보드 라벨 통합 · expand 버튼 복구 · 사이드바 전체 노드 상시 노출

> 이 문서는 살아있는 문서(living document)입니다.
> 작업을 진행하면서 발견, 결정, 진행 상황을 이 문서에 지속적으로 업데이트합니다.
> 이전 맥락이나 기억 없이, 이 문서만으로 작업을 완수할 수 있을 만큼 자급자족해야 합니다.
>
> 작업 완료 시 `completed/Frontend/` 폴더로 이동합니다.

> **⚠️ 작성 규칙 — Agent 필독**
> 이 템플릿을 복사해 exec-plan을 작성할 때 아래 규칙을 반드시 지킵니다.
> 1. `[...]` 플레이스홀더가 하나라도 남아 있으면 유효한 exec-plan이 아닙니다.
> 2. **개요 · 목표 · 영향 범위 · 디자인 기준 체크 · Progress** 5개 섹션은 모두 실제 내용으로 채워야 합니다.
> 3. Progress 항목에는 반드시 대상 파일명이 명시되어야 합니다 (Gate C 통과 조건).
> 4. 영향 범위 표의 파일 경로는 실제 존재하는 경로여야 합니다.
> 5. 위 조건을 충족하지 못한 상태로 작업을 시작하면 핵심 금지 행동 위반입니다.

---

## 개요

- **작업 유형**: UX 개선 · 컴포넌트 수정
- **대상 노드**: 공통 (Canvas 앱 전체)
- **관련 디자인 기준**: ARCHITECTURE.md · FRONTEND.md · design-style-guide-CAI.md
- **시작일**: 2026-04-23
- **선행 작업**: `Frontend_artboard-labeling-toolbar-sidebar.md` (completed)

---

## 목표

이 작업이 완료되면 아래 세 가지 UI/UX가 변경됩니다:

1. **image 아트보드 라벨 단일화**: 기존 `imageStatic` / `imageEditable` 두 유형을 하나의 `image` 라벨로 통합하고, 모든 image 아트보드에서 스케치가 가능하도록 합니다.
2. **image 아트보드 전용 expand 버튼 복구**: image 아트보드에만 expand 버튼을 다시 표시하여, 확대 후 바로 스케치할 수 있도록 합니다. 기존 더블클릭/더블탭 로직도 유지합니다.
3. **사이드바 7개 노드 탭 상시 노출**: 아트보드 유형에 관계없이 사이드바에 7개 노드 탭이 항상 보이되, 트리거 조건이 맞지 않는 노드는 동작만 차단합니다.

---

## 현재 상태 분석 (As-Is)

### A. image 아트보드 라벨링 — 이중 분리

현재 `ArtboardType`에 `imageStatic`과 `imageEditable` 두 유형이 존재합니다.

| 타입 | 용도 | 관련 파일 |
|------|------|----------|
| `imageStatic` | 단순 이미지 표시 전용 (스케치 불가) | `types/canvas.ts:32` |
| `imageEditable` | 스케치 가능한 이미지 (연필 버튼으로 전환) | `types/canvas.ts:32` |

- `NodeCard.tsx:160-170` — `imageStatic` 선택 시만 연필(pencil) 버튼이 나타남
- `NodeCard.tsx:245` — `imageStatic || imageEditable` 분기로 이미지 렌더링
- `ARTBOARD_LABEL` — `imageStatic: 'IMAGE'`, `imageEditable: 'IMAGE (EDIT)'`

### B. expand 버튼 — 전면 삭제 상태

이전 작업(Phase 8)에서 모든 아트보드의 expand 버튼을 삭제하고, 더블클릭/더블탭(300ms)으로 대체했습니다.

- `NodeCard.tsx:97-115` — `handleArtboardPointerUp` 내 더블탭 감지 → `onExpand(id)` 호출
- `IconExpand` 컴포넌트 삭제됨

### C. 사이드바 — 아트보드 유형별 선별 노출

현재 `RightSidebar.tsx`는 아트보드 유형에 따라 서로 다른 노드 탭만 보여줍니다:

| 아트보드 유형 | 보이는 노드 탭 | 코드 위치 |
|-------------|-------------|----------|
| `sketch` | image, plan (2개만) | `RightSidebar.tsx:150-173` |
| `imageStatic` / `imageEditable` | elevation, viewpoint, diagram (3개만) | `RightSidebar.tsx:150-173` |
| `thumbnail` | 패널 모드 진입 | `RightSidebar.tsx:179-249` |
| `blank` / 미선택 | 7개 전체 (SELECT TOOLS) | `RightSidebar.tsx:252-281` |

- `ARTBOARD_COMPATIBLE_NODES` 상수가 유형별 호환 노드 목록을 정의
- `ARTBOARD_TOOLS_LABEL` — `SKETCH TOOLS` / `IMAGE TOOLS` 헤더 표시
- `SELECT TOOLS` 라벨은 blank/미선택 시 7개 전체 표시용

---

## 변경 사항 상세 (To-Be)

### A. image 아트보드 라벨 단일화

#### 타입 통합

| 현재 | 변경 후 | 의미 |
|------|---------|------|
| `imageStatic` | `image` | 단일 image 유형 (항상 스케치 가능) |
| `imageEditable` | 삭제 | 더 이상 분리 불필요 |

#### 관련 상수 업데이트

| 상수 | 변경 내용 |
|------|----------|
| `ArtboardType` | `'imageStatic' \| 'imageEditable'` → `'image'`로 통합 |
| `ARTBOARD_COMPATIBLE_NODES` | `imageStatic`, `imageEditable` 키 → `image` 단일 키로 통합. **`image`의 호환 노드에 `print` 포함** (image는 print의 트리거) |
| `NODE_TO_ARTBOARD_TYPE` | elevation/viewpoint/diagram → `'image'` |
| `ARTBOARD_LABEL` | `imageStatic`, `imageEditable` → `image: 'IMAGE'` |
| `ARTBOARD_TOOLS_LABEL` (RightSidebar 내부) | `imageStatic`, `imageEditable` → 삭제 (사이드바 로직 변경으로 불필요) |
| `NODE_DEFINITIONS` | `image.displayLabel`: `'IMAGE'` → `'SKETCH TO IMAGE'`, `plan.displayLabel`: `'PLAN'` → `'SKETCH TO PLAN'` (NodeType과 ArtboardType 혼동 방지) |

#### 연필 버튼 제거

- `NodeCard.tsx` — `imageStatic` 전용 연필 버튼 및 `onConvertToEditable` prop 삭제
- `page.tsx` — `handleConvertToEditable` 콜백 삭제
- `InfiniteCanvas.tsx` — `onNodeConvertToEditable` prop 삭제

#### localStorage 마이그레이션 업데이트

- `lsLoadItems` — 기존 `imageStatic`, `imageEditable` → `'image'`로 통합 변환

### B. image 아트보드 전용 expand 버튼 복구

#### UI 변경

- `NodeCard.tsx` — `artboardType === 'image'`인 아트보드에만 expand 버튼을 액션 바에 추가
- expand 아이콘: 기존 삭제된 `IconExpand` 재구현 (4방향 화살표 SVG)
- 버튼 위치: 액션 바(상단) 좌측 첫 번째 (복제·다운로드·삭제 앞)
- 버튼 클릭 시 `onExpand(id)` 호출
- **기존 더블클릭/더블탭 로직은 유지** — 두 경로 모두 expand 가능

#### 스케치 데이터 분리 기반 구축

> **핵심 설계**: image 아트보드에 스케치 후, 다른 노드(ELEVATION, VIEWPOINT, DIAGRAM, PRINT)가 해당 image를 트리거로 사용할 때 **원본 이미지만** 인식하고 스케치 레이어는 무시해야 합니다.

- `CanvasNode` 인터페이스에 `sketchData?: string` 필드 추가 — 스케치 레이어 데이터 저장용
- `thumbnailData` — 원본 이미지 데이터 (변경 없음, 노드 트리거 시 이 값만 참조)
- 추후 노드 API 연동 시: `node.thumbnailData`(원본 이미지)만 전달, `node.sketchData`(스케치 오버레이)는 전달하지 않음
- **이번 작업 범위**: 필드 추가 + 구조 문서화만 수행. 실제 스케치 드로잉 기능 구현은 별도 작업.

> **UX 설계 근거** (shape 스킬 — Interaction Model): expand 버튼을 image 전용으로 복구함으로써 "이미지 → 스케치"라는 흐름의 진입점을 명시적으로 제공합니다. 더블클릭은 파워유저 단축 경로로 유지하되, 첫 사용자에게는 시각적 어포던스(expand 버튼)가 필수입니다.

> **UX 설계 근거** (critique 스킬 — Nielsen #6 Recognition Rather Than Recall): expand 가능한 아트보드를 버튼으로 명시함으로써 사용자가 "이 아트보드는 확대 가능한가?"를 기억할 필요 없이 즉시 인식할 수 있습니다.

### C. 사이드바 7개 노드 탭 상시 노출

#### 핵심 변경

아트보드 유형에 관계없이 사이드바에 **항상 7개 노드 탭**이 보여야 합니다.

| As-Is | To-Be |
|-------|-------|
| `sketch` 선택 → 2개 탭만 표시 | 7개 탭 전체 표시, 비호환 노드는 비활성 스타일 |
| `image` 선택 → 3개 탭만 표시 | 7개 탭 전체 표시, 비호환 노드는 비활성 스타일 |
| `SELECT TOOLS` 헤더 → blank/미선택 전용 | 모든 상태에서 `SELECT TOOLS` 헤더 유지 |

#### 비활성 노드 탭 스타일

트리거가 맞지 않는 노드 탭은 **동작만 차단**되며, 시각적으로 비활성 상태를 표현합니다:

| 속성 | 활성 탭 | 비활성 탭 |
|------|--------|----------|
| 텍스트 색상 | `var(--color-black)` | `var(--color-gray-300)` |
| 커서 | `pointer` | `not-allowed` |
| 클릭 동작 | 기존 로직 수행 | 토스트 메시지 표시 |
| Hover 배경 | `var(--color-gray-100)` | 없음 (변화 없음) |

> **UX 설계 근거** (critique 스킬 — Nielsen #1 Visibility of System Status): 모든 노드가 항상 보이되 비활성 상태가 시각적으로 명확하면, 사용자는 "어떤 노드가 있는지"와 "지금 뭘 쓸 수 있는지"를 동시에 파악할 수 있습니다. 선별 노출은 사용 가능한 노드 인식은 쉽지만 전체 파이프라인 구조를 학습하기 어렵게 만듭니다.

> **UX 설계 근거** (shape 스킬 — Error Prevention + Discoverability): 비활성 탭 클릭 시 토스트("이미지를 선택해 주세요" 등)로 선행 조건을 안내하여, 사용자가 왜 동작하지 않는지 즉시 알 수 있습니다.

#### 호환성 매핑 (비활성 판별 기준)

| 선택된 아트보드 유형 | 활성 노드 | 비활성 노드 (클릭 시 토스트) |
|-------------------|----------|--------------------------|
| `blank` | planners, plan, image, print | elevation, viewpoint, diagram → "이미지를 선택해 주세요" |
| `sketch` | plan, image | planners, elevation, viewpoint, diagram, print → 유형별 메시지 |
| `image` | elevation, viewpoint, diagram, **print** | planners, plan, image → 유형별 메시지 |
| `thumbnail` | planners, print | plan, image, elevation, viewpoint, diagram → 유형별 메시지 |
| 미선택 | 전체 (패널 모드) | 없음 (기존 패널 로직 유지) |

#### 비활성 노드 클릭 시 토스트 메시지

| 노드 | 메시지 |
|------|--------|
| elevation, viewpoint, diagram | "이미지를 선택해 주세요" |
| plan, image | "스케치를 선택해 주세요" |
| planners, print | "썸네일을 선택해 주세요" |

#### `SELECT TOOLS` 유지

- 기존 `SELECT TOOLS` 라벨, 아코디언(접기/펼치기) 로직 그대로 유지
- `SKETCH TOOLS` / `IMAGE TOOLS` 분기 헤더 제거 → 모든 아트보드 선택 상태에서 `SELECT TOOLS` 사용

#### `ARTBOARD_COMPATIBLE_NODES` 역할 변경

- 기존: 사이드바에서 **표시할** 노드 목록
- 변경: 사이드바에서 **활성화할** 노드 목록 (비활성 판별용)
- 상수명 변경 없이 의미만 전환 (사이드바 렌더링 로직에서 활용 방식만 변경)

---

## 위험성 분석

| 위험 요소 | 심각도 | 완화 방안 |
|----------|--------|----------|
| `imageStatic`/`imageEditable` → `image` 리네이밍 시 기존 localStorage 호환성 | 중 | `lsLoadItems`에서 `imageStatic`, `imageEditable` → `image`로 마이그레이션 폴백 |
| `NodeType`의 `'image'`와 `ArtboardType`의 `'image'` 혼동 가능성 | 중 | `displayLabel`을 `'SKETCH TO IMAGE'`로 변경하여 사용자-facing UI에서 혼동 방지. 코드 내부 `NodeType` 키(`'image'`)는 유지하되, 사이드바 탭에는 `'SKETCH TO IMAGE'`로 표시. `'plan'`도 동일하게 `'SKETCH TO PLAN'`으로 변경 |
| expand 버튼과 더블클릭 중복 경로 존재 | 하 | 의도적 중복 — 초보자(버튼)와 파워유저(더블클릭) 모두 지원 |
| 비활성 탭이 많아지면 사용자가 "왜 안 되지?" 혼란 | 중 | 토스트 메시지로 선행 조건 명확히 안내 + 비활성 스타일(`gray-300`, `not-allowed`)로 시각적 피드백 |
| `sketchData` 필드 추가 시 기존 노드 데이터 영향 | 하 | optional 필드(`sketchData?: string`)이므로 기존 데이터에 영향 없음 |

---

## 영향 범위

| 컴포넌트 | 변경 유형 | 관련 파일 |
|----------|----------|----------|
| 타입 정의 | 수정 | `project_canvas/types/canvas.ts` |
| 노드 카드 | 수정 | `project_canvas/components/NodeCard.tsx` |
| 우측 사이드바 | 수정 | `project_canvas/components/RightSidebar.tsx` |
| 메인 페이지 | 수정 | `project_canvas/app/page.tsx` |
| 무한 캔버스 | 수정 | `project_canvas/components/InfiniteCanvas.tsx` |
| 확장 뷰 | 수정 | `project_canvas/components/ExpandedView.tsx` |

---

## 디자인 기준 체크

- [ ] DESIGN.md 브랜드 컴플라이언스 확인
- [ ] FRONTEND.md 코드 작성 기준 확인
- [ ] 기존 컴포넌트 재사용 여부 검토
- [ ] 반응형 / 접근성 기준 확인 (더블탭: pointerUp 기반 태블릿 호환 유지)

---

## 구현 순서

### Phase 1: 타입 시스템 수정 (`types/canvas.ts`)

1. `ArtboardType`에서 `'imageStatic' | 'imageEditable'` → `'image'`로 통합
2. `ARTBOARD_COMPATIBLE_NODES` — `imageStatic`, `imageEditable` 키 삭제 → `image` 단일 키 추가 (**`print` 포함**: `['elevation', 'viewpoint', 'diagram', 'print']`)
3. `NODE_TO_ARTBOARD_TYPE` — elevation/viewpoint/diagram → `'image'`
4. `ARTBOARD_LABEL` — `imageStatic`, `imageEditable` 삭제 → `image: 'IMAGE'` 추가
5. `NODE_DEFINITIONS` — `image.displayLabel`: `'IMAGE'` → `'SKETCH TO IMAGE'`, `plan.displayLabel`: `'PLAN'` → `'SKETCH TO PLAN'`
6. `CanvasNode` 인터페이스에 `sketchData?: string` 추가 (스케치 분리 기반)
7. 비활성 탭 클릭 시 토스트 메시지 매핑 상수 추가: `DISABLED_TAB_MESSAGE`

### Phase 2: NodeCard 수정 (`NodeCard.tsx`)

1. 연필 버튼 (`IconPencil`) 및 `onConvertToEditable` prop 제거
2. `artboardType === 'imageStatic' || artboardType === 'imageEditable'` → `artboardType === 'image'`로 통합
3. `IconExpand` 재구현 (4방향 화살표 SVG)
4. `artboardType === 'image'` 아트보드의 액션 바에 expand 버튼 추가
5. expand 버튼 클릭 시 `onExpand(id)` 호출
6. 더블클릭/더블탭 expand 로직 유지 (blank 제외, 기존 그대로)

### Phase 3: 사이드바 전면 수정 (`RightSidebar.tsx`)

1. `ARTBOARD_TOOLS_LABEL` 상수 및 `sketch/imageStatic/imageEditable` 분기 렌더링 삭제
2. 아트보드 선택 시에도 `SELECT TOOLS` 헤더 + 7개 노드 탭 전체 표시
3. `ARTBOARD_COMPATIBLE_NODES`를 활성/비활성 판별용으로 활용
4. 비활성 탭: `gray-300` 텍스트, `not-allowed` 커서, hover 효과 없음
5. 비활성 탭 클릭 시 토스트 메시지 표시 (`onShowToast` 호출)
6. 패널 모드(미선택 + 탭 클릭)는 기존 로직 유지
7. `imageStatic`/`imageEditable` 참조 → `image`로 통합

### Phase 4: 메인 페이지 수정 (`page.tsx`)

1. `handleConvertToEditable` 콜백 삭제
2. `handleNodeTabSelect` 내 `imageStatic`/`imageEditable` 분기 → `image` 통합
3. `handleUploadImage` — `artboardType: 'imageStatic'` → `'image'`
4. `lsLoadItems` — `imageStatic`, `imageEditable` → `'image'` 마이그레이션
5. `InfiniteCanvas`에 `onNodeConvertToEditable` prop 전달 삭제

### Phase 5: InfiniteCanvas · ExpandedView 정리

1. `InfiniteCanvas.tsx` — `onNodeConvertToEditable` prop 삭제, `NodeCard`에 해당 prop 전달 삭제
2. `ExpandedView.tsx` — `imageEditable` 참조가 있으면 `image`로 통합

### Phase 6: 빌드 검증 및 브라우저 테스트

1. TypeScript 컴파일 에러 0건 확인
2. 브라우저 테스트 시나리오:
   - image 아트보드 업로드 → 라벨 'IMAGE' 확인
   - image 아트보드 선택 → expand 버튼 표시 확인
   - expand 버튼 클릭 → 확장 뷰 진입 확인
   - 더블클릭 → 확장 뷰 진입 확인 (기존 로직 유지)
   - sketch 아트보드 선택 → expand 버튼 미표시 확인
   - 아트보드 선택 시 사이드바에 7개 노드 탭 전체 표시 확인
   - 비활성 탭 클릭 → 토스트 메시지 표시 확인
   - 활성 탭 클릭 → 기존 동작 정상 수행 확인

---

## Progress

세분화된 체크포인트와 타임스탬프 — 실제 완료된 작업만 기록합니다.

- [x] Phase 1 — `types/canvas.ts` 타입 시스템 수정 (image 통합, sketchData, displayLabel, DISABLED_TAB_MESSAGE) ✅ 2026-04-23
- [x] Phase 2 — `NodeCard.tsx` 연필 버튼 제거, IconExpand 재구현, image 전용 expand 버튼 복구 ✅ 2026-04-23
- [x] Phase 3 — `RightSidebar.tsx` 사이드바 전면 수정 (7개 탭 상시 노출, 비활성 판별, DISABLED_TAB_MESSAGE 연동) ✅ 2026-04-23
- [x] Phase 4 — `page.tsx` 메인 페이지 수정 (handleConvertToEditable 삭제, lsLoadItems 마이그레이션 역전, handleUploadImage→image, handleNodeTabSelect 조건 통합, onNodeConvertToEditable prop 제거) ✅ 2026-04-23
- [x] Phase 5 — `InfiniteCanvas.tsx` onNodeConvertToEditable prop 삭제 · `ExpandedView.tsx` imageEditable 참조 없음 확인 (수정 불필요) ✅ 2026-04-23
- [x] Phase 6 — 빌드 검증 (TSC 에러 0건) · 브라우저 테스트 (7탭 표시, 비활성 탭 토스트 동작, ELEVATION 패널 정상) ✅ 2026-04-23
- [ ] git commit & push — 모든 변경사항 커밋 및 원격 저장소 푸쉬

---

## Surprises & Discoveries

구현 중 발견한 예상치 못한 동작과 인사이트를 기록합니다.

- Phase 3에서 `isTabDisabled`가 `blank` 아트보드를 "모두 활성"으로 처리하고 있었으나, 실행 계획의 호환성 테이블에 따르면 blank 선택 시 elevation/viewpoint/diagram은 비활성이어야 함 → Phase 6에서 수정 완료
- `ExpandedView.tsx`에는 `imageEditable` 참조가 이미 없어 수정 불필요했음
- `imageStatic`/`imageEditable`/`ConvertToEditable` 잔여 참조 전체 검색 결과 0건으로 깔끔한 정리 확인

---

## Decision Log

방향 수정 및 설계 선택의 근거를 기록합니다.

| 날짜 | 결정 | 이유 |
|------|------|------|
| 2026-04-23 | `imageStatic`/`imageEditable` → `image` 단일 유형으로 재통합 | 요구사항 #1: 하위 유형 제거, 모든 image에서 스케치 가능. 이전 분리 이유(edit 가능/불가 구분)가 불필요해짐 |
| 2026-04-23 | `sketchData` 필드를 `thumbnailData`와 분리 | 요구사항 #2 주의사항: 노드 트리거 시 원본 이미지만 인식, 스케치 레이어 무시. 데이터 분리가 가장 명확한 경계 |
| 2026-04-23 | expand 버튼을 image 전용으로만 복구 | 요구사항 #2: 스케치를 바로 할 수 있도록 하기 위함. 다른 유형에는 불필요 |
| 2026-04-23 | 사이드바 선별 노출 → 전체 노출 + 비활성 스타일 | 요구사항 #3: 7개 노드 항상 노출. Nielsen #1 (시스템 상태 가시성) + #6 (인식 > 기억) |
| 2026-04-23 | `SELECT TOOLS` 라벨 유지 | 요구사항 #3: "select tools 라는 것도 임의로 변경해선 안 됩니다" |
| 2026-04-23 | `image` 아트보드 호환 노드에 `print` 추가 | image는 print 노드의 트리거(소스)이므로 image 아트보드 선택 시 print 동작 가능해야 함 |
| 2026-04-23 | `displayLabel` 변경: `IMAGE` → `SKETCH TO IMAGE`, `PLAN` → `SKETCH TO PLAN` | `NodeType`의 `'image'`와 `ArtboardType`의 `'image'`가 UI에서 혼동될 수 있어, 사이드바 탭 라벨을 명시적으로 구분 |
| 2026-04-23 | `isTabDisabled`에서 blank 아트보드도 비활성 판별 적용 | 호환성 테이블에 따라 blank 선택 시 elevation/viewpoint/diagram은 비활성이어야 하나 Phase 3에서 누락 → Phase 6에서 수정 |

---

## Outcomes & Retrospective

- **원래 목표 달성 여부**: [x] Yes  [ ] Partial  [ ] No
- **결과 요약**: image 아트보드 라벨 단일화(`imageStatic`/`imageEditable` → `image`), expand 버튼 image 전용 복구, 사이드바 7개 노드 탭 상시 노출 + 비활성 스타일/토스트 — 3가지 목표 모두 달성. TSC 에러 0건, 브라우저 테스트 통과.
- **다음 작업에 반영할 것**: `sketchData` 필드가 추가되었으므로, 실제 스케치 드로잉 기능 구현 시 이 필드를 활용할 것. 노드 API 연동 시 `thumbnailData`(원본)만 전달하고 `sketchData`는 무시하는 로직 필요.

---

`COPYRIGHTS 2026. CRE-TE CO.,LTD. ALL RIGHTS RESERVED.`
