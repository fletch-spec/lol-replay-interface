# Session Logs

One file per Claude Code session, written at the end of it, for a human to read
later. `briefs/brief_log.md` records what happened to a *brief*; this records what
happened in a *session* - which is a different question once there have been forty
of them and you are trying to remember which one filed those issues, or how long
the harvest rewrite actually took.

Written by the `wrap-session` skill when Fletcher says **WRAP**. Not written
automatically, and not written mid-session - the stats are only true at the end.

## The rules

- **The stats are measured, never estimated.** They come from
  `node tools/session-stats.js`, which reads the session's
  own transcript. A model asked to recall its own token spend will produce a
  confident wrong number.
- **The goal is the user's goal, in the user's words** where possible - taken
  from the opening prompt, not reconstructed from what the session ended up
  doing. Those two differ often, and the difference is worth seeing.
- **"Left open" is the part that matters.** A session log that only records
  successes is a log nobody needs. Blocked steps, things deliberately not done,
  and decisions handed back to Fletcher all go there.
- **One file per session, never edited afterwards.** If a later session revisits
  the same work it gets its own file.
- **No secrets.** Transcripts contain everything typed; the log contains a
  summary. Do not paste raw transcript excerpts, tokens, or paths outside this
  repo.

## File naming

`docs/sessions/YYYY-MM-DD-NN-short-slug.md`, where `NN` is the session's number
within that day (`01`, `02`, …). Ordering by filename gives chronological order.

## The shape

See [`TEMPLATE.md`](TEMPLATE.md). Six sections, all short:

| Section | What goes in it |
|---|---|
| Frontmatter | session id, date, model, duration, tokens, branch |
| **Goal** | what was asked for, in one paragraph |
| **What happened** | 3-6 bullets - what was actually done |
| **Changed** | files, issues, briefs, commits - the durable output |
| **Left open** | blocked, deferred, or handed back |
| **Stats** | the table from `session-stats.js` |

## Index

Newest first. One line per session.

_No sessions logged yet - the first entry appears on the first WRAP._
