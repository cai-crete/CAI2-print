# Exec Plan — sketch-expanded-view 버그 수정 6종
**날짜**: 2026-04-23  
**세션**: 9  
**담당**: AGENT C (UI/UX 프론트엔드)

---

## 작업 목표

sketch-expanded-view(ExpandedView + SketchCanvas)에서 발생하는 버그 6종 수정

---

## 체크리스트

| # | 버그 | 파일 | 상태 |
|---|------|------|------|
| BUG-1 | 스케치 상태 공유 — expand 재진입 시 이전 스케치 유실 | `SketchCanvas.tsx`, `ExpandedView.tsx` | ✅ |
| BUG-2 | Generate 이후 Toast 미표시 — expandedNode 조건 블록 안에 위치 | `app/page.tsx` | ✅ |
| BUG-3 | Undo/Redo 미작동 — handle 미노출, UndoRedoListener 빈 함수 | `SketchCanvas.tsx`, `ExpandedView.tsx` | ✅ |
| BUG-4 | 무한 캔버스 → 고정 캔버스 — 패닝 clamp + zoom-toward-cursor | `SketchCanvas.tsx` | ✅ |
| BUG-5 | 커서 SVG 줌 연동 확대 — `* zs` 제거 | `SketchCanvas.tsx` | ✅ |
| BUG-6 | 진입 시 pen 선택 → cursor 선택 초기값 변경 | `ExpandedView.tsx` | ✅ |

---

## 구현 세부사항

### BUG-1: 스케치 상태 공유
- `SketchCanvasHandle`에 `loadImage(base64: string)` 메서드 추가
- `SketchCanvas.useImperativeHandle`에 노출
- `ExpandedView`에 `initialSketchData?: string` prop → 마운트 시 useEffect로 `loadImage()` 호출
- `page.tsx`에서 `node.sketchData`를 `onCollapseWithSketch` 저장 → 재진입 시 로드

### BUG-2: Toast 미표시
- `page.tsx`에서 `GeneratingToast`를 `expandedNode ? (...) : (...)` 블록 외부로 이동
- `isGenerating` 조건은 유지

### BUG-3: Undo/Redo
- `SketchCanvasHandle`에 `undo()`, `redo()` 추가
- `useImperativeHandle`에 노출
- `UndoRedoListener`에서 Ctrl+Z/Shift+Ctrl+Z 키 → `onUndo`/`onRedo` 실제 호출
- `ExpandedView.sketchUndo/sketchRedo`에서 `sketchCanvasRef.current?.undo()` 호출

### BUG-4: 고정 캔버스 (clamp 패닝)
- 줌 wheel 시 커서 위치 기준 offset 보정 → zoom-toward-cursor 구현
- 패닝 종료(pointerUp) 시 offset clamp 적용
- clamp 공식: `maxOffset = (canvasSize * (zoom/100 - 1)) / 2`
- 100% 복귀 시 offset = (0,0) (이미 구현됨)

### BUG-5: 커서 크기 고정
- `dotDiameter * zs` → `dotDiameter` (zs 제거)

### BUG-6: 진입 시 cursor 선택
- `useState<SketchTool>('pen')` → `useState<SketchTool>('cursor')`

---

## 완료 기준

- expand → collapse → expand 시 이전 스케치가 캔버스에 표시됨
- Generate 클릭 후 캔버스 복귀 시 하단 중앙에 Toast 표시됨
- 툴바 undo/redo 버튼 및 Ctrl+Z 단축키 작동
- 줌 200%에서 패닝 가능하나 캔버스 밖으로 이탈 불가
- 줌 상태에서 커서 크기 고정
- ExpandedView 진입 시 cursor 도구 선택 상태

---

COPYRIGHTS 2026. CRE-TE CO.,LTD. ALL RIGHTS RESERVED.
