# CAI CANVAS 앱 인터페이스 디자인 시스템

본 문서는 CAI CANVAS 서비스의 일관된 브랜드 정체성과 전문가급 UX를 보장하기 위한 인터페이스 디자인 표준입니다.

**문서 구성:**
- **PART A** : @design-style-guide-CAI.md — 앱 인터페이스 공통 디자인 시스템 (모든 CAI 노드에 적용)
- **PART B** : @design-style-guide-node.md — 'node' 노드 전용 문서 템플릿 디자인 시스템


---

# PART A · 앱 인터페이스 공통 디자인 시스템

> 이 파트의 모든 규칙은 **CAI CANVAS의 모든 노드**에 공통 적용됩니다.
> 특정 노드에만 해당하는 레이아웃·기능은 `['node' 전용]` 등 노드명으로 명시합니다.

---

## A.0 시각적 계층 구조 원칙 (Visual Hierarchy Principles)

> **참조 원칙**: Apple Design Tips (사용자 의도 파악, 가장 중요한 요소 즉각 인식), Figma Principles (대비·정렬)

화면의 모든 요소는 아래 3단계 우선순위 계층을 따릅니다. 계층을 어기는 디자인 결정은 허용되지 않습니다.

### A.0.1 3단계 시각적 우선순위

| 우선순위 | 명칭 | 정의 | 대표 요소 |
| :--- | :--- | :--- | :--- |
| **Tier 1 — Primary** | 핵심 액션 | 사용자가 반드시 인식해야 하는 단 하나의 요소 | CTA-primary (GENERATE) |
| **Tier 2 — Secondary** | 보조 액션 | Tier 1을 보완하는 상황 의존적 요소 | CTA-secondary (EXPORT), 모드 선택 탭 |
| **Tier 3 — Ambient** | 맥락 정보 | 읽히되 눈에 띄지 않아야 할 배경 정보 | Caption, 구분선, 비활성 라벨 |

### A.0.2 계층 적용 원칙

1.  **화면당 Tier 1은 단 1개**: CTA-primary는 화면에 1개만 존재한다. 동시에 2개 이상의 Tier 1 요소를 배치하지 않는다.
2.  **대비(Contrast) 우선**: Tier 1은 항상 배경과의 명도 대비가 가장 높아야 한다. CAI 시스템에서는 `black` 배경 + `white` 텍스트 조합이 최고 대비를 갖는다.
3.  **정렬(Alignment) 일관성**: 동일 Tier의 요소는 동일한 정렬 축을 공유한다. 사이드바 내 CTA 버튼은 모두 좌우 full-width로 정렬한다.
4.  **근접성(Proximity) 그룹화**: 기능적으로 연관된 요소는 8px 그리드 기준 `space-2` (16px) 이내로 묶는다. 비연관 그룹 간에는 최소 `space-4` (32px) 이상의 간격을 둔다.
5.  **반복(Repetition) 일관성**: 같은 역할의 컴포넌트는 어느 화면에서도 동일한 시각적 형태를 유지한다. CTA-primary의 pill 형태, black/white 색상은 예외 없이 반복 적용한다.

### A.0.3 Alignment 원칙

> **참조 원칙**: Figma UI Design Principles (정렬)

- **행(Row) 정렬**: 같은 행에 있는 요소들은 **같은 높이**를 가진다.
- **열(Column) 정렬**: 같은 열에 있는 요소들은 **같은 너비**를 가진다.

---

## A.1 폰트 시스템 (App UI)

앱 인터페이스에는 다음 2종의 폰트만 적용됩니다.
PART B의 템플릿 전용 폰트(§B.1)와 별개로 관리됩니다.

| 폰트 | 용도 |
| :--- | :--- |
| **Bebas Neue** | 헤더 타이틀 / 기능 탭 타이틀 / CTA 버튼 텍스트 전체 / 옵션 버튼 텍스트 / 모달·사이드바 타이틀 / 사이드바 섹션 타이틀(Subtitle) |
| **Pretendard** | Body 텍스트 / 숫자 인디케이터 / 텍스트 홀더 내부 / 안내 문구 |

---

## A.2 타이포그래피 위계 (App UI)

