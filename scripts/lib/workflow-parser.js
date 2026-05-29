// maestro-hook-version: 20250529.0
/**
 * workflow-parser.js — Maestro shared workflow state parser
 *
 * Path structure (YYYYMM.PATCH version-based):
 *   .planning/{version}/workflows/{slug}/           — workflow base
 *   .planning/{version}/workflows/{slug}/P##-{slug}/ — phase dir (no domain layer)
 *   .planning/{version}/workflows/{slug}/P##-{slug}/STATE.md (no P## prefix on files)
 *
 * Exports:
 *   readCurrentMilestone(planningDir) — parse STATE.md for current_milestone
 *   readWorkflowState(planningDir)    — parse workflow.md current phase info
 *   readMilestone(planningDir)        — parse STATE.md milestone version (GSD compat)
 *   scanCompletedPhases(planningDir)  — scan STATE.md files for COMPLETE status
 *   discoverWorkflows(planningDir)    — list workflow slugs under current version
 *   resolveWorkflowDir(planningDir, slug) — build workflow directory path
 *
 * Pure Node.js built-in modules. No npm dependencies.
 */

'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Read current_milestone from root STATE.md.
 * Falls back to scanning .planning/ for version directories (YYYYMM.N pattern).
 * @param {string} planningDir - absolute path to .planning/ directory
 * @returns {string|null} version string like "202505.0" or null
 */
