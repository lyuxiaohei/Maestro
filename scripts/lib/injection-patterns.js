// maestro-hook-version: 0.51.0
/**
 * injection-patterns.js — Maestro shared injection detection pattern library
 *
 * Exports:
 *   getPatterns()           — returns 18 injection pattern objects {regex, severity, name, category}
 *   scanContent(content)    — scans string, returns matched patterns [{name, severity, match}]
 *   hasInvisibleUnicode(content) — detects zero-width/soft-hyphen/homoglyph characters
 *
 * Pure Node.js built-in modules. No npm dependencies.
 */

'use strict';

const INJECTION_PATTERNS = [
  // Category: 指令忽略 (Instruction Override)
  { name: 'ignore-previous', category: '指令忽略',
    regex: new RegExp('ignore\\s+(all\\s+)?previous\\s+instructions', 'i'), severity: 'HIGH' },
  { name: 'disregard-rules', category: '指令忽略',
    regex: new RegExp('disregard\\s+(all\\s+)?(your\\s+)?rules', 'i'), severity: 'HIGH' },
  { name: 'forget-instructions', category: '指令忽略',
    regex: new RegExp('forget\\s+(all\\s+)?(your\\s+)?instructions', 'i'), severity: 'HIGH' },

  // Category: 系统提示提取 (System Prompt Extraction)
  { name: 'system-prompt', category: '系统提示提取',
    regex: new RegExp('system\\s+prompt', 'i'), severity: 'MEDIUM' },
  { name: 'reveal-instructions', category: '系统提示提取',
    regex: new RegExp('(?:print|output|reveal|show|display|repeat)\\s+(?:your\\s+)?(?:system\\s+)?(?:prompt|instructions)', 'i'), severity: 'HIGH' },
  { name: 'show-prompt', category: '系统提示提取',
    regex: new RegExp('show\\s+me\\s+your\\s+prompt', 'i'), severity: 'MEDIUM' },

  // Category: 角色切换 (Role Switching)
  { name: 'you-are-now', category: '角色切换',
    regex: new RegExp('you\\s+are\\s+now', 'i'), severity: 'HIGH' },
  { name: 'pretend-you-are', category: '角色切换',
    regex: new RegExp('pretend\\s+(that\\s+)?you\\s+are', 'i'), severity: 'HIGH' },
  { name: 'act-as-if', category: '角色切换',
    regex: new RegExp('act\\s+as\\s+if\\s+you', 'i'), severity: 'MEDIUM' },

  // Category: 越狱 (Jailbreak)
  { name: 'dan-mode', category: '越狱',
    regex: new RegExp('DAN\\s+mode', 'i'), severity: 'HIGH' },
  { name: 'developer-mode', category: '越狱',
    regex: new RegExp('developer\\s+mode', 'i'), severity: 'HIGH' },
  { name: 'jailbreak', category: '越狱',
    regex: new RegExp('jailbreak', 'i'), severity: 'HIGH' },

  // Category: 标签注入 (Tag Injection)
  { name: 'system-tag-close', category: '标签注入',
    regex: new RegExp('<\\/?system>', 'i'), severity: 'HIGH' },
  { name: 'system-tag-bracket', category: '标签注入',
    regex: new RegExp('\\[SYSTEM\\]|<<\\s*SYS\\s*>>', 'i'), severity: 'MEDIUM' },

  // Category: 摘要存活 (Summarization Survival)
  { name: 'when-summarizing-retain', category: '摘要存活',
    regex: new RegExp('when\\s+(?:summari[sz]ing|compressing|compacting),?\\s+(?:retain|preserve|keep)\\s+(?:this|these)', 'i'), severity: 'HIGH' },
  { name: 'instruction-permanent', category: '摘要存活',
    regex: new RegExp('this\\s+(?:instruction|directive|rule)\\s+is\\s+(?:permanent|persistent|immutable)', 'i'), severity: 'HIGH' },
  { name: 'preserve-rules-through', category: '摘要存活',
    regex: new RegExp('preserve\\s+(?:these|this)\\s+(?:rules?|instructions?|directives?)\\s+(?:in|through|after|during)', 'i'), severity: 'HIGH' },
  { name: 'retain-through-compress', category: '摘要存活',
    regex: new RegExp('(?:retain|keep)\\s+(?:this|these)\\s+(?:in|through|after)\\s+(?:summar|compress|compact)', 'i'), severity: 'HIGH' },
];

function getPatterns() {
  return INJECTION_PATTERNS;
}

function scanContent(content) {
  if (typeof content !== 'string') return [];
  const matches = [];
  for (const p of INJECTION_PATTERNS) {
    const m = content.match(p.regex);
    if (m) {
      matches.push({ name: p.name, severity: p.severity, match: m[0] });
    }
  }
  return matches;
}

function hasInvisibleUnicode(content) {
  if (typeof content !== 'string') return false;
  // Zero-width characters: U+200B-U+200F, U+FEFF
  // Soft hyphen: U+00AD
  // Cyrillic homoglyphs mixed into Latin text: U+0430-U+044F
  const invisibleRegex = /[​-‏﻿­а-я]/;
  if (invisibleRegex.test(content)) return true;

  // Unicode tag block U+E0000-E007F (invisible instruction injection vector)
  // Used to embed hidden text that survives copy-paste and is invisible to users
  try {
    if (/[\u{E0000}-\u{E007F}]/u.test(content)) return true;
  } catch {
    // Engine does not support Unicode property escapes -- skip this check
  }

  return false;
}

module.exports = { getPatterns, scanContent, hasInvisibleUnicode };
