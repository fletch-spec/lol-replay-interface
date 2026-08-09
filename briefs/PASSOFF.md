# Session Prompt

Paste once at session start. One session takes one brief, works it end to end
without stopping, and hands back two files.

**Model: Sonnet.** This tier executes decisions it did not make. Everything that
needed judgement was spent upstream - `TRIAGE.md` ordered the queue, `AUTHOR.md`
made the design calls and wrote the traps, and `REVIEW.md` will judge the result.
If this session finds itself designing, something upstream was underspecified;
say so in the report rather than filling the gap quietly.

**Report-gated, not stage-gated** (changed 2026-08-10). The old version stopped
four times per brief for a human go-ahead. Each resume re-cached a fully loaded
context, and the 2026-08-08 session established that running straight through
works - it shipped five briefs under a standing "don't stop for stages unless
blocking" instruction. So the gates are now artifacts, not interruptions:
`plan-NNN.md` before the build, `report-NNN.md` after the verification. Both are
capped, both are schemas, and a reviewer reads them for a fraction of what a
conversational stop costs. Fletcher's own test moves to *after* review, where it
is the last word instead of the third interruption.

Updated 2026-08-10: 001-011, 013-020, 022-026 done, 012 cut. Queue is
**031 → 032 → 027 → 028 → 029 → 030**. Briefs are verbose and self-contained -
each carries its own decisions, code anchors, steps, verification and traps - so
this prompt only has to set the frame and the handoff.

**032 is new and it is not a feature.** It splits `app/public/index.html`'s CSS
and JS into `panel.css` and `panel.js` without changing any behaviour, because
that one 140KB file is resident in context for every turn of every session at
every tier, and it is why almost every brief collides with almost every other
one. It runs after 031 and before 027-030, and it re-points those briefs' code
tables as a step.

**031 runs first even though its number is last**, and that is deliberate rather
than an oversight. It tests driving the panel from a second machine over the LAN
- the control half of #31, which Fletcher has put ahead of the video card - and
it is cheap, it gates that feature, and it may change what "the panel's origin"
means for work the others assume. 027-030 were already written and pushed;
`TRIAGE.md`'s rule is that renumbering costs more than the problem it solves, so
the exception is documented instead of the numbers being churned. It is the only
one in the queue.

**021 is blocked and out of the running order.** It needs streamer mode toggled
inside the League client by hand, which no session can do; it stays in `ready/`
as a record. Start at 027 unless Fletcher has run that toggle.

**Everything is committed and pushed** as of `db827c1` - briefs 022-026's code,
the timeline-controls UI overhaul, and this queue. 027-030's headers name
`943760b` plus uncommitted changes because that is what they were written
against; `db827c1` is the same content, so grep the symbol and move on. From now
on nothing stays in the working tree between sessions: wraps and triage passes
both push, and GitHub is the source of truth.

027-030 came from the fourth triage pass: 027 finishes #13's dedupe (the 2s
bucket is a fixed grid, so its real tolerance is 0-2s depending where a pair
lands - 3 known pairs still survive, and brief 026's full play-through made
repeated scans grow 101 → 106 → 109), 028 is the setup caret, 029 is the hover
dead zone over a wide cluster's count digit, 030 is panel scaling. Run them in
that order: 027 changes the cluster counts 029 and 030 both measure against, and
029 and 030 share the marker gutter - 029 owns where the hit test thinks a marker
is, 030 owns where its box is, so 030 re-runs 029's sweep as a step.

