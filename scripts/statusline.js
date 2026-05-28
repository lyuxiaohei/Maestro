// maestro-hook-version: 0.53.0
/**
 * statusline.js — Maestro statusline bridge script
 *
 * Writes current workflow status to .planning/.statusline as a single line.
 * Called by session-state.js and context-monitor.js via child_process.execFile.
 *
 * Usage: node statusline.js <phase_index> <total_phases> <phase_name> <status> <completed_list>
 * Example: node statusline.js 06 18 原型设计 IN_PROGRESS P01-P05
 *
 * Output: .planning/.statusline contains: P06/18 原型设计 IN_PROGRESS | 完成: P01-P05
 *
 * Exit codes:
 *   0 — always (fail-open, non-critical bridge file)
 *
 * Pure Node.js built-in modules. No npm dependencies.
 */

'use strict';

const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);

// Need exactly 5 arguments
if (args.length < 5) process.exit(0);

const [phaseIndex, totalPhases, phaseName, status, completedList] = args;

const statuslinePath = path.join(__dirname, '..', '.planning', '.statusline');
const line = `P${phaseIndex}/${totalPhases} ${phaseName} ${status} | 完成: ${completedList}`;

try {
  fs.writeFileSync(statuslinePath, line, 'utf8');
} catch {
  // Silently ignore write errors — non-critical fire-and-forget bridge file
}

process.exit(0);
