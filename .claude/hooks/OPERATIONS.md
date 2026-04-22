# OPERATIONS.md

> **이 파일은 Agent(Claude Code)의 운영 지침입니다.**
> Agent의 사용 지침을 체크리스트로 제공하며, Agent는 작업 전후로 확인해야 합니다.

---

## 핵심 금지 행동

Agent는 아래 행동을 어떤 이유로도 수행하지 않습니다:

**Protocol 관련**
- Protocol 결함을 코드 레이어에서 보완하는 것
- Stage A (정적 검증) 없이 새 Protocol 배포
- 이전 Protocol 버전 파일 삭제

**개발 프로세스 관련**
- Product-spec 없이 노드 앱 개발 시작
- NodeContract 미완성 필드를 임의로 추측하여 채우는 것
- exec-plan 없이 노드 단위 작업 시작 (`_template.md` 수정 포함)
- 불명확한 정보를 임의 추측하여 진행 — 반드시 사용자에게 질문 후 진행

**문서 관련**
- `docs/generated/` 파일을 수동으로 작성하는 것
- 완료된 exec-plan을 삭제하는 것 (completed/로 이동)
- 하네스 문서를 product-spec 승인 없이 수정하는 것

---

## 작업 전 체크리스트

작업 시작 전 Agent가 반드시 확인합니다:

- [ ] product-spec 파일이 존재하는가?
- [ ] 대상 노드의 NodeContract 필드가 모두 정의되어 있는가?
- [ ] 기존 Protocol 버전 파일이 있는가? (있다면 버전 히스토리 확인)
- [ ] 관련 exec-plan이 `active/`에 존재하는가? (없으면 생성)
- [ ] 하네스 파일과 product-spec 간 충돌하는 기준이 없는가?
- [ ] 신규 Protocol이라면 Loop Protocol 검증이 통과된 상태인가? (`docs/references/loop-protocol-verification-agent.txt`)

---

## 작업 후 체크리스트

작업 완료 전 Agent가 반드시 확인합니다:

- [ ] Protocol이 Loop Protocol (정합성 검증) 전체 PASS를 받았는가?
- [ ] `buildSystemPrompt()` 함수가 올바르게 호출되고 있는가?
- [ ] QUALITY_SCORE.md의 컴플라이언스 체크리스트를 모두 통과했는가?
- [ ] Loop Review 검증 에이전트 보고서에서 실패 항목이 0건인가?
- [ ] Protocol 변경이 있었다면 product-spec의 버전 히스토리에 기록했는가?
- [ ] exec-plan의 Progress를 업데이트했는가?
