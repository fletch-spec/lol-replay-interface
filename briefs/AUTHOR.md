# Author: Commissions Into Briefs

`TRIAGE.md` decides *what* gets briefed and in what order. This covers *writing*
the brief. `PASSOFF.md` covers executing it. `REVIEW.md` covers judging it.

Run this once per brief, against one commission from a triage pass. It ends with
one file in `briefs/ready/` and one line in `brief_log.md`. It never touches
`app/`.

**Model: Opus.** This is the tier that spends judgement so the executing tier
doesn't have to. A brief that defers its decisions moves the hardest problem to
the session least equipped to solve it, and costs more in rework than the
authoring saved.

**One brief per session.** `/clear` between them. Authoring brief N+1 in the
context that authored brief N carries N's code reading forward for no benefit,
and code reading is the expensive part of this tier.

---

```
Author brief NNN for the LoL Replay Controller from the commission below.

Project: a browser panel that drives League replays on a second monitor so I can
record voiceover live in one pass. Live replay control only - not an editor, not
a stats tool. If a feature doesn't help someone talk over a replay in real time,
it's out.

Repo:     C:\dev\lol-replay-interface
Process:  briefs/AUTHOR.md - follow it.
Shape:    briefs/template.md
Context:  briefs/archive/ (Outcome sections), briefs/brief_log.md (grep, don't
          read - it is 75KB and growing), briefs/PASSOFF.md's five facts

Commission: [paste the one-liner from the triage pass]

Don't write code. Don't push or comment on GitHub without me saying so.
```

---

## The procedure

**1. Open the code. All of it that matters, none that doesn't.**

Non-negotiable, and the step most worth resisting the urge to skip. Briefs 008,
009 and 010 were written without it, all produced the "find out what `cameraLockX`
does" shape, and all had to be rewritten verbose before they could be executed.
The rewrite cost more than the reading would have.

You are looking for three things: the symbol that owns the behaviour, the line
that already explains why it is like that, and the mechanism behind the symptom.
Issue #15 went from "popup gets cut off" to "`.transport.card` sets
`overflow: hidden` and the card grows upward out of it" in one grep, and that
turned a design discussion into a decision.

Read by anchor, not by file. `app/public/index.html` is ~140KB and sits in
context for every turn once you read it whole; grep for the symbol and read the
range around it. The one thing worth reading in full is whatever your brief is
about to hand someone else a line number for.

**2. Apply the scope test out loud**, even when the answer is obviously "keep".

> If a feature doesn't help someone talk over a replay in real time, it's out.

Triage already applied it once. You apply it again against what the code turned
out to be, because that is frequently not what the issue said it was. If it now
fails, stop and say so - do not write the brief and let execution discover it.

**3. Make the decisions.** The two sections that decide whether a brief is
finished:

- **Decision (already made - do not re-litigate)** - state the approach as a
  decision, then list the rejected alternatives *with the reason each lost*. The
  rejections are the load-bearing half: they are what stops the executing session
  re-deriving the same debate and picking differently. If a genuine open question
  remains it goes in `Escalate Instead Of Deciding`, never here.
- **Where The Code Is** - real symbols and real line numbers from a named commit.
  Note the commit at the top. Line numbers drift; symbol names do not, and the
  header tells the reader to grep when they disagree.

**4. Write the traps.** This section is where a session actually loses its
afternoon, and it is the highest-value thing this tier produces. Prefer concrete
traps found in *this* code over general advice. A trap is a specific wrong thing
that looks right - "`checkLoop()` seeks back to A whenever playback passes B, so
a play-through scan with a loop armed never terminates" is a trap. "Be careful
with loops" is not.

**5. Size the brief to the tier that will run it.** Set `model:` honestly:

| `model:` | When |
|---|---|
| `sonnet` | Decisions are made, seams are named, steps are mechanical, verification is checkable without judgement |
| `opus` | The work needs judgement that cannot be pre-made - architecture chosen against measurements only visible mid-build, or a decision that depends on what step 1 finds |

A brief is not made sonnet-sized by writing it shorter. It is made sonnet-sized
by making its decisions in advance. If you cannot, mark it `opus` and say why in
the log line - that is a real answer, not a failure.

**6. Set `owns:`.** The list of regions, files or symbols this brief will
modify. Two briefs may run in parallel only if their `owns:` sets are disjoint,
so this field is what makes a second executing session safe. Be generous: a brief
that touches the marker gutter owns the marker gutter, not just the four lines it
plans to edit. Under-declaring costs a rebuild; over-declaring costs a wait.

**7. Write the acceptance test before you believe the brief.** Verification is
numbered steps against the live app, not the code, and it includes the negative
cases - the thing that must still work afterwards. If you cannot write a step
someone else could check without asking you, the brief is not finished.

**State the gate and let the brief fail it honestly.** Brief 015 said "one row of
ten cards, at 1400px, with a legibility gate", measured 37px for a champion name,
and shipped the documented two-row fallback. Both outcomes passed. That is better
than a brief that can only succeed.

**8. Log it.** One line in `brief_log.md`: `date | brief-NNN | - -> ready |
reasoning`. Long lines are correct. This file is the only place the *why*
survives, and it is what the next author greps.

## Rules that came from getting it wrong

- **Do not invent strings from memory.** Champion aliases, `EventName`s, minion
  prefixes. A wrong mapping fails silently and looks fine, which is worse than a
  visible 404. Instruct the brief to collect real values by logging them first
  (brief 011).
- **Measurement-first when the premise is a code reading.** Briefs 008, 021, 026
  and 031 are structured so step 1 can end the brief. Brief 026's did: the old
  harvest found 92 events, a manual play-through found 101, and the full rewrite
  ran on evidence instead of on a hunch. Any brief whose Problem Statement is
  built from reading rather than observation gets this shape.
- **The absence of a finding is not a finding.** Brief 010's rule, and why #7 is
  still open rather than answered.
- **When a new issue reverses a fence an earlier scope review set, surface it.**
  Do not absorb it as a sub-bullet. Issue #12 asked for cue tags, which brief 013
  explicitly barred; that reversal is Fletcher's to make deliberately, so brief
  020 shipped the export and named the tags out of scope with the reason.
- **Verification cannot require something no session can do.** #26 is kept out of
  brief 030 for exactly this: folding it in would hand that brief an acceptance
  test nobody can run. The Browser pane cannot composite frames, so any brief
  needing pixel verification must say so and rely on DOM measurement or computed-
  colour math instead (briefs 018 and 019's Outcomes).

## What authoring does not do

**No code.** Not even the one-liner you can see from here. The brief's job is to
be executed by a session that reads it cold; a half-applied fix makes its line
anchors lie.

**No queue decisions.** Order, dependencies and collisions belong to `TRIAGE.md`.
If authoring reveals that the order is wrong - and it does, because the code says
things the issue did not - report it rather than resequencing. Brief 031 runs
ahead of its number for a reason that is written down; that is the pattern.
