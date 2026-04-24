# 작업지시서: 캔버스 화질 개선 + image ExpandedView 사이드바 헤더 구조 통일

**일시**: 2026-04-23  
**작성자**: Claude Code  

---

## 문제 정의

### 이슈 1 — 캔버스 아트보드 화질 불량 (새로고침 전까지 흐림)
- `InfiniteCanvas.tsx` 변환 레이어(transform layer)에 `will-change: transform`이 항상 활성화
- GPU 레이어로 강제 승격 → 자식 이미지들이 bilinear 필터링으로 렌더링 (흐림)
- 새로고침 시 GPU 레이어 캐시가 초기화되어 선명해지는 것
- `translate()` 대신 `translate3d()`를 사용하면 DPR을 올바르게 반영하는 경우가 많음

### 이슈 2 — image ExpandedView 사이드바 헤더 구조 불일치
- `isSketchImageMode`일 때 `SketchToImagePanel`을 bare div로만 감쌈
- 다른 버튼 사이드바(`ExpandedSidebar`, `RightSidebar` panel mode)는 모두  
  [← 버튼 pill] + [라벨 pill / chevron 토글] 헤더 구조를 가짐
- image ExpandedView에만 이 헤더 구조가 없어서 시각적 일관성 결여

---

## 수정 계획

### [1] `InfiniteCanvas.tsx` — 화질 수정

**변경 파일**: `project_canvas/components/InfiniteCanvas.tsx`

- [ ] 변환 레이어 div의 `transform` 속성을 `translate3d()`로 변경
  ```
  translate(${x}px, ${y}px) scale(${s})
  → translate3d(${x}px, ${y}px, 0) scale(${s})
  ```
- [ ] `willChange` 속성을 상태 기반으로 조건부 적용
  ```
  willChange: (isDraggingPan || isMiddleButtonPanning) ? 'transform' : 'auto'
  ```

### [2] `ExpandedView.tsx` — 사이드바 헤더 구조 적용

**변경 파일**: `project_canvas/components/ExpandedView.tsx`

- [ ] `isSketchImageMode` 분기의 우측 사이드바를 `ExpandedSidebar` 컴포넌트로 교체
- [ ] 캔버스 영역 right 엣지를 `calc(var(--sidebar-w) + 2rem)`으로 변경 (기존 `sidebarW+16` 고정값 제거)
- [ ] `sidebarW` 상수 제거 (더 이상 필요 없음)

### [3] `SketchToImagePanel.tsx` — 외부 컨테이너 시각 스타일 제거

**변경 파일**: `project_canvas/components/panels/SketchToImagePanel.tsx`

- [ ] 최상위 div에서 박스 시각 스타일 제거
  - 제거: `background`, `backdropFilter`, `border`, `boxShadow`, `borderRadius`
  - 유지: `height: '100%'`, `width: '100%'`, `display: flex`, `flexDirection: column`, `overflow: hidden`
- [ ] `ExpandedSidebar` 바디 컨테이너가 white 박스 스타일을 대신 제공

---

## 체크리스트

- [ ] InfiniteCanvas.tsx translate3d 변경
- [ ] InfiniteCanvas.tsx willChange 조건부 적용
- [ ] ExpandedView.tsx ExpandedSidebar 적용 (sketch-image 우측 사이드바)
- [ ] ExpandedView.tsx 캔버스 영역 right 엣지 calc() 변경
- [ ] SketchToImagePanel.tsx 외부 스타일 정리
- [ ] 브라우저 확인: 캔버스 아트보드 화질 (선명함 유지)
- [ ] 브라우저 확인: sketch-image ExpandedView 사이드바 헤더 정상 표시
