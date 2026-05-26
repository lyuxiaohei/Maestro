// maestro-hook-version: 0.51.0
/**
 * validate-commit.js — Maestro PreToolUse Bash commit format validator hook
 *
 * Validates git commit messages follow Conventional Commits format with
 * Maestro P## scope support. Opt-in only (config.json hooks.commit_validation).
 *
 * Hook protocol: reads JSON from stdin, writes JSON to stdout.
 * stdin timeout: 5 seconds.
 *
 * Exit codes:
 *   0 = allow (valid message, editor mode, or hook disabled)
 *   2 = block (invalid commit format, output permissionDecision "deny")
 *
 * Pure Node.js built-in modules. No npm dependencies.
 */

'use strict';

const path = require('path');
const fs = require('fs');

const STDIN_TIMEOUT_MS = 5000;

const VALID_TYPES = [
  'feat', 'fix', 'docs', 'style', 'refactor',
  'perf', 'test', 'build', 'ci', 'chore', 'revert',
];

// --- Stdin reader (same pattern as prompt-guard.js) ---

function readStdin() {
  return new Promise((resolve, reject) => {
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

// --- Commit message extraction ---

function extractCommitMessage(command) {
  // Flag cluster pattern: handles -m, -am, -em, etc.
  const flagCluster = '[a-zA-Z]*m';

  // HEREDOC format: -m "$(cat <<'EOF'\n<msg>\nEOF\n)"
  const heredocMatch = command.match(new RegExp(`-${flagCluster}\\s+"?\\$\\(cat\\s+<<['"]?EOF['"]?\\s*\\n([\\s\\S]*?)\\nEOF[\\s\\S]*?\\)`));
  if (heredocMatch) return heredocMatch[1].trim();

  // Double-quoted: -m "message" or combined flags like -am "message"
  const doubleQuotedMatch = command.match(new RegExp(`-${flagCluster}\\s+"([^"]*)"`));
  if (doubleQuotedMatch) return doubleQuotedMatch[1].trim();

  // Single-quoted: -m 'message' or combined flags like -am 'message'
  const singleQuotedMatch = command.match(new RegExp(`-${flagCluster}\\s+'([^']*)'`));
  if (singleQuotedMatch) return singleQuotedMatch[1].trim();

  return null;
}

// --- Commit message validation ---

function isValidCommitMessage(msg) {
  if (!msg) return false;

  // Build regex from VALID_TYPES
  const typeGroup = VALID_TYPES.join('|');
  const regex = new RegExp(`^(${typeGroup})(?:\\(([^)]+)\\))?:\\s+.+`);

  return regex.test(msg);
}

// --- Deny output ---

function denyCommit(msg) {
  const truncated = msg.length > 50 ? msg.substring(0, 50) + '...' : msg;
  const reason = `Maestro 提交校验: 消息格式不符合 Conventional Commits。期望: type(scope): description。实际: ${truncated}`;

  const output = JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  });
  process.stdout.write(output);
  process.exit(2);
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

  // 3. Check opt-in config
  const config = getConfig();
  if (!(config.hooks && config.hooks.commit_validation === true)) {
    process.exit(0);
  }

  // 4. Only intercept Bash tool
  const toolName = input.tool_name || '';
  if (toolName !== 'Bash') process.exit(0);

  // 5. Check if it's a git commit command
  const command = (input.tool_input && input.tool_input.command) || '';
  if (!/\bgit\s+commit\b/.test(command)) process.exit(0);

  // 6. Check for -m flag (editor mode has no -m)
  // Handles both standalone -m and combined flags like -am, -em, etc.
  if (!/-[a-zA-Z]*m\b/.test(command)) process.exit(0);

  // 7. Extract commit message
  const msg = extractCommitMessage(command);

  // 8. If can't extract, fail open
  if (msg === null) process.exit(0);

  // 9. Validate against Conventional Commits
  if (isValidCommitMessage(msg)) {
    process.exit(0);
  }

  // 10. Block invalid commit
  denyCommit(msg);
}

main().catch(() => process.exit(0));
