/**
 * release.js — Maestro dev-to-public repo sync script
 *
 * Syncs runtime files from Maestro-dev (current repo) to the public Maestro
 * release repository. Only whitelisted directories and files are copied —
 * dev artifacts are excluded.
 *
 * Usage:
 *   node scripts/release.js            — Sync to public repo (clone/pull + copy + commit + push)
 *
 * Environment variables:
 *   MAESTRO_RELEASE_DIR       — Override target directory (skips git operations)
 *   MAESTRO_RELEASE_REPO_URL  — Override git remote URL for public repo
 *
 * Decisions: D-01 through D-07 from 20-CONTEXT.md
 *
 * Pure Node.js built-in modules. No npm dependencies.
 * Windows-compatible (all paths use path.join).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// --- Helpers ---

/**
 * Get the source root (Maestro-dev repo root).
 * Uses __dirname to locate the project root from scripts/ directory.
 */
function getSrcRoot() {
  return path.join(__dirname, '..');
}

/**
 * Read plugin name and version from .claude-plugin/plugin.json.
 * This is the trusted version source (per D-06).
 */
function getPluginInfo() {
  const pluginJsonPath = path.join(getSrcRoot(), '.claude-plugin', 'plugin.json');
  if (!fs.existsSync(pluginJsonPath)) {
    process.stderr.write('Error: .claude-plugin/plugin.json not found.\n');
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8'));
  return { name: data.name, version: data.version };
}

/**
 * Whitelist of files/directories to copy from dev repo to public repo.
 * Per D-01: only these directories/files belong in the public repo.
 */
const WHITELIST = [
  '.claude-plugin',   // Plugin metadata
  'hooks',            // Hook scripts and registration
  'scripts',          // Install/release scripts (filtered for *.js, excluding *.test.js)
  'skills',           // Skill definitions
  'agents',           // Agent definitions
  'README.md',        // Project readme
  // docs/ images are handled separately: DOCS_IMAGES list below
  // CLAUDE.md is handled separately: docs/CLAUDE-RELEASE.md → CLAUDE.md
];

/**
 * Specific docs/ files referenced in README.md to copy to public repo.
 * Only these files are synced — no analysis docs, no competitor diagrams.
 */
const DOCS_IMAGES = [
  'docs/flows/maestro-18-phases.png',
  'docs/flows/maestro-phase-lifecycle.png',
];

/**
 * Files/patterns to exclude from sync.
 * Per D-07: dev artifacts that must not appear in the public repo.
 */
const EXCLUDED_FILES = new Set([
  '.gitattributes',
  '.gitignore',
  'CHANGELOG.md',
]);

const MARKETPLACE_REPO_URL = process.env.MAESTRO_MARKETPLACE_REPO_URL ||
  'https://github.com/lyuxiaohei/maestro-marketplace.git';

/**
 * Check if a root-level file should be excluded based on analysis doc patterns.
 */
function isExcludedFile(filename) {
  if (EXCLUDED_FILES.has(filename)) return true;
  // Analysis docs (per D-07)
  if (filename.includes('分析')) return true;
  if (/Claude-Code-.*分析/.test(filename)) return true;
  if (/Maestro-插件分析/.test(filename)) return true;
  // xlsx files
  if (filename.endsWith('.xlsx')) return true;
  return false;
}

/**
 * Count files in a directory recursively.
 * @param {string} dir - Directory to count files in
 * @returns {number} Number of files
 */
function countFiles(dir) {
  let count = 0;
  if (!fs.existsSync(dir)) return 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      count += countFiles(fullPath);
    } else {
      count++;
    }
  }
  return count;
}

/**
 * List top-level entries in a directory.
 * @param {string} dir - Directory to list
 * @returns {string[]} Top-level entry names
 */
function listTopLevel(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir);
}

/**
 * Sync whitelisted files from srcRoot to targetDir.
 * Only copies files that match the whitelist; excludes dev artifacts.
 *
 * @param {string} srcRoot   - Maestro-dev root directory
 * @param {string} targetDir - Public repo target directory
 */
