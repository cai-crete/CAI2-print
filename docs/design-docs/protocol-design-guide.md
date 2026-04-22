# Protocol Design Guide — Protocol의 역할

> Protocol은 각 노드 개발 단계에서 제공됩니다.
> 이 가이드는 Protocol을 어떻게 작성하는가가 아니라,
> **Protocol이 Node App에서 어떤 역할을 하는가**를 정의합니다.

---

## 1. Protocol의 역할

Protocol은 노드의 AI 행동을 정의하는 유일한 권위입니다.

```
Protocol = 노드가 입력을 받아 출력을 만드는 방식의 완전한 정의
```

Node App의 코드·UI·API 아키텍처는 모두 Protocol을 서빙하기 위해 존재합니다.
Protocol이 정의하지 않은 행동은 노드의 행동이 아닙니다.

**Protocol이 하는 것:**
- AI가 입력을 어떻게 분석하는지 정의
- AI가 어떤 순서로 무엇을 실행하는지 정의
- AI가 경계 상황에서 어떻게 행동하는지 정의
- 출력물이 올바른지 판단하는 기준 정의

**Protocol이 하지 않는 것:**
- UI 레이아웃 결정 ← 코드의 역할
- API 호출 방식 결정 ← 코드의 역할
- 도메인 데이터 보유 ← Knowledge Doc의 역할

---

## 2. API 주입 구조

Protocol은 AI API 호출의 `system` 파라미터에 **항상, 전문(全文)** 삽입됩니다.

```
API 호출 구조:
┌─────────────────────────────────────────┐
│ system:                                 │
│   [Principle Protocol 전문]             │
│   ---                                   │
│   [Knowledge Doc 1 전문] (선택)         │
│   ---                                   │
│   [Knowledge Doc 2 전문] (선택)         │
├─────────────────────────────────────────┤
│ user:                                   │
│   [입력 데이터] + [사용자 요청]         │
└─────────────────────────────────────────┘
```

**계층 충돌 규칙**: 상위 계층이 하위 계층을 항상 override합니다.
```
Principle Protocol  >  Knowledge Docs  >  User Input
     (불변 원칙)           (참조 지식)       (실행 명령)
```

**금지 사항:**
- Protocol을 `user` 메시지에 포함하는 것
- Protocol 일부만 삽입하는 것
- 세션 중간에 Protocol을 교체하는 것

---

## 3. Principle Protocol vs Knowledge Doc

두 문서는 역할이 다릅니다. 혼동하면 시스템 프롬프트가 비대해지거나 행동 정의가 누락됩니다.

| 유형 | 역할 | 담는 내용 |
|------|------|----------|
| **Principle Protocol** | 행동 정의 — "어떻게 작동하는가" | GOAL, CONTEXT, ROLE, ACTION PROTOCOL, COMPLIANCE CHECK |
| **Knowledge Doc** | 지식 제공 — "무엇을 알고 있는가" | 도메인 데이터, 변환 테이블, 재료 사전, 파라미터 레퍼런스 등 |

Knowledge Doc은 Protocol이 Action Step을 실행할 때 참조하는 데이터베이스입니다.
Protocol이 "파라미터를 계산하라"고 지시하면, Knowledge Doc이 계산 기준표를 제공합니다.

---

## 4. Protocol 필수 구조

모든 Principle Protocol은 다음 5개 섹션을 포함해야 합니다:

```
# SYSTEM: [노드명 & 버전]

# GOAL
[단일 목표 문장 — 무엇을 달성하는가. 1~3문장.]

# CONTEXT
- Ontological Status: [입력 데이터의 물리적 본질 정의]
- Operational Logic: [AI가 따르는 핵심 작동 원칙]
- Immutable Constants: [절대 변경 불가능한 요소 목록]

# ROLE
[AI의 정체성과 역할 — 구체적 직함·기능 포함]

# ACTION PROTOCOL
## Pre-Step: [생성 전 준비·분석]
## Step 1: [첫 번째 실행 단계]
## Step 2: [두 번째 실행 단계]
## Step N: [마지막 실행 단계]

# COMPLIANCE CHECK
## Pre-flight (생성 전)
  - [ ] [생성 전 충족 확인 조건]
## Post-generation (생성 후)
  - [ ] [출력물 검증 항목]
  - [ ] [모든 Action Step 실행 여부]
## Failure Mode (실패 처리)
  - IF [조건 X 충족 불가]: [대체 행동 — 절대 원본 반환 금지]
  - IF [입력 불완전]: [요청할 추가 정보 명시]
  - IF [입력 범위 초과 요청]: [입력 내 확인 가능한 패턴·맥락 기반 추론 실행. 원본 반환 또는 거부 금지]
```

---

## 5. Protocol 파일 위치

각 노드의 Protocol과 Knowledge Doc 파일은 해당 노드 프로젝트의 `_context/` 디렉토리에 위치합니다.

