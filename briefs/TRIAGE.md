# Triage: Issues Into Commissions

Four documents, four roles, one brief moving between them:

| Doc | Role | Model | Start with | Turns | Into |
|---|---|---|---|---|---|
| **`TRIAGE.md`** | Project manager | Opus | `/opsu triage` | open issues | commissions + a queue order |
| `AUTHOR.md` | Senior | Opus | `/opsu author NNN` | one commission | one brief in `ready/` |
| `PASSOFF.md` | Junior | Sonnet | `/stonne [NNN]` | one brief | a plan, a branch, a report |
| `REVIEW.md` | Reviewer | Opus | `/opsu review NNN` | one report | a verdict, an Outcome, a merge |

`/opsu` with no argument works out which of its three modes is due from the
repo's own state; `/stonne` with no argument takes the head of the queue. Both
declare their model tier first and refuse to run on the wrong one, which is the
only part of `model:` that was ever enforceable.

This is the first. Run it when open issues have piled up and the queue is empty
or thin. It ends with a commission per brief, a queue order with lanes, and a log
entry per decision. It never touches `app/`, and it no longer writes the briefs
themselves - that is `AUTHOR.md`, and the split exists for a measured reason.

**Why the split.** Dispositioning every open issue and authoring every brief in
one session means holding every issue *and* every brief's code anchors in one
context, which is the most expensive session shape this project runs. Separated,
triage reads issues and greps mechanisms; authoring opens code for exactly one
brief and `/clear`s between. Same output, a fraction of the resident context.

---

```
Triage the open issues on fletch-spec/lol-replay-interface into briefs.

Project: a browser panel that drives League replays on a second monitor so I can
record voiceover live in one pass. Live replay control only - not an editor, not
a stats tool. If a feature doesn't help someone talk over a replay in real time,
it's out.

Repo:     C:\dev\lol-replay-interface
Briefs:   briefs/ready/ (queue), briefs/archive/ (done - read the Outcome
          sections), briefs/template.md (shape)
Log:      briefs/brief_log.md (why). Grep it, don't read it - 75KB and growing.
Process:  briefs/TRIAGE.md - follow it.

You produce commissions, not briefs. briefs/AUTHOR.md writes those, one session
per brief. Don't write code. Don't push or comment on GitHub without me saying
so.
```

---

## The procedure

**1. Read everything before deciding anything.**

- Every open issue, including the `wontfix` ones. Those are the record of what
  not to retry, and they are the reason briefs 003 and 006 are not repeated.
- `briefs/brief_log.md`, at least the last thirty lines. The log is where the
  *reasoning* lives - what was cut, what was reframed, which fences were set.
  Issues do not carry that.
- The Outcome sections of recently archived briefs. They say what turned out to
  be wrong, which is more useful than what shipped.
- `PASSOFF.md`'s five facts. Any brief that contradicts one is wrong.

**2. Open the code far enough to disposition, and no further.**

Non-negotiable, and the step most worth resisting the urge to skip. A disposition
written without touching the code produces the "find out what `cameraLockX` does"
shape - briefs 008, 009 and 010 were all written that way and all had to be
rewritten verbose before they could be executed. The rewrite cost more than the
reading would have.

But triage needs a different depth than authoring does, and conflating the two is
what made this doc expensive. **Triage needs the mechanism; authoring needs the
line.** One grep for the symbol that owns the behaviour is usually the whole
budget. Issue #15 went from "popup gets cut off" to "`.transport.card` sets
`overflow: hidden` and the card grows upward out of it" in one grep, and that
turned a design discussion into a decision - without a line table, which the
authoring session builds fresh against a named commit anyway.

If you cannot tell whether something is actionable without a full read, that
uncertainty is itself the disposition: commission it as a measurement-first
brief and let step 1 answer it, the way briefs 021, 026 and 031 do.

**3. Apply the scope test, out loud, per issue.**

> If a feature doesn't help someone talk over a replay in real time, it's out.

Things that have failed it: depth of field and fog (brief 012, cut), camera
presets (removed), a focus-management system (capped at one chip). Each survived
for a while on the inertia of a premise that no longer held. Say the test's
verdict in the log line even when the answer is obviously "keep".

**4. Give every issue a disposition.** There are five, and only one is a brief:

| Disposition | When | What you write |
|---|---|---|
| **Brief** | Actionable, in scope, decidable now | A file in `briefs/ready/` |
| **Blocked** | Real, but the answer depends on unfinished work | Nothing. Say what blocks it, and make sure the blocker is a brief |
| **Constraint record** | Not fixable here (`wontfix`) | Nothing. Recommend closing - it is a fact, not work |
| **Cut** | Fails the scope test | A log entry saying why, with the reasoning that will otherwise be re-derived |
| **Reframed** | Belongs inside another brief, or is really two issues | A note in both, and a log line |

**5. Commission the briefs.** One paragraph per `Brief` disposition, handed to an
`AUTHOR.md` session. A commission carries four things and nothing else:

- **The mechanism**, as step 2 found it - not the symptom the issue reported.
- **The fence**: what this brief must not absorb, and which brief owns it
  instead. This is the half a commission uniquely can supply, because only triage
  has seen all the issues at once.
- **The proposed `owns:` lane**, from step 6. The author may widen it after
  reading the code; they may not narrow it without saying so.
