# Node Spec — [node_name]

> 이 템플릿을 복사하여 각 노드 스펙을 작성합니다.
> 파일명: `[node_name].md`
> Protocol 버전 업 시 하단 `## Protocol 버전 History` 섹션에 변경 내용을 기록합니다.

---

## 노드 개요

| 항목 | 내용 |
|------|------|
| Node ID | [node_name] |
| 이름 | [node_name] |
| Phase | [1 / 2 / 3 / 4] |
| Protocol 버전 | v[N] |

---

## 단독 역할

[이 노드가 단독으로 제공하는 가치 — 1~2문장]

## 플랫폼 역할

[파이프라인 내에서 이 노드가 하는 역할 — 1~2문장]

---

## 입력 계약 (Input Contract)

| 항목 | 타입 | 필수 여부 | 설명 |
|------|------|----------|------|
| [input_1] | [type] | 필수 / 선택 | [설명] |
| [input_2] | [type] | 필수 / 선택 | [설명] |

**입력 예시:**
```
[실제 사용자 입력 예시]
```

---

## 출력 계약 (Output Contract)

| 항목 | 타입 | 설명 |
|------|------|------|
| [output_1] | [type] | [설명] |
| [output_2] | [type] | [설명] |

**출력 예시:**
```
[실제 출력 예시]
```

---

## Protocol 구성

> 파일명 규칙 및 버전 관리 기준: `docs/design-docs/protocol-design-guide.md §5`

| 파일 | 유형 |
|------|------|
| `protocol-[name]-v[N].txt` | Principle Protocol |
| `[knowledge-doc-1].txt` | Knowledge Doc |
| `[knowledge-doc-2].txt` | Knowledge Doc |

---

## 컴플라이언스 체크리스트

`QUALITY_SCORE.md`의 공통 체크리스트를 기반으로 이 노드 전용 항목을 추가합니다.

```
[ ] Pre-Step: [확인 항목]
[ ] Step 1: [확인 항목]
[ ] Step 2: [확인 항목]
[ ] Immutable Constants: [확인 항목]
[ ] Boundary Resolution: [확인 항목]
```

---

## 알려진 실패 패턴

> `docs/design-docs/protocol-design-guide.md §6` 오염 패턴 카탈로그에 포함되지 않은 **이 노드 전용 패턴만** 기록합니다.

| 패턴 | 재현 조건 | 처방 |
|------|----------|------|
| [패턴명] | [조건] | [Protocol 수정 방향] |

---

## Protocol 버전 History

| 버전 | 날짜 | 변경 이유 | Stage B 결과 |
|------|------|----------|-------------|
| v1 | YYYY-MM-DD | 초기 작성 | — |

---

`COPYRIGHTS 2026. CRE-TE CO.,LTD. ALL RIGHTS RESERVED.`
