/**
 * post-protocol.js
 * PostToolUse hook for Write|Edit tools.
 *
 * Triggers:
 *   1. Protocol file modification   → Loop Protocol requirement message
 *   2. loop-review-handoff-*.md     → Loop Review verification trigger
 *   3. loop-frontend-handoff-*.md    → Loop Frontend verification trigger
 */

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  let toolInput = {};
  try {
    const parsed = JSON.parse(input);
    toolInput = parsed.tool_input || {};
  } catch (_) {
    process.exit(0);
  }

  const filePath = (toolInput.file_path || '').replace(/\\/g, '/');

  // ── Trigger 1: Loop Protocol ──────────────────────────────────────────────
  // Protocol file modification → require Loop Protocol verification before handoff
  if (/protocol-.*\.txt/.test(filePath)) {
    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext:
          '\u26a0\ufe0f LOOP PROTOCOL REQUIRED: Protocol file modified. ' +
          'Load docs/references/loop-protocol-verification-agent.txt and run all 4 checks before Stage B. ' +
          'Do not write the handoff file until OVERALL VERDICT: PASS.'
      }
    }));
    process.exit(0);
  }

  // ── Trigger 2: Loop Review ────────────────────────────────────────────────
  // Handoff file saved in active/ → spawn Agent B sub-agent
  if (/exec-plans\/active\/.*loop-review-handoff-.*\.md/.test(filePath)) {
    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext:
          '\ud83d\udd01 LOOP REVIEW VERIFICATION REQUIRED: Handoff file saved. ' +
          'Follow docs/references/loop-orchestrator.txt "LOOP REVIEW — Step 3". ' +
          'Spawn Agent B as independent sub-agent (subagent_type: general-purpose). ' +
          'Reference: docs/references/loop-review-verification-agent.txt'
      }
    }));
    process.exit(0);
  }

  // ── Trigger 3: Loop Frontend ──────────────────────────────────────────────
  // Design handoff file saved → spawn Agent B sub-agent for UI verification
  if (/exec-plans\/active\/.*loop-frontend-handoff-.*\.md/.test(filePath)) {
    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext:
          '\ud83d\udd01 LOOP FRONTEND VERIFICATION REQUIRED: Design handoff file saved. ' +
          'Follow docs/references/loop-orchestrator.txt "LOOP FRONTEND — Step 3". ' +
          'Spawn Agent B as independent sub-agent (subagent_type: general-purpose). ' +
          'Reference: docs/references/loop-review-verification-agent.txt (UI verification mode)'
      }
    }));
    process.exit(0);
  }

  process.exit(0);
});
