/**
 * install.js — Maestro global install/uninstall/update script
 *
 * Uses GSD-style direct-write strategy:
 *   Skills  → ~/.claude/skills/maestro-<name>/SKILL.md
 *   Agents  → ~/.claude/agents/maestro-<name>.md
 *   Hooks   → ~/.claude/settings.json hooks field (absolute paths)
 *   Cache   → ~/.claude/plugins/cache/maestro-private/maestro/<version>/
 *
 * Usage:
 *   node scripts/install.js              — Global install (copies to cache, registers plugin)
 *   node scripts/install.js --uninstall  — Remove global install
 *   node scripts/install.js --local      — Register project path without copying files
 *   node scripts/install.js --from-github — Clone from GitHub and install globally
 *   node scripts/install.js --update     — Check GitHub for newer version and update
 *
 * Pure Node.js built-in modules. No npm dependencies.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// --- Constants ---

const PLUGIN_KEY = 'maestro@maestro-private';
const SKILL_PREFIX = 'maestro-';
const AGENT_PREFIX = 'maestro-';

// Hook definitions: [event, matcher|null, scriptName, timeout]
const HOOK_DEFS = [
  ['SessionStart', null, 'session-state.js', null],
  ['PreToolUse', 'Write|Edit', 'prompt-guard.js', 5],
  ['PreToolUse', 'Write|Edit', 'workflow-guard.js', 5],
  ['PreToolUse', 'Bash', 'validate-commit.js', 5],
  ['PostToolUse', 'Read', 'read-injection-scanner.js', 5],
  ['PostToolUse', 'Write|Edit', 'phase-boundary.js', 5],
  ['PostToolUse', 'Write|Edit', 'context-monitor.js', 10],
];

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

/** Normalize path to forward slashes (Node.js handles both on Windows). */
function fwdSlashes(p) {
  return p.replace(/\\/g, '/');
}

/** Resolve node executable path, normalized. */
function getNodeRunner() {
  return fwdSlashes(process.execPath);
}

// --- Registry (installed_plugins.json) ---

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

// --- Settings (settings.json) ---

function getSettingsPath() {
  return path.join(getHomeDir(), '.claude', 'settings.json');
}

function readSettings() {
  const settingsPath = getSettingsPath();
  if (!fs.existsSync(settingsPath)) return {};
  try {
    const raw = fs.readFileSync(settingsPath, 'utf8');
    // Strip single-line JSONC comments
    const stripped = raw.replace(/^\s*\/\/.*$/gm, '');
    return JSON.parse(stripped);
  } catch {
    return {};
  }
}

function writeSettings(settings) {
  const settingsPath = getSettingsPath();
  const dir = path.dirname(settingsPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
}

/**
 * Remove all Maestro hook entries from settings.hooks.
 * Returns true if any entries were removed.
 */
function removeMaestroHooks(settings) {
  if (!settings.hooks || typeof settings.hooks !== 'object') return false;

  let modified = false;
  for (const event of Object.keys(settings.hooks)) {
    const entries = settings.hooks[event];
    if (!Array.isArray(entries)) continue;

    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i];
      if (!entry.hooks || !Array.isArray(entry.hooks)) continue;

      // Filter out hooks whose command contains maestro-related paths
      const before = entry.hooks.length;
      entry.hooks = entry.hooks.filter(h => {
        if (!h.command || typeof h.command !== 'string') return true;
        const cmd = h.command.toLowerCase();
        return !(cmd.includes('maestro-private') || cmd.includes('/maestro/') ||
                 /maestro-(prompt-guard|session-state|read-injection|validate-commit|phase-boundary|context-monitor|workflow-guard)/.test(cmd));
      });

      if (entry.hooks.length < before) modified = true;

      // Remove entry if no hooks remain
      if (entry.hooks.length === 0) {
        entries.splice(i, 1);
      }
    }

    // Remove event key if no entries remain
    if (entries.length === 0) {
      delete settings.hooks[event];
    }
  }

  // Remove hooks key entirely if empty
  if (settings.hooks && Object.keys(settings.hooks).length === 0) {
    delete settings.hooks;
  }

  return modified;
}

// --- Skills Registration ---

function getSkillsDir() {
  return path.join(getHomeDir(), '.claude', 'skills');
}

function listMaestroSkills() {
  const skillsDir = getSkillsDir();
  if (!fs.existsSync(skillsDir)) return [];
  return fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name.startsWith(SKILL_PREFIX))
    .map(d => d.name);
}