| 계층 | 폰트 | Weight | Size | 행간 | 자간 | 주요 용도 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **타이틀** | Bebas Neue | Regular | 16pt | 100% | 3% | 헤더, 탭, CTA 버튼 문구, 모달·사이드바 메인 타이틀 |
| **서브타이틀** | Bebas Neue | Regular | 14pt | 100% | 3% | 사이드바 섹션 타이틀 |
| **Body 1** | Pretendard | Semibold | 16pt | 140% | — | 강조 본문 |
| **Body 2** | Pretendard | Regular | 16pt | 140% | — | 일반 본문 |
| **Body 3** | Pretendard | Regular | 14pt | 140% | — | 보조 본문 |
| **Caption** | Pretendard | Regular | 12pt | 120% | — | 캡션, 보조 설명 |

---

## A.3 컬러 시스템 (App UI)

앱 인터페이스 전용 컬러 팔레트. 5단계 그레이스케일 + black/white 7색 체계.
위계별로 사용 맥락을 지정하여 그레이 남용을 방지한다.

> **핵심 원칙: 흑백 유지.** 앱 인터페이스에서 색상(무채색 외)은 사용하지 않는다.
> 유일한 예외: 오류 상태(red, §A.8.5)

**그레이스케일 7색 체계**

| 토큰 | Hex | 명도 | 주요 사용 맥락 | 절대 금지 |
| :--- | :--- | :--- | :--- | :--- |
| `black` | `#000000` | 0% | CTA-primary 배경 / CTA-secondary·options 보더+텍스트 / 헤더 타이틀 / 기본 텍스트 | — |
| `white` | `#FFFFFF` | 100% | 사이드바·헤더·모달·버튼 배경 / CTA-primary 텍스트 | — |
| `gray-500` | `#333333` | 79% | 보조 텍스트 (Body 2·3), 아이콘 기본 색상 | 배경색 |
| `gray-400` | `#666666` | 60% | Caption, 힌트 텍스트, 비활성 라벨 | 주요 텍스트 |
| `gray-300` | `#999999` | 40% | 비활성 아이콘, 비활성 버튼 텍스트, placeholder 텍스트 | 강조 요소 |
| `gray-200` | `#CCCCCC` | 20% | 인터랙션 요소 보더 (입력 영역 테두리, 비활성 버튼 보더, CTA-options default 보더 등) | 텍스트 |
| `gray-100` | `#EEEEEE` | 7% | **구분선 전용** — 섹션 구분선, 툴바 구분선, 사이드바·헤더 구분선 등. **예외**: 인터랙션 hover 배경(§A.8.1) | 텍스트 |

> **`gray-200` vs `gray-100` 구분 기준:**
> `gray-200`은 사용자가 조작하는 **인터랙션 요소의 경계** (버튼·입력 테두리 등).
> `gray-100`은 레이아웃을 **구획하는 구분선** (툴바·사이드바·섹션 구분선 등).
> 구분선에는 항상 `gray-100`을 사용합니다.

---

## A.4 UI 요소 높이 기준

가로로 긴 UI 요소의 높이는 세 가지 기준 중 하나로 통일한다.

| 높이 | rem 값 | 적용 대상 |
| :--- | :--- | :--- |
| **52px** | `3.25rem` | CTA-primary, CTA-secondary |
| **44px** | `2.75rem` | CTA-options, 기능 탭(NodeSelector 드롭다운), 숫자 인디케이터, 아이콘 버튼(툴바), 기타 가로형 입력 요소 |
| **36px** | `2.25rem` | CTA-secondary-small **(1차 예외 — 모달 내부 등 좁은 영역 전용)** |
| **28px** | `1.75rem` | CTA-tertiary-small **(2차 예외 — 좁은 영역 내부 최저 위계 인라인 버튼 전용)** |

> **최소 터치/클릭 영역 규칙 (Touch Target Minimum)**
> Apple Human Interface Guidelines 기준: **모든 인터랙티브 요소의 물리적 높이·너비 자체가 44px 이상이어야 한다.**
> padding 보정으로 히트 영역만 44px를 확보하는 방식은 허용하지 않는다. 시각적 높이(height 속성)가 반드시 44px 이상이어야 한다.
> **공인 예외**: CTA-secondary-small (36px) 및 CTA-tertiary-small (28px) — 각각 좁은 영역 전용이며, 이 예외는 다른 컴포넌트에 확장 적용이 불가하다.

---

