# CAI CANVAS — 노드별 Frontend 디자인 가이드라인

> **목적**: CAI CANVAS 내 7개 노드의 UI를 구현하는 AGENT C(디자인 에이전트)가 읽고 즉시 적용할 수 있는 요약 가이드.
> 본 문서는 아래 3개 문서의 핵심을 노드 개발 관점으로 재구성한 것이며, 상세 스펙은 원본을 참조한다.

| 우선순위 | 원본 문서 | 역할 |
|----------|----------|------|
| 1 | `docs/design-style/DESIGN.md` | 브랜드 원칙 · 네이밍 컨벤션 · UI 원칙 |
| 2 | `docs/design-style/design-style-guide-CAI.md` | 공통 디자인 토큰 · 컴포넌트 · 인터랙션 전체 스펙 |
| 3 | `project_[node]/_context/design-style-guide-node.md` | 노드별 예외사항 (PART B — PART A보다 우선) |

---

## 1. 전체 레이아웃 구조 — 필수 고정 규칙

모든 노드는 아래 레이아웃 골격을 **반드시** 준수한다. 노드 유형에 따라 일부 요소가 생략·변경될 수 있으나, 존재하는 요소의 **위치와 규격**은 불변이다.

```
┌──────────────────────────────────────────────────────────────┐
│  HEADER (고정, 56px)                                         │
│  ┌─ CAI CANVAS ─────────────────────────────────────────┐   │
│  └──────────────────────────────────────────────────────────┘│
├──────────────────────────────────────────────────────────────┤
│ ┌──────┐                                    ┌────────────┐  │
│ │TOOLBAR│          CANVAS AREA              │  SIDEBAR   │  │
│ │(좌측) │          (중앙 작업 영역)           │  (우측)    │  │
│ │floating│                                   │  floating  │  │
│ │       │                                    │            │  │
│ └──────┘                                    └────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### 1.1 Header (상단 고정)

| 항목 | 스펙 |
|------|------|
| **높이** | `3.5rem` (56px) |
| **배경** | `#FFFFFF` |
| **하단 보더** | `1px solid gray-100` (`#EEEEEE`) |
| **좌측 타이틀** | **CAI CANVAS** — 고정 위치, 좌측 배치 |
| **Z-Index** | `10` (System Layer) |

> [!IMPORTANT]
> Header 좌측에는 반드시 **CAI CANVAS** 타이틀이 위치한다. 노드명이나 다른 요소로 대체하지 않는다.

### 1.2 Toolbar (좌측 플로팅)

| 항목 | 스펙 |
|------|------|
| **위치** | `left: 1rem`, 수직 중앙 (`top: 50%`, `translateY(-50%)`) |
| **구조** | Pill 묶음 (흰 배경, `radius-pill`, `shadow-float`) + 분리된 원형 버튼 |
| **버튼 크기** | `2.75rem × 2.75rem` (44px × 44px) |
| **Z-Index** | `1000+` (Modal Layer) |

> [!NOTE]
> - Toolbar는 노드 유형에 따라 **삭제 가능**하다.
> - 유지할 경우 버튼 구성(기능 추가/삭제)은 노드별로 다르게 정의한다.
> - 버튼 구성은 각 노드의 `design-style-guide-node.md` (PART B)에서 정의한다.

### 1.3 Sidebar (우측 플로팅)

> 노드 expand 후 내부 화면의 우측 사이드바 (`ExpandedSidebar`).

| 항목 | 스펙 |
|------|------|
| **너비** | `var(--sidebar-w)` = `18rem` (288px) |
| **위치** | Floating — `right: 1rem`, `top: 1rem`, `bottom: 1rem` |
| **내부 gap** | `0.5rem` (8px) — Pill 간 간격 |
| **Z-Index** | `90` (Control Layer) |

#### Sidebar 내부 구조

```
┌──┐ ┌──────────────────┐ ─ 상단 행: [← Pill] + [노드탭 Pill]
│← │ │ PLAN          [▲]│    44px + 44px, gap: 0.5rem
└──┘ └──────────────────┘
┌────────────────────────┐ ─ 패널 본문 (radius-box, shadow-float)
│                        │
│    노드별 고유 기능      │   flex: 1, 스크롤 가능
│                        │
├────────────────────────┤
│    [ CTA BUTTON ]      │   CTA 있을 경우 하단 고정
└────────────────────────┘
```

