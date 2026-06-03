// maestro-hook-version: 202606.0
/**
 * session-state.js — Maestro SessionStart hook
 *
 * Reads workflow state and injects it as additionalContext when a session starts.
 * Also calls statusline.js via execFile to update the bridge file.
 *
 * Session identity: injects CLAUDE_SESSION_ID and creates .session.json lock files.
 * Safe Resume Gate: checks STATE.md/OUTPUT.md consistency on resume.
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
const SESSION_LOCK_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

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

/**
 * Inject meta-rules from gate-rules.md into additionalContext.
 * Reads GATE-01~05 summaries and wraps in <GATE_RULES> tags.
 * Returns null if file not found or on error.
 * @param {string} projectRoot
 * @returns {string|null}
 */
function injectMetaRules(projectRoot) {
  try {
    const gateRulesPath = path.join(projectRoot, 'skills', 'workflow', 'references', 'gate-rules.md');
    const content = fs.readFileSync(gateRulesPath, 'utf8');

    // Extract GATE-XX rule_name and core constraint (first 2 lines after header)
    const gates = [];
    const regex = /## (GATE-\d+):.*?\n\n-\s+\*\*rule_name\*\*:\s*(.+)/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const gateId = match[1];
      const ruleName = match[2].trim();

      // Extract one-line constraint from check_procedure
      const sectionStart = match.index;
      const nextSection = content.indexOf('## GATE-', sectionStart + 10);
      const section = nextSection > 0 ? content.substring(sectionStart, nextSection) : content.substring(sectionStart);

      let constraint = '';
      const constraintMatch = section.match(/核心约束[：:]\s*(.+)/);
      if (constraintMatch) {
        constraint = constraintMatch[1].trim();
      }

      gates.push(`- ${gateId} ${ruleName}${constraint ? ': ' + constraint : ''}`);
    }

    if (gates.length === 0) return null;

    const result = `<GATE_RULES>\nMaestro 铁律门禁规则（本会话全程有效）:\n${gates.join('\n')}\n</GATE_RULES>`;

    // Cap at 500 characters
    return result.length > 500 ? result.substring(0, 497) + '...' : result;
  } catch {
    return null;
  }
}

/**
 * Get TTY identity string for session identification.
 * @returns {string}
 */
function getTtyIdentity() {
  try {
    const term = process.env.TERM || 'unknown';
    const cols = process.stdout.columns || 0;
    const rows = process.stdout.rows || 0;
    return `${term}-${cols}x${rows}`;
  } catch {
    return 'unknown';
  }
}

/**
 * Get session identifier with source priority (CLD-02).
 * Priority: CLAUDE_SESSION_ID env var > TTY identity
 * @returns {{ sessionId: string, source: string }}
 */
function getSessionId() {
  // Priority 1: CLAUDE_SESSION_ID environment variable
  if (process.env.CLAUDE_SESSION_ID) {
    return { sessionId: process.env.CLAUDE_SESSION_ID, source: 'env' };
  }
  // Priority 2: TTY identity
  return { sessionId: getTtyIdentity(), source: 'tty' };
}

/**
 * Write session lock file for a workflow.
 * Uses file-lock.js withLock for safe concurrent writes.
 * @param {string} planningDir
 * @param {string} slug
 * @param {string} phaseIndex
 * @param {{ sessionId: string, source: string }} session
 */
function writeSessionLock(planningDir, slug, phaseIndex, session) {
  try {
    const { writeSessionLock: wpWriteLock } = require('./lib/workflow-parser');
    wpWriteLock(planningDir, slug, {
      sessionId: session.sessionId,
      source: session.source,
      phaseIndex: phaseIndex || null,
      lockedAt: new Date().toISOString(),
      pid: process.pid,
      tty: getTtyIdentity(),
    });
  } catch { /* advisory — ignore errors */ }
}

/**
 * Check for session conflict on a workflow.
 * @param {string} planningDir
 * @param {string} slug
 * @param {{ sessionId: string, source: string }} currentSession
 * @returns {{ conflict: boolean, existingSession: object|null, message: string }}
 */
