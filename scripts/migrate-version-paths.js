#!/usr/bin/env node

/**
 * migrate-version-paths.js — Migrate .planning/ from old structure to version-based structure.
 *
 * Old structure:
 *   .planning/workflows/{slug}/phases/{domain}/P##-{phase-slug}/P##-STATE.md
 *
 * New structure:
 *   .planning/{YYYYMM.PATCH}/workflows/{slug}/P##-{phase-slug}/STATE.md
 *
 * Changes:
 *   1. Read milestone from STATE.md (fallback: prompt user for version string)
 *   2. Create {version}/workflows/ directory structure
 *   3. Move workflow directories from old .planning/workflows/ to new {version}/workflows/
 *   4. For each workflow: flatten domain layer (phases/{domain}/P##-xxx/ → P##-xxx/)
 *   5. Rename files: P##-STATE.md → STATE.md, P##-CONTEXT.md → CONTEXT.md, etc.
 *
 * Usage:
 *   node scripts/migrate-version-paths.js [--dry-run] [--planning-dir <path>] [--version <YYYYMM.PATCH>]
 */

'use strict';

const fs = require('fs');
const path = require('path');

// --- Parse arguments ---

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const planningDirIdx = args.indexOf('--planning-dir');
const planningDir = planningDirIdx >= 0 ? args[planningDirIdx + 1] : resolveDefaultPlanningDir();
const versionIdx = args.indexOf('--version');
const explicitVersion = versionIdx >= 0 ? args[versionIdx + 1] : null;

const FILE_RENAMES = {
  'STATE.md': /^P\d+-STATE\.md$/,
  'CONTEXT.md': /^P\d+-CONTEXT\.md$/,
  'PLAN.md': /^P\d+-PLAN\.md$/,
  'OUTPUT.md': /^P\d+-OUTPUT\.md$/,
  'SUMMARY.md': /^P\d+-SUMMARY\.md$/,
  'VERIFICATION.md': /^P\d+-VERIFICATION\.md$/,
};

function resolveDefaultPlanningDir() {
  const base = process.env.MAESTRO_TEST_HOME || path.join(__dirname, '..');
  return path.join(base, '.planning');
}

