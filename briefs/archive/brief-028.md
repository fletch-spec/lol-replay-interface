---
id: brief-028
state: complete
created: 2026-08-08
updated: 2026-08-11
agent: user
project: LOL-REPLAY-CONTROLLER
depends_on: []
executes_after: brief-027
model: sonnet
---

# Brief 028: The Setup Caret Points Where It Goes, And Sits In The Middle

Closes [#30](https://github.com/fletch-spec/lol-replay-interface/issues/30).

> Line numbers in this brief's `Where The Code Is` table are from brief 032's
> merge commit, split across `index.html` (markup), `panel.css` and `panel.js`.
> Inline line references in the prose below are unchanged and predate the
> split. If the numbers don't match, grep for the symbol name; the names are
> stable, the lines are not.

## Problem Statement

The right half of the Cinematic split control is a `<button>` whose entire
content is the character `⌄` (U+2304 DOWN ARROWHEAD), hard-coded in the markup at
`:1458`. It never changes. Open the Setup panel and the caret still points down;
close it and it still points down. The one job a disclosure caret has - telling
you which way the thing behind it is about to move - it does not do, and the
`.open` class the handler already sets (`:2252`) is spent entirely on a colour
change.

It also sits low in its half of the control. Both screenshots on #30 show it,
open and closed. The cause is the character: U+2304 is not in the panel's UI font
stack, so it renders from whatever fallback the browser finds, and a fallback
glyph's ink sits wherever that font puts it inside the em box - which is not the
optical centre of a 6px-padded button. This is the same failure mode that cost
most of a session on #32: the `‹` / `›` glyphs on the seek and event buttons fell
back to a font with different line metrics and inflated the transport row to 66px
in Firefox against ~45px in Chromium, and the fix was to take the font's say
away (`line-height: 1` on the base `button` rule, `:1345-1356`). `line-height: 1`
fixed the row height; it does not centre a glyph whose ink is off-centre inside
its own box.

Small, but it is in the status bar - the strip you glance at rather than read
during a take - and it is currently the panel's most visible piece of
misalignment.

## Done Looks Like

The caret points **right** when the Setup panel is hidden and **down** when it is
shown, changing on the same click that opens and closes the panel. Its rendered
bounding box is centred in the button's content box on both axes, within 1px,
measured rather than eyeballed. No `⌄`, `▾`, `▸`, `›` or any other arrow
character remains anywhere in the split control's markup.

## Decision (already made - do not re-litigate)

**The caret is drawn in CSS, not typed as a character.** A `::before` on
`.control-split-caret` with two borders and a 45° rotation - the standard
two-sided box chevron. Pointing right is `rotate(-45deg)`; pointing down is
`rotate(45deg)`. `.control-split-caret.open` supplies the second rotation, and a
`transform` transition makes the turn visible so the caret reads as the same
object moving rather than two different icons.

> **Corrected at review, 2026-08-11.** This brief originally specified
> `rotate(45deg)` for right and `rotate(135deg)` for down. Both are wrong. For a
> `border-right`+`border-bottom` box the vertex is local `(+3,+3)`, and under
> CSS's clockwise-positive screen rotation it lands at `(4.24, 0)` at `-45deg`
> (right), `(0, 4.24)` at `+45deg` (down), and `(-4.24, 0)` at `135deg` (left).
> The original pair would have started the caret pointing down and turned it
> left. The executing session caught this and shipped the correct angles; the
> text above is the fix, so the next reader does not copy the error.

Reason it wins: a CSS chevron has no font dependency at all, so it cannot fall
back, cannot bring foreign metrics with it, and its geometry is arithmetic -
which is what makes "centred" checkable by measurement in a session that cannot
screenshot. It also removes one more font-fallback glyph from a file that has now
paid for two.

**The button centres its own content:** `display: flex; align-items: center;
justify-content: center` on `.control-split-caret` (`:123`). It is already
stretched to the Cinematic button's full height by `.control-split`'s
`align-items: stretch` (`:113`), so centring the pseudo-element inside it is the
whole of the vertical fix.

**Delete `border-color: var(--accent)` from `.control-split-caret.open`**
(`:130`). `.control-split-caret` sets `border: none` (`:126`), so that
declaration has never applied to anything. Leaving it there while introducing a
border-drawn chevron is how it comes back to life pointing at the wrong element.
The `.open` state keeps its `color` change, and the chevron inherits it through
`border-color: currentColor`.

**`.open` on the caret keeps meaning "the panel is visible".** The handler at
`:2249-2253` already derives that correctly - it reads `setupPanelEl.hidden`
*before* flipping it - so this brief adds no new state and no new listener. If
the caret ever disagrees with the panel, the bug is in this brief, not there.

### Rejected before starting

- **Swapping the character on toggle (`›` when closed, `⌄` when open).** Keeps
  the font-fallback dependency that caused the misalignment, and makes it worse:
  two different glyphs from two possibly different fallback fonts cannot both be
  centred by one rule. #32 is the standing evidence for what this costs.
- **An inline SVG chevron.** It would work and it is font-free, but it needs its
  own `stroke`/`fill` plumbing to follow `.open`'s colour, adds markup to a button
  that otherwise has none, and buys nothing a two-border pseudo-element does not.
- **`content: '▸'` on a pseudo-element.** Same fallback problem with an extra
  layer, and generated content cannot be transitioned between values, so the
  rotation would have to be faked as a swap.
- **Nudging the glyph with `position: relative; top: -1px`.** A magic number
  tuned against one browser's fallback font, in a file that has already been
  bitten twice by exactly that. It also does not survive Fletcher's Firefox
  choosing a different fallback than this session's Chromium.
- **Rotating the whole button.** The button is the hit target and half of a
  bordered split control; rotating it rotates the seam.

## Where The Code Is

| What | File | Symbol | Line |
|---|---|---|---|
| Caret markup (the `⌄`) | `app/public/index.html` | `#setupToggle` | 34 |
| Split control wrapper | `app/public/panel.css` | `.control-split` | 104 |
| Split hairline | `app/public/panel.css` | `.control-split-sep` | 111 |
| Caret style | `app/public/panel.css` | `.control-split-caret` | 116 |
| Caret open state (dead `border-color`) | `app/public/panel.css` | `.control-split-caret.open` | 122 |
| Toggle handler | `app/public/panel.js` | `setupToggleEl` click | 677-681 |
| Element lookup | `app/public/panel.js` | `setupToggleEl` | 29 |
| The panel it discloses | `app/public/panel.css` / `app/public/index.html` | `.scene-setup` / `#setupPanel` | 126 / 41 |
| Base button rule (and why `line-height: 1`) | `app/public/panel.css` | `button` (comment + rule) | 1338-1356 |
| Sibling class brief 022 kept separate | `app/public/panel.css` | `.setup-toggle` | 91 |
| Reduced-motion guard | `app/public/panel.css` | `@media (prefers-reduced-motion: no-preference)` | 1192 |

## Implementation Steps

1. **Empty the button and centre it.** Remove the `⌄` from `:1458`, leaving
   `<button class="control-split-caret" id="setupToggle" title="…"></button>`.
   Add `display: flex; align-items: center; justify-content: center` to
   `.control-split-caret`.
   *Done when:* the button still renders at its previous width and height (rect
   diff before/after, both within 1px) and contains no text.

2. **Draw the chevron.** `.control-split-caret::before` - a square of about 6px,
   `border-right` and `border-bottom` of 1.5px in `currentColor`, everything else
   `border: none`, `transform: rotate(45deg)`. Compensate the optical offset the
   rotation introduces with a `margin`, not with `position: relative`.
   *Done when:* the pseudo-element's rect centre and the button's content-box
   centre agree within 1px on both axes, computed in the console.

3. **Point it down when open.** `.control-split-caret.open::before { transform:
   rotate(45deg); }`. Keep the `color` change already on `.open`; delete the dead
   `border-color` declaration at `:130`.
   *Done when:* clicking the caret flips the rotation and the Setup panel's
   `hidden` in the same click, in both directions, ten times in a row without
   drifting out of sync.

4. **Add the turn.** A `transform 0.15s ease` transition on the pseudo-element,
   inside the existing `prefers-reduced-motion: no-preference` guard (`:1199`) if
   that is how the file already gates motion - match the surrounding pattern
   rather than inventing a second one.
   *Done when:* the caret visibly rotates rather than snapping, and no transition
   is declared outside the guard that the rest of the file puts its motion inside.

5. **Re-check the centring at both rotations.** −45° and 45° have different
   bounding boxes for the same square.
   *Done when:* step 2's measurement passes in the open state as well as the
   closed one.

## Verification

Against the live app:

1. With Setup closed, the caret points right. Click it: the Setup panel appears
   and the caret points down. Click again: panel gone, caret points right.
2. Reload the panel. Setup starts hidden (`#setupPanel` has `hidden` in the
   markup, `:1465`) and the caret starts pointing right - it does not start down
   and jump on first click.
3. Console-measure the chevron's rect against the button's content box in both
   states: centred within 1px on both axes.
4. **Negative case:** `Cinematic` still toggles the HUD and still swaps its own
   label between `Cinematic` and `Restore HUD` (`:2244`), and the split control
   does not change width when it does - brief 022 raised its left half to
   `min-width: 96px` for exactly this and that must still hold.
5. **Negative case:** `Reset` and `Hide names` are visually unchanged. They are
   `.setup-toggle` (`:1447`, `:1453`), a different class from
   `.control-split-caret` - brief 022 separated them on purpose.
6. **Negative case:** with no replay loaded, the whole `#scene` span is
   `.disabled` (`:1444`) and the caret is dimmed and inert along with everything
   else in it.
7. **Negative case:** the hairline between the two halves (`.control-split-sep`,
   `:118`) is still visible and still 1px, and the split control's outer border
   and radius are unchanged.
8. Grep the file for `⌄` and confirm zero matches.

## Can't Skip

- **The `⌄` character goes away entirely.** Leaving it as a fallback behind the
  CSS chevron keeps the font dependency and doubles the ink.
- **Measure the centring, do not look at it.** This session's Browser pane does
  not composite frames (briefs 014, 018, 019 all recorded it); a rect comparison
  is the available proof and it is a better one anyway.
- **Delete the dead `border-color` on `.open`** before adding borders to the
  chevron, not after.
- **Do not touch `.setup-toggle`.** Brief 022's second trap: it styles `Reset`
  and `Hide names` too.

## Traps

- **`.control-split` sets `overflow: hidden`** (`:116`) so its children's radii
  stay inside its own. A chevron nudged with a negative margin can be clipped at
  the button's edge and it will look like a rendering glitch rather than a margin.
- **A rotated square's bounding box is not its border box.** A 6px square rotated
  45° occupies ~8.5px. Both the centring maths in step 2 and any width the button
  needs have to use the rotated box, and −45° and 45° do not produce the same
  visual centre for a two-sided chevron even though they produce the same
  bounding box. **This trap was real and was not addressed** - see `Outcome`.
- **`button` sets `padding: 11px 14px`** (`:1356`) and `.control-split-caret`
  overrides it to `6px 10px` (`:125`). `justify-content: center` centres inside
  the *content* box, so an asymmetric padding change shifts the caret without
  changing any rule that mentions it.
- **The handler reads `setupPanelEl.hidden` before flipping it** (`:2250`).
  Rewriting that line to read the class instead - or moving the class toggle
  above the `hidden` assignment - inverts the caret silently while the panel keeps
  working.
- **`title` is now the button's only label**, since it has no text content. That
  matches the rest of the file, which uses `title` and no ARIA anywhere (zero
  `aria-` attributes at time of writing) - do not make this button the exception.

## Out Of Scope

Everything else in the status bar - the chips, the distance slider, `Reset`,
`Hide names`, and the split control's left half - all shipped by briefs 022 and
023 and all correct. The contents of the Setup panel. Adding ARIA anywhere: this
file has none, and introducing the first instance is a repo-wide decision, not a
side effect of a caret. Any other glyph in the file (`«`, `»`, `‹`, `›`, `★`,
`▸`) - #32 is the open record on those and it is Fletcher's call.

## Escalate Instead Of Deciding

- **If removing the glyph changes the split control's width**, stop before
  compensating. Brief 022 measured that control to 52px of row height and 96px of
  left-half width and confirmed zero reflow in both label states; a width change
  here means one of those measurements was resting on the glyph, which is worth
  saying out loud before it is papered over.
- **If the file has no existing motion pattern to match in step 4**, ship it
  without the transition rather than inventing a second convention. A caret that
  points the right way and does not move is the whole issue; the turn is a
  nicety.

## Outcome

**Shipped in 18 lines, and the brief's own geometry was the only thing wrong with
it.** `#setupToggle` loses its text node, `.control-split-caret` gains flex
centring, and a `::before` draws the chevron from `border-right` +
`border-bottom` in `currentColor` with a `transform 0.15s ease` transition.
`.open::before` supplies the second rotation and the dead `border-color:
var(--accent)` is gone. The `⌄` is out of `app/` entirely (`git grep` → no
matches), so #30's font-fallback dependency is closed at the root rather than
nudged.

**The brief specified the rotations backwards and the executing tier caught it.**
`rotate(45deg)`/`rotate(135deg)` would have started the caret down and turned it
left. The session derived the correct pair from the browser's own computed
transform matrix rather than by eyeballing - which is the only way to get this
right in a Browser pane that cannot composite frames - and the brief's Decision
text above has been corrected at review. **This is the useful shape:** the
executing tier is allowed to depart from a Decision when the code does not
support it, and a matrix it can read beats an angle the author reasoned about in
their head.

**The centring evidence proves a quantity that cannot fail, and the offset the
Traps section named is still there.** Step 3's "pseudo-el rect centre ==
content-box centre, 0px delta" is guaranteed by construction: a flex-centred
element with the default `transform-origin: 50% 50%` has its *bounding box*
centred no matter what angle it is rotated to. The measurement confirms `Done
Looks Like` as written, but it does not test the thing step 2's margin
compensation existed for. A 6×6 box whose only ink is two 1.5px borders has an
ink centroid at local `(3.96, 3.96)` against a box centre of `(3, 3)` - **≈1.36px
toward the vertex**, which after rotation reads as ~1.4px right of centre when
closed and ~1.4px below centre when open. The residue is smaller than and
different in kind from #30's original defect (the default state is now vertically
exact, which is what the issue was about), so it ships - but it is a real
un-taken step, not an absent one, and it is a candidate commission for triage
rather than a closed question.

