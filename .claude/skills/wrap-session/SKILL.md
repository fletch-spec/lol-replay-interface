---
name: wrap-session
description: Close out a Claude Code session on the LoL Replay Controller repo by writing a session log to docs/sessions/. Use when the user says "WRAP", "wrap the session", "wrap up", "that's it for today", or otherwise ends a working session on C:\dev\lol-replay-interface. Measures real stats from the session transcript (model, duration, tokens, tools), records the goal and what was left open, updates the session index, then commits and pushes everything so nothing is left in the working tree.
---

# Wrap a session

Writes one file to `docs/sessions/` recording what this session was for, what it
did, and what it left open - with **measured** stats, not remembered ones. The
conventions live in [`docs/sessions/README.md`](../../../docs/sessions/README.md);
the shape lives in [`TEMPLATE.md`](../../../docs/sessions/TEMPLATE.md). Read both
before writing.

## Steps

1. **Measure first.** From the repo root:

   ```bash
   node tools/session-stats.js
   ```

   It finds this session's transcript (newest in
   `~/.claude/projects/C--dev-lol-replay-interface/`), and prints model, wall
   clock and active duration, turn counts, token totals and tool usage. Pass a
   session id to target a specific one, or `--json` for the raw object.

   **Every number in the log comes from this output.** Do not estimate any of
   them, and do not round the token figures beyond the nearest thousand.

2. **Check what actually changed**, rather than trusting recall:

   ```bash
   git status --short && git log --oneline -5
   ```

   Also note issues filed or closed this session, and briefs written or moved
   between `briefs/ready/` and `briefs/archive/`.

3. **Ask before guessing.** If anything is genuinely ambiguous - whether a piece
   of work counts as finished, whether something half-done should be recorded as
   blocked or as deferred - ask in one message. One round of questions, not a
   negotiation.

4. **Write the log** to `docs/sessions/YYYY-MM-DD-NN-short-slug.md` following
   `TEMPLATE.md`. `NN` is the session's number that day; check the directory.

   - The **Goal** is the opening prompt's goal, in Fletcher's words. If the
     session ended up somewhere else, say that in the same paragraph - do not
     retrofit the goal to the outcome.
   - **Left open** is the section a future session actually reads. Blocked steps
     with what unblocks them, work deliberately skipped with the reason, and
     anything waiting on Fletcher.
   - Keep it readable. This is prose for a person, not a changelog.

5. **Update the index** at the bottom of `docs/sessions/README.md` - one line,
   newest first: `- [YYYY-MM-DD - title](file.md) - one-clause hook`. Remove the
   "no sessions logged yet" placeholder on the first entry.

6. **Commit and push everything, always.** A wrap ends with a clean working tree
   and `origin/main` up to date. No exceptions, no asking - this is a standing
   instruction from Fletcher (2026-08-08), given after briefs 022-026 and a
   whole UI overhaul sat uncommitted for a day:

   ```bash
   git add -A && git status --short && git push origin main
   ```

   Commit in logical units where the work splits cleanly (shipped brief vs
   triage vs docs), one commit where it does not. Then verify:

   ```bash
   git status --short && git log --oneline origin/main..main
   ```

   Both must come back empty. If either does not, say so loudly in the report -
   a wrap that leaves work behind has not wrapped.

7. **Report, then stop.** Print the log path, the commit hashes pushed, and a
   two-line summary.

## Rules

- **GitHub is the source of truth.** Nothing this session produced may exist only
  on this machine once the wrap is done - not code, not briefs, not the log
  itself. If something genuinely should not be pushed, say which file and why,
  rather than leaving it silently in the tree.
- **Measured, not remembered.** Any stat that did not come out of
  `session-stats.js` or `git` does not go in the file.
- **Record the failures.** A session that spent forty minutes on something that
  did not work has recorded the most useful thing in the log. Say what did not
  work and how long it cost.
- **One file per session, never edited later.** A follow-up session gets its own
  file.
- **No transcript excerpts, no secrets, no absolute paths outside this repo.**
- **This is not `brief_log.md`.** Brief state changes still go there, in the
  brief queue's own rhythm. The session log points at them; it does not replace
  them.
