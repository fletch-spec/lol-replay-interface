---
id: brief-024
state: complete
created: 2026-08-08
updated: 2026-08-08
agent: user
project: LOL-REPLAY-CONTROLLER
depends_on: []
executes_after: brief-023
model: sonnet
---

# Brief 024: The Seek Buttons Flank Pause, And The Row Stops Colliding

Closes [#27](https://github.com/fletch-spec/lol-replay-interface/issues/27),
[#26](https://github.com/fletch-spec/lol-replay-interface/issues/26).

> Line numbers in this brief are from commit `91796a5`. If they don't match,
> grep for the symbol name - the names are stable, the lines are not.

## Problem Statement

`« 5s` and `5s »` both sit to the left of `Pause` (`:1301-1304`, wired at
`:3708`). Brief 015 put them there on purpose - `seekFwd` used to live with the
event steppers on the far side of pause and speed, which split the pair - and
that was the right fix for the wrong problem. Grouped on one side, the buttons no
longer point the way they scrub: two arrows, both left of the thing they move
around, and you read the glyph rather than the position to know which is which.
Mid-take that is a beat of thinking you should not have to spend.

Separately, #26 reports `4×` and `‹ Event` rendering on top of each other, and
that resizing the window does not clear it.

**#26 did not reproduce during triage, and that is recorded here rather than
assumed away.** Measured against the live panel (no replay loaded) in a headless
Chromium, panel widths 820px → 1400px in 20px steps: zero overlapping button
pairs at every width. At the full 1400px, `4×` ends at x=800.6 and `‹ Event`
starts at x=821.6 - a 21px gap. Below ~1080px the row wraps `#eventCmds` onto a
second line instead of colliding. So either the reporting conditions differ
(window width, browser zoom, OS display scaling) or the trigger is something the
measurement did not cover.

What is true either way: this row is built to fail badly under pressure.
`.transport-controls` (`:1188`) is `flex-wrap: wrap` with an 8px gap; the five
speed buttons are `flex: 0 0 76px` each (`:1223`), a rigid 412px block that
cannot shrink; and `#eventCmds` carries three buttons of its own -
`‹ Event`, `Event ›`, `Scan replay` (`:3709-3713`) - with no wrapping rules and
labels that can break across lines inside a button. Both issues are the same row
and neither can be fixed without moving the other's elements, which is why they
are one brief.

## Done Looks Like

`« 5s` sits immediately left of `Pause` and `5s »` immediately right of it, with
no gap between the three, Pause still visibly taller and primary. A width sweep
from 820px to 1500px produces zero overlapping button pairs and no button whose
label wraps. Fletcher can no longer produce the collision - or, if he still can,
this brief has recorded the exact conditions under which he does.

## Decision (already made - do not re-litigate)

**The three transport buttons become one unit: `« 5s | Pause | 5s »`, zero gap,
shared outer radius.** The seek buttons keep their `cmd-btn` treatment and their
`←` / `→` hotkey chips; Pause keeps its height and its accent fill. Inner corners
square off so the three read as one control, outer corners keep the radius. The
height difference is what marks Pause as primary and it stays.

**Both seek buttons are still built by `commandButton()`.** They are commands
with hotkeys and the whole point of `.cmd-btn` is that clicking and typing are
visibly the same action. Splitting `#transportCmds` into two single-button groups
around Pause is the shape - not hand-writing two `<button>`s.

**The row is hardened rather than redesigned.** Every direct child of
`.transport-controls` gets `flex: 0 0 auto` so nothing shrinks below its content,
and `.cmd-btn` gets `white-space: nowrap` so a label can never break inside a
button. This makes overflow resolve as a wrap, which is a layout that still
works, instead of as a shrink, which is the only mechanism in this row that can
produce overlap.

**The acceptance test is a measurement sweep, not a look.** #26's report and the
triage measurement disagree; a screenshot from one width cannot settle that. The
sweep script in step 1 is part of the deliverable and is run again in
verification.

### Rejected before starting

- **Putting the speed presets behind a dropdown to free up space.** They are
  one-press live controls during a take. Brief 015 already measured what happens
  when they get flexible - "five giant slabs" - and made them fixed for a reason.
- **Making `.speed-btn` shrinkable.** That would let the 412px block compress and
  is a way to *cause* the reported overlap, not cure it.
- **Removing `Scan replay` from the row to make space.** It is a real command and
  brief 026 is about to make it a long-running one with a progress state; moving
  it is that brief's problem if it becomes one.
- **`position: absolute` anywhere in this row.** Overlap is the reported symptom;
  taking elements out of flow is how you guarantee it.
- **Reverting brief 015's grouping wholesale.** Its finding still holds - the two
  seek buttons must stay adjacent to the pause control, not exiled to the event
  steppers. Flanking satisfies both.

## Where The Code Is

| What | File | Symbol | Line |
|---|---|---|---|
| Transport row markup | `app/public/index.html` | `.transport-controls` | 1300-1315 |
| Row layout rule | `app/public/index.html` | `.transport-controls` | 1188 |
| Seek button group | `app/public/index.html` | `#transportCmds` | 1302 |
| Group wiring | `app/public/index.html` | `document.getElementById('transportCmds').append(...)` | 3708 |
| Event group wiring | `app/public/index.html` | `#eventCmds` append | 3709-3713 |
| Pause button | `app/public/index.html` | `.pause-btn` / `#pauseBtn` | 1211 / 1304 |
| Command button factory | `app/public/index.html` | `commandButton()` | 3526 |
| Command button style | `app/public/index.html` | `.cmd-btn` / `.cmd-group` | 804 / 799 |
| Hotkey chip | `app/public/index.html` | `.cmd-key` | 813 |
| Speed presets | `app/public/index.html` | `.speed-presets` / `.speed-btn` | 1219 / 1223 |
| Hairline separators | `app/public/index.html` | `.control-sep` | 143 |
| Base button style | `app/public/index.html` | `button` | 1195 |
| Command definitions | `app/public/index.html` | `COMMANDS.seekBack` / `.seekFwd` | 3446-3447 |
| Enabled/disabled sweep | `app/public/index.html` | `refreshCommands()` | 3552 |

## Implementation Steps

1. **Write the sweep, and run it before changing anything.** A script that, for
   panel widths 820→1500 in 20px steps, collects every `button` rect inside
   `.transport-controls` and reports (a) any pair on the same line whose x-ranges
   intersect, (b) any button whose rendered height exceeds a single line of text,
   (c) how many lines the row occupies. Run it against the current build and keep
   the output.
   *Done when:* you have a before-baseline, and it agrees with triage: zero
   overlaps, wrap below ~1080px.

2. **Reorder the buttons.** `« 5s` before `#pauseBtn`, `5s »` after it. Keep
   `commandButton('seekBack')` and `commandButton('seekFwd')` as the source -
   append them into two containers either side of Pause rather than one.
   *Done when:* the order on screen is `« 5s` `Pause` `5s »`, and both still fire
   from their buttons and from `←` / `→`.

3. **Close the gap.** Wrap the three in one element with `gap: 0`, square the
   inner corners of the seek buttons and of Pause, keep the outer radius. Remove
   the `.control-sep` that used to separate the seek group from Pause - the shared
   border is the separation now.
   *Done when:* the three rects are edge-to-edge (gaps < 1px) and Pause is still
   visibly taller.

4. **Harden the row.** `flex: 0 0 auto` on the direct children of
   `.transport-controls`; `white-space: nowrap` on `.cmd-btn`.
   *Done when:* the sweep reports no wrapped labels at any width.

5. **Re-run the sweep.** Same script, new build.
   *Done when:* zero overlapping pairs at every width from 820 to 1500, and the
   row's wrap points are recorded.

6. **Try to reproduce #26 deliberately.** At browser zoom 80%, 100%, 125% and
   150%, and at 1280 / 1440 / 1920 widths, look at the boundary between `4×` and
   the event steppers. Screenshot anything that collides.
   *Done when:* either you have reproduced it and named the mechanism, or you can
   state the matrix you tried and that none of it collided.

## Verification

Against the live panel:

1. `« 5s` `Pause` `5s »` in that order, edge to edge, Pause taller.
2. Clicking `« 5s` moves the playhead back 5s; `5s »` forward 5s. Confirm against
   the time readout, not the button.
3. `←` and `→` still do the same thing, and the hotkey chips still show on both
   buttons.
4. With no replay loaded, all three are disabled and dimmed together - `.disabled`
   on `.transport` (`:1488`) still covers the new wrapper.
5. Pause toggles to `Play` and back, and the unit does not change width when it
   does. (`Play` is narrower than `Pause`; `.pause-btn` is `flex: 0 0 120px` so it
   should not, but check.)
6. The sweep from step 1 reports zero overlapping pairs, 820→1500px.
7. **Negative case:** the speed presets are unchanged - five buttons, 76px each,
   `0.5×` still carries its recommended-speed dot, the active one still fills.
8. **Negative case:** `‹ Event`, `Event ›` and `Scan replay` still sit together
   and still enable/disable with `sortedEvents.length` and `identityKnown()`.
9. **Negative case:** the hint line under the scrub bar still reads
   `shift+←/→ = ±1s`, and shift+arrow still does ±1s rather than ±5s.

## Can't Skip

- **Run the sweep before and after.** #26 is a report this session could not
  reproduce; a before/after measurement is the only honest way to claim it is
  fixed, and it is also the only way to find out it was never the mechanism.
- **The seek buttons stay `commandButton()`-built.** Hand-rolled buttons would
  drop out of `commandButtons` and stop being disabled by `refreshCommands()`.
- **Keep the height difference.** #27 asks for it explicitly: no gap, but Pause
  still reads as primary.
- **Do not make `.speed-btn` shrinkable.**

## Traps

- **`.cmd-btn` is used in four groups** - transport, events, cues, loop (`:3708`
  to `:3724`). `white-space: nowrap` is safe everywhere, but any radius or margin
  change on `.cmd-btn` restyles the loop row and the cues row too. Scope the
  edge-to-edge treatment to the new wrapper's children.
- **`.transport > *` sets padding and a top border on every direct child of the
  transport card** (`:395-399`). A new wrapper added at the wrong depth inherits a
  hairline it should not have.
- **`refreshCommands()` iterates `commandButtons`**, a map populated by
  `commandButton()` at creation (`:3548`). Calling `commandButton('seekBack')`
  twice would overwrite the map entry and leave an orphan button that never
  disables.
- **`button:active { transform: translateY(1px) }`** (`:1205`) will make one
  segment of the joined unit visibly slide against its neighbours on press. Check
  it and decide deliberately; it may want scoping.
- **The row is inside `.transport.card { overflow: hidden }`** (`:390-394`).
  Anything that overflows this row is clipped rather than scrolled, so an overflow
  bug here presents as a missing button, not a scrollbar - which is also a reason
  #26 may look different on Fletcher's machine than in a measurement.
- **Zoom is not width.** Browser zoom changes CSS pixel density, not the number of
  CSS pixels available, so a sweep over widths does not cover it. That is why step
  6 exists separately.

## Out Of Scope

The speed presets' values and layout. The event steppers' position - moving
`Scan replay` out of `#eventCmds` belongs to brief 026 if that brief needs it. The
scrub bar, markers, and everything below the controls row. Keyboard shortcuts and
their bindings.

## Escalate Instead Of Deciding

- **If step 6 reproduces the overlap**, stop and report the mechanism before
  fixing it. A fix for the wrong mechanism is how #26 comes back.
- **If step 6 does not reproduce it**, do not close #26 - report the matrix you
  tried and ask Fletcher for his window width, browser zoom and Windows display
  scaling. The issue stays open until it is either reproduced or explained.
- **If the zero-gap unit and the height difference turn out to look wrong
  together**, screenshot both and ask. #27 asked for both in one sentence; if
  they fight, that is Fletcher's call.

## Outcome

#27 shipped as decided; #26 stays open, still unreproduced.

Ran the sweep before touching anything: 820-1500px in 20px steps (measured via
an iframe of the live app resized in a loop, since the Browser pane can't
composite frames for a screenshot - same limitation as every recent brief).
Baseline: zero overlaps at every width, max button height 41px throughout
(no wrapping), 4 lines at 820px narrowing to 2 lines at 1140px. Agrees with
triage's finding well enough to build on.

`#transportCmds` split into `#seekBackGroup` / `#seekFwdGroup` flanking
`#pauseBtn`, still built through `commandButton()` so `refreshCommands()`
keeps disabling them correctly. The joined unit keeps each button's own
border and height (not one shared box) - inner corners squared, `margin-left:
-1px` collapses the doubled border into one seam, `.transport-unit button:
active { transform: none }` turned off so one segment doesn't visibly slide
against its fused neighbours on click (the trap called this out explicitly;
decided to disable it here rather than leave it, since the joined-unit
illusion is the point of the brief). Re-ran the sweep after: zero overlaps
across the same 820-1500px range, and hardening measurably improved the wrap
behaviour - the row never exceeds 3 lines now (was 4 at 820px), and the
3-to-2-line transition moved from ~1140px to ~1100px.

Verified live: order is `« 5s` `Pause` `5s »` left to right; clicking each
seek button and pressing `←`/`→` both move the read-back display time by
~5s in the correct direction; shift+`←` still does ~1s, not 5; `.transport.
disabled` still dims and blocks all three together with no replay connected;
toggling Pause/Play does not change the unit's width (`.pause-btn`'s fixed
120px holds); speed presets, event-stepper group and the hint line are
byte-for-byte unchanged.

**Step 6, run rather than skipped: #26 still does not reproduce.** Approximated
browser zoom with the CSS `zoom` property (Chromium-only, since the harness
has no control over real browser zoom) at 0.8/1.0/1.25/1.5 crossed with
1280/1440/1920px widths - 12 combinations, zero overlapping pairs in any of
them, before or after this brief's changes. Per the brief's own escalation
rule, **#26 is not closed.** What ships regardless is the hardening
(`flex: 0 0 auto` on every direct child, `white-space: nowrap` on `.cmd-btn`),
which measurably tightened the row's wrap behaviour even without reproducing
the reported collision. Asking Fletcher for his window width, browser zoom
level and Windows display scaling is still the open next step on #26 - two
sessions now have failed to reproduce it under a fairly wide matrix, which
is itself evidence worth weighing when he next sees it happen.