**Lesson for the next report: an invariant that holds by construction is not
evidence.** This is the `Agreeing with itself is not verification` rule wearing a
different hat. Brief 016 measured cached-equals-live through one code path;
this measured centred-equals-centred through one geometric identity. When a
brief asks for a measurement, the report should say what result would have
counted as a failure - and if nothing would have, the measurement is the wrong
one.

**One escalation trigger was never armed.** `Escalate Instead Of Deciding` said
to stop if removing the glyph changed the split control's width, because brief
022's 96px/52px numbers might have been resting on it. The report never compares
the button's width against its pre-change value - step 4's stable 126px is a
different invariant (width across the `Cinematic` → `Restore HUD` label swap).
The old glyph's advance width was almost certainly not exactly the 6px the
pseudo-element lays out at, so the control probably *did* change width, silently.
Unresolvable without checking out `main` and re-measuring; carried forward as a
note rather than reopened.

**Report quality: good.** Judging this cost the report, the diff, and two
targeted `git show` greps - the reduced-motion guard (confirmed: it wraps one
infinite `animation:` and nothing else, so shipping the transition ungated
matches the file's actual pattern and satisfies step 4's own conditional) and the
global `box-sizing: border-box`. `index.html` was never opened. That is the
schema working. The one nit: the transition-guard resolution lived in
`plan-028.md`'s `Deltas from the brief` but not in the report's `Deviations`, so
a reviewer reading only the report cannot tell whether step 4's condition was
evaluated or ignored. Deltas that resolve a brief's conditional belong in both.
