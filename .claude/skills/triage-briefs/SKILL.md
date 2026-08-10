---
name: triage-briefs
description: Triage open GitHub issues on this repo (fletch-spec/lol-replay-interface) into commissions and a queue order. Use when the brief queue is empty or thin and issues have piled up, or when the user says "triage the issues", "fill the queue", or "what should we work on next". This is the triage mode of /opsu - it needs an Opus session, produces commissions rather than briefs, and never touches app/ code.
---

# Triage issues into commissions

This is the natural-language trigger for what `/opsu triage` does. It exists so
"the queue is thin, what's next?" reaches the right procedure without the user
having to remember a command name.

**Go read [`.claude/skills/opsu/SKILL.md`](../opsu/SKILL.md) and follow it in
`triage` mode.** That file declares the tier and routes; the procedure itself
lives in [`briefs/TRIAGE.md`](../../../briefs/TRIAGE.md).

Two things worth knowing before you start, because they changed on 2026-08-10 and
an older habit will produce the wrong output:

- **Triage does not write briefs any more.** It dispositions issues, orders the
  queue, cuts it into lanes, and writes a commission per `Brief` disposition into
  `brief_log.md`. `briefs/AUTHOR.md` turns each commission into a file, one
  session per brief. A triage pass that also authors has to hold every issue
  *and* every brief's line anchors in one context, and that context gets re-read
  on every turn for the rest of the session - which is what the split fixed.
- **Open the code far enough to disposition, and no further.** Triage needs the
  mechanism; authoring needs the line. One grep for the owning symbol is usually
  the whole budget.

The scope test is unchanged and still gets said out loud, per issue, even when
the answer is obviously "keep":

> If a feature doesn't help someone talk over a replay in real time, it's out.
