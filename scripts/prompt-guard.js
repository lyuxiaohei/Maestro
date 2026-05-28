// maestro-hook-version: 0.53.0
/**
 * prompt-guard.js — Maestro PreToolUse Write|Edit injection guard hook
 *
 * Scans content being written to .planning/ for prompt injection patterns
 * and invisible Unicode characters. Advisory only (exit 0).
 *
 * Hook protocol: reads JSON from stdin, writes JSON to stdout.
 * stdin timeout: 5 seconds.
 *
 * Pure Node.js built-in modules. No npm dependencies.
 */

'use strict';

const path = require('path');
const injectionPatterns = require(path.join(__dirname, 'lib', 'injection-patterns.js'));

const STDIN_TIMEOUT_MS = 5000;

function readStdin() {
  return new Promise((resolve, reject) => {
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

function extractContent(input) {
  const toolName = input.tool_name || '';
  const toolInput = input.tool_input || {};

  if (toolName === 'Write') {
    return { filePath: toolInput.file_path || '', content: toolInput.content || '' };
  }
  if (toolName === 'Edit') {
    return {
      filePath: toolInput.file_path || '',
      content: (toolInput.old_string || '') + '\n' + (toolInput.new_string || ''),
    };
  }
  return { filePath: '', content: '' };
}

function isStatusChangeExempt(filePath, content) {
  if (!filePath.replace(/\\/g, '/').includes('.planning/')) return false;
  // Allow legitimate status field changes in state files
  const statusPattern = /^[-*\s]*status:\s*(NOT_STARTED|IN_PROGRESS|COMPLETE|BLOCKED|SKIPPED|PLANNED)/m;
  const lines = content.split('\n');
  const nonStatusLines = lines.filter(l => !statusPattern.test(l)).join('\n');
  // If removing status lines eliminates all content, it's a pure status change
  return nonStatusLines.trim().length < 20;
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

  const { filePath, content } = extractContent(input);
  if (!content) process.exit(0);

  // Exempt legitimate status changes in state files
  if (isStatusChangeExempt(filePath, content)) process.exit(0);

  const matches = injectionPatterns.scanContent(content);
  const hasInvisible = injectionPatterns.hasInvisibleUnicode(content);

  if (matches.length === 0 && !hasInvisible) process.exit(0);

  const parts = [];
  if (matches.length > 0) {
    const names = [...new Set(matches.map(m => m.name))].join(', ');
    parts.push(`检测到 ${matches.length} 个可疑模式 [${names}]`);
  }
  if (hasInvisible) {
    parts.push('检测到不可见 Unicode 字符');
  }

  const msg = `⚠ Maestro 注入防护: ${parts.join('，')}。如果这是合法的编排器操作或文档内容，可以忽略此警告。`;

  const output = JSON.stringify({
    decision: 'allow',
    reason: '',
    additionalContext: msg.substring(0, 2000),
  });
  process.stdout.write(output);
  process.exit(0);
}

main().catch(() => process.exit(0));