function syncFiles(srcRoot, targetDir) {
  // Ensure target directory exists
  fs.mkdirSync(targetDir, { recursive: true });

  for (const item of WHITELIST) {
    const srcPath = path.join(srcRoot, item);
    const dstPath = path.join(targetDir, item);

    if (!fs.existsSync(srcPath)) {
      // Skip if source doesn't exist (e.g., agents/ might not exist in all setups)
      continue;
    }

    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      // Handle directories — copy recursively with exclusions
      if (item === 'scripts') {
        // Special handling for scripts/: only *.js, excluding *.test.js
        copyScriptsDir(srcPath, dstPath);
      } else {
        // Full recursive copy for .claude-plugin/, hooks/, skills/, agents/
        fs.cpSync(srcPath, dstPath, { recursive: true });
      }
    } else if (stat.isFile()) {
      // Handle individual files — check exclusion list
      if (!isExcludedFile(item)) {
        fs.copyFileSync(srcPath, dstPath);
      }
    }
  }

  // Remove any excluded files that may have been copied via directory copy
  // (e.g., .test.js files in scripts/ subdirectories, .xlsx in subdirs)
  cleanupExcluded(targetDir);

  // Copy release version of CLAUDE.md (without GSD dev references)
  const releaseClaude = path.join(srcRoot, 'docs', 'CLAUDE-RELEASE.md');
  if (fs.existsSync(releaseClaude)) {
    fs.copyFileSync(releaseClaude, path.join(targetDir, 'CLAUDE.md'));
  }

  // Copy only docs/ images referenced in README.md
  const docsTargetDir = path.join(targetDir, 'docs');
  for (const relPath of DOCS_IMAGES) {
    const src = path.join(srcRoot, relPath);
    const dst = path.join(targetDir, relPath);
    if (fs.existsSync(src)) {
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.copyFileSync(src, dst);
    }
  }

  // Remove stale docs/ files not in DOCS_IMAGES
  if (fs.existsSync(docsTargetDir)) {
    const allowedNames = new Set(DOCS_IMAGES.map(p => path.basename(p)));
    function cleanDocsDir(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          cleanDocsDir(fullPath);
          // Remove empty subdirectories
          if (fs.readdirSync(fullPath).length === 0) {
            fs.rmSync(fullPath, { recursive: true, force: true });
          }
        } else if (!allowedNames.has(entry.name)) {
          fs.rmSync(fullPath, { force: true });
        }
      }
    }
    cleanDocsDir(docsTargetDir);
    // Remove docs/ itself if empty
    if (fs.existsSync(docsTargetDir) && fs.readdirSync(docsTargetDir).length === 0) {
      fs.rmSync(docsTargetDir, { recursive: true, force: true });
    }
  }
}

/**
 * Copy scripts directory, filtering to only *.js files excluding *.test.js.
 * Also handles scripts/lib/ subdirectory.
 */
function copyScriptsDir(srcDir, dstDir) {
  fs.mkdirSync(dstDir, { recursive: true });

  // Copy *.js files (excluding *.test.js) from scripts/
  for (const file of fs.readdirSync(srcDir)) {
    const srcFile = path.join(srcDir, file);
    const stat = fs.statSync(srcFile);

    if (stat.isDirectory()) {
      // Handle subdirectories like scripts/lib/
      const subDst = path.join(dstDir, file);
      fs.mkdirSync(subDst, { recursive: true });
      for (const subFile of fs.readdirSync(srcFile)) {
        const subStat = fs.statSync(path.join(srcFile, subFile));
        if (subStat.isFile() && subFile.endsWith('.js') && !subFile.endsWith('.test.js')) {
          fs.copyFileSync(path.join(srcFile, subFile), path.join(subDst, subFile));
        }
      }
    } else if (stat.isFile() && file.endsWith('.js') && !file.endsWith('.test.js')) {
      fs.copyFileSync(srcFile, path.join(dstDir, file));
    }
  }
}

/**
 * Remove excluded files from target directory after copy.
 * Cleans up any .test.js, .xlsx, and other dev artifacts that may have been
 * pulled in via recursive directory copies.
 */
function cleanupExcluded(targetDir) {
  if (!fs.existsSync(targetDir)) return;

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else {
        // Remove .test.js files
        if (entry.name.endsWith('.test.js')) {
          fs.rmSync(fullPath, { force: true });
        }
        // Remove .xlsx files
        if (entry.name.endsWith('.xlsx')) {
          fs.rmSync(fullPath, { force: true });
        }
      }
    }
  }

  walk(targetDir);
}