## A.5 CTA 컴포넌트 가이드

CTA(Call To Action) 버튼은 3종 + 2 variant로 분류한다.
모든 CTA 문구는 **§A.1 · §A.2 기준: Bebas Neue / 타이틀 위계** 적용.

---

### CTA-primary (예: GENERATE)

주요 액션 버튼. 화면당 단 1개. (§A.0.1 Tier 1 원칙 적용)

| 속성 | 값 |
| :--- | :--- |
| 높이 | `3.25rem` (52px) |
| 너비 | 100% |
| 모서리 곡률 | `radius-pill` (`5rem`) |
| 폰트 | Bebas Neue / 타이틀 (16pt) |

| 상태 | 배경 | 텍스트 | 보더 | 커서 |
| :--- | :--- | :--- | :--- | :--- |
| **default** | `black` | `white` | 없음 | pointer |
| **loading** | `black` | `white` ("GENERATING..." 전환) | 없음 | not-allowed |
| **disabled** | `gray-200` | `gray-300` | 없음 | not-allowed |

---

### CTA-secondary (예: EXPORT)

보조 액션 버튼. primary 하단에 위치. (§A.0.1 Tier 2 원칙 적용)

| 속성 | 값 |
| :--- | :--- |
| 높이 | `3.25rem` (52px) |
| 너비 | 100% |
| 모서리 곡률 | `radius-pill` (`5rem`) |
| 폰트 | Bebas Neue / 타이틀 (16pt) |

| 상태 | 배경 | 텍스트 | 보더 | 커서 |
| :--- | :--- | :--- | :--- | :--- |
| **default** | `white` | `black` | `1.5px solid black` | pointer |
| **disabled** | `white` | `gray-300` | `1.5px solid gray-300` | not-allowed |

---

### CTA-secondary-small

모달 내 단일 버튼 등 컴팩트한 보조 액션이 필요할 때 사용. CTA-secondary의 높이만 축소.

| 속성 | 값 |
| :--- | :--- |
| 높이 | `2.25rem` (36px) — `2.75rem × 0.8 = 2.2rem` 소수 → 36px 정수 치환 |
| 너비 | 상황에 따라 가변 |
| 모서리 곡률 | `radius-pill` (`5rem`) |
| 폰트 | Bebas Neue, **16pt** |
| 보더 | CTA-secondary와 동일 (`1.5px solid`) |

| 상태 | 배경 | 텍스트 | 보더 | 커서 |
| :--- | :--- | :--- | :--- | :--- |
| **default** | `white` | `black` | `1.5px solid black` | pointer |
| **disabled** | `white` | `gray-300` | `1.5px solid gray-300` | not-allowed |

---

### CTA-tertiary-small (예: 모달 등 하위 버튼)

패널·리스트 내부의 인라인 소형 액션 버튼. CTA-secondary-small보다 한 단계 낮은 시각적 위계.
모달, 리스트 등 좁은 영역 내부에 적용.

| 속성 | 값 |
| :--- | :--- |
| 높이 | `1.75rem` (28px) |
| 너비 | 내용에 따라 가변 (`fit-content`) |
| 모서리 곡률 | `radius-box` (`0.625rem`) |
| 폰트 | Bebas Neue / 타이틀 (16pt) |
| 보더 | `1px solid` |

| 상태 | 배경 | 텍스트 | 보더 | 커서 |
| :--- | :--- | :--- | :--- | :--- |
| **default** | `white` | `gray-500` | `1px solid gray-200` | pointer |
| **hover** | `white` | `black` | `1px solid black` | pointer |
| **disabled** | `white` | `gray-300` | `1px solid gray-200` | not-allowed |

> **높이 예외 명시**: 28px는 §A.4 최솟값(44px) 및 CTA-secondary-small(36px)에 이어 두 번째 공인 예외. 좁은 영역 내부 또는 가장 낮은 시각적 위계가 요구되는 맥락에 한해 적용하며, 다른 컨텍스트로 확장 불가.
> **secondary-small과의 구분**: secondary-small은 모달 단일 버튼(검은 보더·텍스트, pill 형태), tertiary-small은 패널 인라인 다중 버튼(회색 보더·텍스트, box 형태).

---

### CTA-options (예: PURPOSE 선택 버튼)

선택 그룹 내 단일 옵션 버튼. 복수 존재, 상호 배타적 선택.

