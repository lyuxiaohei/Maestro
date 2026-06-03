// maestro-hook-version: 202606.0
/**
 * stale-check.js — Maestro PreToolUse Bash stale commit detector hook
 *
 * Detects when remote branches have commits not present locally before
 * a git commit is made. Issues an advisory reminder to pull --rebase
 * to avoid merge conflicts.
 *
 * Advisory only (exit 0) — never blocks tool calls.
 * Default: disabled. Enable via config.json hooks.stale_check: true.
 *
 * Hook protocol: reads JSON from stdin, writes JSON to stdout.
 * stdin timeout: 5 seconds.
 *
 * Pure Node.js built-in modules. No npm dependencies.
 */

'use strict';

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const STDIN_TIMEOUT_MS = 5000;
const FETCH_TIMEOUT_MS = 10000;
const DEDUP_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const TIMESTAMP_FILE = '.stale-check-timestamp';

// --- Stdin reader ---

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

// --- Config reader ---

function getConfig() {
  try {
    const configPath = path.join(__dirname, '..', '.planning', 'config.json');
    const raw = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// --- Dedup timestamp ---

function getTimestampPath() {
  return path.join(__dirname, '..', '.planning', TIMESTAMP_FILE);
}

/**
 * Check if we already warned within the dedup interval.
 * Returns true if we should skip (recently warned).
 */
function shouldSkipByTimestamp() {
  try {
    const tsPath = getTimestampPath();
    const raw = fs.readFileSync(tsPath, 'utf8').trim();
    const lastTime = parseInt(raw, 10);
    if (isNaN(lastTime)) return false;
    return (Date.now() - lastTime) < DEDUP_INTERVAL_MS;
  } catch {
    return false;
  }
}

/**
 * Record the current time as last warning timestamp.
 */
function recordTimestamp() {
  try {
    const tsPath = getTimestampPath();
    const dir = path.dirname(tsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(tsPath, String(Date.now()), 'utf8');
  } catch {
    // Fail open
  }
}

// --- Git operations ---

/**
 * Run git fetch origin silently.
 * Throws on error or timeout.
 */
function gitFetchOrigin() {
  execSync('git fetch origin', {
    timeout: FETCH_TIMEOUT_MS,
    stdio: 'pipe',
    encoding: 'utf8',
  });
}

/**
 * Get current branch name.
 */
function gitCurrentBranch() {
  return execSync('git rev-parse --abbrev-ref HEAD', {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

/**
 * Get commits on origin/branch that are not on HEAD.
 * Returns array of one-line commit summaries, or empty array.
 */
function gitRemoteNewCommits(branch) {
  const output = execSync(
    `git log HEAD..origin/${branch} --oneline`,
    { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
  ).trim();
  if (!output) return [];
  return output.split('\n');
}

// --- Main ---

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
  if (!(config.hooks && config.hooks.stale_check === true)) {
    process.exit(0);
  }

  // 4. Only intercept Bash tool
  const toolName = input.tool_name || '';
  if (toolName !== 'Bash') process.exit(0);

  // 5. Check if it's a git commit command
  const command = (input.tool_input && input.tool_input.command) || '';
  if (!/\bgit\s+commit\b/.test(command)) process.exit(0);

  // 6. Dedup: skip if we warned within 30 minutes
  if (shouldSkipByTimestamp()) process.exit(0);

  // 7. Fetch remote (with 10s timeout)
  try {
    gitFetchOrigin();
  } catch {
    // Network error, timeout, or no remote — fail open
    process.exit(0);
  }

  // 8. Get current branch
  let branch;
  try {
    branch = gitCurrentBranch();
  } catch {
    process.exit(0);
  }

  // 9. Check for remote new commits
  let newCommits;
  try {
    newCommits = gitRemoteNewCommits(branch);
  } catch {
    process.exit(0);
  }

  // 10. No new commits — silent pass
  if (newCommits.length === 0) process.exit(0);

  // 11. Record timestamp for dedup
  recordTimestamp();

  // 12. Build Chinese advisory message
  const commitLines = newCommits.map(c => `    - ${c}`).join('\n');
  const msg = [
    `[Stale Check] 远程仓库有 ${newCommits.length} 个新提交未拉取（其他协作者已推送了新代码）:`,
    commitLines,
    '建议先拉取远程更新再提交，避免合并冲突。操作方式：git pull --rebase',
    '（pull = 拉取远程代码合并到本地；rebase = 把你的提交放在最新代码之上，保持提交历史整洁）',
  ].join('\n');

  const output = JSON.stringify({
    decision: 'allow',
    reason: '',
    additionalContext: msg,
  });
  process.stdout.write(output);
  process.exit(0);
}

main().catch(() => process.exit(0));
