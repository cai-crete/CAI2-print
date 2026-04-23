# 작업지시서: 빈캔버스 시작 + 지속성 + 태블릿 입력 최적화

> 작성일: 2026-04-22  
> 근거 문서: canvas-persistence-strategy.md, tablet-input-strategy.md  
> 핵심 제약: **첫 사용자는 빈캔버스** — INITIAL_NODES 하드코딩 제거, 재방문 시 저장 상태 복원

---

## 현황 분석

| 항목 | 현재 상태 | 문제 |
|------|-----------|------|
| 초기 노드 | `INITIAL_NODES` (7개 하드코딩) | 첫 사용자도 기존 노드가 노출됨 |
| 이벤트 모델 | `mousedown / mousemove / mouseup` | 태블릿 스타일러스 미지원 |
| 터치 인터셉트 | 없음 | iPad에서 브라우저 스크롤·줌 발생 |
| 캔버스 상태 지속성 | 없음 | 새로고침 시 노드·뷰포트 전부 초기화 |
| 텍스트 선택 방지 | 없음 | 드래그 중 UI 텍스트 선택됨 |

---

## 적용 범위 결정

### canvas-persistence-strategy.md — 전체 적용

| 항목 | 적용 여부 | 비고 |
|------|-----------|------|
| 캔버스 아이템(노드) 지속성 | ✅ 적용 | localStorage (src는 strip) |
| 뷰포트(zoom/offset) 지속성 | ✅ 적용 | localStorage |
| `isRestoredRef` 패턴 | ✅ 적용 | persist effect 선실행 버그 방지 |
| SSR-safe 초기값 | ✅ 적용 | Next.js Hydration Mismatch 방지 |
| Base64 이미지 src IndexedDB | ⏳ Phase 2 | 아트보드 이미지 기능 구현 시 |
| 픽셀 캔버스(artboard) 드로잉 | ⏳ Phase 2 | 아트보드 드로잉 기능 구현 시 |

### tablet-input-strategy.md — 전체 적용

| 항목 | 적용 여부 | 비고 |
|------|-----------|------|
| `touchAction: 'none'` | ✅ 적용 | 브라우저 터치 인터셉트 차단 |
| `onPointerCancel` 핸들러 | ✅ 적용 | 터치 중단 시 상태 이상 방지 |
| `activeTouchCount` ref | ✅ 적용 | 멀티터치 팬+드래그 충돌 방지 |
| Mouse → Pointer Events 전환 | ✅ 적용 | Apple Pencil 등 스타일러스 지원 |
| `WebkitTouchCallout`, `WebkitUserSelect` | ✅ 적용 | Safari 콘텍스트 메뉴 방지 |
| 전역 `select-none` | ✅ 적용 | 사이드바/헤더 텍스트 선택 방지 |
| touch 1개 → 자동 pan | ✅ 적용 | 터치 팬 지원 (모드 무관) |
| DPR canvas 스케일링 | ⏳ Phase 2 | 픽셀 캔버스 구현 시 |

---

## Phase 1 체크리스트 (즉시 적용)

### A. 빈캔버스 시작 — `page.tsx`

- [ ] `INITIAL_NODES` 상수 제거
- [ ] `useState<CanvasNode[]>([])` 초기값 변경 (정적 기본값)
- [ ] `useState<CanvasNode[][]>([[]])` history 초기값 변경

### B. 캔버스 아이템 지속성 — `page.tsx`

- [ ] `LS_ITEMS = 'cai-canvas-items'` 상수 추가
- [ ] `lsSaveItems(nodes)`: src가 `data:` 로 시작하면 `''`로 strip 후 저장
- [ ] `lsLoadItems()`: try/catch → 기본값 `[]`
- [ ] `isRestoredRef = useRef(false)` 추가
- [ ] persist effect: nodes 변경 시 `lsSaveItems` 호출 (isRestoredRef 게이트)
- [ ] mount effect: `lsLoadItems()` → `setNodes` → `isRestoredRef.current = true`

### C. 뷰포트 지속성 — `page.tsx`

