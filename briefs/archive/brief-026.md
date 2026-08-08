---
id: brief-026
state: complete
created: 2026-08-08
updated: 2026-08-08
agent: user
project: LOL-REPLAY-CONTROLLER
depends_on: [brief-016, brief-017]
executes_after: brief-025
model: sonnet
---

# Brief 026: Scan Replay Actually Scans The Replay

Closes [#24](https://github.com/fletch-spec/lol-replay-interface/issues/24).
Unblocks [#7](https://github.com/fletch-spec/lol-replay-interface/issues/7).

> Line numbers in this brief are from commit `91796a5`. If they don't match,
> grep for the symbol name - the names are stable, the lines are not.

> **This brief starts with a measurement, not a change.** Step 1 decides whether
> the rest of it runs. Brief 016 rewrote this exact function eight commits ago and
> its Outcome reported cached-equals-live twice; that is not the same claim as
> "the harvest is complete", and the difference is the whole brief.

## Problem Statement

`Scan replay` is the command you run once before narration so the timeline has
markers on it. What it does (`scanReplay()`, `:2620-2676`) is seek to
`length - 1`, poll until the merged event count stops growing, and seek back. It
never passes through the middle of the replay. Fletcher's report is that the
timeline comes back missing events from the stretches it skipped.

The premise the current implementation rests on is written at `:2617`: "Seeks to
the end so the client's cumulative event feed populates fully". If the feed is
genuinely cumulative - every event so far, regardless of where the playhead has
been - then a seek to the end is sufficient and #24's report has some other
cause. If the client only emits events playback has actually *passed*, then the
seek-to-end harvest can only ever collect what happens to be in the feed at the
end, and every scan since brief 004 has been incomplete.

Brief 016's evidence does not settle this. It measured the panel's cached array
against a live re-read of the panel's own merged state and got 29 = 29 twice.
Both sides of that comparison come from the same feed through the same
`mergeEvents()`; agreeing with itself is not the same as being complete. Brief 010
already named this failure mode - "the absence of a finding is not a finding".

This also blocks #7. Whether dragon, baron and herald events ever appear cannot be
answered against a harvest with holes, and three triage passes have now left #7
open for that reason.

## Done Looks Like

`Scan replay` plays the replay from 0 to the end at the fastest speed the client
holds reliably, collecting events the whole way, shows progress while it does,
can be cancelled, and puts the playhead, speed and paused state back exactly where
they were. The event count after a scan is greater than or equal to the count the
old seek-to-end harvest produced on the same replay, and the difference is
recorded with a per-`EventName` breakdown.

Or: step 1 shows the two methods produce identical event sets, in which case
nothing ships and the Outcome says so with the numbers.

## Decision (already made - do not re-litigate)

**Step 1 is a measurement and it gates the brief.** Old method vs full
play-through on the same replay, same panel, counts and per-`EventName`
breakdowns for both. If they match, stop and report - #24's premise would be
wrong and the real cause is elsewhere.

**If they differ, the harvest becomes a play-through.** Seek to 0, set the highest
verified speed, unpause, let it run to the end while the existing 1Hz poll merges
events, then restore. This is the only method that guarantees playback passes
every moment of the replay, which is the property the seek-to-end harvest never
had.

**The maximum speed is measured, not assumed.** The presets stop at 4× (`:1311`)
but `setSpeed()` (`:3277`) posts whatever number it is given. Probe 4, 8, 16, 32:
write the speed, **read `/replay/playback` back** and confirm the client reports
it (PASSOFF fact 1 - the API returns 200 for values it ignores), then let it run
5 seconds and check `time` advanced by roughly `5 × speed`. The highest speed that
passes both checks is the scan speed. A client that reports 16× and advances at 4×
is the exact failure this catches.

**The scan gets a progress readout and a cancel.** At 16×, a 35-minute replay
takes over two minutes. The old scan took about two seconds and could get away
with a disabled button; a two-minute one cannot. The `Scan replay` button becomes
the progress surface (`Scanning… 34%`) and clicking it cancels.

**The event cache is versioned.** `eventsCacheKey()` (`:2583`) keys on
`(mode, length)` with no notion of *how* the events were collected. Without a
version bump, every replay already scanned serves its old incomplete array from
localStorage and the fix appears to do nothing on exactly the replays used to test
it.

### Rejected before starting

- **Keeping seek-to-end and adding a second pass.** It does not address the
  middle, which is the report.
- **Chunked seeking** - seek every N seconds and settle at each stop. Each seek is
  a pause/seek/settle/unpause round trip through `withMutex` (`doSeek()`, `:3222`),
  so a 35-minute replay at 30s steps is 70 of them; and brief 017 established that
  re-passing a time range re-emits the same event with a new `EventID` and up to
  ~1s of `EventTime` jitter, which its 2s dedupe bucket still fails to merge in 3
  of 5 known cases. Chunked seeking maximises exactly the duplicate-jitter problem
  that is already only partly fixed. A single forward pass minimises it.
- **Running the scan automatically on connect.** Deliberately rejected at `:2619`
  and again by the no-hotkey decision at `:3460-3462`: this moves the game to a
  different point in time and must never be reachable by accident.
- **Raising the speed presets to include 16×.** The presets are narration speeds
  chosen in brief 015; the scan speed is an internal number and does not belong in
  that row.
- **Fixing the dedupe jitter here.** Brief 017 owns it and reported it honestly as
  incomplete. If the play-through makes it worse, that is a finding for the
  Outcome, not a second fix in this brief.

## Where The Code Is

| What | File | Symbol | Line |
|---|---|---|---|
| The harvest | `app/public/index.html` | `scanReplay()` | 2620-2676 |
| The premise, in a comment | `app/public/index.html` | `// Seeks to the end so the client's cumulative event feed populates fully` | 2617 |
| Settle poll (brief 016) | `app/public/index.html` | `SETTLE_INTERVAL_MS` / `REQUIRED_STABLE_TICKS` | 2637-2655 |
| Harvest flags | `app/public/index.html` | `harvestDone` / `scanInFlight` / `harvestToken` | 2098, 2621-2622 |
| Cache key | `app/public/index.html` | `eventsCacheKey()` | 2583 |
| Identity gate | `app/public/index.html` | `identityKnown()` | 2587 |
| Cache load | `app/public/index.html` | `loadCachedEvents()` | ~2600-2612 |
| Event merge | `app/public/index.html` | `mergeEvents()` / `eventsByKey` | grep |
| Command definition | `app/public/index.html` | `COMMANDS.scanReplay` | 3463-3467 |
| Command button | `app/public/index.html` | `commandButton()` / `refreshCommands()` | 3526 / 3552 |
| Speed write | `app/public/index.html` | `setSpeed()` / `optimisticSpeed` | 3277 |
| Pause write | `app/public/index.html` | `togglePause()` / `postPlayback()` | 3267 / 3190 |
| Seek | `app/public/index.html` | `requestSeek()` / `doSeek()` | 3238 / 3222 |
| Seek settle wait | `app/public/index.html` | `waitForSeekSettled()` | 3203 |
| Write serialisation | `app/public/index.html` | `withMutex()` | ~1462 |
| **A/B loop, which will fight the scan** | `app/public/index.html` | `checkLoop()` | 2869-2876 |
| Loop state | `app/public/index.html` | `loopEnabled` / `loopA` / `loopB` | 2717-2719 |
| Replay swap detection | `app/public/index.html` | `checkGameChange()` / `handleNewGame()` | 2694 / 2678 |
| Server-side poll (1Hz) | `app/server.js` | `pollRoster()` | ~209-260 |

## Implementation Steps

1. **Measure the two methods against each other. This step decides the brief.**
   With a replay loaded and no cached events (`localStorage.removeItem(eventsCacheKey())`
   then reload):
   a. Run the current `Scan replay`. Record `eventsByKey.size` and a per-`EventName`
      breakdown.
   b. Clear the cache and reload again.
   c. Play the replay through from 0 to the end manually at 4×, without seeking.
      Record the same two numbers.
   *Done when:* you have both breakdowns side by side. **If they are identical,
   stop here.** Write the Outcome, report to Fletcher, and do not change
   `scanReplay()` - #24's premise would be wrong and the cause is somewhere else.

2. **Find the speed ceiling.** For each of 4, 8, 16, 32: `postPlayback({speed})`,
   then `GET /api/replay/playback` and confirm the reported speed matches; then
   wait 5s and confirm `time` advanced by roughly `5 × speed`. Also watch for the
   client dropping frames or the WS going quiet.
   *Done when:* you can name the highest speed that both reports correctly and
   advances correctly, with the measured numbers. If nothing above 4× holds, say
   so - the play-through still fixes the completeness bug, it is just slower.

3. **Rewrite `scanReplay()` as a play-through.** Capture `time`, `speed` and
   `paused` first. Seek to 0, set the scan speed, unpause, then poll until
   `lastPolled.time >= length - 1` or the token is invalidated. Keep the existing
   `harvestToken` check on every tick.
   *Done when:* the playhead visibly travels the whole bar and markers accumulate
   as it goes.

4. **Neutralise the A/B loop for the duration.** `checkLoop()` (`:2870`) seeks back
   to A whenever `time >= end` while `loopEnabled` and not paused. With a loop
   armed, that turns the scan into an infinite loop between A and B. Suspend it
   during the scan and restore the exact prior state after.
   *Done when:* a scan started with a loop armed completes, and the loop is still
   armed with the same A and B when it finishes.

5. **Add a stall guard.** If `time` has not advanced across several consecutive
   poll ticks, abort rather than spin - the client can stop responding, and the old
   code's `MAX_TICKS` ceiling (`:2639`) existed for the same reason. Report the
   abort in the UI and keep whatever events were collected.
   *Done when:* the scan cannot hang the panel indefinitely.

6. **Restore everything, on every exit path.** Speed, paused state and playhead, in
   the `finally` block, exactly as `:2666-2675` already does for the playhead.
   Restoring speed has to go through `setSpeed()` so `optimisticSpeed` (`:3278`)
   does not desync the speed chip.
   *Done when:* after a completed scan, a cancelled scan, and a scan interrupted by
   a replay swap, the transport reads what it read before - verified by reading
   `/api/replay/playback` back, not by looking at the chip.

7. **Progress and cancel on the button.** `Scanning… NN%` from `time / length`,
   and a click while scanning cancels. `COMMANDS.scanReplay.enabled` (`:3466`)
   currently returns false while `scanInFlight`, which would disable the button it
   now needs to live on.
   *Done when:* progress updates at least once a second and cancel returns the
   playhead within a couple of seconds.

8. **Version the cache key.** Add a scan-method version to `eventsCacheKey()` so
   old incomplete arrays are not served.
   *Done when:* a replay that was scanned before this change re-scans instead of
   loading from cache.

9. **Re-measure.** Same replay, same breakdown as step 1. Record the delta.
   *Done when:* new count ≥ old count, and you can name which `EventName`s the old
   method was missing.

## Verification

1. Fresh replay, no cache. Run `Scan replay`. The playhead travels 0 → end, the
   button shows increasing progress, markers accumulate along the bar.
2. When it finishes, the playhead, speed and paused state are back where they
   started - confirmed from `GET /api/replay/playback`, not from the chips.
3. The event count is ≥ the step-1 old-method count, with the per-`EventName`
   delta recorded.
4. Reload: events come straight from cache, no re-scan, same count.
5. Cancel mid-scan: playback stops advancing, playhead returns, speed and paused
   restore, and events collected so far are kept.
6. Start a scan with an A/B loop armed: it completes, and A, B and the armed state
   survive.
7. Start a scan with a cue placed, then check the cue cursor - `requestSeek()`
   clears `activeCue` unless `keepCueCursor` is passed (`:3241-3245`). Decide
   deliberately which behaviour a scan should have, and state it.
8. Swap the replay mid-scan (or simulate it by bumping `harvestToken`): the scan
   abandons, does not write a cache entry, and does not leave the client parked at
   the end.
9. **Negative case:** with no replay, `Scan replay` is still disabled.
10. **Negative case:** after a scan, `‹ Event` / `Event ›` step through the events
    in time order and the hover cards still show the right champions.
11. **Negative case:** the 2s dedupe bucket from brief 017 has not got worse -
    compare the count of same-`EventName` pairs under 2s apart before and after.
12. **For #7:** after a complete scan, report whether any dragon, baron or herald
    events appear at all, with the raw `EventName`s seen. Do not answer #7 - just
    hand it the evidence it has been waiting three triage passes for.

## Can't Skip

- **Step 1 runs before any code changes.** If the premise is wrong, everything
  after it is a rewrite of a working function - and brief 016 rewrote it eight
  commits ago.
- **Read state back after every write.** PASSOFF fact 1. Especially the speed
  probe, which is precisely a case of the API accepting a value it may ignore.
- **Never send `cameraMode: "tps"`.** PASSOFF fact 2, #9. Nothing here should
  touch camera state at all.
- **Restore speed, pause and playhead on every exit path**, including cancel and
  replay swap.
- **Version the cache key**, or the fix is untestable on the replays you have.
- **Report the per-`EventName` delta**, not just a total. "More events" is not a
  finding; "the old method missed every `TurretKilled` before 12:00" is.

## Traps

- **PASSOFF fact 5: another app on this machine drives the same replay client.**
  Unexplained playback movement during a two-minute scan is probably that. Ask
  before calling it a bug - and be aware it can also make a broken scan look like
  it worked.
- **`checkLoop()` will fight the scan** (`:2870`). Step 4 exists for this and it is
  the single most likely way this brief produces an infinite loop.
- **`doSeek()` pauses, seeks, waits, then unpauses** (`:3222-3236`). Sending an
  unpause of your own right after `requestSeek()` races that sequence through the
  mutex. Let `doSeek()` finish, or set the play state inside the same mutex block.
- **`optimisticSpeed`** (`:3278`, cleared at `:3642`) makes the speed chip show
  what was requested rather than what the client reports. During a scan that is
  exactly backwards - trust the polled value when measuring in step 2.
- **The client's eventdata is not idempotent across seeks** (brief 017's Outcome):
  re-passing a range re-emits the same event with a new `EventID` and up to ~1s of
  `EventTime` jitter, and the 2s dedupe bucket still misses 3 of 5 known jittered
  pairs. A single forward pass is the shape that minimises this; anything that
  re-passes a range multiplies it.
- **Events are merged by the server's 1Hz `pollRoster()`**, not by the scan. At 16×
  a 35-minute replay is ~130 poll ticks for ~2100 seconds of game time. If the feed
  turns out to be a *delta* rather than cumulative, that resolution matters and the
  scan speed has an upper bound set by the poll rate, not by the client. Step 1's
  measurement is what tells you which world you are in - say which.
- **`harvestDone` gates both the button and the cache write** (`:2621`, `:2664`).
  A cancelled scan must not set it.
- **Brief 023 moves the game-mode string out of the DOM.** If it has run,
  `eventsCacheKey()` reads a variable rather than `gameModeEl.textContent`. Read
  the function, do not assume either shape.

## Out Of Scope

The dedupe bucket (brief 017 owns it, and its incompleteness is documented).
Answering #7 - collect the evidence, hand it over, do not decide it. The event
list UI, marker rendering, clustering and hover cards. The speed presets row
(brief 024). Auto-scanning on connect - rejected above and at `:2619`.

## Escalate Instead Of Deciding

- **If step 1 shows the two methods agree**, stop. Do not "fix" a function that is
  not the cause; report the numbers and let Fletcher say what he saw.
- **If no speed above 4× holds**, stop before shipping and say what a full scan
  will actually cost in wall-clock minutes for a 35-minute replay. A three-minute
  scan may still be the right answer - but Fletcher should choose it knowingly,
  because #24 asked for "16× or faster".
- **If the play-through makes brief 017's duplicate problem measurably worse**
  (verification 11), stop and report the numbers. Trading completeness for
  duplicates is a project-level call.
- **If the scan turns out to need the panel to stay focused for two minutes**, say
  so - that is a real constraint on a pre-take workflow and it needs writing down
  rather than working around.

## Outcome

**Step 1 did not agree, so the brief ran in full.** Seek-to-end (old method), on
this session's one available replay: 92 events. A full manual play-through
from 0 at 4x-then-32x, no seeking: 101 events. Missing from the old method:
5 `ChampionKill`, 2 `TurretKilled`, 1 `Multikill`, 1 `Ace`. #24's premise
holds - the client's event feed is not cumulative regardless of where
playback has been, it only carries what playback has actually passed over.
Rewrote `scanReplay()` as decided: no seek, one forward pass at the highest
verified speed, restore everything after.

**Speed ceiling (step 2), measured properly on the second attempt.** The
first probe run gave `deltaTime: 0` at every speed tested and looked like a
total failure - the replay was sitting with `time ≈ length` (parked at the
very end from earlier testing), so nothing could advance regardless of
speed; the bug was in the probe's setup, not the client. Re-run from a point
with real runway ahead of it: 4x, 8x, 16x and 32x all reported back correctly
and advanced within ~1% of `5 × speed` over a 5s window. Shipped `SCAN_SPEED
= 32` - a 1623s (27min) replay takes roughly 51s to pass, not two minutes.

**Mutex/settle-drop trap (Can't Skip list, `doSeek()`'s own comment)
respected by not calling `requestSeek()`/`setSpeed()`/`togglePause()` for the
scan's own start/restore sequences.** Those each open their own
`withMutex()`; calling one from inside a `withMutex()` block I'm already
running in deadlocks (the inner call queues behind a queue slot my own
still-running block occupies). Wrote the start and the restore each as one
self-contained `withMutex()` sequence using the raw `postPlayback()` /
`waitForSeekSettled()` primitives directly - pause, seek, wait for settle,
then speed and pause as absolute writes, never a relative toggle (which
would have raced `lastPolled.paused` reading its own stale pre-seek value).

**Verified live, restoration exact:** captured a distinctive state before a
scan (`time:222, speed:2, paused:true`, loop armed A=30/B=40) and confirmed
it came back byte-for-byte after a completed scan, read from
`/api/replay/playback` and the loop variables directly, not the chips.
Cancel mid-scan (clicking the button while `scanInFlight`, which is now
`cancelScan()` rather than a no-op) restored the pre-scan state within
seconds, kept the events collected so far, left `harvestDone` false, and
wrote no cache entry. Progress genuinely updates from the polled time
(`Scanning… 36%` → `100%`), not a fake timer. The active cue cursor is
explicitly cleared when a scan starts (**step 7's decision, made and
stated**: a scan sweeps the whole timeline, so whatever cue was "active"
before it means nothing about where the playhead now is - same rule
`requestSeek()` already applies to every other non-cue-navigation seek).
Event steppers still walk the harvested set in time order afterward.
`eventsCacheKey()` is versioned (`v2`); reloading after a completed scan
loads instantly from that cache with no re-scan.

**A finding the brief asked for, and it's a real cost, not a clean win:**
running the scan repeatedly against the *same still-open* replay client
(never restarted between test runs this session) produced a *growing* count
each time - 101, then 106, then 109 - on a game whose real event history
does not change. Checked whether this is brief 017's known jitter-duplicate
problem rather than something new: of the 106-event set, 34 pairs share the
same `EventName` within 2 seconds of each other, most with identical
killer/victim and sub-second gaps - the exact shape brief 017 already
documented (same event re-emitted with a new `EventID` and up to ~1s of
`EventTime` jitter, straddling the 2s dedupe bucket's fixed grid). **I could
not produce a clean before/after pair-count**, because the old method's raw
event list wasn't preserved before being overwritten in step 1's own
measurement - so I can't say precisely whether a *single* pass makes the
jitter measurably worse than a *single* seek-to-end did. What the repeated-
scan drift does show is that this replay's client re-emits jittered
duplicates on *every* pass it's played, old method or new, and a full pass
is longer exposure to the same mechanism than a two-second settle-poll was.
This is squarely brief 017's bug, not introduced here, and not fixed here
per this brief's own scope - but the honest report is that completeness and
duplicate-noise are in tension, and only the first was this brief's job.

**For #7, the evidence it's been waiting three triage passes for:** zero
`DragonKill`, `BaronKill`, or `HeraldKill` events across every harvest run
this session - the 92-event seek-to-end pass, the 101/106/109-event full
play-throughs, all zero. This is now a materially stronger absence than
before: the old method could plausibly have missed neutral objectives by
skipping the parts of the game where they happen, but a full pass that
still finds none rules that out as the explanation. This does not answer
#7 - it hands over the one fact that was missing to answer it.
