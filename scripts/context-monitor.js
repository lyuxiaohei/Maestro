// maestro-hook-version: 202606.0
/**
 * context-monitor.js — Maestro PostToolUse Write|Edit context usage reminder hook
 *
 * Monitors context window usage via Claude Code's context_window.remaining_percentage
 * and outputs advisory-tone reminders at three thresholds:
 *   SOFT:     60% used — suggest /compact after current sub-task
 *   HARD:     75% used — suggest /compact soon or new session
 *   CRITICAL: 88% used — suggest immediate /compact, auto-persist workflow state
 *
 * Debounce: percentage-based zone dedup via .planning/.ctx-level.json
 *   (same zone only warns once; zone escalation triggers immediately)
 *
 * Opt-out: set hooks.context_warnings to false in .planning/config.json
 *
 * Hook protocol: reads JSON from stdin, writes JSON to stdout.
 * stdin timeout: 5 seconds.
 * Always exits 0 — advisory only, never blocks tool calls.
 *
 * Pure Node.js built-in modules. No npm dependencies.
 */

'use strict';

const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');

const STDIN_TIMEOUT_MS = 5000;

// Percentage thresholds (used context = 100 - remaining)
const SOFT_PCT = 60;
const HARD_PCT = 75;
const CRITICAL_PCT = 88;

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

