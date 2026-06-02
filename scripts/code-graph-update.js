// maestro-hook-version: 202606.0
/**
 * code-graph-update.js — Maestro PostToolUse Write|Edit code index incremental update hook
 *
 * Auto-updates .planning/code-index.json when source files are written or edited.
 * Runs code-graph-scan.js in incremental mode for the changed file.
 *
 * Advisory only (exit 0) — never blocks tool calls.
 * Always-on: simply does nothing if .planning/code-index.json doesn't exist
 * (first time requires manual `node scripts/code-graph-scan.js . --full`).
 *
 * Hook protocol: reads JSON from stdin, all output to stderr.
 * stdin timeout: 5 seconds.
 *
 * Pure Node.js built-in modules. No npm dependencies.
 */

'use strict';

const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');

const STDIN_TIMEOUT_MS = 5000;

// Source file extensions to monitor
const SOURCE_EXTENSIONS = new Set(['.js', '.ts', '.jsx', '.tsx', '.vue', '.py']);

// Directory patterns to skip (checked as substrings in normalized path)
const SKIP_PATTERNS = [
  'node_modules',
  '.planning',
  'dist',
  'build',
  '.claude',
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

/**
 * Normalize a file path to forward slashes for consistent checking.
 */
function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

/**
 * Gate 2: Check if file extension is a source file we index.
 */
function isSourceFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return SOURCE_EXTENSIONS.has(ext);
}

/**
 * Gate 3: Check if file path is in an excluded directory.
 */
function isExcludedPath(filePath) {
  const normalized = normalizePath(filePath);
  for (const pattern of SKIP_PATTERNS) {
    if (normalized.includes('/' + pattern + '/') || normalized.includes('/' + pattern)) {
      return true;
    }
  }
  // Also check Windows-style path separators
  const winNormalized = filePath.replace(/\//g, '\\');
  for (const pattern of SKIP_PATTERNS) {
    if (winNormalized.includes('\\' + pattern + '\\') || winNormalized.includes('\\' + pattern)) {
      return true;
    }
  }
  return false;
}

/**
 * Gate 4: Check if .planning/code-index.json exists.
 * Uses __dirname to find project root (scripts/ is one level below root).
 */
function indexExists() {
  const indexPath = path.join(__dirname, '..', '.planning', 'code-index.json');
  return fs.existsSync(indexPath);
}

/**
 * Run incremental scan for the given file.
 * Fire-and-forget: does not block the hook.
 */
function runIncrementalScan(filePath) {
  const scanScript = path.join(__dirname, 'code-graph-scan.js');
  const projectDir = path.join(__dirname, '..');

  try {
    const child = execFile(
      process.execPath,
      [scanScript, projectDir, '--files', filePath],
      { timeout: 30000 },
      (err, stdout, stderr) => {
        if (err) {
          process.stderr.write(`[code-graph-update] incremental scan failed: ${err.message}\n`);
        }
        if (stderr) {
          process.stderr.write(`[code-graph-update] ${stderr}`);
        }
      }
    );
    child.unref();
  } catch (err) {
    process.stderr.write(`[code-graph-update] failed to spawn scan: ${err.message}\n`);
  }
}

async function main() {
  // 1. Read stdin with timeout protection
  const raw = await readStdin();
  if (!raw.trim()) process.exit(0);

  // 2. Parse JSON
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  // 3. Gate 1: tool_name must be Write or Edit
  const toolName = input.tool_name || '';
  if (toolName !== 'Write' && toolName !== 'Edit') process.exit(0);

  // 4. Extract file_path from tool_input
  const toolInput = input.tool_input || {};
  const filePath = toolInput.file_path || '';
  if (!filePath) process.exit(0);

  // 5. Gate 2: file must be a source file
  if (!isSourceFile(filePath)) process.exit(0);

  // 6. Gate 3: file must not be in excluded directory
  if (isExcludedPath(filePath)) process.exit(0);

  // 7. Gate 4: code-index.json must exist (first time needs manual full scan)
  if (!indexExists()) process.exit(0);

  // 8. Run incremental update (fire-and-forget)
  runIncrementalScan(filePath);

  process.exit(0);
}

main().catch(() => process.exit(0));
