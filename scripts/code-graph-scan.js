#!/usr/bin/env node
'use strict';

/**
 * code-graph-scan.js — Lightweight code knowledge graph index scanner
 *
 * Scans JS/TS/Vue/Python source files, extracts imports/exports/classes/functions,
 * and writes a structured JSON index to .planning/code-index.json.
 *
 * Usage:
 *   node code-graph-scan.js <project-dir> --full           Full scan
 *   node code-graph-scan.js <project-dir> --files f1,f2    Incremental scan
 *   node code-graph-scan.js <project-dir> --context [--dirs d1,d2]  Extract context for Agent injection
 *
 * Pure Node.js built-in modules only (fs, path, crypto).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SOURCE_EXTENSIONS = new Set(['.js', '.ts', '.jsx', '.tsx', '.vue', '.py']);

const SKIP_DIRS = new Set([
  'node_modules',
  '.planning',
  'dist',
  'build',
  '.git',
  '.claude',
]);

const INDEX_RELATIVE_PATH = path.join('.planning', 'code-index.json');
const MAX_JSON_BYTES = 50 * 1024; // 50 KB

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: node code-graph-scan.js <project-dir> --full|--files f1,f2|--context [--dirs d1,d2]');
    process.exit(1);
  }

  const projectDir = path.resolve(args[0]);
  const mode = args[1];

  if (mode === '--full') {
    return { projectDir, mode: 'full', files: null };
  }

  if (mode === '--files') {
    if (!args[2]) {
      console.error('Error: --files requires a comma-separated file list');
      process.exit(1);
    }
    const files = args[2].split(',').map(f => f.trim()).filter(Boolean);
    return { projectDir, mode: 'files', files };
  }

  if (mode === '--context') {
    // Optional --dirs filter
    const dirsIdx = args.indexOf('--dirs');
    let dirs = null;
    if (dirsIdx !== -1) {
      if (!args[dirsIdx + 1]) {
        console.error('Error: --dirs requires a comma-separated directory list');
        process.exit(1);
      }
      dirs = args[dirsIdx + 1].split(',').map(d => d.trim().replace(/[/\\]+$/, '')).filter(Boolean);
    }
    return { projectDir, mode: 'context', dirs };
  }

  console.error('Error: unknown mode. Use --full, --files, or --context');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// File traversal (T-01)
// ---------------------------------------------------------------------------

function collectFiles(dir) {
  const results = [];

  function walk(currentDir) {
    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (err) {
      // Silently skip unreadable directories
      return;
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        // Also skip any directory starting with a dot that's not in SKIP_DIRS
        if (entry.name.startsWith('.')) continue;
        walk(path.join(currentDir, entry.name));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (SOURCE_EXTENSIONS.has(ext)) {
          results.push(path.join(currentDir, entry.name));
        }
      }
    }
  }

  walk(dir);
  return results;
}

// ---------------------------------------------------------------------------
// Utility: compute MD5 hash (first 8 chars)
// ---------------------------------------------------------------------------

function computeHash(content) {
  return crypto.createHash('md5').update(content).digest('hex').slice(0, 8);
}

// ---------------------------------------------------------------------------
// Normalize a relative/absolute path to forward-slash relative from project root
// ---------------------------------------------------------------------------

function toRelativePosix(filePath, projectDir) {
  const rel = path.relative(projectDir, filePath);
  return rel.split(path.sep).join('/');
}

// ---------------------------------------------------------------------------
// Import/export extraction (T-02)
// ---------------------------------------------------------------------------

/**
 * Extract import statements from JS/TS content.
 * Covers:
 *   import Foo from './bar'
 *   import { Foo, Bar } from './baz'
 *   import * as Foo from './mod'
 *   import './side-effects'
 *   require('...') (const x = require('...'), require('...'))
 * Does NOT cover: dynamic import(), TypeScript type-only imports
 */
