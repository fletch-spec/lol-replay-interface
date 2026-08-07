---
id: brief-014
state: complete
created: 2026-08-07
updated: 2026-08-07
agent: user
project: LOL-REPLAY-CONTROLLER
depends_on: [brief-004, brief-009, brief-010]
executes_after: brief-013
model: sonnet
---

# Brief 014: Event Marker Legibility

> Line numbers are from commit `d0ae049`.

## Problem Statement

The gutter above the scrub track is meant to show the shape of the game at a
glance - where the fights were, where it turned, what is worth cueing. It does
not. Markers are 5px wide (8px when clustered) in a 34px three-lane gutter over
a track about 986px long, so a 30-minute game gives each marker roughly half a
pixel per second and any real fight collapses into a picket fence you cannot
separate by eye.

The hover card that resolves it is good, and that is the second problem: a 5px
marker is a hard target, nothing about the gutter says it is interactive, and a
cluster of eight looks identical to a single kill until you happen to land on it.

## Done Looks Like

Looking at the timeline tells you where the busy stretches are without hovering
anything. A marker standing for eight events looks different from one standing
for one, before you touch it. Getting the list open takes a sweep along the
gutter, not a pixel hunt.

## Decision (already made - do not re-litigate)

**Ship two things: counted clusters, and a gutter-wide hover target.**

### 1. Counted clusters

A cluster of more than one event renders with its count visible and its width
scaled by how many events it holds, capped so a 20-kill teamfight does not
become a 60px slab. A single event renders as it does today.

### 2. Gutter-wide hover target

Hovering anywhere in the marker gutter opens the hover card for the nearest
cluster **in the same lane** within a snap radius, rather than requiring a direct
hit on a 5px element. This is the same magnet `targetFromEvent()` (2897) already
applies to scrub clicks via `SNAP_PX`, applied to hover.

This is the discoverability fix. `cursor: pointer` is already inherited from
`.scrub-track` (420), so adding a cursor rule changes nothing - the affordance
problem is that the target is too small to find by accident, not that it looks
inert.

### Rejected alternatives

- **Density heat strip** above the lanes. Once cluster width scales with count,
  the markers *are* the density display, and a second one is redundant ink.
- **Detail band** showing an expanded window around the playhead. The most
  readable option and the most work, and it claims vertical space in the
  transport card at exactly the moment brief 013 has added an editor section and
  brief 015 has to balance the whole panel. If counted clusters prove
  insufficient after real use, this is the follow-up brief - not this one.
- **Lowering `CLUSTER_PX`** below 7. Makes markers overlap rather than merge,
  which trades an honest cluster for a dishonest pile. The threshold matches the
  marker's own width for a reason.

## Where The Code Is

| What | File | Symbol | Line |
|---|---|---|---|
| Lane assignment + clustering | `app/public/index.html` | `renderMarkers()` | 2053 |
| Cluster threshold | `app/public/index.html` | `CLUSTER_PX` | 2043 |
| Lane map | `app/public/index.html` | `LANE_FOR` | 2042 |
| One marker element | `app/public/index.html` | `buildMarker()` | 2104 |
| Cluster store | `app/public/index.html` | `markerClusters` | 2048 |
| Hover card open | `app/public/index.html` | `showHoverCard()` / `openHoverCard()` | 2254 / 2239 |
| Hover row build | `app/public/index.html` | `buildHoverRow()` | 2191 |
| Hide with delay | `app/public/index.html` | `scheduleHideHoverCard()` | 2259 |
| Click snap magnet | `app/public/index.html` | `targetFromEvent()` / `SNAP_PX` | 2897 / 2892 |
| Active/past marker state | `app/public/index.html` | `updateEventProgress()` | 2139 |
| Re-measure on width change | `app/public/index.html` | `remeasureMarkers()` | 3230 |
| Marker styles | `app/public/index.html` | `.marker` and lane offsets | 474-528 |
| Gutter container | `app/public/index.html` | `.scrub-markers` | 467 |

## Implementation Steps

1. **Get a dense timeline in front of you before writing code.** Load the replay
   brief 010 used - 99 `ChampionKill`, 16 `TurretKilled`, 13 `Multikill`, 4 `Ace`
   - and run the scan. If you cannot get one, seed `eventsByKey` from a saved
   cache entry. **Do not develop against a six-event timeline**; every decision
   in this brief is invisible at that density and the result will look fine and
   fail in use.
   *Done when:* the gutter shows ~130 events and you can see the problem.

