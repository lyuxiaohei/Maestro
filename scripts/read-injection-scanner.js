// maestro-hook-version: 202605.4
/**
 * read-injection-scanner.js — Maestro PostToolUse Read injection scanner hook
 *
 * Scans file content returned by Claude's Read tool for prompt injection patterns.
 * Uses the shared injection-patterns.js library for detection.
 *
 * Severity grading:
 *   LOW  (1-2 matches): silent, no output
 *   HIGH (3+ matches):  outputs additionalContext warning
 *
 * Exempted paths (trusted content):
 *   .planning/, REVIEW.md, /scripts/, security
 *
 * Hook protocol: reads JSON from stdin, outputs JSON to stdout for HIGH severity.
 * Always exits with code 0 — PostToolUse hooks cannot block tool calls.
 *
 * Pure Node.js built-in modules. No npm dependencies.
 */

'use strict';

const path = require('path');
const injectionPatterns = require(path.join(__dirname, 'lib', 'injection-patterns.js'));

const STDIN_TIMEOUT_MS = 5000;

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    const timer = setTimeout(() => {
      process.stdin.destroy();
      resolve(data);
    }, STDIN_TIMEOUT_MS);

    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => { clearTimeout(timer); resolve(data); });
    process.stdin.on('error', () => { clearTimeout(timer); resolve(data); });
  });
}

function isExemptPath(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  if (normalized.includes('/.planning/')) return true;
  if (normalized.endsWith('REVIEW.md')) return true;
  if (normalized.includes('/scripts/')) return true;
  if (normalized.toLowerCase().includes('security')) return true;
  return false;
}

async function main() {
  const raw = await readStdin();
  if (!raw.trim()) process.exit(0);

  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const toolResponse = input.tool_response || '';
  const filePath = (input.tool_input && input.tool_input.file_path) || '';

  if (!toolResponse) process.exit(0);

  // Check exempt paths
  if (isExemptPath(filePath)) process.exit(0);

  // Scan content
  const matches = injectionPatterns.scanContent(toolResponse);
  const hasInvisible = injectionPatterns.hasInvisibleUnicode(toolResponse);

  // Calculate total severity count
  const totalCount = matches.length + (hasInvisible ? 1 : 0);

  // LOW severity (0-2 matches): silent exit
  if (totalCount < 3) process.exit(0);

  // HIGH severity (3+ matches): output warning
  const names = [...new Set(matches.map((m) => m.name))];
  if (hasInvisible) names.push('invisible-unicode');

  const msg = `⚠ Maestro 读取扫描: 检测到 ${totalCount} 个可疑模式 [${names.join(', ')}]。可能为文档中的示例内容，请确认。`;

  const output = JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: msg.substring(0, 2000),
    },
  });

  process.stdout.write(output);
  process.exit(0);
}

main().catch(() => process.exit(0));
