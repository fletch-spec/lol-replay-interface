---
id: brief-013
state: complete
created: 2026-08-07
updated: 2026-08-07
agent: user
project: LOL-REPLAY-CONTROLLER
depends_on: [brief-005, brief-007]
executes_after: brief-011
model: sonnet
---

# Brief 013: Cue Notes as the Primary Surface

Closes [#11](https://github.com/fletch-spec/lol-replay-interface/issues/11) and
[#5](https://github.com/fletch-spec/lol-replay-interface/issues/5).

> #5 (per-cue lead-in) moved here from brief 011 on 2026-08-07: both briefs
> wanted to put a control in the cue row, and this one redesigns that row.
>
> Line numbers are from commit `d0ae049`.

## Problem Statement

Marking a moment and writing what to say about it is the whole job of this panel.
Everything else - transport, roster, camera - exists to get you to a moment worth
cueing. That operation currently gets a single-line `<input class="cue-note">` in
a 330px rail, which is the smallest surface on the panel. The notes actually
being written are paragraphs, and a paragraph in that field is invisible the
moment focus leaves it: no wrap, no expansion, no way to read it back.

The lead-in has the mirror-image problem. Brief 005 shipped the storage - every
cue carries a `lead`, persisted and honoured on navigation - and no way to change
it, so every cue uses the 2s default.

## Done Looks Like

A paragraph-length note can be written, read back in full, and edited without
leaving the panel or losing your place in the replay. The cue list still shows
one line per cue so you can find a moment at a glance. A cue that needs a longer
run-up gets one. Placing a cue is exactly as fast as it is today.

## Decision (already made - do not re-litigate)

### 1. A note is a short label plus an optional body

```js
{ t: 412.3, note: 'Baron flip', lead: 2, body: 'Long paragraph…' }
```

`note` keeps its exact current meaning - the short label shown in the list, on
the pin hover card, and in the export. `body` is new, optional, and holds the
paragraph.

This is chosen over making `note` itself multi-line because of the export
contract. `cuesAsText()` (2755) emits `MM:SS - note`, one line per cue, because
it pastes straight into a YouTube description as chapter markers, and
`renderCuePins()` (2619) writes the note into the pin. A paragraph breaks both.
Splitting label from body is also what makes migration free: every cue already
stored has a `note` string, and it stays a label untouched. **There is no
migration step.** If you find yourself writing one, the shape is wrong.

### 2. The editor is a full-width row inside the transport card

Add a fourth section to `.transport`, between `.timeline-row` (1192) and
`.cue-controls` (1237). It is hidden until a cue is selected. It contains the
label field, the body textarea, the lead-in number, and delete.

Rejected alternatives, so they are not re-derived:

- **Expanding row inside the rail.** The rail is 330px, which is about six words
  per line for a paragraph, and a long note pushes every other cue out of view.
- **Widening the rail when Cues is active.** The rail's 330px comes out of the
  scrub track, which is at 1400px specifically for pixels-per-minute on the
  timeline. Brief 014 is about to spend that budget and brief 015 has to balance
  it; this brief must not pre-spend it.
- **A modal or floating editor.** Brief 007 removed the floating dropdowns
  because at 1400px they opened over the scrub track. Same rule applies here.

The transport card already renders its children as hairline-separated sections
(`.transport > *` padding at 390, `.transport > * + *` border-top at 393), so a
new section inherits the right look with no new card styling.

### 3. Selecting a cue opens the editor but does not focus it

This is what protects brief 005's rule that `M` is always instant. If selecting
or placing a cue moved focus into a textarea, the next `M` would type the letter
`m` instead of dropping a cue. Focus moves only when the user clicks into a
field.

### 4. The rail auto-switches to Cues on the first cue placed

Events stays the default tab on load - it is what is populated on a fresh replay.
The first time `placeCue()` succeeds, switch the rail to the Cues tab. After
that, leave the tab where the user puts it.

## Where The Code Is

| What | File | Symbol | Line |
|---|---|---|---|
| Cue row construction | `app/public/index.html` | `renderCueList()` | 2669 |
| Pins on the track | `app/public/index.html` | `renderCuePins()` | 2611 |
| Repaint entry point | `app/public/index.html` | `renderCues()` | 2747 |
| Placement | `app/public/index.html` | `placeCue()` | 2497 |
| Delete | `app/public/index.html` | `deleteCue()` | 2508 |
| Seek to cue, honours `lead` | `app/public/index.html` | `seekToCue()` | 2517 |
| Load + shape normalisation | `app/public/index.html` | `loadCues()` | 2449 |
| Persist | `app/public/index.html` | `saveCues()` | 2468 |
| Storage key | `app/public/index.html` | `cuesStorageKey()` | 2353 |
| Export text | `app/public/index.html` | `cuesAsText()` | 2755 |
| Default lead | `app/public/index.html` | `DEFAULT_LEAD` | 2423 |
| Selection cursor | `app/public/index.html` | `activeCueIndex` | 2426 |
| Rail tab switching | `app/public/index.html` | `showRailTab()` | 2303 |
| Cue row styles | `app/public/index.html` | `.cue-row` / `.cue-note` | 744 / 768 |
| Transport section markup | `app/public/index.html` | `.transport` children | 1178-1244 |

## Implementation Steps

1. **Extend the stored shape.** In `loadCues()` (2449), carry `body` through the
   same way `note` and `lead` are carried: `body: typeof c.body === 'string' ?
   c.body : ''`. In `placeCue()` (2502), initialise `body: ''`.
   *Done when:* an existing saved cue loads unchanged and gains an empty `body`.

2. **Add the editor section markup** between `.timeline-row` and `.cue-controls`
   in the `.transport` card, `hidden` by default. Give it: a one-line label input
   (maps to `note`), a textarea (maps to `body`), a number input for `lead`, a
   delete button, and a small header showing the cue's index and timestamp with
   a click-to-seek like the existing `.cue-time` (2689).
   *Done when:* the section renders and matches the neighbouring sections'
   padding and hairline.

3. **Wire selection.** Selecting a cue - clicking a row, clicking a pin, or
   `gotoCue()` landing on one - sets `activeCueIndex` and renders the editor with
   that cue's values. Deselecting hides the section.
   *Done when:* clicking three cues in turn shows three different sets of values,
   and the editor is hidden when `activeCueIndex` is null.

4. **Wire editing.** `input` on the label writes `cue.note`, on the textarea
   writes `cue.body`, on the number writes `cue.lead`. Each calls `saveCues()`.
   Only the label and lead changes need `renderCues()` - the body affects
   nothing outside the editor, and repainting the list on every keystroke of a
   paragraph will fight the cursor.
   *Done when:* typing a paragraph does not cause the list to flicker or the
   caret to jump, and a reload brings the paragraph back.

5. **Simplify the rail row.** With the editor carrying the real text, the row
   becomes: index, timestamp, label (still editable in place - it is one line and
   editing it there is faster), a marker showing the cue has a body, and delete.
   Keep the in-place label input; do not make the row read-only.
   *Done when:* a cue with a body is distinguishable from one without, in the
   list.

6. **Lead-in.** The number input writes `cue.lead`. Clamp to a sane range
   (0-15s) and fall back to `DEFAULT_LEAD` when the field is emptied. `seekToCue()`
   (2517) already honours the field - do not touch it.
   *Done when:* setting a cue's lead to 8 and pressing `N` lands 8s before it,
   still paused.

7. **Auto-switch the rail tab** on the first successful `placeCue()`, per
   decision 4. Note `placeCue()` has a double-tap guard at 2501 that returns
   early - the switch belongs after that guard, not before.
   *Done when:* placing the first cue of a session shows the Cues tab.

8. **Check the export is unchanged.** `cuesAsText()` must still emit
   `MM:SS - note` using the label only. The body never appears in the export.
   *Done when:* a cue with a five-line body exports as one line.

## Verification

1. Open a replay with existing cues from a previous session. They load, labels
   intact, editor hidden.
2. Press `M`. A cue appears, the rail switches to Cues, **focus does not move**.
3. Press `M` twice more while the editor is open. Three more cues appear. No
   letter `m` is typed anywhere.
4. Click a cue. The editor shows it. Type a five-paragraph note in the body.
5. Press `M` - it types into the textarea, because focus is there. This is
   correct. Click the panel background, press `M` - a cue is placed.
6. Reload the panel. The paragraph is still there, in full.
7. Set that cue's lead to 8. Press `B`/`N` to navigate to it: playback lands 8s
   early and holds paused.
8. Press "Copy as text". The five-paragraph cue is one `MM:SS - label` line.
9. Hover the cue's pin on the track. The card shows the label, not the paragraph.
10. Confirm nothing overlays the scrub track at any point, with the longest note
    you can produce.

## Can't Skip

- **`M` places a cue instantly regardless of what is open**, and placing a cue
  never moves focus into a field. Brief 005's rule; it is not renegotiated here.
- **Nothing floats over the scrub track**, at any note length.
- **Export stays one line per cue.** `MM:SS - label`, and a cue with no label
  still emits the bare timestamp (2756 explains why - a dangling separator has to
  be cleaned out of a YouTube description by hand).
- **No migration.** Existing cues load with their `note` intact as the label.
- **One identity function.** Persistence keys off `cuesStorageKey()` →
  `replayIdentity()` (2341). Do not derive replay identity a third time.
- **The pin label still works.** `renderCuePins()` (2619) shows `note`; it must
  never receive a paragraph.
- **Escape inside a field blurs the field**, and does not clear the A/B loop.
  The existing `.cue-note` handler (2707) does this already - match it.

## Traps

- **Repainting the list on every body keystroke destroys the textarea.**
  `renderCueList()` calls `replaceChildren()`. If the editor is rebuilt from
  scratch on `input`, the caret resets to position 0 and typing becomes
  impossible. This is the single most likely way to break this brief. Write to
  the cue object and save; do not re-render the editor from its own input event.
- **`deleteCue()` (2508) splices the array**, so every index after the deleted
  one shifts. `activeCueIndex` must be recomputed, not left pointing at what is
  now a different cue. The existing code only guards the past-the-end case.
- **`placeCue()` sorts the array** (2503), so a cue placed earlier in time
  changes the index of the cue currently being edited. Track the selected cue by
  identity, or re-find its index after every mutation. This bites the moment
  someone edits a note and then places a cue behind it.
- **`loadCues()` runs on every replay identity change** (`syncCuesToIdentity()`
  at 2480). The editor must close when that happens or it will show a cue from
  the previous replay.
- **The keydown handler returns early for `INPUT`/`TEXTAREA`** (3127), which is
  why typing works at all. Do not "fix" that early return to make hotkeys work
  while typing.
- **`exportAreaEl` is built once and re-appended** (2435, 2722) so its contents
  survive the list repainting. If the list restructures, keep that property -
  rebuilding it drops the user's selection mid-Ctrl+C.

## Out Of Scope

This brief makes an existing note usable at length. It does not turn the rail
into a script editor. Explicitly out, and refuse them if they suggest themselves
mid-build:

- Rich text, markdown rendering, or any formatting of any kind
- Per-cue colours, tags, or categories
- Reordering cues by hand (they are time-ordered; that is the point)
- Templates, snippets, or autocomplete
- Writing notes anywhere but `localStorage`
- Any change to the export format beyond leaving it alone

The project's scope test is "does this help someone talk over a replay in real
time". A note you write *while watching* passes. A document you compose
beforehand is a script editor, and there are better ones.

## Escalate Instead Of Deciding

- If the full-width editor section pushes the panel past the viewport height at
  1920x1080, stop before shrinking the scrub track to pay for it - that trade is
  brief 015's to make.
- If tracking the selected cue across sorts turns out to need a stable per-cue
  id, that is a storage shape change beyond `body` - say so before adding one.

## Outcome (2026-08-07)

Shipped as decided, with one design choice for the traps and one bug found
that wasn't specific to this brief.

**Selection tracked by object identity (`activeCue`), not index**, exactly
per the Traps warning - `placeCue()`'s sort and `deleteCue()`'s splice both
invalidate a captured index, but a reference into `cues` survives both.
Verified live: selected a cue, placed a second one earlier in time (forcing
a sort that moved the first cue from index 0 to 1), and the editor kept
showing the correct cue throughout. `gotoCue()` now derives the current
index via `cues.indexOf(activeCue)` rather than storing one.

**The editor never rebuilds itself from its own input.** `renderCueEditor()`
rewrites every field from the model and is called only on an actual
selection change (click, delete, cue-nav, identity reload) - never from the
label/body/lead fields' own `input` handlers, which write straight to the
model and call `saveCues()`. Cross-field sync (list ↔ editor label) is a
targeted `.value` write on the other element, not a re-render of either.
Verified live by setting the body textarea's cursor mid-string and firing
another `input` event: cursor position held. This is the trap the brief
called "the single most likely way to break this brief," so it got the most
direct test.

**Found and fixed a real bug, not scoped to this brief but surfaced by it:**
`.cue-note`'s existing Escape handler (and the two new editor fields, built
the same way per the Can't-Skip requirement) call `.blur()` synchronously,
which changes `document.activeElement` *before* the same event finishes
bubbling to the document-level hotkey handler - so the INPUT-tag guard there
no longer sees the field as focused, and the same Escape falls through and
fires `loopClear`. Reproduced live on the pre-existing `.cue-note` field
before touching any of my own code, so this predates brief 013. Fixed all
three (the existing field plus both new ones) with `e.stopPropagation()`
alongside the existing `.blur()`. Verified: loop values held across Escape
in all three fields after the fix, cleared before it.

**Auto-switch-to-Cues-tab is a one-time, page-lifetime flag**, not reset per
replay identity - matches the decision's "on load" framing literally. Did
not auto-select the newly-placed cue into the editor (only the rail tab
switches); the brief's own Decision section only specifies the tab, and
Verification step 3's "while the editor is open" reads as loosely worded
rather than a separate requirement - flagging the ambiguity rather than
silently picking a stronger reading.

**Measured, not assumed:** scrub track stayed at 982px with the editor open
and a 30-line stress-test body in the textarea (the textarea caps at
`max-height: 240px` and scrolls internally, so it can't push into the track
regardless of note length). Panel measured 1400×856 at a 1920×1080 viewport
with the editor open - well inside budget, so brief 015 inherits no
constraint from this one.

**Not verifiable this session:** every check that requires literally
pressing keys with real OS focus (M while the panel has focus vs. while a
field has it, per Can't Skip) was done via `runCommand()` calls and
dispatched `KeyboardEvent`s instead of physical keystrokes, since this
session has no way to generate real keyboard input. The underlying keydown
handler was read but not modified except for the two `stopPropagation()`
additions above.

**Addendum (2026-08-07, found during brief 015):** every "editor hidden"
check above was verified against `cueEditorEl.hidden` (the JS/DOM property)
only, never against the actual rendered box. That property was telling the
truth and the box wasn't listening to it: `.cue-editor { display: flex; }`
and the browser's default `[hidden] { display: none }` are equal
specificity, and author CSS beats the UA stylesheet regardless, so the
`hidden` attribute was doing nothing and the editor sat in the layout -
~160px of it - even when every check here correctly reported it closed.
Fixed in brief 015 with `.cue-editor[hidden] { display: none; }`, which is
the only line that changed; nothing else in this brief's shipped behavior
was affected; the "hidden" *state* was always tracked correctly, only its
visual effect was missing. Worth remembering for next time: a `hidden`
boolean checked in isolation is not the same claim as "the user can't see
it," the same way `res.ok` is not the same claim as "the write took."
