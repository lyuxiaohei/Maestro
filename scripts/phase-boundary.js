// maestro-hook-version: 0.52.0
/**
 * phase-boundary.js — Maestro PostToolUse Write|Edit phase boundary detection hook
 *
 * Detects when phase state files (STATE.md) are modified and outputs an advisory
 * reminder to sync workflow.md. Supports both new multi-workflow paths and legacy paths.
 *
 * Hook protocol: reads JSON from stdin, writes JSON to stdout.
 * stdin timeout: 5 seconds.
 * Always exits 0 — advisory only, never blocks tool calls.
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
 * Matches both new multi-workflow and legacy paths:
 *   New: .planning/workflows/{slug}/phases/{domain}/P##-{slug}/P##-STATE.md
 *   Legacy: .planning/phases/P##-STATE.md or .planning/phases/P##-slug/P##-STATE.md
 */
function isPhaseStateFile(filePath) {
  const normalized = filePath.replace(/\\/g, '/');

  // New multi-workflow path: .planning/workflows/{slug}/phases/{domain}/P##-{slug}/P##-STATE.md
  const newPattern = /\/\.planning\/workflows\/[^/]+\/phases\/[^/]+\/P\d+-[^/]+\/P\d+-STATE\.md$/;
  if (newPattern.test(normalized)) return true;

  // New path segment check
  if (normalized.includes('/.planning/workflows/')) {
    const segmentPattern = /P\d+-[^/]+\/P\d+-STATE\.md$/;
    if (segmentPattern.test(normalized)) return true;
  }

  // Legacy: .planning/phases/P##-slug/P##-STATE.md (Phase 21 subdirectory format)
  const legacySubdir = /\/\.planning\/phases\/P\d+-[^/]+\/P\d+-STATE\.md$/;
  if (legacySubdir.test(normalized)) return true;

  // Legacy: .planning/phases/P##-STATE.md (flat format)
  const legacyFlat = /\/\.planning\/phases\/P\d+-STATE\.md$/;
  if (legacyFlat.test(normalized)) return true;

  // Legacy segment check
  if (normalized.includes('/.planning/phases/')) {
    const segmentPattern = /P\d+-STATE\.md$/;
    if (segmentPattern.test(normalized)) return true;
  }

  return false;
}

/**
 * Extract workflow slug from new path format.
 */
function extractWorkflowSlug(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  const match = normalized.match(/\/\.planning\/workflows\/([^/]+)\//);
  return match ? match[1] : null;
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
  const slug = extractWorkflowSlug(filePath);

  let msg;
  if (slug) {
    msg = `⚠ Maestro 阶段边界: 检测到工作流 [${slug}] 的阶段状态文件 ${basename} 被修改。请确认 workflow.md 阶段总览已同步更新。`;
  } else {
    msg = `⚠ Maestro 阶段边界: 检测到阶段状态文件 ${basename} 被修改。请确认 workflow.md 阶段总览已同步更新。`;
  }

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