| 요소 | 스펙 |
|------|------|
| **← (돌아가기) 버튼** | 정사각 Pill, `44×44px`, 아이콘 `20×20px`, 기본 `gray-500` / hover `black` |
| **노드탭 Pill** | `flex: 1`, 높이 `44px`, Bebas Neue, 우측 Chevron ▲/▼ (접기/펼치기) |
| **패널 본문** | `radius-box` (10px), `shadow-float`, `flex: 1` |
| **CTA** | 패널 하단 고정, `width: 100%`, `52px` (CTA-primary 스타일) |

> [!IMPORTANT]
> **Sidebar 필수 규칙:**
> 1. **상단 행**: `[← 돌아가기]` + `[노드탭]` — 각각 독립 Pill, gap `0.5rem`
> 2. **패널 본문**: `radius-box`, 노드마다 기능 구성이 다름
> 3. **CTA**: 있을 경우 **반드시 패널 하단 고정**. 스크롤 영역 안에 넣지 않는다

### 1.4 Floating Navigation

| 항목 | 스펙 |
|------|------|
| **높이** | `2.75rem` (44px) |
| **위치** | `top: 4.5rem`, `right: 1rem`, 너비 `18rem` |

---

## 2. 디자인 토큰 요약 — 코드 직접 적용 사항

### 2.1 컬러 — 그레이스케일 7색 한정

> [!CAUTION]
> **앱 인터페이스에 유채색(컬러)은 사용하지 않는다.** 유일한 예외: 오류 상태 Toast의 붉은 계열.

| 토큰 | Hex | 용도 |
|------|-----|------|
| `black` | `#000000` | CTA-primary 배경, 보더+텍스트, 헤더 타이틀 |
| `white` | `#FFFFFF` | 배경 전반, CTA-primary 텍스트 |
| `gray-500` | `#333333` | 보조 텍스트, 아이콘 기본색 |
| `gray-400` | `#666666` | Caption, 힌트, 비활성 라벨 |
| `gray-300` | `#999999` | 비활성 아이콘·버튼, placeholder |
| `gray-200` | `#CCCCCC` | 인터랙션 요소 보더 (입력 테두리 등) |
| `gray-100` | `#EEEEEE` | **구분선 전용** + hover 배경 예외 |

### 2.2 폰트 — 2종 고정

| 폰트 | 용도 |
|------|------|
| **Bebas Neue** | 헤더 · CTA · 탭 타이틀 · 사이드바 섹션 타이틀 |
| **Pretendard** | Body 텍스트 · 숫자 · placeholder · 안내 문구 |

> [!CAUTION]
> 위 2종 외 다른 폰트를 로드하거나 사용하는 것은 금지한다.

### 2.3 타이포그래피 위계

| 계층 | 폰트 | Weight | Size | 용도 |
|------|------|--------|------|------|
| 타이틀 | Bebas Neue | Regular | 16pt | 헤더, 탭, CTA, 모달 타이틀 |
| 서브타이틀 | Bebas Neue | Regular | 14pt | 사이드바 섹션 타이틀 |
| Body 1 | Pretendard | Semibold | 16pt | 강조 본문 |
| Body 2 | Pretendard | Regular | 16pt | 일반 본문 |
| Body 3 | Pretendard | Regular | 14pt | 보조 본문 |
| Caption | Pretendard | Regular | 12pt | 캡션, 보조 설명 |

### 2.4 간격 토큰 (8px 그리드)

| 토큰 | 값 | 주요 용도 |
|------|-----|----------|
| `space-1` | 8px | 아이콘 내부, 인접 요소 최소 간격 |
| `space-2` | 16px | 기본 패딩, 연관 그룹 내 간격 |
| `space-3` | 20px | 사이드바·카드 내부 패딩 |
| `space-4` | 32px | 비연관 그룹 간 구분 |
| `space-5` | 40px | 주요 섹션 간 여백 |

