// maestro-hook-version: 0.51.0
/**
 * phase-boundary.js — Maestro PostToolUse Write|Edit phase boundary detection hook
 *
 * Detects when phase state files (.planning/phases/P*-STATE.md) are modified
 * and outputs an advisory reminder to sync workflow.md.
 *
 * Hook protocol: reads JSON from stdin, writes JSON to stdout.
 * stdin timeout: 5 seconds.
 * Always exits 0 — advisory only, never blocks tool calls.
 *
 * Exit codes:
 *   0 — always (advisory hook, fail-open)
 *
 * Pure Node.js built-in modules. No npm dependencies.
 */

'use strict';

const path = require('path');

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

/**
 * Check if a file path points to a phase state file.
 * Matches: .planning/phases/P<digits>-<slug>/<digits>-STATE.md
 * Also handles Windows backslash paths.
 */
function isPhaseStateFile(filePath) {
  const normalized = filePath.replace(/\\/g, '/');

  // Primary pattern: full path under .planning/phases/P##-slug/##-STATE.md
  const primaryPattern = /\/\.planning\/phases\/P\d+-[^/]+\/\d+-STATE\.md$/;
  if (primaryPattern.test(normalized)) return true;

  // Secondary pattern: robustness check — filename segment matches P##-STATE.md
  // and path includes .planning/phases
  if (normalized.includes('/.planning/phases/')) {
    const segmentPattern = /P\d+-[^/]+\/\d+-STATE\.md$/;
    if (segmentPattern.test(normalized)) return true;
  }

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

  const filePath = (input.tool_input && input.tool_input.file_path) || '';
  if (!filePath) process.exit(0);

  if (!isPhaseStateFile(filePath)) process.exit(0);

  const basename = path.basename(filePath);
  const msg = `⚠ Maestro 阶段边界: 检测到阶段状态文件 ${basename} 被修改。请确认 workflow.md 阶段总览已同步更新。`;

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
