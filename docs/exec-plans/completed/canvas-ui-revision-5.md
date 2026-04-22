# 작업지시서: CAI Canvas UI 수정 5차

**날짜**: 2026-04-22  
**요청자**: bzoo@cre-te.com

---

## 체크리스트

- [ ] 1. IconCollapse → 단순 좌측 화살표 (`←`) 형태로 교체
- [ ] 2. ExpandedSidebar 패널 모서리 곡률 변경: `radius-pill` → `radius-box` (0.625rem = 10px)

---

## 설계 메모

### 아이콘
- 기존 IconCollapse: TL+BR 대각선 (compress 형태)
- 변경: 단순 `<path d="M16 10H4M9 5L4 10L9 15" />` — 좌측 화살표

### 모서리 곡률 기본 정책 확립
- **앞으로의 default 곡률: 10px = `var(--radius-box)` = 0.625rem**
- 최대 곡률(pill)은 사용자가 명시적으로 지정할 때만 사용
- 적용 대상: 콘텐츠 패널, 카드, 컨테이너 등 내용물이 들어가는 요소
- pill 버튼(SELECT TOOLS 탭, 노드 탭 등 인터랙티브 pill) 은 기존 `radius-pill` 유지

### 수정 범위
- `components/ExpandedView.tsx` — IconCollapse 교체 + 패널 radius 변경