function extractImports(content, fileDir, projectDir) {
  const imports = [];

  // --- Static imports ---

  // import default: import Foo from 'source'
  const defaultImportRe = /^\s*import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/gm;
  let match;
  while ((match = defaultImportRe.exec(content)) !== null) {
    const specifier = match[1];
    const source = resolveSource(match[2], fileDir, projectDir);
    imports.push({ source, specifiers: [specifier] });
  }

  // import named: import { Foo, Bar as Baz } from 'source'
  const namedImportRe = /^\s*import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/gm;
  while ((match = namedImportRe.exec(content)) !== null) {
    const specifiers = match[1]
      .split(',')
      .map(s => s.trim().split(/\s+as\s+/)[0].trim())
      .filter(Boolean);
    const source = resolveSource(match[2], fileDir, projectDir);
    imports.push({ source, specifiers });
  }

  // import namespace: import * as Foo from 'source'
  const nsImportRe = /^\s*import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]/gm;
  while ((match = nsImportRe.exec(content)) !== null) {
    const specifier = '* as ' + match[1];
    const source = resolveSource(match[2], fileDir, projectDir);
    imports.push({ source, specifiers: [specifier] });
  }

  // import side-effect: import 'source'
  const sideEffectRe = /^\s*import\s+['"]([^'"]+)['"]/gm;
  while ((match = sideEffectRe.exec(content)) !== null) {
    const source = resolveSource(match[1], fileDir, projectDir);
    imports.push({ source, specifiers: [] });
  }

  // --- require() ---

  // const/let/var x = require('source')
  const requireAssignRe = /(?:const|let|var)\s+(?:\{([^}]+)\}|(\w+))\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = requireAssignRe.exec(content)) !== null) {
    const source = resolveSource(match[3], fileDir, projectDir);
    if (match[1]) {
      // Destructured: const { Foo, Bar } = require(...)
      const specifiers = match[1]
        .split(',')
        .map(s => s.trim().split(/\s*:\s*/)[0].trim())
        .filter(Boolean);
      imports.push({ source, specifiers });
    } else {
      // Simple: const foo = require(...)
      imports.push({ source, specifiers: [match[2]] });
    }
  }

  // Bare require('source') — not captured by assignment pattern above
  const bareRequireRe = /(?<![.\w])require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = bareRequireRe.exec(content)) !== null) {
    // Skip if this line was already captured by requireAssignRe
    const lineStart = content.lastIndexOf('\n', match.index) + 1;
    const lineEnd = content.indexOf('\n', match.index);
    const line = content.slice(lineStart, lineEnd === -1 ? content.length : lineEnd);
    if (/(?:const|let|var)\s/.test(line)) continue;

    const source = resolveSource(match[1], fileDir, projectDir);
    imports.push({ source, specifiers: [] });
  }

  return imports;
}

/**
 * Extract export statements from JS/TS content.
 * Covers:
 *   export { Foo, Bar }
 *   export default expression
 *   export const/let/var/function/class Foo
 */
function extractExports(content) {
  const exports = [];

  // export { Foo, Bar }
  const namedExportBlockRe = /^\s*export\s+\{([^}]+)\}/gm;
  let match;
  while ((match = namedExportBlockRe.exec(content)) !== null) {
    const names = match[1]
      .split(',')
      .map(s => s.trim().split(/\s+as\s+/)[0].trim())
      .filter(Boolean);
    for (const name of names) {
      exports.push({ name, kind: 'named' });
    }
  }

  // export default ...
  const defaultExportRe = /^\s*export\s+default\s+/gm;
  while ((match = defaultExportRe.exec(content)) !== null) {
    exports.push({ name: 'default', kind: 'default' });
  }

  // export const/let/var Foo
  const exportVarRe = /^\s*export\s+(?:const|let|var)\s+(\w+)/gm;
  while ((match = exportVarRe.exec(content)) !== null) {
    exports.push({ name: match[1], kind: 'named' });
  }

  // export function Foo
  const exportFuncRe = /^\s*export\s+(?:async\s+)?function\s+(\w+)/gm;
  while ((match = exportFuncRe.exec(content)) !== null) {
    exports.push({ name: match[1], kind: 'named' });
  }

  // export class Foo
  const exportClassRe = /^\s*export\s+class\s+(\w+)/gm;
  while ((match = exportClassRe.exec(content)) !== null) {
    exports.push({ name: match[1], kind: 'named' });
  }

  return exports;
}

/**
 * Resolve an import source to a project-relative path.
 * - Relative paths (./ ../) are resolved relative to the importing file's directory
 * - Non-relative paths (bare specifiers like 'fs', 'react') are kept as-is
 */
