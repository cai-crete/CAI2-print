# Frontend Plan — 아트보드 라벨링 · '+' 버튼 드롭다운 · 사이드바 탭 로직 수정

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
- **관련 디자인 기준**: ARCHITECTURE.md · FRONTEND.md
- **시작일**: 2026-04-23

---

## 목표

이 작업이 완료되면 아래 세 가지 UI/UX가 변경됩니다:

1. **아트보드 내부 라벨링 체계 정비**: 기존 `ArtboardType` 중 `image` 유형을 `edit X image`(단순 이미지)와 `edit O image`(스케치 가능 이미지)로 세분화하고, 연필 버튼 트리거를 통해 변환 가능하도록 구조를 마련합니다. (라벨은 내부 로직 전용이며 사용자에게 노출되지 않음)
2. **좌측 툴바 '+' 버튼 드롭다운**: 기존 바로 빈 아트보드 추가에서, '새 아트보드' / '이미지 업로드' 드롭다운 선택으로 변경합니다.
3. **사이드바 노드 탭 로직 전면 수정**: 아트보드 선택 상태에 따라 분기하는 새로운 탭 액션 규칙을 적용합니다.

---

## 현재 상태 분석 (As-Is)

### A. 아트보드 라벨링

현재 `ArtboardType`은 `'blank' | 'sketch' | 'image' | 'thumbnail'` 4종입니다.

| 타입 | 용도 | 파일 |
|------|------|------|
| `blank` | 빈 아트보드 (점선 테두리) | `types/canvas.ts:32` |
| `sketch` | 스케치 가능한 아트보드 (plan, image 노드용) | `types/canvas.ts:32` |
| `image` | 이미지 아트보드 (elevation, viewpoint, diagram 노드용) | `types/canvas.ts:32` |
| `thumbnail` | 썸네일 아트보드 (planners, **print** 노드용) | `types/canvas.ts:32` |

> **참고**: Print 노드에게 image는 트리거(작동을 위한 소스)일 뿐이며, Print의 결과물 아트보드는 `thumbnail` 유형으로 생성됩니다.

`image` 유형에 대해 "편집 가능/불가능" 구분이 없습니다.

### B. 좌측 '+' 버튼

현재 `LeftToolbar.tsx`의 `+` 버튼은 `onAddArtboard` 콜백을 즉시 호출하여 빈 아트보드 하나를 바로 추가합니다. 드롭다운 UI가 없습니다.

### C. 사이드바 탭 로직

현재 `page.tsx`의 `handleNodeTabSelect` 로직:

| 조건 | 현재 동작 |
|------|----------|
| 아트보드 선택 + blank → 탭 클릭 | 아트보드에 유형 배정 + expand 노드면 즉시 expand |
| 아트보드 미선택 + `DIRECT_EXPAND_NODES` (planners, image) 탭 클릭 | 새 노드 생성 후 바로 expand |
| 아트보드 미선택 + 기타 탭 클릭 | 패널 열기/닫기 토글 |

`RightSidebar.tsx` 패널 모드의 `→` 버튼:
- 모든 노드에 대해 동일하게 활성화됨 (elevation, viewpoint, diagram 포함)
- `→` 클릭 시 `createAndExpandNode` 호출

---

## 변경 사항 상세 (To-Be)

### A. 아트보드 이미지 라벨링 세분화

> **사용자 노출 없음** — 내부 로직에서만 사용되는 라벨입니다.

#### 타입 리네이밍

| 현재 | 변경 후 | 의미 |
|------|---------|------|
| `image` (기존: 일반적 이미지 아트보드) | `imageStatic` | 생성된 이미지 또는 불러온 이미지 (edit X) — 단순 표시 전용 |
| (신규) | `imageEditable` | 스케치 가능한 이미지 (edit O) — 확장 시 스케치 도구 활성화 |

#### 변환 트리거 (구조 마련)

- `imageStatic` 아트보드를 선택하면 상단 액션 바에 기존 3개 버튼(복제, 다운로드, 삭제) 옆에 **연필 아이콘 버튼**이 추가됩니다.
- 연필 버튼 클릭 시 `artboardType`이 `imageStatic` → `imageEditable`로 전환됩니다.
- `imageEditable` 상태에서 expand하면 스케치 가능한 이미지 편집 화면이 표시됩니다.
- **이미지에 스케치 후 generate → 반영된 이미지 생성**은 추후 개발 예정이므로, 이번 작업에서는 타입 전환 로직과 연필 버튼 UI만 구현합니다.