/**
 * Perform git operations: clone or pull, commit, and push.
 * Only runs when MAESTRO_RELEASE_DIR is NOT set.
 *
 * @param {string} targetDir  - Local clone of the public repo
 * @param {string} repoUrl    - Git remote URL for the public repo
 * @param {string} version    - Version string for commit message
 */
function gitSync(targetDir, repoUrl, version) {
  if (fs.existsSync(targetDir) && fs.existsSync(path.join(targetDir, '.git'))) {
    // Pull existing clone
    console.log('Pulling latest from public repo...');
    execSync('git fetch origin', { cwd: targetDir, stdio: 'pipe' });
    // Detect default branch via remote HEAD symref
    let branch = 'main';
    try {
      const symref = execSync('git ls-remote --symref origin HEAD', {
        cwd: targetDir, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'],
      });
      const m = symref.match(/ref: refs\/heads\/(.+)\tHEAD/);
      if (m) branch = m[1].trim();
    } catch { /* fallback to 'main' */ }
    // Check if remote branch exists (repo may be empty on first release)
    let hasRemoteBranch = false;
    try {
      execSync(`git rev-parse --verify origin/${branch}`, { cwd: targetDir, stdio: 'pipe' });
      hasRemoteBranch = true;
    } catch { /* empty repo — no remote branch yet */ }
    if (hasRemoteBranch) {
      execSync(`git checkout -B ${branch} origin/${branch}`, { cwd: targetDir, stdio: 'pipe' });
    } else {
      execSync(`git checkout -b ${branch}`, { cwd: targetDir, stdio: 'pipe' });
    }
  } else {
    // Fresh clone
    console.log('Cloning public repo...');
    const parentDir = path.dirname(targetDir);
    fs.mkdirSync(parentDir, { recursive: true });
    try {
      execSync(`git clone ${JSON.stringify(repoUrl)} ${JSON.stringify(targetDir)}`, {
        cwd: parentDir,
        stdio: 'pipe',
      });
    } catch {
      // Empty repo — clone may warn but still creates the directory
      if (!fs.existsSync(targetDir)) {
        throw new Error('Failed to clone public repo');
      }
    }
  }

  return targetDir;
}

/**
 * Commit and push changes to the public repo.
 */
function gitCommitAndPush(targetDir, version) {
  try {
    execSync('git add -A', { cwd: targetDir, stdio: 'pipe' });
    execSync(`git commit -m ${JSON.stringify('release v' + version)}`, {
      cwd: targetDir,
      stdio: 'pipe',
    });
    execSync('git push -u origin HEAD', { cwd: targetDir, stdio: 'pipe' });
    console.log(`Pushed release v${version} to public repo.`);
  } catch (err) {
    // git commit may fail if no changes — that's OK
    if (err.stderr && err.stderr.includes('nothing to commit')) {
      console.log('No changes to commit — public repo is up to date.');
    } else {
      throw err;
    }
  }
}

/**
 * Sync marketplace repo: update sha in marketplace.json and push.
 *
 * @param {string} releaseDir  - Local clone of the release repo (to get HEAD sha)
 * @param {string} version     - Version string for commit message
 */
