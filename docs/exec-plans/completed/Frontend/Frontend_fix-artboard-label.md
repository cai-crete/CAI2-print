# Frontend Plan — 아트보드 생성 라벨 표기 오류 수정

> 이 문서는 살아있는 문서(living document)입니다.
> 작업을 진행하면서 발견, 결정, 진행 상황을 이 문서에 지속적으로 업데이트합니다.
> 이전 맥락이나 기억 없이, 이 문서만으로 작업을 완수할 수 있을 만큼 자급자족해야 합니다.
>
> 작업 완료 시 `completed/Frontend/` 폴더로 이동합니다.

---

## 개요

- **작업 유형**: 버그 수정 및 구조 개선
- **대상 노드**: 공통 (특히 SKETCH TO IMAGE 등 파생 노드)
- **관련 디자인 기준**: FRONTEND.md
- **시작일**: 2026-04-23

---

## 목표

스케치 기반 노드(예: SKETCH TO IMAGE, SKETCH TO PLAN 등)에서 확장 뷰를 나갈 때(임시 생성 완료 시점) 노드의 `artboardType`이 대상 타입(예: `image`)으로 올바르게 변환되도록 기반 로직을 추가합니다. 
기존의 `ArtboardType` 구조('blank' | 'sketch' | 'image' | 'thumbnail')는 **절대 변경하지 않고 유지**하되, 노드별로 정확한 UI 라벨(예: 'PLAN', 'ELEVATION' 등)이 표시될 수 있도록 `NODE_GENERATED_LABEL` 상수를 도입하여 라벨 렌더링 로직을 개선합니다.

---

## 영향 범위

| 컴포넌트 | 변경 유형 | 관련 파일 |
|----------|-----------|-----------|
| types | 수정 | `project_canvas/types/canvas.ts` |
| page | 수정 | `project_canvas/app/page.tsx` |

---

## 디자인 기준 체크

- [x] DESIGN.md 브랜드 컴플라이언스 확인
- [x] FRONTEND.md 코드 작성 기준 확인
- [x] 기존 컴포넌트 재사용 여부 검토
- [x] 반응형 / 접근성 기준 확인

---

## Progress

세분화된 체크포인트와 타임스탬프 — 실제 완료된 작업만 기록합니다.

- [x] 2026-04-23 — `canvas.ts`에 `NODE_TARGET_ARTBOARD_TYPE` 상수 정의 (생성 완료 시 도달해야 할 구조적 타입 맵핑)
- [x] 2026-04-23 — `canvas.ts`에 `NODE_GENERATED_LABEL` 상수 정의 (화면에 표시할 개별 명칭 맵핑)
- [x] 2026-04-23 — `page.tsx`의 `handleReturnFromExpand` 로직 내에 대상 `artboardType` 업데이트 로직 반영
- [x] 2026-04-23 — `NodeCard.tsx`에서 배지 라벨 렌더링 시, `artboardType`이 대상 타입과 일치하면 `NODE_GENERATED_LABEL`을 표시하도록 분기 로직 추가
- [x] 2026-04-23 — git commit & push — 모든 변경사항 커밋 및 원격 저장소 푸쉬

---

## Surprises & Discoveries

구현 중 발견한 예상치 못한 동작과 인사이트를 기록합니다.

- 

---

## Decision Log

방향 수정 및 설계 선택의 근거를 기록합니다.

| 날짜 | 결정 | 이유 |
|------|------|------|
| 2026-04-23 | `NODE_TARGET_ARTBOARD_TYPE` 및 라벨 분기 적용 | `ArtboardType` 구조를 변경하지 않고 유지하기 위해, 데이터 상의 타입(image)과 시각적 라벨(PLAN, ELEVATION 등)을 분리함. 상태가 생성 목표 타입에 도달했을 때 맞춤형 라벨이 표시되도록 함. |

---

## Outcomes & Retrospective

작업 완료 후 작성합니다.

- **원래 목표 달성 여부**: [x] Yes  [ ] Partial  [ ] No
- **결과 요약**: `ArtboardType` 구조('blank' | 'sketch' | 'image' | 'thumbnail')의 무결성을 지키면서도, 노드별 목표 라벨(`NODE_GENERATED_LABEL`)과 목표 타입(`NODE_TARGET_ARTBOARD_TYPE`)을 맵핑하여 UI 라벨을 동적으로 전환하도록 구현 완료. `page.tsx`의 확장 뷰 종료 로직에 상태 전환을 추가해 스케치 완료 시 올바른 라벨(예: PLAN, IMAGE)이 표시되도록 반영.
- **다음 작업에 반영할 것**: 실제 이미지/도면 생성 API가 연동될 때, 이 상태 전환 구조를 활용해 로딩 후의 상태를 처리.

---

`COPYRIGHTS 2026. CRE-TE CO.,LTD. ALL RIGHTS RESERVED.`