#### 관련 상수 업데이트

| 상수 | 변경 내용 |
|------|----------|
| `ARTBOARD_COMPATIBLE_NODES` | `image` 키를 `imageStatic`으로 변경, `imageEditable`에 동일 노드 목록 추가 (단, `print`는 `thumbnail`에서 관리) |
| `NODE_TO_ARTBOARD_TYPE` | elevation/viewpoint/diagram → `imageStatic`, print → `thumbnail` (기존 유지) |
| `ARTBOARD_LABEL` | `imageStatic: 'IMAGE'`, `imageEditable: 'IMAGE (EDIT)'` |
| `NODES_THAT_EXPAND` | 변경 없음 |
| `NODE_ORDER` | `'sketch'` 제거 — 사이드바 탭에서 SKETCH 미노출 |

### B. 좌측 '+' 버튼 드롭다운

#### UI 변경

`+` 버튼 클릭 시 드롭다운 메뉴가 표시됩니다:

| 메뉴 항목 | 동작 |
|----------|------|
| **새 아트보드** | 기존 `handleAddArtboard`와 동일 — blank 아트보드 생성 |
| **이미지 업로드** | 파일 선택 다이얼로그 → 사용자가 이미지 선택 → `imageStatic` 유형의 아트보드로 캔버스에 등록 |

#### 이미지 업로드 로직

1. 숨겨진 `<input type="file" accept="image/*">` 요소 활용
2. 사용자가 이미지 선택 시 `FileReader`로 base64 데이터 URL 읽기
3. 새 `CanvasNode` 생성:
   - `type: 'image'`
   - `artboardType: 'imageStatic'`
   - `thumbnailData: base64DataUrl` (NodeCard에서 이미지 표시용)
   - `hasThumbnail: true`
4. 캔버스 중앙에 배치

#### 드롭다운 UI 사양

- 검정 원형 `+` 버튼 클릭 시 상단으로 드롭다운 표시 (upward popup)
- 외부 클릭 시 드롭다운 닫힘
- 호버·클릭 시 `var(--color-gray-100)` 배경 변화
- 디자인: 기존 pill 스타일과 동일한 `var(--color-white)` 배경 + `var(--shadow-float)` 그림자

### C. 사이드바 노드 탭 로직 수정

> **SKETCH 탭 삭제**: `'sketch'`는 7개 노드에 포함되지 않으므로 사이드바 탭 목록(`NODE_ORDER`)에서 제거합니다. `NODE_ORDER`에서 `'sketch'`를 삭제하여 `RightSidebar`에 표시되지 않도록 합니다.

#### C-1. 아트보드 선택 + 사이드바 탭 클릭

| 아트보드 상태 | 노드 | 동작 |
|-------------|------|------|
| **blank** | **planners, plan, image, print** | 아트보드에 유형 배정 + 즉시 expand 진입, 내부에서 작업 후 나오면 저장 |
| **blank** | **elevation, viewpoint, diagram** | **동작 차단** — 토스트: **"이미지를 선택해 주세요"** (빈 아트보드에서는 동작 불가. 트리거가 image이기 때문) |
| **imageStatic / imageEditable** | **elevation, viewpoint, diagram** | 아트보드에 유형 배정, expand 없이 캔버스에서 바로 작동 (추후 개발 예정이므로 유형 배정만 수행) |
| **sketch** | **elevation, viewpoint, diagram** | **동작 차단** — 토스트: **"이미지를 선택해 주세요"** (sketch는 image가 아님) |
| **thumbnail** | **elevation, viewpoint, diagram** | **동작 차단** — 토스트: **"이미지를 선택해 주세요"** (thumbnail은 image가 아님) |

> **핵심 규칙**: elevation, viewpoint, diagram은 **`imageStatic` 또는 `imageEditable` 아트보드가 선택된 경우에만** 동작합니다. 그 외 모든 아트보드(blank, sketch, thumbnail)에서는 "이미지를 선택해 주세요" 토스트와 함께 동작이 차단됩니다.

> **현재 코드와의 차이**: 현재는 blank 아트보드에 유형을 무조건 배정하지만, 변경 후에는 elevation/viewpoint/diagram에 한해 아트보드 유형 검증을 선행합니다.

