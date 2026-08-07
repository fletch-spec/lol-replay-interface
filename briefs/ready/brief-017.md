---
id: brief-017
state: ready
created: 2026-08-07
updated: 2026-08-07
agent: user
project: LOL-REPLAY-CONTROLLER
depends_on: [brief-016]
executes_after: brief-016
model: sonnet
---

# Brief 017: Event Labels Leak Engine IDs, And Some Events Land Twice

Closes [#13](https://github.com/fletch-spec/lol-replay-interface/issues/13).

> Line numbers in this brief are from commit `e8e05b9`. If they don't match,
> grep for the symbol name - the names are stable, the lines are not.

## Problem Statement

Three defects, all visible in the event list the issue pasted from a single real
game.

**Raw engine IDs reach the screen.** The list opens with:

```
Turret_TChaos_L1_P0_1017949901_0 killed Kayn
```

and later carries `Turret (red) - Minion_T100L1S00N0874`. `championName()` (2112)
resolves a summoner name to a champion and otherwise **returns the input
unchanged**, which is correct for a summoner the roster hasn't loaded and wrong
for a turret. The comment at 2110 says as much - "what happens for turret and
minion killers" is written down as known and then rendered anyway.

This is the worst kind of label in this panel specifically. The event list is
read at a glance, mid-sentence, while talking. A 38-character hex ID in the
killer slot costs a beat to parse and the beat is the whole product.

**The same kill appears twice, one second apart.**

```
Turret_TChaos_L1_P0_1017949901_0 killed Kayn   2:04
Turret_TChaos_L1_P0_1017949901_0 killed Kayn   2:05
```

Kayn did not die twice in one second. `eventFingerprint()` (2158) buckets time at
200ms (`Math.round(event.EventTime * 5)`), sized against the "few-millisecond
jitter" its own comment describes. The jitter here is a full second, so the two
copies land in different buckets and both survive.

**Derived events read as repeats of the event they describe.**

```
Turret (red) - Miss Fortune   15:31
First Tower - Miss Fortune    15:31
```

One turret fell. The client reports it as `TurretKilled` and again as
`FirstBrick`, and the panel renders both as peers with the same subject and the
same timestamp. Same shape for `FirstBlood` against its `ChampionKill`, and
`Multikill` against its kills.

## Done Looks Like

Read the whole event list for a game and find no engine identifiers, no line that
restates the line above it, and no kill listed twice. Every remaining repeated
line is two things that genuinely happened.

## Decision (already made - do not re-litigate)

### 1. No raw engine ID ever reaches a label

Add one resolver that every label goes through. It resolves in order: champion
(existing `playerFor()`), structure, minion, then a neutral fallback. An
unrecognised shape logs once and renders the fallback - it **never** renders the
raw string.

`structureSide()` (2121) already reads team out of a structure ID and already
refuses to guess lane from the `L`/`P` segments, with the reason written at 2117.
Extend that judgement, do not replace it: the same "only the team segment is
safe" rule applies to the killer slot.

**Derive the minion prefixes from real observed values, not from memory.** This
is brief 011's rule and it was learned the hard way - a confidently wrong mapping
prints wrong information silently, which is worse than an ugly one. Log
unresolved names and read the log.

### 2. Widen the dedupe bucket, and include `KillStreak`

200ms was sized against jitter that has since been measured at ~1s. Widen the
time bucket to **2 seconds**. Two genuinely distinct kills of the same victim by
the same killer inside two seconds cannot happen - the respawn timer makes it
impossible - so the bucket is safe for `ChampionKill`.

It is **not** safe for `Multikill`, which fires repeatedly for the same killer
seconds apart as a streak climbs, with no victim to separate the copies. Add
`event.KillStreak` to the fingerprint tuple in the same change. Widening the
bucket without this trades a duplicate-kill bug for a lost-multikill bug.

### 3. Derived events stay, and stop looking like peers

`FirstBlood`, `FirstBrick`, `Ace` and `Multikill` are annotations on an event
already in the list, and they are also exactly the beats worth talking over. They
stay as their own rows - they are separately seekable and separately cueable, and
that is worth more than a tidy list.

What changes is that they stop reading as a second occurrence: they get a
leading marker (`★`) and drop the restated subject where the row above already
carries it. `First Tower - Miss Fortune` becomes `★ First Tower`; the turret line
directly above it already says who and when.

### Rejected alternatives

- **Suppressing `TurretKilled` when a `FirstBrick` exists at the same time.**
  Loses a real event from the feed to fix a display problem, and the two are only
  reliably paired if their timestamps agree - which, per defect two, is exactly
  the assumption that does not hold here.
- **Merging the pair into one row.** The row is a seek target. One row cannot
  seek to two times, and the moment the pair's timestamps differ by a second the
  merge picks the wrong one.
- **Dropping `FirstBlood`/`FirstBrick` entirely** as redundant. They are the
  narration beats. First blood is a thing you say out loud.
- **Printing the structure's lane** ("bot outer turret"). `structureSide()`'s
  comment at 2117 already rejected this once, for the reason that still holds:
  the `L`/`P` segments have no documented mapping and a guess prints confident
  nonsense.
- **Resolving minion IDs to individual minions.** Nobody narrates a specific
  minion. The class is the information.

## Where The Code Is

| What | File | Symbol | Line |
|---|---|---|---|
| Name resolution + fallback | `app/public/index.html` | `championName()` | 2112 |
| Structure team reading | `app/public/index.html` | `structureSide()` | 2121 |
| Every label | `app/public/index.html` | `describeEvent()` | 2128 |
| Dedupe key | `app/public/index.html` | `eventFingerprint()` | 2158 |
| Time bucket | `app/public/index.html` | `Math.round(event.EventTime * 5)` | 2161 |
| Merge on tick | `app/public/index.html` | `mergeEvents()` | 2471 |
| Roster lookup | `app/public/index.html` | `playerFor()` / `teamFor()` | grep |
| Side naming | `app/public/index.html` | `sideName()` | 2104 |
| List rows | `app/public/index.html` | `renderEventList()` | 2436 |
| Hover rows | `app/public/index.html` | `buildHoverRow()` | 2343 |
| Next-event readout | `app/public/index.html` | `updateEventProgress()` | 2291 |
| Unknown-name logging pattern | `app/server.js` | `CHAMPION_NAME_ALIASES` (brief 011) | grep |

## Implementation Steps

1. **Collect real killer names before writing the resolver.** Log every
   `KillerName` and `VictimName` that `playerFor()` fails to resolve, across a
   full scanned replay. Do not write the minion or structure matcher from memory.
   *Done when:* you have the actual list of unresolved shapes from one real game,
   pasted into the Outcome section.

2. **Write the resolver.** One function, used by every branch of
   `describeEvent()` (2128). Champion → structure → minion → neutral fallback.
   Unresolved shapes log once (`loggedUnknownEvents` at 2092 is the pattern) and
   render the fallback.
   *Done when:* no label in a full replay's list contains `_`, and grep for
   `Turret_T` / `Minion_T` in the rendered DOM returns nothing.

3. **Keep the team information you already have.** A turret killing a champion
   should still say which side's turret - `structureSide()` (2121) already
   computes it. Do not lose that while removing the ID.
   *Done when:* a turret kill reads with a side and no ID.

4. **Add `KillStreak` to `eventFingerprint()`** (2158), before touching the
   bucket. Ordering matters: widen the bucket first and multikills merge on the
   way past.
   *Done when:* a 2x and a 3x multikill by the same champion four seconds apart
   both survive a merge.

5. **Widen the time bucket to 2 seconds** (2161). Update the comment at 2155 -
   it currently states the old rationale as fact, and the next session will
   believe it.
   *Done when:* the 2:04/2:05 pair from the issue collapses to one row.

6. **Mark the derived events** in `describeEvent()` (2128). `★` prefix,
   restated subject dropped where the primary row carries it.
   *Done when:* `First Tower` and `First Blood` no longer repeat a name that
   appears directly above them.

7. **Check the three surfaces that render labels**, not just the list:
   `renderEventList()` (2436), `buildHoverRow()` (2343), and the next-event
   readout in `updateEventProgress()` (2307). They all call `describeEvent()`, so
   they should all follow - confirm rather than assume.
   *Done when:* all three show the cleaned label for the same event.

## Verification

On a fully scanned replay:

1. Read the entire event list. No `_`, no hex, no `TChaos`/`T100` anywhere.
2. The turret kill from the issue appears **once**, not at 2:04 and 2:05.
3. A turret kill still says which side's turret killed the champion.
4. `First Tower` and the turret kill it describes are both present, adjacent, and
   the second does not restate the first.
5. A multikill sequence (2x then 3x by the same champion) shows both.
6. Hover a marker: the card's labels match the list's labels exactly.
7. The next-event readout shows a cleaned label, not a raw ID.
8. Total event count before and after this brief, on the same replay, differs
   only by the duplicates removed - and you can name them. A larger drop means
   the bucket is eating real events.
9. Reload the page. Cached events render with the new labels - labels are
   computed at render time, so no migration should be needed. If one is, stop and
   say so.
10. A cue placed on a deduped event still seeks to the right moment.

## Can't Skip

- **No raw engine ID in any label, on any surface.** This is the issue.
- **The unresolved-name log stays in.** It is how the next unhandled shape gets
  found instead of shipped.
- **No invented mappings.** Brief 011's rule. If you did not see the prefix in a
  real replay, it does not go in the table - leave it to the fallback and say so
  in a comment, as `CHAMPION_NAME_ALIASES` does.
- **`KillStreak` goes in before the bucket widens.** Both in the same commit.
- **Event count is accounted for.** After brief 016, the count means something.
  A change here that quietly drops events undoes that.
- **`EventID` is still never a key** (PASSOFF fact 3).

## Traps

- **`championName()` returning its input is load-bearing for summoners.** A
  player whose roster entry has not loaded yet renders their summoner name, which
  is right. Do not make the fallback swallow that case - gate on the shape of the
  ID, not on "did `playerFor()` fail".
- **`teamFor(first.KillerName)` drives the marker cap** (2265) and
  `buildHoverRow()`'s row colour (2350). A turret killer resolves to no team
  today; if the resolver starts returning a team for structures, caps will appear
  on markers that never had them. That interacts directly with brief 019, which
  is about what those caps mean. Decide deliberately and tell 019.
- **Widening the bucket widens it for every event type**, including `TurretKilled`
  - and the issue's own list has two turrets falling at 25:33, killed by
  different minions. They are distinguished by `TurretKilled` (the structure ID)
  being in the fingerprint tuple (2166), so they survive. Verify that
  specifically; it is the closest real case to a false merge.
- **`Ace` has no `KillerName`** - it carries `Acer` and `AcingTeam` (2137). A
  resolver that assumes `KillerName` exists will render "undefined" on aces.
- **`FirstBlood` uses `Recipient`** (2135), not `KillerName`. Same trap.
- **Brief 016 may also be editing `eventFingerprint()`.** It is listed as a
  possible over-merge channel there. 016 runs first; if it changed the function,
  re-read it before assuming line 2161 still says what this brief says it says.
- **The cache stores raw events, not labels** (2550), so labels re-derive on
  load. If you find yourself writing a migration, the change is in the wrong
  place.

## Out Of Scope

Marker colour and shape, the objective/structure taxonomy and the legend (brief
019). Whether dragon/baron/herald events exist at all (#7). Harvest completeness
(brief 016). The event list's layout - only its text changes here.

## Escalate Instead Of Deciding

- **If the unresolved-name log turns up shapes that are neither structure nor
  minion** - neutral monsters, wards, or something undocumented - list them and
  ask rather than inventing a category. Wards in particular may want their own
  handling and that is a scope call, not a naming call.
- **If widening the bucket to 2s merges something real**, do not tune it to 1.4s
  quietly. Say what merged, with times. The right answer may be per-event-type
  buckets, which is a bigger change than this brief.
- **If `FirstBrick` and its `TurretKilled` turn out to arrive with different
  timestamps** often enough that they do not sit adjacent, the `★` marker is
  solving less than it looks like. Say so - the fix would be pairing logic, which
  this brief deliberately rejected on the evidence available.
