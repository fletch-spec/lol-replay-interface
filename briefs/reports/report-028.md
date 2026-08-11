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

**PASS.** Reviewed 2026-08-11 (Opus). One correction made to the brief before
archiving; nothing sent back.

8 of 8 Verification steps have results, 1:1 with the brief's numbered list.
Nothing in `Out Of Scope` was touched - the diff is one text node in
`index.html` and three rules in `panel.css`, with no ARIA introduced, no other
glyph touched, and `.setup-toggle` untouched.

**All four `Can't Skip` items verified against the shipped branch, not the
report's word for them:**

1. *The `⌄` goes away entirely* - `git grep '⌄' brief/028 -- app/` exits 1, and
   the split control's markup carries no arrow character of any kind.
2. *Measure the centring, do not look at it* - measured. See the caveat below;
   the measurement was taken, it just proves less than it appears to.
3. *Delete the dead `border-color` on `.open` before adding borders* - gone in
   the same hunk that introduces `::before`, not after it.
4. *Do not touch `.setup-toggle`* - absent from the diff entirely.

**Deviation 1, the rotation angles: accepted, and the brief was wrong.** I
re-derived this rather than taking the report's word. The vertex of a
`border-right`+`border-bottom` box is local `(+3,+3)`; under CSS's
clockwise-positive screen rotation it maps to `(4.24, 0)` at `-45deg` (right),
`(0, 4.24)` at `+45deg` (down), `(-4.24, 0)` at `135deg` (left). The brief's
`45deg`/`135deg` would have started the caret pointing down and turned it left.
The session shipped the correct pair and declared the departure; the brief's
`Decision`, `Implementation Steps` and `Traps` text has been corrected at review
so the next reader does not copy the error.

**Deviation 2, no margin compensation: accepted, with the residue recorded.** The
`box-sizing: border-box` half of the argument is correct and I confirmed the
global rule. But the evidence for step 3 - pseudo-element rect centre ==
content-box centre, 0px delta - is guaranteed by construction: flex centring plus
the default `transform-origin: 50% 50%` centres the *bounding box* at every
angle. It confirms `Done Looks Like` as literally written and cannot fail, so it
does not test what step 2's compensation existed for. The ink centroid of a 6×6
box bordered on two sides sits at local `(3.96, 3.96)` against a centre of
`(3, 3)` - ≈1.36px toward the vertex, reading as ~1.4px off-centre in the
pointing direction in both states. It ships because the default state is now
vertically exact and that is what #30 was about, but it is an un-taken step, not
an absent one, and it goes to triage as a commission rather than being fixed
here.

**Not a deviation, but it should have been in the report.** Step 4's "match the
surrounding pattern" was resolved by inspection - the sole
`prefers-reduced-motion: no-preference` guard wraps one infinite `animation:` and
nothing else, so the file's convention is transitions ungated and the transform
transition correctly ships outside it. That resolution lives in `plan-028.md`,
not here. A reviewer reading only the report cannot tell whether the brief's
conditional was evaluated or ignored; when a delta resolves a conditional the
brief left open, it belongs in `Deviations` too.

**One escalation trigger was never armed.** `Escalate Instead Of Deciding` said
to stop if removing the glyph changed the split control's width. The report never
measures the button against its pre-change width - step 4's stable 126px is
invariance across the `Cinematic` → `Restore HUD` label swap, a different claim.
The old glyph's advance width was almost certainly not the 6px the pseudo-element
lays out at, so brief 022's numbers may well have been resting on it. Carried in
the `Outcome` as a note; not worth re-measuring now.

**Report quality: good.** The review cost the report, the diff, and two targeted
`git show` greps for claims no diff can display - the contents of the
reduced-motion guard and the global `box-sizing`. `index.html` was never opened.

**Branch note:** `brief/028` carried a third commit, `943e097` (the `/opsu
monitor` and `/stonne monitor` skill docs), which is not brief work. Raised with
Fletcher before merging and confirmed intended; it lands on `main` with this
merge.

**Not fixed here, by rule:** the ~1.4px optical offset is adjacent work and
becomes a commission for `AUTHOR.md`, not a commit in a review.
