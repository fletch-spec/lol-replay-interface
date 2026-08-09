---
id: brief-032
state: ready
created: 2026-08-10
updated: 2026-08-10
agent: user
project: LOL-REPLAY-CONTROLLER
depends_on: []
executes_after: brief-031
model: sonnet
owns: [app/public/index.html, app/public/panel.css, app/public/panel.js, briefs/ready/*]
branch: brief/032
---

# Brief 032: Three Files Instead Of One, Without Changing A Line Of Behaviour

Closes [#33](https://github.com/fletch-spec/lol-replay-interface/issues/33).

> Filed 2026-08-10 on Fletcher's go-ahead, after the brief was written. It came
> from a process pass rather than a defect, and it is the first issue this queue
> has opened on its own behalf.

> Line numbers are from commit `260a170`. If they don't match, grep for the
> symbol name - the names are stable, the lines are not.

## Problem Statement

`app/public/index.html` is 140,545 bytes and 4,101 lines: a `<style>` block
(lines 8-1430, 1,423 lines), the panel's markup (1,434-1,571, 138 lines), and
one classic `<script>` (1,573-4,098, 2,526 lines). Every session that edits any
part of it reads all of it, and once read it stays resident for every remaining
turn.

That resident context is what this project actually spends its token budget on.
The 2026-08-08 session logged 324k output, 3.6M new input, and **121.7M cache
read** - cache reads were roughly 34x the new input, and even discounted they
were the majority of the bill. Cache read is steady-state context multiplied by
turns, so the file that never leaves context sets the rate. At ~4 chars per
token this one is ~35k tokens, carried by a CSS-only brief and a JS-only brief
alike.

It also caps concurrency. Two executing sessions are supposed to run in parallel
when their `owns:` sets are disjoint (`TRIAGE.md` step 6), but while the panel is
one file every brief owns the same file, so the second session either idles or
rebases. Briefs 029 and 030 already share the marker gutter for real reasons;
they should not also collide with brief 028's caret, which is 1,300 lines away
and touches nothing they touch.

Nothing about the panel *needs* to be one file. It was one file because there is
no build step, and it stayed one file because nothing forced the question.

## Done Looks Like

`app/public/` holds `index.html` (~150 lines: head, markup, two tags),
`panel.css` and `panel.js`. The running panel is byte-for-byte
indistinguishable in behaviour from commit `260a170` - same DOM, same computed
styles, same hotkeys, same reconnect, same console. Every brief left in
`ready/` has a `Where The Code Is` table that points at the file its symbols are
actually in.

## Decision (already made - do not re-litigate)

**Extract to a linked stylesheet and one external classic script. Do not convert
to ES modules in this brief.**

`<link rel="stylesheet" href="panel.css">` in `<head>` where the `<style>` block
was, and `<script src="panel.js"></script>` at the end of `<body>` where the
inline script was. Both are semantically identical to what they replace: a
render-blocking stylesheet in head has the same cascade position as an inline
one, and an external classic script executes at the same document position, in
the same global scope, with the same blocking behaviour. This is a move, not a
refactor. No symbol is renamed, no line of logic changes, and the diff should be
readable as "these lines left, those two tags arrived".

Four things make it safe here specifically, all checked at `260a170`:

- `server.js:190` already does `express.static(path.join(__dirname, 'public'))`,
  so `/panel.css` and `/panel.js` serve with no server change.
- The CSS contains **zero** `url()` and **zero** `@import`. Those are the only
  things whose resolution base changes when CSS moves out of a document, so the
  move is path-neutral.
- The markup contains **zero** inline `on*=` handlers, so nothing in the HTML
  depends on the script's symbols being reachable from markup.
- Every path in the JS is root-absolute (`/portraits/...`, `/api/...`), so none
  of them care where the script lives.

**Rejected: ES modules in this brief.** It is the right end state and it is what
finally makes two executing sessions safe, but it is a different problem with a
different risk, and doing both at once means a behaviour regression and a module
graph land in the same diff with no way to tell which caused what. The specific
obstacle is that the script has **~48 top-level `let` bindings** and imported
bindings are read-only - `import { lastPolled }` gives a binding you can read but
cannot assign, so any module that reassigns state declared elsewhere is a
`SyntaxError` at parse, not a runtime bug. Deciding between a shared mutable
state object, setter functions, or keeping each `let` private to its own module
needs a count of which bindings are actually cross-domain, and nobody has that
count. Step 4 produces it; brief 033 spends it.

**Rejected: one file per domain in this brief** (`events.js`, `cues.js`,
`transport.js` as classic scripts). Multiple classic scripts share one global
scope, so it would "work" - and that is exactly the problem. It gets the file
sizes down while leaving every implicit global dependency invisible and
unenforced, which is a worse starting position for the module split than one
honest big file, because the seams would look decided when they are not.

**Rejected: doing this after 027-030.** The whole queue would then run at 140KB
of resident context per turn to avoid one mechanical re-pointing pass, which
step 5 does in a few greps. Running it before also means 029 and 030 - which
genuinely share the marker gutter - stop colliding with everything else as well
as each other.

**Rejected: a build step.** `run.bat` is `npm install` and `npm start`, and the
project's "no build step" constraint is load-bearing for a tool Fletcher runs
from a `.bat` on a second machine. `<link>` and `<script src>` need no build, and
neither will `type="module"` when brief 033 lands.

## Where The Code Is

The split touches the whole file, so this table names the boundaries rather than
the symbols. Everything moves verbatim.

| What | File | Symbol | Line |
|---|---|---|---|
| Opening `<style>` | `app/public/index.html` | `<style>` | 7 |
| CSS body (moves whole) | `app/public/index.html` | - | 8-1430 |
| Closing `</style>` | `app/public/index.html` | `</style>` | 1431 |
| Markup (stays) | `app/public/index.html` | `<body>` | 1433-1571 |
| Opening `<script>` | `app/public/index.html` | `<script>` | 1572 |
| DOM ref preamble | `app/public/index.html` | `statusDot` .. `focusChipEl` | 1573-1624 |
| JS body (moves whole) | `app/public/index.html` | - | 1573-4098 |
| Boot block (moves, stays last) | `app/public/index.html` | `connect()` call | 4074-4098 |
| Closing `</script>` | `app/public/index.html` | `</script>` | 4099 |
| Static serving (no change) | `app/server.js` | `express.static` | 190 |

## Implementation Steps

1. **Branch and freeze a reference copy.** `git checkout -b brief/032`, then copy
   the current `app/public/index.html` to
   `C:\Users\...\scratchpad\index-260a170.html` - outside the repo, so it is
   never served and never committed. This is the baseline every verification
   step compares against, and brief 022's Outcome records what it cost to need
   one after the edit rather than before.
   *Done when:* the copy exists outside the repo and `git status --short` shows
   only the branch, nothing staged.

2. **Extract the CSS.** Move lines 8-1430 verbatim into
   `app/public/panel.css`. Replace lines 7-1431 of `index.html` with
   `<link rel="stylesheet" href="panel.css">`. Do not reformat, reorder, minify,
   or "tidy" anything on the way - a whitespace change here is indistinguishable
   from a cascade change in the diff.
   *Done when:* `panel.css` is 1,423 lines, `index.html` has no `<style>` tag,
   and the panel still renders.

3. **Extract the JS.** Move lines 1573-4098 verbatim into
   `app/public/panel.js`. Replace lines 1572-4099 of `index.html` with
   `<script src="panel.js"></script>` in the same position - last thing before
   `</body>`, not in head, and **without** `defer`, `async` or `type="module"`.
   Dedent the whole block by the two leading spaces the inline script carried, or
   leave it; either is fine, but do one of them uniformly.
   *Done when:* `panel.js` parses (`node --check app/public/panel.js` - it is not
   a Node module, but the syntax check is valid and free), `index.html` is under
   200 lines, and the panel loads with an empty console.

4. **Measure the cross-domain binding set - this is brief 033's input, not this
   brief's.** For each of the ~48 top-level `let` declarations in `panel.js`,
   record which of the eleven domain groups below read it and which *assign* to
   it. Write the result as a table in the report. Assignment count is the number
   that matters: a binding assigned in exactly one group can stay private to that
   module, and one assigned from two or more is what forces a state decision.

   The groups, as the declarations already sit in the file:
   `transport` (`updateFocusChip`..`clearTransportDisplay`), `camera`
   (`followOffset`..`applyFraming`), `roster` (`renderZoom`..`fetchGameMode`),
   `render` (`HUD_TOGGLES`..`applyRenderState`), `events`
   (`EVENT_CATEGORY`..`loadCachedEvents`), `scan` (`SCAN_SPEED`..`checkGameChange`),
   `cues` (`DEFAULT_LEAD`..`exportCuesMarkdown`), `playback`
   (`postPlayback`..`setSpeed`), `gutter` (`SNAP_PX`..`onDragEnd`), `commands`
   (`seekBy`..`HOTKEY_TO_COMMAND`), `connect` (`connect`..end).
   *Done when:* every top-level `let` in `panel.js` has a row with a read-set, an
   assign-set, and an assign count. No binding is omitted as obvious.

5. **Re-point every brief still in `ready/`.** For each one - 021, 027, 028, 029,
   030, and 031 if it has not yet been archived - rewrite the `Where The Code Is`
   table: change the File column from `app/public/index.html` to `panel.css` or
   `panel.js`, and recompute the Line column by grepping the symbol in its new
   file. Update each brief's commit note to say line numbers are from this
   brief's merge commit. Do not touch anything else in those briefs.
   *Done when:* no brief in `ready/` names `app/public/index.html` in a code
   table, and spot-checking three rows at random lands on the named symbol.

6. **Do not archive, log, merge or close.** Write `briefs/reports/report-032.md`,
   commit code and report to `brief/032`, push the branch. `REVIEW.md` owns the
   rest.
   *Done when:* `git status --short` is empty and the branch is on the remote.

## Verification

Run the helper (`node server.js` from `app/`) and open `http://localhost:3000`
in Chromium. Steps 1-5 need no replay; 6-8 need one loaded.

1. **Three requests, all 200.** Network shows `index.html`, `panel.css`,
   `panel.js`. No 404, and no request for anything else new.
2. **Console is empty.** No errors, no warnings that were not there before.
   Specifically no `ReferenceError` - that is the shape a missed symbol takes.
3. **Computed styles match the baseline.** Serve the frozen copy from step 1
   alongside, and for at least these twelve selectors compare the full computed
   style object: `.panel`, `.transport`, `.transport.card`, `.scrub-area`,
   `.rail`, `.legend`, `.marker`, `.cmd-btn`, `.control-split-caret`,
   `.hc-portrait`, `.cue-card`, `.chip`. Any difference is a failure, including
   one that looks cosmetic.
4. **DOM structure matches.** `document.body.innerHTML.length` and the element
   count are equal to the baseline's after both have booted and settled.
5. **Boot order held.** `statusDot` shows a real state rather than the
   `helper-down` default, which only happens if `connect()` ran after the DOM
   refs resolved.
6. **Every command button works.** Click all of them: seek back/forward, pause,
   speed presets, prev/next event, scan, place/prev/next cue, loop A/B/toggle/
   clear. Each does what it did before.
7. **Every hotkey works.** Walk `HOTKEY_TO_COMMAND` and press each one with the
   panel focused. This is the check that would catch a script that ended up
   deferred or module-scoped, because listeners would still attach but the focus
   chip and key handling would be racing a different document state.
8. **Negative cases - the things that must still work.** Reconnect after killing
   and restarting the helper. Cue persistence across a reload (`localStorage`
   round-trip under the unchanged key). The event cache serving from `v2` without
   a re-scan. Marker re-measure on window resize, and the 1s poll that covers a
   hidden tab. Portrait images in a hover card (`/portraits/...` still resolves).

## Can't Skip

- **Verbatim moves.** No renaming, reordering, reformatting or dead-code removal
  in this brief. The acceptance test is "identical behaviour", and it is only
  checkable if the diff is a move.
- **The frozen baseline copy, taken before any edit.** Steps 3 and 4 of
  Verification are impossible without it, and brief 022 already had to
  reconstruct one after the fact.
- **Classic script, not `type="module"`.** Module scripts are deferred and
  strict-mode, and this file has ~48 top-level `let`s that would become
  cross-module assignments. That is brief 033, and mixing it in makes both
  undebuggable.
- **The script tag stays last in `<body>`.** The DOM refs at the top of the
  script resolve at execution time; moving it to head without `defer` gives you
  48 `null`s and a panel that looks like it lost its markup.
- **Step 5 runs.** Leaving four briefs pointing at a file their symbols left is
  how the next session spends an hour before noticing.

## Traps

- **The browser will serve you a stale `panel.js`.** `express.static` sets ETags,
  so a normal reload revalidates - but Chromium's in-session memory cache can
  still hand back the previous file, and an edit that "did nothing" is almost
  always this. Hard-reload, or keep DevTools open with cache disabled. This trap
  did not exist while everything was inlined in a document that was never
  cached, and it is the single most likely way to lose an hour on this brief.
- **`</script>` inside a JS string literal.** Harmless in an external file,
  fatal on the way out if the extraction is done by a tool that pattern-matches
  the closing tag rather than the tag at line 4099. There are none in this file
  today; the trap is in how you cut, not in what you cut.
- **The two-space indent.** The inline script's body is indented two spaces
  because it lived inside a tag. Dedenting is optional but must be all-or-
  nothing - a partial dedent makes every subsequent line number in the diff
  useless for step 5.
- **`.gitattributes` says `* text=auto eol=lf`.** New files inherit it, so do not
  "fix" line endings you think you see. A CRLF pass over `panel.js` would show as
  a 2,526-line diff on a brief whose whole claim is that nothing changed.
- **Verification step 3 is where a real regression would hide.** A `<style>` in
  head and a `<link>` in head have the same cascade position - but only if the
  `<link>` is at the same position. Put it after something that was previously
  after the style block and you have silently reordered the cascade. There is
  only one stylesheet, so this is cheap to get right and easy to not check.
- **Do not "improve" `COMMANDS` while you are in there.** Every entry wraps its
  call in an arrow (`run: () => togglePause()`), which looks like indirection
  worth removing and is in fact what will make the module split's import cycles
  harmless. It stays.

## Out Of Scope

- **ES modules and the state architecture.** Brief 033, gated on step 4's table.
- **Splitting `panel.js` into domain files.** Same brief. The eleven groups named
  in step 4 are a measurement aid, not a proposed file layout.
- **Splitting `panel.css`.** Cheap and safe later; it buys nothing until a brief
  exists that touches CSS without touching JS, and none of 027-030 do.
- **Any behaviour change at all**, including ones this brief's reading makes
  obvious. `.control-split-caret.open` setting `border-color` on a `border: none`
  element is dead code and brief 028 already owns deleting it.
- **`server.js`.** It already serves `public/` and needs no change. If it turns
  out to need one, that is an escalation, not a step.
- **The 140KB README screenshot and `docs/panel.png`.** Untouched.

## Escalate Instead Of Deciding

- **If step 4 finds more than ~15 bindings assigned from two or more groups**,
  stop and report rather than reasoning ahead about brief 033. That count is the
  difference between "each module keeps its own state" and "the panel needs a
  state object", and it is an architecture decision that belongs to an authoring
  session with the table in front of it.
- **If any computed style differs in Verification step 3**, do not adjust CSS to
  make it match. A difference means the move was not a move; find what changed.
- **If `node --check` fails on `panel.js`**, the cut was wrong, not the code.
  Re-cut from the frozen baseline rather than patching the extracted file.