- [ ] `LS_VIEW = 'cai-canvas-view'` 상수 추가
- [ ] `lsSaveView(scale, offset)` 헬퍼 추가
- [ ] `lsLoadView()` 헬퍼 추가 (기본값: `scale=1, offset={x:80, y:80}`)
- [ ] persist effect: scale/offset 변경 시 `lsSaveView` 호출 (isRestoredRef 게이트)
- [ ] mount effect에 뷰포트 복원 포함 (아이템 복원과 동일 effect에서 처리)

### D. Pointer Events 전환 — `InfiniteCanvas.tsx`

- [ ] global `mousemove / mouseup` → `pointermove / pointerup` 전환
- [ ] `handleWrapperMouseDown` → `handleWrapperPointerDown` (이름 변경 + 이벤트 타입)
- [ ] `onMouseDown` → `onPointerDown` (JSX prop)
- [ ] `onPointerCancel={handleWrapperPointerUp}` 추가

### E. 터치 인터셉트 차단 — `InfiniteCanvas.tsx`

- [ ] 캔버스 wrapper div style에 추가:
  ```ts
  touchAction: 'none',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  WebkitTouchCallout: 'none',
  ```

### F. 멀티터치 대응 — `InfiniteCanvas.tsx`

- [ ] `activeTouchCount = useRef(0)` 추가
- [ ] `handleWrapperPointerDown`: `pointerType === 'touch'` 시 카운트 증가
  - 2개 이상: isPanning 취소
  - 1개 (handle 모드 or 일반): pan 시작
- [ ] `handleWrapperPointerUp`: `pointerType === 'touch'` 시 카운트 감소 (min 0)
- [ ] `handlePointerMove`: `isDraggingPan.current` 조건에서 activeTool 조건 제거 (모드 무관 pan)

### G. NodeCard Pointer Events — `NodeCard.tsx`

- [ ] `onMouseDown` prop 타입 → `React.PointerEvent` 로 변경
- [ ] 전달 시 `onPointerDown={...}` 으로 변경

### H. 전역 텍스트 선택 방지 — `page.tsx`

- [ ] 루트 `<div>` style에 `userSelect: 'none'` 추가

---

## Phase 2 체크리스트 (아트보드 구현 시)

- [ ] `npm install localforage`
- [ ] `project_canvas/lib/imageDB.ts` 생성
  - `saveImageToDB(key, data)` / `loadImageFromDB(key)` / `deleteImageFromDB(key)`
- [ ] `lsSaveItems`: src strip 로직 이미 Phase 1에서 구현됨 → 재사용
- [ ] mount effect: IndexedDB에서 각 아이템의 src 비동기 복원
- [ ] canvas ref 콜백: DPR 초기화 + `pixelRestoredRef` guard + `source-over` 명시
- [ ] pointerUp(드로잉 완료): `saveImageToDB('pixel_${id}', canvas.toDataURL())`
- [ ] Undo/Redo 후 `saveImageToDB` 추가
- [ ] 리사이즈 pointerUp: `saveImageToDB + pixelRestoredRef.delete`
- [ ] 아이템 삭제: `deleteImageFromDB(id) + deleteImageFromDB('pixel_${id}') + pixelRestoredRef.delete`

---

## 영향 파일

| 파일 | Phase 1 변경 내용 |
|------|-----------|
| `project_canvas/app/page.tsx` | INITIAL_NODES 제거, 지속성 로직, select-none |
| `project_canvas/components/InfiniteCanvas.tsx` | Pointer Events, touch 스타일, activeTouchCount |
| `project_canvas/components/NodeCard.tsx` | onMouseDown → onPointerDown |

---

## 참고: isRestoredRef 패턴 요약

```
[첫 렌더] nodes=[], scale=1, offset={x:80,y:80}
  → persist effect: isRestoredRef.current === false → skip ✅ (localStorage 덮어쓰기 방지)
  → mount effect: localStorage 읽기 → setState → isRestoredRef.current = true
  → 이후 persist effect: isRestoredRef.current === true → 정상 저장 ✅

[첫 사용자] localStorage 비어있음 → nodes=[], 빈캔버스 유지 ✅
[재방문 사용자] localStorage 있음 → nodes 복원, 뷰포트 복원 ✅
```
