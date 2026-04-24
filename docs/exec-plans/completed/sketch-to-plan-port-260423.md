# 작업지시서: sketch-to-plan 이식

**날짜:** 2026-04-23  
**세션:** 14  
**우선순위:** HIGH

---

## 요청 사항

1. `https://github.com/cai-crete/cai-sketch-to-plan-v2` 앱을 현재 캔버스 앱에 이식
2. 트리거: 빈 아트보드 선택 → 오른쪽 패널 'PLAN' 탭 클릭 → ExpandedView 열림
3. `sketch-to-plan/` 폴더에 protocol, ExpandedView 관리 (sketch-to-image 패턴 동일)

## 확정 사항

| 항목 | 결정 |
|------|------|
| Room analysis 표시 위치 | B안: ExpandedView 우측 패널, Grid Module 하단 Parameter Report 영역 |
| GENERATE 버튼 | 모든 노드 패널 공통 — 우측 패널 하단 고정 |
| Generate 클릭 즉시 | **캔버스로 복귀 (STI와 동일 패턴)** |
| Room analysis 표시 시점 | 생성 완료 후 result 노드를 expand할 때 Parameter Report에 표시 |
| API 키 | `GEMINI_API_KEY` (.env.local 기존 키 재사용) |
| 건물유형 | 9개 전체 유지 |
| knowledge 파일 | 3개 모두 포함 |

---

## 체크리스트

### 신규 파일
- [x] `project_canvas/sketch-to-plan/_context/protocol-sketch-to-plan-v3.8.txt`
- [x] `project_canvas/sketch-to-plan/_context/knowledge-architectural-standards.txt`
- [x] `project_canvas/sketch-to-plan/_context/knowledge-template-a.txt`
- [x] `project_canvas/sketch-to-plan/_context/knowledge-wp-grid-mapping.txt`
- [x] `project_canvas/sketch-to-plan/ExpandedView.tsx`
- [x] `project_canvas/hooks/usePlanGeneration.ts`
- [x] `project_canvas/app/api/sketch-to-plan/route.ts`

### 수정 파일
- [x] `project_canvas/types/canvas.ts` — PlanPanelSettings + CanvasNode.roomAnalysis 추가
- [x] `project_canvas/lib/prompt.ts` — sketch-to-plan/_context/ 경로 추가
- [x] `project_canvas/components/ExpandedView.tsx` — plan 라우팅 분기 추가
- [x] `project_canvas/app/page.tsx` — handleGeneratePlanComplete, handleCollapseWithPlanSketch, handleReturnFromExpand 수정

---

## 이식 전략

### 전체 플로우 (STI 패턴 기반)

```
빈 아트보드 선택
→ 우측 'PLAN' 탭 클릭
  → type='plan', artboardType='sketch' 배정
  → NODES_THAT_EXPAND 포함 → ExpandedView 즉시 열림
    → SketchToPlanExpandedView 렌더 (artboardType='sketch' && type='plan')
      → [좌측 컨트롤바] + [중앙 스케치 캔버스] + [우측 패널]
      → Generate 클릭
        → 스케치 + 패널 설정 저장 → onCollapseWithPlanSketch 호출
        → 즉시 캔버스로 복귀 (ExpandedView 닫힘)
        → 백그라운드 POST /api/sketch-to-plan
        → 완료 → onGeneratePlanComplete 콜백
          → 새 plan 노드 생성:
            type: 'plan', artboardType: 'sketch'
            generatedImageData: generatedPlanBase64
            roomAnalysis: room_analysis 텍스트
            parentId: 원본 노드 id
          → 엣지 연결 (원본 → 새 노드)

새 plan 노드 expand 시
  → SketchToPlanExpandedView 렌더 (generatedImageData 캔버스에 pre-load)
  → 우측 패널 Parameter Report에 node.roomAnalysis 표시
```

---

COPYRIGHTS 2026. CRE-TE CO.,LTD. ALL RIGHTS RESERVED.