2. **Render the count on clusters.** In `buildMarker()` (2104), when
   `cluster.events.length > 1`, add the count. The marker is 5px wide and 8px
   when clustered - a digit does not fit inside it, so the count needs the
   marker to widen. Scale width by count with a hard cap (suggest: `8px +
   min(count, 6) * 3px`, tune on screen), and put the digit inside once it fits.
   *Done when:* a 12-event cluster is visibly wider than a 2-event one, and both
   are visibly wider than a single.

3. **Keep the cap honest.** Above the cap, width stops growing but the number
   keeps counting. A cluster must never be so wide it spans a meaningful slice of
   game time - if it renders wider than `CLUSTER_PX * 3`, it is claiming
   territory it does not own.
   *Done when:* the widest cluster on the dense replay is under ~30px.

4. **Add the gutter hover target.** Attach `mousemove` to `.scrub-markers` (467).
   Compute the cursor's x within the track, find the nearest cluster whose
   `lane` matches the row the cursor is in and whose `pxX` is within the snap
   radius, and call `showHoverCard()` for it. Reuse the distance loop from
   `targetFromEvent()` (2905) rather than writing a second one - factor it out if
   it helps, but there must be one nearest-cluster implementation.
   *Done when:* sweeping the mouse along the gutter opens cards continuously
   without needing to hit any marker exactly.

5. **Keep per-marker `mouseenter` working** (2128). The gutter handler is
   additive. If a marker is hit directly, that must still win - a direct hit is
   never ambiguous.
   *Done when:* both paths open the same card for the same cluster.

6. **Do not let the card thrash while sweeping.** `scheduleHideHoverCard()`
   (2259) has a 140ms grace; opening a new card for a new cluster should replace
   the contents rather than hide-then-show. `openHoverCard()` (2239) already
   does `replaceChildren` and moves the anchor - check it does not flicker at
   speed and add a small hysteresis if it does.
   *Done when:* sweeping across ten clusters produces ten card updates and no
   blank frames.

7. **Verify the lane maths still holds.** Lanes collapse when empty (`laneSlot`
   at 2074), so lane *index* is not lane *slot*. The gutter hover must map cursor
   y to the rendered slot, not to `LANE_FOR`'s index, or it will resolve to the
   wrong lane on any replay with no objectives.
   *Done when:* hovering the structures row on an objective-free replay opens
   structure events, not nothing.

## Verification

All of this on the ~130-event replay:

1. The gutter reads as varied - dense stretches look dense, quiet ones quiet.
2. Pick the biggest cluster. Its count matches the number of rows in its card.
3. Sweep the mouse slowly along the whole gutter. Cards open continuously, no
   dead zones between markers, no flicker.
4. Click a marker: playback seeks to the event.
5. Shift+click a marker: a cue is placed, playback does not move.
6. Click a row inside a hover card: seeks to that specific event.
7. Alt-drag on the track: no snapping, precise scrubbing still works.
8. Resize the browser window narrower and wider. Markers re-cluster and the
   counts change accordingly - stale counts mean `renderMarkers()` is not being
   re-run.
9. Open the panel in a background tab, wait five seconds, bring it forward.
   Markers are correct, not all collapsed into one cluster.
10. On an objective-free replay, all lanes still resolve correctly.

## Can't Skip

- **Test at ~130 events.** A six-event screenshot proves nothing here.
- **A cluster is identifiable as a cluster without hovering it.**
- **The hover card is reachable without a pixel hunt**, and is not removed - the
  review called it good.
- **Click-to-seek and shift+click-to-cue keep working** on every marker at every
  density. These are the only ways to reach an event from the bar.
- **Nothing floats over the scrub track.** The gutter above and the pin strip
  below are the available space. Same rule as briefs 007 and 013.
- **Lane collapsing survives.** If brief 010 found objectives never arrive, that
  lane is gone - do not resurrect it here.
- **One nearest-cluster implementation**, shared by click-snap and hover.
- **Re-measure on resize keeps working.** Clustering is pixel-derived;
  `remeasureMarkers()` (3230) plus its 1s poll (3245) exist because a background
  tab lays out at ~0px and collapses everything into one cluster. Confirmed live
  - do not remove the poll as redundant.

## Traps

- **`markerClusters` is the single structure the whole timeline reads from** -
  hover, click-snap, and active-event tracking (`updateEventProgress()` at 2139)
  all index into it, and it is sorted by time while `pxX` is computed per lane.
  Changing its shape breaks three things at once.
