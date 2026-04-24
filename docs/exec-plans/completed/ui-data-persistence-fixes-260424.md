---
title: UI 및 데이터 유지 개선 (새로고침 유지, PLAN 다이렉트 확장, 배경 제거, 이미지 렌더링)
created: 2026-04-24
status: active
---

## 목적

사용자가 요청한 4가지 캔버스 및 ExpandedView 관련 사용성/기능 버그를 수정한다.

---

## 해결 방안 및 구현 스펙

### 1. 새로고침 시 캔버스 아이템 소실 방지
- **원인**: `app/page.tsx`의 `lsSaveNodes` 함수에서 `localStorage` 용량 제한을 피하기 위해 `data:`로 시작하는 base64 이미지 데이터(`thumbnailData`, `sketchData`, `generatedImageData` 등)를 의도적으로 제거(`stripped`)하고 있었음. 이로 인해 새로고침 시 이미지 데이터가 소실됨.
- **해결책**:
  - `localStorage` 대신 이미 프로젝트에 설치되어 있는 `localforage` (IndexedDB 래퍼)를 사용하여 노드 데이터를 비동기적으로 저장 및 로드하도록 수정.
  - 이를 통해 5MB 용량 제한 없이 base64 이미지를 안전하게 영구 보존.
  - (초기 렌더링 시 깜빡임을 최소화하기 위해 비동기 로딩 처리 로직 보강)

### 2. 아트보드 선택 없이 'PLAN' 탭 클릭 시 ExpandedView 직접 이동
- **원인**: 우측 사이드바 탭 클릭 시 바로 ExpandedView를 열어주는 대상(`DIRECT_EXPAND_NODES`)에 `plan`이 누락되어 있음.
- **해결책**:
  - `app/page.tsx` 내의 `DIRECT_EXPAND_NODES` 배열에 `'plan'` 추가.
  - `const DIRECT_EXPAND_NODES: NodeType[] = ['planners', 'image', 'plan'];`

### 3. 흰색 배경 제거 로직 분리 (ExpandedView 직접 업로드 시에만 적용)
- **원인**: ExpandedView 렌더링을 담당하는 `SketchCanvas.tsx`의 `loadImage` 함수 진입 시 무조건 `removeWhiteBackground`를 통과하도록 되어 있어, 캔버스에서 업로드한 원본 이미지나 AI가 생성한 이미지의 배경이 의도치 않게 투명해지는 현상 발생.
- **해결책**:
  - `components/SketchCanvas.tsx`의 `loadImage` 함수에서 `removeWhiteBackground` 호출을 제거하고 `dataUrl` 원본을 그대로 `setUploadedImageData`에 주입하도록 수정.
  - ExpandedView 내부의 이미지 업로드 버튼 이벤트인 `handleUpload` 함수에는 기존대로 `removeWhiteBackground` 로직을 유지하여, 직접 스케치 덧그리기를 위해 업로드하는 경우에만 배경이 제거되도록 보장.

### 4. 생성/업로드 이미지 아트보드 전체 꽉 차게 (비율 무관)
- **원인**: `components/NodeCard.tsx`에서 썸네일/이미지 렌더링 시 `<img style={{ objectFit: 'contain' }}>`를 사용하여 원본 비율이 유지되면서 여백이 발생함.
- **해결책**:
  - `components/NodeCard.tsx`의 `<img>` 태그 2곳의 `objectFit: 'contain'`을 `objectFit: 'cover'`로 일괄 수정.

---

## 작업 체크리스트

- [ ] `app/page.tsx` — `localforage` 도입하여 `lsSaveNodes`, `lsLoadNodes` 비동기 처리로 변경 및 base64 보존 로직 적용.
- [ ] `app/page.tsx` — `DIRECT_EXPAND_NODES`에 `'plan'` 추가.
- [ ] `components/SketchCanvas.tsx` — `loadImage` 내 `removeWhiteBackground` 제거.
- [ ] `components/NodeCard.tsx` — `<img>` `objectFit` 속성을 `cover`로 변경.
- [ ] 개발 서버 실행 및 4가지 요구사항 브라우저 검증.