function syncMarketplace(releaseDir, version) {
  // 1. Get HEAD sha from release repo
  let sha;
  try {
    sha = execSync('git rev-parse HEAD', { cwd: releaseDir, encoding: 'utf8' }).trim();
  } catch {
    console.log('Warning: Could not get release repo sha — skipping marketplace sync.');
    return;
  }

  // 2. Clone or pull marketplace repo
  const homeDir = os.homedir();
  const mktDir = path.join(homeDir, '.maestro-release', 'maestro-marketplace');

  if (fs.existsSync(mktDir) && fs.existsSync(path.join(mktDir, '.git'))) {
    console.log('Pulling marketplace repo...');
    try {
      execSync('git pull --ff-only', { cwd: mktDir, stdio: 'pipe' });
    } catch {
      console.log('Warning: marketplace pull failed — continuing with local state.');
    }
  } else {
    console.log('Cloning marketplace repo...');
    const parentDir = path.dirname(mktDir);
    fs.mkdirSync(parentDir, { recursive: true });
    try {
      execSync(`git clone ${JSON.stringify(MARKETPLACE_REPO_URL)} ${JSON.stringify(mktDir)}`, {
        cwd: parentDir,
        stdio: 'pipe',
      });
    } catch {
      if (!fs.existsSync(mktDir)) {
        console.log('Warning: marketplace repo not accessible — skipping marketplace sync.');
        return;
      }
    }
  }

  // 3. Update marketplace.json sha
  const mktJsonPath = path.join(mktDir, '.claude-plugin', 'marketplace.json');
  if (!fs.existsSync(mktJsonPath)) {
    // First time — copy from template
    const templatePath = path.join(getSrcRoot(), 'marketplace', '.claude-plugin', 'marketplace.json');
    if (fs.existsSync(templatePath)) {
      fs.mkdirSync(path.dirname(mktJsonPath), { recursive: true });
      fs.copyFileSync(templatePath, mktJsonPath);
    } else {
      console.log('Warning: marketplace template not found — skipping marketplace sync.');
      return;
    }
  }

  let mktData;
  try {
    mktData = JSON.parse(fs.readFileSync(mktJsonPath, 'utf8'));
  } catch {
    console.log('Warning: marketplace.json parse failed — skipping marketplace sync.');
    return;
  }

  // Update sha for maestro plugin
  if (mktData.plugins && mktData.plugins[0] && mktData.plugins[0].source) {
    mktData.plugins[0].source.sha = sha;
  }
  fs.writeFileSync(mktJsonPath, JSON.stringify(mktData, null, 2) + '\n', 'utf8');

  // 4. Commit and push
  try {
    execSync('git add -A', { cwd: mktDir, stdio: 'pipe' });
    execSync(`git commit -m ${JSON.stringify('update maestro sha: ' + sha.substring(0, 8) + ' (v' + version + ')')}`, {
      cwd: mktDir,
      stdio: 'pipe',
    });
    execSync('git push', { cwd: mktDir, stdio: 'pipe' });
    console.log(`Marketplace synced: sha ${sha.substring(0, 8)} (v${version})`);
  } catch (err) {
    const stderr = err.stderr || '';
    if (stderr.includes('nothing to commit')) {
      console.log('Marketplace: no changes to commit.');
    } else {
      console.log('Warning: marketplace push failed — manual sync needed.');
    }
  }
}

// --- Main ---

function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');

  const info = getPluginInfo();
  const version = info.version;
  const srcRoot = getSrcRoot();

  // Default public repo URL (can be overridden via env)
  const repoUrl = process.env.MAESTRO_RELEASE_REPO_URL ||
    'https://github.com/lyuxiaohei/Maestro.git';

  if (process.env.MAESTRO_RELEASE_DIR) {
    // Test / direct mode: just copy files, no git operations
    const targetDir = process.env.MAESTRO_RELEASE_DIR;
    syncFiles(srcRoot, targetDir);

    if (isDryRun) {
      // Print dry-run summary
      const fileCount = countFiles(targetDir);
      const topItems = listTopLevel(targetDir);
      console.log(`Dry run: would sync ${fileCount} files for v${version}`);
      console.log('Top-level items:');
      for (const item of topItems) {
        console.log(`  - ${item}`);
      }
    } else {
      console.log(`Synced v${version} to ${targetDir}`);
    }
  } else if (isDryRun) {
    // Dry run with git clone/pull but no commit/push
    const homeDir = os.homedir();
    const targetDir = path.join(homeDir, '.maestro-release', 'Maestro');

    gitSync(targetDir, repoUrl, version);
    syncFiles(srcRoot, targetDir);

    // Print dry-run summary instead of committing/pushing
    const fileCount = countFiles(targetDir);
    const topItems = listTopLevel(targetDir);
    console.log(`Dry run: would sync ${fileCount} files for v${version}`);
    console.log('Top-level items:');
    for (const item of topItems) {
      console.log(`  - ${item}`);
    }
  } else {
    // Production mode: clone/pull + copy + commit + push
    const homeDir = os.homedir();
    const targetDir = path.join(homeDir, '.maestro-release', 'Maestro');

    gitSync(targetDir, repoUrl, version);
    syncFiles(srcRoot, targetDir);
    gitCommitAndPush(targetDir, version);

    // Sync marketplace repo with updated sha
    syncMarketplace(targetDir, version);
  }
}

main();
