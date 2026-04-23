# 좌측 툴바 '+' 버튼 추가 및 썸네일 선택 유지 구현 계획

본 계획은 사용자의 요청에 따라 좌측 툴바에 '새 아트보드 추가' 버튼을 다시 도입하고, 우측 사이드바에서 노드 탭을 변경하더라도 현재 선택된 썸네일(아트보드)의 선택 상태가 해제되지 않도록 로직을 수정하는 것을 목표로 합니다.

## User Review Required

> [!IMPORTANT]
> - **'+' 버튼의 위치 및 동작**: '+' 버튼은 좌측 툴바의 최상단에 별도의 원형 버튼으로 배치됩니다. 클릭 시 'IMAGE'와 'PLAN' 타입의 신규 노드가 각각 1개씩 생성됩니다.
> - **선택 유지 로직**: 노드 탭을 변경해도 선택된 노드는 유지되나, 빈 캔버스를 클릭하거나 'Escape' 키를 누를 경우에는 기존과 동일하게 선택이 해제됩니다.

## Proposed Changes

### [project_canvas]

#### [MODIFY] [page.tsx](file:///c:/Users/USER01/Desktop/CAI/project_canvas/app/page.tsx)
- `handleCreateSketchNodes` 함수를 새로 정의합니다. 이 함수는 클릭 시 `image`와 `plan` 타입의 노드를 생성하여 `nodes` 상태에 추가합니다.
- `handleNodeTabSelect` 함수에서 `setSelectedNodeId(null)` 코드를 제거하여, 탭 전환 시에도 기존 선택된 노드가 유지되도록 합니다.
- `LeftToolbar` 컴포넌트에 `onAddNodes` props를 전달합니다.

#### [MODIFY] [LeftToolbar.tsx](file:///c:/Users/USER01/Desktop/CAI/project_canvas/components/LeftToolbar.tsx)
- `onAddNodes` props를 추가합니다.
- 좌측 툴바 레이아웃 상단에 별도의 원형 CTA 버튼(52x52px)을 추가하고 `IconPlus`를 배치합니다.
- 디자인 시스템 §A.4 및 §A.7.2(shadow-float)를 준수하여 구현합니다.

---

## Open Questions

- **신규 노드 생성 위치**: 현재 뷰포트의 중앙에 생성할 예정인데, 두 노드가 겹치지 않도록 일정한 간격(예: 40px)을 두고 배치할까요?
- **'image', 'plan' 명칭**: 'Sketch to Image'와 'Sketch to Plan'을 의미하는 것이 맞는지 다시 한번 확인 부탁드립니다. (현재 `NodeType`에 정의된 `image`, `plan`을 사용합니다.)

## Verification Plan

### Manual Verification
- [ ] 좌측 툴바 상단의 '+' 버튼을 클릭했을 때 'IMAGE #n'과 'PLAN #n' 노드가 캔버스에 생성되는지 확인.
- [ ] 캔버스에서 노드 하나를 선택하여 검은색 테두리(현재 2px black outline)가 생기고 우측 사이드바 패널이 열리는지 확인.
- [ ] 우측 사이드바에서 다른 노드 탭(예: ELEVATION)을 클릭했을 때, 사이드바 패널은 바뀌지만 기존에 선택된 노드의 테두리가 유지되는지 확인.
- [ ] 빈 캔버스를 클릭했을 때 선택이 해제되는지 확인.
- [ ] Escape 키를 눌렀을 때 선택이 해제되는지 확인.
