# 좌측 툴바 '+' 버튼 추가 및 썸네일 선택 유지 구현 계획 (v2)

본 계획은 사용자의 피드백을 반영하여, 좌측 툴바에 '빈 스케치 아트보드'를 추가하는 기능을 구현하고, 우측 사이드바 탭을 전환하더라도 현재 선택된 노드의 선택 상태가 해제되지 않도록 로직을 수정합니다.

## User Review Required

> [!IMPORTANT]
> - **'+' 버튼의 동작**: 버튼 클릭 시 'image'와 'plan' 각각이 아닌, **'sketch' 타입의 빈 아트보드 하나**만 생성됩니다.
> - **노드 타입 확장**: 새로운 `sketch` 타입을 `NodeType`에 추가합니다. 이 노드는 "SKETCH" 레이블을 가지며, 사용자가 사이드바에서 `plan`이나 `image` 탭을 선택하여 작업을 수행할 수 있는 기초 데이터 역할을 합니다.
> - **선택 유지 로직**: 우측 사이드바에서 다른 노드 탭을 클릭하여 패널이 바뀌더라도, 캔버스에서 선택된 노드는 유지됩니다. 이는 하나의 스케치/이미지를 여러 노드(탭)에서 활용할 수 있도록 하기 위함입니다.

## Proposed Changes

### [project_canvas]

#### [MODIFY] [types/canvas.ts](file:///c:/Users/USER01/Desktop/CAI/project_canvas/types/canvas.ts)
- `NodeType`에 `sketch`를 추가합니다.
- `NODE_DEFINITIONS`에 `sketch: { label: 'SKETCH', displayLabel: 'SKETCH', caption: 'Sketch Artboard' }`를 추가합니다.
- `NODE_ORDER`의 가장 앞에 `sketch`를 배치할지 논의가 필요하나, 우선 추가 버튼 전용으로 사용합니다.

#### [MODIFY] [page.tsx](file:///c:/Users/USER01/Desktop/CAI/project_canvas/app/page.tsx)
- `handleCreateSketchNodes` 대신 `handleCreateEmptySketch` 함수를 정의합니다. 클릭 시 `sketch` 타입의 노드 1개를 생성합니다.
- `handleNodeTabSelect` 함수에서 `setSelectedNodeId(null)`를 제거합니다.
- `LeftToolbar`에 `onAddNodes` 대신 `onAddSketch` props를 전달합니다.

#### [MODIFY] [LeftToolbar.tsx](file:///c:/Users/USER01/Desktop/CAI/project_canvas/components/LeftToolbar.tsx)
- `onAddSketch` props를 추가합니다.
- 좌측 툴바 상단에 별도의 원형 CTA 버튼(52x52px)을 추가하고 `IconPlus`를 사용하여 구현합니다.

---

## Open Questions

- **'sketch' 노드의 사이드바 패널**: `sketch` 노드를 선택했을 때 사이드바에 어떤 패널이 노출되어야 할까요? 
    - 옵션 A: 기본 `SELECT TOOLS`(아코디언 리스트) 화면 노출.
    - 옵션 B: "이 스케치를 사용하여 수행할 작업을 선택하세요" 라는 안내와 함께 `plan`, `image` 버튼 노출.
    *사용자 피드백에 따르면 사용자가 직접 탭을 선택한다고 하셨으므로 옵션 A가 적절해 보입니다.*

## Verification Plan

### Manual Verification
- [ ] '+' 버튼 클릭 시 'SKETCH #n' 노드가 1개 생성되는지 확인.
- [ ] 'SKETCH' 노드 선택 후 우측 사이드바에서 `PLAN` 탭을 클릭했을 때, 노드 선택(테두리)이 유지되는지 확인.
- [ ] 이후 `IMAGE` 탭으로 전환해도 노드 선택이 유지되는지 확인.
- [ ] 빈 캔버스 클릭 시에만 선택이 해제되는지 확인.