function resolveSource(source, fileDir, projectDir) {
  if (source.startsWith('./') || source.startsWith('../')) {
    // Resolve relative path
    let resolved = path.resolve(fileDir, source);

    // Try adding extensions if the path doesn't have one
    const ext = path.extname(resolved).toLowerCase();
    if (!SOURCE_EXTENSIONS.has(ext)) {
      for (const tryExt of ['.js', '.ts', '.jsx', '.tsx', '.vue']) {
        const candidate = resolved + tryExt;
        if (fs.existsSync(candidate)) {
          resolved = candidate;
          break;
        }
      }
      // Also try index files
      if (!SOURCE_EXTENSIONS.has(path.extname(resolved).toLowerCase())) {
        for (const tryExt of ['.js', '.ts', '.jsx', '.tsx']) {
          const candidate = path.join(resolved, 'index' + tryExt);
          if (fs.existsSync(candidate)) {
            resolved = candidate;
            break;
          }
        }
      }
    }

    return toRelativePosix(resolved, projectDir);
  }
  // Bare specifier (node built-in or npm package) — keep as-is
  return source;
}

// ---------------------------------------------------------------------------
// Class/function extraction (T-03)
// ---------------------------------------------------------------------------

/**
 * Extract class declarations from JS/TS content.
 * Covers: class Foo, class Foo extends Bar, export class Foo
 */
function extractClasses(content) {
  const classes = [];

  // class Foo extends Bar / class Foo
  const classRe = /^\s*(export\s+(?:default\s+)?)?class\s+(\w+)(?:\s+extends\s+(\w+))?/gm;
  let match;
  while ((match = classRe.exec(content)) !== null) {
    const isExport = !!match[1];
    const isDefault = match[1] && /default/.test(match[1]);
    const name = match[2];
    const extendsClass = match[3] || null;

    const line = content.substring(0, match.index).split('\n').length;

    classes.push({
      name,
      extends: extendsClass,
      export_kind: isExport ? (isDefault ? 'default' : 'named') : 'none',
      line,
    });
  }

  return classes;
}

/**
 * Extract function declarations from JS/TS content.
 * Covers: function foo(), async function foo(), const foo = () =>,
 *         const foo = function(), export function foo()
 */
function extractFunctions(content) {
  const functions = [];

  // function foo() / async function foo()
  const funcDeclRe = /^\s*(export\s+(?:default\s+)?)?(async\s+)?function\s+(\w+)/gm;
  let match;
  while ((match = funcDeclRe.exec(content)) !== null) {
    const isExport = !!match[1];
    const isDefault = match[1] && /default/.test(match[1]);
    const name = match[3];
    const line = content.substring(0, match.index).split('\n').length;

    functions.push({
      name,
      type: 'function',
      export_kind: isExport ? (isDefault ? 'default' : 'named') : 'none',
      line,
    });
  }

  // const foo = () => / const foo = function()
  const arrowFuncRe = /^\s*(export\s+(?:default\s+)?)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[^=])\s*=>/gm;
  while ((match = arrowFuncRe.exec(content)) !== null) {
    const isExport = !!match[1];
    const isDefault = match[1] && /default/.test(match[1]);
    const name = match[2];
    const line = content.substring(0, match.index).split('\n').length;

    functions.push({
      name,
      type: 'arrow',
      export_kind: isExport ? (isDefault ? 'default' : 'named') : 'none',
      line,
    });
  }

  // const foo = function() / const foo = function name()
  const funcExprRe = /^\s*(export\s+(?:default\s+)?)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function(?:\s+\w+)?\s*\(/gm;
  while ((match = funcExprRe.exec(content)) !== null) {
    const isExport = !!match[1];
    const isDefault = match[1] && /default/.test(match[1]);
    const name = match[2];
    const line = content.substring(0, match.index).split('\n').length;

    functions.push({
      name,
      type: 'function',
      export_kind: isExport ? (isDefault ? 'default' : 'named') : 'none',
      line,
    });
  }

  return functions;
}

// ---------------------------------------------------------------------------
// Python extraction (basic)
// ---------------------------------------------------------------------------

function extractPythonImports(content, fileDir, projectDir) {
  const imports = [];
  // import foo / import foo.bar
  const simpleRe = /^import\s+([\w.]+)/gm;
  let match;
  while ((match = simpleRe.exec(content)) !== null) {
    imports.push({ source: match[1], specifiers: [] });
  }
  // from foo import bar, baz
  const fromRe = /^from\s+([\w.]+)\s+import\s+(.+)/gm;
  while ((match = fromRe.exec(content)) !== null) {
    const specifiers = match[2].split(',').map(s => s.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);
    imports.push({ source: match[1], specifiers });
  }
  return imports;
}