```
project_[node_name]/
└── _context/
    ├── protocol-[node_name]-v[N].txt     ← Principle Protocol
    ├── [knowledge-doc-1].txt              ← Knowledge Doc (선택)
    └── [knowledge-doc-2].txt              ← Knowledge Doc (선택)
```

**파일명 규칙:**

| 파일 | 규칙 | 예시 |
|------|------|------|
| Principle Protocol | `protocol-[node_name]-v[N].txt` | `protocol-change-viewpoint-v4.txt` |
| Knowledge Doc | `[내용을 설명하는 이름].txt` | `viewpoint-analysis.txt` |

**버전 관리 규칙:**
- 이전 버전 파일은 삭제하지 않습니다 — 롤백 기반 및 비교 기준
- 버전 업 시 새 파일을 생성하고, 변경 내용을 product-spec의 `## Protocol 버전 History`에 기록합니다

**Agent 로드 경로:**
Agent가 노드 개발 세션을 시작할 때 `_context/` 내 Protocol 파일을 우선 로드합니다.
`CAI/docs/`는 회사 전체 기준이며, `_context/`는 해당 노드 전용 기준입니다.

---

## 6. 오염 패턴 카탈로그

Protocol이 역할을 다하지 못했을 때 출력물에 나타나는 증상과 처방입니다.

| 패턴 | 증상 | 원인 | 처방 |
|------|------|------|------|
| **입력 패스스루** | 요청이 있었음에도 AI가 입력을 변환 없이 그대로 출력 | Failure Mode 부재 — 처리 불가 상황에서 원본 반환으로 회피 | Failure Mode에 입력 범위 초과 상황 IF-THEN 분기 추가. 원본 반환 절대 금지 명시 |
| **기하 변형** | 건물 비율·구조 변경 | Immutable Constants 미작동 | CONTEXT에 불변 상수 강조 반복 + Pre-flight 체크 추가 |
| **단계 건너뜀** | Action Step 미실행 | Step 간 의존성 불명확 | 각 Step에 "Step N 결과를 사용하여" 연결 명시 |
| **추상 명령 미변환** | 추상적 지시가 노드의 처리 단위로 변환되지 않고 출력에 반영됨 | 추상→구체 변환 Step 누락 | Step 1에 추상 명령 → 구체 파라미터 변환 강제 |
| **할루시네이션** | 원본에 없는 요소 추가 | Physical Reality 미정의 | CONTEXT Ontological Status 강화 |
| **Protocol 무시** | 출력이 Protocol 구조를 전혀 따르지 않음 | System prompt 미적용 | API 호출 코드 `system` 파라미터 확인 |

---

## 7. Protocol 검증 파이프라인

Protocol 초안 완성 후 배포 전까지 반드시 아래 파이프라인을 통과해야 합니다.

```
[Protocol 초안 작성]
        ↓
┌─── Stage A1: 구조 체크리스트 ────────┐
│  수동, 5분                           │
│  미통과 → Protocol 수정 → 재시작     │
└──────────────────────────────────────┘
        ↓ 통과
┌─── Stage A2: AI 결함 탐지 ───────────┐
│  별도 AI 세션, 10분                  │
│  점수 < 70 → Protocol 재작성         │
│  점수 70~89 → 결함 수정 → A2 재실행  │
└──────────────────────────────────────┘
        ↓ 점수 90+
┌─── Stage B: 동적 테스트 ─────────────┐
│  실제 API 호출                       │
│  Fail → 오염 진단 → Protocol 수정    │
│         → 실패 케이스만 재실행       │
└──────────────────────────────────────┘
        ↓ 전체 Pass
[배포 승인 → 버전 태그 → exec-plans/ 기록]
```

---

## 8. 오염 감지 후 대응 절차

오염이 감지되면 아래 순서로 처리합니다:

```
1. 오염 패턴 분류
   → §6 "알려진 오염 패턴 카탈로그" 참조

2. 원인 레이어 특정
   A. API 호출 레이어 문제 (system 파라미터에 Protocol이 실제로 들어가는가?)
   B. Protocol 구조 문제 (해당 Step이 존재하는가? Failure Mode가 있는가?)
   C. Protocol 언어 문제 (지시가 모호해서 AI가 다르게 해석했는가?)

3. 수정 범위 결정
   - A → 코드 수정 (buildSystemPrompt 함수 확인)
   - B → Protocol 구조 수정 → Stage A 재실행
   - C → Protocol 언어 수정 → Stage A2 재실행 (구조 체크는 생략 가능)

4. 수정 후 Stage B 실패 케이스만 재실행

5. 통과 시 버전 업 (v4 → v5)
```

---

`COPYRIGHTS 2026. CRE-TE CO.,LTD. ALL RIGHTS RESERVED.`