function readCurrentMilestone(planningDir) {
  try {
    const statePath = path.join(planningDir, 'STATE.md');
    const raw = fs.readFileSync(statePath, 'utf8');
    const match = raw.match(/^current_milestone:\s*["']?(.+?)["']?\s*$/m);
    if (match) return match[1].trim();
  } catch { /* no STATE.md */ }
  return null;
}

function ensureCurrentMilestone(planningDir) {
  if (explicitVersion) return explicitVersion;
  const milestone = readCurrentMilestone(planningDir);
  if (milestone) return milestone;
  console.error('ERROR: Cannot determine version. Use --version YYYYMM.PATCH or set current_milestone in STATE.md');
  process.exit(1);
}

function getNewFileName(oldName) {
  for (const [newName, pattern] of Object.entries(FILE_RENAMES)) {
    if (pattern.test(oldName)) return newName;
  }
  return null;
}

function migratePhaseDir(phaseDir, targetPhaseDir, stats) {
  const entries = fs.readdirSync(phaseDir);
  for (const entry of entries) {
    const srcPath = path.join(phaseDir, entry);
    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      // P15 subdirectories (frontend/backend) — preserve structure
      const subTarget = path.join(targetPhaseDir, entry);
      if (!dryRun) fs.mkdirSync(subTarget, { recursive: true });
      migratePhaseDir(srcPath, subTarget, stats);
    } else {
      const newName = getNewFileName(entry);
      const finalName = newName || entry;
      const dstPath = path.join(targetPhaseDir, finalName);

      stats.filesRenamed += (newName ? 1 : 0);
      stats.filesCopied += 1;

      if (dryRun) {
        console.log(`  ${srcPath} → ${dstPath}${newName ? ` (rename: ${entry} → ${finalName})` : ''}`);
      } else {
        fs.copyFileSync(srcPath, dstPath);
      }
    }
  }
}

function migrateWorkflow(oldWfDir, newWfDir, stats) {
  const phasesDir = path.join(oldWfDir, 'phases');

  // Copy workflow-level files
  const wfEntries = fs.readdirSync(oldWfDir);
  for (const entry of wfEntries) {
    if (entry === 'phases') continue;
    const srcPath = path.join(oldWfDir, entry);
    const dstPath = path.join(newWfDir, entry);
    if (!dryRun) fs.copyFileSync(srcPath, dstPath);
    stats.filesCopied += 1;
    if (dryRun) console.log(`  ${srcPath} → ${dstPath}`);
  }

  // If no phases dir, this might be a lite workflow (flat files already handled above)
  if (!fs.existsSync(phasesDir)) return;

  // Flatten domain layer
  const domainDirs = fs.readdirSync(phasesDir, { withFileTypes: true });
  for (const domainEntry of domainDirs) {
    if (!domainEntry.isDirectory()) continue;
    const domainDir = path.join(phasesDir, domainEntry.name);
    const phaseEntries = fs.readdirSync(domainDir, { withFileTypes: true });

    for (const phaseEntry of phaseEntries) {
      if (!phaseEntry.isDirectory()) continue;
      const phaseDir = path.join(domainDir, phaseEntry.name);
      const targetPhaseDir = path.join(newWfDir, phaseEntry.name);

      stats.dirsFlattened += 1;

      if (dryRun) {
        console.log(`  [domain=${domainEntry.name}] ${phaseDir} → ${targetPhaseDir}`);
      } else {
        fs.mkdirSync(targetPhaseDir, { recursive: true });
      }

      migratePhaseDir(phaseDir, targetPhaseDir, stats);
    }
  }
}

function main() {
  console.log(`Maestro Path Migration`);
  console.log(`Planning dir: ${planningDir}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE'}`);
  console.log('');

  if (!fs.existsSync(planningDir)) {
    console.error(`ERROR: Planning directory not found: ${planningDir}`);
    process.exit(1);
  }

  // Check for old structure
  const oldWorkflowsDir = path.join(planningDir, 'workflows');
  if (!fs.existsSync(oldWorkflowsDir)) {
    console.log('No old workflows/ directory found. Nothing to migrate.');
    process.exit(0);
  }

  const version = ensureCurrentMilestone(planningDir);
  if (!/^\d{6}\.\d+$/.test(version)) {
    console.error(`ERROR: Invalid version format: ${version}. Expected YYYYMM.PATCH`);
    process.exit(1);
  }

  const versionDir = path.join(planningDir, version);
  const newWorkflowsDir = path.join(versionDir, 'workflows');

  console.log(`Target version: ${version}`);
  console.log(`Target path: ${newWorkflowsDir}`);
  console.log('');

  const stats = { filesCopied: 0, filesRenamed: 0, dirsFlattened: 0 };

  // Create target directory
  if (!dryRun) {
    fs.mkdirSync(newWorkflowsDir, { recursive: true });
  }

  // Migrate each workflow
  const workflowEntries = fs.readdirSync(oldWorkflowsDir, { withFileTypes: true });
  for (const entry of workflowEntries) {
    if (!entry.isDirectory()) continue;
    const oldWfDir = path.join(oldWorkflowsDir, entry.name);
    const newWfDir = path.join(newWorkflowsDir, entry.name);

    console.log(`Migrating workflow: ${entry.name}`);

    if (!dryRun) {
      fs.mkdirSync(newWfDir, { recursive: true });
    }

    migrateWorkflow(oldWfDir, newWfDir, stats);
  }

  // Update STATE.md with current_milestone
  if (!dryRun) {
    const statePath = path.join(planningDir, 'STATE.md');
    try {
      let stateContent = fs.readFileSync(statePath, 'utf8');
      if (!stateContent.includes('current_milestone:')) {
        stateContent = stateContent.replace(/^---\n/, `---\ncurrent_milestone: "${version}"\n`);
        fs.writeFileSync(statePath, stateContent);
        console.log(`\nAdded current_milestone: "${version}" to STATE.md`);
      }
    } catch { /* no STATE.md to update */ }
  }

  console.log('\n--- Migration Summary ---');
  console.log(`Workflows migrated: ${workflowEntries.filter(e => e.isDirectory()).length}`);
  console.log(`Files copied: ${stats.filesCopied}`);
  console.log(`Files renamed (prefix removed): ${stats.filesRenamed}`);
  console.log(`Directories flattened (domain removed): ${stats.dirsFlattened}`);

  if (dryRun) {
    console.log('\nDry run — no changes made. Remove --dry-run to execute.');
  } else {
    console.log('\nMigration complete.');
    console.log('Old .planning/workflows/ directory preserved. Delete manually after verification.');
  }
}

main();
