# Passoff Prompt - Overhead Session

One session works the queue 001 → 006, stopping after each brief for approval.
Paste once at session start. Updated 2026-08-04: 001-004 done, resume at 005.

---

```
You're running the brief queue for the LoL Replay Controller. A prior session
already shipped 001-004 - this is a continuation, not a fresh start.

Project: browser control panel for League of Legends replays. Runs on monitor 2,
drives the replay client on monitor 1, so I can record voiceover live in one pass.
Live replay control only - not an editor, not a stats tool.

Queue: C:\dev\lol-replay-interface\briefs\ready\ (005, 006 left)
Archive: C:\dev\lol-replay-interface\briefs\archive\ (001-004,
read these outcome sections if you want to see exactly what shifted from the
original brief text - several things did)
Code: C:\dev\lol-replay-interface\app\
Stack: Node + Express helper (server.js), single-file HTML/vanilla JS panel
(public/index.html), no build step, Windows.

Read the wiki's Replay API page now
(https://github.com/fletch-spec/lol-replay-interface/wiki/Replay-API) - it has hard-won gotchas from 001-004 that will
cost you real time to rediscover if you skip it. Highlights, so you can't miss
them even if you skip that step:

- **Camera follow-cam does not work.** `POST /replay/render` with
  `{selectionName, cameraAttached: true}` selects a champion but does not make
  the camera visually follow them, in any tested cameraMode (top/focus/path).
  `tps` mode closed the replay entirely once. Brief 006 needs this before
  building camera presets - don't assume `cameraAttached` gives a working
  follow, and treat `cameraMode` changes as carrying real crash risk.
- **Spectator hotkeys (1-5, Q/W/E/R/T) are a dead end.** PostMessage, SendInput
  keyboard, and SendInput mouse double-click were all tested with genuinely
  confirmed window focus - zero effect. Client-side input is blocked (almost
  certainly Vanguard). Don't re-attempt synthetic input of any kind.
- **`/liveclientdata/eventdata`'s `EventID` is not stable across seeks.** The
  client reassigns a new EventID to the same real event every time playback
  re-passes that point in time. Dedupe by content (event name + time bucket +
  killer/victim), never by EventID alone. This bit brief 004 for real - it
  shipped, got tested, and had to be fixed same-day.
- **Another app on this machine independently drives the same replay client**
  via the same API. If playback state changes with no request from this
  panel, that's the cause, not a bug here - ask the user to pause it before
  you rely on clean test signal.
- Panel layout: single centered `.panel` column (`app/public/index.html`),
  transport (brief 002) → roster (brief 003, moved below transport per user
  feedback, portraits render in rows not columns) → event timeline (brief 004,
  markers live inside the existing scrub track, event list floats as an
  absolute-positioned panel, not an in-flow column - it was cramped before).

Per brief:
1. Read only that brief. Don't preload the rest - you'll drift toward later scope.
2. Build it. "Can't Skip" is non-negotiable. "Hardest Part" is where you'll stall;
   handle it first, not last.
3. Field names in briefs are from memory. https://127.0.0.1:2999/swagger/v3/openapi.json
   is the authoritative spec (the /docs HTML page 404s on curl - fetch the
   swagger JSON directly). Check it before trusting a brief; several fields in
   001-004 were wrong or lived on a different endpoint than assumed.
4. Test against the live API/UI before calling anything done - don't just read
   code and assume it works. Verify with curl and/or the browser.
5. When done: brief state -> complete, set updated:, move ready/ -> archive/,
   append to brief_log.md, update the queue table and Stats in
   the wiki. If anything in the brief turned out wrong (API
   shape, an assumption, a mechanism that doesn't work), write an Outcome
   section into the archived brief file explaining what actually happened -
   the next session needs this more than a clean "done" checkbox.
6. STOP. Tell me what you built, what I should test, and anything the next brief
   should know. Wait for me to say next.

Never start the next brief without my go-ahead. If I say next without testing,
ask whether I actually ran it.

The helper may already be running (or may have been killed between sessions) -
check `http://localhost:3000` before assuming either way; restart with
`node server.js` from `app/` if it's down.

Escalate to me instead of deciding:
- any brief: if the API doesn't match the brief in a way that changes scope
- 005: if A/B loop or cue-point seeking interacts badly with the existing
  seek-mutex/coalescing in index.html - don't invent a second seek path,
  and don't paper over a real conflict either, ask
- 006: if a cameraMode change looks like it's about to repeat the `tps` crash
  from brief 003 - stop and confirm with me before you have League actually
  close on you again

Start with 005. Read it, and read the archived brief-004.md outcome section
(cue points click into the event timeline you're building on). Tell me your
plan before writing code.
```

---

## Notes

**Why gated.** Each brief is testable on its own and most need a live replay
running to verify. Batching them means finding out at brief 006 that 002's seek
debounce was wrong.

**Context.** Six briefs is more than one session should hold. Point 1 keeps it to
one brief at a time; the archive/ move means finished work drops out of the
working set naturally.

**Between briefs.** Fine to `/clear` after an archive step - the brief files and
log carry all the state forward. Repaste this prompt if you do.

**Why this got rewritten mid-project.** The original version of this prompt
assumed briefs would go roughly as written. In practice 001, 003, and 004 each
turned up a real gap between the brief text and the live API/client behavior -
wrong field, dead-end mechanism, unstable ID. The rewritten prompt front-loads
those findings instead of letting a fresh session rediscover them.
