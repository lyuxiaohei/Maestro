#!/usr/bin/env node

/**
 * migrate-domains.js — Synchronous migration from old 6-domain to new 5-domain directory structure.
 *
 * Renames:
 *   phases/product/     -> phases/product-manager/   (rename)
 *   phases/design/      -> merge into product-manager/ (move contents, then remove)
 *   phases/architecture/ -> phases/architect/          (rename)
 *   phases/development/  -> stays as-is
 *   phases/testing/     -> phases/test-engineer/       (rename)
 *   phases/deployment/  -> phases/ops-engineer/        (rename)
 *
 * Usage:
 *   node scripts/migrate-domains.js [--dry-run] [--planning-dir <path>]
 *
 * Options:
 *   --planning-dir <path>  Planning directory (default: .planning/)
 *   --dry-run              Preview changes without modifying filesystem
 *
 * Environment:
 *   MAESTRO_TEST_HOME      If set, used as base for default planning-dir
 */

'use strict';

const fs = require('fs');
const path = require('path');

// --- Parse arguments ---
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
let planningDir = '.planning/';

const planningIdx = args.indexOf('--planning-dir');
if (planningIdx !== -1 && args[planningIdx + 1]) {
  planningDir = args[planningIdx + 1];
}

// MAESTRO_TEST_HOME overrides default if --planning-dir not specified
if (planningIdx === -1 && process.env.MAESTRO_TEST_HOME) {
  planningDir = path.join(process.env.MAESTRO_TEST_HOME, '.planning/');
}

// Ensure trailing separator
planningDir = planningDir.replace(/[\\/]?$/, path.sep);

// --- Domain mapping: old -> new ---
const RENAMES = {
  product: 'product-manager',
  architecture: 'architect',
  testing: 'test-engineer',
  deployment: 'ops-engineer'
};

// design/ is special: merge into product-manager/
const MERGE_SOURCE = 'design';
const MERGE_TARGET = 'product-manager';

// --- Utility functions ---

function log(msg) {
  console.log(`[migrate-domains] ${msg}`);
}

function logDryRun(msg) {
  console.log(`[migrate-domains][DRY-RUN] ${msg}`);
}

/**
 * Recursively copy a directory synchronously.
 */
function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Recursively remove a directory synchronously.
 */
function removeDirRecursive(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      removeDirRecursive(entryPath);
    } else {
      fs.unlinkSync(entryPath);
    }
  }
  fs.rmdirSync(dir);
}

/**
 * Merge contents of srcDir into destDir. Moves subdirectories and files.
 */
function mergeDirContents(srcDir, destDir, dryRun) {
  if (!fs.existsSync(srcDir)) {
    return;
  }
  fs.mkdirSync(destDir, { recursive: true });
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (fs.existsSync(destPath)) {
      if (entry.isDirectory()) {
        // Recursively merge subdirectories
        mergeDirContents(srcPath, destPath, dryRun);
      } else {
        // File conflict: overwrite
        if (dryRun) {
          logDryRun(`Overwrite file: ${destPath}`);
        } else {
          fs.copyFileSync(srcPath, destPath);
          log(`Overwrite file: ${destPath}`);
        }
      }
    } else {
      if (dryRun) {
        logDryRun(`Move: ${srcPath} -> ${destPath}`);
      } else {
        // Use rename if same device, otherwise copy+remove
        try {
          fs.renameSync(srcPath, destPath);
        } catch (_) {
          if (entry.isDirectory()) {
            copyDirRecursive(srcPath, destPath);
            removeDirRecursive(srcPath);
          } else {
            fs.copyFileSync(srcPath, destPath);
            fs.unlinkSync(srcPath);
          }
        }
        log(`Move: ${srcPath} -> ${destPath}`);
      }
    }
  }
}

/**
 * Write a MIGRATED.md marker in the old directory location.
 */
function writeMigratedMarker(dirPath, newDirName, dryRun) {
  const markerPath = path.join(path.dirname(dirPath), 'MIGRATED-' + path.basename(dirPath) + '.md');
  const content = `# Migrated\n\nThis directory has been migrated to: ${newDirName}/\nDate: ${new Date().toISOString()}\n`;
  if (dryRun) {
    logDryRun(`Write marker: ${markerPath}`);
  } else {
    fs.writeFileSync(markerPath, content, 'utf8');
    log(`Write marker: ${markerPath}`);
  }
}

/**
 * Update workflow.md domain section headers from old names to new names.
 */
