---
id: brief-027
state: complete
created: 2026-08-08
updated: 2026-08-10
agent: user
project: LOL-REPLAY-CONTROLLER
depends_on: []
executes_after: brief-026
model: sonnet
---

# Brief 027: Dedupe By Gap From An Anchor, Not By A Fixed Grid

Finishes [#13](https://github.com/fletch-spec/lol-replay-interface/issues/13) -
the half brief 017 measured and reported rather than silently re-tuned.

> Line numbers in this brief's `Where The Code Is` table are from brief 032's
> merge commit (`app/public/panel.js`, post-split). Inline line references in
> the prose below are unchanged and predate the split. If the numbers don't
> match, grep for the symbol name; the names are stable, the lines are not.

## Problem Statement

`eventFingerprint()` (`:2419`) buckets time with `Math.round(event.EventTime *
0.5)`. That is a **fixed grid**, not a tolerance. Its cell boundaries fall on odd
seconds - `t*0.5` crosses a `.5` rounding point at `t = 1, 3, 5, 7…` - so two
copies of the same kill land in the same bucket or not depending on *where* they
fall, not on how far apart they are. Two copies 0.18s apart at 2.95s and 3.05s
round to 1 and 2 and survive as two rows. Two copies 1.9s apart at 3.1s and 5.0s
both round to 2 and merge. The effective tolerance is anywhere between 0s and 2s
and the user cannot tell which they got.

Brief 017 widened the bucket from 200ms to 2s and measured the result honestly:
reprocessing brief 016's cached 29-event array dropped it to 27 - exactly 2 named
duplicate pairs merged - while **3 other known jittered pairs (gaps of 0.91s,
0.25s and 0.18s) still did not merge**, because they straddle the grid boundary.
The 0.18s pair is the clearest statement of the bug: a fifth of a second apart,
unmistakably the same kill, two rows.

Brief 026 made this worse in practice without changing a line of it. The old
seek-to-end harvest exposed the feed for about two seconds; the new full
play-through exposes it for ~51 seconds of re-passed game time, and brief 026's
Outcome recorded the consequence directly - repeated scans against the same still
open replay client produced **101 → 106 → 109** events, with 34 same-`EventName`
pairs inside 2s of each other in the 106-set. That is not a cosmetic list
problem. `sortedEvents` (`:2449`) drives the marker clusters (`:2466`), the
`‹ Event` / `Event ›` steppers (`:2584`), the next-event readout (`:2567`) and
the `Events (N)` count. A take narrated off a timeline that says a fight had
eight kills when it had five is a take narrated off a wrong number.

## Done Looks Like

Two copies of the same event whose `EventTime` values differ by less than the
tolerance merge into one row **regardless of where they fall in absolute time**.
Specifically: the 3 pairs brief 017 named (0.91s, 0.25s, 0.18s) merge, the 2 it
already merged still merge, and no genuinely distinct event disappears - the
multikill sequence and the per-kill rows around it are unchanged in count. Two
consecutive full scans of the same replay in one session produce the **same**
event count, not a growing one.

## Decision (already made - do not re-litigate)

**Dedupe becomes two-stage: a time-free identity, plus an anchored gap test
inside that identity.**

1. `eventIdentity(event)` is today's tuple **with the time term removed** -
   `EventName | KillerName | VictimName | Recipient | Acer | TurretKilled |
   InhibKilled | KillStreak`. Everything already in the tuple stays in it,
   including `KillStreak`, which is what keeps a climbing multikill from
   collapsing (`:2415-2418` explains why it is there - that reason is unchanged).
2. A new side index maps each identity to the list of **anchor times** already
   seen for it. A new event merges into an existing anchor when
   `Math.abs(anchor - event.EventTime) <= DEDUPE_TOLERANCE_S`; otherwise its own
   time becomes a new anchor for that identity.
3. `eventsByKey` stays a `Map` whose values are events - every current reader
   (`visibleEvents()` `:2434`, the cache write `:2937`) keeps working unchanged.
   Only the key changes, from `identity|gridCell` to `identity|anchorTime`.

**The anchor never moves.** A copy that merges does not become the new anchor and
does not extend the window. This is the whole reason to write it as an anchor
rather than "within 2s of the last one seen": three copies at t, t+1.9, t+3.7
would otherwise chain into one merged event spanning 3.7s, which is exactly the
false merge the 2s ceiling exists to prevent.

**`DEDUPE_TOLERANCE_S` stays 2 seconds, as a named constant.** Brief 017 measured
jitter up to ~1s between re-emitted copies. Two seconds either side of a stable
anchor covers that with headroom, and is still inside the window where a second
genuinely distinct kill of the same victim by the same killer is impossible
(respawn timers). The number does not change in this brief; what changes is that
it finally *means* two seconds.

**The first copy wins, not the last.** `mergeEvents()` currently does
`eventsByKey.set(key, event)` unconditionally (`:2765`), so the stored event -
and therefore the marker's position and the row's timestamp - is rewritten by
every later jittered copy. With a stable anchor there is a right answer: keep the
first copy seen for that anchor. Marker positions stop drifting between poll
ticks as a side effect.

**No cache version bump.** `loadCachedEvents()` (`:2805`) already pipes the
cached array back through `mergeEvents()` (`:2811`), so an old `v2` array
containing duplicates is re-deduped on load and self-heals in memory. Bumping
`EVENTS_CACHE_VERSION` (`:2792`) would instead force every already-scanned replay
through another ~51-second full scan to fix a list the load path can fix for
free. This is a deliberate departure from brief 026's version-bump precedent and
it has to be *proved*, not assumed - step 5 exists for that.

### Rejected before starting

- **Widening the bucket again (2s → 3s or 4s).** It does not address the
  mechanism. A grid with a wider cell still splits any pair that straddles a
  boundary; it just moves the boundaries. Brief 017's 0.18s pair would survive a
  10s bucket if it landed on the seam.
- **Rounding to a grid with an overlap check (test both the cell and its
  neighbour).** This is a gap test written the long way round, with two lookups
  instead of one and an off-by-one at every boundary. If the answer is a gap
  test, write a gap test.
- **Deduping only at render time in `visibleEvents()`.** The duplicates would
  still be in `eventsByKey`, still be written to the cache (`:2937`), and still
  be counted by anything reading `.size`. The corruption belongs fixed at the
  door.
- **Fixing this by making the client stop re-emitting.** Not available. Brief 017
  established the client reassigns `EventID` and jitters `EventTime` on every
  re-pass; PASSOFF fact 3 says the same. The panel owns the dedupe.
- **Changing what `scanReplay()` does about it** (a single-pass-only guard, a
  refusal to re-scan an already-scanned replay). Brief 026 already chose one
  forward pass for this exact reason; the residual is the dedupe's problem, not
  the scan's.

## Where The Code Is

| What | File | Symbol | Line |
|---|---|---|---|
| The fixed-grid bucket | `app/public/panel.js` | `eventFingerprint()` | 847 |
| Why the tuple looks like that | `app/public/panel.js` | comment above `eventFingerprint()` | 835-846 |
| Merge path (only writer) | `app/public/panel.js` | `mergeEvents()` | 1188 |
| The map itself | `app/public/panel.js` | `eventsByKey` | 717 |
| Reader: render list | `app/public/panel.js` | `visibleEvents()` | 861 |
| Reader: cache write | `app/public/panel.js` | `localStorage.setItem(eventsCacheKey(), …)` | 1365 |
| Reset path | `app/public/panel.js` | `clearEventsDisplay()` | 1180 |
| Cache load (re-merges) | `app/public/panel.js` | `loadCachedEvents()` | 1233 |
| Cache version | `app/public/panel.js` | `EVENTS_CACHE_VERSION` | 1220 |
| Cache key | `app/public/panel.js` | `eventsCacheKey()` | 1222 |
| Filtered-out names | `app/public/panel.js` | `IGNORED_EVENT_NAMES` | 739 |
| Downstream: sorted array | `app/public/panel.js` | `sortedEvents` | 877 |
| Downstream: markers | `app/public/panel.js` | `renderMarkers()` | 881 |
| Downstream: clustering | `app/public/panel.js` | `CLUSTER_PX` | 871 |
| Downstream: steppers | `app/public/panel.js` | `COMMANDS` event step | 2232-2243 |
| Scan loop (time-based, not count-based) | `app/public/panel.js` | `scanReplay()` | 1272 |

## Implementation Steps

1. **Measure the current state, before touching anything.** In the console
   against a scanned replay: group `[...eventsByKey.values()]` by
   `EventName|KillerName|VictimName|Recipient|Acer|TurretKilled|InhibKilled|KillStreak`,
   and for every group with more than one member print the sorted times and the
   gaps between consecutive entries. Keep the output.
   *Done when:* you have a list of same-identity pairs and their gaps, and a
   total event count. Brief 017 predicts pairs at ~0.91s, ~0.25s and ~0.18s;
   brief 026 predicts ~34 pairs inside 2s on a twice-scanned replay.

2. **Split the fingerprint.** Add `eventIdentity(event)` returning today's tuple
   minus the time term. Leave `eventFingerprint()` in place for now, rewritten to
   call it, so nothing else has to move in the same step.
   *Done when:* `eventFingerprint(e)` still returns a string that differs for two
   events differing in any non-time field, and the app still runs unchanged.

3. **Add the anchor index and the gap test.** A module-scope
   `Map<identity, number[]>` alongside `eventsByKey` (`:2289`), a
   `DEDUPE_TOLERANCE_S = 2` constant, and a function that takes an event and
   returns its key: search the identity's anchors for one within tolerance, reuse
   it if found, otherwise push `event.EventTime` as a new anchor and use that.
   Never re-anchor.
   *Done when:* called twice with two events 0.18s apart and identical in every
   other field, it returns the same key both times; called with two 2.5s apart,
   two different keys.

4. **Rewrite `mergeEvents()` to use it, first-copy-wins.** Replace the
   unconditional `set` (`:2765`) with an insert that only writes when the key is
   new, and clear the anchor index in `clearEventsDisplay()` (`:2752`) alongside
   `eventsByKey.clear()`.
   *Done when:* re-merging the same array twice leaves the count and every
   `EventTime` identical, and a disconnect/reconnect starts from zero anchors.

5. **Prove the cache self-heals.** Take a `v2` cache entry known to contain a
   duplicate pair (from step 1), reload the panel, and compare the rendered count
   against the raw array length in `localStorage`.
   *Done when:* the raw cached array is longer than the rendered count by exactly
   the number of duplicate pairs step 1 found, with no version bump.

6. **Re-run step 1's measurement.** Same script, new build.
   *Done when:* every same-identity pair with a gap under 2s from its anchor is
   gone, and you can name any pair that survived and why.

7. **Scan the same replay twice in one session.**
   *Done when:* the second scan's final count equals the first's. This is the
   check brief 026 could not make, and it is the one that matters.

## Verification

Against the live app, with a replay connected:

1. `Scan replay` completes; note the `Events (N)` count.
2. Scan again without reloading. The count is the same. (Brief 026 measured
   101 → 106 → 109 here.)
3. The event list contains no two adjacent rows with the same text and
   timestamps under 2s apart. Scroll the whole list, do not sample it.
4. The multikill rows are still there and still climb - a `2x` and a `3x` by the
   same killer at nearly the same time are two rows, not one. This is the false
   merge `KillStreak` exists to prevent.
5. **Negative case:** two genuinely different kills by different killers within
   the same second are still two rows and still two events in their cluster.
6. **Negative case:** `‹ Event` and `Event ›` still step to every row in the
   list, in order, with no row skipped and none visited twice.
7. **Negative case:** the marker count on the busiest cluster equals the number
   of rows its hover card lists.
8. **Negative case:** cues are unaffected - place a cue, reload, it is still
   there at the same time. Cues key off raw `EventTime` and `replayIdentity()`
   (`:2780`), neither of which this brief touches, but brief 023 found three
   readers of one DOM node, so check rather than reason.
9. Reload the panel with an existing cache. The count matches what was on screen
   before the reload.

## Can't Skip

- **Step 1 before any edit.** Without the before-list there is no way to tell a
  fix from a coincidence, and the pairs it finds are the acceptance test.
- **The anchor must not move on merge.** Everything else in this brief is safe
  without it; with a sliding window a long enough chain of copies merges two real
  events.
- **`KillStreak` stays in the identity.** Removing it collapses a climbing
  multikill into one row - brief 017 put it there deliberately and ordered it
  first for that reason.
- **Clear the anchor index wherever `eventsByKey` is cleared.** A stale anchor
  surviving a replay swap silently eats a real event in the next replay, and it
  will look like the harvest bug, not like this.

## Traps

- **`mergeEvents()` is the only writer, but it is called from three places** -
  the poll tick, `loadCachedEvents()` (`:2811`) and the scan. The cache path
  feeds it a whole array at once, in time order; the poll path feeds it a few
  events at a time in arrival order. First-copy-wins must give the same result
  either way, which is why the anchor is the *first time seen for that identity*
  and not "the smallest time".
- **`changed` gates the re-render** (`:2761-2772`). After this change a duplicate
  produces no new key, so `changed` stays false and nothing re-renders - correct,
  and it will look like the merge silently did nothing. Verify by count, not by a
  repaint.
- **The scan's completion is time-based, not count-based** (`:2898-2927` loops on
  `lastPolled.time` and `SCAN_STALL_TICKS`). It does *not* watch
  `eventsByKey.size`, so fewer inserts cannot end a scan early. Do not "fix" the
  scan loop to match.
