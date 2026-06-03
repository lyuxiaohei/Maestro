// maestro-hook-version: 202606.0
/**
 * tdd-guard.js — Maestro TDD Guard Hook
 *
 * PreToolUse Write|Edit: 新建实现文件前检测对应测试文件是否存在。
 * 默认 OFF，需 config.json hooks.tdd_guard = true 或 .maestro-tdd-guard.enabled 启用。
 *
 * Hook protocol: reads JSON from stdin, writes JSON to stdout.
 * stdin timeout: 5 seconds.
 * Exit 0 = allow, Exit 2 = deny.
 *
 * Pure Node.js built-in modules. No npm dependencies.
 */

'use strict';

const path = require('path');
const fs = require('fs');

const STDIN_TIMEOUT_MS = 5000;

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

function isEnabled() {
  try {
    const projectRoot = process.cwd();
    // Priority 1: disabled file
    if (fs.existsSync(path.join(projectRoot, '.maestro-tdd-guard.disabled'))) return false;
    // Priority 2: enabled file
    if (fs.existsSync(path.join(projectRoot, '.maestro-tdd-guard.enabled'))) return true;
    // Priority 3: config.json
    const configPath = path.join(projectRoot, '.planning', 'config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return config.hooks && config.hooks.tdd_guard === true;
    }
  } catch { /* ignore */ }
  return false; // default OFF
}

const EXEMPT_SUFFIXES = ['.scaffold', '.template', '.gen', '.generated'];
const EXEMPT_EXTENSIONS = [
  '.md', '.json', '.yml', '.yaml', '.xml', '.properties', '.toml',
  '.txt', '.gitignore', '.env', '.editorconfig', '.prettierrc', '.eslintrc',
  '.gitattributes', '.css', '.scss', '.less', '.svg', '.png', '.jpg', '.ico',
];
const BUSINESS_PREFIXES = ['src/main/java/', 'src/', 'app/', 'lib/'];

function isExempted(filePath) {
  const basename = path.basename(filePath);
  const ext = path.extname(filePath);
  const name = basename.replace(ext, '');

  // Exempt suffixes
  for (const suffix of EXEMPT_SUFFIXES) {
    if (name.endsWith(suffix)) return true;
  }

  // Exempt extensions
  if (EXEMPT_EXTENSIONS.includes(ext)) return true;
  if (basename.startsWith('.env')) return true;

  // Test files themselves
  if (/Test(s)?\.java$/i.test(basename)) return true;
  if (/IT\.java$/i.test(basename)) return true;
  if (/\.test\.(ts|tsx|js|jsx)$/.test(basename)) return true;
  if (/\.spec\.(ts|tsx|js|jsx)$/.test(basename)) return true;
  if (/^test_.*\.py$/.test(basename)) return true;
  if (/.*_test\.py$/.test(basename)) return true;

  // Non-business paths
  const rel = filePath.replace(/\\/g, '/');
  const isBusiness = BUSINESS_PREFIXES.some(p => rel.includes(p));
  if (!isBusiness) return true;

  return false;
}

function isTestFile(filePath) {
  const basename = path.basename(filePath);
  return /Test(s)?\.java$/i.test(basename)
    || /IT\.java$/i.test(basename)
    || /\.test\.(ts|tsx|js|jsx)$/.test(basename)
    || /\.spec\.(ts|tsx|js|jsx)$/.test(basename)
    || /^test_.*\.py$/.test(basename)
    || /.*_test\.py$/.test(basename);
}

function fileExists(p) {
  try { return fs.existsSync(p); } catch { return false; }
}

function detectLanguage(filePath) {
  const rel = filePath.replace(/\\/g, '/');
  if (rel.includes('src/main/java/') && rel.endsWith('.java')) return 'java';
  if (/\.(ts|tsx)$/.test(rel)) return 'typescript';
  if (rel.endsWith('.py')) return 'python';
  return null;
}

function findTestFile(filePath) {
  const lang = detectLanguage(filePath);
  if (!lang) return [];

  const dir = path.dirname(filePath);
  const basename = path.basename(filePath, path.extname(filePath));

  if (lang === 'java') {
    // src/main/java/**/Foo.java → src/test/java/**/FooTest.java
    const testDir = dir.replace(/src[/\\]main[/\\]java/, 'src/test/java');
    return [
      path.join(testDir, `${basename}Test.java`),
      path.join(testDir, `${basename}Tests.java`),
      path.join(testDir, `${basename}IT.java`),
    ];
  }

  if (lang === 'typescript') {
    return [
      path.join(dir, `${basename}.test.ts`),
      path.join(dir, `${basename}.test.tsx`),
      path.join(dir, `${basename}.spec.ts`),
      path.join(dir, `${basename}.spec.tsx`),
      path.join(dir, '__tests__', `${basename}.test.ts`),
    ];
  }

  if (lang === 'python') {
    return [
      path.join(dir, `test_${basename}.py`),
      path.join(dir, `${basename}_test.py`),
      path.join(dir, '..', 'tests', `test_${basename}.py`),
    ];
  }

  return [];
}

async function main() {
  const raw = await readStdin();
  if (!raw.trim()) process.exit(0);

  let input;
  try { input = JSON.parse(raw); } catch { process.exit(0); }

  if (!isEnabled()) process.exit(0);

  const filePath = input.tool_input && input.tool_input.file_path;
  if (!filePath) process.exit(0);

  // Only check new files (Edit is allowed = GREEN/REFACTOR)
  if (input.tool_name === 'Edit') process.exit(0);
  if (isExempted(filePath)) process.exit(0);
  if (isTestFile(filePath)) process.exit(0);

  // Already exists = overwrite in GREEN/REFACTOR phase
  if (fileExists(filePath)) process.exit(0);

  const candidates = findTestFile(filePath);
  if (candidates.length === 0) process.exit(0); // Not a business source file

  const hasTest = candidates.some(fileExists);
  if (hasTest) process.exit(0);

  // DENY: no test file found
  const output = JSON.stringify({
    decision: 'deny',
    reason: 'TDD Guard: 新建实现文件前必须先有对应测试文件',
    additionalContext:
      `试图创建: ${filePath}\n` +
      `未发现: ${candidates.map(c => path.basename(c)).join(', ')}\n` +
      `正确流程: ①写测试 → ②确认FAIL → ③写实现\n` +
      `绕过: 文件名加 .gen 后缀 或 创建 .maestro-tdd-guard.disabled`,
  });
  process.stdout.write(output);
  process.exit(2);
}

main().catch(() => process.exit(0));
