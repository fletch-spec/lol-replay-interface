---
id: brief-022
state: complete
created: 2026-08-08
updated: 2026-08-08
agent: user
project: LOL-REPLAY-CONTROLLER
depends_on: []
executes_after: brief-021
model: sonnet
---

# Brief 022: The Status Bar Stops Being A Card, And Cinematic Owns Setup

Closes [#18](https://github.com/fletch-spec/lol-replay-interface/issues/18),
[#19](https://github.com/fletch-spec/lol-replay-interface/issues/19),
[#20](https://github.com/fletch-spec/lol-replay-interface/issues/20).

> Line numbers in this brief are from commit `91796a5`. If they don't match,
> grep for the symbol name - the names are stable, the lines are not.

## Problem Statement

Three separate complaints landed on the same 65px row, which is why they are one
brief. The status bar wears `.card` (`:1257`) exactly like the roster, the
transport and the cues card, so the panel reads as four identical bordered boxes
stacked vertically - but this row is not content, it is status plus the four
controls you touch during a take. The card adds a border and a fill without
adding a meaning, and the repetition is the thing being complained about.

Inside that row, `Cinematic` and `Setup` sit as two equal buttons with equal
weight (`:1276-1277`), so they read as two unrelated features. They are not, and
the code comment at `:94-96` already says so: Setup is the door to the seventeen
HUD chips that Cinematic drives. Anyone reading the row has to learn that
relationship somewhere other than the screen.

And `Reset` (`:1273`) floats between the distance value and `Hide names`, styled
`.setup-toggle` like the two buttons after it, so nothing about its position says
what it resets. Three peer buttons in a row where only two are peers.

## Done Looks Like

The status bar has no card border or fill and every element is in the same place
at the same size it was. `Cinematic` and the setup door are one bordered split
control with a visible hairline between the halves. `Reset` sits underneath the
`DISTANCE` label, and the label + Reset + slider + value read as one group. The
row is shorter than it was, and nothing that used to disable itself with no
replay loaded has stopped doing so.

## Decision (already made - do not re-litigate)

**Remove the `card` class from the status bar element. Do not touch the `.card`
rule.** `.card` is shared by `.scene-setup` (`:1283`), `.roster` (`:1290`),
`.transport` (`:1300`) and `.cues-card` (`:1370`), all of which are content
blocks and all of which keep it. Compensate for the lost padding on `.statusbar`
itself so nothing below it shifts.

**Cinematic and Setup become one split control: `Cinematic | ⌄`.** One border
around both halves, a 1px divider between them, the left half toggling cinematic
mode and the right half opening the setup panel. Both buttons keep their existing
ids (`cinematicBtn`, `setupToggle`) and their existing click handlers - this is a
markup and CSS change, not a behaviour change.

**Reset moves under the `DISTANCE` label**, as a two-row column to the left of
the slider.

### Rejected before starting

- **Flattening every card.** Brief 015 built the card stack deliberately and it
  works for the roster, transport and cues - those are content. Only the status
  bar is being demoted, because only the status bar is chrome.
- **Making Cinematic a dropdown menu item.** Cinematic is the one button pressed
  mid-take (`:94-96`); putting it behind a click to open a menu costs the take.
  The split control keeps it one press.
- **Renaming Setup to "Cinematic setup" and leaving two buttons.** That fixes the
  label and not the layout - they still read as two peers, which is the report.
- **Moving Reset into the Setup panel.** The comment at `:150-151` states why the
  distance control lives in the status bar: it is adjusted while watching. Reset
  is part of that control, not configuration.
- **Putting Reset under the numeric value instead.** The value (`:1272`) is
  monospace with a 38px min-width and changes width as the number changes; the
  `DISTANCE` label is fixed text and is the anchor the eye already uses.

## Where The Code Is

| What | File | Symbol | Line |
|---|---|---|---|
| Status bar element | `app/public/index.html` | `.statusbar card` | 1257 |
| Card rule (shared - leave alone) | `app/public/index.html` | `.card` | 323 |
| Status bar rule | `app/public/index.html` | `.statusbar` | 330 |
| Panel gap between blocks | `app/public/index.html` | `.panel` | 306 |
| Scene controls wrapper | `app/public/index.html` | `.scene-controls` / `#scene` | 72 / 1267 |
| Distance label + slider + value + Reset | `app/public/index.html` | `.camera-bar-label` … `#zoomResetBtn` | 1268-1273 |
| Cinematic + Setup buttons | `app/public/index.html` | `#cinematicBtn` / `#setupToggle` | 1276-1277 |
| Cinematic button styles | `app/public/index.html` | `.cinematic-btn` | 83 |
| Shared small-button style (3 buttons) | `app/public/index.html` | `.setup-toggle` | 97 |
| Hairline separator | `app/public/index.html` | `.control-sep` | 143 |
| Cinematic toggle + label swap | `app/public/index.html` | `toggleCinematic()` | 2021-2049 |
| Setup panel open/close | `app/public/index.html` | `setupToggleEl` listener | 2051-2055 |
| Reset handler | `app/public/index.html` | `zoomResetBtnEl` listener | 1822 |
| Disable-on-no-replay | `app/public/index.html` | `setState()` → `sceneEl` | 1484-1491 |

## Implementation Steps

1. **Measure the row before touching it.** With the helper running, record
   `document.querySelector('.statusbar').getBoundingClientRect()` and the rect of
   every direct child. This is the baseline the "layout is maintained" claim gets
   checked against.
   *Done when:* you have the numbers written down.

2. **Drop the card.** Remove `card` from the status bar's class list and give
   `.statusbar` whatever padding it needs so the elements inside it stay where
   they were relative to the panel. The panel's `--space-3` gap between blocks
   (`:318`) still applies.
   *Done when:* no border and no `#0f1216` fill on the status bar, and every
   child's rect is within a few px of the baseline horizontally.

3. **Build the split control.** Wrap `#cinematicBtn` and `#setupToggle` in one
   element with a shared border and radius, square off the inner corners of both
   halves, and put a 1px divider between them. The setup half loses the word
   "Setup" for a caret. Give it a `title` so the affordance is discoverable.
   *Done when:* one control, one border, a visible divider, both halves still
   clickable and still doing what they did.

4. **Stop the split control resizing when Cinematic is on.** `toggleCinematic()`
   swaps the label to `Restore HUD` (`:2046`), which is wider than `Cinematic`.
   Give the left half a `min-width` sized to the longer label so the row does not
   reflow mid-take.
   *Done when:* toggling cinematic mode changes zero other element positions.

5. **Restack Reset under DISTANCE.** Make the label and Reset a two-row column
   before the slider. Reset keeps its `title` and its handler.
   *Done when:* Reset is below the DISTANCE label, and the slider and value are
   unchanged.

6. **Re-measure.** Same numbers as step 1.
   *Done when:* the row is no taller than the baseline, and no element moved
   except the ones this brief moved on purpose.

## Verification

Against the live panel, with the helper running:

1. Status bar shows no card border or fill. The roster, transport, setup panel
   and cues cards all still show theirs.
2. The vertical rhythm is unchanged: the gap between the status bar and the block
   below it still measures `--space-3` (12px).
3. Click the left half of the split control: cinematic mode toggles, the label
   becomes `Restore HUD`, and nothing else in the row moves by more than 1px.
   Click it again: back to `Cinematic`.
4. Click the right half: the setup panel opens, the half gets its open state,
   the HUD chips are all there. Click again: closes.
5. Reset sits under DISTANCE. Drag the slider, click Reset, confirm the distance
   returns to ~2052 and the camera reframes - read `/replay/render` back, do not
   trust the slider position (PASSOFF fact 1).
6. **Negative case:** with no replay loaded, `#scene` still carries `.disabled`
   and the split control is unclickable and dimmed, exactly as before. This is
   the failure this change is most likely to cause.
7. **Negative case:** `Hide names` still works and still looks like a peer of
   nothing - it is the only remaining `.setup-toggle` in the row.
8. Resize the window from 900px to 1500px. The status bar wraps the same way it
   did before, and the split control never breaks across two lines.

## Can't Skip

- **The split control stays inside `<span id="scene">`.** `setState()` (`:1490`)
  toggles `.disabled` on that span, and it is the only thing stopping camera and
  HUD writes with no replay loaded. Moving the buttons out silently re-enables
  them.
- **Don't edit the `.card` rule.** Four other blocks use it.
- **Both halves keep their ids and their existing listeners.** `toggleCinematic()`
  reads and writes `cinematicBtnEl.textContent` and `.active`; the setup listener
  reads `setupPanelEl.hidden`.
- **Measure before and after.** "Maintain the layout" is the actual requirement
  in #18, and it is checkable.

## Traps

- **`.setup-toggle` styles three different buttons** - `#zoomResetBtn` (`:1273`),
  `#namesToggle` (`:1274`) and `#setupToggle` (`:1277`). Restyling that class to
  make the split control look right silently restyles Reset and Hide names. Give
  the split control its own class.
- **`.setup-toggle.open` (`:102`) is also used by `namesToggle`** (`:1872`), not
  just the setup panel. Same hazard.
- **`toggleCinematic()` sets `textContent` on `cinematicBtnEl` directly**
  (`:2046`). If the split control's left half becomes a wrapper with a child
  span, `textContent` replaces the child and the button loses its structure.
  Either keep the label on the button itself or update the handler in the same
  step.
- **The status bar is `flex-wrap: wrap`** (`:334`). Removing the card changes the
  available width by the card's horizontal padding (32px), which is enough to
  change where the row wraps at narrow widths. Check step 8 before calling this
  done.
- **`.scene-controls` has `margin-left: auto`** (`:76`), which is what pushes the
  whole scene group to the right edge. A new wrapper around the distance column
  can eat that behaviour if it lands in the wrong place.

## Out Of Scope

The chips row - the game-mode chip and the lying `Playing` chip belong to brief
023, which runs immediately after this one and edits the same status bar. Do not
touch `#gameMode`, `#paused` or `#speedChip` here; leaving them alone is what
keeps the two briefs from inheriting each other's layout. The HUD toggle grid
itself, the seventeen chips and `CINEMATIC_HIDE` are untouched - this brief moves
the door, not the room.

## Escalate Instead Of Deciding

- **If dropping the card makes the status bar visually detach from the panel**
  to the point it looks like a floating strip, stop and show a screenshot. The
  requirement is "remove the card, maintain the layout"; if those turn out to
  conflict, that is Fletcher's call, not a design you should invent.
- **If the split control cannot be built without a wrapper that breaks
  `sceneEl`'s disabled state**, stop. That state is the guard on every camera and
  HUD write.

## Outcome

Shipped as decided - card dropped, split control built, Reset restacked under
DISTANCE. Two things the brief didn't anticipate:

- **The two-row Distance/Reset column is taller than a single button, and
  step 6's "no taller than baseline" gate is real** - the first pass measured
  62px against a baseline of 52px (measured by diffing against the pre-brief
  file served statelessly, since there was no "before" measurement on record -
  add that to why step 1 exists). Fixed by tightening the column itself
  (`gap: 2px`, `line-height: 1` on the label, `padding: 1px 7px` + `font-size:
  10px` on Reset only, scoped via `.camera-bar-group .setup-toggle` so the
  shared `.setup-toggle` rule is untouched) rather than touching the row's
  padding. Final: 52px, matching baseline exactly.
- **`min-width: 84px` on `.cinematic-btn` was not enough** - "Restore HUD"'s
  natural content width is ~92px, and `min-width` is a floor, not a ceiling,
  so the button grew past it and shifted `namesToggle` and the split control
  8px left on toggle. Raised to `96px`; toggling now moves zero other elements
  in either direction, confirmed by DOM rect comparison before/after/restored.

Verified by DOM measurement and rect comparison against a stateless copy of
the pre-brief file served from the same helper (the Browser pane still can't
composite frames for a screenshot - same limitation brief 018/019 hit).
Cinematic toggle, Setup caret, Hide names, the disabled-state guard (`#scene`
still contains both new wrapper elements) and the 900-1500px resize range all
checked live. Reset's handler and slider-snap were confirmed unchanged
(fires, snaps to 2100 per the pre-existing step-snap behaviour); actually
watching the camera reframe was not re-verified since no roster item was
camera-locked in the live session - that path is untouched by this brief and
was already covered by brief 007.