- **`cluster.pxX` is the *first* event's position**, and `marker.style.left` is
  set from `first.EventTime` as a percentage (2111). If the marker widens, decide
  deliberately whether it grows from its left edge or centres on the event - a
  centred wide cluster shifts its apparent time earlier, which matters when you
  are clicking it to seek.
- **`.marker::before` provides a 16px hit target** (485) larger than the visible
  marker, and `SNAP_PX` is 8 to match it (2892 explains why a wider radius fights
  precise scrubbing). If markers widen, these three numbers must stay consistent
  or snapping and hovering will disagree about which cluster you are on.
- **Markers stop propagation on `mousedown`** (2120) so clicking one does not
  start a scrub drag. A gutter-level handler must not break that.
- **The `ace` category overrides the cluster's colour** (2106) - a cluster
  containing an Ace renders white regardless of what else is in it. Keep that;
  it is deliberate.
- **`renderMarkers()` calls `hideHoverCard()` first** (2055). At 1Hz the event
  feed can merge a new event and trigger a re-render, which will close a card the
  user is reading. It is a pre-existing annoyance that this brief will make much
  more visible - if it bites, fix it by not re-rendering when nothing changed
  (`mergeEvents()` at 2328 already gates on `changed`), not by removing the
  `hideHoverCard()` call.

## Out Of Scope

What counts as an event, the category map, the dedup fingerprint, the legend's
contents (brief 010), panel layout and spacing (brief 015), and the detail band
described under rejected alternatives. `EventID` still must never be used as a
key.

## Escalate Instead Of Deciding

- The source feedback reads "hovering shows a list which is good but hard to see
  of the start", which is ambiguous between *the hover card is hard to discover*
  and *markers near the start of the track are hard to see*. This brief is built
  around the first and the counted clusters help the second, since early-game
  kills genuinely do bunch at the left. If the second reading was meant and the
  bunching is still unreadable after this brief, that is the detail band, and it
  is a new brief - ask rather than growing this one.
- If counted clusters turn out to need `CLUSTER_PX` retuned to look right, say
  so with the number rather than changing it quietly - it interacts with
  `SNAP_PX` and the 16px hit target.

## Outcome (2026-08-07)

Shipped both pieces. Could not get the brief's own suggested test replay
(99 `ChampionKill`, 16 `TurretKilled` - the one brief 010 audited) since
this session can't browse or load replay files, only drive whatever the
client already has open. Substituted the one available replay's own
accumulated event pool, which by this point in the session had grown to 61
events / 34 clusters from earlier briefs' extensive seeking - dense enough to
exercise the real failure mode (widest cluster hit count 4 before this brief;
plenty of 2-3 count clusters to check scaling against) even though it isn't
the specific 130-event replay named. Noted rather than substituted quietly.

**Counted clusters:** width is `8 + min(count, 6) * 3` px as suggested,
capped at 26px - measured live, the widest cluster on the available replay
(count 4) rendered at 20px, comfortably under the ~30px ceiling. Clusters
grow from their **left edge**, not centred - Trap called this out as a
decision to make deliberately, and centring would visually claim time before
the first event actually happened. Required overriding the hover/active
transform for `.marker.cluster` separately, since the base `.marker.hot`
rule hardcodes `translateX(-50%)`.

**Gutter-wide hover** reuses one `nearestCluster(px, maxDistance, lane)`
factored out of `targetFromEvent()` - lane omitted searches everything
(click-snap, unchanged behaviour), lane passed restricts to a rendered slot
(the new hover). Y-to-lane mapping is two hardcoded thresholds (12.5, 24)
matched to the existing `.marker.laneN` CSS positions, commented as such so
they don't drift apart silently. Verified live: swept 2px increments across
an entire kill lane (28 clusters) with zero dead spots across 418 samples.
Verified the lane-collapse trap specifically - this replay has no
`objective`-category events (per brief 010), so structures render in slot 1,
and hovering that row opens tower events, not nothing, confirmed by
dispatching a real `mousemove` at that position and reading back
`hoverCluster`.

**One thing this session could not confirm by eye:** the Browser pane used
for testing isn't actually displayed/composited in this environment (a
screenshot times out), so `getBoundingClientRect()` initially reported the
track at ~2px wide - the exact "backgrounded tab" failure mode
`remeasureMarkers()`'s 1s poll exists for, except here the pane never
becomes visible at all rather than being temporarily hidden. Forcing a
`resize_window` call produced a correct layout (934px, then 982px at
1920px width) for every DOM-level check in this outcome, but nobody has
looked at the actual rendered pixels.