function readCurrentMilestone(planningDir) {
  try {
    const statePath = path.join(planningDir, 'STATE.md');
    const raw = fs.readFileSync(statePath, 'utf8');
    const match = raw.match(/^current_milestone:\s*["']?(.+?)["']?\s*$/m);
    if (match) return match[1].trim();
  } catch { /* STATE.md missing */ }

  // Fallback: scan for version directories (YYYYMM.N pattern)
  try {
    const entries = fs.readdirSync(planningDir, { withFileTypes: true });
    const versionDirs = entries
      .filter(e => e.isDirectory() && /^\d{6}\.\d+$/.test(e.name))
      .sort()
      .reverse();
    return versionDirs.length > 0 ? versionDirs[0].name : null;
  } catch {
    return null;
  }
}

/**
 * List all workflow slugs under .planning/{version}/workflows/.
 * @param {string} planningDir - absolute path to .planning/ directory
 * @returns {string[]} sorted array of workflow slugs
 */
function discoverWorkflows(planningDir) {
  try {
    const milestone = readCurrentMilestone(planningDir);
    if (!milestone) return [];
    const workflowsDir = path.join(planningDir, milestone, 'workflows');
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
  const milestone = readCurrentMilestone(planningDir);
  if (milestone) {
    return path.join(planningDir, milestone, 'workflows', slug);
  }
  // Fallback for projects without version structure
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
 * Supports version-based, old (workflows/), and legacy paths.
 */
function readWorkflowState(planningDir) {
  try {
    // Try version-based path
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

    // Fallback: old .planning/workflows/{slug}/
    const oldWorkflowsDir = path.join(planningDir, 'workflows');
    try {
      const entries = fs.readdirSync(oldWorkflowsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const wfPath = path.join(oldWorkflowsDir, entry.name, 'workflow.md');
        try {
          const raw = fs.readFileSync(wfPath, 'utf8');
          const state = parseWorkflowMd(raw);
          if (state) {
            state.slug = state.slug || entry.name;
            return state;
          }
        } catch { continue; }
      }
    } catch { /* no old workflows dir */ }

    // Fallback: legacy .planning/workflow.md
    const workflowPath = path.join(planningDir, 'workflow.md');
    const raw = fs.readFileSync(workflowPath, 'utf8');
    return parseWorkflowMd(raw);
  } catch {
    return null;
  }
}

/**
 * Read STATE.md milestone field from planningDir (GSD compatibility).
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
 * Scan STATE.md files for COMPLETE status.
 * Supports version-based, old (workflows/{slug}/phases/{domain}/), and legacy paths.
 */
function scanCompletedPhases(planningDir) {
  const completed = [];

  // Version-based path: .planning/{version}/workflows/{slug}/P##-{slug}/STATE.md
  const workflows = discoverWorkflows(planningDir);
  if (workflows.length > 0) {
    for (const slug of workflows) {
      const wfDir = resolveWorkflowDir(planningDir, slug);
      scanPhaseDirs(wfDir, completed);
    }
  }

  // Fallback: old .planning/workflows/{slug}/phases/{domain}/P##-*/STATE.md
  if (completed.length === 0) {
    const oldWorkflowsDir = path.join(planningDir, 'workflows');
    try {
      const entries = fs.readdirSync(oldWorkflowsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const phasesDir = path.join(oldWorkflowsDir, entry.name, 'phases');
        scanLegacyDomainDirs(phasesDir, completed);
      }
    } catch { /* no old workflows dir */ }
  }

  // Fallback: legacy .planning/phases/P*-STATE.md
  if (completed.length === 0) {
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
  }

  completed.sort((a, b) => parseInt(a.substring(1), 10) - parseInt(b.substring(1), 10));
  return completed;
}

/**
 * Scan phase directories directly (no domain layer).
 * Looks for P##-{slug}/STATE.md in the given directory.
 */
function scanPhaseDirs(parentDir, completed) {
  try {
    const entries = fs.readdirSync(parentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const stateMatch = entry.name.match(/^(P\d+)-/);
      if (!stateMatch) continue;

      // P15 uses frontend/backend subdirectories
      if (entry.name.startsWith('P15-')) {
        for (const subDir of ['frontend', 'backend']) {
          const subPath = path.join(parentDir, entry.name, subDir);
          try {
            const content = fs.readFileSync(path.join(subPath, 'STATE.md'), 'utf8');
            if (/- \*\*status\*\*:\s*COMPLETE/.test(content)) {
              completed.push(stateMatch[1]);
              break;
            }
          } catch { /* skip */ }
        }
      } else {
        try {
          const content = fs.readFileSync(path.join(parentDir, entry.name, 'STATE.md'), 'utf8');
          if (/- \*\*status\*\*:\s*COMPLETE/.test(content)) {
            completed.push(stateMatch[1]);
          }
        } catch { /* skip */ }
      }
    }
  } catch { /* dir missing */ }
}

/**
 * Scan legacy domain-based phase directories.
 * Kept for backward compatibility with old .planning/workflows/{slug}/phases/{domain}/ structure.
 */
function scanLegacyDomainDirs(phasesDir, completed) {
  const DOMAIN_DIRS = ['product-manager', 'architect', 'development', 'test-engineer', 'ops-engineer'];
  for (const domain of DOMAIN_DIRS) {
    const domainDir = path.join(phasesDir, domain);
    try {
      const entries = fs.readdirSync(domainDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const stateMatch = entry.name.match(/^(P\d+)-/);
        if (!stateMatch) continue;

        if (domain === 'development' && entry.name.startsWith('P15-')) {
          for (const subDir of ['frontend', 'backend']) {
            const subPath = path.join(domainDir, entry.name, subDir);
            try {
              const subStatePath = path.join(subPath, 'P15-STATE.md');
              const content = fs.readFileSync(subStatePath, 'utf8');
              if (/- \*\*status\*\*:\s*COMPLETE/.test(content)) {
                completed.push(stateMatch[1]);
                break;
              }
            } catch {
              try {
                const content = fs.readFileSync(path.join(subPath, 'STATE.md'), 'utf8');
                if (/- \*\*status\*\*:\s*COMPLETE/.test(content)) {
                  completed.push(stateMatch[1]);
                  break;
                }
              } catch { /* skip */ }
            }
          }
        } else {
          try {
            const statePath = path.join(domainDir, entry.name, `${stateMatch[1]}-STATE.md`);
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

module.exports = { readCurrentMilestone, readWorkflowState, readMilestone, scanCompletedPhases, discoverWorkflows, resolveWorkflowDir };
