---
id: brief-009
state: ready
created: 2026-08-06
updated: 2026-08-06
agent: user
project: LOL-REPLAY-CONTROLLER
depends_on: [brief-004]
---

# Brief 009: Recording-Safe Event Harvest

Closes [#4](https://github.com/fletch-spec/lol-replay-interface/issues/4).

## Problem Statement

Opening a replay for the first time throws the game to the end and back. That is
brief 004's event harvest doing its job - the client's event feed is cumulative
and only reports what playback has already passed, so the only way to get a whole
game's events is to seek to the end, wait, and seek back. It is cached per
replay afterwards, so it happens once. The problem is that "once" is not "never",
and it happens at exactly the moment you are most likely to have just hit record
on a fresh replay. A 30-second jump to the end of the game, including the result,
is not something you can edit out of a live single-pass recording.

## Done Looks Like

Loading a new replay never moves playback unless you asked it to. You can hit
record, open a replay, and start talking. The event timeline is either already
populated, or populates on your say-so at a moment you chose, or fills in as you
watch - but nothing yanks the game while you are on air.

## Hardest Part

Every option trades something, and the brief has to pick rather than build all
three:

1. **Explicit** - a "scan replay" button. Harvest never runs on its own. Costs a
   click and means a first-time replay has an empty timeline until you press it.
2. **Deferred** - harvest automatically, but only while paused and before the
   first play, and refuse to start once playback has begun. Keeps it automatic;
   relies on the user not hitting record during those few seconds.
3. **Progressive** - drop the harvest, fill the timeline as playback passes
   events. Never disruptive, but useless on a first watch, which is exactly when
   you need to find the fights.

Brief 004 considered 1 and 3 and chose the harvest deliberately. This brief is
not "undo that decision" - it is "keep the complete timeline without the jump".
2 with a good escape hatch is probably the answer, but establish it rather than
assuming.

## Can't Skip

- **Playback never moves without user intent.** Whatever ships, opening a replay
  and doing nothing must leave the playhead where it was.
- **The existing cache still works.** A replay that has been harvested before
  must load its timeline instantly with no seeking at all. This already works;
  don't regress it.
- **The user can tell which state they are in.** A timeline with 4 events
  because the harvest hasn't run must not look like a timeline with 4 events
  because it was a quiet game. Say which it is.
- **No new seek path.** Harvest uses `requestSeek` today and must continue to.
- **Reversible.** If the harvest is interrupted - replay swapped, panel closed
  mid-scan - it must not leave playback parked at the end of the game.

## Notes

**Why the harvest exists at all**, from brief 004's outcome: seeking near
`length` populates the full cumulative feed within about a second, and a
`GameEnd` event is the definitive completion signal (with a ~3s timeout fallback
if it never arrives). That mechanism works and does not need reinventing - only
its trigger does.

**The cache key** is `lol-events:<gameMode>:<length>` via `replayIdentity()`.
Cues use the same identity function. If this brief adds any new persisted state,
key it the same way rather than deriving identity a third time.

**A fourth option worth ten minutes** before committing to any of the above:
check whether the feed can be populated without moving the visible playhead at
all - for instance whether `/liveclientdata/allgamedata` returns more than the
current position's events, or whether the harvest can run while the HUD is
hidden and the camera parked so the jump is at least not *visible* on capture.
Brief 006 shipped a cinematic toggle that can hide the HUD, and 008 will have
settled camera control. If a harvest can be made invisible rather than avoided,
that beats every option above.

**Out of scope:** changing what counts as an event, or the dedup fingerprint.
That is settled and `EventID` must still never be used as a key.
