# 작업지시서 — Plan 노드 업로드 이미지 리사이즈 / 로테이트

**세션:** 18 — 2026-04-24  
**대상 노드:** `plan` (sketch-to-plan)  
**범위:** `SketchCanvas.tsx` 핵심 수정 + 부분 export 업데이트

---

## 목표

Plan의 ExpandedView에서 사용자가 업로드한 참조 이미지(배경 제거본)를  
**마우스로 이동(move) · 리사이즈(resize) · 회전(rotate)** 할 수 있도록 구현한다.

참고 가이드: `image_transform_logic.md` (업로드된 문서)

---

## 아키텍처 결정

### 현재 구조
```
SketchCanvas
  <div z=1> InfiniteGrid
  <canvas z=3> 드로잉 (업로드 이미지도 여기에 ctx.drawImage)
  <div z=4> TextItems overlay
  <div z=5> CustomCursor
```

### 변경 후 구조 (Hybrid Rendering)
```
SketchCanvas
  <div z=1> InfiniteGrid
  <div z=2> <img> 업로드 이미지 (DOM — CSS transform rotation 지원)
  <canvas z=3> 드로잉 스트로크만 (이미지 제거)
  <div z=4> 이미지 transform 핸들 오버레이 (imageEditingActive일 때만)
  <div z=5> TextItems overlay
  <div z=6> CustomCursor
```

**이유:** canvas 위에서 rotate된 이미지의 리사이즈/로테이트 핸들을 DOM 요소로 구현하는 것이 가장 명확하다. canvas는 드로잉 레이어만 담당, 이미지는 DOM `<img>`로 렌더링.

---

## 수정 파일

| 파일 | 변경 규모 |
|------|----------|
| `project_canvas/components/SketchCanvas.tsx` | 대형 (핵심) |

`sketch-to-plan/ExpandedView.tsx`, `sketch-to-image/ExpandedView.tsx`, `types/canvas.ts`는 변경 없음.

---

## 구현 체크리스트

### Step 1 — 타입 정의 추가 (SketchCanvas.tsx 상단)

- [ ] `ImageTransform` 인터페이스 추가
  ```typescript
  interface ImageTransform {
    x: number; y: number; width: number; height: number; rotation: number;
  }
  type ImageTransformOp = 'move' | 'resize' | 'rotate';
  ```
- [ ] `HistoryEntry` 타입에 `imageTransform: ImageTransform | null` 추가  
  (undo/redo가 이미지 변형도 추적하도록)

---

### Step 2 — State / Ref 추가

- [ ] `const [imageTransform, setImageTransform] = useState<ImageTransform | null>(null);`
- [ ] `const [imageEditingActive, setImageEditingActive] = useState(false);`
- [ ] `const imageTransformRef = useRef<ImageTransform | null>(null);`  
  `useEffect(() => { imageTransformRef.current = imageTransform; }, [imageTransform]);`
- [ ] Transform 조작 refs 추가
  ```typescript
  const isTransformingImage   = useRef(false);
  const imageTransformOp      = useRef<ImageTransformOp>('move');
  const imageResizeAxis       = useRef({ dx: 0, dy: 0 });
  const rotCenterRef          = useRef({ cx: 0, cy: 0 });
  const imageTransformStart   = useRef({ ptX:0, ptY:0, tx:0, ty:0, tw:0, th:0, tr:0 });
  ```

---

### Step 3 — 이미지 로드 시 초기 Transform 계산

`uploadedImageData` 변경 감지 `useEffect` (기존 imgEl 로드 블록) 수정:

- [ ] `img.onload` 안에서 초기 `imageTransform` 계산 후 set
  ```typescript
  img.onload = () => {
    uploadedImgElRef.current = img;
    setImgVersion(v => v + 1);
    
    // 초기 fit 계산 (현재 canvas/container 크기 기준)
    const canvasW = canvasRef.current?.width  || containerRef.current?.clientWidth  || 800;
    const canvasH = canvasRef.current?.height || containerRef.current?.clientHeight || 600;
    const imgScale = Math.min(canvasW / img.naturalWidth, canvasH / img.naturalHeight) * 0.8;
    const w = img.naturalWidth  * imgScale;
    const h = img.naturalHeight * imgScale;
    setImageTransform({ x: -w / 2, y: -h / 2, width: w, height: h, rotation: 0 });
  };
  ```
  > `* 0.8`: 캔버스 가장자리에서 약간 여백 확보
- [ ] `uploadedImageData`가 null일 때 `setImageTransform(null)` 추가

---

### Step 4 — Canvas 렌더링에서 이미지 Layer 1 제거

기존 `useEffect` (canvas rendering loop) 에서:

- [ ] Layer 1 블록 (uploadedImgElRef.current 처리) 전체 삭제
  ```typescript
  // 삭제 대상:
  const imgEl = uploadedImgElRef.current;
  if (imgEl) {
    // ... ctx.drawImage 코드 블록 전체
  }
  ```
- [ ] `imgVersion`이 rendering deps에서 제거됨 (이제 DOM이 처리하므로)
  > 단, `imgVersion`은 다른 곳에서 사용하지 않으면 state 자체 삭제 고려

---

### Step 5 — Pointer 이벤트 핸들러 수정

#### 5-A. `handlePointerDown`에 cursor tool + 이미지 히트테스트 추가

`activeTool === 'pan'` 체크 직전에 삽입:

- [ ] 헬퍼 함수 `isPointInRotatedRect` 추가 (파일 상단 또는 컴포넌트 내 useCallback)
  ```typescript
  function isPointInRotatedRect(px, py, rx, ry, rw, rh, rotDeg): boolean {
    const cx = rx + rw / 2, cy = ry + rh / 2;
    const rad = -rotDeg * Math.PI / 180;
    const lx = (px - cx) * Math.cos(rad) - (py - cy) * Math.sin(rad);
    const ly = (px - cx) * Math.sin(rad) + (py - cy) * Math.cos(rad);
    return Math.abs(lx) <= rw / 2 && Math.abs(ly) <= rh / 2;
  }
  ```
- [ ] `handlePointerDown` 내 cursor 분기 추가
  ```typescript
  if (activeTool === 'cursor') {
    const ct = imageTransformRef.current;
    const pt = toWorld(e.clientX, e.clientY);
    if (ct && isPointInRotatedRect(pt.x, pt.y, ct.x, ct.y, ct.width, ct.height, ct.rotation)) {
      setImageEditingActive(true);
      isTransformingImage.current = true;
      imageTransformOp.current    = 'move';
      imageTransformStart.current = { ptX: pt.x, ptY: pt.y,
        tx: ct.x, ty: ct.y, tw: ct.width, th: ct.height, tr: ct.rotation };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } else {
      setImageEditingActive(false);
    }
    return;
  }
  ```

#### 5-B. Resize 핸들 pointerDown 핸들러 추가

- [ ] `handleResizeHandlePointerDown` 콜백 추가
  ```typescript
  const handleResizeHandlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const dx = parseInt((e.currentTarget as HTMLElement).dataset.dx ?? '0');
    const dy = parseInt((e.currentTarget as HTMLElement).dataset.dy ?? '0');
    const ct = imageTransformRef.current;
    if (!ct) return;
    const pt = toWorld(e.clientX, e.clientY);
    isTransformingImage.current  = true;
    imageTransformOp.current     = 'resize';
    imageResizeAxis.current      = { dx, dy };
    imageTransformStart.current  = { ptX: pt.x, ptY: pt.y,
      tx: ct.x, ty: ct.y, tw: ct.width, th: ct.height, tr: ct.rotation };
    canvasRef.current?.setPointerCapture(e.pointerId);
  }, [toWorld]);
  ```

#### 5-C. Rotate 핸들 pointerDown 핸들러 추가

