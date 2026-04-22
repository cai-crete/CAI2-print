#!/usr/bin/env bash
# exec-plan-complete-check.sh
# PostToolUse hook: active/ exec-plan 파일의 체크리스트가 모두 완료되면 completed/ 이양 알림

INPUT=$(cat)

# 수정된 파일 경로 추출
FILE_PATH=$(echo "$INPUT" | node -e "
let d='';
process.stdin.on('data',c=>d+=c);
process.stdin.on('end',()=>{
  try {
    const j=JSON.parse(d);
    const p=(j.tool_input||{}).file_path||'';
    process.stdout.write(p);
  } catch(e){ process.stdout.write(''); }
});
" 2>/dev/null)

# exec-plans/active/ 경로 파일인지 확인
if [[ "$FILE_PATH" != *"exec-plans/active/"* && "$FILE_PATH" != *"exec-plans\\active\\"* ]]; then
  exit 0
fi

# 파일이 존재하는지 확인
if [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

# 미완료 체크박스 확인 (- [ ] 패턴)
UNCHECKED=$(grep -c '\- \[ \]' "$FILE_PATH" 2>/dev/null || echo "0")

if [ "$UNCHECKED" -eq 0 ]; then
  # 완료된 체크박스가 1개 이상 있는지 확인 (빈 파일 제외)
  CHECKED=$(grep -c '\- \[x\]' "$FILE_PATH" 2>/dev/null || echo "0")
  if [ "$CHECKED" -gt 0 ]; then
    FILENAME=$(basename "$FILE_PATH")
    echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PostToolUse\",\"additionalContext\":\"✅ EXEC-PLAN 완료 감지: '$FILENAME' 의 모든 체크리스트가 완료되었습니다. docs/exec-plans/active/ → docs/exec-plans/completed/ 로 이양하세요.\"}}"
  fi
fi
