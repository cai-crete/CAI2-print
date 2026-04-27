# Print Expanded — 좌측 툴바 줌/패닝 이식
> 작성: 2026-04-24 | 담당 에이전트: AGENT C (프론트엔드)

---

## 목표
Canvas 좌측 `LeftToolbar`의 cursor/handle 도구 선택 + 줌인/아웃/리셋 버튼을
Print Expanded View에도 동일한 모양·동작으로 이식한다.

---

## 변경 파일 요약

| 파일 | 변경 내용 |
|------|-----------|
| `cai-harness-print/project.10_print/app/components/layout/Canvas.tsx` | `activeTool` prop 추가 — cursor 모드 시 panning 비활성화, 커서 스타일 변경 |
| `cai-harness-print/project.10_print/types/print-canvas.ts` | `PrintToolbarTools`에 `activeTool`, `onToolChange` 필드 추가 |
| `cai-harness-print/project.10_print/components/Print_ExpandedView.tsx` | `canvasView` 상태 + `activeTool` 상태 추가; Canvas controlled 모드 전환; `renderToolbarWrapper`에 실제 핸들러 전달 |
| `CAI/project_canvas/components/ExpandedView.tsx` | `mkBtn`에 `active` 파라미터 추가; cursor/handle 버튼 + 구분선 추가 |

---

## 작업 체크리스트

- [x] `Canvas.tsx`: `activeTool: 'cursor' | 'handle'` prop 추가
  - cursor 모드: 패닝 비활성화, cursor = 'default', userSelect = 'text'
  - handle 모드: 기존 grab/pan 동작 유지
  - wheel zoom은 두 모드 모두 동작
- [x] `print-canvas.ts`: `PrintToolbarTools` 타입 확장
- [x] `Print_ExpandedView.tsx`:
  - `canvasView: { zoom, panX, panY }` 상태 추가
  - `activeTool: 'cursor' | 'handle'` 상태 추가 (기본값: 'handle')
  - `Canvas` → controlled 모드 (zoom/panX/panY/onViewChange/activeTool 전달)
  - `renderToolbarWrapper`의 onZoomIn/Out/Reset: 실제 setCanvasView 로직으로 교체
- [x] `ExpandedView.tsx` (`PrintViewWrapper.renderToolbarWrapper`):
  - `mkBtn` 시그니처: `(onClick, icon, title, active=false, disabled=false)`
  - cursor 버튼 (아이콘: 화살표), handle 버튼 (아이콘: 손) — active 상태 하이라이트
  - 구분선으로 섹션 분리: cursor/handle | undo/redo | library | zoom
- [x] tsc --noEmit 에러 0 (양쪽 프로젝트)

---

`COPYRIGHTS 2026. CRE-TE CO.,LTD. ALL RIGHTS RESERVED.`
