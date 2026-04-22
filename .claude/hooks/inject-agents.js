/**
 * inject-agents.js
 * UserPromptSubmit hook — injects AGENTS.md content as additionalContext.
 * If AGENTS.md does not exist, exits silently (exit 0).
 */

const fs = require('fs');
const path = require('path');

const agentsPath = path.join(process.cwd(), 'AGENTS.md');

if (!fs.existsSync(agentsPath)) {
  process.exit(0);
}

const content = fs.readFileSync(agentsPath, 'utf8');

console.log(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'UserPromptSubmit',
    additionalContext: content
  }
}));

process.exit(0);