Brief 019 shipped the diamond fallback for kill markers, not the X, because this
session's Browser pane does not composite frames - `computer` screenshots time
out - so any brief needing pixel verification has to say so and rely on DOM
measurement or computed-colour math instead (see briefs 018 and 019's Outcomes).
Three things stay blocked on Fletcher rather than on work: **#26** (transport-row
overlap - two sessions have failed to reproduce it across a width sweep and a
zoom × width matrix, needs his window width, browser zoom and Windows display
scaling), **#32** (a Firefox-only separator, `wontfix`, and now parked for a
different reason - Fletcher is moving to Brave/Opera, so Chromium is the target
and cross-browser support is a later goal), and **#7**
(dragon/baron/herald - every replay available so far has had zero neutral
objective events of any kind, which briefs 019 and 026 both flagged as evidence
without deciding it; #14's empty-lane residue rides with it). **#31** (OBS LAN
stream in-browser) now has its premise and its research on the issue: the control
half is brief 031 and runs first, the video card is backlogged behind it. See
`TRIAGE.md` for how this queue was filled.

---

```
You're running the brief queue for the LoL Replay Controller: a browser panel
that drives League replays on a second monitor so I can record voiceover live in
one pass. Live replay control only - not an editor, not a stats tool. If a
feature doesn't help someone talk over a replay in real time, it's out.

Queue:   C:\dev\lol-replay-interface\briefs\ready\
         Order: 031 → 032 → 027 → 028 → 029 → 030
         Lanes: everything collides with everything until 032 lands, because
                every brief owns app/public/index.html. Run ONE session until
                then. After 032: 028 is disjoint from 027/029/030 and may run
                beside them; 029 → 030 share the marker gutter and stay in
                order; 027 precedes both because it changes the counts they
                measure.
         031 is first despite its number, see its header. 021 also sits here,
         blocked on a physical client toggle - skip it.
Archive: C:\dev\lol-replay-interface\briefs\archive\ (001-020, 022-026, read the Outcome sections)
Code:    C:\dev\lol-replay-interface\app\ - Node helper (server.js) + single-file
         vanilla-JS panel (public/index.html). No build step. Windows.

Five facts that cost 001-007 real time. Don't rediscover them:
1. The Replay API returns 200 for unknown field names and ignores them. Verify
   every write by reading state back, never by res.ok. This is the most common
   way to "finish" a brief that doesn't work.
2. cameraMode:"tps" closes the game. Reproduced twice. Never send it.
3. eventdata's EventID is reassigned every time playback re-passes an event.
   Dedupe by eventFingerprint(), never by EventID.
4. Spectator hotkeys can't be driven by synthetic input (Vanguard). Don't retry.
5. Another app on this machine drives the same replay client. Unexplained
   playback or camera movement is probably that - ask me before calling it a bug.

Work ONE brief, end to end, without stopping to check in. Four stages, two
artifacts, one handoff:

  STAGE 1 - PLAN. Read only that brief. `git checkout -b brief/NNN`. Confirm the
  helper is up (http://localhost:3000; `node server.js` from app/ if not) and a
  replay is loaded. Write briefs/plans/plan-NNN.md from plan-template.md: one
  line per work product, 25 lines max, plus anything the code says that the
  brief doesn't. Then keep going - don't wait.

  STAGE 2 - BUILD. Work the Implementation Steps in order, satisfying each
  "Done when" before moving on. Read Traps before writing, not after. The
  Decision section is settled - it lists what was rejected and why. If the code
  turns out not to support a decision, depart from it and DECLARE it in the
  report. Departing is allowed; departing silently is the one thing this tier
  must never do.

  STAGE 3 - VERIFY. Run every numbered step in the brief's Verification section
  against the live app. Not the code - the app. Every step gets a result and a
  measurement: a number, a rect, a count, a logged string. "Works" is not
  evidence. A partial pass is a partial pass and passes review; a pass the diff
  doesn't support is the only real failure.

  STAGE 4 - HAND OFF. Write briefs/reports/report-NNN.md from
  report-template.md, 60 lines max, every Verification step accounted for.
  Commit the code and the report to brief/NNN and PUSH THE BRANCH.
  `git status --short` comes back empty before you stop. GitHub is the source of
  truth - nothing stays on this machine.

  DO NOT: move the brief to archive/, write an Outcome section, append to
  brief_log.md, merge to main, touch the wiki, or close the issue. All six
  belong to the reviewing session (REVIEW.md), which writes the verdict this
  brief's Outcome is made of.

  Then STOP and tell me: the result line, the escalations, and nothing else.

Notes on working the briefs:
- READ BY ANCHOR, NOT BY FILE. app/public/index.html is ~140KB; once you read it
  whole it sits in context for every remaining turn of the session, and that
  resident context is the single largest thing this project spends tokens on.
  The brief's "Where The Code Is" table exists so you don't have to: read the
  named ranges plus surrounding context, and grep for symbols beyond that.
- Line numbers in briefs 027-030 are from commit 943760b PLUS the uncommitted
  022-026 changes in the working tree, and will drift. Symbol names are stable -
  grep for those.
- The swagger at https://127.0.0.1:2999/swagger/v3/openapi.json is authoritative
  for field names (the /docs HTML page 404s on curl). Everything is reachable
  through the panel's own proxy at http://localhost:3000/api/..., which avoids
  the self-signed cert.
- Target Chromium. I was on Firefox and two rendering divergences cost most of a
  session (#32's font-fallback glyphs, and Mozilla #1179454 breaking `flex: 1 0 0`
  items whose content is a nested flex container). I can run Brave or Opera, both
  Chromium, so build and verify against Chromium - which is also what your Browser
  pane is. Broader browser support is a real goal for later, not now; don't spend
  a session on a Firefox-only rendering bug. Prefer Grid, container queries and
  drawn glyphs over nested flex sizing and font characters anyway - that's just
  better CSS.
- Each brief has an "Escalate Instead Of Deciding" section. Use it.

Start at Stage 1 for brief 031.
```

