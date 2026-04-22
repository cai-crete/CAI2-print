#!/bin/bash
# UserPromptSubmit 훅 — 세션 초기화
# 매 메시지 전 실행: AGENTS.md 참조 / 이전 progress 주입 / exec-plan 리마인더 / AGENT A 트리거

# 1. 최근 progress 파일 읽기
PROGRESS_DIR="docs/exec-plans/progress"
PROGRESS_CONTENT=""
if ls "$PROGRESS_DIR"/*.txt 2>/dev/null | head -1 > /dev/null 2>&1; then
  LATEST=$(ls -t "$PROGRESS_DIR"/*.txt 2>/dev/null | head -1)
  if [ -n "$LATEST" ]; then
    PROGRESS_CONTENT=$(cat "$LATEST" 2>/dev/null)
  fi
fi

# 2. product-spec 존재 여부 확인 (AGENT A 트리거)
AGENT_A_TRIGGER=""
if ls docs/product-specs/N*.md 2>/dev/null | head -1 > /dev/null 2>&1; then
  AGENT_A_TRIGGER="\n\n[AGENT A TRIGGER] product-spec 파일이 존재합니다. 노드 개발 세션이면 docs/references/loop-review-execution-agent.txt 를 로드하세요."
fi

# 3. 컨텍스트 조합
CONTEXT="[HARNESS AUTO-INIT]
- AGENTS.md(하네스 헌법)를 참조하세요
- 사용자의 모든 명령은 docs/exec-plans/active/ 에 작업지시서(exec-plan) 형태로 생성하세요
- 작업 완료 시 docs/exec-plans/progress/claude-progress.txt 를 저장하세요${AGENT_A_TRIGGER}"

if [ -n "$PROGRESS_CONTENT" ]; then
  CONTEXT="${CONTEXT}

[이전 진행 상황]
${PROGRESS_CONTENT}"
fi

# 4. JSON 이스케이프 후 출력
ESCAPED=$(printf '%s' "$CONTEXT" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>process.stdout.write(JSON.stringify(d)))" 2>/dev/null)
if [ -z "$ESCAPED" ]; then
  exit 0
fi

printf '{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":%s}}' "$ESCAPED"
