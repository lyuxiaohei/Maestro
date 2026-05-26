// maestro-hook-version: 0.51.0
/**
 * context-monitor.js — Maestro PostToolUse Write|Edit context usage monitor hook
 *
 * Tracks cumulative bytes written by Claude Code in a session and warns at thresholds:
 *   SOFT:     204800 bytes (200KB) — silent, no output
 *   HARD:     512000 bytes (500KB) — additionalContext warning
 *   CRITICAL: 1048576 bytes (1MB)  — strong warning suggesting new session
 *
 * Opt-out: set hooks.context_warnings to false in .planning/config.json
 *
 * State file: .planning/.ctx-tracker.json
 * Structure: { "current": { "bytes": N, "updated": "ISO-8601" } }
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

// Thresholds in bytes
const SOFT_THRESHOLD = 204800;   // 200KB
const HARD_THRESHOLD = 512000;   // 500KB
const CRITICAL_THRESHOLD = 1048576; // 1MB

const DEBOUNCE_CALLS = 5;

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

function getTrackerPath() {
  return path.join(__dirname, '..', '.planning', '.ctx-tracker.json');
}

function readTracker(trackerPath) {
  try {
    const raw = fs.readFileSync(trackerPath, 'utf8');
    const data = JSON.parse(raw);
    if (data && typeof data.current === 'object' && typeof data.current.bytes === 'number') {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

function writeTracker(trackerPath, bytes) {
  try {
    const data = {
      current: {
        bytes: bytes,
        updated: new Date().toISOString(),
      },
    };
    fs.writeFileSync(trackerPath, JSON.stringify(data, null, 2), 'utf8');
  } catch {
    // Silently ignore write errors — advisory only
  }
}

function updateStatusline() {
  try {
    // Use shared workflow parser to get current phase info
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

  // 4. Only track Write and Edit tools
  const toolName = input.tool_name || '';
  if (toolName !== 'Write' && toolName !== 'Edit') process.exit(0);

  // 5. Compute byte count for this operation
  const toolInput = input.tool_input || {};
  let newBytes = 0;

  if (toolName === 'Write') {
    newBytes = Buffer.byteLength(toolInput.content || '', 'utf8');
  } else if (toolName === 'Edit') {
    newBytes = Buffer.byteLength(toolInput.new_string || '', 'utf8');
  }

  if (newBytes === 0) process.exit(0);

  // 6. Read existing tracker or start fresh
  const trackerPath = getTrackerPath();
  const existing = readTracker(trackerPath);
  const currentBytes = existing ? existing.current.bytes + newBytes : newBytes;

  // 7. Persist updated tracker
  writeTracker(trackerPath, currentBytes);

  // 7.1. Debounce check — reduces warning spam in long sessions
  const debouncePath = path.join(__dirname, '..', '.planning', '.ctx-debounce.json');
  let debounceData = { callsSinceWarn: 0, lastLevel: null, criticalRecorded: false };
  let firstWarn = true;

  if (fs.existsSync(debouncePath)) {
    try {
      debounceData = JSON.parse(fs.readFileSync(debouncePath, 'utf8'));
      firstWarn = false;
    } catch { /* corrupted, start fresh */ }
  }

  debounceData.callsSinceWarn = (debounceData.callsSinceWarn || 0) + 1;

  // Compute threshold levels for debounce logic
  const isCritical = currentBytes >= CRITICAL_THRESHOLD;
  const isHard = currentBytes >= HARD_THRESHOLD;
  const currentLevel = isCritical ? 'critical' : (isHard ? 'hard' : 'soft');

  // Severity escalation bypasses debounce
  const severityEscalated = currentLevel === 'critical' && debounceData.lastLevel === 'hard';

  // Skip if debounced (unless first warning, critical, or severity escalated)
  if (!firstWarn && !isCritical && debounceData.callsSinceWarn < DEBOUNCE_CALLS && !severityEscalated) {
    try { fs.writeFileSync(debouncePath, JSON.stringify(debounceData)); } catch {}
    process.exit(0);
  }

  // Reset counter and persist
  debounceData.callsSinceWarn = 0;
  debounceData.lastLevel = currentLevel;
  try { fs.writeFileSync(debouncePath, JSON.stringify(debounceData)); } catch {}

  // 7.2. CRITICAL auto-save — persist STATE.md progress once per session
  if (isCritical && !debounceData.criticalRecorded) {
    try {
      const statePath = path.join(__dirname, '..', '.planning', 'STATE.md');
      if (fs.existsSync(statePath)) {
        let stateContent = fs.readFileSync(statePath, 'utf8');
        const today = new Date().toISOString().split('T')[0];
        const mb = (currentBytes / 1048576).toFixed(1);
        const stoppedAt = `context exhaustion at ${mb}MB (${today})`;
        stateContent = stateContent.replace(
          /^stopped_at:.*$/m,
          `stopped_at: ${stoppedAt}`
        );
        stateContent = stateContent.replace(
          /^last_updated:.*$/m,
          `last_updated: ${new Date().toISOString()}`
        );
        fs.writeFileSync(statePath, stateContent, 'utf8');
        debounceData.criticalRecorded = true;
        try { fs.writeFileSync(debouncePath, JSON.stringify(debounceData)); } catch {}
      }
    } catch { /* non-critical, don't break the hook */ }
  }

  // 7.5. Update statusline bridge file (non-critical, fire-and-forget)
  updateStatusline();

  // 8. Apply thresholds and output
  if (currentBytes >= CRITICAL_THRESHOLD) {
    const mb = (currentBytes / 1048576).toFixed(1);
    const msg = `Maestro 上下文监控: 已累计写入 ${mb}MB，超过 CRITICAL 阈值。建议开始新会话 — 状态已持久化在 .planning/。`;
    const output = JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: msg.substring(0, 2000),
      },
    });
    process.stdout.write(output);
  } else if (currentBytes >= HARD_THRESHOLD) {
    const kb = Math.round(currentBytes / 1024);
    const msg = `Maestro 上下文监控: 已累计写入 ${kb}KB，接近上下文窗口上限。建议留意输出质量。`;
    const output = JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: msg.substring(0, 2000),
      },
    });
    process.stdout.write(output);
  }
  // SOFT threshold and below: silent exit

  process.exit(0);
}

main().catch(() => process.exit(0));
