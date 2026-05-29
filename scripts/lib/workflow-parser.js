// maestro-hook-version: 20250529.0
/**
 * workflow-parser.js — Maestro shared workflow state parser
 *
 * Exports:
 *   readWorkflowState(planningDir)   — parse workflow.md current phase info
 *   readMilestone(planningDir)       — parse STATE.md milestone version
 *   scanCompletedPhases(planningDir) — scan P*-STATE.md files for COMPLETE status
 *   discoverWorkflows(planningDir)   — list workflow slugs under workflows/
 *   resolveWorkflowDir(planningDir, slug) — build workflow directory path
 *
 * Pure Node.js built-in modules. No npm dependencies.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const DOMAIN_DIRS = ['product-manager', 'architect', 'development', 'test-engineer', 'ops-engineer'];

/**
 * List all workflow slugs under .planning/workflows/.
 * @param {string} planningDir - absolute path to .planning/ directory
 * @returns {string[]} sorted array of workflow slugs
 */
function discoverWorkflows(planningDir) {
  try {
    const workflowsDir = path.join(planningDir, 'workflows');
    const entries = fs.readdirSync(workflowsDir, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

/**
 * Build workflow directory path.
 * @param {string} planningDir
 * @param {string} slug
 * @returns {string} absolute path to workflow directory
 */
function resolveWorkflowDir(planningDir, slug) {
  return path.join(planningDir, 'workflows', slug);
}

/**
 * Parse workflow.md content to extract phase info.
 */
function parseWorkflowMd(raw) {
  const indexMatch = raw.match(/\*\*phase_index\*\*:\s*(\d+)/);
  if (!indexMatch) return null;
  const phaseIndex = indexMatch[1];

  const nameMatch = raw.match(/\*\*phase_name\*\*:\s*(.+)/);
  const phaseName = nameMatch ? nameMatch[1].trim() : '';

  const statusMatch = raw.match(/\*\*(?:workflow_status|status)\*\*:\s*(.+)/);
  const status = statusMatch ? statusMatch[1].trim() : '';

  const slugMatch = raw.match(/\*\*workflow_slug\*\*:\s*(.+)/);
  const slug = slugMatch ? slugMatch[1].trim() : '';

  const lines = raw.split('\n');
  let totalPhases = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^\|\s*\d+\s*\|/.test(trimmed)) {
      totalPhases++;
    }
  }

  return { phaseIndex, phaseName, status, totalPhases, slug };
}

/**
 * Read workflow.md from planningDir and extract current phase info.
 * Supports both new (workflows/{slug}/) and legacy (.planning/) paths.
 */
function readWorkflowState(planningDir) {
  try {
    // Try new path: discover workflows and read the first active one
    const workflows = discoverWorkflows(planningDir);
    if (workflows.length > 0) {
      for (const slug of workflows) {
        const wfPath = path.join(resolveWorkflowDir(planningDir, slug), 'workflow.md');
        try {
          const raw = fs.readFileSync(wfPath, 'utf8');
          const state = parseWorkflowMd(raw);
          if (state) {
            state.slug = state.slug || slug;
            return state;
          }
        } catch {
          continue;
        }
      }
    }

    // Fallback: legacy .planning/workflow.md
    const workflowPath = path.join(planningDir, 'workflow.md');
    const raw = fs.readFileSync(workflowPath, 'utf8');
    return parseWorkflowMd(raw);
  } catch {
    return null;
  }
}

/**
 * Read STATE.md milestone field from planningDir.
 */
function readMilestone(planningDir) {
  try {
    const statePath = path.join(planningDir, 'STATE.md');
    const raw = fs.readFileSync(statePath, 'utf8');
    const match = raw.match(/^milestone:\s*(.+)$/m);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

/**
 * Scan P*-STATE.md files for COMPLETE status.
 * Supports both new (workflows/{slug}/phases/{domain}/) and legacy (phases/) paths.
 */
function scanCompletedPhases(planningDir) {
  const completed = [];

  // Try new path: scan workflows/*/phases/{domain}/P##-{slug}/P##-STATE.md
  const workflows = discoverWorkflows(planningDir);
  if (workflows.length > 0) {
    for (const slug of workflows) {
      const phasesDir = path.join(resolveWorkflowDir(planningDir, slug), 'phases');
      for (const domain of DOMAIN_DIRS) {
        const domainDir = path.join(phasesDir, domain);
        try {
          const entries = fs.readdirSync(domainDir, { withFileTypes: true });
          for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            const stateMatch = entry.name.match(/^(P\d+)-/);
            if (!stateMatch) continue;

            // P15 under development/ uses frontend/backend subdirectories
            if (domain === 'development' && entry.name.startsWith('P15-')) {
              for (const subDir of ['frontend', 'backend']) {
                const subPath = path.join(domainDir, entry.name, subDir);
                try {
                  const subStatePath = path.join(subPath, 'P15-STATE.md');
                  const content = fs.readFileSync(subStatePath, 'utf8');
                  if (/- \*\*status\*\*:\s*COMPLETE/.test(content)) {
                    completed.push(stateMatch[1]);
                    break; // one match per P15 entry is enough
                  }
                } catch {
                  // fallback: try STATE.md
                  try {
                    const altPath = path.join(subPath, 'STATE.md');
                    const content = fs.readFileSync(altPath, 'utf8');
                    if (/- \*\*status\*\*:\s*COMPLETE/.test(content)) {
                      completed.push(stateMatch[1]);
                      break;
                    }
                  } catch { /* skip */ }
                }
              }
            } else {
              const statePath = path.join(domainDir, entry.name, `${stateMatch[1]}-STATE.md`);
              try {
                const content = fs.readFileSync(statePath, 'utf8');
                if (/- \*\*status\*\*:\s*COMPLETE/.test(content)) {
                  completed.push(stateMatch[1]);
                }
              } catch { /* skip */ }
            }
          }
        } catch { /* domain dir missing */ }
      }
    }
  }

  // Fallback: legacy .planning/phases/P*-STATE.md
  try {
    const phasesDir = path.join(planningDir, 'phases');
    const entries = fs.readdirSync(phasesDir);
    for (const entry of entries) {
      const match = entry.match(/^(P\d+)-STATE\.md$/);
      if (!match) continue;
      try {
        const filePath = path.join(phasesDir, entry);
        const content = fs.readFileSync(filePath, 'utf8');
        if (/- \*\*status\*\*:\s*COMPLETE/.test(content)) {
          if (!completed.includes(match[1])) completed.push(match[1]);
        }
      } catch { /* skip */ }
    }
  } catch { /* phases dir missing */ }

  completed.sort((a, b) => parseInt(a.substring(1), 10) - parseInt(b.substring(1), 10));
  return completed;
}

module.exports = { readWorkflowState, readMilestone, scanCompletedPhases, discoverWorkflows, resolveWorkflowDir, DOMAIN_DIRS };
