# 작업지시서: STI 500 오류 수정 & EXPAND 버튼 조건 변경

**작성일:** 2026-04-23  
**우선순위:** P0 (버그 수정)

---

## 문제 정의

### 이슈 1 — sketch-to-image Generate 500 Internal Server Error

**현상:** SKETCH 노드에서 Generate 클릭 시 `/api/sketch-to-image` 에서 500 에러 발생.

**원인:**  
`lib/prompt.ts` → `loadProtocolFile()` 함수가 파일을 `process.cwd()/_context/<filename>` 경로에서 찾는다.  
그러나 프로토콜 파일 `protocol-sketch-to-image-v2.3.txt` 이 `sketch-to-image/_context/` 로 이동되어 있어 경로 불일치 → `readFileSync` 예외 → 500 반환.

```
찾는 위치: project_canvas/_context/protocol-sketch-to-image-v2.3.txt  (존재하지 않음)
실제 위치: project_canvas/sketch-to-image/_context/protocol-sketch-to-image-v2.3.txt
```

**수정 방안:** `lib/prompt.ts` 의 `loadProtocolFile`이 `sketch-to-image/_context/` 를 우선 탐색하고,  
없으면 기존 `_context/` 로 폴백하도록 수정.

---

### 이슈 2 — EXPAND 버튼 노출 조건 변경

**현상:** EXPAND 버튼이 `artboardType === 'image'` 인 노드에만 표시됨.

**요구사항:** 처음 생성되는 blank 아트보드를 제외한 모든 아이템에 EXPAND 버튼 표시.

**수정 방안:** `components/NodeCard.tsx` 의 EXPAND 버튼 조건  
`isSelected && artboardType === 'image'` → `isSelected && artboardType !== 'blank'`

---

## 수정 파일

| 파일 | 변경 내용 |
|------|-----------|
| `project_canvas/lib/prompt.ts` | `loadProtocolFile` 경로 로직: sketch-to-image/_context 우선, _context 폴백 |
| `project_canvas/components/NodeCard.tsx` | EXPAND 버튼 조건: `artboardType === 'image'` → `artboardType !== 'blank'` |

---

## 체크리스트

- [x] `lib/prompt.ts` 수정 — 경로 로직 변경
- [x] `components/NodeCard.tsx` 수정 — EXPAND 버튼 조건 변경
- [ ] 개발 서버에서 Generate 동작 확인 (500 오류 해소)
- [ ] blank 외 노드에서 EXPAND 버튼 표시 확인
- [ ] blank 노드에서 EXPAND 버튼 미표시 확인
