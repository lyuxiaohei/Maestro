// maestro-hook-version: 0.51.0
/**
 * workflow-parser.js — Maestro shared workflow state parser
 *
 * Exports:
 *   readWorkflowState(planningDir)   — parse workflow.md current phase info
 *   readMilestone(planningDir)       — parse STATE.md milestone version
 *   scanCompletedPhases(planningDir) — scan P*-STATE.md files for COMPLETE status
 *
 * Pure Node.js built-in modules. No npm dependencies.
 */

'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Read workflow.md from planningDir and extract current phase info.
 * @param {string} planningDir - absolute path to .planning/ directory
 * @returns {{ phaseIndex: string, phaseName: string, status: string, totalPhases: number }|null}
 */
function readWorkflowState(planningDir) {
  try {
    const workflowPath = path.join(planningDir, 'workflow.md');
    const raw = fs.readFileSync(workflowPath, 'utf8');

    // Extract phase_index
    const indexMatch = raw.match(/\*\*phase_index\*\*:\s*(\d+)/);
    if (!indexMatch) return null;
    const phaseIndex = indexMatch[1];

    // Extract phase_name
    const nameMatch = raw.match(/\*\*phase_name\*\*:\s*(.+)/);
    const phaseName = nameMatch ? nameMatch[1].trim() : '';

    // Extract status
    const statusMatch = raw.match(/\*\*status\*\*:\s*(.+)/);
    const status = statusMatch ? statusMatch[1].trim() : '';

    // Count total phases from 阶段总览 table rows
    // Table format: | # | 阶段名称 | 状态 | 版本 |
    // Skip header line (starts with | #) and separator line (starts with |---)
    const lines = raw.split('\n');
    let totalPhases = 0;
    for (const line of lines) {
      const trimmed = line.trim();
      // Match data rows: | 01 | ... | (starts with | and a digit)
      if (/^\|\s*\d+\s*\|/.test(trimmed)) {
        totalPhases++;
      }
    }

    return { phaseIndex, phaseName, status, totalPhases };
  } catch {
    return null;
  }
}

/**
 * Read STATE.md milestone field from planningDir.
 * @param {string} planningDir - absolute path to .planning/ directory
 * @returns {string|null} milestone string (e.g., "v0.7") or null if missing
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
 * Scan P*-STATE.md files in planningDir/phases/ for COMPLETE status.
 * @param {string} planningDir - absolute path to .planning/ directory
 * @returns {string[]} sorted array of completed phase IDs (e.g., ['P01', 'P14'])
 */
function scanCompletedPhases(planningDir) {
  try {
    const phasesDir = path.join(planningDir, 'phases');
    const entries = fs.readdirSync(phasesDir);
    const completed = [];

    for (const entry of entries) {
      const match = entry.match(/^(P\d+)-STATE\.md$/);
      if (!match) continue;

      try {
        const filePath = path.join(phasesDir, entry);
        const content = fs.readFileSync(filePath, 'utf8');
        if (/- \*\*status\*\*:\s*COMPLETE/.test(content)) {
          completed.push(match[1]);
        }
      } catch {
        // Skip unreadable files
      }
    }

    // Sort by numeric index
    completed.sort((a, b) => {
      const numA = parseInt(a.substring(1), 10);
      const numB = parseInt(b.substring(1), 10);
      return numA - numB;
    });

    return completed;
  } catch {
    return [];
  }
}

module.exports = { readWorkflowState, readMilestone, scanCompletedPhases };
