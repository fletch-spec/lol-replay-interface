# Session Prompt

Paste once at session start. One session works the queue in order, one brief at
a time, stopping at the stage gates.

Updated 2026-08-08: 001-011, 013-020 done, 012 cut. Queue is
021 (last one). Briefs are verbose and self-contained - each
carries its own decisions, code anchors, steps, verification and traps - so
this prompt only has to set the frame and the gates.

Brief 017 (event labels + dedupe) is done but partial - the 2s dedupe bucket
still misses some jittered duplicate pairs that straddle its fixed grid
boundary (3 of 5 known cases). Brief 019 shipped the diamond fallback for
kill markers, not the X, for the same reason: this session's Browser pane
does not composite frames - `computer` screenshots time out - so any brief
needing pixel verification has to say so and rely on DOM measurement or
computed-colour math instead (see briefs 018 and 019's Outcomes). #7
(dragon/baron/herald audit) is still blocked - every replay available this
session has had zero neutral objective events of any kind, which brief 019
flagged as evidence for #7 without deciding it. See `TRIAGE.md` for how this
queue was filled.

---

```
You're running the brief queue for the LoL Replay Controller: a browser panel
that drives League replays on a second monitor so I can record voiceover live in
one pass. Live replay control only - not an editor, not a stats tool. If a
feature doesn't help someone talk over a replay in real time, it's out.

Queue:   C:\dev\lol-replay-interface\briefs\ready\   (order: 021)
Archive: C:\dev\lol-replay-interface\briefs\archive\ (001-020, read the Outcome sections)
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
  → STOP. Don't start the next brief without my go-ahead.

Notes on working the briefs:
- Line numbers in briefs are from commit e8e05b9 and will drift. Symbol names
  are stable - grep for those.
- The swagger at https://127.0.0.1:2999/swagger/v3/openapi.json is authoritative
  for field names (the /docs HTML page 404s on curl). Everything is reachable
  through the panel's own proxy at http://localhost:3000/api/..., which avoids
  the self-signed cert.
- Each brief has an "Escalate Instead Of Deciding" section. Use it.

Start at Stage 1 for brief 021.
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
