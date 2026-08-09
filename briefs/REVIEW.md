# Review: Reports Into Verdicts

`PASSOFF.md` covers executing a brief. This covers judging the result and closing
it out. It is the last gate before Fletcher tests it himself.

Run this once per completed brief, against one `briefs/reports/report-NNN.md` and
one pushed branch. It ends with a verdict, an Outcome section, a log line, a
merge, a closed issue, and nothing left in the working tree.

**Model: Opus.** The executing tier reports what happened; this tier decides what
it means. Those are different jobs and the second one is where a "clean done"
gets separated from a done that is actually true.

**Read the diff, not the codebase.** The entire point of `report-NNN.md`'s schema
is that a review costs a report, a diff, and three sections of the brief - not a
session's worth of loaded context. If you find yourself reading
`app/public/index.html` in full, the report was underspecified; say so in the
verdict so the next one isn't.

---

```
Review brief NNN for the LoL Replay Controller.

Repo:     C:\dev\lol-replay-interface
Process:  briefs/REVIEW.md - follow it.
Read:     briefs/reports/report-NNN.md
          briefs/ready/brief-NNN.md - Decision, Verification, Can't Skip, Traps
          git diff main...brief/NNN
Do not read the rest of the codebase unless the diff forces you to.

Report first, then wait for my go-ahead before merging and closing.
```

---

## The procedure

**1. Read the report before the diff.** In that order, deliberately. The report
says what the session believed it did; the diff says what it did. Reading the
diff first means you reconstruct an intent and then confirm it, which is the
failure mode this gate exists to catch.

**2. Check the four things a report cannot lie about.**

| Check | Against |
|---|---|
| Every numbered Verification step has a result | The brief's Verification section - count them |
| Every `Can't Skip` item is satisfied | The diff, not the report's word for it |
| Nothing in `Out Of Scope` was touched | The diff's file and symbol list |
| Every Decision was followed, or its departure is declared | `Deviations` in the report |

A `PARTIAL` is a legitimate result and passes review if it is named honestly with
its residue. Brief 017 fixed two of five duplicate pairs and #13 correctly stayed
open. A `PASS` that the diff does not support is the only real failure.

**3. Judge the deviations.** The executing tier is allowed to depart from a
Decision when the code turns out not to support it - it is required to declare
it, not to obey. So each deviation gets one of three verdicts:

- **Accepted** - the code was different from what the brief assumed. Fold the
  finding into the Outcome; that is what Outcomes are for.
- **Accepted, and the brief was wrong** - same, but something in `Decision`,
  `Traps` or `Where The Code Is` would mislead the next reader. Fix the brief
  before archiving it, and say so in the log line.
- **Rejected** - the session substituted its own judgement on a settled
  question. Send it back with the specific step to redo. Do not fix it yourself;
  fixing it here hides a process failure inside a review.

**4. Write the Outcome.** Into the brief, before it moves to `archive/`. If
everything went as written, one line saying so is enough. What earns space is
what turned out to be wrong - an API shape, an assumption, a mechanism that does
not work. That matters more than a clean "done", and it is the section the next
author reads.

**5. Close out.** In this order, and all of it:

1. Brief: `state -> complete`, set `updated:`, move `ready/` -> `archive/`.
2. Append the verdict to `report-NNN.md` and leave it in `briefs/reports/`.
3. One line in `brief_log.md`: `date | brief-NNN | ready -> complete | what
   actually happened`. The reasoning, not the changelog.
4. Merge `brief/NNN` into `main`. Delete the branch.
5. Close the brief's issue with a comment naming what shipped and what it found.
   Anything partial stays open with the residue named.
6. Update the wiki queue table and Stats. The wiki is a separate repo
   (`fletch-spec/lol-replay-interface.wiki.git`) - clone it fresh, push it
   separately.
7. **Commit and push.** `git status --short` and
   `git log --oneline origin/main..main` both come back empty before you stop.
   GitHub is the source of truth. Standing instruction, 2026-08-08.

## Rules that came from getting it wrong

- **A partial pass is a partial pass.** Two sessions failed to reproduce #26
  across a width sweep and a zoom x width matrix, and the right output was
  "still blocked on Fletcher's numbers", not a close. Reviewing is where the
  temptation to round that up lives.
- **Agreeing with itself is not verification.** Brief 016 reported cached-equals-
  live twice; both sides came from the same feed through the same
  `mergeEvents()`. If the report's evidence for a step is the code's own belief
  about itself, the step is unverified regardless of what it says.
- **A finding the brief did not ask for still counts.** Brief 026 surfaced a
  growing scan count (101 -> 106 -> 109) that was not in its Verification
  section at all. It went in the Outcome and it was the most useful thing the
  brief produced. Do not discard evidence for being off-schedule.
- **Escalations are output, not failure.** A brief that stops at `Escalate
  Instead Of Deciding` and asks did its job. Route the question to Fletcher in
  the report-back; do not answer it on his behalf.
- **Do not merge a brief whose verification could not run.** If the session could
  not test it - no replay loaded, a physical toggle nobody can flip, a screenshot
  the Browser pane cannot composite - that is a blocked brief, not a passed one.
  021 has sat in `ready/` for exactly this reason and that is correct.

## What review does not do

**No new work.** If the review reveals adjacent work worth doing, it becomes a
commission for `AUTHOR.md`, not a commit here. The one exception is fixing the
brief's own wrong text under verdict 3b, because an archived brief with a lie in
its Traps section is worse than no brief.

**No queue changes.** If the outcome changes what should run next - and it does,
because shipped code changes what the next brief is measuring against - report it
to `TRIAGE.md` as a note. Brief 027 changing the cluster counts 029 and 030
measure is that shape, caught at triage; caught at review it works the same way.
