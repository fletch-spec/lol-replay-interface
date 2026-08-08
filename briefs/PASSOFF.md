# Session Prompt

Paste once at session start. One session works the queue in order, one brief at
a time, stopping at the stage gates.

Updated 2026-08-08 (fourth pass): 001-011, 013-020, 022-026 done, 012 cut. Queue
is **027 → 028 → 029 → 030**. Briefs are verbose and self-contained - each
carries its own decisions, code anchors, steps, verification and traps - so this
prompt only has to set the frame and the gates.

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
stream in-browser) has an empty body and no brief - it needs a written premise
before the scope test can be applied to it. See `TRIAGE.md` for how this queue
was filled.

---

```
You're running the brief queue for the LoL Replay Controller: a browser panel
that drives League replays on a second monitor so I can record voiceover live in
one pass. Live replay control only - not an editor, not a stats tool. If a
feature doesn't help someone talk over a replay in real time, it's out.

Queue:   C:\dev\lol-replay-interface\briefs\ready\   (order: 027 → 028 → 029 → 030;
         021 also sits here, blocked on a physical client toggle - skip it)
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

Work ONE brief at a time, in four stages:

  STAGE 1 - ORIENT. Read only that brief. Confirm the helper is up
  (http://localhost:3000; `node server.js` from app/ if not) and a replay is
  loaded. Tell me your plan and anything in the brief that looks wrong.
  → STOP. Wait for my go-ahead.

  STAGE 2 - BUILD. Work the Implementation Steps in order, satisfying each
  "Done when" before moving on. Read Traps before writing, not after. The
  Decision section is settled - it lists what was rejected and why. If you think
  a decision is wrong, stop and say so; don't quietly substitute your own.

  STAGE 3 - VERIFY. Run every numbered step in the brief's Verification section
  against the live app. Not the code - the app. Report what passed and what
  didn't, honestly. A partial pass is a partial pass.
  → STOP. Wait for me to test it myself.

  STAGE 4 - CLOSE. state -> complete, set updated:, move ready/ -> archive/,
  append one line to brief_log.md, update the wiki queue table and Stats. If
  anything in the brief turned out wrong - API shape, an assumption, a mechanism
  that doesn't work - write an Outcome section into the archived brief saying
  what actually happened. That matters more than a clean "done".
  Then close the brief's issue with a comment naming what shipped, and COMMIT
  AND PUSH. `git status --short` and `git log --oneline origin/main..main` both
  come back empty before you stop. GitHub is the source of truth - nothing stays
  on this machine.
  → STOP. Don't start the next brief without my go-ahead.

Notes on working the briefs:
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

Start at Stage 1 for brief 027.
```

---

## Notes

**Why staged and gated.** Each brief is testable on its own and most need a live
replay to verify. Batching them means finding out at 014 that 009's harvest
change was wrong. The gate after Stage 3 exists because I test it, not the
session - if I say "next" without having tested, ask.

**Between briefs.** Fine to `/clear` after Stage 4 - the brief files and the log
carry the state forward. Repaste this prompt if you do.

**When the queue runs dry**, see [`TRIAGE.md`](TRIAGE.md) - the companion process
that turns open issues into the briefs this prompt executes. It has its own
pasteable block and its own rules, and it deliberately writes no code.

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
