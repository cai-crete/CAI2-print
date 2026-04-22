#!/bin/bash
# Stop 훅 — Progress 저장 리마인더
# 작업 완료 시마다 실행: claude-progress.txt 저장 촉구

printf '{"hookSpecificOutput":{"hookEventName":"Stop","additionalContext":"[PROGRESS REQUIRED] 작업이 완료되었습니다. docs/exec-plans/progress/claude-progress.txt 를 리비전하여 저장하세요.\\n형식: 방금 무엇을 했는지 / 어디까지 완료됐는지 / 다음에 무엇을 해야 하는지"}}'
