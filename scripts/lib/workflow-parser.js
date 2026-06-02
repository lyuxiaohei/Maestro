// maestro-hook-version: 202606.0
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

/**
 * Read a single phase STATE.md status field.
 * @param {string} phaseDir - absolute path to phase directory (e.g. P01-requirement-research/)
 * @returns {{ phaseIndex: string, status: string, version: string, updatedAt: string }|null}
 */
function readPhaseStatus(phaseDir) {
  try {
    const statePath = path.join(phaseDir, 'STATE.md');
    const raw = fs.readFileSync(statePath, 'utf8');

    const indexMatch = raw.match(/\*\*phase_index\*\*:\s*(\d+)/);
    const statusMatch = raw.match(/\*\*status\*\*:\s*(\S+)/);
    const versionMatch = raw.match(/\*\*version\*\*:\s*(\S+)/);
    const updatedMatch = raw.match(/\*\*(?:updated_at|completed_at)\*\*:\s*(.+)/);

    if (!indexMatch || !statusMatch) return null;

    return {
      phaseIndex: indexMatch[1],
      status: statusMatch[1],
      version: versionMatch ? versionMatch[1] : null,
      updatedAt: updatedMatch ? updatedMatch[1].trim() : null,
    };
  } catch {
    return null;
  }
}

/**
 * Scan all phases in a workflow directory and return status for each.
 * @param {string} wfDir - absolute path to workflow directory
 * @returns {Array<{ phaseDir: string, phasePrefix: string, status: object|null }>}
 */
function scanAllPhaseStatuses(wfDir) {
  const results = [];
  try {
    const entries = fs.readdirSync(wfDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const prefixMatch = entry.name.match(/^(P\d+)-/);
      if (!prefixMatch) continue;
      const phaseDir = path.join(wfDir, entry.name);
      results.push({
        phaseDir,
        phasePrefix: prefixMatch[1],
        status: readPhaseStatus(phaseDir),
      });
    }
  } catch { /* dir missing */ }
  return results;
}

/**
 * Calculate progress for a workflow by scanning all STATE.md files.
 * @param {string} planningDir - absolute path to .planning/ directory
 * @param {string} slug - workflow slug
 * @returns {{ total: number, completed: string[], inProgress: string[], skipped: string[], notStarted: string[], completionRate: string }}
 */
function calculateProgress(planningDir, slug) {
  const empty = { total: 0, completed: [], inProgress: [], skipped: [], notStarted: [], completionRate: '0%' };

  const wfDir = resolveWorkflowDir(planningDir, slug);

  // Read workflow.md to get total phase count
  let total = 0;
  try {
    const wfPath = path.join(wfDir, 'workflow.md');
    const raw = fs.readFileSync(wfPath, 'utf8');
    const lines = raw.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (/^\|\s*\d+\s*\|/.test(trimmed)) {
        total++;
      }
    }
  } catch {
    // If workflow.md missing, count phase directories instead
    const phaseStatuses = scanAllPhaseStatuses(wfDir);
    total = phaseStatuses.length;
  }

  if (total === 0) return empty;

  const completed = [];
  const inProgress = [];
  const skipped = [];
  const notStarted = [];

  const phaseStatuses = scanAllPhaseStatuses(wfDir);
  for (const { phasePrefix, status } of phaseStatuses) {
    if (!status) {
      notStarted.push(phasePrefix);
      continue;
    }
    switch (status.status) {
      case 'COMPLETE':
        completed.push(phasePrefix);
        break;
      case 'IN_PROGRESS':
        inProgress.push(phasePrefix);
        break;
      case 'SKIPPED':
        skipped.push(phasePrefix);
        break;
      case 'BLOCKED':
        inProgress.push(phasePrefix); // treat blocked as in-progress
        break;
      default:
        notStarted.push(phasePrefix);
        break;
    }
  }

  // Pad notStarted if total exceeds discovered phases
  const discovered = completed.length + inProgress.length + skipped.length + notStarted.length;
  if (total > discovered) {
    for (let i = discovered; i < total; i++) {
      notStarted.push('P' + String(i + 1).padStart(2, '0'));
    }
  }

  const rate = total > 0 ? Math.round((completed.length / total) * 100) : 0;
  return {
    total,
    completed,
    inProgress,
    skipped,
    notStarted,
    completionRate: rate + '%',
  };
}

/**
 * Read session lock from a workflow directory.
 * @param {string} planningDir - absolute path to .planning/ directory
 * @param {string} slug - workflow slug
 * @returns {object|null} session lock data or null
 */