function extractPythonClasses(content) {
  const classes = [];
  // class Foo: / class Foo(Bar):
  const classRe = /^\s*class\s+(\w+)(?:\(([^)]+)\))?/gm;
  let match;
  while ((match = classRe.exec(content)) !== null) {
    const line = content.substring(0, match.index).split('\n').length;
    const extendsList = match[2] ? match[2].split(',').map(s => s.trim())[0] : null;
    classes.push({
      name: match[1],
      extends: extendsList,
      export_kind: 'none',
      line,
    });
  }
  return classes;
}

function extractPythonFunctions(content) {
  const functions = [];
  // def foo() / async def foo()
  const funcRe = /^\s*(async\s+)?def\s+(\w+)\s*\(/gm;
  let match;
  while ((match = funcRe.exec(content)) !== null) {
    const line = content.substring(0, match.index).split('\n').length;
    functions.push({
      name: match[2],
      type: 'function',
      export_kind: 'none',
      line,
    });
  }
  return functions;
}

// ---------------------------------------------------------------------------
// Scan a single file
// ---------------------------------------------------------------------------

function scanFile(filePath, projectDir) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const hash = computeHash(content);
  const relativePath = toRelativePosix(filePath, projectDir);
  const ext = path.extname(filePath).toLowerCase();
  const fileDir = path.dirname(filePath);

  let imports = [];
  let exports = [];
  let classes = [];
  let functions = [];

  if (ext === '.py') {
    imports = extractPythonImports(content, fileDir, projectDir);
    classes = extractPythonClasses(content);
    functions = extractPythonFunctions(content);
  } else {
    // JS/TS/Vue
    // For .vue files, extract from <script> blocks only
    let scanContent = content;
    if (ext === '.vue') {
      const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/);
      if (scriptMatch) {
        scanContent = scriptMatch[1];
      }
    }

    imports = extractImports(scanContent, fileDir, projectDir);
    exports = extractExports(scanContent);
    classes = extractClasses(scanContent);
    functions = extractFunctions(scanContent);
  }

  return {
    path: relativePath,
    hash,
    imports,
    exports,
    classes,
    functions,
  };
}

// ---------------------------------------------------------------------------
// Summary calculation
// ---------------------------------------------------------------------------

function computeSummary(files) {
  let totalImports = 0;
  let totalExports = 0;
  let totalClasses = 0;
  let totalFunctions = 0;

  for (const f of files) {
    totalImports += f.imports.length;
    totalExports += f.exports.length;
    totalClasses += f.classes.length;
    totalFunctions += f.functions.length;
  }

  return {
    total_files: files.length,
    total_imports: totalImports,
    total_exports: totalExports,
    total_classes: totalClasses,
    total_functions: totalFunctions,
  };
}

// ---------------------------------------------------------------------------
// Size control: trim deepest paths first until under MAX_JSON_BYTES
// ---------------------------------------------------------------------------

function enforceSizeLimit(indexData, maxBytes) {
  let json = JSON.stringify(indexData, null, 2);

  if (Buffer.byteLength(json, 'utf-8') <= maxBytes) {
    return indexData;
  }

  // Sort files by depth (deepest first = first to remove)
  const sortedFiles = [...indexData.files].sort((a, b) => {
    const depthA = a.path.split('/').length;
    const depthB = b.path.split('/').length;
    return depthB - depthA; // Deeper paths first
  });

  const toRemove = new Set();
  for (const file of sortedFiles) {
    toRemove.add(file.path);
    const trimmed = indexData.files.filter(f => !toRemove.has(f.path));
    const trial = { ...indexData, files: trimmed, summary: computeSummary(trimmed) };
    json = JSON.stringify(trial, null, 2);
    if (Buffer.byteLength(json, 'utf-8') <= maxBytes) {
      return trial;
    }
  }

  // If still too large (extremely unlikely), keep only one shallowest file
  const last = sortedFiles[sortedFiles.length - 1];
  const finalFiles = last ? [last] : [];
  return {
    ...indexData,
    files: finalFiles,
    summary: computeSummary(finalFiles),
  };
}

// ---------------------------------------------------------------------------
// Load existing index (for incremental mode)
// ---------------------------------------------------------------------------

