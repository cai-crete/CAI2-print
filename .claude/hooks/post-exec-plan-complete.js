/**
 * post-exec-plan-complete.js
 * PostToolUse hook for Write|Edit tools.
 *
 * Fires after a file is written/edited.
 * If the modified file is under docs/exec-plans/active/ and
 * all checklist items (- [ ]) are now complete (- [x]),
 * injects an additionalContext warning requiring user approval
 * before moving the file to completed/.
 *
 * exit 0 = no message (or message already printed via additionalContext JSON)
 */

const fs = require('fs');
const path = require('path');

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  let parsed = {};
  try {
    parsed = JSON.parse(input);
  } catch (_) {
    process.exit(0);
  }

  const filePath = (parsed.tool_input && parsed.tool_input.file_path) || '';
  const normalizedPath = filePath.replace(/\\/g, '/');

  // Only care about active exec-plan files
  if (!normalizedPath.includes('docs/exec-plans/active/')) {
    process.exit(0);
  }

  if (!normalizedPath.endsWith('.md')) {
    process.exit(0);
  }

  // Read the file
  let content = '';
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (_) {
    process.exit(0);
  }

  // Count incomplete items
  const incompleteCount = (content.match(/- \[ \]/g) || []).length;
  const completeCount = (content.match(/- \[x\]/gi) || []).length;

  // If there are no checklist items at all, ignore
  if (incompleteCount === 0 && completeCount === 0) {
    process.exit(0);
  }

  // If any incomplete items remain, do nothing
  if (incompleteCount > 0) {
    process.exit(0);
  }

  // All items complete — inject warning
  const fileName = path.basename(filePath);
  const message = [
    `⚠️  EXEC-PLAN COMPLETE: ${fileName} 모든 항목 완료.`,
    `반드시 사용자에게 completed/ 이동 승인을 받은 후 진행하세요.`,
    `Bash mv 명령 실행 전 사용자 확인 필수.`
  ].join('\n');

  // Output additionalContext JSON for Claude Code hook system
  process.stdout.write(JSON.stringify({ additionalContext: message }));
  process.exit(0);
});
