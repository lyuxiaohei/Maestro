// maestro-hook-version: 20250529.0
/**
 * session-state.js — Maestro SessionStart hook
 *
 * Reads workflow state and injects it as additionalContext when a session starts.
 * Also calls statusline.js via execFile to update the bridge file.
 *
 * Hook protocol: reads JSON from stdin, writes JSON to stdout.
 * stdin timeout: 5 seconds.
 * Always exits 0 — advisory only, never blocks session start.
 *
 * Pure Node.js built-in modules. No npm dependencies.
 */

'use strict';

const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');

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

function getPlanningDir() {
  return process.env.PLANNING_DIR || path.join(__dirname, '..', '.planning');
}

function updateStatusline(phaseIndex, totalPhases, phaseName, status, completed, slug) {
  try {
    const statuslinePath = path.join(__dirname, 'statusline.js');
    const completedStr = completed.length > 0 ? completed.join('-') : '--';
    const slugPrefix = slug ? `[${slug}] ` : '';
    const displayPhase = `${slugPrefix}P${phaseIndex}/${totalPhases} ${phaseName} (${status})`;
    const args = [statuslinePath, String(phaseIndex), String(totalPhases), displayPhase, status, completedStr];
    const child = execFile(process.execPath, args, () => {
      // Ignore errors — fire-and-forget
    });
    child.unref();
  } catch {
    // Silently ignore — non-critical
  }
}

async function main() {
  // 1. Read stdin
  const raw = await readStdin();
  if (!raw.trim()) process.exit(0);

  // 2. Parse JSON
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  // 3. Import workflow parser
  const { readWorkflowState, readMilestone, scanCompletedPhases } = require('./lib/workflow-parser');
  const { discoverWorkflows } = require('./lib/workflow-parser');

  // 4. Get planning directory
  const planningDir = getPlanningDir();

  // 5. Read workflow state
  const workflowState = readWorkflowState(planningDir);

  // 6. If workflow.md missing: output fallback (HOOK6-03)
  if (!workflowState) {
    const fallback = 'Maestro 会话状态: 未找到工作流 -- 运行 /workflow 初始化';
    const output = JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: fallback.substring(0, 2000),
      },
    });
    process.stdout.write(output);
    process.exit(0);
  }

  // 7. Read milestone version
  const milestone = readMilestone(planningDir);

  // 8. Scan completed phases
  const completed = scanCompletedPhases(planningDir);

  // 9. Build pure text summary
  const { phaseIndex, phaseName, status, totalPhases, slug } = workflowState;
  const completedStr = completed.length > 0 ? completed.join(', ') : '-';

  let summary;
  if (slug) {
    summary = `Maestro 工作流状态: [${slug}] 阶段 ${phaseIndex}/${totalPhases} ${phaseName} (${status})`;
  } else {
    summary = `Maestro 工作流状态: 阶段 ${phaseIndex}/${totalPhases} ${phaseName} (${status})`;
  }

  // Cross-validate (D-02): check if workflow.md phase is marked COMPLETE in P*-STATE.md
  const phasePrefix = `P${phaseIndex.padStart(2, '0')}`;
  const isCurrentComplete = completed.some((p) => p === phasePrefix);
  if (isCurrentComplete && status !== 'COMPLETE') {
    summary += ` [不一致: P${phaseIndex} 已完成但 workflow 状态为 ${status}]`;
  }

  if (milestone) {
    summary += ` | 版本: ${milestone}`;
  }
  summary += ` | 完成: ${completedStr}`;

  // Truncate to 2000 chars
  summary = summary.substring(0, 2000);

  // 10. Call updateStatusline (HOOK6-04)
  updateStatusline(phaseIndex, totalPhases, phaseName, status, completed, slug || null);

  // 11. Output JSON
  const output = JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: summary,
    },
  });
  process.stdout.write(output);

  process.exit(0);
}

main().catch(() => process.exit(0));