| 속성 | 값 |
| :--- | :--- |
| 높이 | `2.75rem` (44px) 고정 |
| 너비 | 100% |
| 모서리 곡률 | `radius-box` (`0.625rem`) |
| 폰트 | Bebas Neue / 타이틀 (16pt) |

| 상태 | 배경 | 텍스트 | 보더 | 커서 |
| :--- | :--- | :--- | :--- | :--- |
| **default** | `white` | `black` | `1.5px solid gray-200` | pointer |
| **selected** | `gray-100` | `black` | `1.5px solid black` | pointer |

> `selected` 상태의 배경 `gray-100` 적용은 "선택 상태 전용 예외"로, §A.3의 `gray-100` 용도와 다릅니다. 이 예외는 CTA-options에만 적용된다.

---

## A.6 앱 인터페이스 레이아웃 (App UI Layout)

어플리케이션의 작업 환경을 구성하는 주요 UI 요소들의 배치와 간격 체계입니다.

### A.6.1 주요 컴포넌트 규격

*   **상단 헤더 (Global Header)**:
    *   높이: `3.5rem` (56px)
    *   구성: 서비스 로고 및 상태 정보 배치. 배경색 `#FFFFFF`, 하단 보더 `1px gray-100`.
*   **우측 사이드바 (Primary Sidebar)**:
    *   너비: `18rem` (288px)
    *   배치: Floating 스타일 (`right: 1rem`, `top: 8rem`, `bottom: 1rem`)
    *   내부 패딩: `1.25rem` (20px)
*   **좌측 플로팅 툴바 (Floating Toolbar)**:
    *   배치: `left: 1rem`, 수직 중앙 정렬 (`top: 50%`, `translateY(-50%)`)
    *   **공통 구조**: Pill 묶음(흰 배경, `radius-pill`, `shadow-float`) + 분리된 원형 버튼으로 구성. 버튼 크기 `2.75rem × 2.75rem` (44px × 44px) — §A.4 최솟값 준수.
    *   **버튼 구성은 노드별로 다르며**, 각 노드의 전용 문서에서 정의한다. PRINT 노드의 구성은 §B.0.2 참조.
*   **플로팅 네비게이션 (Floating Nav)**:
    *   높이: `2.75rem` (44px)
    *   배치: `top: 4.5rem`, `right: 1rem`, 너비 `18rem`


---

## A.7 간격 & 곡률 & Z-Index 토큰 (UI Tokens)

### A.7.1 Spacing Scale (8px 그리드 기반)

> **참조 원칙**: TW Elements Spacing — 8px 그리드 기반의 일관된 Spacing Scale.
> 모든 여백·패딩 수치는 아래 토큰 명칭으로 지정한다. 임의의 수치 사용 금지.

| 토큰 | px 값 | rem 값 | 주요 용도 |
| :--- | :--- | :--- | :--- |
| `space-0` | 0px | 0 | 마진·패딩 없음 |
| `space-1` | 8px | 0.5rem | 아이콘 내부 패딩, 인접 요소 최소 간격 |
| `space-2` | 16px | 1rem | 기본 컴포넌트 내부 패딩, 연관 그룹 내 요소 간격 |
| `space-3` | 20px | 1.25rem | 사이드바·카드 내부 패딩 |
| `space-4` | 32px | 2rem | 비연관 그룹 간 구분 간격, 섹션 상단 여백 |
| `space-5` | 40px | 2.5rem | 주요 섹션 간 여백 |
| `space-6` | 48px | 3rem | 페이지 레벨 여백 |
| `space-8` | 64px | 4rem | 대형 레이아웃 구분 여백 |

> **근접성(Proximity) 그룹화 규칙**: 동일 기능군 내 요소는 `space-1` ~ `space-2` (8~16px), 서로 다른 기능군 간에는 `space-4` (32px) 이상을 유지한다.

**기존 토큰과의 매핑:**

| 기존 표현 | 매핑 토큰 | 실제 값 |
| :--- | :--- | :--- |
| "기본 여백 1rem" | `space-2` | 16px |
| "사이드바 내부 패딩 1.25rem" | `space-3` | 20px |
| "툴바 pill 간격 0.5rem" | `space-1` | 8px |

### A.7.2 간격 및 곡률 토큰

