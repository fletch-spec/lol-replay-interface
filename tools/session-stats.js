#!/usr/bin/env node
/**
 * Reads a Claude Code session transcript and prints the stats a session log
 * needs. Exists so the numbers in docs/sessions/ are measured rather than
 * remembered - a model asked to estimate its own token spend will invent a
 * plausible number, and this repo's whole convention is that written-down
 * numbers are real ones.
 *
 * Usage, from the repo root:
 *   node .claude/skills/wrap-session/session-stats.js            # newest session
 *   node .claude/skills/wrap-session/session-stats.js <sessionId>
 *   node .claude/skills/wrap-session/session-stats.js --json
 *
 * Transcripts live in ~/.claude/projects/<cwd with non-alphanumerics as ->/.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const sessionArg = args.find((a) => !a.startsWith('--'));

const projectSlug = process.cwd().replace(/[^a-zA-Z0-9]/g, '-');
const dir = path.join(os.homedir(), '.claude', 'projects', projectSlug);

if (!fs.existsSync(dir)) {
  console.error(`No transcript directory for this project: ${dir}`);
  process.exit(1);
}

function pickTranscript() {
  if (sessionArg) {
    const explicit = path.join(dir, `${sessionArg.replace(/\.jsonl$/, '')}.jsonl`);
    if (!fs.existsSync(explicit)) {
      console.error(`No transcript for session ${sessionArg} in ${dir}`);
      process.exit(1);
    }
    return explicit;
  }
  // Newest by mtime. The live session is always the most recently written.
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.jsonl'))
    .map((f) => ({ f, m: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.m - a.m);
  if (!files.length) {
    console.error(`No .jsonl transcripts in ${dir}`);
    process.exit(1);
  }
  return path.join(dir, files[0].f);
}

const file = pickTranscript();
const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);

const stats = {
  sessionId: path.basename(file, '.jsonl'),
  transcript: file,
  cwd: null,
  gitBranch: null,
  cliVersion: null,
  startedAt: null,
  endedAt: null,
  wallClockMinutes: 0,
  activeMinutes: 0, // gaps longer than IDLE_GAP_MIN are treated as away-time
  models: {},
  turns: { assistant: 0, userPrompts: 0, sidechain: 0 },
  tokens: { input: 0, cacheCreate: 0, cacheRead: 0, output: 0 },
  toolCalls: {},
  userPromptPreviews: [],
};

const IDLE_GAP_MIN = 15;
const seenRequests = new Set(); // one usage record per API request, not per streamed line
const timestamps = [];

for (const line of lines) {
  let entry;
  try {
    entry = JSON.parse(line);
  } catch {
    continue;
  }

  if (entry.cwd && !stats.cwd) stats.cwd = entry.cwd;
  if (entry.gitBranch && !stats.gitBranch) stats.gitBranch = entry.gitBranch;
  if (entry.version && !stats.cliVersion) stats.cliVersion = entry.version;
  if (entry.timestamp) timestamps.push(new Date(entry.timestamp).getTime());

  if (entry.type === 'assistant' && entry.message) {
    // One API request can produce several transcript lines (one per content
    // block), so turns and usage are both counted per requestId - counting
    // lines roughly doubles every number.
    const key = entry.requestId || entry.uuid;
    const firstLineOfTurn = !seenRequests.has(key);
    if (firstLineOfTurn) {
      seenRequests.add(key);
      if (entry.isSidechain) stats.turns.sidechain++;
      else stats.turns.assistant++;
      const model = entry.message.model;
      if (model) stats.models[model] = (stats.models[model] || 0) + 1;

      const usage = entry.message.usage;
      if (usage) {
        stats.tokens.input += usage.input_tokens || 0;
        stats.tokens.cacheCreate += usage.cache_creation_input_tokens || 0;
        stats.tokens.cacheRead += usage.cache_read_input_tokens || 0;
        stats.tokens.output += usage.output_tokens || 0;
      }
    }

    const content = entry.message.content;
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block.type === 'tool_use' && block.name) {
          stats.toolCalls[block.name] = (stats.toolCalls[block.name] || 0) + 1;
        }
      }
    }
  }

  if (entry.type === 'user' && entry.message && !entry.isSidechain) {
    const content = entry.message.content;
    let text = null;
    if (typeof content === 'string') {
      text = content;
    } else if (Array.isArray(content)) {
      // Tool results arrive as user entries too - those are not prompts.
      if (content.some((b) => b.type === 'tool_result')) continue;
      const textBlock = content.find((b) => b.type === 'text');
      if (textBlock) text = textBlock.text;
    }
    if (text && text.trim() && !text.startsWith('<')) {
      stats.turns.userPrompts++;
      stats.userPromptPreviews.push(text.trim().replace(/\s+/g, ' ').slice(0, 160));
    }
  }
}

timestamps.sort((a, b) => a - b);
if (timestamps.length) {
  stats.startedAt = new Date(timestamps[0]).toISOString();
  stats.endedAt = new Date(timestamps[timestamps.length - 1]).toISOString();
  stats.wallClockMinutes = Math.round((timestamps[timestamps.length - 1] - timestamps[0]) / 60000);
  let active = 0;
  for (let i = 1; i < timestamps.length; i++) {
    const gap = (timestamps[i] - timestamps[i - 1]) / 60000;
    active += gap > IDLE_GAP_MIN ? 0 : gap;
  }
  stats.activeMinutes = Math.round(active);
}

stats.tokens.totalWritten = stats.tokens.input + stats.tokens.cacheCreate;
stats.tokens.total = stats.tokens.totalWritten + stats.tokens.cacheRead + stats.tokens.output;

if (asJson) {
  console.log(JSON.stringify(stats, null, 2));
  process.exit(0);
}

const n = (x) => x.toLocaleString('en-US');
const topTools = Object.entries(stats.toolCalls)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 8)
  .map(([name, count]) => `${name} ${count}`)
  .join(', ');

console.log(`session      ${stats.sessionId}`);
console.log(`transcript   ${stats.transcript}`);
console.log(`branch       ${stats.gitBranch || '-'}   cli ${stats.cliVersion || '-'}`);
console.log(`started      ${stats.startedAt}`);
console.log(`ended        ${stats.endedAt}`);
console.log(`duration     ${stats.wallClockMinutes} min wall clock, ~${stats.activeMinutes} min active (gaps >${IDLE_GAP_MIN}min excluded)`);
console.log(`model        ${Object.entries(stats.models).map(([m, c]) => `${m} (${c} turns)`).join(', ') || '-'}`);
console.log(`turns        ${stats.turns.assistant} assistant, ${stats.turns.userPrompts} user prompts, ${stats.turns.sidechain} subagent`);
console.log(`tokens       ${n(stats.tokens.output)} out, ${n(stats.tokens.totalWritten)} in (new), ${n(stats.tokens.cacheRead)} cache read`);
console.log(`             ${n(stats.tokens.total)} total across ${seenRequests.size} requests`);
console.log(`tools        ${topTools || '-'}`);
console.log('');
console.log('user prompts:');
for (const p of stats.userPromptPreviews) console.log(`  - ${p}`);