function getConfig() {
  try {
    const configPath = path.join(__dirname, '..', '.planning', 'config.json');
    const raw = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Get the path for the level tracker file (.planning/.ctx-level.json).
 * This lightweight file stores only the last warning zone for debounce.
 */
function getLevelPath() {
  return path.join(__dirname, '..', '.planning', '.ctx-level.json');
}

function readLevel() {
  try {
    const raw = fs.readFileSync(getLevelPath(), 'utf8');
    const data = JSON.parse(raw);
    if (data && typeof data.lastLevel === 'string') {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

function writeLevel(levelData) {
  try {
    fs.writeFileSync(getLevelPath(), JSON.stringify(levelData, null, 2), 'utf8');
  } catch {
    // Silently ignore write errors — advisory only
  }
}

/**
 * Determine the current zone based on used percentage.
 */
function getZone(usedPct) {
  if (usedPct >= CRITICAL_PCT) return 'critical';
  if (usedPct >= HARD_PCT) return 'hard';
  if (usedPct >= SOFT_PCT) return 'soft';
  return null;
}

/**
 * Find active workflow slug for warning message template.
 */
function findActiveSlug() {
  try {
    const workflowParser = require('./lib/workflow-parser');
    const planningDir = path.join(__dirname, '..', '.planning');
    const slugs = workflowParser.discoverWorkflows(planningDir);
    if (slugs.length === 0) return null;

    // Return the first workflow that has an active (non-complete) state
    for (const slug of slugs) {
      const wfDir = workflowParser.resolveWorkflowDir(planningDir, slug);
      const wfPath = path.join(wfDir, 'workflow.md');
      try {
        const raw = fs.readFileSync(wfPath, 'utf8');
        const statusMatch = raw.match(/(?:^status:\s*|^\- \*\*status\*\*:\s*)(.+?)$/m);
        const status = statusMatch ? statusMatch[1].trim() : '';
        if (status && status !== 'complete') return slug;
      } catch { continue; }
    }

    // If all are complete or we can't determine, return first slug
    return slugs[0];
  } catch {
    return null;
  }
}

/**
 * Format the advisory-tone warning message.
 */
function formatMessage(zone, usedPct, remainingPct, slug) {
  const pct = Math.round(usedPct);
  const rem = Math.round(remainingPct);
  const slugPart = slug ? ` /maestro-workflow-lite ${slug}` : '';

  if (zone === 'soft') {
    return `Maestro 上下文提醒: 已使用 ${pct}%（剩余 ${rem}%）。建议在完成当前子任务后执行 /compact 释放空间，可附带保留指令（如"保留所有决策和工作流状态"）。`;
  }
  if (zone === 'hard') {
    return `Maestro 上下文提醒: 已使用 ${pct}%（剩余 ${rem}%）。建议尽快执行 /compact。如已感觉回复质量下降，可在新会话中运行${slugPart} 从当前步骤恢复。`;
  }
  // critical
  return `Maestro 上下文提醒: 已使用 ${pct}%（仅剩 ${rem}%）。auto-compact 即将触发（有损摘要）。建议立即 /compact 或开启新会话运行${slugPart}。工作流状态已自动记录。`;
}

function updateStatusline() {
  try {
    const workflowParser = require('./lib/workflow-parser');
    const planningDir = path.join(__dirname, '..', '.planning');
    const state = workflowParser.readWorkflowState(planningDir);
    if (!state) return;

    const completed = workflowParser.scanCompletedPhases(planningDir);
    const statuslinePath = path.join(__dirname, 'statusline.js');
    const completedStr = completed.length > 0 ? completed.join('-') : '--';
    const args = [statuslinePath, state.phaseIndex, String(state.totalPhases), state.phaseName, state.status, completedStr];
    const child = execFile(process.execPath, args, () => {
      // Ignore errors — fire-and-forget
    });
    child.unref();
  } catch {
    // Silently ignore — statusline update is non-critical
  }
}

/**
 * Auto-persist workflow state on CRITICAL (fire-and-forget subprocess).
 * Updates the active workflow's workflow.md stopped_at field.
 */
function triggerAutoPersist(slug, usedPct) {
  if (!slug) return;
  try {
    const script = `
      const fs = require('fs');
      const path = require('path');
      try {
        const workflowParser = require('./lib/workflow-parser');
        const planningDir = path.join(__dirname, '..', '.planning');
        const wfDir = workflowParser.resolveWorkflowDir(planningDir, ${JSON.stringify(slug)});
        const wfPath = path.join(wfDir, 'workflow.md');
        if (fs.existsSync(wfPath)) {
          let content = fs.readFileSync(wfPath, 'utf8');
          const today = new Date().toISOString().split('T')[0];
          const stoppedAt = 'context exhaustion at ${Math.round(usedPct)}% (' + today + ')';
          content = content.replace(/^stopped_at:.*$/m, 'stopped_at: ' + stoppedAt);
          content = content.replace(/^last_updated:.*$/m, 'last_updated: ' + new Date().toISOString());
          fs.writeFileSync(wfPath, content, 'utf8');
        }
      } catch {}
    `;
    const child = execFile(process.execPath, ['-e', script], { cwd: __dirname }, () => {
      // Ignore errors — fire-and-forget
    });
    child.unref();
  } catch {
    // Silently ignore — auto-persist is non-critical
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

  // 3. Check opt-out config
  const config = getConfig();
  if (config.hooks && config.hooks.context_warnings === false) {
    process.exit(0);
  }

  // 4. Only handle Write and Edit tools
  const toolName = input.tool_name || '';
  if (toolName !== 'Write' && toolName !== 'Edit') process.exit(0);

  // 5. Read remaining_percentage from context_window
  const remainingPct = input.context_window && input.context_window.remaining_percentage;
  if (typeof remainingPct !== 'number' || !isFinite(remainingPct)) {
    // Graceful fallback: no context window data, silently exit
    process.exit(0);
  }

  const usedPct = 100 - remainingPct;

  // 6. Determine zone
  const zone = getZone(usedPct);
  if (!zone) {
    // Below SOFT threshold, clean up level tracker and exit silently
    try {
      const levelPath = getLevelPath();
      if (fs.existsSync(levelPath)) {
        writeLevel({ lastLevel: null, criticalRecorded: false });
      }
    } catch {}
    process.exit(0);
  }

  // 7. Debounce: same zone only warns once; escalation triggers immediately
  const existing = readLevel();
  const lastLevel = existing ? existing.lastLevel : null;
  const criticalRecorded = existing ? existing.criticalRecorded : false;

  if (lastLevel === zone) {
    // Same zone, already warned — skip output but still update statusline
    updateStatusline();
    process.exit(0);
  }

  // 8. Zone escalated or first warning — output advisory message
  const slug = findActiveSlug();
  const msg = formatMessage(zone, usedPct, remainingPct, slug);

  const output = JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: msg.substring(0, 2000),
    },
  });
  process.stdout.write(output);

  // 9. Persist level tracker
  const newLevelData = { lastLevel: zone, criticalRecorded: criticalRecorded || false };
  writeLevel(newLevelData);

  // 10. CRITICAL auto-persist workflow state (fire-and-forget)
  if (zone === 'critical' && !criticalRecorded) {
    triggerAutoPersist(slug, usedPct);
    writeLevel({ lastLevel: zone, criticalRecorded: true });
  }

  // 11. Update statusline (non-critical, fire-and-forget)
  updateStatusline();

  process.exit(0);
}

main().catch(() => process.exit(0));
