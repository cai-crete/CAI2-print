# 작업지시서: CAI Canvas UI 수정 2차

**날짜**: 2026-04-22  
**요청자**: bzoo@cre-te.com

---

## 체크리스트

### 썸네일 관련
- [x] 1-1. NodeCard 아트보드 비율 → 가로 A4(297:210) rem 변환 (width: 17.5rem / height: 12.375rem)
- [x] 1-2. expand 버튼 명시적 처리 → circle 원형, 흰색 배경+shadow+border, 크기 확대(32px)

### 사이드바 관련
- [x] 2-1. 사이드바 open/close 버튼(Header 내) 삭제, sidebarOpen 상태 제거
- [x] 2-2. 탭 간격 조정: gap 0.375rem(6px) → 0.5rem(8px) (8px 그리드 기준)
- [x] 2-3. 탭 이름 수정: displayLabel 필드 추가
  - plan: 'PLAN' (SKETCH TO PLAN hidden)
  - image: 'IMAGE' (SKETCH TO IMAGE hidden)
  - elevation: 'ELEVATION' (IMAGE TO ELEVATION hidden)
  - diagram: 'DIAGRAM' (PLAN TO DIAGRAM hidden)
  - 나머지(PLANNERS, CHANGE VIEWPOINT, PRINT)는 기존 label 유지

### expand 관련
- [x] 3-1. ExpandedView 좌측 돌아가기 버튼 삭제 → ExpandedSidebar 현재 노드 탭 헤더 좌측에 축소 버튼 이동
- [x] 3-2. ExpandedView에 LeftToolbar 추가 (전체 캔버스와 동일한 공통 툴바)

### 좌측 TOOLBAR
- [x] 4-1. cursor/handle 버튼을 하나의 토글 버튼으로 통합: 클릭 시 cursor ↔ handle 전환, 현재 상태 아이콘 표시

---

## 수정 파일 목록

| 파일 | 수정 내용 |
|------|-----------|
| `types/canvas.ts` | NODE_DEFINITIONS에 displayLabel 필드 추가 |
| `components/NodeCard.tsx` | 아트보드 rem 비율, expand 버튼 스타일 |
| `components/RightSidebar.tsx` | gap 수정, displayLabel 사용 |
| `components/ExpandedView.tsx` | 좌측 버튼 제거, 축소 버튼 탭 이동, LeftToolbar 추가 |
| `components/LeftToolbar.tsx` | cursor/handle 토글 통합 |
| `app/page.tsx` | sidebarOpen 제거, Header 버튼 삭제, ExpandedView props 확장 |

---

## 설계 메모

### 아트보드 비율
- 가로 A4 = 297mm × 210mm → 비율 1.414 : 1
- width = 17.5rem (≈280px 유지), height = 17.5 × (210/297) = **12.375rem** (≈198px)

### 탭 간격
- 현재 6px → 8px (디자인 시스템 §A.0.2 근접성: 8px 그리드 기준)

### cursor/handle 토글
- 버튼 1개, 현재 activeTool에 따라 아이콘/tooltip 전환
- 클릭 시 cursor → handle, handle → cursor 전환

### expand 축소 버튼 위치
- ExpandedSidebar의 현재 선택 노드 탭 헤더 row 안 좌측에 small 원형 버튼 배치
- 아이콘: ArrowLeft (←), hover 시 opacity 변화
