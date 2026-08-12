# Session Prompt

Paste once at session start. One session takes one brief, works it end to end
without stopping, and hands back two files.

**Start it with `/stonne`** (optionally `/stonne 027`). That skill declares the
model tier, refuses to run an `opus` brief or to build on top of an unreviewed
branch, picks the head of the queue, and then hands off to this file. Pasting the
block below by hand still works and does the same thing, minus the refusals.

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

Updated 2026-08-12 (fifth triage pass): 001-011, 013-020, 022-028 and 032 done,
012 cut. Queue is **034 → (029 → 030 | 035) → 033**, and it is two lanes rather
than a line for the first time - see the lane block below. Briefs are verbose and
self-contained - each carries its own decisions, code anchors, steps, verification
and traps - so this prompt only has to set the frame and the handoff.

**The 140KB file is gone, and so is the rule that came from it.** Brief 032 split
`app/public/index.html` into `index.html` (150 lines of markup), `panel.css` and
`panel.js`, byte-identically, and re-pointed every ready brief's code table as a
step. The old note here - *everything collides with everything, run ONE session* -
was true of one file and stopped being true at that merge. Read by anchor into the
right one of the three; a CSS-only brief no longer loads 95KB of JS to do it.

**031 and 021 are both blocked on Fletcher's hands, not on work.** 031 needs a
Windows Firewall inbound rule for TCP 3000 and a second physical machine on the
LAN; 021 needs streamer mode toggled inside the League client. Neither is in the
running order, both stay in `ready/` as records. The same is true of **#7/#14**
(needs a replay known to contain a dragon or baron) and **#16** (behind 021). Four
of ten open issues sit here, which is the actual reason the queue is thin -
authoring more briefs does not fix it.

**Everything is committed and pushed** as of `c647538`. Briefs 029 and 030 carry
line numbers from brief 032's merge commit, split across `index.html`, `panel.css`
and `panel.js`; their prose still cites pre-split line numbers and says so in its
own header note. Symbol names are stable, line numbers are not - grep. Nothing
stays in the working tree between sessions: wraps and triage passes both push, and
GitHub is the source of truth.

**029 and 030 close issues GitHub already thinks are done.** #28 and #29 were both
closed as COMPLETED on 2026-08-08, one second apart and with no comment, before
either brief was written - and neither brief has run. Both mechanisms are still
live at `c647538` (`nearestCluster()` measures a point against `SNAP_PX = 8`;
`.panel` is still capped at 1400px with an unwrapped `.timeline-row` against a
330px `.rail`). The fifth triage pass escalated the reopen to Fletcher rather than
doing it, because reopening changes an issue's meaning. **Build them anyway** -
the defects are real and the closure is the bookkeeping error, not the brief.

029 and 030 came from the fourth triage pass - 029 is the hover dead zone over a
wide cluster's count digit, 030 is panel scaling - and they share the marker
gutter: 029 owns where the hit test thinks a marker is, 030 owns where its box is,
so 030 re-runs 029's sweep as a step and they stay in that order. 033/034/035 came
from the fifth: 034 and 035 are the first briefs this queue has had that touch no
app code at all, which is what makes a second lane possible.

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
without deciding it; #14's empty-lane residue rides with it), and **#16**
(streamer mode disabling camera control, behind 021's client toggle). **#31** (OBS
LAN stream in-browser) has its premise and its research on the issue: the control
half is brief 031 and the video card is backlogged behind it, but 031 itself is
now blocked on the firewall rule and the second machine, so neither half is
runnable today. See `TRIAGE.md` for how this queue was filled.

---

```
You're running the brief queue for the LoL Replay Controller: a browser panel
that drives League replays on a second monitor so I can record voiceover live in
one pass. Live replay control only - not an editor, not a stats tool. If a
feature doesn't help someone talk over a replay in real time, it's out.

Queue:   C:\dev\lol-replay-interface\briefs\ready\
         Order: 034 → (029 → 030 | 035) → 033
         Lanes: 034 FIRST and alone. It rewrites this file's Stage 3, so
                landing it before 029 makes 029 and 030 cheaper to build
                rather than only helping some later brief. Minutes of work,
                and #37 puts a 2026-08-31 deadline on it.
                Then two lanes run side by side, owns: sets disjoint:
                  A: 029 → 030   app/public/panel.js + panel.css (marker
                     gutter, shared - 029 owns where the hit test thinks a
                     marker is, 030 owns where its box is, in that order)
                  B: 035         .claude/ only, no app code
                033 LAST and only if the app queue refills - it owns
                panel.js whole, so it collides with both of lane A, and a
                module split pays off across future briefs that do not
                currently exist. Do not start it before 029 and 030 merge.
         Numbers are not execution order here and that is deliberate: 033 is
         named in report-032-bindings.md on main, and renumbering would make
         a merged document lie. Same exception 031 ran under.
         021 and 031 also sit in ready/, both blocked on physical hardware
         Fletcher has to set up - skip them.
Archive: C:\dev\lol-replay-interface\briefs\archive\ (001-020, 022-028, 032, read the Outcome sections)
Code:    C:\dev\lol-replay-interface\app\ - Node helper (server.js) + vanilla-JS
         panel split across public/index.html (markup, 150 lines),
         public/panel.css and public/panel.js. No build step. Windows.

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
- READ BY ANCHOR, NOT BY FILE. panel.js is ~95KB and panel.css ~39KB; once you
  read one whole it sits in context for every remaining turn of the session, and
  that resident context is the single largest thing this project spends tokens on.
  The brief's "Where The Code Is" table exists so you don't have to: read the
  named ranges plus surrounding context, and grep for symbols beyond that. Brief
  032 split the old single file precisely so a CSS brief never loads the JS.
- Line numbers in briefs 029 and 030 are from brief 032's merge commit and are
  split across the three files; the prose inside those briefs still cites
  pre-split numbers and says so in its own header note. Symbol names are stable -
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

Start at Stage 1 for brief 034.
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
`brief/NNN` branch, so `main` is never contended. This became real on 2026-08-12:
briefs 034 and 035 touch no app code at all, so lane B genuinely runs beside lane
A. Inside `app/` the old caution still mostly holds even after 032's split -
`panel.js` is 95KB and any brief owning it whole blocks the lane.

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