> [!CAUTION]
> 임의 px 값 사용 금지. 반드시 위 토큰만 사용한다.

### 2.5 곡률 토큰

| 토큰 | 값 | 적용 대상 |
|------|-----|----------|
| `radius-box` | `0.625rem` (10px) | 사이드바, 입력 영역, CTA-options |
| `radius-pill` | `5rem` (80px) 또는 `50%` | CTA-primary/secondary, 툴바 Pill |

### 2.6 높이 기준

| 높이 | 적용 대상 |
|------|----------|
| **52px** (`3.25rem`) | CTA-primary, CTA-secondary |
| **44px** (`2.75rem`) | CTA-options, 기능 탭, 아이콘 버튼, 인터랙티브 요소 최솟값 |
| **36px** (`2.25rem`) | CTA-secondary-small (좁은 영역 전용 예외) |
| **28px** (`1.75rem`) | CTA-tertiary-small (인라인 최저 위계 전용 예외) |

---

## 3. CTA 컴포넌트 — 빠른 참조표

| 유형 | 높이 | 곡률 | Default 배경/텍스트/보더 | Tier |
|------|------|------|--------------------------|------|
| **CTA-primary** | 52px | pill | `black` / `white` / 없음 | Tier 1 (화면당 1개) |
| **CTA-secondary** | 52px | pill | `white` / `black` / `1.5px solid black` | Tier 2 |
| **CTA-secondary-small** | 36px | pill | `white` / `black` / `1.5px solid black` | — |
| **CTA-tertiary-small** | 28px | box | `white` / `gray-500` / `1px solid gray-200` | — |
| **CTA-options** | 44px | box | `white` / `black` / `1.5px solid gray-200` | — |

> [!IMPORTANT]
> **화면당 Tier 1 (CTA-primary)은 단 1개만 존재한다.** 복수 배치 절대 금지.

---

## 4. 인터랙션 규칙 요약

### 4.1 Hover

| 요소 | 변화 | Transition |
|------|------|------------|
| CTA-primary | opacity → `0.85` | `opacity 150ms ease` |
| CTA-secondary | 배경 → `gray-100` | `background-color 150ms ease` |
| CTA-options (default) | 보더 → `black` | `border-color 150ms ease` |
| CTA-tertiary-small | 텍스트·보더 → `black` | `150ms ease` |
| 툴바 아이콘 | 배경 → `gray-100` | `background-color 100ms ease` |

### 4.2 Active (클릭 중)

- CTA-primary / secondary: `transform: scale(0.97)`, `80ms ease`
- 툴바 아이콘: 배경 → `gray-200`, `80ms ease`

### 4.3 Disabled

- **opacity 사용 금지** — 전용 disabled 색상 토큰(`gray-200`, `gray-300`)으로만 표현

### 4.4 전환 속도 원칙

| 유형 | 속도 |
|------|------|
| 색상·배경 | `150ms ease` |
| Transform | `80ms ease` |
| 모달·오버레이 | `200ms ease-out` |
| 로딩 스피너 | `800ms linear infinite` |

---

## 5. 시각적 계층 구조 (Visual Hierarchy)

| 우선순위 | 명칭 | 정의 | 대표 요소 |
|----------|------|------|-----------|
| **Tier 1** | 핵심 액션 | 사용자가 반드시 인식해야 할 **단 하나** | CTA-primary (GENERATE) |
| **Tier 2** | 보조 액션 | Tier 1을 보완하는 상황 의존적 요소 | CTA-secondary, 모드 탭 |
| **Tier 3** | 맥락 정보 | 읽히되 눈에 띄지 않아야 할 배경 정보 | Caption, 구분선, 비활성 라벨 |

**적용 원칙:**
1. 화면당 Tier 1은 **단 1개**
2. Tier 1은 배경과의 **명도 대비가 최고** — `black` 배경 + `white` 텍스트
3. 동일 Tier 요소는 **동일 정렬 축** 공유
4. 연관 요소는 `space-2` (16px) 이내, 비연관 그룹 간 `space-4` (32px) 이상

---

## 6. Z-Index 레이어 체계

