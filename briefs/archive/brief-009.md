---
id: brief-009
state: complete
created: 2026-08-06
updated: 2026-08-07
agent: user
project: LOL-REPLAY-CONTROLLER
depends_on: [brief-004]
executes_after: brief-008
model: sonnet
---

# Brief 009: Recording-Safe Event Harvest

Closes [#4](https://github.com/fletch-spec/lol-replay-interface/issues/4).

> Line numbers in this brief are from commit `d0ae049`. If they don't match,
> grep for the symbol name.

## Problem Statement

Opening a replay for the first time throws the game to the end and back. That is
brief 004's event harvest doing its job - the client's event feed is cumulative
and only reports what playback has already passed, so the only way to get a whole
game's events is to seek to the end, wait, and seek back. It is cached per replay
afterwards, so it happens once. The problem is that "once" happens at exactly the
moment you are most likely to have just hit record on a fresh replay, and a
30-second jump to the end of the game - including the result - is not something
you can edit out of a live single-pass recording.

## Done Looks Like

You hit record, open a replay, and start talking. Nothing moves the playhead
that you did not ask to move. The event timeline is either already populated
from cache, or populates when you say so, and the panel tells you which state
you are in.

## Decision (already made - do not re-litigate)

**Ship option 1: explicit harvest, with a prominent affordance.** Automatic
harvest on connect is removed. A "Scan replay" control appears when the timeline
is unpopulated and the cache is empty; pressing it runs the existing harvest.

Brief 004 chose automatic deliberately and this brief overturns that, so the
reasoning is recorded rather than left implicit:

- **Rejected: deferred harvest** (auto-run, but only while paused and before the
  first play). This was the previous favourite and it is wrong. It still moves
  the playhead without being asked, and it relies on the user not having hit
  record during the few seconds it takes - which is the exact failure this brief
  exists to prevent. A guard that works most of the time is worse here than no
  guard, because you stop watching for it.
- **Rejected: progressive fill only** (drop the harvest, populate as playback
  passes events). Never disruptive, but useless on a first watch, which is
  precisely when you need to find the fights. Note that progressive fill already
  happens - `mergeEvents()` runs off the 1Hz feed regardless - so this option is
  really "delete the harvest and accept an empty early timeline".
- **Rejected: invisible harvest** (hide the HUD, park the camera, harvest behind
  it). Investigated as the fourth option and it does not survive contact: the
  jump is in the *game footage*, not the HUD, so hiding interface elements hides
  nothing that matters. It also couples this brief to brief 006's cinematic
  state and to brief 008's camera work for no gain. Spend ten minutes on the one
  cheap check in step 1 below, then move on.

Explicit wins because it is the only option where the answer to "will this move
my playhead" is never "it depends".

## Where The Code Is

| What | File | Symbol | Line |
|---|---|---|---|
| The harvest itself | `app/public/index.html` | `harvestEvents()` | 2359 |
| Called on every new replay | `app/public/index.html` | `handleNewGame()` | 2395 |
| Cache key | `app/public/index.html` | `eventsCacheKey()` | 2349 |
| Shared replay identity | `app/public/index.html` | `replayIdentity()` | 2341 |
| The only seek path | `app/public/index.html` | `requestSeek()` | 2838 |
| Progressive merge from 1Hz feed | `app/public/index.html` | `mergeEvents()` | 2321 |
| Rail tab labels | `app/public/index.html` | `renderEventList()` | 2276 |
| Command table | `app/public/index.html` | `COMMANDS` | 3004 |
| 1Hz eventdata broadcast | `app/server.js` | `pollRoster()` | 231 |

## Implementation Steps

1. **Ten-minute check first, before writing anything.** Confirm the harvest is
   actually necessary by asking the client for everything it has at t=0:
   ```bash
   curl -s http://localhost:3000/api/liveclientdata/allgamedata | python -m json.tool | head -60
   curl -s http://localhost:3000/api/liveclientdata/eventdata | python -m json.tool
   ```
   with a freshly-opened replay parked near the start. If either returns the
   whole game's events without playback having passed them, this brief collapses
   into "delete the harvest" and everything below is unnecessary.
   *Done when:* you can state how many events each endpoint returns at t=0 on a
   replay you know contains ~130. Record the number in the Outcome section
   either way.

2. **Stop `handleNewGame()` from calling `harvestEvents()`.** Line 2402. The
   cache load must still happen automatically - only the seeking part becomes
   manual. Split `harvestEvents()` into two functions: one that loads from cache
   and returns whether it hit, and one that does the seek-to-end scan. Cache
   load runs on connect; the scan does not.
   *Done when:* opening an unharvested replay leaves the playhead exactly where
   it was, confirmed by watching the game, not by reading the code.

3. **Add a `scanReplay` command to the `COMMANDS` table** (3004) rather than a
   bare button. Brief 007 established that every action lives in that table so
   buttons and hotkeys cannot diverge; a new action that skips it is the exact
   drift the table exists to prevent. Give it a label, no hotkey (this is not an
   action you want on a keypress during a take), and an `enabled` predicate of
   `identityKnown() && !harvestDone`.
   *Done when:* the button appears in the transport card, disabled when there is
   nothing to scan.

4. **Make the timeline state legible.** An unscanned timeline showing 4 events
   must not look like a quiet game that genuinely had 4. Put the state on the
   Events tab label - `renderEventList()` at 2276 already writes
   `Events (${events.length})`. Three states: not scanned, scanning, scanned.
   Wording should say what to do, not what is wrong: "Events (4) - not scanned"
   with the button next to it.
   *Done when:* all three states are reachable and visibly different.

5. **Guard the scan against being started twice**, and against a replay swap
   mid-scan. `harvestToken` (1938) already exists for the second case and
   `handleNewGame()` already bumps it - keep both. Add an in-flight flag for the
   first.
   *Done when:* double-clicking the button does not fire two scans.

6. **Restore the playhead on interrupt.** If the panel is closed or the replay
   swaps mid-scan, playback must not be left parked at the end of the game. The
   existing code seeks back only on the success path (2391) - that is the hole.
   *Done when:* starting a scan and swapping replays mid-flight does not strand
   the previous replay at its end.

## Verification

1. Clear the cache for a test replay:
   `localStorage.removeItem('lol-events:CLASSIC:1760')` in the browser console
   (use the real key from `eventsCacheKey()`).
2. Reload the panel with the replay open and paused at 0:30.
3. **The playhead does not move.** Watch the game window, not the panel.
4. The Events tab says the timeline is not scanned, and a Scan button is live.
5. Press Scan. The game jumps to the end and back, the timeline fills, the
   label changes to scanned.
6. Reload the panel. The timeline is populated from cache instantly, no seek,
   no Scan button.
7. Start a scan, and while it runs, close the panel. Reopen it: playback is not
   parked at the end of the game.

## Can't Skip

- **Playback never moves without user intent.** Open a replay, do nothing, and
  the playhead is where you left it. This is the whole brief.
- **The existing cache still works.** A previously-scanned replay loads its
  timeline instantly with no seeking. This works today - do not regress it.
- **The user can tell which state they are in.** Four events because nothing was
  scanned must not look like four events because it was a quiet game.
- **No new seek path.** The scan uses `requestSeek()` (2838) exactly as
  `harvestEvents()` does today. Do not add a second one - the seek mutex and
  coalescing in `doSeek()`/`requestSeek()` are load-bearing.
- **The new action goes in `COMMANDS`.** No bare `addEventListener` that calls
  the scan directly.

## Traps

- **`EventID` is not a dedup key.** The client reassigns a new `EventID` to the
  same real event every time playback re-passes it. `eventFingerprint()` (2020)
  is the key. This bit brief 004 after it shipped; do not reintroduce it while
  refactoring the harvest.
- **`replayIdentity()` is `gameMode:length`** and is shared with cues. If this
  brief persists anything new, key it the same way. Do not derive identity a
  third time.
- **Identity is not known immediately.** `identityKnown()` (2345) needs both
  `gameMode` (arrives via a 3s retry loop at 1774) and `length`. A scan button
  enabled before identity lands will write to the wrong cache key.
- **`GameEnd` is in `IGNORED_EVENT_NAMES`** (1953) for display but is the
  harvest's completion signal, checked against `eventsByKey` directly at 2382.
  Do not "clean up" that apparent inconsistency.
- **The 3s timeout fallback matters.** `GameEnd` does not always arrive; the
  loop at 2379 gives up after ~3s. Keep the fallback.
- **Another app on this machine drives the same replay client.** If playback
  moves during your "it never moves" test, confirm that app is closed before
  filing it as a failure.

## Out Of Scope

What counts as an event, the category map, the dedup fingerprint, and anything
about how events are displayed. This brief changes *when* the harvest runs and
nothing else. Marker rendering is brief 014.

## Escalate Instead Of Deciding

- If step 1 finds that `allgamedata` returns the full event list, stop and
  report before deleting the harvest - that is a bigger change than this brief
  and it makes brief 010's premise wrong too.
- If removing the automatic harvest turns out to break the cue system's identity
  sync (`syncCuesToIdentity()` at 2480 runs in the same `handleNewGame()` async
  block), do not paper over it with a second identity path - ask.

## Outcome (2026-08-07)

Shipped as specified: `harvestEvents()` split into `loadCachedEvents()` (cache
read only, runs automatically from `handleNewGame()`, never seeks) and
`scanReplay()` (the seek-to-end-and-back, only runs from the new `scanReplay`
command, no hotkey). Added to `COMMANDS` and mounted in `#eventCmds` inside the
transport card, next to prev/next event. `commandButton()` needed one small
addition beyond the brief's steps: it unconditionally rendered `command.hotkey`
into a `<span>`, which would have printed the literal word "undefined" for a
hotkey-less command - guarded with `if (command.hotkey)`.

Three states verified live: "Events (N) - not scanned" before any scan or
cache hit, "Events (N) - scanning…" while `scanInFlight`, plain "Events (N)"
once `harvestDone`. Double-click guarded (button disables synchronously before
the first `await`). Interrupt case tested by bumping `harvestToken` 150ms into
a live scan: the `finally` block's `requestSeek(originalTime)` fired regardless
of the token mismatch, and no cache was written - confirmed by instrumenting
`requestSeek` directly rather than trusting the state afterward. Playhead
confirmed motionless across connect and reload via 100-150ms-interval polling
of `/api/replay/render`'s sibling endpoint `/api/replay/playback`, not by
watching the game window (no way to do that from this session - see below).

**Significant finding, not a regression in this brief's own code: the
inherited harvest mechanism (unchanged from brief 004) does not reliably
capture the whole game.** Testing this brief's Scan button against the live
replay (CLASSIC, length 1698s) produced a cached result of only 5-10 events
for a game later shown - by deliberately seeking to several different
timestamps and diffing `/api/liveclientdata/eventdata` - to contain at least
22 distinct events (10 `ChampionKill`, `TurretKilled`, `Multikill`, `GameEnd`,
plus early-game events). The scan's completion signal (poll for `GameEnd` in
the merged feed, 3s timeout) is satisfied almost immediately after seeking
near the end, but the rest of the game's events do not appear to backfill the
way brief 004 assumed - repeated 10-second polls of the raw feed after a
single seek showed the event count go flat immediately rather than grow, which
argues against "backfill just needs more time" as the fix. The accumulated
evidence looks like a per-vicinity cache keyed by where the client has been
seeked to, unioned across the session, rather than a true "everything before
current position" cumulative log. This directly corroborates the 2026-08-07 UI
review evidence cited in brief 010's premise (a 29-minute replay reporting 4
events). **Brief 010's own first step already says to stop and report if the
harvest is incomplete - this is that stop, arrived at one brief early.** Did
not attempt a fix here: changing the completion signal or seek strategy is a
real design decision belonging to whoever owns 010's finding, not a quiet
patch inside a brief scoped to *when* the harvest runs.

**Also not verifiable this session:** every "watch the game window" step in
Verification (steps 3, 5, 6, 7) was instead verified by polling the Replay API
directly (`/api/replay/playback`'s `time` field at 100-150ms intervals through
connect, scan, and reload) - no regressions found by that method, but it is
not the same evidence as an eyeball on the second monitor. Session had no
access to the actual League client window, only to the panel (via a real
browser against `localhost:3000`) and the API.

Picked up out of queue order: brief 008 (which this brief `executes_after`)
was still blocked on a physical mouse-disturbance test when this one started;
proceeded on the user's explicit go-ahead to work whatever was actionable.
