---
id: brief-023
state: ready
created: 2026-08-08
updated: 2026-08-08
agent: user
project: LOL-REPLAY-CONTROLLER
depends_on: [brief-022]
executes_after: brief-022
model: sonnet
---

# Brief 023: The Chips Stop Claiming Things That Aren't True

Closes [#21](https://github.com/fletch-spec/lol-replay-interface/issues/21),
[#25](https://github.com/fletch-spec/lol-replay-interface/issues/25).

> Line numbers in this brief are from commit `91796a5`. If they don't match,
> grep for the symbol name - the names are stable, the lines are not.

## Problem Statement

The chips row exists to say what the replay client is doing. Two of its four
chips currently say something false.

The mode chip (`:1261`) reads `CLASSIC` for every replay this panel has ever been
pointed at - it has never carried information. It is now worse than useless,
because Riot shipped "League Classic", a separate old-patch client, and a chip
reading CLASSIC beside a replay looks like it is naming that product.

The playback chip is the one that matters. With the helper up and no replay open,
the status bar reads `No replay loaded`, and two chips to the right it reads
`▶ Playing` at `1×`. Nothing is playing. This is reproducible right now, with no
League client running at all: `clearTransportDisplay()` (`:1591-1594`) resets
`lastPolled` to `{ time: 0, length: 0, speed: 1, paused: false, seeking: false }`
and calls `renderTransport()`, which at `:1546` maps `paused: false` to
`▶ Playing`. The "no data" default and real playing state are the same value, so
the chip cannot tell them apart. The screenshot that produced this issue was
taken in exactly that state.

## Done Looks Like

The mode chip is gone from the DOM, and the event cache and cue persistence still
work across a reload (they both read the mode string). With the helper running and
no replay loaded, no chip claims playback or a speed - and with a replay loaded,
every chip reads exactly as it does today.

## Decision (already made - do not re-litigate)

**Delete the mode chip and move its value into a module-scope variable.** The
mode string is load-bearing in three places that currently read it back out of
the DOM node:

- `eventsCacheKey()` (`:2583`) - `${gameModeEl.textContent}:${length}` is the
  fingerprint every cached event array is stored under
- `identityKnown()` (`:2587`) - gates cue persistence, `+ Cue` and `Scan replay`
- `cuesAsMarkdown()` (`:3135`) - prints it in the export header

The variable must hold the **same string the API returns**, byte for byte.
`.chip.mode`'s `text-transform: uppercase` (`:370`) is presentational only -
`textContent` was always the raw value - so a variable that stores
`data.gameMode` keeps every existing cache key valid. Do not uppercase it "to
match what was on screen".

**The markdown export header keeps the mode.** It is a file someone reads later,
where "which game was this" is the point; the chip was removed for being
redundant *on screen*, next to a status line that already says a replay is
loaded.

**Chips render `-` when there is no replay.** `renderTransport()` gains a guard:
when `currentState !== 'connected'`, the playback chip and the speed chip show
`-` with no state colouring, and the Pause button stops saying `Pause`. `-` is
already this panel's idiom for "unknown" - it is what the mode chip itself showed
before identity landed (`:1261`, `:3655`).

### Rejected before starting

- **Hiding the mode chip with CSS.** The three DOM reads above would still be
  reading a value out of a hidden element, which is strictly worse than today:
  invisible state that is still load-bearing.
- **Changing the cache fingerprint to something better than the mode string.**
  Any change to `eventsCacheKey()`'s shape invalidates every cached event array
  on every machine. Not this brief, and there is no reported problem with it.
- **Making `lastPolled.paused` null when there is no replay.** It is read all over
  the transport (`:1545`, `:2870`, `:3224`, `:3270`), and a null would turn one
  visible wrong label into several invisible logic changes.
- **Hiding the chips entirely when there is no replay.** The row would change
  width as the state changes, and "gone" is a weaker signal than "-" - the reader
  cannot tell a missing chip from a chip that has not rendered yet.
- **Fixing this in the WebSocket handler only** (`:3649`). The helper-down branch
  (`:3662`) has the same problem, and so does first paint: `renderTransport()` is
  called once at `:3728` before any connection exists. One guard inside
  `renderTransport()` covers all three.

## Where The Code Is

| What | File | Symbol | Line |
|---|---|---|---|
| Mode chip markup | `app/public/index.html` | `#gameMode` | 1261 |
| Playback chip markup | `app/public/index.html` | `#paused` | 1263 |
| Speed chip markup | `app/public/index.html` | `#speedChip` | 1262 |
| Mode chip handle | `app/public/index.html` | `gameModeEl` | 1387 |
| Chip state classes | `app/public/index.html` | `.chip.playing` / `.chip.is-paused` / `.chip.mode` | 370-378 |
| Where the chips are written | `app/public/index.html` | `renderTransport()` | 1545-1562 |
| The false default | `app/public/index.html` | `clearTransportDisplay()` | 1591 |
| Connection state | `app/public/index.html` | `setState()` / `currentState` | 1484 |
| Mode fetch | `app/public/index.html` | `fetchGameMode()` | ~1915-1923 |
| Cache fingerprint | `app/public/index.html` | `eventsCacheKey()` | 2583 |
| Identity gate | `app/public/index.html` | `identityKnown()` | 2587 |
| Export header | `app/public/index.html` | `cuesAsMarkdown()` | 3135 |
| Mode resets | `app/public/index.html` | no-replay / ws.onclose branches | 3654-3655, 3668-3669 |
| First paint | `app/public/index.html` | `renderTransport()` call | 3728 |

## Implementation Steps

1. **Reproduce #25 first, and write down what you see.** Helper running, no
   replay. Read the three chips.
   *Done when:* you have quoted the chip text in the state the issue describes.
   It should read `▶ Playing` and `1×`. If it does not, stop - the mechanism
   above is wrong and the rest of this brief is built on it.

2. **Record the current cache key.** With cues saved for a replay if you have one
   available, note the exact `localStorage` keys in use. If no replay is
   available this session, read `eventsCacheKey()` and `replayIdentity()` and
   write down the exact string shape instead.
   *Done when:* you know what the key looks like today, so step 3 can be checked
   against it rather than against a guess.

3. **Move the mode into a variable.** Introduce a module-scope `gameMode` string
   beside `gameModeKnown` (`:1447`), assign it in `fetchGameMode()`, reset it
   everywhere `gameModeEl.textContent = '-'` currently happens (`:3655`, `:3669`)
   and in `handleNewGame()` if it resets identity there. Repoint `eventsCacheKey()`,
   `identityKnown()` and `cuesAsMarkdown()` at it.
   *Done when:* `grep gameModeEl` returns nothing but the declaration, and the key
   string produced is identical to the one recorded in step 2.

4. **Delete the chip and its handle.** Remove `#gameMode` from the markup, remove
   `gameModeEl` (`:1387`), and remove `.chip.mode` (`:370`) if nothing else uses
   it.
   *Done when:* the chip is gone and the console is clean on load.

5. **Guard the chips.** In `renderTransport()`, when `currentState !== 'connected'`:
   playback chip `-`, speed chip `-`, neither `.playing` nor `.is-paused`, and the
   Pause button label neutralised. Note that `renderTransport()` caches its last
   values in `lastPausedLabel` (`:1508`) and `lastSpeedLabel` to avoid redundant
   writes - the guard has to go through the same cache or the chips will stick on
   `-` after a replay connects.
   *Done when:* the chips read `-` with no replay and switch to real values within
   one poll tick of a replay connecting.

6. **Check the loop and focus chips are untouched.** `#loopChip` and `#focusChip`
   have their own visibility rules (`:777-795`) and are not part of this.
   *Done when:* both still behave as before.

## Verification

1. Helper running, no replay: playback chip reads `-`, speed chip reads `-`,
   neither is coloured green or amber, and no chip reads `CLASSIC`.
2. Kill the helper: chips still read `-`, status reads `Helper unreachable`.
3. Restart the helper with a replay loaded: within one poll tick the chips read
   the real speed and `▶ Playing` / `❚❚ Paused`, correctly coloured. This is the
   step that catches a broken label cache.
4. Pause and unpause: the chip follows, the Pause button label follows.
5. Change speed with the presets: the speed chip follows.
6. **Negative case - event cache.** With a replay loaded, run `Scan replay`, note
   the event count, reload the page. The events come straight back from cache with
   no scan. A broken fingerprint shows up here and nowhere else.
7. **Negative case - cue persistence.** Place a cue, reload, confirm it is still
   there and still bound to the same replay.
8. **Negative case - export header.** `Export notes` still prints
   `# Cue notes - <mode>, <length>` with the real mode string.
9. Load a replay, then close it: chips go back to `-` rather than freezing on the
   last real value.

## Can't Skip

- **The variable holds the raw API string.** Uppercasing it to match what the
  chip used to look like breaks every existing event cache entry silently - the
  panel would just re-scan, which looks like nothing is wrong.
- **Verification steps 6 and 7 are the point of this brief.** The chip removal is
  trivial; the DOM-as-state-store removal is what can break, and it breaks
  silently.
- **Do not change `eventsCacheKey()`'s shape**, only where it reads from.
- **One guard, inside `renderTransport()`** - not three, in three handlers.

## Traps

- **`renderTransport()` short-circuits on unchanged labels** (`lastPausedLabel`,
  `:1547`; `lastSpeedLabel`, `:1556`). Writing `-` without updating those caches
  means the chip never comes back when a replay connects; updating them without
  writing means it never goes to `-`. Both failure modes look fine in the state
  you are testing in.
- **`renderTransport()` is called before any connection exists** (`:3728`), when
  `currentState` is whatever it initialises to. Check that initial value - the
  guard must be true at first paint, or the panel flashes `▶ Playing` on load.
- **`clearTransportDisplay()` is not the only path here.** It resets the data;
  the guard is about the *state*. Fixing `clearTransportDisplay()` alone (for
  instance by setting `paused: true`) would make the chip read `❚❚ Paused`, which
  is exactly as false as `▶ Playing` and is the tempting one-line non-fix.
- **`identityKnown()` gates the `Scan replay` and `+ Cue` commands** through
  `refreshCommands()`. A `gameMode` variable that is empty string rather than
  `'-'` changes that comparison (`:2587` compares against `'-'`). Read the
  condition before rewriting it.
- **`cuesAsMarkdown()` deliberately does not call `replayIdentity()`** (`:3131-3133`)
  and the comment explains why. Keep that reasoning intact when you repoint it.

## Out Of Scope

Everything brief 022 owns in this same row - the card, the split control, the
Reset button. Run this after 022, not beside it. The loop chip and focus chip.
The `1×` speed presets themselves (brief 024). What the status *text* says - only
the chips are in scope.

## Escalate Instead Of Deciding

- **If no replay is available this session**, steps 1, 3, 4 and 5 and verification
  1, 2 still run - do those, and say plainly which of 3-9 could not. Briefs 017
  and 019 both hit this and reported it rather than claiming a pass.
- **If the mode string turns out to vary** across replays (anything other than
  `CLASSIC`), say so before deleting the chip - it would mean the chip carries
  information after all, and #21's premise needs Fletcher's second look.
