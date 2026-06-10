// maestro-hook-version: 202606.0
/**
 * statusline.js — Maestro statusline for Claude Code
 *
 * Reads stdin JSON from Claude Code, discovers active Maestro workflow,
 * outputs a formatted status line to stdout.
 *
 * Shows: model │ workflow status │ directory │ context usage
 *
 * Exit codes:
 *   0 — always (fail-open)
 *
 * Pure Node.js built-in modules. No npm dependencies.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { readCurrentMilestone } = require('./lib/workflow-parser');

// --- Workflow state reader ---------------------------------------------------

/**
 * Walk up from dir looking for .planning/ and find active workflow.
 * Searches version-based paths first, then falls back to old workflows/ structure.
 * Returns { slug, phase_index, workflow_status, current_phase } or null.
 */
function readMaestroState(dir) {
  const home = os.homedir();
  let current = dir;
  for (let i = 0; i < 10; i++) {
    const planningDir = path.join(current, '.planning');
    if (fs.existsSync(planningDir)) {
      // Try version-based: .planning/{version}/workflows/
      const milestone = readCurrentMilestone(planningDir);
      if (milestone) {
        const workflowsDir = path.join(planningDir, milestone, 'workflows');
        const state = scanWorkflowsDir(workflowsDir);
        if (state) return state;
      }

      // Fallback: old .planning/workflows/
      const oldWorkflowsDir = path.join(planningDir, 'workflows');
      const state = scanWorkflowsDir(oldWorkflowsDir);
      if (state) return state;
    }
    const parent = path.dirname(current);
    if (parent === current || current === home) break;
    current = parent;
  }
  return null;
}

/**
 * Scan a workflows directory for an active workflow.
 */
function scanWorkflowsDir(workflowsDir) {
  try {
    const entries = fs.readdirSync(workflowsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const wfPath = path.join(workflowsDir, entry.name, 'workflow.md');
      if (!fs.existsSync(wfPath)) continue;
      const state = parseWorkflowMd(fs.readFileSync(wfPath, 'utf8'));
      if (state) {
        state.slug = entry.name;
        return state;
      }
    }
  } catch { /* swallow */ }
  return null;
}

/**
 * Parse workflow.md to extract status info.
 * Supports both full workflow (phase_index) and lite (mode/step).
 */
function parseWorkflowMd(content) {
  const state = {};

  // Check for lite mode — match both `- **mode**: single` and `mode: single`
  const modeMatch = content.match(/(?:^mode:\s*|^\- \*\*mode\*\*:\s*)(.+?)$/m);
  if (modeMatch) {
    state.mode = 'lite';
    const statusMatch = content.match(/(?:^status:\s*|^\- \*\*status\*\*:\s*)(.+?)$/m);
    state.workflow_status = statusMatch ? statusMatch[1].trim() : 'unknown';
    const iterMatch = content.match(/(?:^iteration:\s*|^\- \*\*iteration\*\*:\s*)(\d+)/m);
    state.iteration = iterMatch ? iterMatch[1] : '0';
    const stepMatch = content.match(/(?:^step:\s*|^\- \*\*step\*\*:\s*)(.+?)$/m);
    state.step = stepMatch ? stepMatch[1].trim() : '';
    return state;
  }

  // Full 18-phase workflow
  // Support both YAML key: value and markdown list - **key**: value formats
  const statusMatch = content.match(/(?:^workflow_status:\s*|^\- \*\*workflow_status\*\*:\s*)(.+)/m);
  state.workflow_status = statusMatch ? statusMatch[1].trim() : 'UNKNOWN';
  state.mode = 'full';

  const phaseMatch = content.match(/(?:^phase_index:\s*|^\- \*\*phase_index\*\*:\s*)(\d+)/m);
  state.phase_index = phaseMatch ? parseInt(phaseMatch[1], 10) : 0;

  // Try to find current phase name from "当前阶段" section or overview table
  const phaseNameMatch = content.match(/\*\*phase_name\*\*:\s*(.+)/m);
  if (phaseNameMatch) {
    state.current_phase_name = phaseNameMatch[1].trim().substring(0, 20);
  }

  const phaseStatusMatch = content.match(/\*\*status\*\*:\s*(.+)/m);
  if (phaseStatusMatch) {
    state.current_phase_status = phaseStatusMatch[1].trim();
  }

  // Also check overview table
  const lines = content.split('\n');
  for (const line of lines) {
    if (!line.includes('|')) continue;
    const cols = line.split('|').map(c => c.trim());
    if (cols.length >= 4) {
      const numMatch = cols[1] && cols[1].match(/^P?(\d+)/);
      if (numMatch && parseInt(numMatch[1], 10) === state.phase_index) {
        if (!state.current_phase_name && cols[2]) state.current_phase_name = cols[2].substring(0, 20);
        if (!state.current_phase_status && cols[4]) state.current_phase_status = cols[4];
      }
    }
  }

  return state;
}

