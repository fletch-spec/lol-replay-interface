# UI Plan: Timeline Fidelity + Narration Clarity

Not a brief. Standalone polish pass on `app/public/index.html`, sitting between
brief 004 (event timeline, shipped) and brief 005 (cue points + A/B loop, ready).
Written 2026-08-05.

**Status.** Phases 1 and 2 shipped 2026-08-05, verified against a live replay
(2195s, 135 events). Phases 3 and 4 not started. Deviations from the plan as
written are recorded under "What changed during phase 1–2".

**Goal.** Make picking a specific event off the scrub track fast, precise and
readable at a glance, and tighten the rest of the panel for live narration where
your eyes are on monitor 1, not here.

**Non-goals.** No new API surface, no server changes, no build step, no cue/loop
features (that's 005), no camera/HUD work (006). Everything stays single-file
vanilla JS.

---

## Decisions taken

- **Layout: widen to two columns.** Panel goes `max-width: 720px` →
  `min(1140px, 100%)` on wide viewports: transport + roster left, persistent
  event rail right. Below ~1000px it collapses back to today's single column
  with the floating dropdown, so the existing narrow layout is preserved rather
  than replaced. This reverses the brief-004 note that an in-flow event column
  was cramped - it was cramped *at 720px*, which is the thing being fixed.
- **Marker gutter stays above the track, cue pins go below it.** Brief 005 must
  put cues somewhere that can't be confused with events; reserving the
  below-track strip now means 005 doesn't have to redesign this.
- **Keys `,` and `.` for prev/next event.** 005's suggested keymap claims
  `M N B L [ ] Esc` - those stay untouched. Nothing in this plan binds a
  modifier+click either, since 005 wants modifier+click on a marker to place a
  cue.

---

## Problems being fixed

| # | Problem | Where |
|---|---|---|
| 1 | Markers are 3px wide with a 3px hit target - genuinely hard to click | `.marker` |
| 2 | 5px clustering swallows events; clicking a cluster silently seeks to only the *first* one, the rest are unreachable | `renderMarkers()` |
| 3 | Tooltips are native `title` - ~1s delay, OS-styled, multi-line text blob for clusters | `marker.title = …` |
| 4 | Category colors read as team colors on a LoL panel (blue marker = tower, red = kill), and kills carry no team attribution at all | `.marker.kill/.tower` |
| 5 | No sense of *where you are* in the event stream - nothing marks the event you just passed or the one coming up | - |
| 6 | Hovering the track gives no time preview; you click blind | `scrubTrack` mousedown |
| 7 | 36 minutes across ~450px ≈ 1.3s/px, so teamfights collapse into one smear | track width |
| 8 | Two speed buttons look active at once (`.primary` border on 0.5×, `.active` fill on 4×) | `.speed-btn.primary` |
| 9 | "Paused: No" tile duplicates the pause button and eats vertical space the timeline wants | `.info-grid` |

---

## Phase 1 - Timeline structure

**Compact the header.** Replace the two `.info-grid` tiles with one status strip:
`● Connected · CLASSIC · 1.0× · ▶ Playing`. Frees ~90px of vertical space, which
goes to the track.

**Track gets taller and gains orientation.** Track `44px → 56px`. Add minute tick
marks rendered into a `.scrub-ticks` layer - hairlines every minute, taller +
labelled every 5 minutes (`5:00`, `10:00`, …). Right now `18:42 / 36:35` is the
only spatial reference on the whole bar.

**Markers move into lanes.** The 28px gutter above the track (already reserved)
splits into three lanes so events that collide in *time* no longer collide in
*pixels*:

```
lane 0 (top)     kills, multikills, first blood, aces
lane 1 (mid)     dragon / baron / herald
lane 2 (bottom)  turrets, inhibs, first brick
```

Clustering then runs **per lane** rather than globally, which alone unsmears most
fights - a kill and a turret at the same second currently merge into one
ambiguous cluster marker.

**Hit targets.** Marker stays visually 4px (7px clustered) but gets a
`::before` overlay of `width: 16px` centred on it, so the clickable area is 16px
regardless of the drawn width. Hover raises the marker 2px and brightens it.

**Team tint.** Kill markers get a 3px cap at the top in the killer's team colour
(blue `#4d8dff` / red `#e0576b`), resolved by matching `KillerName` against the
roster's `riotIdGameName`. Category still drives the body colour, so the existing
legend keeps meaning. Add a small legend row under the track - four dots with
labels - because the current colour code is undiscoverable.

**Passed vs upcoming.** Events behind the playhead render at full opacity;
upcoming ones at 65%. Cheap, and it makes the playhead's position legible even
peripherally.

## Phase 2 - Hover and selection fidelity

**Custom hover card** replaces `title` entirely. Dark card, instant, positioned
above the marker and clamped inside the track:

- Time, category dot, description
- For kills: champion portraits for killer and victim, pulled from the existing
  `/portraits/<Champion>.png` route. Events only give summoner names, but the
  roster message already carries `riotIdGameName → championName`, so build a
  lookup on every roster tick. Portraits are the single biggest readability win
  here - you recognise a Rengar icon far faster than you read a summoner name.
- **Clusters expand into a clickable list** inside the card, one row per event,
  each seeking to its own timestamp. This is the fix for problem 2 - no event is
  unreachable any more.

**Ghost playhead + magnetic snap.** Hovering anywhere on the track draws a dashed
ghost line plus a time bubble. If the cursor is within 10px of a marker, the
ghost snaps to that event's exact time and the marker lights up - so clicking a
fight is forgiving instead of pixel-hunting. Hold `Alt` to suppress snapping for
precise scrubbing. Snap applies to click and drag-release, not just the preview.

**Active event.** Track the last event at or before the playhead. Its marker gets
a ring + glow; its row in the list highlights. The time readout gains a third
element: `next: Baron in 0:14`. That one line is the most useful thing on the
panel for pacing narration.

**Playhead bubble.** Current time rides on the handle as a small bubble rather
than only sitting in the corner readout, so time-under-cursor and time-now are
readable in the same glance.

## Phase 3 - Event rail

At ≥1000px the panel becomes a two-column grid; the events list becomes a
permanent right rail (`.events-rail`, ~320px, own scroll) instead of a dropdown.
Below 1000px, the existing dropdown behaviour and markup stay exactly as they are
now - one CSS branch, no second implementation.

- **Filter chips** - Kills / Objectives / Structures / Aces, toggled, and they
  filter the **markers too**. Narrating a lane-swap? Kills only, and the bar
  stops shouting about turrets.
- **Auto-scroll** the active row into view (`scrollIntoView({block:'nearest'})`),
  suppressed for 3s after any manual scroll of the rail so it can't fight you.
- **Bidirectional highlight** - hovering a row lights its marker; hovering a
  marker lights its row.
- Rows get the same portrait treatment as the hover card, plus a team-tinted left
  edge. Row height stays ~28px so ~11 events are visible at once.

## Phase 4 - Real-time workflow polish

- **Seek feedback.** Seeks lag 100–200ms and the UI currently just shows the
  optimistic target with no indication it's in flight. Add a subtle pulsing ring
  on the handle while `seekRunning`, cleared on settle. Honest state costs
  nothing and stops the double-click-because-nothing-happened reflex.
- **Speed buttons.** Drop `.primary`'s border treatment (problem 8) - only the
  actually-active speed should look active. Mark the recommended narration speed with a
  small dot under the label instead.
- **Roster team accents.** 3px left edge in team colour on each card, and a
  stronger locked state (accent ring + a small "LOCKED" tag) - the current
  `rgba(55,214,122,0.12)` tint is easy to miss at a glance.
- **Focus affordance.** The panel loses keyboard focus constantly (documented in
  the project notes). Show a dim "keys inactive - click panel" chip when
  `document.hasFocus()` is false, so a dead spacebar explains itself.
- **Reduced motion.** Wrap the new transitions in
  `@media (prefers-reduced-motion: reduce)` no-ops.
- **Hotkey hint line** updates to include `,` `.` for event stepping.

---

## What changed during phase 1–2

Four things the plan got wrong or didn't anticipate, found by testing:

- **Markers were being measured at the wrong width, and never re-measured.**
  Clustering is computed in pixels, so markers are only correct for the width
  they were built at. Loaded in a hidden/background tab the panel lays out at
  ~2px wide, and all 135 events collapsed into *two* clusters - reproduced live.
  The old `window.resize` listener never fires for that, and a `ResizeObserver`
  alone isn't enough either: its callbacks are delivered on the rendering loop,
  which browsers suspend for hidden tabs. Fix is a `ResizeObserver` on the track
  (instant while visible) plus a 1s width poll as the backstop. This bug was
  latent in brief 004 too - it just showed up as "markers look a bit off".
- **Snap radius dropped from 10px to 8px.** A kill-heavy game packs 30 clusters
  across ~470px, so a 10px magnet covered most of the bar and fought precise
  scrubbing. 8px matches the marker's own hit target: over a marker you get the
  event, otherwise you get the raw position.
- **Turret and inhib labels were raw IDs** (`Turret - Turret_TChaos_L2_P3_…`),
  which the new next-event readout put front and centre. Now `Turret (red) -
  Fiora`: only the team segment of the structure ID is read, since the L/P
  numbers have no documented lane mapping and guessing would print confident
  nonsense. Ace labels gained the acing team the same way.
- **The handle's time bubble overhangs the track at 0% and 100%**, spilling over
  the events column. Pinned to the handle's edge at the extremes.

Also worth knowing: this replay's event feed contains **no dragon, baron or
herald events at all** - 99 `ChampionKill`, 16 `TurretKilled`, 13 `Multikill`,
4 `Ace`, 1 each of `FirstBlood`/`FirstBrick`/`InhibKilled`. So the objective
lane renders empty. No unrecognised event names were logged, so this is what
the client's feed actually contains, not a categorisation gap - but it's worth
checking against a second replay before trusting it.

## Implementation constraints

- **`renderTransport()` runs ~10×/sec.** Nothing added to it may touch layout or
  rebuild DOM. Active-event tracking must be an index lookup plus two
  `classList.toggle` calls against cached node references - not a re-render.
- **Cache the track width.** `renderMarkers()` currently calls
  `getBoundingClientRect()` per rebuild; with ticks and lanes added, read width
  once into a module variable, refresh on `resize` only.
- **Keep marker nodes stable.** Rebuild markers only on `mergeEvents` change or
  resize (as today). Filter chips should toggle a class, not re-render.
- **Portrait lookup is best-effort.** `KillerName` for a turret kill can be a
  minion or empty; fall back to the existing dot when no champion resolves.
  Never let a missing portrait break a row.
- Palette additions: `--blue: #4d8dff` (reuse accent), `--red: #e0576b`,
  `--kill: #e05c5c`, `--obj: #e0b23c`, `--struct: #7f8ea3`. Note structures move
  **off** blue so blue can mean "blue team" consistently.

## Test checklist (live replay, helper on :3000)

A replay is loaded right now (`length` 2195s), so all of this is verifiable
immediately. Another app on this machine also drives the same client - pause it
before trusting transport observations.

1. Hover a dense fight: card appears instantly, lists every event in the cluster,
   each row seeks to its own time.
2. Click 10px off a marker - snap lands on the event, not 13 seconds early.
   Hold Alt - snap is off.
3. Playhead crossing an event flips the active ring and the rail auto-scrolls.
4. `,` / `.` step backward/forward through events and hold the same paused state.
5. Filter to Kills only - markers and rail agree, counts update.
6. Resize below 1000px - rail collapses to the dropdown, nothing overlaps.
7. Watch a 4× playthrough for 60s with DevTools performance open - no layout
   thrash from the 10Hz render loop.
8. Disconnect the helper - everything clears, no stale markers or hover card.

## Risks

- **Widening the panel** changes the monitor-2 footprint. Mitigated by the
  breakpoint: the 720px experience is preserved verbatim, not replaced.
- **Lane assignment vs brief 005.** Cues occupy the below-track strip; if 005
  later wants lanes too, the gutter is already a container so adding a fourth
  strip is layout-only.
- **Portrait mapping is heuristic** (summoner-name string match). It degrades to
  the current dot rather than failing.
- This touches the same `renderMarkers` / scrub interaction code brief 005 builds
  on. Best to land it *before* 005, not after - doing it after means editing cue
  code that hasn't been written yet.

## Suggested order

Phases are independently shippable and testable. 1 → 2 delivers most of the
requested value; 3 and 4 are additive.
