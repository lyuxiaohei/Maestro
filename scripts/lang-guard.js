// maestro-hook-version: 202606.0
/**
 * lang-guard.js — Maestro Language Pack Template Guard Hook
 *
 * PreToolUse Write|Edit: 检查实现文件写入前是否已读取对应语言包模板。
 * 默认 OFF，需 config.json hooks.lang_guard = true 或 .maestro-lang-guard.enabled 启用。
 *
 * DEF-01: 本版不实现 transcript 扫描，仅做模板文件存在性检查。
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
    if (fs.existsSync(path.join(projectRoot, '.maestro-lang-guard.disabled'))) return false;
    if (fs.existsSync(path.join(projectRoot, '.maestro-lang-guard.enabled'))) return true;
    const configPath = path.join(projectRoot, '.planning', 'config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return config.hooks && config.hooks.lang_guard === true;
    }
  } catch { /* ignore */ }
  return false;
}

const EXEMPT_SUFFIXES = ['.scaffold', '.template', '.gen', '.generated'];
const EXEMPT_EXTENSIONS = [
  '.md', '.json', '.yml', '.yaml', '.xml', '.properties', '.toml',
  '.txt', '.gitignore', '.env', '.editorconfig', '.prettierrc', '.eslintrc',
  '.gitattributes', '.css', '.scss', '.less', '.svg', '.png', '.jpg', '.ico',
];
const AUTO_GEN_PATHS = ['target/generated-sources', 'build/generated', 'node_modules', '__pycache__'];

// Java file type → template mapping (13 kinds)
const JAVA_MAP = [
  { pattern: /ServiceImpl?\.java$/i, template: 'service.md' },
  { pattern: /Controller\.java$/i, template: 'controller.md' },
  { pattern: /(Entity|DO)\.java$/i, template: 'entity.md' },
  { pattern: /(DTO|Param|Req|Request)\.java$/i, template: 'dto.md' },
  { pattern: /(VO|Resp|Response)\.java$/i, template: 'vo.md' },
  { pattern: /Mapper\.java$/i, template: 'mapper.md' },
  { pattern: /Repository\.java$/i, template: 'repository.md' },
  { pattern: /(FeignApi|FeignClient|FeignAPI)\.java$/i, template: 'feign-api.md' },
  { pattern: /\.sql$/i, template: 'ddl.md' },
  { pattern: /ServiceImpl?Test\.java$/i, template: 'test-service.md' },
  { pattern: /Controller(Test|ImplTest)\.java$/i, template: 'test-controller.md' },
  { pattern: /DTO(Test|s)\.java$/i, template: 'test-dto.md' },
  { pattern: /Document\.java$/i, template: 'document.md' },
];

// React file type → template mapping (11 kinds)
const REACT_MAP = [
  { pattern: /src\/api\/instance\.(ts|tsx)$/, template: 'axios-instance.md' },
  { pattern: /src\/utils\/request\.(ts|tsx)$/, template: 'axios-instance.md' },
  { pattern: /src\/api\/.*\.(ts|tsx)$/, template: 'api-module.md' },
  { pattern: /src\/hooks\/use.*\.(ts|tsx)$/, template: 'hooks.md' },
  { pattern: /src\/store\/use.*\.(ts|tsx)$/, template: 'store.md' },
  { pattern: /src\/utils\/.*\.(ts|tsx)$/, template: 'utils.md' },
  { pattern: /src\/router\/.*\.(ts|tsx)$/, template: 'router.md' },
  { pattern: /src\/routes\/.*\.(ts|tsx)$/, template: 'router.md' },
  { pattern: /\.test\.(ts|tsx)$/, template: 'test-utils.md' },
  { pattern: /\.spec\.(ts|tsx)$/, template: 'test-utils.md' },
  { pattern: /vitest\.config/, template: 'test-config.md' },
];

function isExempted(filePath) {
  const basename = path.basename(filePath);
  const ext = path.extname(filePath);
  const name = basename.replace(ext, '');

  for (const suffix of EXEMPT_SUFFIXES) {
    if (name.endsWith(suffix)) return true;
  }
  if (EXEMPT_EXTENSIONS.includes(ext)) return true;
  if (basename.startsWith('.env')) return true;

  const rel = filePath.replace(/\\/g, '/');
  for (const autoGen of AUTO_GEN_PATHS) {
    if (rel.includes(autoGen)) return true;
  }

  return false;
}

function detectLanguage(filePath) {
  const rel = filePath.replace(/\\/g, '/');
  if (rel.includes('src/main/java/') && rel.endsWith('.java')) return 'java';
  if (/\.(ts|tsx)$/.test(rel) && (rel.includes('src/'))) return 'react';
  return null;
}

function getExpectedTemplate(filePath) {
  const rel = filePath.replace(/\\/g, '/');
  const lang = detectLanguage(filePath);
  if (!lang) return null;

  const maps = lang === 'java' ? JAVA_MAP : REACT_MAP;
  for (const entry of maps) {
    if (entry.pattern.test(rel)) {
      return { lang, template: entry.template };
    }
  }
  return null;
}

function checkMaturity(projectRoot, lang) {
  try {
    const skillPath = path.join(projectRoot, 'skills', `lang-${lang}`, 'SKILL.md');
    if (!fs.existsSync(skillPath)) return null; // no language pack = skip
    const content = fs.readFileSync(skillPath, 'utf8');
    const match = content.match(/^---[\s\S]*?maturity:\s*(\w+)/m);
    return match ? match[1] : 'preview';
  } catch { return null; }
}

function fileExists(p) {
  try { return fs.existsSync(p); } catch { return false; }
}

async function main() {
  const raw = await readStdin();
  if (!raw.trim()) process.exit(0);

  let input;
  try { input = JSON.parse(raw); } catch { process.exit(0); }

  if (!isEnabled()) process.exit(0);

  const filePath = input.tool_input && input.tool_input.file_path;
  if (!filePath) process.exit(0);

  if (isExempted(filePath)) process.exit(0);

  const match = getExpectedTemplate(filePath);
  if (!match) process.exit(0); // not in protection scope

  const projectRoot = process.cwd();
  const maturity = checkMaturity(projectRoot, match.lang);
  if (!maturity || maturity !== 'mature') process.exit(0); // only guard mature packs

  // Check if template file exists (DEF-01: no transcript scan, just file existence)
  const templatePath = path.join(projectRoot, 'skills', `lang-${match.lang}`, 'templates', match.template);
  if (!fileExists(templatePath)) process.exit(0); // template doesn't exist = can't enforce

  // DENY: template exists but guard fires (reminder to do Briefing first)
  const output = JSON.stringify({
    decision: 'deny',
    reason: `Lang Guard: 写入 ${path.basename(filePath)} 前必须先读取语言包模板 ${match.template}`,
    additionalContext:
      `试图写入: ${filePath}\n` +
      `需要先读取: skills/lang-${match.lang}/templates/${match.template}\n` +
      `正确流程: Briefing Gate → Read 模板 → 写代码\n` +
      `绕过: 文件名加 .gen 后缀 或 创建 .maestro-lang-guard.disabled`,
  });
  process.stdout.write(output);
  process.exit(2);
}

main().catch(() => process.exit(0));
