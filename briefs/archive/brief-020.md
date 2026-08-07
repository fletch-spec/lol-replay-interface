---
id: brief-020
state: complete
created: 2026-08-07
updated: 2026-08-08
agent: user
project: LOL-REPLAY-CONTROLLER
depends_on: [brief-013]
executes_after: brief-019
model: sonnet
---

# Brief 020: Export Cue Notes As Markdown, In Their Own Page

Closes [#12](https://github.com/fletch-spec/lol-replay-interface/issues/12),
except for the tags - see Out Of Scope, which is the important section in this
brief.

> Line numbers in this brief are from commit `e8e05b9`. If they don't match,
> grep for the symbol name - the names are stable, the lines are not.

## Problem Statement

Brief 013 made the note body the panel's primary surface: a cue is a label plus a
body, and the body is where the actual thought goes - what to say, what went
wrong, what to come back to. It is the reason the panel exists.

**The body cannot be got out of the panel.** `cuesAsText()` (2986) emits
`MM:SS - note`, one line per cue, and that shape is deliberate: it pastes into a
YouTube description as chapter markers, which is what brief 005 built it for. The
body is not in it. Brief 013 verified that exclusion on purpose, because a
paragraph inside a chapter line breaks the chapter list.

So the thing you wrote during the take lives in `localStorage`, reachable one cue
at a time by clicking each pin. After a 36-minute replay with twenty cues, that
is twenty clicks to read back your own notes, inside the tool you are about to
close.

There is also the practical shape of the export: `exportAreaEl` (2613) is a
textarea inside the cues card. It is the right call for a chapter list, which is
short. It is the wrong container for twenty cues with paragraphs.

## Done Looks Like

Finish a take, press one button, and read every cue and every note in one
scrollable page you can select all of and paste into a document with its
structure intact.

## Decision (already made - do not re-litigate)

**Add a second export. Do not change the first one.**

Two buttons in the cues card, doing two different jobs:

- **`Copy as text`** - unchanged. `MM:SS - note`, in-page textarea, YouTube
  chapters. Brief 005's contract, and things outside this panel depend on its
  exact shape.
- **`Export notes`** - new. Full markdown, label *and* body, opened in a new
  browser page as raw markdown in a full-size textarea, selected on load.

**Raw markdown, not rendered markdown.** The panel has no build step and no
dependencies (PASSOFF); rendering markdown means shipping a parser to make text
look like text you were going to copy anyway. The issue asked for "a markdown
formatted copy-able text space" - a textarea holding markdown source is exactly
that.

**Format:**

```markdown
# Cue notes - CLASSIC, 36:35
_20 cues, exported 2026-08-07_

## 12:34 - Bad recall timing
Should have backed on the previous wave. Mentions the 1100g breakpoint.

## 15:02 - Dragon fight
No vision on the pit for 40 seconds before this.

## 18:20
```

A cue with no label renders its timestamp alone. A cue with no body renders its
heading alone. No placeholder text, no `(no note)` - an empty cue is a timestamp
someone marked, and that is a complete thought.

**A new page, per the issue - with a known cost.** `window.open()` moves keyboard
focus off the panel, and the panel's hotkeys only work while it has focus. Brief
011 shipped a chip specifically because dead keypresses were confusing enough to
be an issue. So the new page is the *second* export, not a replacement: pressing
`Export notes` mid-take costs you your hotkeys until you click back. The in-page
textarea path stays for that reason, and this is written into the button's own
comment so nobody consolidates them later.

### Rejected alternatives

- **Extending `cuesAsText()` to include bodies.** Breaks the YouTube chapter
  contract, which is the one consumer that exists.
- **Replacing the in-page textarea with the new window.** Loses the
  no-focus-cost path during a take.
- **Rendering the markdown to HTML** in the new page. A parser, for no gain over
  selectable source.
- **Downloading a `.md` file** instead of opening a page. The issue asked for a
  page, and a download puts a file in a folder the user then has to find; the
  clipboard is the actual destination.
- **A Blob URL** rather than writing into the opened window. Equivalent, and it
  adds a lifetime to reason about. Not worth it.

## Where The Code Is

| What | File | Symbol | Line |
|---|---|---|---|
| Chapter export text | `app/public/index.html` | `cuesAsText()` | 2986 |
| Existing export flow | `app/public/index.html` | `exportCues()` | 2998 |
| In-page textarea | `app/public/index.html` | `exportAreaEl` | 2613 |
| Textarea mount | `app/public/index.html` | `cuesCard` append | 2974 |
| Export button | `app/public/index.html` | `#cuesExportBtn` | 1354 |
| Cue controls row | `app/public/index.html` | `.cue-controls` | 1339 |
| Cue shape (`t`/`note`/`body`/`lead`) | `app/public/index.html` | cue load/normalise | 2636-2639 |
| Cue store | `app/public/index.html` | `cues` / `saveCues()` | 2651 |
| Replay identity | `app/public/index.html` | `replayIdentity()` | 2491 |
| Time formatting | `app/public/index.html` | `formatTime()` | grep |
| Button styling | `app/public/index.html` | `.cues-action-btn` | grep |

## Implementation Steps

1. **Write the markdown builder as its own function**, beside `cuesAsText()`
   (2986). It reads `cues` and returns a string. No DOM, no window.
   *Done when:* calling it in the console returns correct markdown for the
   current cue list, including cues with empty labels and empty bodies.

2. **Header carries the replay identity and the date.** `replayIdentity()` (2491)
   is `gameMode:length` - readable enough for a document header. A note file with
   no idea which game it came from is a note file you throw away.
   *Done when:* the header names the mode, the length and the export date.

3. **Sort by time.** `cues` is kept sorted by `placeCue()` (2680), but the export
   must not inherit that assumption silently - sort in the builder.
   *Done when:* an export is in time order regardless of insertion order.

4. **Add the `Export notes` button** beside the existing one (1354). Match
   `.cues-action-btn`. Disabled or inert when there are no cues - do not open an
   empty window.
   *Done when:* the button exists, is styled like its neighbour, and does nothing
   useful with zero cues.

5. **Open the page and fill it.** `window.open()`, then write a minimal document
   with a full-size textarea. **Set the markdown with `textarea.value`, never
   with `innerHTML` or by interpolating it into the written HTML** - cue text is
   user input and will contain `<`, `&`, quotes and newlines.
   *Done when:* a cue whose body contains `<script>alert(1)</script>` and `&amp;`
   appears in the output as those literal characters.

6. **Select the text on load** so `Ctrl+C` works immediately, same reasoning as
   `exportCues()` (2993-2997): the clipboard API can be refused for reasons the
   page cannot see, so selection is the delivery and the clipboard is the bonus.
   *Done when:* the new page opens with everything selected.

7. **Handle the blocked-popup case.** `window.open()` returns `null` when
   blocked. Fall back to the existing in-page textarea with the markdown in it
   rather than failing silently.
   *Done when:* blocking popups in the browser still gets you your notes.

8. **Comment the focus cost** on the new button's handler, referencing brief 011.
   *Done when:* the comment says why two export paths exist.

## Verification

With a replay loaded and at least six cues, some with labels and bodies, some
with labels only, some with neither:

1. `Copy as text` produces byte-identical output to before this brief. Compare
   against a saved copy.
2. `Export notes` opens a new page with all cues, in time order, as markdown.
3. Bodies are present and their line breaks are intact.
4. A cue with no label shows its timestamp as the heading.
5. A cue with no body shows a heading and nothing under it.
6. The header names the game mode, the length and the date.
7. Select-all and copy from the new page, paste into a markdown editor: headings
   are headings.
8. A cue containing `<b>`, `&`, backticks and a `#` at line start round-trips as
   literal text.
9. Zero cues: the button does not open a window.
10. Block popups, press the button: the in-page textarea appears with the same
    markdown.
11. Back on the panel, click once, press `M`. A cue is placed - hotkeys recover
    after the focus trip, and the focus chip (brief 011) behaved correctly while
    the other window had focus.
12. Reload the panel and export again. Same output - the export reads persisted
    cues, not session state.

## Can't Skip

- **`cuesAsText()`'s output does not change.** It is a contract with YouTube
  chapter parsing, and brief 013 verified the body's exclusion from it
  deliberately.
- **No new dependency, no build step.** Single-file vanilla panel.
- **User text is never interpolated into HTML.** `textarea.value`, always.
- **The in-page export path survives** as the one that does not cost focus.
- **Cue data is read-only here.** An export must not renumber, reorder, or
  normalise anything in `localStorage`.
- **No tags.** See below - this is a scope decision, not an oversight.

## Traps

- **`window.open()` needs transient user activation.** Call it synchronously in
  the click handler. An `await` before it - reading anything async first - loses
  the activation and the window silently does not open.
- **A written-into window has no styles of its own.** Set at minimum a monospace
  font and a full-height textarea, or the notes arrive in Times New Roman at
  400px wide.
- **`document.write` after load requires `document.open()` first** on some paths.
  Write the whole document in one call from the handler.
- **`cue.body` may be undefined on cues saved before brief 013.** The loader at
  2636-2639 normalises `body` to `''`, but only for cues that pass through it.
  Do not assume the field exists on every object you touch.
- **`replayIdentity()` returns `-:0` before a replay connects** (2491, via
  `identityKnown()` at 2495). Exporting with no replay loaded should still work -
  the cues are real even if the identity is not - but the header must not say
  `-:0`.
- **The existing button's label is used as a status indicator** - `exportCues()`
  swaps it to `Copied ✓` and back on a 2s timer (3012-3015). If you copy that
  pattern, the two timers must not fight over one element.
- **Cue notes can be long.** Brief 013 stress-tested a 30-line note. The new page
  must scroll; the panel must not grow.

## Out Of Scope

**Tags are deliberately not in this brief.** The issue's "extra feature: simple
tags for cue reasons i.e. missed cs, ganked, bad ward" is a direct reversal of
brief 013's explicit anti-scope fence, which barred rich text, tags, reordering,
templates and non-`localStorage` storage on the grounds that cue notes are live
prompts written while watching, not a script composed beforehand. The
2026-08-07 scope review recorded that fence as its main output, and separately
flagged the cue export as already the closest thing in the panel to a scope
violation.

That fence can be reversed - it is the user's project and the user filed the
issue. It should be reversed **on purpose, in writing**, not absorbed as a
sub-bullet of an export brief. If tags are wanted, they are their own brief, and
the case to make is why a taxonomy of mistakes helps someone talking over a
replay in real time rather than after it.

Also out: rendered markdown, file downloads, cue reordering, any change to the
chapter export, and cue storage moving out of `localStorage`.

## Escalate Instead Of Deciding

- **If the markdown needs to change shape to be useful** - a table, front matter,
  one heading level up - say which and why rather than picking. The output is
  going into someone else's document and its shape is a preference, not a
  derivation.
- **If tags come up mid-build** because the export looks empty without them,
  stop and read Out Of Scope again. That is the exact pressure the fence exists
  to resist.

## Outcome

**Built as decided, no scope questions came up.** `cuesAsMarkdown()` is a pure
function beside `cuesAsText()` (no DOM, no window), called directly in the
console with a 6-cue set covering every case the brief names - label+body,
body-only, label-only, neither, and one with `<script>alert(1)</script>`,
`&amp;`, backticks and a `#` in both the label and body. Output matched the
brief's example shape exactly: `# Cue notes - CLASSIC, 27:03`, the
`_N cues, exported YYYY-MM-DD_` line, then one `## MM:SS - label` (or bare
`## MM:SS` when the label is empty) per cue with its body underneath only
when one exists - no placeholder text either way.

**The popup-blocked fallback (step 7) wasn't simulated - it actually ran.**
This session's Browser pane blocks `window.open()` outright (it returned
`null` on every real click, confirmed via a screenshot - no new tab appeared
in `tabs_context`, the in-page textarea appeared instead), so verification
step 10 is the one this brief actually got tested against, live, by
necessity rather than by choice. Screenshotted the result: the fallback
textarea held the exact markdown, pre-selected (visible highlight), and the
`<script>alert(1)</script>` content rendered as literal characters with no
alert firing and no `<b>` tag rendering as bold - direct visual confirmation
that `textarea.value` was used, not `innerHTML` or string interpolation into
the written document. This is stronger evidence than the code review alone
would have given for the exact defect (step 5's Can't Skip item) the brief
was most worried about.