- [ ] `handleRotateHandlePointerDown` 콜백 추가
  ```typescript
  const handleRotateHandlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const ct = imageTransformRef.current;
    if (!ct) return;
    const pt = toWorld(e.clientX, e.clientY);
    const cx = ct.x + ct.width  / 2;
    const cy = ct.y + ct.height / 2;
    isTransformingImage.current  = true;
    imageTransformOp.current     = 'rotate';
    rotCenterRef.current         = { cx, cy };
    imageTransformStart.current  = { ptX: pt.x, ptY: pt.y,
      tx: ct.x, ty: ct.y, tw: ct.width, th: ct.height, tr: ct.rotation };
    canvasRef.current?.setPointerCapture(e.pointerId);
  }, [toWorld]);
  ```

#### 5-D. `handlePointerMove` — image transform 처리 추가

기존 `if (isPanning.current)` 블록 **직전**에 삽입:

- [ ] Image transform move/resize/rotate 계산 블록 추가
  ```typescript
  if (isTransformingImage.current && imageTransformRef.current) {
    const pt  = toWorld(e.clientX, e.clientY);
    const s   = imageTransformStart.current;
    const op  = imageTransformOp.current;

    if (op === 'move') {
      setImageTransform(prev => prev
        ? { ...prev, x: s.tx + (pt.x - s.ptX), y: s.ty + (pt.y - s.ptY) }
        : prev);
    } else if (op === 'resize') {
      const { dx, dy } = imageResizeAxis.current;
      const deltaX  = dx !== 0 ? (pt.x - s.ptX) * dx : 0;
      const deltaY  = dy !== 0 ? (pt.y - s.ptY) * dy : 0;
      const aspect  = s.tw / s.th;
      let newW      = dx !== 0 ? Math.max(s.tw + deltaX, 20) : s.tw;
      let newH      = dy !== 0 ? Math.max(s.th + deltaY, 20) : s.th;
      // 코너 핸들: 기본 비율 유지, Shift 키로 자유 리사이즈
      if (dx !== 0 && dy !== 0) {
        newH = e.shiftKey ? Math.max(s.th + deltaY, 20) : newW / aspect;
      }
      const newX = dx === -1 ? s.tx + (s.tw - newW) : s.tx;
      const newY = dy === -1 ? s.ty + (s.th - newH) : s.ty;
      setImageTransform(prev => prev
        ? { ...prev, x: newX, y: newY, width: newW, height: newH }
        : prev);
    } else if (op === 'rotate') {
      const { cx, cy } = rotCenterRef.current;
      let angle = Math.atan2(pt.y - cy, pt.x - cx) * (180 / Math.PI) + 90;
      if (e.shiftKey) angle = Math.round(angle / 15) * 15; // 15° 스냅
      setImageTransform(prev => prev ? { ...prev, rotation: angle } : prev);
    }
    return;
  }
  ```

#### 5-E. `handlePointerUp` — transform 종료 처리

- [ ] 기존 `if (e.button === 1)` 체크 **직후**에 삽입
  ```typescript
  if (isTransformingImage.current) {
    isTransformingImage.current = false;
    pushSnapshot(pathsRef.current, uploadImgRef.current); // transform도 undo 스택에 기록
    return;
  }
  ```
  > 단, `pushSnapshot`이 `imageTransform`도 포함하도록 Step 1의 `HistoryEntry` 변경이 선행되어야 함

---

### Step 6 — DOM 이미지 렌더링 추가 (JSX)

Grid div와 canvas 사이에 삽입 (z=2):

- [ ] 업로드 이미지 DOM layer 추가
  ```tsx
  {/* z=2 업로드 이미지 — CSS transform (rotation 지원) */}
  {uploadedImageData && imageTransform && (
    <div style={{ position: 'absolute', inset: 0, zIndex: 2, overflow: 'visible', pointerEvents: 'none' }}>
      <img
        src={uploadedImageData}
        draggable={false}
        style={{
          position: 'absolute',
          left:   imageTransform.x * zs + ox,
          top:    imageTransform.y * zs + oy,
          width:  imageTransform.width  * zs,
          height: imageTransform.height * zs,
          transform:       `rotate(${imageTransform.rotation}deg)`,
          transformOrigin: 'center center',
          pointerEvents:   'none',
          userSelect:      'none',
        }}
      />
    </div>
  )}
  ```

