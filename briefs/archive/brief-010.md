---
id: brief-010
state: ready
created: 2026-08-06
updated: 2026-08-06
agent: user
project: LOL-REPLAY-CONTROLLER
depends_on: [brief-004]
---

# Brief 010: Event Feed Audit

Closes [#7](https://github.com/fletch-spec/lol-replay-interface/issues/7).

## Problem Statement

The one replay this project has been tested against contained no `DragonKill`,
`BaronKill` or `HeraldKill` at all - 99 `ChampionKill`, 16 `TurretKilled`, 13
`Multikill`, 4 `Ace`, and one each of `FirstBlood`, `FirstBrick` and
`InhibKilled`. Nothing was logged as an unrecognised event name, so they were not
being miscategorised; they simply weren't in what the client returned. That
leaves the panel advertising an objective category in its legend that may never
appear, and a whole marker lane that may be dead code. It is also possible that
game genuinely had no dragons taken, which would make all of this fine. Nobody
has checked a second replay.

## Done Looks Like

You know whether the client reports neutral objectives, and the panel's event
categories match what the feed actually contains. If objectives don't come
through, the panel stops claiming they do. If they do, they render correctly and
there is a test replay on record that proves it.

## Hardest Part

Nothing here is technically difficult - it is a read-only investigation against
two or three replays. The risk is stopping at the first answer. "This replay has
no dragons either" is not the same finding as "the feed omits dragons", and only
a replay you *know* contains a Baron can tell them apart. Pick the test replay
deliberately: watch for the objective in the game, then check whether the API
saw it.

## Can't Skip

- **Check at least two more replays**, at least one of which is known to contain
  a dragon and a baron. Verify against the game, not against assumption.
- **Log every distinct `EventName` seen**, not just the ones being looked for.
  Brief 004 caught `InhibRespawned` this way. There may be others, and Atakhan
  or whatever ships next will arrive the same way.
- **The panel must not advertise categories it cannot show.** If objectives
  never arrive, the legend entry and the lane come out.
- **Record the result in the wiki's Replay API page** either way. "The feed does
  report dragons, here is the event name" is as valuable as the negative.

## Notes

**How to check quickly** without building anything: the panel already harvests
the full event list into `localStorage` under `lol-events:<gameMode>:<length>`.
Load a replay, let the harvest finish, and read the key. `categoryFor()` in
`index.html` holds the name-to-category map and logs anything unrecognised to
the console rather than dropping it - that console line is the fastest signal
that a new event name has appeared.

**Event names currently mapped:** `ChampionKill`, `Multikill`, `FirstBlood`,
`Ace`, `DragonKill`, `BaronKill`, `HeraldKill`, `TurretKilled`, `InhibKilled`,
`FirstBrick`. Deliberately ignored: `GameStart`, `MinionsSpawning`, `GameEnd`,
`InhibRespawned`.

**If objectives do arrive**, check the payload shape too - `DragonKill` was
assumed to carry a `DragonType` field and that has never been verified against a
real event. The description string in `describeEvent()` prints it.

**The lane already collapses when empty**, as of brief 007, so an absent
objective lane is no longer a visible band of dead gutter. That was the cosmetic
symptom; this brief is about whether the data is there at all.

**Do this before 011.** If the answer changes what the legend should say, 011 is
where the legend gets touched.

**Out of scope:** adding new event categories, or changing the dedup
fingerprint. This brief finds out what is true and adjusts the panel to match
it - it does not extend the timeline.
