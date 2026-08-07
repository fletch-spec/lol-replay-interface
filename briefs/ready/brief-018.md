---
id: brief-018
state: ready
created: 2026-08-07
updated: 2026-08-07
agent: user
project: LOL-REPLAY-CONTROLLER
depends_on: [brief-014]
executes_after: brief-017
model: sonnet
---

# Brief 018: The Hover Card Is Clipped By The Card It Lives In

Closes [#15](https://github.com/fletch-spec/lol-replay-interface/issues/15).

> Line numbers in this brief are from commit `e8e05b9`. If they don't match,
> grep for the symbol name - the names are stable, the lines are not.

## Problem Statement

Hover a timeline event and the card that opens is cut off along its top edge. The
issue's screenshot shows it: the card's lower rows are readable, everything above
the transport card's boundary is gone.

The mechanism is not subtle once you look at it. `.hover-card` (558) is
`position: absolute` with `top: 2px` and `transform: translate(-50%, -100%)`,
which grows it **upward** from the top of `.scrub-area` (411). Its ancestor
`.transport.card` sets `overflow: hidden` (393). Everything the card draws above
the transport card's top edge is clipped away.

Available headroom is the transport-controls row plus a little padding - roughly
50px. `.hover-card` is `max-height: 240px` (567). A card with more than about two
rows in it loses the rest.

Brief 014 turned this from an edge case into the normal case. Counted clusters
mean a hover routinely lists eight or twelve events, and the gutter-wide hover
target means cards open on a sweep rather than on a deliberate pixel hit. The
feature that made the timeline readable is the feature that made this constant.

The cost during a take is specific: the rows that get clipped are the **earliest
events in the cluster**, because the list is time-ordered and grows upward off
the top. You lose the start of the fight, which is the part you were about to
talk about.

## Done Looks Like

Hover the busiest cluster in a game. Every row in it is on screen and readable.
Nothing about the transport card's own appearance changed.

## Decision (already made - do not re-litigate)

**Take the hover card out of the clipping context by making it
`position: fixed`, positioned from the anchor's `getBoundingClientRect()`.**

`overflow: hidden` on `.transport.card` stays. It is what keeps the
hairline-separated sections inside the card's rounded corners, and the card
consolidation it belongs to is explained at 381 - removing it to fix a tooltip
trades a real visual regression for a real visual bug.

A `position: fixed` element's containing block is the viewport, so a plain
`overflow: hidden` on a static ancestor does not clip it. **This is conditional
and the condition must be checked:** if any ancestor establishes a containing
block for fixed descendants - `transform`, `filter`, `perspective`,
`will-change`, `contain: paint` - the exemption is void and the card must be
appended to `document.body` instead. Step 1 checks this. Do not assume either
way.

**The card still never flips below the track.** If it does not fit above, it
clamps to the top of the viewport and scrolls internally - `max-height: 240px`
and `overflow-y: auto` (567-568) already provide that. Briefs 007, 013 and 014
all carry the same rule: nothing floats over the scrub track, because the track
is what you are about to click.

### Rejected alternatives

- **Dropping `overflow: hidden` from `.transport.card`** (393). One line, and it
  un-rounds the corners of a card whose sections paint their own backgrounds and
  borders. It also only works until the next ancestor that clips - the card would
  still be structurally inside a box it needs to escape.
- **Flipping the card below the track when it does not fit.** Breaks the standing
  rule three briefs have kept, and it puts a 240px panel over the scrub track at
  exactly the moment you are aiming at it.
- **Shrinking `max-height` to fit the available headroom** (~50px). That is two
  rows. It "fixes" the clipping by deleting the feature.
- **Giving `.scrub-area` more `padding-top`.** Pushes the whole instrument down
  the page for headroom that is only needed while hovering, and brief 015 just
  spent a pass reclaiming vertical space.

## Where The Code Is

| What | File | Symbol | Line |
|---|---|---|---|
| The clip | `app/public/index.html` | `.transport.card { overflow: hidden }` | 393 |
| Card styles | `app/public/index.html` | `.hover-card` | 558 |
| Max height + scroll | `app/public/index.html` | `max-height` / `overflow-y` | 567-568 |
| Positioning logic | `app/public/index.html` | `openHoverCard()` | 2391 |
| Horizontal clamp | `app/public/index.html` | `clamp(pxX, half + 2, ...)` | 2403 |
| Marker path | `app/public/index.html` | `showHoverCard()` | 2406 |
| Cue-pin path | `app/public/index.html` | `openHoverCard()` callers | grep |
| Hide + grace | `app/public/index.html` | `scheduleHideHoverCard()` / `hideHoverCard()` | 2411 / 2416 |
| Card's own hover | `app/public/index.html` | `hoverCardEl` listeners | 2425-2426 |
| Anchor element | `app/public/index.html` | `<div class="hover-card" id="hoverCard">` | 1313 |
| Gutter container | `app/public/index.html` | `.scrub-markers` | 472 |
| Re-render hides card | `app/public/index.html` | `renderMarkers()` → `hideHoverCard()` | 2193 |

## Implementation Steps

1. **Check the containing-block condition first - it decides the rest of the
   brief.** With a card open, walk up from `#hoverCard` and check every ancestor's
   computed `transform`, `filter`, `perspective`, `will-change` and `contain`.
   ```js
   let el = document.getElementById('hoverCard').parentElement, hits = [];
   while (el) { const s = getComputedStyle(el);
     if (s.transform !== 'none' || s.filter !== 'none' || s.perspective !== 'none'
         || s.willChange !== 'auto' || s.contain !== 'none') hits.push([el.className, s.transform, s.filter, s.willChange, s.contain]);
     el = el.parentElement; }
   console.log(hits);
   ```
   *Done when:* you know whether the card can stay in place or must move to
   `document.body`, and the answer is written in the Outcome section.

2. **Switch `.hover-card` to `position: fixed`** (558) and position it in
   `openHoverCard()` (2391) from the anchor's viewport rect rather than from a
   pixel offset inside `.scrub-area`.
   *Done when:* a 12-row card opens fully on screen with nothing cut off.

3. **Re-clamp horizontally against the viewport**, not against
   `scrubAreaEl.getBoundingClientRect().width` (2400-2403). The existing clamp
   keeps the card inside the scrub area; in viewport coordinates the same
   arithmetic points at the wrong box.
   *Done when:* hovering the first and last cluster on the track keeps the whole
   card on screen at 1400px and at a narrow window.

4. **Clamp vertically at the top of the viewport.** If the card is taller than
   the space above the track, it stops at the viewport edge and scrolls inside
   itself. It does not flip below.
   *Done when:* a maximum-height card with the panel scrolled to an awkward
   position is fully reachable, and the scrub track is never covered.

5. **Fix the card on scroll and resize.** Fixed coordinates are viewport-relative
   and the anchor moves when the page scrolls. Either reposition on `scroll` and
   `resize`, or hide the card - hiding is acceptable and simpler, since the card
   is transient by nature. Pick one and comment which and why.
   *Done when:* scrolling with a card open does not leave it floating over
   unrelated UI.

6. **Verify the cue-pin path.** `openHoverCard()` is shared - its comment at 2389
   says so - and cue pins anchor **below** the track while markers anchor above.
   Both must land correctly after the coordinate change.
   *Done when:* hovering a cue pin opens a correctly placed card, and hovering a
   marker still opens above the track.

7. **Confirm the hover grace still works** (2411-2426). Moving the mouse from a
   marker onto the card must not close it; that is what the 140ms timer and the
   card's own `mouseenter` are for. A repositioned card that moves out from under
   the cursor will break this.
   *Done when:* you can move onto a card and click a row inside it.

## Verification

On a scanned replay with dense clusters:

1. Hover the largest cluster. Every row is visible. Count them against the
   marker's own count.
2. Nothing is cut off at the top edge - the specific symptom in the issue.
3. The transport card's rounded corners and section hairlines look exactly as
   they did before. Compare against a screenshot taken first.
4. Hover the leftmost cluster on the track: the card stays fully on screen.
5. Hover the rightmost cluster: same.
6. Hover a cue pin: card opens, correctly placed, rows clickable.
7. Move the mouse from a marker onto the card and click a row. It seeks.
8. Sweep along the gutter (brief 014's behaviour). Cards follow, no flicker, no
   dead zones.
9. Resize the window narrow and wide with a card open. It stays on screen.
10. Scroll the page with a card open. It either follows its anchor or closes - not
    stranded mid-page.
11. Shift+click a row: places a cue, playback does not move.
12. A card open while the 1Hz feed merges a new event closes cleanly rather than
    stranding (2193 hides it on re-render - that behaviour is unchanged).

## Can't Skip

- **`overflow: hidden` on `.transport.card` stays.** It is load-bearing for the
  card's shape.
- **Nothing floats over the scrub track.** Standing rule from briefs 007, 013 and
  014.
- **Both callers work.** Markers and cue pins share one positioning function and
  anchor on opposite sides of the track.
- **The 140ms hide grace and the card's own hover survive.** Without them the
  card is unclickable, and the rows are the only way to reach an individual event
  inside a cluster.
- **Take a before screenshot of the transport card.** This brief touches
  positioning on a panel that has had three layout passes; "looks the same" needs
  something to be the same as.

## Traps

- **`position: fixed` is only exempt from ancestor clipping while no ancestor
  establishes a containing block.** `.marker.hot` uses `transform` (530-538) but
  is not an ancestor. Check the real chain, in the browser, at step 1 - a
  `will-change` added later by anyone would silently reintroduce the clip.
- **`openHoverCard()` measures the card *after* filling it** (2401) - it needs
  layout to know its own width. Keep that order; measuring before
  `replaceChildren` gives you the previous card's width.
- **`.hover-card` is `display: none` until `.visible`** (564, 575). A
  `getBoundingClientRect()` on a `display: none` element returns zeros. The
  existing code adds `.visible` before measuring (2398 before 2401) for exactly
  this reason - do not reorder it.
- **The horizontal clamp's `Math.max(half + 2, ...)`** (2403) exists for the case
  where the card is wider than its container. In viewport coordinates that case
  changes shape - re-derive it rather than translating the expression literally.
- **Cue pins sit below the track and markers above**, so a shared function that
  assumes "grows upward" will place one of them wrong. The current
  `translate(-50%, -100%)` is in the CSS, not the JS - check whether the cue-pin
  caller relies on it.
- **`renderMarkers()` calls `hideHoverCard()` first** (2193). Brief 014 flagged
  this as a pre-existing annoyance and explicitly said not to fix it by removing
  the call. Still true.
- **The Browser pane in this environment may not composite** (brief 014's
  Outcome). Screenshots can time out and `getBoundingClientRect()` can report a
  ~2px track. A `resize_window` call forces a real layout. Measure, but know that
  a clipping bug is genuinely a *visual* one - if you cannot see pixels, say so
  rather than declaring it fixed from numbers.

## Out Of Scope

The card's contents, its rows, its colours, marker shape and colour (brief 019),
the legend, and anything about which events exist (briefs 016, 017, #7). This
brief moves a box; it does not redesign one.

## Escalate Instead Of Deciding

- **If an ancestor does establish a containing block** and the card has to move
  to `document.body`, that changes event delegation and teardown - say so before
  building it. It is still the right fix, but it is a bigger one than this brief
  is written for.
- **If the fix needs the card to flip below the track** in some case you find,
  stop. Three briefs have kept that rule and breaking it is a project-level call.
