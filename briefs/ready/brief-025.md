---
id: brief-025
state: ready
created: 2026-08-08
updated: 2026-08-08
agent: user
project: LOL-REPLAY-CONTROLLER
depends_on: [brief-020]
executes_after: brief-024
model: sonnet
---

# Brief 025: Copy Actually Copies, And Clear All Asks First

Closes [#22](https://github.com/fletch-spec/lol-replay-interface/issues/22),
[#23](https://github.com/fletch-spec/lol-replay-interface/issues/23).

> Line numbers in this brief are from commit `91796a5`. If they don't match,
> grep for the symbol name - the names are stable, the lines are not.

## Problem Statement

Two of the three buttons in the cues card header are wrong in opposite
directions: one does too much, the other does too little.

`Copy as text` does not copy and stop. `exportCues()` (`:3106-3124`) puts the
text into a textarea, makes it visible, focuses and selects it, and *then* tries
the clipboard. The textarea has no dismiss path anywhere in the file - once
`.visible` is added it stays until the page reloads. The design note at
`:3101-3105` explains the intent honestly: `navigator.clipboard.writeText` needs
transient user activation and can be refused, so the textarea guaranteed Ctrl+C
always worked. But the button is only ever reached by a real click, which is
exactly the case where the clipboard call succeeds - so the guaranteed fallback
became the thing you interact with every single time, and it never goes away.

`Clear all` (`:3085-3089`) deletes every cue on one click. No confirm, no undo.
It sits in a row of three identically-styled buttons, immediately beside the two
export buttons, and cues are the only user-authored data this panel holds - notes
typed during a take, persisted per replay in localStorage.

## Done Looks Like

Clicking `Copy as text` with cues present puts the text on the clipboard and says
so on the button, leaving nothing behind on screen. Clicking `Clear all` once
does not delete anything; clicking it again, deliberately, does. Keyboard focus
never leaves the panel in either flow.

## Decision (already made - do not re-litigate)

**`exportCues()` becomes clipboard-first.** Try `navigator.clipboard.writeText`,
show `Copied ✓` on the button for ~2s, done. The textarea appears **only** when
the clipboard call actually throws, and when it does it gets a dismiss path -
Escape, and it hides itself the next time an export succeeds.

**`exportAreaEl` is not deleted.** It is also the popup-blocked fallback for
`Export notes` (`:3162-3169`), which is the path brief 020 actually verified live
because this session's browser blocked `window.open()` on every attempt. Removing
the element breaks markdown export in any browser that blocks popups. The element
stays; what changes is that it is no longer the *primary* path for the text
export, and it can be dismissed.

**`Clear all` arms on the first click instead of confirming in a dialog.** First
click: the button becomes `Clear all?` in a warning colour and stays armed for
~3 seconds. Second click while armed: cues go. Click anywhere else, press Escape,
or let it time out: it disarms.

The reason it is not `window.confirm()` is specific to this panel, not a style
preference. `window.confirm()` moves focus off the document, and this panel's
hotkeys only work while it has focus - brief 011 shipped an entire focus chip
because dead keypresses after focus loss were confusing, and brief 020's Outcome
recorded `window.open()` costing hotkeys for the same reason and kept a second
export path specifically to avoid it. A dialog mid-take costs the take.

### Rejected before starting

- **Deleting the textarea outright.** Breaks `Export notes`' popup-blocked
  fallback (brief 020).
- **`window.confirm()` for Clear all.** Focus. See above.
- **A modal dialog.** That is a system, and this panel's standing rule from brief
  011 is one chip, not a system.
- **Undo instead of confirm.** Needs cue history and a place to show it; #23 asks
  for a confirm, and an undo affordance that lives on screen is more surface than
  the problem.
- **`document.execCommand('copy')` as a fallback.** Deprecated, needs the same
  user activation the clipboard API needs, and would fail in the same cases.
- **Auto-hiding the textarea on a timer.** It holds text someone may still be
  copying. Escape and next-successful-export are both user-driven.

## Where The Code Is

| What | File | Symbol | Line |
|---|---|---|---|
| The three action buttons | `app/public/index.html` | `#cuesExportBtn` / `#cuesExportMdBtn` / `#cuesClearBtn` | 1375-1377 |
| Button style | `app/public/index.html` | `.cues-action-btn` | 867 |
| Textarea creation | `app/public/index.html` | `exportAreaEl` | 2723-2726 |
| Textarea mount | `app/public/index.html` | `cuesCard.appendChild(exportAreaEl)` | 3081 |
| Text export | `app/public/index.html` | `exportCues()` | 3106 |
| YouTube chapter format | `app/public/index.html` | `cuesAsText()` | 3094 |
| Markdown export + fallback | `app/public/index.html` | `exportCuesMarkdown()` | 3159-3186 |
| Clear handler | `app/public/index.html` | `cuesClearBtnEl` listener | 3085 |
| Button disabled sweep | `app/public/index.html` | `renderCueList()` tail | 3070-3072 |
| Persistence | `app/public/index.html` | `saveCues()` / `renderCues()` | grep / 3075 |
| Escape handling precedent | `app/public/index.html` | cue label / notes keydown | 3040, 3058 |

## Implementation Steps

1. **Reproduce both.** Place two cues. Click `Copy as text` - note that the
   textarea appears and confirm there is no way to dismiss it short of a reload.
   Click `Clear all` - note that the cues are gone with no prompt. Undo by
   re-placing cues.
   *Done when:* both symptoms are confirmed in the live panel, in this order.

2. **Rewrite `exportCues()` clipboard-first.** Success: button reads `Copied ✓`
   for ~2s, textarea untouched and hidden. Failure: textarea shown, selected,
   button reads `Selected - Ctrl+C`.
   *Done when:* a successful copy leaves nothing visible in the cues card, and the
   clipboard holds the exact `cuesAsText()` output.

3. **Give the textarea a dismiss path.** Escape while it is focused hides it;
   a successful export hides it if it is showing. Match the Escape idiom already
   used by the cue label and notes fields (`:3040`, `:3058`), including the
   `stopPropagation()` - a bare Escape must not leak into the panel's hotkey
   handler.
   *Done when:* Escape hides it, and pressing Escape in it does not trigger any
   other command.

4. **Verify `Export notes` still falls back.** Force the popup-blocked path (block
   popups for localhost, or stub `window.open` to return null in the console) and
   confirm the markdown still lands in the textarea, and that it can now be
   dismissed too.
   *Done when:* the fallback works and dismisses.

5. **Arm `Clear all`.** First click arms (`Clear all?`, warning styling, ~3s
   timer). Second click while armed clears. Escape, a click elsewhere, or the
   timeout disarms. Store the timer id so a re-arm cancels the old one.
   *Done when:* one click never deletes a cue, two deliberate clicks always do.

6. **Reset the armed state on re-render.** `renderCueList()` (`:3070-3072`) sets
   `disabled` on all three buttons every time cues change. Placing a cue while the
   button is armed must not leave it reading `Clear all?`.
   *Done when:* placing or deleting a cue while armed returns the button to
   `Clear all`.

## Verification

1. Two cues placed. `Copy as text` → button reads `Copied ✓`, no box appears,
   and pasting into a text editor gives exactly `MM:SS - note` per line.
2. The button label returns to `Copy as text` after ~2s.
3. Stub the clipboard to throw (`navigator.clipboard.writeText = () => Promise.reject()`)
   and click again: the textarea appears with the text selected, button reads
   `Selected - Ctrl+C`, Ctrl+C works, Escape hides it.
4. `Export notes` with popups blocked: markdown in the textarea, dismissible.
5. `Export notes` with popups allowed: still opens the window, still uses
   `textarea.value` rather than innerHTML (brief 020's XSS-shaped trap).
6. `Clear all` once: nothing is deleted, button reads `Clear all?`. Wait 4s:
   button reads `Clear all` again, cues still there.
7. `Clear all` twice: cues gone, pins gone from the scrub bar, all three buttons
   disabled.
8. `Clear all` once then place a cue with `M`: button back to `Clear all`, and the
   next single click does not delete anything.
9. Reload after a clear: cues are still gone (localStorage was written, not just
   the in-memory array).
10. **Negative case:** with zero cues, all three buttons are disabled and none of
    them can be armed or fired.
11. **Negative case:** the panel's hotkeys (`M`, `N`, `B`, space) still work after
    every one of the flows above - nothing above should have moved focus off the
    document.

## Can't Skip

- **Do not delete `exportAreaEl`.** Brief 020's `Export notes` fallback depends on
  it, and that fallback is the path 020 actually verified.
- **`cuesAsText()`'s output does not change.** Its exact `MM:SS - note` shape is a
  contract with YouTube's chapter parser and brief 020 confirmed it byte-identical
  on purpose. This brief changes delivery, not format.
- **No focus leaves the panel** in any new flow. That is the whole reason the
  confirm is not a dialog.
- **Escape handlers call `stopPropagation()`**, following `:3040-3043`.
- **One click never destroys data.** That is #23, stated as a test.

## Traps

- **`exportCues(button)` takes the button as an argument** (`:3083`, `:3106`) and
  writes `textContent` on it. The 2s timeout that restores the label
  (`:3121-3123`) is unguarded - two fast clicks stack two timers and the second
  restore can fire while the first is still showing. Clear the pending timer.
- **`renderCueList()` re-runs on every cue change** and sets `disabled` on the
  clear button (`:3072`). It does not set `textContent`, so an armed label
  survives a re-render unless step 6 handles it - the button would sit reading
  `Clear all?` while disarmed, or worse, armed with no timer.
- **The textarea has no `hidden` attribute, only a `.visible` class** (`:3109`).
  Grep the `.cue-export` CSS before assuming how to hide it.
- **`window.open()` needs transient user activation and loses it after an `await`**
  - the comment at `:3157-3158` says so and `exportCuesMarkdown()` is deliberately
  not async. If step 4 touches it, do not add an `await` before the `open()` call.
- **Escape is already bound.** The panel has a global key handler; a new Escape
  listener that does not stop propagation will fire someone else's command too.
- **`saveCues()` must run before `renderCues()` on the clear path** (`:3086-3089`
  has the current order). A confirm that clears the array but skips the write
  looks correct until reload.

## Out Of Scope

Cue tags - #12 asked for them, brief 013's anti-scope fence barred them, and brief
020 shipped the markdown export leaving them out with the reasoning written down.
That fence is still Fletcher's to reverse and it is still not this brief. The cue
list layout, the lead-in time, cue navigation, and `cuesAsMarkdown()`'s format.
A general toast or notification system.

## Escalate Instead Of Deciding

- **If `navigator.clipboard.writeText` fails on the normal click path** in
  Fletcher's browser (not a stubbed failure - a real one), stop and report it.
  That would mean the original two-step design was right about this environment
  and #22's premise needs revisiting.
- **If the two-click arm reads as broken rather than protective** when you use it
  - i.e. the first click feels like a no-op - say so with a screenshot before
  shipping it. The alternative shapes all cost focus, so this is a real trade and
  Fletcher should see it.