function readSessionLock(planningDir, slug) {
  try {
    const wfDir = resolveWorkflowDir(planningDir, slug);
    const lockPath = path.join(wfDir, '.session.json');
    const raw = fs.readFileSync(lockPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Write session lock to a workflow directory.
 * @param {string} planningDir - absolute path to .planning/ directory
 * @param {string} slug - workflow slug
 * @param {object} data - session lock data to write
 * @returns {boolean} true if written successfully
 */
function writeSessionLock(planningDir, slug, data) {
  try {
    const wfDir = resolveWorkflowDir(planningDir, slug);
    // Ensure directory exists
    fs.mkdirSync(wfDir, { recursive: true });
    const lockPath = path.join(wfDir, '.session.json');
    // Use withLock if available, otherwise direct write
    try {
      const { withLock } = require('./file-lock');
      withLock(lockPath + '.wlock', () => {
        fs.writeFileSync(lockPath, JSON.stringify(data, null, 2) + '\n');
      });
    } catch {
      // Fallback: direct write (file-lock not available)
      fs.writeFileSync(lockPath, JSON.stringify(data, null, 2) + '\n');
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Safe Resume Check — compare git log with STATE.md/OUTPUT.md for inconsistencies.
 * @param {string} workflowBase - absolute path to workflow base directory
 * @returns {{ status: string, issues: string[], suggestion: string }}
 */
function safeResumeCheck(workflowBase) {
  const { execSync } = require('child_process');
  const issues = [];

  // 1. Get recent git commits affecting .planning/
  let recentCommits = [];
  try {
    const planningDir = path.resolve(workflowBase, '..', '..');
    const output = execSync(
      `git log --oneline -20 -- ".planning/"`,
      { cwd: planningDir, encoding: 'utf8', timeout: 5000 }
    ).trim();
    if (output) {
      recentCommits = output.split('\n').filter(Boolean);
    }
  } catch {
    // Git not available or no commits — not an error
  }

  // 2. Scan all phase directories for STATE.md and OUTPUT.md
  const phaseEntries = [];
  try {
    const entries = fs.readdirSync(workflowBase, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const prefixMatch = entry.name.match(/^P(\d+)-/);
      if (!prefixMatch) continue;

      const phaseDir = path.join(workflowBase, entry.name);
      const phaseIndex = prefixMatch[1];
      let stateData = null;
      let outputExists = false;
      let outputMtime = 0;
      let stateMtime = 0;

      try {
        const statePath = path.join(phaseDir, 'STATE.md');
        const raw = fs.readFileSync(statePath, 'utf8');
        stateMtime = fs.statSync(statePath).mtimeMs;

        const statusMatch = raw.match(/\*\*status\*\*:\s*(\S+)/);
        const completedMatch = raw.match(/\*\*completed_at\*\*:\s*(.+)/);
        stateData = {
          status: statusMatch ? statusMatch[1] : null,
          completedAt: completedMatch ? completedMatch[1].trim() : null,
        };
      } catch { /* STATE.md missing */ }

      try {
        const outputPath = path.join(phaseDir, 'OUTPUT.md');
        const stat = fs.statSync(outputPath);
        outputExists = true;
        outputMtime = stat.mtimeMs;
      } catch { /* OUTPUT.md missing */ }

      phaseEntries.push({ phaseIndex, phaseDir, stateData, outputExists, outputMtime, stateMtime });
    }
  } catch { /* workflow dir missing */ }

  // 3. Check for inconsistencies
  for (const entry of phaseEntries) {
    if (!entry.stateData) continue;

    // STATE.md marked COMPLETE but OUTPUT.md does not exist
    if (entry.stateData.status === 'COMPLETE' && !entry.outputExists) {
      issues.push(`P${entry.phaseIndex}: STATE.md marked COMPLETE but OUTPUT.md is missing`);
    }

    // OUTPUT.md exists and is newer than STATE.md
    if (entry.outputExists && entry.outputMtime > entry.stateMtime && entry.stateData.status !== 'COMPLETE') {
      issues.push(`P${entry.phaseIndex}: OUTPUT.md is newer than STATE.md (possible incomplete state update)`);
    }
  }

  // 4. Check for stale_state: commits touching phase files but STATE.md not updated
  if (recentCommits.length > 0) {
    for (const entry of phaseEntries) {
      if (!entry.stateData) continue;
      if (entry.stateData.status === 'IN_PROGRESS' || entry.stateData.status === 'BLOCKED') {
        // Phase was in progress — check if there have been recent commits to it
        try {
          const planningDir = path.resolve(workflowBase, '..', '..');
          const phaseDirRelative = path.relative(planningDir, entry.phaseDir).replace(/\\/g, '/');
          const recentPhaseCommits = execSync(
            `git log --oneline -5 -- "${phaseDirRelative}/"`,
            { cwd: planningDir, encoding: 'utf8', timeout: 5000 }
          ).trim();
          if (recentPhaseCommits && entry.stateData.status === 'IN_PROGRESS') {
            // There are commits but state is still IN_PROGRESS — might be ok (still working)
          }
        } catch { /* git check failed, skip */ }
      }
    }
  }

  if (issues.length === 0) {
    return { status: 'consistent', issues: [], suggestion: '' };
  }

  const suggestion = issues.some(i => i.includes('missing'))
    ? '检查缺失的 OUTPUT.md 文件，确认阶段是否真正完成。如阶段未完成，将 STATE.md status 改回 IN_PROGRESS。'
    : '检查 STATE.md 与 OUTPUT.md 的时间戳差异，确认最新状态。';

  return { status: 'inconsistent', issues, suggestion };
}

module.exports = {
  readCurrentMilestone, readWorkflowState, readMilestone, scanCompletedPhases,
  discoverWorkflows, resolveWorkflowDir, readPhaseStatus, calculateProgress,
  readSessionLock, writeSessionLock, safeResumeCheck,
};
