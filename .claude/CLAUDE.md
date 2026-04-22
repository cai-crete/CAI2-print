# 반드시 해야 하는 것들
- 노드 앱 개발 시 프로젝트 이름(`node_name`), 프로토콜(`protocol`), API 키(`.env.local`)를 입력하세요
- @AGENTS.md 파일을 읽으세요
- 사용자의 모든 명령은 작업지시서 형태로 @docs/exec-plans/active/ 생성하세요
- 체크리스트 항목이 모두 완료된 `docs/exec-plans/active/` 파일은 `docs/exec-plans/completed/`로 이동 후 `active/`에서 삭제하세요
- 작업을 마치면 `docs/exec-plans/progress/` 폴더에 `claude-progress.txt`를 리비전하여 저장하세요
  - 파일 내용: 방금 무엇을 했는지, 어디까지 완료됐는지, 다음에 무엇을 해야 하는지
  - 새 세션 시작 시 해당 폴더의 가장 최근 `claude-progress.txt`를 읽어 이전 진행 상황을 파악하세요

# 절대 하지 말아야 할 것들
- 사용자 허락 없이 파일 삭제하지 마세요
- 불명확한 정보는 추측하지 말고 질문하세요
- 작업 중간에 임의로 다른 방향으로 바꾸지 마세요


---

## Agent 금지 행동

상세 금지 행동 목록: `.claude/hooks/OPERATIONS.md` 참조

---