*   **기본 여백 (Global Spacing)**: `space-2` = `1rem` (16px)을 기본 단위로 사용합니다.
*   **컴포넌트 곡률 (Corner Radius)**:
    *   모듈형 박스 (`radius-box`): `0.625rem` (10px) — 사이드바, 헤더 버튼, 입력 영역, CTA-options 적용.
    *   캡슐형/원형 요소 (`radius-pill` / `50%`): `5rem` (80px) 또는 50% — 툴바 Pill 묶음 영역, 페이지 카운트 조절기, CTA-primary/secondary 등.
*   **그림자 (Shadow)**: `0 10px 15px -3px rgba(0,0,0,0.1)` — 부유 요소의 깊이감 형성.
    > **플로팅 UI 그림자 단일화 원칙**: 좌측 툴바, 분리된 기능 탭, 모달창, 사이드바 본체 및 토글버튼 등 공간에 떠 있는(Floating) UI는 **명시적인 선(Stroke/Border)을 사용하지 않고 오직 Drop Shadow(`shadow-float`) 단일 속성으로만** 깊이감과 경계를 표현해야 한다.

### A.7.3 레이어 계층 시스템 (Z-Index)

| 계층 | Z-Index | 대상 컴포넌트 |
| :--- | :--- | :--- |
| **Modal Layer** | `1000+` | 툴바, 팝업 모달, 토스트 알림 |
| **Nav Layer** | `100` | 플로팅 메뉴, 상태 표시줄 |
| **Control Layer** | `90` | 우측 사이드바 |
| **System Layer** | `10` | 상단 고정 헤더 |
| **Canvas Layer** | `Base` | 애플리케이션 캔버스 (공통 배경 + 무한 그리드)

---

## A.8 인터랙션 & 피드백 규칙 (Interaction & Feedback)

> **참조 원칙**: Apple Design Tips (친숙한 상호작용, 시각적 직관 피드백), Figma 대비 원칙.
> 모든 인터랙티브 요소는 상태 변화를 시각적으로 즉각 피드백해야 한다.

### A.8.1 Hover 상태 규칙

| 요소 유형 | Hover 표현 | 전환 (Transition) |
| :--- | :--- | :--- |
| **CTA-primary** | 배경 `black` → opacity `0.85` (약간 투명) | `opacity 150ms ease` |
| **CTA-secondary** | 배경 `white` → `gray-100` | `background-color 150ms ease` |
| **CTA-options (default)** | 보더 `gray-200` → `black` | `border-color 150ms ease` |
| **CTA-options (selected)** | 변화 없음 (이미 active) | — |
| **CTA-tertiary-small** | 텍스트 `gray-500` → `black`, 보더 `gray-200` → `black` | `color 150ms ease, border-color 150ms ease` |
| **툴바 아이콘 버튼** | 배경 `transparent` → `gray-100` | `background-color 100ms ease` |

### A.8.2 Focus 상태 규칙

| 요소 유형 | Focus 표현 |
| :--- | :--- |
| **밝은 배경 위 버튼** (기본) | `outline: 2px solid #000000`, `outline-offset: 2px` |
| **어두운 배경 위 버튼** (CTA-primary 등 `black` bg) | `outline: 2px solid #FFFFFF`, `outline-offset: 2px` |
| **텍스트 입력 영역** | 보더 `gray-200` → `black`, `outline: none` |
| **드롭다운/셀렉트** | 보더 `gray-200` → `black`, `outline: none` |

> Focus 링은 흑백 시스템을 준수한다. `#000000` on `#FFFFFF` = 21:1 명도 대비로 WCAG 2.1 AAA(7:1) 기준을 초과 달성한다.

### A.8.3 Active(클릭 중) 상태 규칙

| 요소 유형 | Active 표현 | 전환 |
| :--- | :--- | :--- |
| **CTA-primary** | `transform: scale(0.97)` | `transform 80ms ease` |
| **CTA-secondary** | `transform: scale(0.97)` | `transform 80ms ease` |
| **툴바 아이콘 버튼** | 배경 `gray-200` | `background-color 80ms ease` |

### A.8.4 전환 속도 원칙