---

### Step 7 — Transform 핸들 오버레이 추가 (JSX)

TextItems overlay (z=5) 바로 **앞**에 삽입 (z=4):

- [ ] `imageEditingActive && imageTransform` 조건부 핸들 오버레이 추가

  핵심 구조:
  ```tsx
  {imageEditingActive && imageTransform && (() => {
    const ct = imageTransform;
    const hPx = 10; // 핸들 크기 (화면 px 고정)
    const rotOffsetPx = 28;

    const cx = ct.x + ct.width  / 2;
    const cy = ct.y + ct.height / 2;
    const rad  = (ct.rotation ?? 0) * Math.PI / 180;
    const cosR = Math.cos(rad);
    const sinR = Math.sin(rad);

    // 월드 좌표 → 회전 적용
    const rotatePoint = (px: number, py: number) => ({
      x: cx + (px - cx) * cosR - (py - cy) * sinR,
      y: cy + (px - cx) * sinR + (py - cy) * cosR,
    });
    // 월드 → 화면
    const toSc = (wx: number, wy: number) => ({ sx: wx * zs + ox, sy: wy * zs + oy });

    const handles = [
      { dx:-1, dy:-1, cursor:'nwse-resize', ...rotatePoint(ct.x, ct.y) },
      { dx: 1, dy:-1, cursor:'nesw-resize', ...rotatePoint(ct.x+ct.width, ct.y) },
      { dx:-1, dy: 1, cursor:'nesw-resize', ...rotatePoint(ct.x, ct.y+ct.height) },
      { dx: 1, dy: 1, cursor:'nwse-resize', ...rotatePoint(ct.x+ct.width, ct.y+ct.height) },
      { dx: 0, dy:-1, cursor:'ns-resize',   ...rotatePoint(ct.x+ct.width/2, ct.y) },
      { dx: 0, dy: 1, cursor:'ns-resize',   ...rotatePoint(ct.x+ct.width/2, ct.y+ct.height) },
      { dx:-1, dy: 0, cursor:'ew-resize',   ...rotatePoint(ct.x, ct.y+ct.height/2) },
      { dx: 1, dy: 0, cursor:'ew-resize',   ...rotatePoint(ct.x+ct.width, ct.y+ct.height/2) },
    ];
    const rotHp = rotatePoint(ct.x + ct.width/2, ct.y - rotOffsetPx / zs);
    const rsc   = toSc(rotHp.x, rotHp.y);

    return (
      <div style={{ position:'absolute', inset:0, zIndex:4, pointerEvents:'none', overflow:'visible' }}>
        {/* 점선 바운딩 박스 */}
        <div style={{
          position:'absolute',
          left:  ct.x * zs + ox,
          top:   ct.y * zs + oy,
          width: ct.width  * zs,
          height:ct.height * zs,
          transform: `rotate(${ct.rotation}deg)`,
          transformOrigin: 'center center',
          border: '1.5px dashed #f97316',
          pointerEvents: 'none',
        }} />
        {/* 8개 리사이즈 핸들 */}
        {handles.map((h, i) => {
          const sc = toSc(h.x, h.y);
          return (
            <div
              key={`rh-${i}`}
              data-dx={h.dx}
              data-dy={h.dy}
              onPointerDown={handleResizeHandlePointerDown}
              style={{
                position:'absolute',
                left: sc.sx - hPx/2, top: sc.sy - hPx/2,
                width: hPx, height: hPx,
                background: 'white',
                border: '1.5px solid #f97316',
                borderRadius: '999px',
                pointerEvents: 'all',
                cursor: h.cursor,
                zIndex: 4,
              }}
            />
          );
        })}
        {/* 로테이트 핸들 */}
        <div
          onPointerDown={handleRotateHandlePointerDown}
          style={{
            position:'absolute',
            left: rsc.sx - hPx/2, top: rsc.sy - hPx/2,
            width: hPx, height: hPx,
            background: '#f97316',
            border: '1.5px solid white',
            borderRadius: '999px',
            pointerEvents: 'all',
            cursor: 'crosshair',
            zIndex: 4,
          }}
        />
      </div>
    );
  })()}
  ```