function updateWorkflowMd(workflowMdPath, dryRun) {
  if (!fs.existsSync(workflowMdPath)) {
    return;
  }
  let content = fs.readFileSync(workflowMdPath, 'utf8');
  let modified = false;

  const replacements = [
    [/## 产品域/g, '## 产品/设计域'],
    [/## 设计域/g, '## 产品/设计域'],
    [/## 架构域/g, '## 架构域'],
    [/## 开发域/g, '## 开发域'],
    [/## 测试域/g, '## 测试域'],
    [/## 部署域/g, '## 部署域'],
    [/\bproduct\//g, 'product-manager/'],
    [/\bdesign\//g, 'product-manager/'],
    [/\barchitecture\//g, 'architect/'],
    [/\btesting\//g, 'test-engineer/'],
    [/\bdeployment\//g, 'ops-engineer/']
  ];

  for (const [pattern, replacement] of replacements) {
    const newContent = content.replace(pattern, replacement);
    if (newContent !== content) {
      content = newContent;
      modified = true;
    }
  }

  if (modified) {
    if (dryRun) {
      logDryRun(`Update domain headers: ${workflowMdPath}`);
    } else {
      fs.writeFileSync(workflowMdPath, content, 'utf8');
      log(`Update domain headers: ${workflowMdPath}`);
    }
  }
}

/**
 * Migrate a single workflow's phases directory.
 */
function migrateWorkflowPhases(phasesDir, dryRun) {
  if (!fs.existsSync(phasesDir)) {
    log(`No phases/ directory found at ${phasesDir}, skipping.`);
    return;
  }

  // 1. Handle simple renames
  for (const [oldName, newName] of Object.entries(RENAMES)) {
    const oldPath = path.join(phasesDir, oldName);
    const newPath = path.join(phasesDir, newName);

    if (!fs.existsSync(oldPath)) {
      continue; // Already renamed or never existed
    }
    if (fs.existsSync(newPath)) {
      log(`Target already exists: ${newPath}, skipping rename of ${oldPath}`);
      continue;
    }

    if (dryRun) {
      logDryRun(`Rename: ${oldPath} -> ${newPath}`);
    } else {
      try {
        fs.renameSync(oldPath, newPath);
      } catch (_) {
        copyDirRecursive(oldPath, newPath);
        removeDirRecursive(oldPath);
      }
      log(`Rename: ${oldPath} -> ${newPath}`);
    }
    writeMigratedMarker(oldPath, newName, dryRun);
  }

  // 2. Handle design/ merge into product-manager/
  const designPath = path.join(phasesDir, MERGE_SOURCE);
  const pmPath = path.join(phasesDir, MERGE_TARGET);

  if (fs.existsSync(designPath)) {
    log(`Merging ${designPath} into ${pmPath}`);
    mergeDirContents(designPath, pmPath, dryRun);

    // Write marker before removing source
    writeMigratedMarker(designPath, MERGE_TARGET, dryRun);

    // Remove the old design/ directory
    if (!dryRun) {
      removeDirRecursive(designPath);
      log(`Removed: ${designPath}`);
    } else {
      logDryRun(`Would remove: ${designPath}`);
    }
  } else {
    if (dryRun || fs.existsSync(pmPath)) {
      // design/ doesn't exist, nothing to merge
    }
  }
}

// --- Main ---

function main() {
  const workflowsDir = path.join(planningDir, 'workflows');

  if (isDryRun) {
    log('=== DRY-RUN MODE: No changes will be made ===');
  }
  log(`Planning directory: ${planningDir}`);

  if (!fs.existsSync(workflowsDir)) {
    log(`No workflows directory found at ${workflowsDir}, nothing to migrate.`);
    process.exit(0);
  }

  const entries = fs.readdirSync(workflowsDir, { withFileTypes: true });
  const workflowDirs = entries
    .filter(e => e.isDirectory())
    .map(e => path.join(workflowsDir, e.name));

  if (workflowDirs.length === 0) {
    log('No workflow directories found, nothing to migrate.');
    process.exit(0);
  }

  log(`Found ${workflowDirs.length} workflow(s) to migrate.`);

  for (const workflowDir of workflowDirs) {
    const workflowName = path.basename(workflowDir);
    log(`--- Migrating workflow: ${workflowName} ---`);

    const phasesDir = path.join(workflowDir, 'phases');
    migrateWorkflowPhases(phasesDir, isDryRun);

    // Update workflow.md if it exists
    const workflowMd = path.join(workflowDir, 'workflow.md');
    updateWorkflowMd(workflowMd, isDryRun);
  }

  log('=== Migration complete ===');
}

main();
