# QUALITY_SCORE.md — 코드 품질 기준 문서

**관장하는 영역:** 좋은 코드란 무엇인가, 어떻게 측정하는가

에이전트가 생성하는 코드의 품질을 어떻게 정의하고 측정하는지를 기술합니다. 이 기준이 없으면 에이전트가 기능적으로 올바른 코드를 작성하더라도 팀이 기대하는 품질 수준을 충족하지 못할 수 있습니다.

**다루는 내용:**

- 테스트 커버리지 기준 및 어떤 종류의 테스트를 어느 수준에서 요구하는지
- 코드 복잡도의 허용 한계
- 성능 기준 — 어떤 작업이 어떤 시간 안에 완료되어야 하는지
- 안티패턴 목록 — 기술적으로 작동하지만 이 프로젝트에서 금지된 패턴들
- 코드 리뷰 기준 — 무엇이 승인 또는 거절의 근거가 되는지

에이전트는 코드 작성 후 자체 검토 시 이 문서를 기준으로 자신의 출력물을 평가합니다.

---

## Protocol Compliance Score (PCS)

**PCS**는 생성 출력물이 Protocol의 Action Step을 얼마나 실행했는지 측정합니다.

```
PCS = (실행된 Step 수 / 전체 Step 수) × 100
```

| 점수 | 판정 | 조치 |
|------|------|------|
| 100 | 완전 컴플라이언스 | 출력 승인 |
| 80–99 | 부분 컴플라이언스 | 누락 Step 재실행 요청 |
| 80 미만 | 컴플라이언스 실패 | 재생성 또는 Protocol 점검 |

---

## 출력 품질 차원 (공통)

모든 노드의 출력물은 다음 4개 차원으로 평가합니다:

| 차원 | 설명 | 측정 방법 |
|------|------|----------|
| **Protocol Compliance** | Action Step 전체 실행 여부 | PCS 채점 |
| **Immutable Constants** | 불변 상수 보존 여부 | 원본과 비교 |
| **Boundary Resolution** | 경계 조건 처리 여부 | 빈 출력·원본 반환 없음 확인 |
| **Output-Specific** | 노드 고유 품질 기준 충족 여부 | 노드 체크리스트 기준 |

---

## 공통 노드 체크리스트 (템플릿)

신규 노드 추가 시 이 템플릿을 기반으로 해당 노드 체크리스트를 작성합니다:

```
Protocol Compliance (PCS):
[ ] Pre-Step 실행 여부
[ ] Step 1 실행 여부 + 증거
[ ] Step 2 실행 여부 + 증거
[ ] ...
[ ] Compliance Check 섹션 실행 여부

Immutable Constants:
[ ] [노드의 불변 상수 1] 보존 여부
[ ] [노드의 불변 상수 2] 보존 여부

Boundary Resolution:
[ ] 알려진 실패 패턴 A 발생 여부
[ ] 알려진 실패 패턴 B 발생 여부

Output-Specific:
[ ] [노드 고유 품질 기준 1]
[ ] [노드 고유 품질 기준 2]
```

---

## 품질 기록 양식

출력물 품질을 기록할 때 사용합니다:

```markdown
## Quality Record
- **Node**: [노드명]
- **Protocol Version**: [vN]
- **Date**: YYYY-MM-DD
- **Input Summary**: [입력 요약]
- **PCS**: [점수] / 100
- **품질 차원별 Pass/Fail**:
  - Protocol Compliance: [ ] Pass  [ ] Fail
  - Immutable Constants: [ ] Pass  [ ] Fail
  - Boundary Resolution: [ ] Pass  [ ] Fail
  - Output-Specific: [ ] Pass  [ ] Fail
- **감지된 오염 패턴**: [없음 / 패턴명]
- **조치**: [승인 / 재생성 / Protocol 수정]
```

---

## Loop Protocol 연동

Protocol 업로드 시 Loop Protocol 검증 에이전트가 이 문서의 기준을 자동으로 적용합니다.

| Loop Protocol 체크 | 이 문서의 기준 |
|------------|--------------|
| CHECK 1 구조 완결성 | Protocol 필수 섹션 존재 여부 |
| CHECK 2 간결성 | 토큰 수 ≤ 컨텍스트 25% |
| CHECK 3 내부 일관성 | ACTION PROTOCOL ↔ COMPLIANCE CHECK 정합성 |
| CHECK 4 오염 저항성 | PCS 채점 기준 + 공통 노드 체크리스트 |

> Loop Protocol 검증 에이전트 프롬프트: `docs/references/loop-protocol-verification-agent.txt`
> Loop Protocol 전체 통과(PCS ≥ 90) 시 Stage B 진입 허가.

---

`COPYRIGHTS 2026. CRE-TE CO.,LTD. ALL RIGHTS RESERVED.`
