---
id: brief-029
state: ready
created: 2026-08-08
updated: 2026-08-08
agent: user
project: LOL-REPLAY-CONTROLLER
depends_on: [brief-027]
executes_after: brief-028
model: sonnet
---

# Brief 029: The Hover Magnet Measures A Point, So Wide Clusters Have A Dead Zone

Closes [#28](https://github.com/fletch-spec/lol-replay-interface/issues/28).

> Line numbers in this brief's `Where The Code Is` table are from brief 032's
> merge commit, split across `panel.css` and `panel.js`. Inline line
> references in the prose below are unchanged and predate the split. If the
> numbers don't match, grep for the symbol name; the names are stable, the
> lines are not.

## Problem Statement

Hovering the count digit on a clustered marker hides the hover card. Hovering
just to the left of the digit shows it. #28 reports it exactly: *"the number
itself stops the popup, around the text shows"*, and *"'8 ' with slight space on
the right that also hides"*.

The mechanism is arithmetic, not rendering. `buildMarker()` (`:2510`) positions a
clustered marker by its **left edge** - `.marker.cluster` sets
`transform: translateX(0)` (`:588`), deliberately, because the left edge is the
first event's real time (brief 014) - and gives it a width of
`clusterWidthPx(count) = 8 + Math.min(count, 6) * 3` (`:2506`), so a cluster of
six or more is **26px wide**. The gutter hover magnet (`:3699-3713`) then asks
`nearestCluster(px, SNAP_PX, lane)` (`:3657`), which measures
`Math.abs(candidate.pxX - px)` against `SNAP_PX = 8` (`:3652`).

`pxX` is a point: the marker's left edge. So on a 26px cluster the magnet is
"on" the marker only for the leftmost 8px of it. From `pxX + 8` to `pxX + 26` the
cursor is visibly inside the marker and the magnet returns `null`, which runs
`scheduleHideHoverCard()` (`:3706`) on every mousemove. The count digit is
centred in the marker - at `pxX + 13` for a six-plus cluster - which puts it
squarely in the middle of the dead band, and the band runs on past it to the
marker's right edge. That is the "slight space on the right" in the issue, to the
pixel.

Nothing rescues it. `marker.mouseenter` (`:2541`) fires once on entry and never
again, so it cannot cancel a hide scheduled 140ms later while the pointer sits
still. `.marker::before` (`:538`) is a 16px invisible hit target centred on the
marker's own box - on a 26px cluster it is *narrower* than the thing it is
padding. And single-event markers are unaffected, because they use
`translateX(-50%)` and are at most 7px wide, so their whole body is inside ±8px
of `pxX` - which is why the issue is about the number specifically.

The reason it reads as broken rather than fiddly: **clicking the digit works
fine.** `marker.click` (`:2534`) is a direct listener on the element, so the seek
lands. Hover and click disagree about where the marker is.

Clusters are the normal case, not the edge case - brief 014 made them counted
bars and brief 026's full harvest raised the counts feeding them. The card is how
you find out which eight kills are in that bar before you talk over them.

## Done Looks Like

A synthetic `mousemove` at every whole pixel across the full rendered width of
the busiest cluster leaves the hover card visible at every one of them, including
directly over the digit and at the marker's right edge. The same sweep 9px beyond
either edge leaves it hidden. Clicking anywhere on a wide cluster's body seeks to
that cluster's time, as clicking its left edge already does.

## Decision (already made - do not re-litigate)

**`nearestCluster()` measures distance to the marker's rendered span, not to a
point.** Each cluster carries the pixel interval it actually occupies on the
track; distance is zero inside the interval and the gap to the nearer edge
outside it. `SNAP_PX = 8` keeps its meaning and its value - it becomes the
forgiving margin *around* the marker instead of the marker's entire extent - and
the comment at `:3648-3651` explaining why 8 (markers pack ~15px apart in a
kill-heavy game) stays true.

**`buildMarker()` records the interval, at the same moment it writes the
geometry.** It already computes both numbers to set `style.left` and
`style.width`; storing `cluster.leftPx` / `cluster.rightPx` from those exact
values is one source of truth. This is not a detail - a span re-derived somewhere
else from `clusterWidthPx()` and a guess at the CSS transform is a second copy of
the layout rules that will drift the first time a marker's shape changes.

**Do not read the span back with `getBoundingClientRect()`.** Single-event kill
and objective markers are rotated 45° (`:572-578`) and every marker gains
`scaleY(1.35)` on hover (`:604-611`), so a measured rect folds in the rotation and
the hover state and answers a different question depending on when you ask it.
Compute the span from the arithmetic that produced it: clusters occupy
`[pxX, pxX + clusterWidthPx(count)]`, single markers `[pxX - w/2, pxX + w/2]` for
their own `w`.

**Both callers get the interval treatment, including click-snap.**
`nearestCluster()` is shared by the gutter magnet and by `targetFromEvent()`
(`:3674`), and the comment at `:3654-3656` says so. A click on the visible right
half of a wide cluster currently misses it and seeks to the raw cursor position -
the same defect as #28 wearing different clothes. Fixing one and not the other
would leave hover and click disagreeing in the opposite direction from today,
which is worse than either.

**`SNAP_PX` does not change value.** The interval fix is what widens the target;
raising the constant on top of it would start swallowing neighbouring clusters,
which is precisely what `:3649-3651` says was measured and rejected.

### Rejected before starting

- **Widening `.marker::before`'s 16px hit target.** It is a paint-and-hit-test
  detail on the element; the magnet never consults it. It would fix
  `marker.mouseenter`, which is not the thing scheduling the hide.
- **`pointer-events: none` on `.marker-count`.** It is already there (`:599`),
  and it is not the problem - the span is transparent to hit testing and the
  parent marker does receive the event. The hide comes from the container's
  `mousemove` handler, not from the digit intercepting anything.
- **Centring clustered markers (`translateX(-50%)`) so `pxX` lands mid-marker.**
  It would halve the dead zone rather than remove it, and it breaks brief 014's
  rule that a cluster's left edge is the first event's real time - a centred wide
  cluster claims territory before the moment it describes.
- **Cancelling the hide from `marker.mousemove` instead.** A second listener per
  marker papering over a wrong measurement in the first one; the magnet would
  still return `null` for the click path and for the ghost.
- **Dropping the gutter magnet and going back to per-marker hover only.** Brief
  014 added it because a 4px marker is not a hover target you can hit mid-take.

## Where The Code Is

| What | File | Symbol | Line |
|---|---|---|---|
| The point-distance test | `app/public/panel.js` | `nearestCluster()` | 2085 |
| The snap radius and why it is 8 | `app/public/panel.js` | `SNAP_PX` | 2076-2080 |
| Gutter magnet (schedules the hide) | `app/public/panel.js` | `scrubMarkersEl` `mousemove` | 2127-2141 |
| Click-snap, second caller | `app/public/panel.js` | `targetFromEvent()` | 2102 |
| Marker build + geometry | `app/public/panel.js` | `buildMarker()` | 938 |
| Cluster width formula | `app/public/panel.js` | `clusterWidthPx()` | 934 |
| Cluster objects (`pxX`, `lane`, `time`) | `app/public/panel.js` | cluster build loop in `renderMarkers()` | 908-921 |
| Count element | `app/public/panel.css` | `.marker-count` | 587 |
| Clusters grow rightward, on purpose | `app/public/panel.css` | `.marker.cluster` | 581-586 |
| Rotated single markers | `app/public/panel.css` | `.marker.kill:not(.cluster)` | 565-571 |
| Invisible hit target | `app/public/panel.css` | `.marker::before` | 531-539 |
| Per-marker enter/leave | `app/public/panel.js` | `marker.addEventListener('mouseenter'…)` | 969-970 |
| Hide timer | `app/public/panel.js` | `scheduleHideHoverCard()` | 1122 |
| Card open + positioning | `app/public/panel.js` | `openHoverCard()` | 1089 |
| Lane band arithmetic | `app/public/panel.js` | `laneForGutterY()` | 2118 |
| Re-render on track resize | `app/public/panel.js` | `remeasureMarkers()` | 2480 |

## Implementation Steps

1. **Reproduce it as a number, before changing anything.** With a scanned replay,
   find the widest cluster in `markerClusters`, then dispatch a synthetic
   `mousemove` on `#scrubMarkers` at each whole pixel from `pxX - 10` to
   `pxX + width + 10` (client coords derived from `scrubTrack`'s rect, `clientY`
   inside that cluster's lane band) and record whether `#hoverCard` has `.visible`
   after each. Print the visible/hidden map.
   *Done when:* the map shows visible from about `pxX - 8` to `pxX + 8` and hidden
   from `pxX + 9` to the marker's right edge - the dead zone, measured. If it does
   not, stop: the mechanism in this brief is wrong and that is the finding.

2. **Record the span on the cluster.** In `buildMarker()`, set `cluster.leftPx`
   and `cluster.rightPx` from the same values used for `style.left` and
   `style.width` - `[pxX, pxX + clusterWidthPx(count)]` for a cluster, and the
   centred half-width for a single marker, taken from the width its own CSS rule
   gives it.
   *Done when:* every entry in `markerClusters` has a `leftPx` <= `rightPx`, and
   for clusters `rightPx - leftPx` equals `clusterWidthPx(count)` exactly.

3. **Switch `nearestCluster()` to interval distance.** Distance is `0` when
   `px` is inside `[leftPx, rightPx]`, else the gap to the nearer edge. Keep the
   `lane` filter, keep the `<= maxDistance` return, keep the signature.
   *Done when:* step 1's sweep returns visible at every pixel from `leftPx - 8`
   to `rightPx + 8`, and hidden at `leftPx - 9` and `rightPx + 9`.

4. **Check the click path with the same change.** `targetFromEvent()` calls the
   same function with no lane.
   *Done when:* a click at the right-hand edge of a wide cluster seeks to that
   cluster's `time`, confirmed against the time readout, and alt-click at the
   same point still seeks to the raw position.

5. **Re-run step 1's sweep on the two nearest neighbouring clusters.** The
   interval widens the target and neighbours pack close.
   *Done when:* every cluster in the busiest lane is still individually
   reachable, and no pixel resolves to a cluster whose span does not contain it
   and whose edge is more than 8px away.

## Verification

Against the live app, with a scanned replay:

1. Hover slowly across the widest cluster, left edge to right edge. The card
   stays up the whole way, including over the digit.
2. Move 10px past the right edge into empty gutter. The card goes away.
3. The card's contents do not change while sweeping within one cluster - it must
   not rebuild on every pixel (`:3709-3712` guards this with `cluster !==
   hoverCluster`; the guard still has to hold now that more pixels resolve to a
   cluster).
4. Sweep across two adjacent clusters. The card swaps once, at the boundary, and
   both are reachable.
5. Click the middle of a wide cluster: playback seeks to that cluster's first
   event.
6. Shift+click the middle of a wide cluster: a cue is placed and playback does
   **not** move (`:2538`).
7. **Negative case:** single-event markers - a diamond kill, a structure
   rectangle - still show their card on hover and still seek on click. They were
   never broken; confirm they are still not.
8. **Negative case:** alt-drag on the scrub track still scrubs without snapping
   (`:3680`), and the ghost still shows the raw time.
9. **Negative case:** the cue pins below the track still open their own card
   growing downward (`:3232-3236`, brief 018) - this brief changes the marker
   gutter only.
10. **Negative case:** resize the window. Markers re-render through
    `remeasureMarkers()` (`:4052`) and the sweep from step 1 still passes at the
    new width - the spans must be recomputed, not stale.

## Can't Skip

- **Step 1 before any edit.** #26 is the standing lesson in this repo about
  designing a fix for an unconfirmed mechanism; a measured dead zone costs one
  console paste.
- **Compute the span, never measure it back.** Rotation and hover `scaleY` make
  `getBoundingClientRect()` answer a different question than the one being asked.
- **Recompute spans on every `renderMarkers()`.** They are pixel values against a
  track width that changes; a span cached across a resize points at nothing.
- **Do not change `SNAP_PX`.**

## Traps

- **`nearestCluster()` has two callers with different expectations** (`:3654-3656`
  spells this out). The gutter magnet passes a lane; `targetFromEvent()` does
  not. A `lane` check written as `candidate.lane !== lane` rather than the
  existing `lane !== undefined && …` guard would break click-snap entirely, and
  it would look like the scrub bar losing its magnetism, not like a hover fix.
- **`cluster.lane` is the *rendered slot*, not the category lane.** `laneSlot[]`
  (`:2474-2478`) collapses empty lanes, so a replay with no neutral objectives
  renumbers structures from 2 to 1. Anything comparing lanes must use the stored
  value, not `LANE_FOR`.
- **`laneForGutterY()` (`:3690`) hard-codes 12.5 and 24** against the
  `.marker.laneN` tops of 2/14/25. It is the same class of bug as this one -
  hit geometry re-derived from constants instead of from the layout - and it is
  *not* in scope here, but if a lane band ever looks wrong during testing, that
  is where it lives.
- **`.marker.ace` is 12px tall and starts at `top: 0`** (`:558-563`), overhanging
  lane 0's band upward. Vertical bands are unchanged by this brief; do not
  "improve" them while you are in the function.
- **The hover card can sit over the gutter it was opened from.** `openHoverCard()`
  grows markers' cards upward (`:2678-2681`) and the card has
  `mouseenter`/`mouseleave` of its own (`:2708-2709`). Widening the magnet must
  not create a strip where moving from marker to card crosses gutter that now
  resolves to a *different* cluster - check step 4's boundary case with the card
  open.
- **Brief 027 changes the counts.** Deduping the jittered copies makes clusters
  smaller, so the dead zone shrinks and a sweep run before 027 lands measures a
  different marker than one run after. Run 027 first (it is `depends_on`), and
  take step 1's baseline after it.

## Out Of Scope

The hover card's contents, position and clamping - brief 018's shipped work, and
verified. Marker colour and shape - brief 019's. `clusterWidthPx()`'s cap of 6 and
`CLUSTER_PX`'s value of 7. `laneForGutterY()`. Cue pins. **The track's width and
what happens to markers when it gets small - brief 030 owns that**, and it will
be resizing the very track these spans are measured against, so the two briefs
touch the same region: this one owns the hit test, 030 owns the box.

## Escalate Instead Of Deciding

- **If step 1's sweep does not show the dead zone**, stop and report the actual
  map. The arithmetic above says it must be there for any cluster wider than
  16px; if it is not, something else is producing #28 and building the interval
  fix anyway would close the issue without fixing it.
- **If step 5 shows neighbouring clusters becoming unreachable**, do not shrink
  `SNAP_PX` to compensate - report the widths and spacings. Two clusters whose
  spans overlap is a clustering question (`CLUSTER_PX`), and that belongs to a
  different brief than this one.
