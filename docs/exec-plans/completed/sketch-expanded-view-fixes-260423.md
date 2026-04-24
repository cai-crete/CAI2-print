# 작업지시서: Sketch-Image ExpandedView 버그 수정

**일시**: 2026-04-23  
**파일 대상**: SketchCanvas.tsx, ExpandedView.tsx, app/page.tsx

---

## 수행 목표

sketch-image ExpandedView 에서 발생하는 4가지 이슈 수정:

1. 스케치 드로잉 시 `path.points` undefined 크래시 (웹/태블릿 동일)
2. 마우스 휠 / 두 손가락 핀치 줌 미작동
3. 태블릿에서 화면 전체가 잘리는 레이아웃 문제
4. 좌측 컨트롤바·우측 사이드바 뒤 배경 none 처리

---

## 원인 분석

### 이슈 1 — path.points undefined
`handlePointerMove`의 `setPaths` 콜백 안에서 `currentPath.current` 를 재참조.
`handlePointerUp`이 콜백 실행 전에 `currentPath.current = null` 로 초기화하면
`{ ...null }` → `{}` (points 없는 객체)가 paths 배열에 삽입됨.

### 이슈 2 — 줌 미작동
- wheel 핸들러가 `ctrlKey || metaKey` 필수 → 일반 마우스 휠은 무시됨
- 줌 범위 100~200% 로 고정 → 줌 아웃 불가
- `internalZoom` state 의존 stale closure 이슈

### 이슈 3 — 태블릿 레이아웃 클리핑
page.tsx root div의 `height: 100vh` → iPad Safari 에서 브라우저 크롬 영역 미반영,
하단이 잘림. → `height: 100dvh` 로 변경.

### 이슈 4 — 배경 노출
SketchCanvas 컨테이너가 `left: 80px, right: ~320px` 로 제한되어,
툴바·사이드바 아래 구역에 app-bg 색이 노출됨. → 캔버스를 `inset: 0` 으로 확장.

---

## 체크리스트

- [x] **SketchCanvas.tsx** — `handlePointerMove` captured ref 패턴으로 crash 수정
- [x] **SketchCanvas.tsx** — 렌더링 useEffect에 `!path?.points` 방어 가드 추가
- [x] **SketchCanvas.tsx** — `internalZoomRef` 추가 (stale closure 제거)
- [x] **SketchCanvas.tsx** — wheel 핸들러: ctrlKey 조건 제거, 범위 20~400%, `internalZoomRef` 사용
- [x] **SketchCanvas.tsx** — 두 손가락 핀치 줌: `pointerPositions` / `lastPinchDist` ref로 처리
- [x] **SketchCanvas.tsx** — 핀치 중 드로잉 방지 (activePointers ≥ 2이면 드로잉 스킵)
- [x] **ExpandedView.tsx** — 캔버스 컨테이너 `inset: 0` (left/right 마진 제거)
- [x] **ExpandedView.tsx** — 줌 버튼 범위 20~400% 로 통일
- [x] **page.tsx** — `height: 100vh` → `height: 100dvh`
