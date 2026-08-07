---
id: brief-019
state: ready
created: 2026-08-07
updated: 2026-08-07
agent: user
project: LOL-REPLAY-CONTROLLER
depends_on: [brief-014, brief-016, brief-017]
executes_after: brief-018
model: sonnet
---

# Brief 019: Marker Colour, Marker Shape, And What Counts As An Objective

Closes [#14](https://github.com/fletch-spec/lol-replay-interface/issues/14).

> Line numbers in this brief are from commit `e8e05b9`. If they don't match,
> grep for the symbol name - the names are stable, the lines are not.

## Problem Statement

Four complaints in one issue, and they are the same complaint four times: the
timeline encodes more information than its markers can carry.

**Red on red.** `--kill` is `#e05c5c` (24) and `--red` - the Chaos team colour -
is `#e0576b` (22). A red-team kill draws a red marker with a red cap on top, so
it reads as one solid red block; a blue-team kill draws the same red marker with
a 3px blue cap. The issue's own words: "lots of red indicators and some red with
blue caps, bit confusing." The two hues are four points apart in the red channel
and eleven in blue. They are not distinguishable at 4px, and the cap is 3px of a
9px marker.

The design is asking one 4x9px element to carry category *and* team, in hue, when
the category is already carried by which of three lanes it sits in.

**The shape says nothing.** Every marker is the same rounded bar - `width: 4px;
height: 9px; border-radius: 2px` (479-483). The issue asks for an X for kills.

**Objectives are missing.** Partly a data question and partly not.
`EVENT_CATEGORY` (2079) maps `DragonKill`, `BaronKill` and `HeraldKill` and
**nothing else** - void grubs have no entry at all, so they fall through
`categoryFor()` (2094) to `unknown` and render in the structures lane in grey.
Whether dragons and barons appear in the feed at all is
[#7](https://github.com/fletch-spec/lol-replay-interface/issues/7), still open
and blocked on brief 016.

**Objective and structure read as duplicates.** They are two lanes with two
greyish-gold dots and a legend that calls one "Objective" and the other
"Structure". The issue's counter-proposal - "objectives can be map objectives:
dragon, grubs, towers, inhibs" - is the reasonable reading of a legend that never
explains the split.

## Done Looks Like

Glance at the timeline and see which team was winning fights, without hovering
and without consulting the legend. A kill does not look like a turret. The legend
names two categories you would not confuse with each other.

## Decision (already made - do not re-litigate)

### 1. Team owns the colour. Category owns the lane and the shape.

The cap goes away. The **marker body** takes the killer's team colour - `--blue`
for Order, `--red` for Chaos - and category stops being a hue at all.

This is the fix for the actual complaint. Category was already encoded twice
(lane position and hue) while team was encoded once, in 3px, in a colour four
points away from the category colour it sat on. Moving team into the body swaps a
redundant channel for the one that was starved.

Events with no team - aces, and neutral objectives with no resolvable killer -
render in a neutral colour. They are the minority and the lane already says what
they are.

### 2. Kills render as an X, with a stated legibility gate

Kills get an X, built from the marker element and a `::after` as two crossed
bars. Structures stay rectangular. Neutral objectives get a diamond.

**The gate, stated up front so it can be failed honestly:** an X has to be legible
at the marker's rendered size against the track background, in the lane, next to
its neighbours. If it needs to grow past ~10px to read as an X, it fails - marker
width is the budget brief 014 spent on cluster counts, and taking it back for a
glyph undoes that brief. **The documented fallback is a diamond** (a rotated
square, one CSS rule, legible at 7px). Either outcome passes this brief. A smudge
that is technically an X does not.

This is brief 015's pattern deliberately: state the gate, build the primary,
measure it, ship the fallback if it fails, and say which happened.

### 3. Clusters keep brief 014's counted bar

A cluster is not a shape, it is a number. Brief 014 measured this and shipped
`8 + min(count, 6) * 3` px with the count inside (2244-2246), growing from the
left edge for a reason recorded at 512. Shapes apply to **single-event markers
only**. Do not put an X inside a counted cluster and do not shrink clusters to
fit a glyph.

### 4. The two lanes stay. The legend starts explaining them.

The issue is right that "Objective" and "Structure" read as duplicates, and wrong
that the fix is merging them - a baron and an outer turret are not the same beat,
and merging costs the lane separation brief 004 built so a kill and a turret at
the same second stop colliding.

The split is real and the *labels* were hiding it:

- Lane 1 - **Neutral** - dragon, baron, herald, void grubs. Timed neutral spawns
  that give a team-wide buff.
- Lane 2 - **Structures** - turrets, inhibitors. Map state that changes where the
  game is played.

Legend text changes to match, naming examples rather than abstractions.

### 5. Void grubs get categorised, from observed data

Grubs are missing from `EVENT_CATEGORY` entirely. Add them - **using the real
`EventName` read out of `loggedUnknownEvents`' console log** (2097-2099), not
from memory. Brief 011's rule: a wrong string fails silently and looks fine.

### Rejected alternatives

- **Darkening `--kill` away from `--red`.** Buys separation between two things
  that should not have been competing for the same channel, and leaves team on a
  3px cap.
- **Keeping the cap and making it bigger.** At 9px tall there is no size where a
  cap is both a cap and readable.
- **Merging objectives and structures into one lane**, per the issue's proposal.
  Costs the collision separation, and puts a first tower next to a baron.
- **Colouring by category and outlining by team.** A 1px outline on a 4px marker
  is the cap problem rotated 90 degrees.
- **Champion portraits on markers.** Discussed and obviously too small; the hover
  card (brief 014) already carries portraits and is now reachable by sweep.

## Where The Code Is

| What | File | Symbol | Line |
|---|---|---|---|
| Colour tokens | `app/public/index.html` | `--kill` / `--obj` / `--struct` / `--blue` / `--red` | 22-26 |
| Category map | `app/public/index.html` | `EVENT_CATEGORY` | 2079 |
| Unknown logging | `app/public/index.html` | `categoryFor()` | 2094 |
| Lane map | `app/public/index.html` | `LANE_FOR` | 2180 |
| Lane collapse | `app/public/index.html` | `laneSlot` in `renderMarkers()` | 2212 |
| Marker build + cap | `app/public/index.html` | `buildMarker()` | 2248 |
| Team lookup | `app/public/index.html` | `teamFor()` | 2265 |
| Cluster width | `app/public/index.html` | `clusterWidthPx()` | 2244 |
| Base marker CSS | `app/public/index.html` | `.marker` | 479 |
| Hit target | `app/public/index.html` | `.marker::before` | 490 |
| Lane offsets | `app/public/index.html` | `.marker.laneN` | 499-501 |
| Category colours | `app/public/index.html` | `.marker.kill` etc. | 502-505 |
| Cluster CSS | `app/public/index.html` | `.marker.cluster` / `.marker-count` | 515 / 521 |
| Hover/active transforms | `app/public/index.html` | `.marker.hot` / `.marker.active` | 530-543 |
| Cap CSS | `app/public/index.html` | `.marker .cap` | 544-553 |
| Legend markup | `app/public/index.html` | `.legend` items | 1319-1326 |
| Legend dots | `app/public/index.html` | `.legend-dot` | 1001-1013 |
| Hover card dots | `app/public/index.html` | `.hc-dot` | 594-596 |
| Event list dots | `app/public/index.html` | `.event-dot` | 2445 |
| Y-to-lane thresholds | `app/public/index.html` | brief 014's hover mapping | 3162 |

## Implementation Steps

1. **Get a scanned replay with real objectives in it.** After brief 016 the
   harvest should be trustworthy. Log every `EventName` seen, including the
   unknowns from 2097.
   *Done when:* you have the actual `EventName` strings for grubs and dragons
   from a real game, written down. If none appear, that is #7's question - note it
   and continue with the parts that do not need them.

2. **Add the observed objective names to `EVENT_CATEGORY`** (2079). Only strings
   you saw. Anything you did not see stays out, with a comment saying so.
   *Done when:* a grub kill lands in the neutral lane, not in grey in lane 2.

3. **Move team onto the marker body.** In `buildMarker()` (2248), drop the cap
   element (2265-2270) and set the marker's colour from `teamFor()`. Neutral
   colour where there is no team.
   *Done when:* a screenshot of a fight shows blue and red markers, and the
   `.cap` rules (544-553) are deleted, not just unused.

4. **Give single markers their category shape.** X for kills, rectangle for
   structures, diamond for neutrals. Singles only - guard on
   `cluster.events.length === 1`.
   *Done when:* a single kill, a single turret and a single neutral are
   distinguishable in a screenshot at 100% zoom.

5. **Measure the X against the gate.** Rendered size, against the track, next to
   neighbours. If it is not clearly an X, ship the diamond fallback for kills and
   record the measurement.
   *Done when:* you have stated which shipped and why, with the pixel size.

6. **Leave clusters alone.** Confirm brief 014's widths and counts are unchanged.
   *Done when:* cluster widths measure the same as before this brief.

7. **Update the legend** (1319-1326). Two named categories with examples, team
   colour explained, "Top cap = team" removed - it will be describing something
   that no longer exists.
   *Done when:* the legend matches what the markers actually do, item for item.

8. **Follow the colour change through the other dot surfaces.** `.legend-dot`
   (1001), `.hc-dot` (594) and `.event-dot` (2445) all key off category. Decide
   deliberately whether they follow the marker to team colour or stay categorical
   - the list and the card have room for both, and consistency with the legend
   matters more than consistency with the marker.
   *Done when:* the choice is made, applied, and written down in one comment.

9. **Re-check the lane maths.** Adding grubs to the neutral lane means that lane
   is now non-empty on replays where it used to collapse (2212), which shifts
   every lane below it. Brief 014's hover mapping uses hardcoded y thresholds
   (3162) tied to the CSS positions.
   *Done when:* hovering each lane on a replay with grubs, and on one without,
   opens the right lane's events.

## Verification

On a scanned replay, at 1400px:

1. Look at a teamfight. You can tell which team got the kills without hovering.
2. A single kill, a single turret and a single neutral objective are three
   visibly different shapes.
3. Clusters still show counts, still grow from the left, still cap at ~26px.
4. The legend describes what is on screen - no cap, correct category names.
5. A grub kill (if the replay has one) sits in the neutral lane in the neutral
   shape.
6. On a replay with no neutral objectives, that lane still collapses and the
   remaining lanes are hover-correct - brief 014's specific trap.
7. Hover a marker: the card opens, rows are right, portraits load.
8. Click a marker: seeks. Shift+click: cues, no seek.
9. Resize narrow and wide: re-clustering and counts still correct.
10. An Ace still renders distinctly - it overrides cluster colour by design (2250)
    and that behaviour is deliberate.
11. Colour-check the marker blue against the scrub fill: `--blue` and `--accent`
    are the same value (18, 21), and the fill sits behind the markers at 0.3
    opacity. Markers must not disappear into played track.

## Can't Skip

- **The two colours in question must be distinguishable at marker size**, on
  screen, at 100% zoom. That is the whole issue.
- **Brief 014's counted clusters survive untouched.** Widths, cap, left-edge
  growth, the count digit.
- **Click-to-seek and shift+click-to-cue keep working** at every density.
- **Lane collapsing survives** (2212). Adding grubs changes which replays
  collapse - it must not remove the behaviour.
- **One nearest-cluster implementation** (brief 014's rule). Do not add a second
  for shapes.
- **No invented `EventName` strings.** Observed only.
- **The legend cannot describe a cap that no longer exists.**
- **Nothing floats over the scrub track** (briefs 007, 013, 014, 018).

## Traps

- **`--blue` and `--accent` are the same colour** (18, 21) and `--accent` is the
  scrub fill (435). Team-coloured markers on played track are blue on blue at 0.3
  opacity. Check it before deciding the colour work is done.
- **Brief 017 may change what `teamFor()` returns for structures.** If a turret
  killer starts resolving to a team, structure markers will acquire team colour
  for the first time. 017 runs first and is instructed to tell this brief -
  re-read its Outcome before step 3.
- **`.marker.hot` hardcodes `translateX(-50%) scaleY(1.35)`** (530-533) and
  `.marker.cluster` overrides it with `translateX(0)` (535-537) because clusters
  grow from the left. A rotated diamond adds a `rotate()` to the same transform
  property - all three states (base, hot, active) need it or shapes will
  un-rotate on hover.
- **`.marker::before` is a 16px invisible hit target** (490) and `SNAP_PX` is 8
  to match (brief 014). Changing the drawn shape must not change the hit target -
  those three numbers agreeing is what makes hover and click resolve the same
  cluster.
- **An X drawn with `::after` collides with `::before`'s hit target** if you reach
  for the wrong pseudo-element. `::before` is spoken for.
- **`.marker-count` sets `color: rgba(6, 18, 31, 0.75)`** (525) - a dark digit
  chosen against the old category colours. Team colours change the contrast under
  it. Check the digit is still readable on both.
- **`categoryFor()` logs unknown names once per page load** (2092, 2097). Reload
  before concluding a name is unlogged.
- **The `ace` category overrides cluster colour** (2250-2251) and that is
  deliberate - brief 014 says so explicitly. Keep it.

## Out Of Scope

Whether dragon/baron/herald events reach the feed at all (#7 - answer that after
brief 016, not here), harvest completeness (016), event label text (017), hover
card positioning (018), panel layout and spacing (015), and the detail band
brief 014 rejected as a future brief.

## Escalate Instead Of Deciding

- **If no neutral objective of any kind appears** in any replay after brief 016
  fixed the harvest, stop before restyling an empty lane. That is #7's answer
  arriving, and it changes whether lane 1 should exist at all - which is a bigger
  call than a colour pass.
- **If the X fails its gate and the diamond also reads poorly**, say so with the
  measurement rather than growing markers to fit. Marker width belongs to brief
  014's cluster counts.
- **If moving team onto the body makes categories genuinely ambiguous** in real
  use - not in theory - report it with a screenshot. The fallback is a category
  shape carrying more of the load, not the cap coming back.