**The real `window.open()` path could not be visually confirmed** - it never
successfully opened in this environment to check. The code writing into it
(`document.open()`/`.write()`/`.close()` synchronously in the click handler,
then `textarea.value` set after, matching the fallback's proven-safe
approach exactly) is the same pattern already verified safe on the fallback
side, and `window.open()`/`document.write()` are standard, well-defined APIs
- but this is inference from a parallel code path, not a direct observation,
and is flagged as such rather than folded into "verified."

**`cuesAsText()` confirmed unchanged**, called directly before and after:
identical `MM:SS - note` output, empty-note-then-timestamp-alone behaviour
intact, body never appears in it. Zero-cues state correctly disables
`Export notes` alongside the two existing buttons (all three share the same
disabled-toggle line now). Reload-persistence confirmed: reloaded the page,
`cuesAsMarkdown()` produced byte-identical output from the cues loaded back
out of `localStorage`, not from anything held in session state.

**Not verified: focus recovery after the window trip** (verification step
11). Since `window.open()` never actually succeeded in opening a real window
this session, there was no genuine focus trip to recover from - flagged
rather than claimed. The mechanism itself (the focus chip, `document
.hasFocus()`) is unchanged from brief 011 and wasn't touched by this brief.

No tags added, per Out Of Scope - not reconsidered, not flagged as pressure
during the build.