---

### Step 8 — Export 함수 수정

#### 8-A. `exportThumbnail` (100% zoom)

- [ ] 기존 `imgEl` 렌더링 블록을 transform-aware 버전으로 교체
  ```typescript
  const imgEl = uploadedImgElRef.current;
  const ct    = imageTransformRef.current;
  if (imgEl && ct) {
    const cx = expOx + ct.x + ct.width  / 2;
    const cy = expOy + ct.y + ct.height / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ct.rotation * Math.PI / 180);
    ctx.drawImage(imgEl, -ct.width / 2, -ct.height / 2, ct.width, ct.height);
    ctx.restore();
  }
  ```

#### 8-B. `exportAsBase64` (현재 zoom/offset 반영)

- [ ] 기존 `imgEl` 렌더링 블록 교체
  ```typescript
  const imgEl = uploadedImgElRef.current;
  const ct    = imageTransformRef.current;
  if (imgEl && ct) {
    const cx = expOx + (ct.x + ct.width  / 2) * expZs;
    const cy = expOy + (ct.y + ct.height / 2) * expZs;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ct.rotation * Math.PI / 180);
    ctx.drawImage(imgEl, -ct.width * expZs / 2, -ct.height * expZs / 2,
                         ct.width * expZs, ct.height * expZs);
    ctx.restore();
  }
  ```

---

### Step 9 — HistoryEntry 업데이트 (undo/redo 연동)

- [ ] `HistoryEntry` 타입에 `imageTransform` 필드 추가
- [ ] `pushSnapshot` 시그니처 확장: `pushSnapshot(paths, imageData, imageTransform)`
- [ ] `handleUndo` / `handleRedo` 에서 `setImageTransform(prev.imageTransform)` 호출 추가
- [ ] `loadImage`의 초기 스냅샷도 `imageTransform` 포함

---

### Step 10 — 빌드 검증

- [ ] `cd project_canvas && npm run build` — TypeScript 오류 0개 확인
- [ ] 브라우저(localhost:3900) 검증:
  - Plan 노드 expand → 이미지 업로드 → 이미지 이동 확인
  - 리사이즈 핸들(코너/엣지) 드래그 → 크기 변경 확인
  - 코너 핸들 비율 유지, Shift 키 자유 리사이즈 확인
  - 로테이트 핸들(오렌지 원) 드래그 → 회전 확인
  - Shift + 회전 → 15° 스냅 확인
  - Ctrl+Z → 이미지 transform undo 확인
  - GENERATE 버튼 → export 이미지에 transform 반영 확인
  - Image 노드도 동일하게 동작 확인 (SketchCanvas 공유)

---

## 주의사항

1. **좌표계**: `imageTransform`의 `x, y, width, height`는 모두 **월드 좌표** (zoom=1 기준). 화면 좌표로 변환 시 `val * zs + offset` 적용.
2. **HistoryEntry**: `imageTransform`이 null일 수 있으므로 undo 시 `setImageTransform(prev.imageTransform ?? null)`.
3. **imgVersion state**: Layer 1 canvas 렌더링 제거 후 `imgVersion`이 `canvas useEffect` deps에서 빠지면 관련 코드 정리.
4. **cursor tool**: 현재 cursor tool은 SketchCanvas에서 아무것도 하지 않았음. 이제 이미지 편집 모드 토글 역할.
5. **Image 노드 영향**: `sketch-to-image/ExpandedView.tsx`도 같은 `SketchCanvas` 사용 → 동일하게 이미지 transform 적용됨. 의도된 동작.