// --- Formatting --------------------------------------------------------------

/**
 * Format Maestro state into a short status string.
 */
function formatMaestroState(state) {
  if (!state) return '';

  const slugSuffix = state.slug ? ` | ${state.slug}` : '';

  if (state.mode === 'lite') {
    const icon = state.workflow_status === 'complete' ? 'done' : `it${state.iteration}`;
    const stepLabel = { discuss: 'discuss', plan: 'plan', execute: 'exec', verify: 'verify' }[state.step] || state.step;
    if (state.workflow_status === 'complete') return `lite:${icon}${slugSuffix}`;
    return `lite:${icon} ${stepLabel}${slugSuffix}`;
  }

  // Full workflow
  if (state.phase_index === 0) return `workflow:${state.workflow_status}${slugSuffix}`;
  const pi = String(state.phase_index).padStart(2, '0');
  const statusIcon = state.current_phase_status === 'IN_PROGRESS' ? '...' :
                     state.current_phase_status === 'BLOCKED' ? '!!' :
                     state.current_phase_status === 'COMPLETE' ? 'ok' : '';
  return `P${pi}${state.current_phase_name ? ' ' + state.current_phase_name : ''} ${statusIcon}${slugSuffix}`;
}

/**
 * Compose the full statusline string.
 */
function composeStatusline({ model, dirname, maestroState, ctx, remaining }) {
  const modelSeg = `\x1b[2m${model}\x1b[0m`;
  const dirSeg = `\x1b[2m${dirname}\x1b[0m`;

  const middle = maestroState ? `\x1b[2mMaestro ${maestroState}\x1b[0m` : null;

  if (middle && ctx) return `${modelSeg} │ ${middle} │ ${ctx} ${dirSeg}`;
  if (middle) return `${modelSeg} │ ${middle} │ ${dirSeg}`;
  if (ctx) return `${modelSeg} │ ${ctx} ${dirSeg}`;
  return `${modelSeg} │ ${dirSeg}`;
}

// --- Context usage -----------------------------------------------------------

/**
 * Read the freshest remaining_percentage from .planning/.ctx-latest.json.
 * Walks up from dir (max 10 levels) to find .planning/ directory.
 * Returns the `r` value if file exists and timestamp is within 60 seconds, else null.
 * Fail-open: any error returns null.
 */
function readCtxLatest(dir) {
  try {
    const home = os.homedir();
    let current = dir;
    for (let i = 0; i < 10; i++) {
      const candidate = path.join(current, '.planning', '.ctx-latest.json');
      if (fs.existsSync(candidate)) {
        const raw = fs.readFileSync(candidate, 'utf8');
        const data = JSON.parse(raw);
        if (data && typeof data.t === 'number' && typeof data.r === 'number') {
          if ((Date.now() - data.t) < 60000) {
            return data.r;
          }
        }
        return null; // file found but stale or malformed
      }
      const parent = path.dirname(current);
      if (parent === current || current === home) break;
      current = parent;
    }
  } catch {
    // Silently ignore — fail-open
  }
  return null;
}

function formatContext(remaining) {
  if (remaining == null) return '';
  const used = Math.max(0, Math.round(100 - remaining));
  return `\x1b[2mctx:${used}%\x1b[0m`;
}

// --- Main --------------------------------------------------------------------

function runStatusline() {
  let input = '';
  const stdinTimeout = setTimeout(() => process.exit(0), 3000);
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => input += chunk);
  process.stdin.on('end', () => {
    clearTimeout(stdinTimeout);
    try {
      const data = JSON.parse(input);
      const model = data.model?.display_name || 'Claude';
      const dir = data.workspace?.current_dir || process.cwd();
      const dirname = path.basename(dir);
      const remaining = data.context_window?.remaining_percentage;
      // Prefer fresher value from context-monitor hook if available
      const ctxLatest = readCtxLatest(dir);
      const effectiveRemaining = ctxLatest != null ? ctxLatest : remaining;

      const state = readMaestroState(dir);
      const maestroState = formatMaestroState(state);
      const ctx = formatContext(effectiveRemaining);

      process.stdout.write(composeStatusline({ model, dirname, maestroState, ctx, remaining: effectiveRemaining }));
    } catch {
      // On any error, output nothing — fail-open
    }
    process.exit(0);
  });
}

module.exports = { parseWorkflowMd, formatMaestroState, composeStatusline, formatContext };

if (require.main === module) runStatusline();