function registerSkills(cacheDir) {
  const skillsSrc = path.join(cacheDir, 'skills');
  if (!fs.existsSync(skillsSrc)) {
    console.log('  No skills directory found, skipping skill registration.');
    return 0;
  }

  const skillsDir = getSkillsDir();
  fs.mkdirSync(skillsDir, { recursive: true });

  const oldSkills = listMaestroSkills();
  for (const name of oldSkills) {
    fs.rmSync(path.join(skillsDir, name), { recursive: true, force: true });
  }

  let count = 0;
  const entries = fs.readdirSync(skillsSrc, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillSrcPath = path.join(skillsSrc, entry.name);
    const skillMdPath = path.join(skillSrcPath, 'SKILL.md');
    if (!fs.existsSync(skillMdPath)) continue;

    const targetName = SKILL_PREFIX + entry.name;
    const targetPath = path.join(skillsDir, targetName);

    fs.cpSync(skillSrcPath, targetPath, { recursive: true });

    // Update frontmatter name to match the prefixed directory name
    const content = fs.readFileSync(path.join(targetPath, 'SKILL.md'), 'utf8');
    const nameFixed = content.replace(
      /^(\s*name:\s*)["']?[\w-]+["']?\s*$/m,
      `$1${targetName}`
    );
    fs.writeFileSync(path.join(targetPath, 'SKILL.md'), nameFixed, 'utf8');

    count++;
  }

  return count;
}

function unregisterSkills() {
  const oldSkills = listMaestroSkills();
  if (oldSkills.length === 0) return 0;

  const skillsDir = getSkillsDir();
  for (const name of oldSkills) {
    fs.rmSync(path.join(skillsDir, name), { recursive: true, force: true });
  }
  return oldSkills.length;
}

// --- Agents Registration (GSD-style direct write) ---

function getAgentsDir() {
  return path.join(getHomeDir(), '.claude', 'agents');
}

function listMaestroAgents() {
  const agentsDir = getAgentsDir();
  if (!fs.existsSync(agentsDir)) return [];
  return fs.readdirSync(agentsDir)
    .filter(f => f.startsWith(AGENT_PREFIX) && f.endsWith('.md'));
}

/**
 * Register agents directly into ~/.claude/agents/ as maestro-<name>.md.
 * Walks agents/orchestrator/ and agents/domain/ subdirectories.
 */
function registerAgents(cacheDir) {
  const agentsSrc = path.join(cacheDir, 'agents');
  if (!fs.existsSync(agentsSrc)) {
    console.log('  No agents directory found, skipping agent registration.');
    return 0;
  }

  const agentsDir = getAgentsDir();
  fs.mkdirSync(agentsDir, { recursive: true });

  // Remove old Maestro agents before re-registering
  const oldAgents = listMaestroAgents();
  for (const name of oldAgents) {
    fs.rmSync(path.join(agentsDir, name), { force: true });
  }

  let count = 0;
  const subdirs = fs.readdirSync(agentsSrc, { withFileTypes: true });

  for (const subdir of subdirs) {
    if (!subdir.isDirectory()) continue;
    const subPath = path.join(agentsSrc, subdir.name);
    const files = fs.readdirSync(subPath);

    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      const srcFile = path.join(subPath, file);
      const targetName = AGENT_PREFIX + file;
      fs.copyFileSync(srcFile, path.join(agentsDir, targetName));
      count++;
    }
  }

  return count;
}

function unregisterAgents() {
  const agents = listMaestroAgents();
  if (agents.length === 0) return 0;

  const agentsDir = getAgentsDir();
  for (const name of agents) {
    fs.rmSync(path.join(agentsDir, name), { force: true });
  }
  return agents.length;
}

// --- Hooks Registration (GSD-style direct write to settings.json) ---

/**
 * Build a hook command string with absolute paths.
 * Format: "<node-path>" "<script-path>"
 */
function buildHookCommand(scriptsDir, scriptName) {
  const nodeRunner = JSON.stringify(getNodeRunner());
  const scriptPath = JSON.stringify(fwdSlashes(path.join(scriptsDir, scriptName)));
  return `${nodeRunner} ${scriptPath}`;
}

/**
 * Register Maestro hooks into ~/.claude/settings.json.
 * Removes old Maestro hooks first, then adds new ones with absolute paths.
 * Preserves all non-Maestro hooks.
 */