function loadExistingIndex(indexPath) {
  try {
    const raw = fs.readFileSync(indexPath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Context extraction mode (T-07)
// ---------------------------------------------------------------------------

/**
 * Generate a plain text code index summary for Agent context injection.
 * Output is kept under ~8000 characters (~2000 tokens).
 * Truncation strategy: remove function details first, then deepest files.
 */
function extractContext(projectDir, dirs) {
  const indexPath = path.join(projectDir, INDEX_RELATIVE_PATH);

  if (!fs.existsSync(indexPath)) {
    console.error('Error: .planning/code-index.json not found. Run --full first.');
    process.exit(1);
  }

  const index = loadExistingIndex(indexPath);
  if (!index || !index.files || index.files.length === 0) {
    console.error('Error: code index is empty.');
    process.exit(1);
  }

  // Filter by dirs if specified
  let files = index.files;
  if (dirs && dirs.length > 0) {
    files = files.filter(f => {
      for (const d of dirs) {
        if (f.path.startsWith(d + '/') || f.path.startsWith(d + '\\')) return true;
      }
      return false;
    });
  }

  const summary = computeSummary(files);

  // --- Build output sections ---

  // Header
  let output = '## Code Index Context\n';
  output += `Scanned: ${summary.total_files} files, ${summary.total_imports} imports, ${summary.total_classes} classes, ${summary.total_functions} functions\n\n`;

  // Module Dependencies: file -> its local imports
  const depLines = [];
  for (const f of files) {
    const localImports = f.imports
      .filter(imp => imp.source.startsWith('./') || imp.source.startsWith('../') || (!imp.source.startsWith('./') && !imp.source.startsWith('../') && imp.source.includes('/')))
      .map(imp => {
        // Only show project-relative imports (skip bare specifiers like 'fs')
        if (!imp.source.includes('/')) return null;
        return imp.source;
      })
      .filter(Boolean);
    if (localImports.length > 0) {
      depLines.push(`${f.path} -> ${[...new Set(localImports)].join(', ')}`);
    }
  }
  output += '### Module Dependencies\n';
  if (depLines.length > 0) {
    output += depLines.join('\n') + '\n';
  } else {
    output += '(no inter-module dependencies found)\n';
  }
  output += '\n';

  // Key Classes
  const classLines = [];
  for (const f of files) {
    for (const cls of f.classes) {
      const extStr = cls.extends ? ` extends ${cls.extends}` : '';
      classLines.push(`class ${cls.name}${extStr} (${f.path}:${cls.line})`);
    }
  }
  output += '### Key Classes\n';
  if (classLines.length > 0) {
    output += classLines.join('\n') + '\n';
  } else {
    output += '(no classes found)\n';
  }
  output += '\n';

  // Key Functions (grouped by file)
  output += '### Key Functions\n';
  const funcByFile = new Map();
  for (const f of files) {
    if (f.functions.length === 0) continue;
    funcByFile.set(f.path, f.functions.map(fn => fn.name));
  }
  if (funcByFile.size > 0) {
    const funcLines = [];
    for (const [fpath, fns] of funcByFile) {
      funcLines.push(`${fpath}: ${fns.join(', ')}`);
    }
    output += funcLines.join('\n') + '\n';
  } else {
    output += '(no functions found)\n';
  }

  // --- Truncation: if output exceeds ~8000 chars, truncate ---
  const MAX_OUTPUT_CHARS = 8000;
  if (output.length > MAX_OUTPUT_CHARS) {
    // Strategy: first truncate function lists (keep classes and deps)
    // Remove function details for deepest files first
    const sortedPaths = [...funcByFile.keys()].sort((a, b) => {
      const depthA = a.split('/').length;
      const depthB = b.split('/').length;
      return depthB - depthA; // deepest first
    });

    // Progressively remove function entries
    const truncFuncByFile = new Map(funcByFile);
    for (const p of sortedPaths) {
      if (output.length <= MAX_OUTPUT_CHARS) break;
      truncFuncByFile.delete(p);

      // Rebuild output
      let rebuilt = '## Code Index Context\n';
      rebuilt += `Scanned: ${summary.total_files} files, ${summary.total_imports} imports, ${summary.total_classes} classes, ${summary.total_functions} functions\n\n`;
      rebuilt += '### Module Dependencies\n';
      rebuilt += (depLines.length > 0 ? depLines.join('\n') : '(no inter-module dependencies found)') + '\n\n';
      rebuilt += '### Key Classes\n';
      rebuilt += (classLines.length > 0 ? classLines.join('\n') : '(no classes found)') + '\n\n';
      rebuilt += '### Key Functions\n';
      if (truncFuncByFile.size > 0) {
        const fl = [];
        for (const [fp, fns] of truncFuncByFile) {
          fl.push(`${fp}: ${fns.join(', ')}`);
        }
        rebuilt += fl.join('\n') + '\n';
      } else {
        rebuilt += '(truncated)\n';
      }
      output = rebuilt;
    }

    // If still too large, truncate dependency lines
    if (output.length > MAX_OUTPUT_CHARS) {
      while (output.length > MAX_OUTPUT_CHARS && depLines.length > 1) {
        depLines.pop();
        let rebuilt = '## Code Index Context\n';
        rebuilt += `Scanned: ${summary.total_files} files, ${summary.total_imports} imports, ${summary.total_classes} classes, ${summary.total_functions} functions\n\n`;
        rebuilt += '### Module Dependencies\n';
        rebuilt += depLines.join('\n') + '\n\n';
        rebuilt += '### Key Classes\n';
        rebuilt += classLines.join('\n') + '\n\n';
        rebuilt += '### Key Functions\n';
        rebuilt += '(truncated)\n';
        output = rebuilt;
      }
    }
  }

  process.stdout.write(output);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const { projectDir, mode, files: cliFiles, dirs } = parseArgs(process.argv);

  // Context extraction mode — read-only, output to stdout
  if (mode === 'context') {
    extractContext(projectDir, dirs);
    return;
  }

  // Ensure .planning directory exists
  const planningDir = path.join(projectDir, '.planning');
  if (!fs.existsSync(planningDir)) {
    fs.mkdirSync(planningDir, { recursive: true });
  }

  const indexPath = path.join(projectDir, INDEX_RELATIVE_PATH);

  let filePaths;
  let existingIndex = null;

  if (mode === 'full') {
    filePaths = collectFiles(projectDir);
  } else {
    // Incremental mode: resolve specified files
    filePaths = cliFiles.map(f => {
      const resolved = path.resolve(f);
      // If file doesn't exist, try relative to project dir
      if (!fs.existsSync(resolved)) {
        const alt = path.resolve(projectDir, f);
        if (fs.existsSync(alt)) return alt;
      }
      return resolved;
    }).filter(f => {
      if (!fs.existsSync(f)) {
        console.error(`Warning: file not found, skipping: ${f}`);
        return false;
      }
      const ext = path.extname(f).toLowerCase();
      return SOURCE_EXTENSIONS.has(ext);
    });

    existingIndex = loadExistingIndex(indexPath);
  }

  // Scan files
  const scannedFiles = [];
  for (const fp of filePaths) {
    try {
      scannedFiles.push(scanFile(fp, projectDir));
    } catch (err) {
      console.error(`Warning: failed to scan ${fp}: ${err.message}`);
    }
  }

  // Build index
  let files;
  if (mode === 'full') {
    files = scannedFiles;
  } else {
    // Incremental: merge into existing
    if (existingIndex && existingIndex.files) {
      files = [...existingIndex.files];
      for (const scanned of scannedFiles) {
        const idx = files.findIndex(f => f.path === scanned.path);
        if (idx >= 0) {
          files[idx] = scanned;
        } else {
          files.push(scanned);
        }
      }
    } else {
      files = scannedFiles;
    }
  }

  // Sort files by path for deterministic output
  files.sort((a, b) => a.path.localeCompare(b.path));

  const indexData = {
    version: 1,
    scanned_at: new Date().toISOString(),
    files,
    summary: computeSummary(files),
  };

  // Enforce size limit
  const finalData = enforceSizeLimit(indexData, MAX_JSON_BYTES);

  // Write index
  const jsonOutput = JSON.stringify(finalData, null, 2);
  fs.writeFileSync(indexPath, jsonOutput, 'utf-8');

  const sizeKB = (Buffer.byteLength(jsonOutput, 'utf-8') / 1024).toFixed(1);
  console.log(`Code index written to ${INDEX_RELATIVE_PATH}`);
  console.log(`  Files: ${finalData.summary.total_files}`);
  console.log(`  Imports: ${finalData.summary.total_imports}`);
  console.log(`  Exports: ${finalData.summary.total_exports}`);
  console.log(`  Classes: ${finalData.summary.total_classes}`);
  console.log(`  Functions: ${finalData.summary.total_functions}`);
  console.log(`  Size: ${sizeKB} KB`);
}

main();
