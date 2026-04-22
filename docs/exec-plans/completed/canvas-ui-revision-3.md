# 작업지시서: CAI Canvas UI 수정 3차

**날짜**: 2026-04-22  
**요청자**: bzoo@cre-te.com

---

## 체크리스트

### Expand 사이드바 구조 개편
- [x] 1-1. 현재 선택 노드 외 다른 탭 전부 숨김 — 선택 노드 단일 패널만 표시
- [x] 1-2. 패널 내부 콘텐츠 비움 — 빈 프레임만 노출 (placeholder 텍스트 제거)
- [x] 1-3. 탭 헤더: [축소 버튼] + [노드 이름] + [chevron] 구조 유지, 아코디언 토글도 유지

### 썸네일 액션 버튼 외부 이동
- [x] 2-1. 복제/다운로드/삭제 버튼을 아트보드 내부 → 외부로 이동
- [x] 2-2. 위치: 아트보드 상단 우측 외부 (bottom: calc(100% + 8px), right: 0)
- [x] 2-3. NodeCard 외부 wrapper overflow: visible 확보

---

## 수정 파일

| 파일 | 수정 내용 |
|------|-----------|
| `components/ExpandedView.tsx` | ExpandedSidebar 단일 패널 + 빈 프레임 |
| `components/NodeCard.tsx` | 액션 버튼 아트보드 외부 배치 |

---

## 설계 메모

### Expand 사이드바
- NODE_ORDER 전체 렌더 제거 → currentNodeType 단일 패널만
- 패널 body: 빈 div (height: 고정 또는 flex-grow)
- 탭 헤더: [28px 원형 축소 btn] [displayLabel] [chevron 16px]

### 액션 버튼 외부 배치
- NodeCard outer wrapper: position: relative, overflow: visible
- 액션 바: position: absolute, bottom: calc(100% + 8px), right: 0
  → 아트보드 위에 떠있는 형태
- 아트보드 내부에는 expand 버튼만 남음