function registerHooks(cacheDir) {
  const scriptsDir = path.join(cacheDir, 'scripts');

  // Check that at least one hook script exists
  const hasScripts = HOOK_DEFS.some(([, , script]) =>
    fs.existsSync(path.join(scriptsDir, script))
  );
  if (!hasScripts) {
    console.log('  No hook scripts found, skipping hook registration.');
    return 0;
  }

  const settings = readSettings();

  // Remove old Maestro hooks first
  removeMaestroHooks(settings);

  // Ensure hooks object exists (removeMaestroHooks may delete it if empty)
  if (!settings.hooks) settings.hooks = {};

  let count = 0;
  for (const [event, matcher, scriptName, timeout] of HOOK_DEFS) {
    const scriptPath = path.join(scriptsDir, scriptName);
    if (!fs.existsSync(scriptPath)) continue;

    const command = buildHookCommand(scriptsDir, scriptName);
    const hook = { type: 'command', command };
    if (timeout != null) hook.timeout = timeout;

    const entry = matcher ? { matcher, hooks: [hook] } : { hooks: [hook] };

    if (!settings.hooks[event]) settings.hooks[event] = [];
    settings.hooks[event].push(entry);
    count++;
  }

  if (count > 0) {
    writeSettings(settings);
  }

  return count;
}

/**
 * Remove all Maestro hooks from ~/.claude/settings.json.
 */
function unregisterHooks() {
  const settings = readSettings();
  const modified = removeMaestroHooks(settings);
  if (modified) {
    writeSettings(settings);
  }
  return modified;
}

/**
 * Register Maestro statusline into ~/.claude/settings.json.
 * Sets settings.statusLine to point to the statusline.js script.
 */
function registerStatusline(cacheDir) {
  const scriptPath = path.join(cacheDir, 'scripts', 'statusline.js');
  if (!fs.existsSync(scriptPath)) {
    console.log('  statusline.js not found, skipping statusLine registration.');
    return false;
  }

  const settings = readSettings();
  const command = `${JSON.stringify(getNodeRunner())} ${JSON.stringify(fwdSlashes(scriptPath))}`;
  settings.statusLine = { type: 'command', command };
  writeSettings(settings);
  return true;
}

/**
 * Remove Maestro statusline from ~/.claude/settings.json.
 */
function unregisterStatusline() {
  const settings = readSettings();
  if (settings.statusLine && settings.statusLine.command &&
      typeof settings.statusLine.command === 'string' &&
      settings.statusLine.command.includes('maestro')) {
    delete settings.statusLine;
    writeSettings(settings);
    return true;
  }
  return false;
}

// --- Verification ---

/**
 * Extract relative file paths from SKILL.md content (markdown links only).
 */
function extractRelativePaths(content) {
  const refs = new Set();
  const mdLinkRe = /\]\((\.?\/?[\w.-]+(?:\/[\w.-]+)*)\)/g;
  let m;
  while ((m = mdLinkRe.exec(content)) !== null) {
    const ref = m[1];
    if (ref.startsWith('http') || ref.startsWith('#') || ref.includes('{')) continue;
    refs.add(ref);
  }
  return [...refs];
}

/**
 * Post-install verification: check skills, agents, and hooks.
 */