---

## Notes

**Why one brief at a time.** Each brief is testable on its own and most need a
live replay to verify. Batching them means finding out at 014 that 009's harvest
change was wrong.

**Why report-gated rather than stage-gated.** The gates were never about
distrusting the session - they were about Fletcher testing it himself, which
still happens, just once and at the end. What the four stops actually cost was
four resumes into a fully loaded context. `report-NNN.md` carries the same
information a Stage 3 check-in did, at a fixed 60 lines, to a reviewer who does
not need the session's context at all. If you genuinely cannot proceed, that is
`Escalate Instead Of Deciding` - stop and ask. Blocking is still allowed; the
routine stop is not.

**Between briefs.** `/clear` after Stage 4 - the brief, the plan and the report
carry the state forward, which is the entire reason they are files. Repaste this
prompt.

**Two sessions at once.** Only if the two briefs' `owns:` sets are disjoint -
`TRIAGE.md` publishes the lanes with the queue. Each session gets its own
`brief/NNN` branch, so `main` is never contended. While `app/public/index.html`
is one 140KB file almost everything collides with everything, and running one
session is the correct answer more often than not.

**The four documents.** [`TRIAGE.md`](TRIAGE.md) fills the queue and cuts it into
lanes. [`AUTHOR.md`](AUTHOR.md) turns one commission into one brief. This file
executes it. [`REVIEW.md`](REVIEW.md) judges the report, writes the Outcome, and
merges. Each has its own pasteable block, each runs in its own session, and only
this one writes code.

**Why this prompt got short (2026-08-07).** The previous version spent ninety
lines explaining how to run a brief, because the briefs themselves deferred
their design decisions to whoever picked them up. The briefs now make their own
calls and carry their own anchors, steps, traps and acceptance tests, so the
session prompt only has to set the frame, the five facts, and the stage gates.
Judgement moved from the session into the brief; the prompt shrank to match.

**Why the five facts are inside the pasteable block** rather than linked: a
session that only receives the paste has to see them. They're also in the wiki's
[Replay API](https://github.com/fletch-spec/lol-replay-interface/wiki/Replay-API)
page, which is worth reading in full before brief 008.
