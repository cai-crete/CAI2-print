/**
 * pre-tool-gate.js
 * PreToolUse gate for Write|Edit|TodoWrite|Bash|Agent tools.
 *
 * Blocks (exit 2) when:
 *   A. No active exec-plan exists under docs/exec-plans/active/
 *   B. Write/Edit target path contains docs/generated/
 *   C. Write/Edit target file is not mentioned in any active exec-plan incomplete item
 *
 * Exceptions (always allow):
 *   - docs/exec-plans/ — exec-plan 파일 자체 작성
 *
 * Note: TodoWrite, Bash, Agent는 file_path가 없으므로 Gate A만 적용.
 *       Write, Edit는 Gate A + Gate B + Gate C 모두 적용.
 *       .claude/ 파일 수정도 Gate 대상 — exec-plan(Review 폴더)에 명시 필요.
 *
 * exit 0 = allow, exit 2 = block
 */

const fs = require('fs');
const path = require('path');

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  let toolInput = {};
  try {
    const parsed = JSON.parse(input);
    toolInput = parsed.tool_input || {};
  } catch (_) {
    // stdin parse failure → allow through
    process.exit(0);
  }

  const filePath = toolInput.file_path || '';
  const normalizedPath = filePath.replace(/\\/g, '/');

  // Exception: allow writing exec-plan files themselves (but NOT _template.md)
  // _template.md is harness infrastructure — modifying it requires an active exec-plan.
  if (normalizedPath.includes('docs/exec-plans/') && !normalizedPath.includes('_template.md')) {
    process.exit(0);
  }

  // Exception: always allow Bash commands that operate on exec-plans (e.g. mv active→completed)
  const command = (toolInput.command || '').replace(/\\/g, '/');
  if (command && command.includes('docs/exec-plans/')) {
    process.exit(0);
  }

  // Gate B: block writes to docs/generated/ (Write/Edit only)
  if (normalizedPath && normalizedPath.includes('docs/generated/')) {
    console.error('[pre-tool-gate] BLOCKED: docs/generated/ 파일은 수동 작성이 금지됩니다.');
    process.exit(2);
  }

  // Gate A: require at least one active exec-plan
  const activeDir = path.join(process.cwd(), 'docs', 'exec-plans', 'active');
  if (!fs.existsSync(activeDir)) {
    console.error('[pre-tool-gate] BLOCKED: active exec-plan이 없습니다. docs/exec-plans/active/ 에 exec-plan을 생성하세요.');
    process.exit(2);
  }

  const hasPlan = scanForPlan(activeDir);
  if (!hasPlan) {
    console.error('[pre-tool-gate] BLOCKED: active exec-plan이 없습니다. docs/exec-plans/active/ 에 exec-plan을 생성하세요.');
    process.exit(2);
  }

  // Gate C: target file must appear in an active exec-plan incomplete item (Write/Edit only)
  if (normalizedPath) {
    const fileName = path.basename(filePath);
    const inPlan = checkFileInPlan(fileName, activeDir);
    if (!inPlan) {
      console.error(`[pre-tool-gate] BLOCKED: "${fileName}"은 active exec-plan 미완료 항목에 없습니다.`);
      console.error('[pre-tool-gate] exec-plan에 해당 파일 작업을 추가하거나, 담당 exec-plan을 확인하세요.');
      process.exit(2);
    }
  }

  process.exit(0);
});

/**
 * Recursively scan directory for .md files, excluding _template.md
 * Returns true if at least one qualifying plan file exists.
 */
function scanForPlan(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (_) {
    return false;
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (scanForPlan(path.join(dir, entry.name))) return true;
    } else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== '_template.md') {
      return true;
    }
  }
  return false;
}

/**
 * Check if fileName appears in any incomplete item (- [ ]) across all active exec-plans.
 * Comparison is basename-based, backticks stripped.
 */
function checkFileInPlan(fileName, dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (_) {
    return false;
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (checkFileInPlan(fileName, path.join(dir, entry.name))) return true;
    } else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== '_template.md') {
      try {
        const content = fs.readFileSync(path.join(dir, entry.name), 'utf8');
        const lines = content.split('\n');
        for (const line of lines) {
          // Only look at incomplete items
          if (!line.match(/^- \[ \]/)) continue;
          // Strip backticks and check if fileName is mentioned
          const stripped = line.replace(/`/g, '');
          if (stripped.includes(fileName)) return true;
        }
      } catch (_) {
        // skip unreadable files
      }
    }
  }
  return false;
}