function verifyInstallation() {
  const skillsDir = getSkillsDir();
  const skills = listMaestroSkills();
  const agents = listMaestroAgents();
  const errors = [];

  // 1. Skills verification
  if (skills.length === 0) {
    errors.push('No skills registered');
  }

  for (const skillName of skills) {
    const skillDir = path.join(skillsDir, skillName);
    const skillMd = path.join(skillDir, 'SKILL.md');

    if (!fs.existsSync(skillMd)) {
      errors.push(`${skillName}: SKILL.md missing`);
      continue;
    }

    let content;
    try {
      content = fs.readFileSync(skillMd, 'utf8');
    } catch {
      errors.push(`${skillName}: SKILL.md unreadable`);
      continue;
    }

    const fmMatch = content.match(/^---[\r?\n]([\s\S]*?)^---$/m);
    if (!fmMatch || !/^name:/m.test(fmMatch[1])) {
      errors.push(`${skillName}: frontmatter missing name field`);
    }

    const refs = extractRelativePaths(content);
    for (const ref of refs) {
      if (ref.includes('{') || ref.includes('P##') || ref.includes('$')) continue;
      if (!fs.existsSync(path.join(skillDir, ref))) {
        errors.push(`${skillName}: broken ref → ${ref}`);
      }
    }
  }

  // 2. Agents verification
  if (agents.length === 0) {
    errors.push('No agents registered');
  }

  // 3. Hooks verification
  const settings = readSettings();
  let hookCount = 0;
  if (settings.hooks) {
    for (const entries of Object.values(settings.hooks)) {
      if (!Array.isArray(entries)) continue;
      for (const entry of entries) {
        if (!entry.hooks) continue;
        for (const h of entry.hooks) {
          if (h.command && h.command.includes('maestro')) hookCount++;
        }
      }
    }
  }
  if (hookCount === 0) {
    errors.push('No Maestro hooks found in settings.json');
  }

  if (errors.length > 0) {
    console.error('Installation verification found issues:');
    errors.forEach(e => console.error(`  ✗ ${e}`));
    return false;
  }

  console.log(`  Verified: ${skills.length} skills, ${agents.length} agents, ${hookCount} hooks — all valid`);
  return true;
}

// --- Install ---

function doInstall(srcRoot) {
  srcRoot = srcRoot || getSrcRoot();
  const info = getPluginInfo(srcRoot);
  const version = info.version;

  const cacheDir = path.join(
    getHomeDir(), '.claude', 'plugins', 'cache',
    'maestro-private', 'maestro', version
  );

  fs.mkdirSync(cacheDir, { recursive: true });

  // Copy files to cache
  fs.cpSync(path.join(srcRoot, '.claude-plugin'), path.join(cacheDir, '.claude-plugin'), { recursive: true });
  fs.cpSync(path.join(srcRoot, 'hooks'), path.join(cacheDir, 'hooks'), { recursive: true });

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

  // Register in installed_plugins.json (version tracking)
  const registry = readRegistry();
  const now = new Date().toISOString();
  const existing = registry.plugins[PLUGIN_KEY];

  if (existing && existing.length > 0) {
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

  // Direct-write registration (GSD-style)
  const skillCount = registerSkills(cacheDir);
  if (skillCount > 0) {
    console.log(`  ${skillCount} skills registered to ~/.claude/skills/`);
  }

  const agentCount = registerAgents(cacheDir);
  if (agentCount > 0) {
    console.log(`  ${agentCount} agents registered to ~/.claude/agents/`);
  }

  const hookCount = registerHooks(cacheDir);
  if (hookCount > 0) {
    console.log(`  ${hookCount} hooks registered to ~/.claude/settings.json`);
  }

  const statuslineRegistered = registerStatusline(cacheDir);
  if (statuslineRegistered) {
    console.log('  statusLine registered to ~/.claude/settings.json');
  }

  console.log(`Maestro v${version} installed globally.`);

  verifyInstallation();
}

// --- Uninstall ---

function doUninstall() {
  const cacheBase = path.join(
    getHomeDir(), '.claude', 'plugins', 'cache', 'maestro-private'
  );

  if (fs.existsSync(cacheBase)) {
    fs.rmSync(cacheBase, { recursive: true, force: true });
  }

  const registry = readRegistry();
  const existed = !!registry.plugins[PLUGIN_KEY];
  delete registry.plugins[PLUGIN_KEY];
  writeRegistry(registry);

  if (existed) {
    const skillCount = unregisterSkills();
    if (skillCount > 0) {
      console.log(`  ${skillCount} skills unregistered`);
    }

    const agentCount = unregisterAgents();
    if (agentCount > 0) {
      console.log(`  ${agentCount} agents unregistered`);
    }

    const hooksRemoved = unregisterHooks();
    if (hooksRemoved) {
      console.log('  Hooks removed from settings.json');
    }

    const statuslineRemoved = unregisterStatusline();
    if (statuslineRemoved) {
      console.log('  statusLine removed from settings.json');
    }

    console.log('Maestro uninstalled.');
  } else {
    console.log('Maestro is not installed globally.');
  }
}

// --- GitHub Install ---

function doGithubInstall() {
  const repoUrl = process.env.MAESTRO_GITHUB_REPO_URL || 'https://github.com/lyuxiaohei/Maestro.git';
  let cloneDir;
  let cleanupClone = false;

  try {
    if (process.env.MAESTRO_RELEASE_DIR) {
      cloneDir = process.env.MAESTRO_RELEASE_DIR;
    } else {
      cloneDir = fs.mkdtempSync(path.join(os.tmpdir(), 'maestro-github-'));
      cleanupClone = true;
      execSync(`git clone ${repoUrl} ${cloneDir}`, {
        timeout: 60000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    }

    doInstall(cloneDir);
  } finally {
    if (cleanupClone && cloneDir) {
      try {
        fs.rmSync(cloneDir, { recursive: true, force: true });
      } catch {
        // Best effort cleanup
      }
    }
  }
}

// --- Update ---

/**
 * Compare two CalVer version strings (YYYYMM.PATCH format).
 * Returns: negative if a < b, 0 if equal, positive if a > b.
 */
function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na !== nb) return na - nb;
  }
  return 0;
}

