import { readFileSync } from 'fs';
import { join } from 'path';

export function buildSystemPrompt(principleProtocol: string, knowledgeDocs: string[] = []): string {
  const parts = [principleProtocol, ...knowledgeDocs].filter(Boolean);
  return parts.join('\n\n---\n\n');
}

export function loadProtocolFile(filename: string): string {
  const candidates = [
    join(process.cwd(), 'sketch-to-image', '_context', filename),
    join(process.cwd(), '_context', filename),
  ];
  for (const p of candidates) {
    try { return readFileSync(p, 'utf-8'); } catch { /* try next */ }
  }
  throw new Error(`Protocol file not found: ${filename}`);
}
