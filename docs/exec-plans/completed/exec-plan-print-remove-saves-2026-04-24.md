# Print 노드 내부 Saves(아카이빙) 제거 계획서

> **작성일**: 2026-04-24  
> **관련 단계**: Phase D-1 진입 전 Save 로직 간소화  
> **목적**: Print 노드 내부의 독립적인 Saves(아카이빙) UI와 로직을 제거하고, Canvas 노드의 Save 로직으로 일원화합니다.

---

## 1. 개요 및 배경

현재 Print 노드(`Print_ExpandedView`) 내부에는 문서를 임시로 저장하고 불러오는 자체적인 'Saves' 기능(로컬스토리지 기반 아카이빙)이 존재합니다.
그러나 사용자가 문서 생성 후 'Save' 버튼을 누르면 어차피 Canvas 부모 앱으로 상태(HTML, 썸네일 등)가 전달되어 노드에 저장되므로, Print 노드 내부에서 별도로 문서를 아카이빙할 필요가 없습니다. 
따라서 중복되는 데이터를 줄이고 UI를 간소화하기 위해 내부 Saves 기능을 완전히 제거합니다.

---

## 2. 삭제 및 수정 대상

### 🗑️ 완전 삭제 대상 (Files)
1. **`project.10_print/app/components/modals/SavesModal.tsx`**
   - 역할: 저장된 문서 목록을 보여주고 로드/삭제하는 모달 UI
   - 조치: 파일 삭제

2. **`project.10_print/lib/saves.ts`**
   - 역할: 로컬 스토리지에 `SavedDocument` 배열을 CRUD하는 유틸리티
   - 조치: 파일 삭제

### ✂️ 코드 수정 대상 (Files)
1. **`project.10_print/components/Print_ExpandedView.tsx`**
   - **상태 제거**: `isSavesOpen`, `savedDocuments`, `currentDocId` useState 제거
     > `currentDocId`는 Standalone 저장 흐름에서 덮어쓰기 여부 판단에만 사용되므로 함께 제거합니다.
   - **핸들러 제거**: `handleOpenSaves`, `handleSavesOpen`, `handleSavesDelete` 제거
   - **Effect 제거**: mount 시 `savesGet()`으로 목록을 불러오는 `useEffect` 제거 (lines 502–506)
   - **저장 로직 수정**: `handleSave` 내 Standalone 분기 전체 제거 (`SavedDocument` 생성, `savesSave(doc)` 호출, `window.alert` 포함). Canvas 부모 앱으로의 `props.onSave` 호출만 남김.
     > **[검증 완료]**: Canvas로 전송되는 `props.onSave({...})` 페이로드는 `lib/saves.ts`에 전혀 의존하지 않으며 (`htmlUtils.ts`, `imageUtils.ts`만 사용), 기존과 100% 동일한 페이로드 구조를 유지합니다.
   - **UI 제거**: JSX 하단의 `<SavesModal ... />` 컴포넌트 렌더링 제거
   - **Props 제거**: `<Toolbar onOpenSaves={...} />` 및 `renderToolbarWrapper`에 주입하던 `onOpenSaves` 제거
   - **Import 정리**: `SavesModal`, `SavedDocument`, `savesGet / savesSave / savesDelete` import 제거

2. **`project.10_print/app/components/layout/Toolbar.tsx`**
   - **Props 수정**: `ToolbarProps` 인터페이스에서 `onOpenSaves` 제거
   - **UI 제거**: 툴바의 버튼 그룹(Undo / Redo / Library / Saves) 중 `SAVES` 버튼(아카이빙 아이콘) JSX 요소 제거

3. **`project.10_print/lib/types.ts` & `types/print-canvas.ts`**
   - **타입 제거**: `SavedDocument` 인터페이스 제거 (`lib/types.ts`)
   - **연관 타입 수정**: `PrintToolbarTools` 인터페이스에서 `onOpenSaves` 속성 제거 (`types/print-canvas.ts`)
   - **AppState 정합성**: `PrintAppState` 인터페이스에서 `isSavesOpen: boolean` 제거 (`lib/types.ts` line 229). 런타임 영향은 없으나 타입 정합성을 위해 제거합니다.

4. **`project_canvas/components/ExpandedView.tsx` (Canvas 부모 측 동기화)**
   - **UI 제거**: `renderToolbarWrapper` 내부에서 `tools.onOpenSaves`를 참조하여 그리는 `Saves` 툴바 버튼 삭제. (이것을 지우지 않으면 `PrintToolbarTools` 타입 변경으로 인해 TypeScript 빌드 에러가 발생합니다.)

---

## 3. 기대 효과 (Impact)

- **UI 단순화**: 툴바에 불필요한 'SAVES' 버튼이 사라집니다.
- **로직 단일화**: Save의 진실의 원천(Source of Truth)이 Print 내부 스토리지가 아닌 오직 **Canvas 노드의 저장소** 하나로 통일됩니다.
- **성능 및 용량**: Base64 이미지가 포함된 HTML이 로컬 스토리지에 불필요하게 중복 축적되는 것을 방지합니다.

---

## 4. 진행 순서

1. [승인 대기] 본 계획서의 내용을 사용자가 확인하고 승인.
2. `SavesModal.tsx` 및 `saves.ts` 파일 삭제.
3. `Toolbar.tsx` 및 `Print_ExpandedView.tsx`에서 관련 코드 도려내기.
4. 패키지(`node_modules/@cai-crete/print-components`)에도 동일한 수정사항 반영.
5. 로컬 서버에서 툴바 렌더링 정상 여부 및 Canvas로의 기본 Save 기능 정상 동작 테스트.
