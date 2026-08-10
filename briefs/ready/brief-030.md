---
id: brief-030
state: ready
created: 2026-08-08
updated: 2026-08-08
agent: user
project: LOL-REPLAY-CONTROLLER
depends_on: [brief-029]
executes_after: brief-029
model: sonnet
---

# Brief 030: The Panel Stops Wasting A Wide Screen And Stops Crushing A Narrow One

Closes [#29](https://github.com/fletch-spec/lol-replay-interface/issues/29).

> Line numbers in this brief's `Where The Code Is` table are from brief 032's
> merge commit, split across `index.html` (markup), `panel.css` and `panel.js`.
> Inline line references in the prose below are unchanged and predate the
> split. If the numbers don't match, grep for the symbol name; the names are
> stable, the lines are not.

## Problem Statement

#29 carries three screenshots and one sentence of exemption: *"height squish just
hides content and scrolls - fine"*. So this is about width, and there are three
distinct failures in the three pictures, each with its own mechanism.

**Wide / zoomed out.** `.panel` is capped at `max-width: 1400px` (`:356`). The
comment above it (`:353-355`) is the argument against its own current value:
*"Monitor 2 is a whole screen; a 720px column left most of it as dead space.
Wider also means more pixels per minute on the scrub track, which is what
separates markers in a kill-heavy game."* That reasoning took the panel from 720
to 1400 and then stopped. In #29's first screenshot the panel occupies roughly a
third of the frame, with the rest black - the exact complaint the comment was
written to answer, one screen size later.

**Narrow.** `.timeline-row` (`:454`) is `display: flex` with **no wrap**, and
`.rail` (`:1102`) is `width: 330px; flex-shrink: 0` while `.scrub-area` is
`flex: 1; min-width: 0` (`:459-462`). Those three facts mean the rail always wins
and the track always pays. At #29's 492px screenshot the panel's content box is
roughly 400px, the rail takes its rigid 330, and the scrub track is left a ~60px
stub - a timeline you cannot scrub, with minute ticks stacked on top of each
other. `.legend` (`:1074`) is also `display: flex` with no wrap, so its six items
overflow `.scrub-area` sideways and paint straight across the rail: that is the
smeared text over the event rows in the same screenshot, not a z-index bug.

**Zoomed in.** Browser zoom buys fewer CSS pixels, so it lands in the narrow case
by another road - and adds one of its own. With the track down to a couple of
hundred pixels, `CLUSTER_PX = 7` (`:2443`) collapses a 101-event replay into a
handful of markers; #29's second screenshot shows counts of **85** and **16**. A
clustered marker grows rightward from its left edge (`.marker.cluster`, `:588`)
and `.scrub-markers` (`:520`) neither clips nor clamps, so the last cluster's body
runs past the track's right edge and lands on top of the events rail - which is
what those two badges are doing sitting over the `Events (101)` header.

None of this is cosmetic in the way the screenshots make it look. The scrub track
is the instrument; when the track is 60px the panel has no timeline, and when one
marker holds 85 of 101 events the timeline has no information in it.

## Done Looks Like

At 1920px and 2560px viewport widths the panel uses meaningfully more of the
screen than 1400px and the scrub track is correspondingly wider, measured in
pixels-per-game-minute before and after. At 900px and below, the rail sits
**below** the track at full width instead of beside it, the track keeps a usable
minimum width, the legend wraps onto as many lines as it needs, and no element's
rendered rect extends outside its parent's. No marker's rendered box crosses the
scrub track's right edge at any width.

## Decision (already made - do not re-litigate)

**Raise the panel cap to `1800px`.** It stays a cap, not a target - narrower
viewports are unaffected, and the panel is still centred. Say the honest thing in
the comment: at extreme zoom-out there will always be margin, because a cap is a
cap; what this changes is that 1400 stops being the binding constraint on the
ordinary 1920 and 2560 monitors the panel actually runs on.

**The timeline row stacks below a threshold, via a container query.** Below the
threshold, `.timeline-row` becomes `flex-direction: column` and `.rail` becomes
full width; above it, nothing changes. `.transport` already declares
`container-type: inline-size` (`:436`) and the file already has one
`@container (min-width: 1220px)` block (`:1285`) - this is the established
pattern here, not a new one.

**Container query and a direction change, not `flex-wrap` and flex sizing.** This
is deliberate and the reason is written into the file at `:1274-1284`: last
session's first attempt at centring this row used `flex: 1 0 0` on a flex item
whose own content is a nested flex container, it measured clean in Chromium, and
it broke visibly in Fletcher's Firefox - Mozilla bug #1179454. `.rail` and
`.scrub-area` are exactly that shape. A rule that changes `flex-direction` and a
width does not enter that bug's territory; a rule that leans on flex basis and
shrink does.

**`.scrub-area` gets a real `min-width` floor and stops being `min-width: 0`.**
That single declaration (`:462`) is what permits the 60px stub. The floor is what
makes the stacking threshold enforceable rather than advisory.

**`.legend` gets `flex-wrap: wrap`.** One declaration, and it is the whole of the
smeared-text failure.

**Clustered markers clamp inside the track, they do not get clipped.**
`buildMarker()` shifts a marker left so its right edge lands at the track's right
edge, at most `clusterWidthPx(count)` of movement. `overflow: hidden` on
`.scrub-markers` was rejected: it would slice the last cluster's count digit in
half, and brief 018 spent a whole brief getting the hover card *out* of a
clipping context for the same reason - a clipped readout is worse than a
displaced one. The clamp moves the marker's box only; `cluster.time` is
untouched, so seeking and the hover card still resolve to the real event time.

**The threshold is measured in step 1, not guessed here.** The default to beat is
a container width of 700px (330px rail + 12px gap + ~360px of track). If step 1
shows the track needs more than 360px to be scrubbable, raise the threshold and
say what you measured.

### Rejected before starting

- **Removing the cap entirely / `width: 100%`.** A 3440px roster row of ten cards
  and 3400px lines of hint text. Brief 015 already measured the roster's
  behaviour when it gets more room than it needs.
- **A viewport-relative cap (`90vw`).** Solves the wide case by reintroducing the
  narrow one - at 900px it hands the layout 810px and the rail still takes 330 of
  it.
- **Shrinking `.rail` proportionally instead of stacking it.** The rail holds
  event rows with champion names and timestamps; a 180px rail is a rail you
  cannot read, and it keeps the track narrow anyway.
- **Hiding the rail below a threshold.** It is the event list - the thing you
  read while narrating. Stacking costs vertical space, which #29 explicitly
  exempts ("height squish… fine").
- **Raising `CLUSTER_PX` or capping cluster size at narrow widths.** The 85-count
  marker is a *symptom* of a 250px track, and it goes away when the track is not
  250px. Tuning clustering to make a broken width look better hides the width.
- **Any `@media` breakpoint on the viewport.** The transport card is already a
  query container and its width, not the window's, is what decides whether the
  track and rail fit.

## Where The Code Is

| What | File | Symbol | Line |
|---|---|---|---|
| Panel cap, and the comment arguing against it | `app/public/panel.css` | `.panel` | 344-357 |
| Timeline row (no wrap) | `app/public/panel.css` | `.timeline-row` | 447 |
| Track column (`min-width: 0`) | `app/public/panel.css` | `.scrub-area` | 452-459 |
| Rigid rail | `app/public/panel.css` | `.rail` | 1095-1104 |
| Rail scroll body | `app/public/panel.css` | `.rail-body` | 1124 |
| Legend (no wrap) | `app/public/panel.css` | `.legend` | 1067-1073 |
| Timeline row markup | `app/public/index.html` | `.timeline-row` markup | 81-122 |
| Query container declaration | `app/public/panel.css` | `.transport` `container-type` | 429 |
| Existing container query + Firefox note | `app/public/panel.css` | `@container (min-width: 1220px)` | 1267-1289 |
| Card clips its own overflow | `app/public/panel.css` | `.transport.card` | 431-435 |
| Marker gutter | `app/public/panel.css` | `.scrub-markers` | 513-519 |
| Clusters grow rightward | `app/public/panel.css` | `.marker.cluster` | 581-586 |
| Marker geometry (where the clamp goes) | `app/public/panel.js` | `buildMarker()` | 938 |
| Cluster width | `app/public/panel.js` | `clusterWidthPx()` | 934 |
| Track-width measurement | `app/public/panel.js` | `renderMarkers()` / `lastMarkerTrackWidth` | 881 / 889-890 |
| Re-render on track resize | `app/public/panel.js` | `remeasureMarkers()` + `ResizeObserver` | 2480-2488 |
| Spacing tokens | `app/public/index.html` | `--space-1`…`--space-4` | 34-37 |

## Implementation Steps

1. **Measure the three failures, before changing anything.** Load the panel in an
   iframe with a scanned replay and, at viewport widths 480, 700, 900, 1200,
   1400, 1920 and 2560, record: the scrub track's rendered width, pixels per game
   minute, `.rail`'s width, the number of `.legend` lines, whether any child's
   rect escapes its parent's, and the largest marker count on screen.
   *Done when:* the table reproduces #29 - a stub track and an overflowing legend
   at 480, and identical numbers at 1920 and 2560 because of the cap.

2. **Raise the cap.** `.panel { max-width: 1800px }`, and update the comment to
   say what the number is and that it is a cap.
   *Done when:* step 1's table at 1920 and 2560 shows a wider track and more
   pixels per game minute, and 1200 and 1400 are byte-identical to before.

3. **Wrap the legend.** `flex-wrap: wrap` on `.legend`.
   *Done when:* at 480px the legend occupies several lines and no legend text
   renders outside `.scrub-area`'s rect.

4. **Give the track a floor and stack below the threshold.** Replace
   `.scrub-area { min-width: 0 }` with a real minimum, and add a container query
   below which `.timeline-row` is `flex-direction: column` and `.rail` is full
   width.
   *Done when:* at 900px and below the rail is beneath the track, at full width,
   and the track never renders narrower than its floor at any width in step 1's
   sweep.

5. **Clamp markers inside the track.** In `buildMarker()`, after computing the
   left offset and width for a cluster, shift left so the right edge does not
   exceed the track width. Leave `cluster.time` alone.
   *Done when:* at 480px, every marker's rendered right edge is <= the scrub
   track's right edge, and clicking the last cluster still seeks to its real
   event time.

6. **Re-run brief 029's hover sweep.** Brief 029 stores each cluster's pixel span
   for the hit test; a clamped marker's span is the clamped one.
   *Done when:* the hover card is visible across the full rendered width of the
   last cluster at 480px, not just where it used to be.

7. **Re-run step 1's table.**
   *Done when:* every row is either improved or unchanged, and you can name any
   row that is not.

## Verification

Against the live app, with a scanned replay:

1. At 1920px: the panel is wider than 1400px, still centred, and the scrub track
   is measurably wider than before. Markers that used to cluster are more spread
   out.
2. At 2560px: the panel stops at 1800px and does not keep growing.
3. At 1400px and 1200px: nothing has moved. Compare rects against step 1's
   baseline.
4. At 900px: the rail is below the track, full width, and the track spans the
   card.
5. At 480px: the track is still scrubbable, the legend wraps, and no text crosses
   into the rail.
6. At 480px, drag the scrub handle end to end. The playhead follows and the time
   readout is monotonic.
7. **Negative case:** the transport control row is untouched at every width -
   `« 5s | Pause | 5s »` still joined, five speed buttons still 76px, the row
   still wraps rather than overlapping (brief 024's hardening).
8. **Negative case:** the status bar, roster, loop row and cues card render the
   same at 1200px and 1400px as before this brief.
9. **Negative case:** cue pins still sit below the track and their hover cards
   still grow downward (brief 018), at both a wide and a narrow width.
10. **Negative case:** resize the window continuously from 1920 down to 480 and
    back. `remeasureMarkers()` (`:4052`) re-renders markers without leaving stale
    positions, and nothing throws in the console.
11. **Negative case:** open the panel in a background tab, then switch to it -
    the ~0px-wide layout path the comment at `:4062-4064` describes still
    recovers.

## Can't Skip

- **Step 1 before any edit.** Three of this brief's five changes are justified by
  numbers that do not exist yet, and "the track got wider" is not checkable
  without the before.
- **No `flex: 1 0 0` on `.scrub-area` or `.rail`.** `:1274-1284` records what
  that cost in Fletcher's Firefox last session; both elements are the exact shape
  the Mozilla bug describes.
- **The clamp moves the box, never `cluster.time`.** A marker that seeks to a
  time it was displaced to is a worse bug than one that hangs over an edge.
- **Re-run brief 029's sweep after step 5.** The two briefs share the marker
  gutter: 029 owns where the hit test thinks a marker is, this one owns where the
  marker is.

## Traps

- **`.scrub-area { min-width: 0 }` is load-bearing for something.** `min-width: 0`
  on a flex item is the standard fix for descendants that need to shrink below
  their content - `.time-next` uses `overflow: hidden; text-overflow: ellipsis`
  (`:1245-1252`) and needs it. Replacing 0 with a floor may make that text stop
  ellipsising and start pushing. Check the time readout row specifically at 900px.
- **`.transport.card` sets `overflow: hidden`** (`:438-442`). Anything this brief
  makes too wide presents as a *missing* element, not a scrollbar - so "it looks
  fine" at a narrow width can mean the overflow is being hidden from you. Measure
  rects, do not trust the picture.
- **`.transport > *` adds padding and a top border to every direct child**
  (`:443-448`). Wrapping `.timeline-row` in a new element to make the stacking
  easier gives that element a hairline it should not have.
- **The container query's container is `.transport`, not the panel.** Its width
  is the panel's width minus the panel's padding; a threshold written as if it
  were the viewport will fire ~40px late.
- **`renderMarkers()` measures the track once per render** (`:2461`) and stores
  `lastMarkerTrackWidth`; `remeasureMarkers()` skips re-rendering when the width
  moved less than 1px (`:4055`). A layout change that alters the track width by a
  sub-pixel amount leaves the markers positioned for the old width.
- **`cluster.pxX` is used for three different things** - the marker's CSS `left`,
  the snap/hover distance (brief 029), and nothing else. Clamping the CSS `left`
  without telling 029's span about it re-opens #28 at narrow widths only, which
  is the hardest kind of regression to spot.
- **The roster overflows too, and it is not this brief's.** At 492px the roster
  cards truncate to `G…` / `Pla…` and the `· 40 CS` text renders outside the
  card's right edge. It is real, it is visible in #29's third screenshot, and it
  belongs to `.roster-*` and brief 015's density work. Note it, leave it.

## Out Of Scope

**#26 - the `4×` / `‹ Event` overlap - is not this brief's**, even though it is a
width symptom and even though #29's title invites it. Two sessions have now
failed to reproduce it across a 820-1500px sweep and a zoom x width matrix, both
in Chromium; brief 024 hardened the row anyway and its Outcome explicitly refused
to close the issue. It needs Fletcher's window width, browser zoom and Windows
display scaling before anyone designs for it, and folding it in here would give
this brief an acceptance test no session can run.

Also out: vertical / height behaviour, which #29 exempts by name. The roster's
layout and its overflow at narrow widths (brief 015). Clustering constants
(`CLUSTER_PX`, `clusterWidthPx()`'s cap). The hover card (brief 018) and the
hover hit test (brief 029). Anything Firefox-specific - #32 is the open record
and this session's Browser pane is Chromium-only.

## Escalate Instead Of Deciding

- **If step 2 shows the roster's ten cards can go back to one row at 1800px**,
  stop and say so rather than doing it. Brief 015 measured a champion name
  getting 37px at 1400px, failed its own legibility gate and shipped a documented
  two-row fallback; reversing that is brief 015's call with brief 015's gate, not
  a side effect of a `max-width`.
- **If the stacking threshold cannot be satisfied** - if there is no container
  width at which both a readable rail and a scrubbable track fit - report the two
  numbers rather than picking a winner. That is a layout decision about what the
  panel is for at 480px, and Fletcher makes it.
- **If raising the cap makes anything else look wrong at 1800px**, screenshot it
  and ask. The cap has been 1400 for the whole life of the panel and nothing above
  it has ever been seen.
