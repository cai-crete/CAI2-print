# 작업지시서: 캔버스 노드 연결선(Edge) 시각화 시스템

**생성일**: 2026-04-22  
**완료일**: 2026-04-22  
**담당**: Claude Code

---

## 목적

InfiniteCanvas에서 파생 관계에 있는 노드 썸네일 간 베지어 곡선을 자동 렌더링.  
건축 설계 전문가가 "어떤 산출물에서 어떤 작업이 파생됐는지" 한눈에 파악할 수 있게 한다.

---

## 확정된 설계 결정

| 항목 | 결정 |
|---|---|
| 연결 방향 | 부모 우측 중앙 → 자식 좌측 중앙 |
| 선 스타일 | 베지어 곡선 (Cubic Bezier) |
| 연결 생성 | 자동 (parentId 기반) |
| 분기 처리 | 팬아웃 (자식마다 독립 선) |
| 역방향 처리 | 아래쪽 우회 곡선 |
| 색상 | gray-400(#666666), opacity 0.6 |
| 선택 하이라이트 | 연결된 엣지 #000 opacity 1 / 나머지 opacity 0.2 |
| 포트 인디케이터 | 연결된 노드에 8px 원형 점 |
| 진입 애니메이션 | stroke-dashoffset 드로잉 (400ms, pathLength=1) |

---

## 체크리스트

- [x] `types/canvas.ts` — `CanvasEdge` 타입, `CanvasNode.parentId?`, `CARD_W_PX / CARD_H_PX` 상수
- [x] `components/EdgeLayer.tsx` — SVG 베지어 렌더러 (신규)
- [x] `components/NodeCard.tsx` — `hasLeftPort / hasRightPort` props + 포트 점 렌더링
- [x] `components/InfiniteCanvas.tsx` — `edges / newEdgeIds` props 수신, EdgeLayer 포함, 노드별 포트 플래그 계산
- [x] `app/page.tsx` — `edges` 상태, `newEdgeIds` 상태, 데모 2쌍 하드코딩, 노드 삭제 시 엣지 cascade 삭제
- [x] `app/globals.css` — `@keyframes edge-draw` + `.edge-entrance` 클래스
- [x] dev 서버 실행 후 연결선 렌더링 확인 (HTTP 200)
- [x] claude-progress.txt 업데이트

---

## 포트 좌표

```
CARD_W_PX = 280  (17.5rem @ 16px base)
CARD_H_PX = 198  (12.375rem @ 16px base)

source point = (node.x + 280, node.y + 99)   // 우측 중앙
target point = (node.x,       node.y + 99)   // 좌측 중앙
```

## 베지어 계산

```
정방향 (tx >= sx - 20):
  t = clamp(|tx - sx| × 0.45, 60, 160)
  path: M sx,sy  C sx+t,sy  tx-t,ty  tx,ty

역방향 (tx < sx - 20):
  oy = max(80, |ty - sy| × 0.5 + 60)
  path: M sx,sy  C sx+60,sy+oy  tx-60,ty+oy  tx,ty
```

## 데모 연결 (임시)

- planners(id:"1") → plan(id:"2")  : edge id "demo-edge-1"
- plan(id:"2") → image(id:"3")     : edge id "demo-edge-2"
- nodes "1", "2" hasThumbnail: true (소스 노드이므로)

---

## 구현 범위

| 항목 | 이번 | 추후 |
|---|---|---|
| CanvasEdge 타입 + edges 상태 | ✓ | |
| EdgeLayer SVG 렌더링 | ✓ | |
| 포트 인디케이터 | ✓ | |
| 진입 애니메이션 인프라 (newEdgeIds) | ✓ | |
| 데모 2쌍 하드코딩 | ✓ | |
| 노드 실행 시 자동 연결 (parentId 전달) | | ✓ |
| 엣지 수동 삭제 UI | | ✓ |
| 레이아웃 충돌 회피 | | ✓ |