function checkSessionConflict(planningDir, slug, currentSession) {
  try {
    const { readSessionLock } = require('./lib/workflow-parser');
    const existing = readSessionLock(planningDir, slug);
    if (!existing) return { conflict: false, existingSession: null, message: '' };

    // Same session — no conflict
    if (existing.sessionId === currentSession.sessionId) {
      return { conflict: false, existingSession: existing, message: '' };
    }

    // Check if lock is expired (30 minutes)
    const lockedAt = new Date(existing.lockedAt).getTime();
    const now = Date.now();
    if (now - lockedAt > SESSION_LOCK_TIMEOUT_MS) {
      return { conflict: false, existingSession: existing, message: '' };
    }

    // Different active session — conflict detected
    const message = `[多会话警告] 工作流 [${slug}] 正被另一会话占用 (PID: ${existing.pid}, 锁定时间: ${existing.lockedAt})。请确认是否有其他 Claude Code 实例在操作此工作流。`;
    return { conflict: true, existingSession: existing, message };
  } catch {
    return { conflict: false, existingSession: null, message: '' };
  }
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
  const {
    readWorkflowState, readMilestone, scanCompletedPhases,
    discoverWorkflows, safeResumeCheck,
  } = require('./lib/workflow-parser');

  // 4. Get session identity
  const session = getSessionId();

  // 5. Get planning directory
  const planningDir = getPlanningDir();

  // 6. Read workflow state
  const workflowState = readWorkflowState(planningDir);

  // 7. If workflow.md missing: output fallback (HOOK6-03)
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

  // 8. Read milestone version
  const milestone = readMilestone(planningDir);

  // 9. Scan completed phases
  const completed = scanCompletedPhases(planningDir);

  // 10. Build pure text summary
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

  // 11. Append session identity
  summary += ` | 会话: ${session.sessionId.substring(0, 32)} (${session.source})`;

  // 12. Write session lock for active workflow
  if (slug) {
    writeSessionLock(planningDir, slug, phaseIndex, session);
  }

  // 13. Check session conflicts for all active workflows
  const allSlugs = discoverWorkflows(planningDir);
  const conflictMessages = [];
  for (const wfSlug of allSlugs) {
    const conflict = checkSessionConflict(planningDir, wfSlug, session);
    if (conflict.conflict) {
      conflictMessages.push(conflict.message);
    }
  }

  // 14. Safe Resume Gate — check consistency when resuming
  if (slug && (status === 'IN_PROGRESS' || status === 'BLOCKED')) {
    try {
      const { resolveWorkflowDir } = require('./lib/workflow-parser');
      const wfDir = resolveWorkflowDir(planningDir, slug);
      const resumeCheck = safeResumeCheck(wfDir);
      if (resumeCheck.status !== 'consistent') {
        conflictMessages.push(
          `[Safe Resume Gate] 检测到状态不一致: ${resumeCheck.issues.join('; ')}. 建议: ${resumeCheck.suggestion}`
        );
      }
    } catch { /* advisory — ignore */ }
  }

  // Truncate to 2000 chars
  summary = summary.substring(0, 2000);

  // 15. Build additionalContext with optional warnings
  let additionalContext = summary;
  if (conflictMessages.length > 0) {
    additionalContext += '\n\n' + conflictMessages.join('\n');
    additionalContext = additionalContext.substring(0, 2000);
  }

  // 15.5. Inject meta-rules (P0-3)
  const projectRoot = path.resolve(__dirname, '..');
  const metaRules = injectMetaRules(projectRoot);
  if (metaRules) {
    additionalContext += '\n\n' + metaRules;
    additionalContext = additionalContext.substring(0, 2000);
  }

  // 16. Call updateStatusline (HOOK6-04)
  updateStatusline(phaseIndex, totalPhases, phaseName, status, completed, slug || null);

  // 17. Output JSON
  const output = JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext,
    },
  });
  process.stdout.write(output);

  process.exit(0);
}

main().catch(() => process.exit(0));
