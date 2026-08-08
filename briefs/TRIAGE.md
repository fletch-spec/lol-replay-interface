# Triage: Issues Into Briefs

`PASSOFF.md` covers *running* the queue. This covers *filling* it.

Run this when open issues have piled up and the queue is empty or thin. It ends
with executable briefs in `briefs/ready/`, a queue order, and a log entry per
decision. It never touches `app/`.

---

```
Triage the open issues on fletch-spec/lol-replay-interface into briefs.

Project: a browser panel that drives League replays on a second monitor so I can
record voiceover live in one pass. Live replay control only - not an editor, not
a stats tool. If a feature doesn't help someone talk over a replay in real time,
it's out.

Repo:     C:\dev\lol-replay-interface
Briefs:   briefs/ready/ (queue), briefs/archive/ (done - read the Outcome
          sections), briefs/template.md (shape), briefs/brief_log.md (why)
Process:  briefs/TRIAGE.md - follow it.

Don't write code. Don't push or comment on GitHub without me saying so.
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

**2. Open the code for every issue.**

Non-negotiable, and the step most worth resisting the urge to skip. A brief
written without reading the code produces the "find out what `cameraLockX` does"
shape - briefs 008, 009 and 010 were all written that way and all had to be
rewritten verbose before they could be executed. The rewrite cost more than the
reading would have.

You are looking for: the symbol that owns the behaviour, the line that already
explains why it is like that, and the mechanism behind the symptom. Issue #15
went from "popup gets cut off" to "`.transport.card` sets `overflow: hidden` and
the card grows upward out of it" in one grep, and that turned a design discussion
into a decision.

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

**5. Write the briefs.** `briefs/template.md` is the shape. The two sections that
decide whether a brief is finished:

- **Decision (already made - do not re-litigate)** - state the approach as a
  decision, then list the rejected alternatives *with the reason each lost*. A
  brief that offers a menu hands its hardest problem to the session least
  equipped to solve it, and you will get a different answer than you wanted.
- **Where The Code Is** - a table of real symbols and real line numbers from a
  named commit. Note the commit at the top; line numbers drift, symbol names do
  not.

Then: `Done when:` on every step, checkable without judgement. Verification as
numbered steps against the live app, including the negative cases. Traps as
concrete things in *this* code, not general advice. `Escalate Instead Of
Deciding` for anything genuinely open - that is where an open question belongs,
never in Decision.

**6. Order the queue.** Dependencies first, then cheapest-or-most-informative.
Keep numeric order equal to execution order - renumbering is worse than the
problem it solves, so pick the numbers after you have the order.

Then check for **collisions**: two briefs that own the same UI region or the same
function. Briefs 011 and 013 both wanted the cue row and whichever ran second
would have inherited the other's layout. That is cheap to catch here and
expensive to catch at build time. Say it in the brief and in the log.

**7. Write it down.**

- One line per decision in `brief_log.md`: `date | brief-NNN | from -> to |
  reasoning`. Long lines are correct. This file is the only place the *why*
  survives.
- Update `PASSOFF.md`'s queue line and its "Updated" date.
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

- **A brief that defers its design decisions is not finished.** This is the whole
  reason `PASSOFF.md` shrank from ninety lines to four stage gates - judgement
  moved from the session into the brief.
- **Do not invent strings from memory.** Champion aliases, `EventName`s, minion
  prefixes. A wrong mapping fails silently and looks fine, which is worse than a
  visible 404. Instruct the brief to collect real values by logging them first
  (brief 011).
- **State the gate, and let the brief fail it honestly.** Brief 015 said "one row
  of ten cards, at 1400px, with a legibility gate", measured 37px for a champion
  name, and shipped the documented two-row fallback. Both outcomes passed. That
  is better than a brief that can only succeed.
- **The absence of a finding is not a finding.** Brief 010's insight, and it is
  why #7 is still open rather than answered.
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
