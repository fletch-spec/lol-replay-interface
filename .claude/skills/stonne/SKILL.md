---
name: stonne
description: Start a Sonnet build session on the LoL Replay Controller brief queue. Runs the preflight checks that decide whether a brief can be built right now - model tier, branch state, unreviewed reports, lane collisions - then hands off to briefs/PASSOFF.md. Use when the user types /stonne, or says they want to build, execute, run or ship a brief. Takes an optional brief number; defaults to the head of the queue. Also accepts "monitor" to keep building - wait out each review, then start the next brief - until the queue is empty.
---

# Start a build session

The procedure lives in [`briefs/PASSOFF.md`](../../../briefs/PASSOFF.md).
**This file is the gate, not the process** - it decides whether the build should
start at all, then gets out of the way.

`monitor` is not a second role - it is the same build role, run in a loop. See
§5. Everything through §4 is one brief; §5 is what repeats it.

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

## 5. Monitor - looping the queue

`/stonne monitor` runs steps 1-4 exactly as above for one brief, but after
Stage 4 pushes `brief/NNN`, it does not stop there - it waits out that brief's
review and then starts the next one itself, so the two tiers keep the queue
moving without a human relaying "go" between them. This is the build-side half
of `/opsu monitor`; together they trade turns until the queue runs out.

After the push, arm one background poll for the review to land - the mirror
image of the wait `/opsu monitor` does for a build:

```bash
for i in $(seq 1 240); do
  if [ -z "$(git ls-remote --heads origin brief/NNN 2>/dev/null)" ]; then
    echo "DONE: origin/brief/NNN gone - merged and deleted"; exit 0
  fi
  sleep 30
done
echo "TIMEOUT: 2h elapsed, origin/brief/NNN still open"; exit 1
```

Run it with Bash `run_in_background`, same reasoning as the review-side poll,
inverted:

- **The finish signal is the branch's absence, not the report's Verdict.**
  `REVIEW.md`'s last stage merges `brief/NNN` into `main` and deletes the
  branch; a Verdict can land in the report before that merge does (it did, on
  027), and starting the next brief off a `main` the merge hasn't reached yet
  is exactly the "stale base" refusal in §2.
- **`ls-remote`, never `git fetch`.** The reviewing session is usually working
  in this same checkout - a fetch on a 30s timer races its commits for
  `index.lock`. `ls-remote` reads the remote and touches nothing local.
- **Cap it.** `REVIEW.md` refuses to merge a brief whose verification could not
  run, and a stuck or escalated review is a correct outcome, not a hang. The
  loop exits nonzero after 2h so silence gets reported instead of waited on
  forever.

When it fires: `git checkout main && git pull --ff-only`, then go back to §2's
preflight. It will pass cleanly now that the branch is gone and `main` is
current. If §3 finds no `ready`, `sonnet`-tier brief left, **stop the loop and
say so** - an empty queue is not a bug, and whether to run `/opsu triage` to
refill it is Fletcher's call, not something to poll for. Otherwise build the
next one, push, and monitor again.

Report each cycle's result line as it lands, same as a single `/stonne` would -
`monitor` changes what happens after the stop, not what gets said at it.

### Between cycles: clear or compact, never while a wait is armed

The next brief's plan doesn't need anything from this conversation - the plan,
report and code are the whole carried state, same as PASSOFF's existing
"between briefs" note for a human-driven session (`PASSOFF.md`'s Notes). So
resetting context between cycles costs nothing structurally; the only question
is which reset, and when.

**When:** only right after the review-wait fires, before the next brief's
Stage 1 starts - never while the `run_in_background` poll is still outstanding.
Clearing out from under a job that's expected to notify this same conversation
orphans the notification.

**Which:** compact by default - it keeps the just-finished brief's result line
and escalations on hand if Fletcher is still in the room and asks about one,
while dropping the code reads, browser traces and console output that cost the
context. Clear instead when the loop is running unattended (a scheduled or
autonomous invocation, no one watching this session) - nothing from the
finished brief is needed and there is no one to field a follow-up, so paying
for compact's summary buys nothing over the report already on disk.
