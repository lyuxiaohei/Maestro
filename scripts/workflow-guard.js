// maestro-hook-version: 202606.0
/**
 * workflow-guard.js — Maestro PreToolUse Write|Edit workflow awareness hook
 *
 * Detects file edits outside active workflows and injects a soft reminder
 * suggesting the user use workflow commands to manage changes.
 *
 * Advisory only (exit 0) — never blocks tool calls.
 * Default: disabled. Enable via config.json hooks.workflow_guard: true.
 * Sub-agents (session_type === 'task') are exempt from reminders.
 *
 * Hook protocol: reads JSON from stdin, writes JSON to stdout.
 * stdin timeout: 5 seconds.
 *
 * Pure Node.js built-in modules. No npm dependencies.
 */

'use strict';

const path = require('path');
const fs = require('fs');

const STDIN_TIMEOUT_MS = 5000;

// Whitelist: files/directories that are always allowed without reminder
const WHITELIST_PATTERNS = [
  /^\.planning\//,              // .planning/ directory
  /^\.claude\//,                // .claude/ directory
  /^\.gitignore$/,
  /^CLAUDE\.md$/i,
  /^README\.md$/i,
  /^settings\.json$/,
  /^package\.json$/,
  /^tsconfig\.json$/,
  /^[^/]+\.config\.js$/,       // top-level *.config.js files
  /^[^/]+\.config\.mjs$/,      // top-level *.config.mjs files
  /^[^/]+\.config\.cjs$/,      // top-level *.config.cjs files
];

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
 * Check if a file path (relative to project root) matches the whitelist.
 * @param {string} filePath - absolute or relative path
 * @returns {boolean}
 */
function isWhitelisted(filePath) {
  // Normalize to forward slashes and make relative to project root
  const normalized = filePath.replace(/\\/g, '/');
  // Strip leading ./ or project root prefix — we want relative path from project root
  const projectRoot = path.join(__dirname, '..').replace(/\\/g, '/').replace(/\/$/, '');
  let relative = normalized;
  if (normalized.startsWith(projectRoot + '/')) {
    relative = normalized.substring(projectRoot.length + 1);
  } else if (normalized.startsWith('./')) {
    relative = normalized.substring(2);
  }

  for (const pattern of WHITELIST_PATTERNS) {
    if (pattern.test(relative)) return true;
  }
  return false;
}

/**
 * Discover active workflows by scanning workflow.md files for status: active.
 * @param {string} planningDir - absolute path to .planning/ directory
 * @returns {string[]} array of active workflow slugs
 */
function findActiveWorkflows(planningDir) {
  try {
    const { discoverWorkflows, readCurrentMilestone, resolveWorkflowDir } = require('./lib/workflow-parser');
    const slugs = discoverWorkflows(planningDir);
    const active = [];

    for (const slug of slugs) {
      const wfDir = resolveWorkflowDir(planningDir, slug);
      const wfPath = path.join(wfDir, 'workflow.md');
      try {
        const content = fs.readFileSync(wfPath, 'utf8');
        if (/^status:\s*active\b/m.test(content)) {
          active.push(slug);
        }
      } catch {
        // workflow.md not readable, skip
      }
    }

    return active;
  } catch {
    return [];
  }
}

function extractFilePath(input) {
  const toolInput = input.tool_input || {};
  return toolInput.file_path || '';
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

  // 3. Config gate — default false, must be explicitly enabled
  const config = getConfig();
  if (!config.hooks || config.hooks.workflow_guard !== true) {
    process.exit(0);
  }

  // 4. Sub-agent exemption — skip if session_type is 'task'
  if (input.session_type === 'task') {
    process.exit(0);
  }

  // 5. Extract target file path
  const filePath = extractFilePath(input);
  if (!filePath) process.exit(0);

  // 6. Whitelist check
  if (isWhitelisted(filePath)) process.exit(0);

  // 7. Discover active workflows
  const planningDir = path.join(__dirname, '..', '.planning');
  const activeWorkflows = findActiveWorkflows(planningDir);

  // 8. If no active workflows, no reminder needed
  if (activeWorkflows.length === 0) process.exit(0);

  // 9. Inject reminder
  const slugs = activeWorkflows.join(', ');
  const msg = `Maestro: 检测到活跃工作流 [${slugs}]，建议使用 /maestro-workflow-lite 或 /maestro-workflow 管理变更。当前编辑的文件不在白名单中。`;

  const output = JSON.stringify({
    decision: 'allow',
    reason: '',
    additionalContext: msg.substring(0, 2000),
  });
  process.stdout.write(output);
  process.exit(0);
}

main().catch(() => process.exit(0));
