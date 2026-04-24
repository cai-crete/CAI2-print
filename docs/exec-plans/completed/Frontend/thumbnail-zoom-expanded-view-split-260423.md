# exec-plan: 썸네일 100% 줌 고정 + ExpandedView 모듈 분리

**날짜:** 2026-04-23  
**에이전트:** AGENT C (디자인/프론트엔드)

---

## 목표

1. **썸네일 100% 줌 고정** — expanded-view에서 사용자가 작업한 줌/팬 상태와 별개로, 썸네일은 항상 100% 줌배율(offset={0,0})로 export하여 캔버스 카드에 표시
2. **ExpandedView 모듈 분리** — sketch-to-image 전용 뷰를 `sketch-to-image/ExpandedView.tsx`로 분리, 이후 다른 노드 유형 추가를 위한 확장 구조 확립
3. **Protocol 분리** — `_context/protocol-sketch-to-image-v2.3.txt`를 `sketch-to-image/_context/`로 이동하여 sketch-to-image 관련 파일 일원화

---

## 체크리스트

- [x] exec-plan 생성
- [x] `project_canvas/components/SketchCanvas.tsx` — `exportThumbnail()` 추가 (zoom=100%, offset={0,0})
- [x] `project_canvas/components/ExpandedSidebar.tsx` — `ExpandedSidebar` 컴포넌트 분리 (공유용)
- [x] `project_canvas/sketch-to-image/_context/protocol-sketch-to-image-v2.3.txt` — 프로토콜 이동
- [x] `project_canvas/_context/protocol-sketch-to-image-v2.3.txt` — 원본 삭제 (이동 후)
- [x] `project_canvas/sketch-to-image/ExpandedView.tsx` — sketch-to-image 전용 뷰 신규 생성
- [x] `project_canvas/components/ExpandedView.tsx` — 라우터/오케스트레이터로 슬림화
- [x] `project_canvas/app/page.tsx` — `handleCollapseWithSketch` / `handleGenerateComplete` 시그니처에 `thumbnailBase64` 추가

---

## 설계 결정

### 썸네일 export 분리
- `exportAsBase64()` — 기존 그대로, 현재 zoom/offset으로 export (생성 API 전송용 스케치 데이터)
- `exportThumbnail()` — 신규, 항상 zoom=100%/offset={0,0}으로 export (카드 썸네일 표시용)
- `onCollapseWithSketch` 시그니처 변경: `(sketchBase64, thumbnailBase64, panelSettings)` — 두 데이터 분리 전달
- `onGenerateComplete` 시그니처 변경: `{ sketchBase64, thumbnailBase64, generatedBase64, nodeId }` — thumbnail 별도 포함

### 디렉토리 구조 (완성 후)
```
project_canvas/
├── sketch-to-image/
│   ├── _context/
│   │   └── protocol-sketch-to-image-v2.3.txt   ← _context/에서 이동
│   └── ExpandedView.tsx                          ← 신규 (sketch-to-image 전용)
├── _context/
│   ├── brand-guidelines.md           ← 유지 (일반)
│   ├── business-context.md           ← 유지 (일반)
│   └── design-style-guide-node.md   ← 유지 (일반)
└── components/
    ├── ExpandedView.tsx               ← 라우터 (슬림화)
    └── ExpandedSidebar.tsx            ← 신규 분리 (공유 컴포넌트)
```

---

COPYRIGHTS 2026. CRE-TE CO.,LTD. ALL RIGHTS RESERVED.
