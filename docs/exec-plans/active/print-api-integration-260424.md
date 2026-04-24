# [260424] Print 노드 API화 및 Canvas 연동 환경 세팅

**작성일**: 2026-04-24  
**작성자**: AGENT A (Claude)  
**세션**: 15  
**상태**: 진행 중

---

## 목표

N07 Print 노드를 CAI Canvas 앱에 외부 API + 이식 가능한 UI 컴포넌트로 연동하기 위한  
아키텍처 확정, 환경 세팅 계획 수립, Print 노드 개발자 작업지시서 작성

---

## 배경 및 연동 요구사항

| 구분 | 노드 | 연결 방식 |
|------|------|-----------|
| 내부 | sketch-to-image, sketch-to-plan | Canvas에 직접 내장 |
| 외부 | Print, 나머지 4개 노드 | 독립 API 서버로 연결 |

**Print 노드 연동 5대 요구사항:**

| # | 요구사항 | 핵심 기술 |
|---|----------|-----------|
| 1 | Print 생성 문서의 썸네일이 Canvas NodeCard에 표시 | `onSave` callback + html2canvas |
| 2 | Print 사이드바가 Canvas RightSidebar에 상시 노출, 액션 클릭 → 해당 기능으로 즉시 진입 | `PrintSidebarPanel` + `initialAction` prop |
| 3 | Canvas에서 Print 삭제 → 상태 동기화 / Print에서 수정 → Canvas 썸네일 갱신 | Canvas 상태 단일 소유 (Canvas owns state) |
| 4 | Canvas 'image' 아트보드 다중 선택 → Print INSERT IMAGE 자동 로드 + 문서/영상 즉시 생성 | `selectedImages` prop |
| 5 | Print 이미지 장수 제한 규칙이 Canvas 선택 단계에서도 동일 적용 (초과 시 토스트) | `GET /api/print/limits` |

---

## 아키텍처 결정

**Canvas가 상태의 주인, Print는 API + UI 공급자**

```
[Canvas 브라우저]
  ├── RightSidebar → PrintSidebarPanel (Print 제공)
  ├── Print_ExpandedView (Print 제공, Canvas에 이식)
  │     └── fetch(`${apiBaseUrl}/api/*`) → Canvas 프록시 → Print 서버
  └── NodeCard (Print 썸네일 — Canvas IndexedDB 보관)
```

- **CORS 불필요**: 브라우저 → Canvas 서버(같은 origin), Canvas 서버 → Print 서버(서버-투-서버)
- **실시간 동기화 인프라 불필요**: `onSave` callback 체계로 Canvas 상태가 항상 최신 유지

---

## 참고 정보

| 항목 | 값 |
|------|-----|
| Print 노드 GitHub | https://github.com/cai-crete/cai-print-v3 |
| Print 노드 Vercel | https://cai-print-v3.vercel.app |
| Print 노드 로컬 포트 | 3777 |
| Canvas 로컬 포트 | 3900 |

---

## 체크리스트

### Task 1: 환경 세팅 계획 수립 (문서화)
- [x] Print 노드 API 구조 파악
- [x] 연결 아키텍처 확정
- [x] 환경 변수 목록 정의 (`PRINT_API_URL`, `PRINT_API_SECRET`)

### Task 2: 개발자 작업지시서 작성
- [x] `project_canvas/print/work-instruction.md` 작성
- [x] 5대 연동 요구사항 반영 (썸네일, 사이드바, 동기화, 이미지 소스, 장수 제한)
- [x] 컴포넌트 Props 계약 정의 (PrintExpandedViewProps, PrintSidebarPanelProps)
- [x] 컴포넌트 내부 API 호출 목록 요청 항목 추가
- [x] API 계약 (`POST /api/print`, `GET /api/print/limits`) 명시

---

## 후속 작업 (별도 세션 — Canvas 팀)

Print 개발자로부터 완료 통보 수신 후 진행:

- [ ] `project_canvas/app/api/print-proxy/[...path]/route.ts` — 통합 프록시 라우트
- [ ] `project_canvas/types/print.ts` — TypeScript 타입 정의
- [ ] `project_canvas/print/Print_ExpandedView.tsx` — 이식된 컴포넌트 마운트
- [ ] `project_canvas/components/panels/PrintSidebarPanel.tsx` — 사이드바 패널 마운트
- [ ] `project_canvas/.env.local` — `PRINT_API_URL`, `PRINT_API_SECRET` 추가
- [ ] Canvas NodeCard에 Print 아트보드 타입 추가 + 썸네일 연동
- [ ] Canvas RightSidebar에 PrintSidebarPanel 조건부 렌더링
- [ ] 이미지 다중 선택 → Print 실행 UI 구현 (장수 검증 + 토스트)

---

`COPYRIGHTS 2026. CRE-TE CO.,LTD. ALL RIGHTS RESERVED.`
