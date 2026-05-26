/**
 * install.js — Maestro global install/uninstall/update script
 *
 * Usage:
 *   node scripts/install.js              — Global install (copies to cache, registers plugin)
 *   node scripts/install.js --uninstall  — Remove global install
 *   node scripts/install.js --local      — Register project path without copying files
 *   node scripts/install.js --from-github — Clone from GitHub and install globally
 *
 * Decisions: D-01 through D-14 from 19-CONTEXT.md, D-08/D-09 from 20-CONTEXT.md
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

function getHomeDir() {
  return process.env.MAESTRO_TEST_HOME || os.homedir();
}

function getSrcRoot() {
  return path.join(__dirname, '..');
}

function getPluginInfo(srcRoot) {
  const root = srcRoot || getSrcRoot();
  const pluginJsonPath = path.join(root, '.claude-plugin', 'plugin.json');
  if (!fs.existsSync(pluginJsonPath)) {
    process.stderr.write('Error: .claude-plugin/plugin.json not found.\n');
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8'));
  return { name: data.name, version: data.version };
}

function getRegistryPath() {
  return path.join(getHomeDir(), '.claude', 'plugins', 'installed_plugins.json');
}

function readRegistry() {
  const regPath = getRegistryPath();
  if (!fs.existsSync(regPath)) {
    return { version: 2, plugins: {} };
  }
  try {
    const data = JSON.parse(fs.readFileSync(regPath, 'utf8'));
    if (!data.plugins) data.plugins = {};
    return data;
  } catch {
    return { version: 2, plugins: {} };
  }
}

function writeRegistry(data) {
  const regPath = getRegistryPath();
  const dir = path.dirname(regPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(regPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

const PLUGIN_KEY = 'maestro@maestro-private';

// --- Install ---

function doInstall(srcRoot) {
  srcRoot = srcRoot || getSrcRoot();
  const info = getPluginInfo(srcRoot);
  const version = info.version;

  // D-03: cache dir
  const cacheDir = path.join(
    getHomeDir(), '.claude', 'plugins', 'cache',
    'maestro-private', 'maestro', version
  );

  // Create cache dir
  fs.mkdirSync(cacheDir, { recursive: true });

  // D-05: Copy files
  // .claude-plugin/
  fs.cpSync(
    path.join(srcRoot, '.claude-plugin'),
    path.join(cacheDir, '.claude-plugin'),
    { recursive: true }
  );

  // hooks/
  fs.cpSync(
    path.join(srcRoot, 'hooks'),
    path.join(cacheDir, 'hooks'),
    { recursive: true }
  );

  // scripts/*.js (non-test)
  const scriptsSrc = path.join(srcRoot, 'scripts');
  const scriptsDst = path.join(cacheDir, 'scripts');
  fs.mkdirSync(scriptsDst, { recursive: true });
  for (const file of fs.readdirSync(scriptsSrc)) {
    if (file.endsWith('.js') && !file.endsWith('.test.js')) {
      fs.copyFileSync(path.join(scriptsSrc, file), path.join(scriptsDst, file));
    }
  }

  // scripts/lib/*.js (non-test)
  const libSrc = path.join(scriptsSrc, 'lib');
  const libDst = path.join(scriptsDst, 'lib');
  if (fs.existsSync(libSrc)) {
    fs.mkdirSync(libDst, { recursive: true });
    for (const file of fs.readdirSync(libSrc)) {
      if (file.endsWith('.js') && !file.endsWith('.test.js')) {
        fs.copyFileSync(path.join(libSrc, file), path.join(libDst, file));
      }
    }
  }

  // skills/
  const skillsSrc = path.join(srcRoot, 'skills');
  if (fs.existsSync(skillsSrc)) {
    fs.cpSync(skillsSrc, path.join(cacheDir, 'skills'), { recursive: true });
  }

  // agents/
  const agentsSrc = path.join(srcRoot, 'agents');
  if (fs.existsSync(agentsSrc)) {
    fs.cpSync(agentsSrc, path.join(cacheDir, 'agents'), { recursive: true });
  }

  // D-06, D-07: Register in installed_plugins.json
  const registry = readRegistry();
  const now = new Date().toISOString();
  const existing = registry.plugins[PLUGIN_KEY];

  if (existing && existing.length > 0) {
    // D-09: Update — preserve installedAt, update lastUpdated
    const prev = existing[0];
    registry.plugins[PLUGIN_KEY] = [{
      scope: 'user',
      installPath: cacheDir,
      version: version,
      installedAt: prev.installedAt,
      lastUpdated: now,
    }];
  } else {
    registry.plugins[PLUGIN_KEY] = [{
      scope: 'user',
      installPath: cacheDir,
      version: version,
      installedAt: now,
      lastUpdated: now,
    }];
  }
  writeRegistry(registry);

  // D-11, D-12, D-13: Project-level coexistence warning
  const projectPlugin = path.join(srcRoot, '.claude-plugin', 'plugin.json');
  if (fs.existsSync(projectPlugin)) {
    console.log('Warning: Project-level .claude-plugin/ detected. Both global and project-level plugins will load (safe — all hooks are advisory).');
  }

  console.log(`Maestro v${version} installed globally.`);
}

// --- Uninstall ---

function doUninstall() {
  // D-10: Remove cache directory
  const cacheBase = path.join(
    getHomeDir(), '.claude', 'plugins', 'cache', 'maestro-private'
  );

  if (fs.existsSync(cacheBase)) {
    fs.rmSync(cacheBase, { recursive: true, force: true });
  }

  // Remove registry entry
  const registry = readRegistry();
  const existed = !!registry.plugins[PLUGIN_KEY];
  delete registry.plugins[PLUGIN_KEY];
  writeRegistry(registry);

  if (existed) {
    console.log('Maestro uninstalled.');
  } else {
    console.log('Maestro is not installed globally.');
  }
}

// --- GitHub Install ---

function doGithubInstall() {
  // D-08, D-09: Clone from GitHub and install globally
  // T-20-04: Hardcoded known-good URL, override only via env var (not CLI arg)
  const repoUrl = process.env.MAESTRO_GITHUB_REPO_URL || 'https://github.com/lyuxiaohei/Maestro.git';
  let cloneDir;
  let cleanupClone = false;

  try {
    if (process.env.MAESTRO_RELEASE_DIR) {
      // Test mode: use pre-cloned/prepared directory directly
      cloneDir = process.env.MAESTRO_RELEASE_DIR;
    } else {
      // Production: clone repo to temp directory
      cloneDir = fs.mkdtempSync(path.join(os.tmpdir(), 'maestro-github-'));
      cleanupClone = true;
      execSync(`git clone ${repoUrl} ${cloneDir}`, {
        timeout: 60000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    }

    // Run standard install from the cloned/prepared directory
    doInstall(cloneDir);
  } finally {
    // T-20-06: Cleanup temp dir, wrap in try/catch to prevent blocking
    if (cleanupClone && cloneDir) {
      try {
        fs.rmSync(cloneDir, { recursive: true, force: true });
      } catch {
        // Best effort cleanup — do not block on failure
      }
    }
  }
}

// --- Local ---

function doLocal() {
  const info = getPluginInfo();
  const version = info.version;

  // D-14: Register without copying files
  const registry = readRegistry();
  const now = new Date().toISOString();
  const existing = registry.plugins[PLUGIN_KEY];

  if (existing && existing.length > 0) {
    registry.plugins[PLUGIN_KEY] = [{
      scope: 'local',
      installPath: getSrcRoot(),
      version: version,
      installedAt: existing[0].installedAt,
      lastUpdated: now,
      projectPath: process.cwd(),
    }];
  } else {
    registry.plugins[PLUGIN_KEY] = [{
      scope: 'local',
      installPath: getSrcRoot(),
      version: version,
      installedAt: now,
      lastUpdated: now,
      projectPath: process.cwd(),
    }];
  }
  writeRegistry(registry);

  console.log(`Maestro v${version} registered locally for this project.`);
}

// --- Main ---

function main() {
  const args = process.argv.slice(2);

  try {
    if (args.includes('--uninstall')) {
      doUninstall();
    } else if (args.includes('--local')) {
      doLocal();
    } else if (args.includes('--from-github')) {
      doGithubInstall();
    } else {
      doInstall();
    }
  } catch (err) {
    process.stderr.write('Error: ' + err.message + '\n');
    process.exit(1);
  }
}

main();
