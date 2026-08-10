---
name: stonne
description: Start a Sonnet build session on the LoL Replay Controller brief queue. Runs the preflight checks that decide whether a brief can be built right now - model tier, branch state, unreviewed reports, lane collisions - then hands off to briefs/PASSOFF.md. Use when the user types /stonne, or says they want to build, execute, run or ship a brief. Takes an optional brief number; defaults to the head of the queue.
---

# Start a build session

The procedure lives in [`briefs/PASSOFF.md`](../../../briefs/PASSOFF.md).
**This file is the gate, not the process** - it decides whether the build should
start at all, then gets out of the way.

## 1. Declare the tier, before anything else

Say out loud which model you are running as.

**If you are not a Sonnet model, stop.** Print exactly what is wrong and what to
do about it, and do not read the brief, the queue or the code:

> This is a Sonnet role and you're running <model>. Switch in the app's model
> picker and run /stonne again. Nothing has been read yet, so nothing is wasted.

That refusal is the whole point of the gate. A build run on Opus costs several
times what it should for work whose decisions were all made upstream, and the
budget it burns is the reason this process exists at all.

## 2. Preflight

```bash
git fetch --prune && git status --short && git log --oneline origin/main..main && git branch -r --list 'origin/brief/*' && ls briefs/reports/
```

Four refusals, in this order. Each one stops the session - report it and wait,
do not work around it:

| Finding | Why it stops you |
|---|---|
| A dirty tree, or unpushed commits on `main` | Something was left behind. Resolve it before branching. |
| An `origin/brief/*` branch, or a `report-NNN.md` with no Verdict | A finished build is waiting on review, and review ends in a merge to `main`. Building now branches off a stale base. Tell the user to run `/opsu` first. |
| A `brief/NNN` branch already exists for the target | This brief is already in flight, possibly in the other session. |
| The other running session's brief has an overlapping `owns:` set | Two builds on the same region rebase rather than help. See the lane block in `PASSOFF.md`'s queue line. |

## 3. Pick the brief

Use the argument if given (`/stonne 027`). Otherwise take the head of the queue
from `PASSOFF.md`'s queue line - **not** the lowest number in `briefs/ready/`.
Those differ right now on purpose, and the reason is written in brief 031's own
header.

Then read the target's frontmatter and check the tier matches:

```bash
sed -n '1,14p' briefs/ready/brief-NNN.md
```

**If `model:` says `opus`, stop.** An author marked it as needing judgement that
could not be pre-made, and running it here produces a brief-shaped thing that
passes its steps without doing the work. Tell the user to run `/opsu` on it.

Also read `owns:` - that is what the lane check in step 2 compares against.
**A brief with no `owns:` field owns everything.** Briefs 021 and 027-031 were
written before the field existed and have not been backfilled, deliberately:
inferring another author's blast radius is an authoring-tier call, not a gate's.
Treat the absence as "collides with everything", which is the safe reading and
also the true one until brief 032 lands. Do not add the field yourself - if the
brief needs one, say so and let an `/opsu author` session set it.

Skip anything whose `state:` is not `ready`, and skip brief 021 specifically: it
is blocked on a physical toggle inside the League client that no session can
flip, and it sits in `ready/` as a record rather than as work.

## 4. Hand off

Read `briefs/PASSOFF.md` in full and follow it - the five facts, the four stages,
the artifacts. Do not summarise it back to the user first; they wrote it.

The three things this gate exists to make sure you carry in:

- **Run straight through.** Plan, build, verify, report. No mid-brief check-ins.
  A genuine blocker is `Escalate Instead Of Deciding` - stop and ask. The routine
  stop is gone.
- **Read by anchor, not by file.** `app/public/index.html` is ~140KB and stays in
  context for every remaining turn once you read it whole. The brief's
  `Where The Code Is` table exists so you don't have to.
- **You do not close the brief.** Push `brief/NNN` and stop. Archiving, the
  Outcome, the log line, the merge, the wiki and the issue all belong to the
  reviewing session.
