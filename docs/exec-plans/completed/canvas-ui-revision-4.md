# 작업지시서: CAI Canvas UI 수정 4차

**날짜**: 2026-04-22  
**요청자**: bzoo@cre-te.com  
**Critique 검증**: 완료 (개선안 P1·P2 이슈 반영)

---

## 체크리스트

### ExpandedSidebar 재설계
- [ ] 1-1. 레이아웃: [44px 정사각 pill 축소버튼] [8px gap] [pill 노드탭] 한 행, 아래 [pill 패널 full-width]
- [ ] 1-2. 노드 탭 pill: RightSidebar SELECT TOOLS와 동일한 형태 (padding 0 0.875rem 0 1rem, 전체 너비 버튼)
- [ ] 1-3. 패널 pill: full sidebar width, radius-pill, flex-1로 남은 높이 채움
- [ ] 1-4. 축소 버튼 pill: 44×44px 정사각 (--h-cta-lg 기준), radius-pill, 아이콘만

### 아이콘 수정
- [ ] 2-1. IconCollapse (새 축소 아이콘): TOP-LEFT + BOTTOM-RIGHT 대각선 사용
  - expand 아이콘(TOP-RIGHT + BOTTOM-LEFT)과 방향 반전으로 명확한 대비
- [ ] 2-2. ExpandedView에서 IconMinimize 제거 → IconCollapse 교체

---

## 레이아웃 설계

```
sidebar (position: absolute, right:1rem, top:1rem, bottom:1rem, width:var(--sidebar-w))
  display: flex, flexDirection: column, gap: 0.5rem

  ┌─ Row (display:flex, gap:0.5rem) ──────────────────────────────┐
  │  [pill 축소 btn 44×44px]  [pill 노드탭 flex-1 h:44px]         │
  └───────────────────────────────────────────────────────────────┘
  ┌─ pill 패널 (flex:1, full sidebar width, radius-pill) ─────────┐
  │  (빈 프레임, 패널 open 시만 표시)                              │
  └───────────────────────────────────────────────────────────────┘
```

### 아이콘 방향 비교
- expand (NodeCard): `points="12,3 17,3 17,8"` (TR) + `points="3,12 3,17 8,17"` (BL) → 바깥으로
- collapse (NEW):    `points="3,8 3,3 8,3"` (TL) + `points="17,12 17,17 12,17"` (BR) → 안으로

## 수정 파일
| 파일 | 수정 내용 |
|------|-----------|
| `components/ExpandedView.tsx` | ExpandedSidebar 전면 재설계 + IconCollapse 신규 |
