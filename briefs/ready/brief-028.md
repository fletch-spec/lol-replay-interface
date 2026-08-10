---
id: brief-028
state: ready
created: 2026-08-08
updated: 2026-08-08
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
two-sided box chevron. Pointing right is `rotate(45deg)`; pointing down is
`rotate(135deg)`. `.control-split-caret.open` supplies the second rotation, and a
`transform` transition makes the turn visible so the caret reads as the same
object moving rather than two different icons.

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
   rotate(135deg); }`. Keep the `color` change already on `.open`; delete the dead
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

5. **Re-check the centring at both rotations.** 45° and 135° have different
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
  needs have to use the rotated box, and 45° and 135° do not produce the same
  visual centre for a two-sided chevron even though they produce the same
  bounding box.
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
