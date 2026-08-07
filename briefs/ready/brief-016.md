---
id: brief-016
state: ready
created: 2026-08-07
updated: 2026-08-07
agent: user
project: LOL-REPLAY-CONTROLLER
depends_on: [brief-004, brief-009]
executes_after: brief-015
model: sonnet
---

# Brief 016: The Event Harvest Loses Events

No issue number yet - this is the defect brief 009 found while closing
[#4](https://github.com/fletch-spec/lol-replay-interface/issues/4) and brief 010
stopped on. It blocks
[#7](https://github.com/fletch-spec/lol-replay-interface/issues/7). File it as an
issue when this brief is picked up so the close comment has somewhere to land.

> Line numbers in this brief are from commit `e8e05b9`. If they don't match,
> grep for the symbol name - the names are stable, the lines are not.

## Problem Statement

A scan does not capture the game. Measured twice, independently, in one session:

| Path | ChampionKill | Total |
|---|---|---|
| Scan through the panel, cached | ~10-11 | 15 |
| Direct query of `/liveclientdata/eventdata`, same position, seconds later | 19 | 24 |

Same replay, same playhead position, two different answers **by code path
alone**. Brief 009 ruled out "it just needs longer" directly - the count went
flat immediately rather than growing over a ten-second wait.

Everything downstream inherits this. The timeline, the event list, the next-event
readout and the marker density brief 014 built all read `eventsByKey`, and every
one of them currently under-reports a game by roughly a third with no indication
that anything is missing. The panel says "Events (15)" in exactly the same tone
whether that is the whole game or half of it.

## Done Looks Like

Scan a replay, then query `/liveclientdata/eventdata` directly at the same
position. The two lists match, or the difference is understood and written down.
Run it twice on the same replay and get the same number both times.

## Decision (already made - do not re-litigate)

**This is its own brief.** Briefs 004 and 009 are complete and archived; the log
and the wiki both treat archived briefs as closed history, and reopening one to
carry new work would make the queue stop describing what happened. 009's
`scanReplay()` is the thing being fixed, not the thing being extended.

**Instrument before changing anything.** Both prior sessions measured this from
the outside - counts in, counts out. Nobody has yet watched a single event get
dropped. The first two steps of this brief exist to find *where* the loss
happens, and the fix is whatever that finding says it is. Do not skip to a fix.

### The leading hypothesis, with its anchor

The panel **never fetches events itself**. `/liveclientdata/eventdata` is
requested once, in `server.js`'s `pollRoster()` (232), and reaches the panel only
as a WebSocket `events` broadcast (257) handled at `index.html` 3463. That poll
is a four-way `Promise.all` (236) - playerlist, render, eventdata, game - inside
a `try` whose `catch` is empty by design (258):

```js
} catch (err) {
  // Roster is reference data - a miss here isn't worth spamming the console.
}
```

**If any one of those four requests fails, the entire tick is discarded,
including the events.** The comment is true of the roster and false of the
events, which are cumulative state being reconstructed one tick at a time.

This fits the measurement. `scanReplay()` (2529) seeks to the end and then has a
window of six 500ms polls - about three chances at a 1Hz roster tick (`server.js`
12) - to receive anything at all. A seek is exactly when the client is most
likely to fail one of the other three requests. Lose one tick of three and the
cache is written short.

It also explains the part that looked supernatural: the direct query saw 24
because it asked the client, and the panel saw 15 because it asked the tick.

**Treat this as the first place to look, not as the answer.** If instrumentation
says the ticks all landed and the events still went missing, the hypothesis is
wrong and the finding is worth more than the fix.

### Second candidate: the early break

`scanReplay()` breaks out of its wait as soon as `GameEnd` appears (2545).
`GameEnd` was chosen as a definitive harvest-complete signal and it is not one -
brief 010 recorded it arriving well before the rest of the game backfills. If the
loop breaks on the first tick after the seek, the harvest caches whatever that
one tick carried.

### Rejected alternatives

- **Waiting longer.** Brief 009 already tested a ten-second wait and the count
  did not move. A longer timeout would make the scan slower and no more complete.
- **Polling `/liveclientdata/eventdata` from the panel directly**, bypassing the
  helper. It would probably work and it puts a second event pipeline in the app,
  which is how the two paths came to disagree in the first place. One pipeline.
- **Fetching events in their own poll loop with their own error handling** is a
  reasonable outcome of step 3, but it is a decision to reach with evidence, not
  the opening move.
- **Showing a "possibly incomplete" warning instead of fixing it.** Considered
  and rejected: the panel already distinguishes not-scanned from scanned, and
  adding a third state that means "scanned, but don't trust it" is an admission
  dressed as a feature.

## Where The Code Is

| What | File | Symbol | Line |
|---|---|---|---|
| The four-way poll | `app/server.js` | `pollRoster()` | 232 |
| Events request | `app/server.js` | `replayGet('/liveclientdata/eventdata')` | 239 |
| Silent catch | `app/server.js` | `pollRoster()`'s `catch` | 258 |
| Events broadcast | `app/server.js` | `broadcast({ type: 'events' })` | 257 |
| Roster tick rate | `app/server.js` | `ROSTER_POLL_INTERVAL_MS` | 12 |
| WS receive | `app/public/index.html` | `msg.events` handler | 3463 |
| Merge + dedupe | `app/public/index.html` | `mergeEvents()` | 2471 |
| Dedupe key | `app/public/index.html` | `eventFingerprint()` | 2158 |
| The scan | `app/public/index.html` | `scanReplay()` | 2529 |
| Early break | `app/public/index.html` | `GameEnd` check | 2545 |
| Cache write | `app/public/index.html` | `localStorage.setItem(eventsCacheKey()...)` | 2550 |
| Cache read | `app/public/index.html` | `loadCachedEvents()` | 2510 |
| Visible filter | `app/public/index.html` | `visibleEvents()` / `IGNORED_EVENT_NAMES` | 2171 / 2091 |

## Implementation Steps

1. **Get a baseline you can compare against.** With a replay loaded, query the
   client directly through the proxy and count:
   ```bash
   curl -s http://localhost:3000/api/liveclientdata/eventdata
   ```
   Record the total and the per-`EventName` breakdown at a known playhead
   position. This is the number the panel has to match.
   *Done when:* you have a written total from the client, not from the panel.

2. **Count the ticks, not just the events.** Add a temporary counter in
   `pollRoster()` (232) that logs how many ticks succeeded, how many threw, and
   how many events each broadcast carried. Run a scan.
   *Done when:* you can say how many roster ticks fired during the scan window
   and how many of them were swallowed by the `catch` at 258.

3. **Fix whatever step 2 found.** If ticks were dropped, the events request must
   stop sharing failure with the other three - it is cumulative state, they are
   snapshots. If the ticks all landed, the loss is downstream: instrument
   `mergeEvents()` (2471) for fingerprint collisions before assuming the client
   is at fault.
   *Done when:* re-running step 2's instrumentation shows no dropped events, by
   the mechanism you identified.

4. **Replace the `GameEnd` break with a settle condition** (2545). `GameEnd` is
   not a completion signal - stop treating it as one. Wait until the event count
   has stopped growing across consecutive ticks, with a hard ceiling so a stuck
   client cannot hang the scan forever.
   *Done when:* the scan ends because the count went flat, and the log says how
   many ticks it took.

5. **Verify the cache holds what the scan found.** The write at 2550 serialises
   `eventsByKey` at that instant. If it runs before the last merge lands, the
   session is right and the cache is short - which would show up as a scan that
   is correct until you reload.
   *Done when:* the cached entry's length equals the in-session count, checked in
   `localStorage`, not inferred.

6. **Re-run step 1 and compare.** Panel against client, same position.
   *Done when:* the two agree, or the remaining difference is entirely
   `IGNORED_EVENT_NAMES` (2091) and you have said so with the numbers.

## Verification

1. Fresh replay, no cache entry. Note the client's direct event count (step 1).
2. Scan. The panel's count matches the client's, minus ignored names only.
3. Reload the page. The cached count is the same number, not smaller.
4. Clear the cache, scan again. Same total as run 1 - twice in a row, since an
   intermittent tick failure will pass once by luck.
5. During a scan, the playhead returns to where it started (brief 009's
   guarantee - confirm it still holds).
6. Interrupt a scan by swapping replays mid-scan. No cache is written, playback
   is not stranded at the end of the game.
7. Let the panel sit for two minutes without scanning. Progressive events still
   accumulate from the 1Hz feed.
8. Compare `ChampionKill` counts specifically. That is the category the
   discrepancy was measured in and it is the one with enough volume to show a
   partial loss.

## Can't Skip

- **Measure before fixing.** Two sessions have already reported this from the
  outside; a third set of outside numbers is not progress.
- **The client's direct response is the ground truth.** Not the panel, not the
  cache, not what a previous brief wrote down.
- **Two consecutive identical scans.** One clean run proves nothing about a
  failure mode that is intermittent by nature.
- **`eventFingerprint()` stays the dedupe key.** `EventID` is reassigned on every
  re-pass (PASSOFF fact 3). If the fingerprint turns out to be *over*-merging,
  that is brief 017's territory - coordinate, do not both edit it.
- **The scan stays explicit and stays playhead-safe.** Brief 009 exists because
  an automatic harvest jumped the game to the end mid-recording. Nothing here
  reintroduces an uncommanded seek.
- **Write down what was actually wrong**, in the Outcome section, in mechanism
  terms. This defect has already survived two briefs by being described only as
  a count.

## Traps

- **The empty `catch` at 258 is deliberate and its comment is half right.** The
  roster genuinely is reference data that can miss a tick. The events genuinely
  are not. Do not "fix" it by logging louder - separate the failure domains.
- **`Promise.all` rejects on first failure.** The other three responses are
  already in flight and their results are discarded with it. `allSettled` is the
  obvious shape; make sure the broadcast then handles a partial tick sensibly
  rather than broadcasting `undefined` into `applyRenderState()`.
- **The 200ms fingerprint bucket** (`Math.round(event.EventTime * 5)`, 2161)
  merges by rounded time *plus* names. Two genuinely distinct kills by the same
  champion inside one bucket collapse into one event. That is a real loss channel
  and it is not the same bug as a dropped tick - if you find both, say so.
- **`harvestDone` gates the scan** (2530). A second scan on the same replay
  returns immediately, so "I scanned again and got the same number" may mean
  "nothing ran". Clear the cache and reload between comparison runs.
- **The cache key is `(gameMode, length)`** (`replayIdentity()`, 2491). Two
  replays of the same mode and the same rounded length share a cache entry. Not
  this brief's problem, but it will confuse a comparison run if you hit it.
- **Another app on this machine drives the same client** (PASSOFF fact 5). A seek
  you did not request during a scan is probably that. Ask before calling it a
  bug.
- **The Replay API returns 200 for unknown fields** (PASSOFF fact 1). Nothing in
  this brief writes to the API, but the seek in `requestSeek()` does - verify by
  reading position back.

## Out Of Scope

Event *labels* and semantic duplicates (brief 017), marker colour and shape
(brief 019), whether dragon/baron/herald exist in the feed at all (#7 - this
brief is what unblocks that question, not what answers it), and the
`(gameMode, length)` cache identity.

## Escalate Instead Of Deciding

- **If the ticks all land and the events still go missing**, stop. That means the
  client itself returns different data to two identical requests, which is a
  much larger finding than this brief anticipated and changes what the panel can
  promise at all. Write it up rather than working around it.
- **If the fix requires the scan to take noticeably longer than it does today**,
  say so with the number before shipping it. A scan is pressed between takes.
- **If `eventFingerprint()` turns out to be the main loss channel**, that
  overlaps brief 017's dedupe work directly. Say so rather than fixing it in both
  places.