#### C-2. 아트보드 미선택 + 사이드바 탭 클릭

탭 클릭 시 **모든 노드**에 대해 패널이 열립니다 (기존 `DIRECT_EXPAND_NODES` 분기 삭제).

패널 내부의 `→` 버튼:

| 노드 | → 버튼 상태 |
|------|------------|
| **elevation, viewpoint, diagram** | **비활성화** (회색, 클릭 불가) |
| **planners, plan, image, print** | **활성화** — 클릭 시 새 아트보드 자동 생성 + expand 진입, 돌아오면 썸네일 적용 |

#### C-3. 아트보드 미선택 + 패널 CTA(GENERATE 등) 클릭 시 대응

아트보드를 선택하지 않은 상태에서 패널의 CTA 버튼을 눌렀을 때, 노드별로 분기 처리합니다:

| 노드 | CTA 동작 | 토스트 메시지 |
|------|---------|---------------|
| **PLAN, IMAGE** | CTA 비작동 | **"스케치를 선택해 주세요"** |
| **ELEVATION, CHANGE VIEWPOINT, DIAGRAM** | CTA 비작동 | **"이미지를 선택해 주세요"** |
| **PRINT** | CTA 작동 | 토스트 없음 — 바로 내부로 이동(expand)하여 내부에서 작동 |
| **PLANNERS** | 해당 없음 | 현재 패널에 CTA 배정 계획 없음 |

