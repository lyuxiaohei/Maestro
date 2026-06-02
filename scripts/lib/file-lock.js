// maestro-hook-version: 202606.0
/**
 * file-lock.js — Advisory file lock module for Maestro
 *
 * Implements O_CREAT + O_EXCL atomic locking to protect concurrent writes
 * to workflow.md and STATE.md files. Advisory-only — never throws on failure.
 *
 * Lock file content (JSON): { pid, timestamp, session }
 *
 * Exports:
 *   acquireLock(lockPath, options) — try to acquire lock
 *   releaseLock(lockPath)          — release lock (delete .lock file)
 *   withLock(lockPath, fn, options) — acquire → execute fn → release
 *
 * Pure Node.js built-in modules. No npm dependencies.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds stale lock expiry

// Track locks held by this process for cleanup on exit
const heldLocks = new Set();

// Register cleanup on process exit
process.on('exit', () => {
  for (const lockPath of heldLocks) {
    try {
      fs.unlinkSync(lockPath);
    } catch { /* best effort cleanup */ }
  }
  heldLocks.clear();
});

/**
 * Attempt to acquire an advisory file lock.
 * Uses O_CREAT + O_EXCL (fs.openSync with 'wx' flag) for atomic creation.
 *
 * @param {string} lockPath - Path to the .lock file
 * @param {object} [options]
 * @param {number} [options.timeoutMs=30000] - Stale lock expiry in ms
 * @param {string} [options.session] - Session identifier
 * @returns {{ acquired: boolean, lockPath: string, age: number|null, reason: string|null }}
 */
function acquireLock(lockPath, options) {
  options = options || {};
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const session = options.session || '';

  // Check for stale lock
  try {
    const stat = fs.statSync(lockPath);
    const age = Date.now() - stat.mtimeMs;
    if (age > timeoutMs) {
      // Stale lock — clean up and retry
      try { fs.unlinkSync(lockPath); } catch {
        return { acquired: false, lockPath, age, reason: 'cannot_remove_stale_lock' };
      }
    } else {
      // Active lock held by another process
      let lockInfo = {};
      try {
        lockInfo = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
      } catch { /* ignore parse errors */ }
      return { acquired: false, lockPath, age, reason: 'locked', lockInfo };
    }
  } catch {
    // Lock file does not exist — proceed to create
  }

  // Atomic create with O_CREAT + O_EXCL
  try {
    const fd = fs.openSync(lockPath, 'wx');
    const lockContent = JSON.stringify({
      pid: process.pid,
      timestamp: new Date().toISOString(),
      session: session,
    });
    fs.writeSync(fd, lockContent);
    fs.closeSync(fd);
    heldLocks.add(lockPath);
    return { acquired: true, lockPath, age: null, reason: null };
  } catch (err) {
    // Race condition: another process created the lock between our check and create
    if (err.code === 'EEXIST') {
      return { acquired: false, lockPath, age: null, reason: 'race_condition' };
    }
    // Other errors (permissions, disk full, etc.) — advisory, don't throw
    return { acquired: false, lockPath, age: null, reason: err.code || 'unknown' };
  }
}

/**
 * Release a lock by deleting the .lock file.
 *
 * @param {string} lockPath - Path to the .lock file
 * @returns {boolean} true if released, false if already gone or error
 */
function releaseLock(lockPath) {
  try {
    fs.unlinkSync(lockPath);
    heldLocks.delete(lockPath);
    return true;
  } catch {
    heldLocks.delete(lockPath);
    return false;
  }
}

/**
 * High-order function: acquire lock, execute fn, release lock.
 * If lock acquisition fails, fn is not called and a fallback result is returned.
 *
 * @param {string} lockPath - Path to the .lock file
 * @param {Function} fn - Synchronous function to execute under lock
 * @param {object} [options] - Options passed to acquireLock
 * @returns {{ result: any, locked: boolean, reason: string|null }}
 */
function withLock(lockPath, fn, options) {
  const lockResult = acquireLock(lockPath, options);
  if (!lockResult.acquired) {
    return { result: undefined, locked: false, reason: lockResult.reason };
  }

  try {
    const result = fn();
    return { result, locked: true, reason: null };
  } finally {
    releaseLock(lockPath);
  }
}

module.exports = { acquireLock, releaseLock, withLock };
