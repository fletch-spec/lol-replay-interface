---
brief: brief-028
branch: brief/028
date: 2026-08-11
model: sonnet
result: pass
---

# Report 028

## Verification

| # | Step | Result | Evidence |
|---|---|---|---|
| 1 | Closed→click→open, click→closed | PASS | 10 clicks: `panelHidden`/`caretOpen` in sync every time, no drift |
| 2 | Reload starts hidden/right, no jump on first click | PASS | fresh load: `panelHidden:true, caretHasOpen:false`; first click: both flip together |
| 3 | Console-measure chevron centred within 1px, both states | PASS | pseudo-el rect centre == button content-box centre exactly (0px delta) in both closed and open probes |
| 4 | Cinematic still toggles/swaps label, split width unchanged | PASS | `.control-split` width 126px before and after label swapped to "Restore HUD" |
| 5 | Reset/Hide names visually unchanged | PASS | diff touches only `.control-split-caret`/`::before`/`.open`; `.setup-toggle` untouched |
| 6 | No replay: `#scene` disabled, caret dimmed/inert | PASS | fresh load: `.disabled` present, `pointer-events:none`, `opacity:0.4` |
| 7 | Hairline + outer border/radius unchanged | PASS | `.control-split-sep` 1px; `.control-split` border `1px solid`, radius `7px` |
| 8 | Grep for `⌄`, zero matches | PASS | `grep -r ⌄ app/` → no files |

## Deviations

**Rotation angles corrected: closed/right is `rotate(-45deg)`, open/down is
`rotate(45deg)`** - not the brief's `rotate(45deg)`/`rotate(135deg)`. For a
border-right+border-bottom box, applying the browser's own computed transform
matrix to the border vertex (bottom-right corner, local `(+3,+3)`) gives
`(4.24, 0)` at `-45deg` (points right) and `(0, 4.24)` at `+45deg` (points
down); `45deg`/`135deg` would produce down-then-left. Verified via matrix
math, not eyeballing (no compositing available). `135deg` is unused.

**No margin compensation added in step 2/5** - the brief's "optical offset"
concern doesn't apply here: `* { box-sizing: border-box }` is global
(`panel.css:32`), so the `::before`'s declared 6×6 is the full border box
regardless of the right/bottom-only border, and flex-centering + default
`transform-origin: 50% 50%` keep the rotated rect's centre pinned to the
content-box centre in both states (measured: exact 0px delta, not just <1px).

## Escalations

None.

## Findings not asked for

`getComputedStyle(el, '::before')` does not pick up a `transform` change
after a live `classList` toggle on the host in this Browser pane - it keeps
reporting the pre-toggle value even after a forced reflow. Two freshly-created
elements with the class baked in from creation read correctly. Same family as
the documented `:hover` getComputedStyle gap, but this is a plain class
mutation, not `:hover` - worth broadening that memory note. Verification here
used fresh-probe elements and real DOM state (`hidden`, `classList`) instead.

## Files touched

| File | Symbols | Lines +/- |
|---|---|---|
| `app/public/index.html` | `#setupToggle` | 1/1 |
| `app/public/panel.css` | `.control-split-caret`, `::before`, `.open` | +16/-2 |

## Left behind

Nothing. Steps 1-5 were first verified with a console-removed `.disabled`
class (no replay connected yet), then re-confirmed after a replay connected
mid-session: `#scene` naturally lost `.disabled` (`pointer-events: auto`,
`statusText: "Connected"`), and a real dispatched click (not `.click()`) on
the live button opened the Setup panel correctly. Step 6 was checked in its
natural disabled state before the replay connected.

---

## Verdict

*Filled in by the reviewing session (`REVIEW.md`), not by the executing one.*
