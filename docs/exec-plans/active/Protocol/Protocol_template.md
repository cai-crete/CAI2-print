# Protocol Plan — [작업명]

> 이 문서는 살아있는 문서(living document)입니다.
> 작업을 진행하면서 발견, 결정, 진행 상황을 이 문서에 지속적으로 업데이트합니다.
> 이전 맥락이나 기억 없이, 이 문서만으로 작업을 완수할 수 있을 만큼 자급자족해야 합니다.
>
> 작업 완료 시 `completed/Protocol/` 폴더로 이동합니다.

> **⚠️ 작성 규칙 — Agent 필독**
> 이 템플릿을 복사해 exec-plan을 작성할 때 아래 규칙을 반드시 지킵니다.
> 1. `[...]` 플레이스홀더가 하나라도 남아 있으면 유효한 exec-plan이 아닙니다.
> 2. **개요 · 목표 · Loop Protocol 체크 · Progress** 4개 섹션은 모두 실제 내용으로 채워야 합니다.
> 3. Progress 항목에는 반드시 대상 파일명이 명시되어야 합니다 (Gate C 통과 조건).
> 4. Protocol 수정 작업이면 Loop Protocol 체크 항목도 빠짐없이 채워야 합니다.
> 5. 위 조건을 충족하지 못한 상태로 작업을 시작하면 핵심 금지 행동 위반입니다.

---

## 개요

- **작업 유형**: [새 기능 / 버그 수정 / 리팩토링 / Protocol 수정 / Spec 작성]
- **대상 노드**: [N[XX] 또는 공통]
- **Protocol 버전**: v[N] → v[N+1]  *(Spec 작성 시 해당 없으면 생략)*
- **시작일**: YYYY-MM-DD

---

## 목표

[이 작업이 완료되면 무엇이 달라지는가 — 1~3문장]

---

## Loop Protocol 체크 (Protocol 수정 시 필수)

- [ ] CHECK 1: 5개 필수 섹션 존재 여부
- [ ] CHECK 2: 토큰 수 ≤ 모델 컨텍스트의 25%
- [ ] CHECK 3: ACTION PROTOCOL ↔ COMPLIANCE CHECK 정합성
- [ ] CHECK 4: 오염 저항성 (PCS ≥ 90)
- [ ] OVERALL VERDICT: PASS

---

## Progress

세분화된 체크포인트와 타임스탬프 — 실제 완료된 작업만 기록합니다.

- [ ] YYYY-MM-DD HH:MM — [완료된 작업 설명]
- [ ] YYYY-MM-DD HH:MM — [완료된 작업 설명]
- [ ] YYYY-MM-DD HH:MM — git commit & push — 모든 변경사항 커밋 및 원격 저장소 푸쉬

---

## Surprises & Discoveries

구현 중 발견한 예상치 못한 동작과 인사이트를 기록합니다.

- [발견 내용]

---

## Decision Log

방향 수정 및 설계 선택의 근거를 기록합니다.

| 날짜 | 결정 | 이유 |
|------|------|------|
| YYYY-MM-DD | [결정 내용] | [근거] |

---

## Outcomes & Retrospective

작업 완료 후 작성합니다.

- **원래 목표 달성 여부**: [ ] Yes  [ ] Partial  [ ] No
- **결과 요약**: [원래 목표 대비 실제 결과]
- **다음 작업에 반영할 것**: [이 작업에서 배운 것]

---

`COPYRIGHTS 2026. CRE-TE CO.,LTD. ALL RIGHTS RESERVED.`