- **Anything already known to be wrong** about the issue as filed.

You are not making the design decision - that is the author's job, and making it
here without the line-level reading is how a brief gets a Decision its own code
does not support. You are making sure the author cannot accidentally re-open a
question the queue already settled.

Commissions live in the log line, not in a file of their own. A commission that
needs its own file is a brief, and you are not writing those.

**6. Order the queue, then cut it into lanes.** Dependencies first, then
cheapest-or-most-informative. Keep numeric order equal to execution order -
renumbering is worse than the problem it solves, so pick the numbers after you
have the order.

Then check for **collisions**: two briefs that own the same UI region or the same
function. Briefs 011 and 013 both wanted the cue row and whichever ran second
would have inherited the other's layout. That is cheap to catch here and
expensive to catch at build time. Say it in the commission and in the log.

Collisions used to be a warning. Now they are arithmetic, because two executing
sessions run at once:

> **Two briefs may run in parallel only if their `owns:` sets are disjoint.**

So the queue is not a line, it is a set of lanes. Publish it as one - the queue
line in `PASSOFF.md` names which briefs may run concurrently and which must not:

```
Queue: 031 -> 027 -> 028 -> 029 -> 030
Lanes: 031 (server, boot) may run beside any of them.
       027 (event dedupe) then 029 -> 030 (marker gutter, shared) in order.
       028 (setup caret) is disjoint from all of the above.
```

Two rules that fall out of it, both learned the expensive way rather than
reasoned from first principles:

- **A brief that owns a whole file blocks the lane.** This was written when
  `app/public/index.html` was one 140KB file and almost everything collided with
  almost everything. Brief 032 split it, and the rule survived the split rather
  than being repealed by it: `panel.js` is still 95KB, so a brief owning it whole
  (033) still blocks the lane. An idle session costs nothing; two sessions
  rebasing the same file costs a rebuild. Do not manufacture parallelism the code
  does not support - the fifth triage pass got a real second lane only because
  034 and 035 touch no app code at all.
- **Depth beats width when the lanes are narrow.** If only one brief can run,
  run one. The second Sonnet session is better spent on the *next* brief's plan
  than on a colliding build.

**7. Write it down.**

- One line per decision in `brief_log.md`: `date | brief-NNN | from -> to |
  reasoning`, and the commission itself for anything dispositioned `Brief`. Long
  lines are correct. This file is the only place the *why* survives.
- Update `PASSOFF.md`'s queue line, its lane block, and its "Updated" date.
- **Commit and push before you stop.** A triage pass ends with a clean working
  tree and `origin/main` up to date - `git status --short` and
  `git log --oneline origin/main..main` both empty. Standing instruction from
  Fletcher (2026-08-08): GitHub is the source of truth, and nothing this pass
  produced may exist only on the machine it ran on.
- **Close the issues whose work has shipped**, with a comment naming the brief
  that closed them and what it found. Leave anything partial open and say why in
  the report. Also fine without asking: a `Triaged into brief-0NN` comment on
  each issue you briefed.
- The wiki queue table and Stats are updated in the same pass. The wiki is a
  separate repo (`fletch-spec/lol-replay-interface.wiki.git`) - clone it fresh,
  push it separately.

## Rules that came from getting it wrong

*The rules about how a brief is written moved to `AUTHOR.md` with the writing -
deferred decisions, invented strings, stated gates, and the absence of a finding.
What is left here is what belongs to the queue.*

- **When a new issue reverses a fence an earlier scope review set, surface it.**
  Do not absorb it as a sub-bullet. Issue #12 asks for cue tags, which brief 013
  explicitly barred; that reversal is the user's to make deliberately, so brief
  020 ships the export and names the tags as out of scope with the reason.
- **Severity is not the same as position in the queue.** The worst open defect
  may be the one nobody filed an issue for - the harvest bug surfaced inside
  brief 009's testing, blocked #7 and part of #14, and had no issue number at
  all when this pass began.

## What triage does not do

- **No code.** Not even the one-liner you can see from here. The brief's job is
  to be executed by a session that reads it cold; a half-applied fix makes its
  line anchors lie.
- **No briefs.** Since 2026-08-10. Triage that also authors has to hold every
  issue and every brief's line anchors in one context, and that context is
  re-read on every turn for the rest of the session. Commission it and let an
  `AUTHOR.md` session open the code for one brief at a time.
- **No verdicts.** A shipped brief's Outcome belongs to `REVIEW.md`. Triage reads
  Outcomes; it does not write them.

## What triage now does, that it used to ask about

Both of these reversed on 2026-08-08, on Fletcher's explicit instruction. The old
rules were "no pushing, no issue comments, no wiki edits without being asked" and
"no closing issues - recommend, the call is the user's".

- **Push.** Triage commits and pushes its own output. The old rule produced a day
  where five shipped briefs, a UI overhaul and a whole triage pass sat in one
  working tree, invisible to GitHub. If GitHub does not have it, it does not
  exist.
- **Close the issues whose work has shipped**, with a comment naming the brief.
  Partial work stays open with the residue named - #13 stayed open when brief 017
  fixed two of five duplicate pairs, and that was right.

Still ask about: anything that changes an issue's *meaning* rather than its
state - reopening, relabelling, or closing something as `wontfix`.
