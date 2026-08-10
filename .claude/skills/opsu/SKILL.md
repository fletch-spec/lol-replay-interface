---
name: opsu
description: Start an Opus session on the LoL Replay Controller - review a finished brief, author a new one from a commission, or run a triage pass. Works out which of the three is due from the repo's own state when given no argument. Use when the user types /opsu, or asks to review a brief, write a brief, fill the queue, or decide what to work on next. Also accepts "monitor" to wait out a build session in flight and then route. Accepts "review NNN", "author NNN", "triage", or "monitor".
---

# Start an Opus session

Three roles share this entry point because they share a model tier and never run
at the same time. Each has its own procedure, and this file only routes:

| Mode | Procedure | Turns |
|---|---|---|
| `review` | [`briefs/REVIEW.md`](../../../briefs/REVIEW.md) | a report + a branch → a verdict, an Outcome, a merge |
| `author` | [`briefs/AUTHOR.md`](../../../briefs/AUTHOR.md) | one commission → one brief in `ready/` |
| `triage` | [`briefs/TRIAGE.md`](../../../briefs/TRIAGE.md) | open issues → commissions + a queue with lanes |

`monitor` is a fourth argument but not a fourth role: it waits out a build
session that is still running, then falls into the routing below (which lands on
`review`, every time, by construction). See §2.

## 1. Declare the tier, before anything else

Say out loud which model you are running as.

**If you are not an Opus model, stop.** Print what is wrong and nothing else:

> This is an Opus role and you're running <model>. Switch in the app's model
> picker and run /opsu again.

Do not offer to proceed anyway. All three of these modes exist to spend judgement
so the build tier doesn't have to; run on a smaller model they produce briefs
that defer their decisions, which is the exact failure the four-document split
was built to stop.

## 2. Work out which mode is due

If the user named one (`/opsu review 031`, `/opsu author 033`, `/opsu triage`),
use it. `/opsu monitor` means a build session is in flight right now - go to
"Monitor" below, wait for it, and then come back here. Otherwise read the state:

```bash
git fetch --prune && git branch -r --list 'origin/brief/*' && ls briefs/reports/ && grep -l '^state: ready' briefs/ready/*.md | wc -l && grep -A3 '^Queue:' briefs/PASSOFF.md
```

Decide in this order, and take the first that matches:

1. **A pushed `brief/NNN` branch, or a `report-NNN.md` with no Verdict section** →
   `review`. Always first. Review ends in a merge to `main`, so nothing else can
   safely start on top of it.
2. **A commission in the last `brief_log.md` triage entry with no matching file in
   `briefs/ready/`** → `author` that one.
3. **Fewer than ~3 briefs in `briefs/ready/`** → `triage`.
4. **None of the above** → report the state in three lines and ask. Do not invent
   work; an idle Opus session costs nothing and is often the correct answer.

### Monitor - waiting out a build session

`/opsu monitor` is for when a `/stonne` session is still building and you want
the review to start the moment it lands, without a human relaying "it's done".
Arm one background poll and then work on something else:

```bash
for i in $(seq 1 240); do
  if [ -n "$(git ls-remote --heads origin brief/NNN 2>/dev/null)" ]; then
    echo "DONE: origin/brief/NNN pushed"; exit 0
  fi
  sleep 30
done
echo "TIMEOUT: 2h elapsed, brief/NNN still not pushed"; exit 1
```

Run it with Bash `run_in_background` - one notification when it exits, not a
`Monitor` stream. Three things this shape gets right, each learned the hard way
on 027:

- **The finish signal is the pushed branch, and only that.** PASSOFF stage 4
  writes `report-NNN.md`, *then* commits, *then* pushes. Polling for the report
  file fires while the report is still being written and the branch does not yet
  exist to diff against - a review that starts there has half its input.
- **`ls-remote`, never `git fetch`.** The build session is usually working in
  this same checkout; a fetch on a 30s timer races its commits for `index.lock`.
  `ls-remote` reads the remote and touches nothing locally.
- **Cap it.** A build session can stop and escalate instead of pushing, and that
  is a correct outcome, not a hang. The loop exits nonzero after 2h so the
  silence gets reported rather than waited on forever.

When it fires, fall through to §2's ordering. It will land on `review` - that is
the point of the mode, not a coincidence.

## 3. Run the mode

Read that mode's document in full and follow it. Do not summarise it back first.

**Review.** The input is `report-NNN.md`, `git diff main...brief/NNN`, and three
sections of the brief - Decision, Verification, Can't Skip. That is the whole
input. If you find yourself reading `app/public/index.html` to judge the work,
the report was underspecified: say so in the verdict rather than absorbing the
cost silently, so the next report is better. Read the report *before* the diff -
reading the diff first means reconstructing an intent and then confirming it,
which is the failure this gate exists to catch.

**Author.** One brief per session, and `/clear` before the next one - carrying
brief N's code reading into brief N+1 buys nothing and code reading is the
expensive part of this tier. Read by anchor, not by file. Set `model:` honestly
(a brief is not made `sonnet`-sized by being written shorter, but by having its
decisions made in advance) and set `owns:` generously, since under-declaring
costs a rebuild and over-declaring only costs a wait.

**Triage.** You produce commissions, not briefs. Open the code far enough to
disposition and no further - triage needs the mechanism, authoring needs the
line. Grep `brief_log.md`, don't read it; it is 75KB and growing.

## Rules that apply to all three

- **GitHub is the source of truth.** Every mode ends with `git status --short`
  and `git log --oneline origin/main..main` both empty. Standing instruction,
  2026-08-08.
- **Ask before changing an issue's meaning.** Closing a shipped issue and posting
  a decision comment are granted. Reopening, relabelling, closing as `wontfix`,
  or filing a brand-new issue are not - brief 032's issue #33 was asked about
  first, and that is the precedent.
- **Escalations are output, not failure.** A brief or a report that stops and
  asks did its job. Route the question to Fletcher; do not answer it for him.
- **Do not write code.** Not in any of the three modes, not even the one-liner
  you can see from here. A half-applied fix makes every line anchor in `ready/`
  lie.
