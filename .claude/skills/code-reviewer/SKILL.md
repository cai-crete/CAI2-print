---
name: code-reviewer
description: CAI Harness Loop B Phase V3.5 — 코드 품질 자동 검증 스킬. TypeScript, JavaScript, Python, Go, Swift, Kotlin 정적 분석, PR diff 분석, 검토 보고서 생성. Verification Agent(AGENT B)가 Loop B 반복 검증 사이클에서 호출한다.
---

# Code Reviewer

CAI Harness **Loop B — Phase V3.5** 에서 Verification Agent(AGENT B)가 호출하는 코드 품질 검증 스킬.

---

## Loop B 연동 (Phase V3.5)

### 위치

```
Loop B 반복 사이클
  └─ AGENT B (Verification Agent)
       └─ Phase V1  → 빌드 결과물 수신
       └─ Phase V2  → 스펙 적합성 검토
       └─ Phase V3  → 프로토콜 준수 검토
       └─ Phase V3.5 → [이 스킬 호출]
       └─ Phase V4  → PASS/FAIL 최종 판정 → AGENT A 피드백
```

### Phase V3.5 실행 순서

**Step 1 — 코드 품질 검사**

```bash
python .claude/skills/code-reviewer/scripts/code_quality_checker.py \
  c:/Users/USER01/Downloads/cai-harness-print/project.10_print \
  --verbose
```

**Step 2 — PR Diff 분석**

```bash
python .claude/skills/code-reviewer/scripts/pr_analyzer.py \
  c:/Users/USER01/Downloads/cai-harness-print/project.10_print \
  --verbose
```

**Step 3 — 검토 보고서 생성**

```bash
python .claude/skills/code-reviewer/scripts/review_report_generator.py \
  c:/Users/USER01/Downloads/cai-harness-print/project.10_print \
  --output c:/Users/USER01/Downloads/cai-harness-print/docs/exec-plans/active/code-review-[node_name]-[YYYY-MM-DD].md
```

출력 경로 규칙: `docs/exec-plans/active/code-review-[node_name]-[YYYY-MM-DD].md`
예시: `docs/exec-plans/active/code-review-n10-print-2026-04-15.md`

**Step 4 — RELIABILITY.md / SECURITY.md 교차검증**

생성된 보고서의 findings를 다음 기준 문서와 대조한다:

- `docs/references/RELIABILITY.md` — 신뢰성 기준 위반 여부
- `docs/references/SECURITY.md` — 보안 기준 위반 여부

findings severity 매핑:
| 스크립트 severity | 교차검증 기준 문서 |
|---|---|
| `security` | SECURITY.md |
| `bug`, `error_handling` | RELIABILITY.md |
| `complexity`, `design`, `typing` | RELIABILITY.md (참고) |
| `style`, `todo`, `debug` | 교차검증 불필요 |

### Phase V3.5 PASS / FAIL 판정 기준

**PASS** — 다음 조건을 모두 충족:
- `security` severity findings 없음
- RELIABILITY.md 기준을 위반하는 `bug` / `error_handling` findings 없음

**FAIL** — 다음 중 하나라도 해당:
- `security` severity findings 1건 이상
- RELIABILITY.md 기준 위반 findings 1건 이상

FAIL 시 AGENT A에 피드백 → AGENT A 재구현 → Loop B 재진입 (최대 5회)

---

## 스크립트 상세

### 1. code_quality_checker.py

정적 분석 스크립트. 소스 디렉터리를 재귀 탐색하여 언어별 품질 이슈를 검출한다.

**지원 언어:** Python, TypeScript, JavaScript, Go

**검출 항목:**
- Python: mutable default, bare except, `== None`, 장함수(>50줄), 과다 파라미터(>5개)
- TS/JS: `var` 사용, `any` 명시, `eval()`, 빈 catch
- Go: 에러 무시(`_ =`), `panic()` 사용
- 공통: 긴 줄(>120자), trailing whitespace, TODO 잔존, debug 구문, hardcoded secret, 과도한 중첩(depth>4)

**제외 경로:** `node_modules`, `.git`, `__pycache__`, `vendor`, `dist`

```bash
python .claude/skills/code-reviewer/scripts/code_quality_checker.py <path> [--verbose] [--json]
```

### 2. pr_analyzer.py

Git diff 기반 변경 분석 스크립트.

**검출 항목:** TODO/FIXME 잔존, debug 구문, hardcoded secret, 긴 줄(>120자)

**옵션:**
- `--base <branch>` : 비교 기준 브랜치 (기본값: HEAD~1)
- `--json` : JSON 형식 출력

```bash
python .claude/skills/code-reviewer/scripts/pr_analyzer.py <path> [--base <branch>] [--verbose] [--json]
```

### 3. review_report_generator.py

두 스크립트 결과를 통합하여 Markdown 보고서를 생성한다.

**출력:** severity별 이슈 테이블 + 카테고리별 상세 섹션

**Loop B 필수 옵션:**
```bash
python .claude/skills/code-reviewer/scripts/review_report_generator.py <path> \
  --output docs/exec-plans/active/code-review-[node_name]-[YYYY-MM-DD].md \
  [--analyze] [--verbose]
```

`--output` 생략 시 CWD에 `review_report.md` 생성 — **Loop B에서는 반드시 `--output` 명시**

---

## 참조 문서

| 문서 | 용도 |
|---|---|
| `references/code_review_checklist.md` | 9개 카테고리 검토 체크리스트 |
| `references/coding_standards.md` | 언어별 코딩 표준 |
| `references/common_antipatterns.md` | 15개 안티패턴 — Bad/Why/Fix |
| `docs/RELIABILITY.md` | Loop B 교차검증 기준 (신뢰성) |
| `docs/SECURITY.md` | Loop B 교차검증 기준 (보안) |

---

## 지원 언어

TypeScript, JavaScript, Python, Go, Swift, Kotlin