/**
 * Fetch latest version from GitHub raw URL without cloning.
 */
function fetchLatestVersion() {
  const rawUrl = 'https://raw.githubusercontent.com/lyuxiaohei/Maestro/main/.claude-plugin/plugin.json';
  try {
    const result = execSync(
      `curl -sS --connect-timeout 10 --max-time 15 "${rawUrl}"`,
      { encoding: 'utf8', timeout: 20000, stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const data = JSON.parse(result);
    return data.version || null;
  } catch {
    return null;
  }
}

/**
 * Remove old version cache directories, keeping only the current version.
 */
function cleanOldCaches(currentVersion) {
  const cacheBase = path.join(getHomeDir(), '.claude', 'plugins', 'cache', 'maestro-private', 'maestro');
  if (!fs.existsSync(cacheBase)) return 0;

  let removed = 0;
  for (const entry of fs.readdirSync(cacheBase, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name === currentVersion) continue;
    fs.rmSync(path.join(cacheBase, entry.name), { recursive: true, force: true });
    removed++;
  }
  return removed;
}

function doUpdate() {
  // Check if Maestro is installed
  const registry = readRegistry();
  const entry = registry.plugins[PLUGIN_KEY];
  if (!entry || entry.length === 0) {
    console.log('Maestro is not installed. Run with --from-github to install first.');
    process.exit(1);
  }

  const currentVersion = entry[0].version;
  console.log(`Current version: v${currentVersion}`);
  console.log('Checking for updates...');

  const latestVersion = fetchLatestVersion();
  if (!latestVersion) {
    console.log('Unable to reach GitHub. Check your network and try again.');
    process.exit(1);
  }

  if (compareVersions(latestVersion, currentVersion) <= 0) {
    // Still clean old caches even if up to date
    const removed = cleanOldCaches(currentVersion);
    if (removed > 0) {
      console.log(`  Cleaned ${removed} old cache version(s).`);
    }
    console.log(`Already up to date (v${currentVersion}).`);
    return;
  }

  console.log(`Update available: v${currentVersion} → v${latestVersion}`);

  // Reinstall from GitHub
  doGithubInstall();

  // Clean old caches after successful install
  const removed = cleanOldCaches(latestVersion);
  if (removed > 0) {
    console.log(`  Cleaned ${removed} old cache version(s).`);
  }

  console.log(`Updated to v${latestVersion}.`);
}

// --- Local ---

function doLocal() {
  const info = getPluginInfo();
  const version = info.version;

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

  // Direct-write registration (GSD-style) from source directory
  const skillCount = registerSkills(getSrcRoot());
  if (skillCount > 0) {
    console.log(`  ${skillCount} skills registered to ~/.claude/skills/`);
  }

  const agentCount = registerAgents(getSrcRoot());
  if (agentCount > 0) {
    console.log(`  ${agentCount} agents registered to ~/.claude/agents/`);
  }

  const hookCount = registerHooks(getSrcRoot());
  if (hookCount > 0) {
    console.log(`  ${hookCount} hooks registered to ~/.claude/settings.json`);
  }

  const statuslineRegistered = registerStatusline(getSrcRoot());
  if (statuslineRegistered) {
    console.log('  statusLine registered to ~/.claude/settings.json');
  }

  console.log(`Maestro v${version} registered locally for this project.`);

  verifyInstallation();
}

// --- Main ---

function main() {
  const args = process.argv.slice(2);

  try {
    if (args.includes('--uninstall')) {
      doUninstall();
    } else if (args.includes('--update')) {
      doUpdate();
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