- **`IGNORED_EVENT_NAMES`** (`:2311`) filters at read time in `visibleEvents()`,
  not at merge time. `GameStart` / `GameEnd` / `MinionsSpawning` /
  `InhibRespawned` are still in `eventsByKey` and still in the cache. Any count
  you compare must say which side of that filter it is on.
- **`Recipient` and `Acer` are in the tuple for a reason** and are frequently
  `undefined`; the current code coerces with `|| ''`. Keep the coercion - `undefined`
  and `''` joining differently would split an identity in half.
- **Do not touch `CLUSTER_PX` or the clustering loop** (`:2443`, `:2480-2493`).
  Fewer events change the counts on markers; that is the fix landing, not a
  clustering bug.

## Out Of Scope

Event *labels* - `describeEvent()` and `championName()` are brief 017's shipped
work and are correct. The harvest itself (brief 026). The `EVENTS_CACHE_VERSION`
value. Marker geometry and the hover card - brief 029 owns those and will be
counting the clusters this brief changes, so run this first. Whether neutral
objectives appear at all (#7) - unrelated mechanism, still open.

## Escalate Instead Of Deciding

- **If step 1 finds no duplicate pairs at all on the available replay**, stop and
  say so. Brief 017's pairs were measured on a specific cached array; if the
  current replay is clean there is nothing to verify against and shipping a
  rewrite blind repeats what brief 016 refused to do.
- **If step 6 finds a surviving pair with a gap under 2s**, report it with its
  identity string before adjusting anything. Two events that differ in a field
  you did not expect them to differ in is a finding about the feed, not a reason
  to drop a field from the tuple.
- **If the cache does not self-heal in step 5**, do not quietly bump
  `EVENTS_CACHE_VERSION` to make the symptom go away - that trades a five-line
  fix for a multi-minute re-scan on every replay Fletcher has already scanned.
  Say what the load path actually did instead.

## Outcome

**The count stopped growing, which is the check brief 026 could not make.** Two
forced full scans of the same replay in one session (~925s of game time each at
32x) both landed on 28 raw / 25 visible - identical, not merely close. Brief
026's 101 → 106 → 109 is closed, and #13 with it. The anchor index is 22 lines
(`eventAnchorKey()`, `panel.js:728`) and the merge change is four.

**The mechanism was right and the implementation kept the part that makes it
right.** `eventAnchorKey()` returns the matched anchor without pushing or
rewriting it, so the anchor genuinely never moves and the t / t+1.9 / t+3.7
chain cannot walk. `eventsByKey.clear()` occurs exactly once in the whole file
and `eventAnchors.clear()` is on the next line, so the stale-anchor-eats-a-real-
event failure has one site and it is covered.

**The named acceptance pairs did not transfer between replays, and that is a
lesson for the next brief that borrows one.** `Done Looks Like` asked for brief
017's specific pairs (0.91s, 0.25s, 0.18s) to merge. Those numbers came from one
cached array captured on one replay; this session measured a different replay and
found four pairs at 0.616 / 0.364 / 0.386 / 0.539s. All four merged and none
survived under 2s, which is the real acceptance test. A pair measured on a
specific cached array is evidence that the bug exists, not a fixture that a later
session can re-observe - write the acceptance test as a property ("no
same-identity pair under tolerance survives"), not as a list of gaps.

**The cache self-heal was proved rather than assumed, so the departure from
brief 026's version-bump precedent stands.** `loadCachedEvents()` re-merges the
old `v2` array through the new path and the duplicates collapse on load, with no
bump and therefore no forced ~51-second re-scan of anything already scanned. The
brief was right to make step 5 prove this instead of reasoning it.

**The finding worth carrying forward is one this brief did not cause and may
have made easier to hit.** V6 is a PARTIAL: `‹ Event` / `Event ›` skips a row
when two events share an *identical* `EventTime` - confirmed live, stepping from
t=191.494 jumps to 206.006 and never visits the second half of a mutual kill.
Four such pairs exist on this replay. The defect is in `stepEvent()`'s `time +
0.5` buffer, which this diff does not touch at all, and the pairs have different
identities (different killer and victim), so the old fixed-grid fingerprint never
merged them either - it is pre-existing on both counts.

But the *exposure* is plausibly new, and the next session should not be surprised
by that. The old code's unconditional `eventsByKey.set()` rewrote the stored
event on every later jittered copy, so two genuinely simultaneous events each
ended up carrying an independently-jittered time and would rarely tie to the
exact float. First-copy-wins now preserves both original emission times, which
for a truly simultaneous pair *are* the same number - exactly the input the
`+0.5` buffer mishandles. This is a hypothesis from reading the two code paths,
**not measured**: nobody counted identical-`EventTime` pairs before the change.
Testing it needs a before/after count of exact time ties on the same replay,
which is cheap to get and worth getting inside whatever brief fixes the stepper.
It does not argue against first-copy-wins - killing marker drift between poll
ticks is worth more than a stepper bug that predates it.

**`eventFingerprint()` is gone rather than orphaned.** Implementation step 2 said
to leave it "for now" as a staging device; by step 4 it had zero call sites and
deleting it was the step's own end state.