> **UX 설계 근거** (shape 스킬 — Error Prevention, critique 스킬 — Nielsen #5): 사용자가 선행 조건(스케치/이미지 선택)을 충족하지 않은 상태에서 CTA를 눌렀을 때, 화면 중앙 하단 토스트로 실패 이유와 해결 방법을 즉시 알려주어 인지 부하를 최소화합니다. 토스트는 현재 작업 맥락을 가리지 않으면서 시선이 자연스럽게 향하는 위치(화면 하단 중앙)에 표시되므로 인라인 메시지보다 직관적입니다.

##### 토스트 UI 사양 (공통 — C-1, C-3 모두 동일한 토스트 컴포넌트 사용)

- **위치**: 화면 중앙 하단 (`bottom: 2rem`, `left: 50%`, `transform: translateX(-50%)`)
- **스타일**: `var(--color-white)` 배경, `var(--shadow-float)` 그림자, `var(--radius-pill)` 모서리
- **텍스트**: `var(--font-family-pretendard)`, `0.8125rem`, `var(--color-gray-600)`
- **자동 소멸**: 3초 후 fade-out
- **애니메이션**: slide-up + fade-in 200ms → 유지 → fade-out 200ms
- **z-index**: `1100` (모든 UI 위에 표시)
- **중복 방지**: 동일 메시지가 이미 표시 중이면 타이머만 리셋

---

## 위험성 분석

| 위험 요소 | 심각도 | 완화 방안 |
|----------|--------|----------|
| `ArtboardType` 리네이밍(`image` → `imageStatic`) 시 기존 localStorage 데이터와 호환성 깨짐 | 중 | `lsLoadItems`에서 기존 `image` 타입을 `imageStatic`으로 마이그레이션하는 폴백 로직 추가 |
| `+` 버튼 드롭다운이 캔버스 이벤트(팬, 줌)와 충돌 | 하 | 드롭다운 컨테이너에 `e.stopPropagation()` 적용, 외부 클릭 감지로 닫기 |
| `DIRECT_EXPAND_NODES` 삭제 시 기존 사용자 경험 변화 (planners/image 탭 클릭 시 바로 expand되지 않고 패널 표시) | 중 | 요구사항 C-2에 명시된 대로 모든 미선택 탭 클릭은 패널 표시로 통일 |
| `imageEditable` 전환 후 실제 스케치 기능 미구현 상태에서 사용자 혼란 | 하 | 전환 시 expand 화면에 "스케치 도구 준비 중" 플레이스홀더 표시 |
| 아트보드 미선택 상태에서 CTA 클릭 시 사용자가 이유를 모를 수 있음 | 중 | 노드별 맞춤 안내 메시지("스케치를 선택해 주세요" / "이미지를 선택해 주세요")로 명확한 피드백 제공 |

---

## 영향 범위

| 컴포넌트 | 변경 유형 | 관련 파일 |
|----------|----------|----------|
| 타입 정의 | 수정 | `project_canvas/types/canvas.ts` |
| 좌측 툴바 | 수정 | `project_canvas/components/LeftToolbar.tsx` |
| 우측 사이드바 | 수정 | `project_canvas/components/RightSidebar.tsx` |
| 메인 페이지 | 수정 | `project_canvas/app/page.tsx` |
| 노드 카드 | 수정 | `project_canvas/components/NodeCard.tsx` |
| 확장 뷰 | 수정 | `project_canvas/components/ExpandedView.tsx` |

---

## 디자인 기준 체크

- [ ] DESIGN.md 브랜드 컴플라이언스 확인
- [ ] FRONTEND.md 코드 작성 기준 확인
- [ ] 기존 컴포넌트 재사용 여부 검토
- [ ] 반응형 / 접근성 기준 확인

---

## 구현 순서

### Phase 1: 타입 시스템 수정 (`types/canvas.ts`)

1. `ArtboardType`에서 `'image'`를 `'imageStatic' | 'imageEditable'`로 변경
2. `ARTBOARD_COMPATIBLE_NODES` — `image` 키를 `imageStatic` + `imageEditable`로 분리 (`print`는 `thumbnail`에서 관리)
3. `NODE_TO_ARTBOARD_TYPE` — elevation/viewpoint/diagram → `imageStatic`, print → `thumbnail`
4. `ARTBOARD_LABEL` — `imageStatic: 'IMAGE'`, `imageEditable: 'IMAGE (EDIT)'` 추가
5. `CanvasNode`에 `thumbnailData?: string` 필드 확인 (이미 존재)
6. `→` 버튼 비활성 노드 목록 상수 추가: `NODES_NAVIGATE_DISABLED: NodeType[]`
7. `NODE_ORDER`에서 `'sketch'` 제거 (사이드바 탭 미노출)
8. 패널 CTA 메시지 매핑 상수 추가: `PANEL_CTA_MESSAGE: Partial<Record<NodeType, string>>`

### Phase 2: NodeCard 연필 버튼 추가 (`NodeCard.tsx`)

1. `IconPencil` SVG 아이콘 추가
2. 선택된 `imageStatic` 아트보드의 액션 바에 연필 버튼 렌더링
3. 연필 버튼 클릭 시 `onConvertToEditable(id)` 콜백 호출
4. `NodeCard` Props에 `onConvertToEditable` 추가
5. `imageStatic` 아트보드에 `thumbnailData`가 있으면 이미지 렌더링

### Phase 3: 좌측 '+' 버튼 드롭다운 (`LeftToolbar.tsx`)

1. 내부 상태 `isDropdownOpen` 추가
2. `+` 버튼 클릭 → 드롭다운 토글
3. 드롭다운 메뉴: '새 아트보드' + '이미지 업로드'
4. Props에 `onUploadImage: (file: File) => void` 추가
5. 숨겨진 `<input type="file">` ref 관리
6. 외부 클릭 시 드롭다운 닫기 (useEffect + document click listener)

### Phase 4: 사이드바 탭 로직 수정 (`RightSidebar.tsx` + `page.tsx`)

1. `page.tsx`: `DIRECT_EXPAND_NODES` 상수 삭제
2. `page.tsx`: `handleNodeTabSelect` 수정
   - 아트보드 선택 시: blank → 유형 배정 + expand 노드면 expand (기존과 유사)
   - 아트보드 미선택 시: **항상** 패널 열기 (토글)
3. `RightSidebar.tsx`: `→` 버튼에 `disabled` 로직 추가
   - `NODES_NAVIGATE_DISABLED`에 포함된 노드면 비활성화 (회색 처리, 클릭 불가)
4. `page.tsx`: `handleNavigateToExpand` — 비활성 노드 체크 추가

### Phase 5: 패널 CTA 분기 로직 (`RightSidebar.tsx` + `page.tsx`)

1. `RightSidebar.tsx` — `NodePanel`의 GENERATE 버튼에 분기 로직 추가:
   - `selectedNodeId`가 없는 경우(아트보드 미선택):
     - **PLAN, IMAGE**: CTA 비작동, "스케치를 선택해 주세요" 인라인 메시지 표시
     - **ELEVATION, VIEWPOINT, DIAGRAM**: CTA 비작동, "이미지를 선택해 주세요" 인라인 메시지 표시
     - **PRINT**: CTA 작동 → `onNavigateToExpand(type)` 호출 (바로 expand)
     - **PLANNERS**: CTA 미배정 (GENERATE 버튼 미표시)
2. `RightSidebar.tsx` — Props에 `hasSelectedArtboard: boolean` 추가
3. 메시지 UI: 버튼 위 인라인 텍스트, 3초 자동 소멸, fade-in/out 애니메이션

### Phase 6: 메인 페이지 이미지 업로드 통합 (`page.tsx`)

1. `handleUploadImage(file: File)` 콜백 구현
2. FileReader로 base64 변환 → `imageStatic` 노드 생성
3. `LeftToolbar`에 `onUploadImage` prop 전달
4. `handleConvertToEditable(id)` 콜백 구현 → `InfiniteCanvas`에 전달

### Phase 7: localStorage 마이그레이션

1. `lsLoadItems`에서 `artboardType === 'image'`인 항목을 `'imageStatic'`으로 자동 변환

---

## Progress

세분화된 체크포인트와 타임스탬프 — 실제 완료된 작업만 기록합니다.

- [x] Phase 1 — `types/canvas.ts` 타입 시스템 수정 (SKETCH 삭제, imageStatic/imageEditable 분리, print→thumbnail, CTA 메시지 상수) ✅ 2026-04-23
- [x] Phase 2 — `NodeCard.tsx` 연필 버튼 추가 + 이미지 렌더링 ✅ 2026-04-23
- [x] Phase 3 — `LeftToolbar.tsx` '+' 버튼 드롭다운 구현 ✅ 2026-04-23
- [x] Phase 4 — `RightSidebar.tsx` + `page.tsx` 사이드바 탭 로직 수정 (→ 버튼 비활성화) ✅ 2026-04-23
- [x] Phase 5 — `RightSidebar.tsx` 패널 CTA 분기 로직 + 토스트 UI ✅ 2026-04-23
- [x] Phase 6 — `page.tsx` 이미지 업로드 + 편집 전환 통합 ✅ 2026-04-23
- [x] Phase 7 — `page.tsx` localStorage 마이그레이션 ✅ 2026-04-23
- [ ] 전체 기능 검증 — 브라우저 테스트
- [ ] git commit & push — 모든 변경사항 커밋 및 원격 저장소 푸쉬

---

## Surprises & Discoveries

구현 중 발견한 예상치 못한 동작과 인사이트를 기록합니다.

- (작업 시작 전)

---

## Decision Log

방향 수정 및 설계 선택의 근거를 기록합니다.

| 날짜 | 결정 | 이유 |
|------|------|------|
| 2026-04-23 | `image` → `imageStatic`/`imageEditable` 리네이밍 방식 채택 | 요구사항의 "edit X / edit O" 구분을 타입 수준에서 명확하게 표현하기 위함. `image`라는 기존 이름은 `NodeType`의 `'image'`와 혼동 가능 |
| 2026-04-23 | `DIRECT_EXPAND_NODES` 삭제 후 모든 미선택 탭 클릭을 패널로 통일 | 요구사항 C-2에서 "아트보드를 누르지 않고 사이드바에서 노드 선택하면 패널이 열리고"로 명시 |
| 2026-04-23 | 이미지 업로드 시 base64 데이터 URL을 `thumbnailData`에 저장 | 서버 없이 클라이언트 전용으로 동작해야 하므로 FileReader → data URL이 가장 단순한 방식 |
| 2026-04-23 | Print 노드 결과물 아트보드를 `thumbnail`로 분류 | Print에게 image는 트리거(소스)일 뿐이며, 결과물은 planners와 동일한 thumbnail 유형 |
| 2026-04-23 | 패널 CTA에 노드별 분기 메시지 추가 | Nielsen #5(Error Prevention) — 선행 조건 미충족 시 명확한 안내로 사용자 혼란 방지 |
| 2026-04-23 | SKETCH를 사이드바 탭에서 제거 | SKETCH는 7개 노드에 포함되지 않으며 내부 아트보드 유형으로만 사용 |

---

## Outcomes & Retrospective

작업 완료 후 작성합니다.

- **원래 목표 달성 여부**: [ ] Yes  [ ] Partial  [ ] No
- **결과 요약**: 
- **다음 작업에 반영할 것**: 

---

`COPYRIGHTS 2026. CRE-TE CO.,LTD. ALL RIGHTS RESERVED.`