| 유형 | 권장 속도 | 이유 |
| :--- | :--- | :--- |
| 색상·배경 전환 | `150ms ease` | 충분히 인지 가능하되 지연감 없음 |
| 크기·Transform 전환 | `80ms ease` | 즉각적인 물리적 피드백 |
| 모달·오버레이 등장 | `200ms ease-out` | 자연스러운 진입감 |
| 로딩 스피너 | rotating `800ms linear infinite` | 구동 중 인식 |

### A.8.5 비시각적 피드백 규칙

*   **Disabled 요소**는 `opacity: 0.5`를 추가하지 않는다. 대신 §A.5에 정의된 전용 disabled 색상 토큰(`gray-200`, `gray-300`)으로만 표현한다. (opacity 사용 시 배경이 투명해 보이는 부작용 방지)
*   **로딩 상태(CTA-primary)**: 버튼 텍스트를 "GENERATING..."으로 즉시 전환하여 처리 중임을 텍스트로 명확히 전달한다. 스피너 아이콘은 선택적으로 추가할 수 있다.
*   **Toast 알림**: 사용자 피드백 메시지를 표시하는 알림 컴포넌트. `Modal Layer` (Z-Index 1100)에 배치.

#### Toast 디자인 사양

| 속성 | 값 |
| :--- | :--- |
| 위치 | 화면 중앙 하단 (`bottom: 2rem`, `left: 50%`, `translateX(-50%)`) |
| 배경 | `black` (`#000000`) |
| 텍스트 | `white` (`#FFFFFF`), Pretendard, 13pt (0.8125rem) |
| 모서리 곡률 | `radius-box` (`0.625rem`) |
| 그림자 | `shadow-float` |
| 패딩 | `0.625rem 1rem` |
| 자동 소멸 | 3초 후 fade-out (200ms) |
| 등장 애니메이션 | slide-up + fade-in (200ms) |
| Z-Index | `1100` |
| 중복 방지 | 동일 메시지 표시 중이면 타이머만 리셋 |

#### Toast 유형별 아이콘

| 유형 | 아이콘 | 아이콘 색상 | 사용 맥락 |
| :--- | :--- | :--- | :--- |
| **warning** | 삼각형 경고 (▲ + !) | `#CC0000` (red) | 선행 조건 미충족, 오류 상태 |
| **success** | 원형 체크 (○ + ✓) | `#1A8917` (green) | 작업 성공, 저장 완료 |

> **컬러 예외**: Toast 아이콘의 red(`#CC0000`)와 green(`#1A8917`)은 §A.3 그레이스케일 7색 원칙의 공인 예외이다. 이 두 색상은 Toast 아이콘 맥락에서만 사용 가능하며, 다른 UI 요소에 확장 적용할 수 없다.

---

## A.9 아이콘 규격 (Icon Specifications)

아이콘은 **24px 프레임** 안에 **20px 실질 크기**로 배치하는 것을 표준으로 한다.
프레임 양 끝의 여백(각 2px)이 시각적 호흡을 제공하며, 인접 요소와의 정렬 기준점 역할을 한다.

| 속성 | px 값 | rem 값 |
| :--- | :--- | :--- |
| **프레임 크기** (렌더링 박스) | 24px | `1.5rem` |
| **실질 크기** (아이콘 svg/img) | 20px | `1.25rem` |
| **내부 여백** (프레임 - 실질) | 각 2px | — |

> **rem 환산 기준**: 루트 폰트 사이즈 16px 기준. `24 ÷ 16 = 1.5rem`, `20 ÷ 16 = 1.25rem`.
> 코드에서 아이콘 크기를 지정할 때는 반드시 px 대신 rem 값을 사용한다.

**색상 규칙** — §A.3 컬러 시스템 연동:

| 상태 | 색상 토큰 |
| :--- | :--- |
| **기본(default)** | `gray-500` (`#333333`) |
| **비활성(disabled)** | `gray-300` (`#999999`) |

---

# PART B · 'node' 노드 — 문서 템플릿 디자인 시스템

> 이 파트의 모든 내용은 **'node' 노드 전용**입니다.
> PART A의 앱 인터페이스 디자인 규칙을 기준으로 관리됩니다.
> 예외사항이 있을 경우 별도 표기합니다. 예외사항은 PART A보다 우선합니다.
---

## B.0 'node' 서비스 개요


---

`COPYRIGHTS 2026. CRE-TE CO.,LTD. ALL RIGHTS RESERVED.`
