---
brief: brief-028
branch: brief/028
created: 2026-08-11
---

# Plan 028

| # | Work product | File : symbol | Done when |
|---|---|---|---|
| 1 | Empty the button, centre it | `index.html:34` `#setupToggle`; `panel.css:116` `.control-split-caret` | the button still renders at its previous width and height (rect diff before/after, both within 1px) and contains no text |
| 2 | Draw the chevron | `panel.css:116` `.control-split-caret::before` | the pseudo-element's rect centre and the button's content-box centre agree within 1px on both axes, computed in the console |
| 3 | Point it down when open, delete dead `border-color` | `panel.css:122` `.control-split-caret.open` | clicking the caret flips the rotation and the Setup panel's `hidden` in the same click, in both directions, ten times in a row without drifting out of sync |
| 4 | Add the turn (transition) | `panel.css:116` `.control-split-caret::before` | the caret visibly rotates rather than snapping, and no transition is declared outside the guard that the rest of the file puts its motion inside |
| 5 | Re-check centring at both rotations | `panel.css:116/122` | step 2's measurement passes in the open state as well as the closed one |

## Deltas from the brief

Step 4's "match the surrounding pattern" resolves against the actual file: 7
existing `transition:` declarations (`:57,70,285,385,428,528,1355`) are all
unconditional; the one `@media (prefers-reduced-motion: no-preference)` guard
(`:1192`) wraps only an infinite `animation:` pulse, not a one-shot transition.
The established pattern is transitions ungated, only continuous animation
gated - so this brief's transform transition ships unconditionally, not inside
the guard. All other line anchors in the brief's table checked exact against
current `panel.css`/`panel.js`/`index.html` (post-032 split), no drift.

## Blocking now

No replay is connected (League client unreachable), so `.scene-controls` has
`pointer-events: none` and the caret can't be clicked normally. Verification
will remove the `disabled` class via console for steps 1-5 (the toggle handler
itself doesn't read connection state) and test negative case 6 in its natural
disabled state - noted in the report rather than blocking the brief.