| 계층 | Z-Index | 대상 |
|------|---------|------|
| Modal Layer | `1000+` | 툴바, 팝업 모달, 토스트 |
| Nav Layer | `100` | 플로팅 메뉴 |
| Control Layer | `90` | 우측 사이드바 |
| System Layer | `10` | 상단 헤더 |
| Canvas Layer | Base | 캔버스 배경 + 무한 그리드 |

---

## 7. 아이콘 규격

| 속성 | 값 |
|------|-----|
| 프레임 크기 | `1.5rem` (24px) |
| 실질 크기 | `1.25rem` (20px) |
| 기본 색상 | `gray-500` (`#333333`) |
| 비활성 색상 | `gray-300` (`#999999`) |

> 코드에서 아이콘 크기는 반드시 `rem` 값을 사용한다.

---

## 8. 플로팅 UI 그림자 단일화 원칙

> [!WARNING]
> 좌측 툴바, 사이드바, 모달 등 Floating UI에는 **보더(Stroke/Border)를 사용하지 않는다.**
> 오직 Drop Shadow (`shadow-float`: `0 10px 15px -3px rgba(0,0,0,0.1)`) 단일 속성으로 깊이감을 표현한다.

---

## 9. 브랜드 원칙 (DESIGN.md 핵심)

- **전문적이고 간결** — 설명하지 않고 선언한다
- **한국어 + 영어 병용** — 기술 레이어: 영어, 개념 레이어: 한국어
- **노드 앱은 단일 목적 UI** — 하나의 노드, 하나의 기능
- **입력 → 실행 → 출력** 3단계 흐름이 명확해야 함
- 결과물에는 **"참고용 시각화" 워터마크** 자동 삽입

---

## 10. 기술 스택 (FRONTEND.md 핵심)

| 레이어 | 표준 |
|--------|------|
| Framework | Next.js (App Router) |
| Styling | Tailwind CSS |
| Language | TypeScript |
| Package Manager | npm |

---

## 11. 노드별 구현 체크리스트

노드 UI를 새로 구현할 때 아래 순서로 점검한다.

- [ ] **Header**: 좌측 CAI CANVAS 타이틀 배치, 56px 고정, `#FFFFFF` 배경
- [ ] **Toolbar**: 좌측 플로팅 배치 (삭제 가능 — 노드 spec 확인)
- [ ] **Sidebar**: 우측 플로팅 `18rem`, 상단 노드 탭(pill) + `←` 버튼, 하단 CTA 고정
- [ ] **컬러**: 그레이스케일 7색만 사용 (유채색 금지)
- [ ] **폰트**: Bebas Neue + Pretendard 2종만 로드
- [ ] **간격**: `space-*` 토큰만 사용 (임의 px 금지)
- [ ] **높이**: CTA 52px, 인터랙티브 최솟값 44px
- [ ] **곡률**: `radius-box` 또는 `radius-pill`만 사용
- [ ] **Hover/Active/Disabled**: §4 인터랙션 규칙 적용
- [ ] **그림자**: Floating UI는 보더 없이 `shadow-float`만 사용
- [ ] **CTA-primary**: 화면당 최대 1개, 반드시 Sidebar 하단
- [ ] **워터마크**: 결과물 출력 시 "참고용 시각화" 워터마크 삽입
- [ ] **노드별 PART B**: `project_[node]/_context/design-style-guide-node.md` 확인·적용

---

## 12. 참조 문서 경로

| 문서 | 경로 |
|------|------|
| 브랜드 원칙 | `docs/design-style/DESIGN.md` |
| 공통 디자인 시스템 (PART A) | `docs/design-style/design-style-guide-CAI.md` |
| 노드별 디자인 시스템 (PART B) | `project_[node]/_context/design-style-guide-node.md` |
| 프론트엔드 개발 가이드 | `docs/FRONTEND.md` |
| AGENT C 운용 절차 | `docs/references/loop-frontend-design-agent.txt` |
| 노드 브랜드 아이덴티티 | `project_[node]/_context/brand-guidelines.md` |

---

`COPYRIGHTS 2026. CRE-TE CO.,LTD. ALL RIGHTS RESERVED.`
