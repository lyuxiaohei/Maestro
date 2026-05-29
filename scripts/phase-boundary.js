// maestro-hook-version: 20250529.0
/**
 * phase-boundary.js — Maestro PostToolUse Write|Edit phase boundary detection hook
 *
 * Detects when phase state files (STATE.md) are modified and outputs an advisory
 * reminder to sync workflow.md. Supports version-based, old multi-workflow, and legacy paths.
 *
 * Path formats recognized:
 *   New:     .planning/{version}/workflows/{slug}/P##-{slug}/STATE.md
 *   Old:     .planning/workflows/{slug}/phases/{domain}/P##-{slug}/P##-STATE.md
 *   Legacy:  .planning/phases/P##-STATE.md or .planning/phases/P##-slug/P##-STATE.md
 *
 * Hook protocol: reads JSON from stdin, writes JSON to stdout.
 * stdin timeout: 5 seconds.
 * Always exits 0 — advisory only, never blocks tool calls.
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
 * Matches version-based, old multi-workflow, and legacy paths.
 */
function isPhaseStateFile(filePath) {
  const normalized = filePath.replace(/\\/g, '/');

  // Version-based: .planning/{YYYYMM.PATCH}/workflows/{slug}/P##-{slug}/STATE.md
  const versionPattern = /\/\.planning\/\d{6}\.\d+\/workflows\/[^/]+\/P\d+-[^/]+\/STATE\.md$/;
  if (versionPattern.test(normalized)) return true;

  // Version-based segment check
  if (/\/\.planning\/\d{6}\.\d+\/workflows\//.test(normalized)) {
    if (/P\d+-[^/]+\/STATE\.md$/.test(normalized)) return true;
  }

  // Old multi-workflow: .planning/workflows/{slug}/phases/{domain}/P##-{slug}/P##-STATE.md
  const oldPattern = /\/\.planning\/workflows\/[^/]+\/phases\/[^/]+\/P\d+-[^/]+\/P\d+-STATE\.md$/;
  if (oldPattern.test(normalized)) return true;

  // Old path segment check
  if (normalized.includes('/.planning/workflows/')) {
    if (/P\d+-[^/]+\/P?\d+-STATE\.md$/.test(normalized)) return true;
  }

  // Legacy: .planning/phases/P##-slug/P##-STATE.md (Phase 21 subdirectory format)
  const legacySubdir = /\/\.planning\/phases\/P\d+-[^/]+\/P\d+-STATE\.md$/;
  if (legacySubdir.test(normalized)) return true;

  // Legacy: .planning/phases/P##-STATE.md (flat format)
  const legacyFlat = /\/\.planning\/phases\/P\d+-STATE\.md$/;
  if (legacyFlat.test(normalized)) return true;

  // Legacy segment check
  if (normalized.includes('/.planning/phases/')) {
    if (/P\d+-STATE\.md$/.test(normalized)) return true;
  }

  return false;
}

/**
 * Extract workflow slug and version from path.
 * Returns { slug, version } or { slug } for old/legacy paths.
 */
function extractContext(filePath) {
  const normalized = filePath.replace(/\\/g, '/');

  // Version-based: extract version and slug
  const versionMatch = normalized.match(/\/\.planning\/(\d{6}\.\d+)\/workflows\/([^/]+)\//);
  if (versionMatch) {
    return { version: versionMatch[1], slug: versionMatch[2] };
  }

  // Old format: extract slug
  const oldMatch = normalized.match(/\/\.planning\/workflows\/([^/]+)\//);
  if (oldMatch) {
    return { slug: oldMatch[1] };
  }

  return {};
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
  const ctx = extractContext(filePath);

  let msg;
  if (ctx.version && ctx.slug) {
    msg = `⚠ Maestro 阶段边界: 检测到版本 [${ctx.version}] 工作流 [${ctx.slug}] 的阶段状态文件 ${basename} 被修改。请确认 workflow.md 阶段总览已同步更新。`;
  } else if (ctx.slug) {
    msg = `⚠ Maestro 阶段边界: 检测到工作流 [${ctx.slug}] 的阶段状态文件 ${basename} 被修改。请确认 workflow.md 阶段总览已同步更新。`;
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
