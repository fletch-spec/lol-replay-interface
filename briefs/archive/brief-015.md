---
id: brief-015
state: complete
created: 2026-08-07
updated: 2026-08-07
agent: user
project: LOL-REPLAY-CONTROLLER
depends_on: [brief-007, brief-013, brief-014]
executes_after: brief-014
model: sonnet
---

# Brief 015: Roster Density and Spacing Pass

> Last of the queue, deliberately. Briefs 013 and 014 both add to the panel;
> laying it out before they land means laying it out twice.
>
> Line numbers are from commit `d0ae049`.

## Problem Statement

The roster is two full-width rows of five cards between the status bar and the
transport - the largest block on the panel, given to information you glance at,
sitting above the instrument you actually drive. It works: portrait locks the
camera, name selects the target frame, and the review confirmed both. It just
costs more vertical space than it earns.

Alongside that, three rows have spacing that reads as inconsistent rather than
deliberate: the transport control row, the cue controls row, and the roster
card's own internals.

## Done Looks Like

The timeline sits higher on the panel, the roster takes visibly less vertical
space, and both per-player controls work exactly as they do now with their state
indicators intact. Spacing follows one written-down scale instead of per-element
values.

## Decision (already made - do not re-litigate)

### 1. The roster gets denser in place. It does not move next to the rail.

The review suggested "two column layout instead next to the event/cue list for
example". Costed and rejected, because of where the horizontal budget already
went:

- The panel is 1400px wide *because* brief 007 widened it for pixels-per-minute
  on the scrub track.
- `.timeline-row` (401) is `.scrub-area` (flex:1) plus a 330px `.rail`, giving
  the track roughly 986px.
- Putting the roster beside the rail means putting it inside that row, and every
  pixel it takes comes off the scrub track - which brief 014 has just spent on
  making markers readable.

Trading marker legibility for roster placement swaps one review complaint
directly for another. The complaint was "takes up lots of space", and vertical
space is what it actually costs.

### 2. Primary approach: one row of ten cards, with a measured fallback

Replace the two labelled team rows with a single row: five blue, a visible team
divider, five red. This halves the roster's height at no horizontal cost.

**This has a gate.** At 1400px, ten cards share about 1288px after gaps, so each
card gets ~128px against a 44px portrait plus text. That is tight. Build it,
then check the acceptance measurement in Verification step 3. If a champion name
does not fit legibly, **fall back to two compact rows** - smaller portrait,
tighter padding, the hint line moved to a `title` - rather than shrinking text
until it is unreadable or stealing width from the track. Either outcome is a
pass; a 9px champion name is not.

### 3. One spacing scale, defined as CSS custom properties

Add to `:root` and use them. The complaint is inconsistency, so the fix is a
small set of values applied everywhere, not per-element nudges:

```css
--space-1: 4px;   --space-2: 8px;   --space-3: 12px;   --space-4: 16px;
```

Reconcile the known offenders to it: `.panel` gap 12 (already `--space-3`),
`.card` padding `12px 16px` (already `--space-3` / `--space-4`), and
`.transport > *` padding `13px 16px` (390) - the 13 is the odd one and becomes
12.

### 4. The transport row gets grouping, not different gap values

Its oddness is structural. `.transport-controls` (1066) is one flex row holding
`« 5s`, `Pause`, five speed buttons, and two event steppers - nine buttons with
a uniform 10px gap and nothing saying which belong together. Separate the three
groups with the existing `.control-sep` (already used in `.cue-controls` at
1240) rather than by tuning gaps.

## Where The Code Is

| What | File | Symbol | Line |
|---|---|---|---|
| Roster container | `app/public/index.html` | `.roster` | 51 |
| Roster hint line | `app/public/index.html` | `.roster-hint` | 162 |
| Team block + label | `app/public/index.html` | `.roster-block` / `-label` | 168 / 173 |
| Card row | `app/public/index.html` | `.roster-list` | 180 |
| One card | `app/public/index.html` | `.roster-item` | 190 |
| **Duplicate declaration** | `app/public/index.html` | `.roster-info` | 248 **and** 275 |
| Portrait sizes | `app/public/index.html` | `.roster-portrait*` | 216-274 |
| Card markup build | `app/public/index.html` | `buildRosterItem()` | 1541 |
| Team split + render | `app/public/index.html` | `renderRoster()` | 1732 |
| Panel shell | `app/public/index.html` | `.panel` / `.card` | 301 / 318 |
| Transport sections | `app/public/index.html` | `.transport > *` | 390 |
| Transport row | `app/public/index.html` | `.transport-controls` | 1066 |
| Cue controls row | `app/public/index.html` | `.cue-controls` | 875 |
| Timeline row | `app/public/index.html` | `.timeline-row` | 401 |
| Roster markup | `app/public/index.html` | `.roster` block | 1167-1177 |

## Implementation Steps

1. **Measure first and write the numbers down.** With a replay loaded at 1400px,
   record in the console: `.scrub-track` width, `.roster` height, and total
   `.panel` height.
   ```js
   ['.scrub-track','.roster','.panel'].map(s => [s, document.querySelector(s).getBoundingClientRect()])
   ```
   *Done when:* you have three before-numbers. Every claim in this brief is
   measured against them.

2. **Collapse the duplicate `.roster-info`.** Declared at 248 (cursor, radius,
   padding, margin) and again at 275 (min-width, flex) with a comment
   acknowledging the split. One block.
   *Done when:* one `.roster-info` rule, no visual change.

3. **Fix `.roster-list` gap behaviour.** It uses `justify-content: space-between`
   (186) against cards capped at `max-width: 240px` (196), so the real gap grows
   with panel width and the declared `gap: 10px` never applies. That is why
   roster spacing looks different at different widths. Drop `space-between`, let
   the gap be the gap.
   *Done when:* card spacing is the same at 1200px and 1400px.

4. **Add the spacing custom properties** and apply them to `.panel`, `.card`,
   `.transport > *`, `.roster*`, `.cue-controls` and `.transport-controls`.
   *Done when:* those rules reference tokens, and `13px` appears nowhere.

5. **Build the single-row roster.** Ten `.roster-item`s in one `.roster-list`,
   with a team divider between the fifth and sixth. `renderRoster()` (1732)
   already splits `blue`/`red` and passes an offset into `renderTeamBlock()`
   (1593) for the player numbering - keep that numbering, it feeds
   `rosterDisplayName()` and the hide-names mode.
   *Done when:* one row of ten, teams still visually distinguishable.

6. **Give the roster a border, or decide it should not have one.** `.roster` is
   the only top-level block that is not a `.card` (301, 318), so it has no border
   while everything above and below does - part of why it reads as loose. Pick
   one deliberately and say which in the Outcome.
   *Done when:* the panel reads as a consistent stack of blocks.

7. **Group the transport row** with `.control-sep` per decision 4: seek controls
   | pause | speed presets | event steppers.
   *Done when:* the row reads as four groups rather than nine buttons.

8. **Re-measure.** Same three numbers as step 1.
   *Done when:* `.roster` height is down, `.scrub-track` width is **unchanged**,
   and `.panel` height has not grown.

## Verification

1. **Scrub track width is identical before and after.** Not "about the same" -
   identical. If it moved, something took width from the timeline and that is a
   fail regardless of how the roster looks.
2. Roster height is measurably lower. State the before/after numbers.
3. **Legibility gate:** at 1400px with the longest champion names available
   (Cho'Gath, Seraphine, Renekton, Nunu & Willump), every name is fully readable
   or cleanly ellipsised, at no smaller than the current 12px. If not, take the
   two-compact-rows fallback from decision 2.
4. Click a portrait: camera locks, card shows `cam-locked`.
5. Click a name: target frame selects, card shows `frame-selected`.
6. KDA/CS still updates at 1Hz.
7. Hide names still swaps to `Player N` and back.
8. With no replay loaded, the roster and transport still dim and reject clicks
   (`.roster.disabled` at 58, `.transport.disabled` at 396).
9. At 1920x1080 with the panel at max width: no horizontal overflow, and no
   vertical scrollbar that was not there before. Brief 007's measurement was
   1400x887 in 1919x905 - with brief 013's editor section open, match or beat the
   height budget or say explicitly what it now costs.
10. The status bar, the event/cue rail, the time readout and the legend are
    visually unchanged. The review called these fine; if they moved, revert them.

## Can't Skip

- **The scrub track does not get narrower.** Hard requirement, measured.
- **Both roster controls survive** with their indicators, plus the hint that
  explains which is which (it may move into a `title`, but the affordance cannot
  simply vanish).
- **Do not touch what the review called fine**: status bar, rail, time readout,
  legend.
- **No horizontal overflow at 1920x1080**, no new vertical scroll.
- **One spacing scale, written down.** Not per-element nudges.
- **The disabled states still read.**
- **No change to what any control does.** This brief moves and spaces things. It
  does not add or remove a single command.

## Traps

- **This is the third layout pass on this panel** (brief 007, then the
  2026-08-06 UI session). Each previous one traded a set of complaints for a
  different set. Change what the review names; leave alone what it calls fine.
  Scope discipline is the main risk in this brief, not CSS.
- **`renderRoster()` rebuilds the whole roster at 1Hz.** Any layout that depends
  on measuring after render will thrash. Keep it declarative CSS.
- **`playerByName` is built in `renderRoster()`** (1734) and the event timeline
  depends on it to resolve summoner names to champions and team colours. Do not
  restructure the render path in a way that changes when that map is populated -
  `markersRenderedWithoutTeams` (2050) exists to repaint markers once names
  resolve, and it is easy to break from here.
- **The hide-names numbering comes from the render offset.**
  `renderTeamBlock(container, players, offset)` (1593) numbers red players
  starting after blue. Collapsing to one list must preserve that or Player 6-10
  will renumber.
- **`.roster-item` is `flex: 1 1 0` with `max-width: 240px`** (195). In a
  ten-card row the max-width stops mattering and `min-width: 0` becomes what
  keeps the text ellipsising. Do not remove it.
- **The panel's max-width is 1400 for a reason** (303-306). Do not widen it to
  make the roster fit - that is spending the user's second monitor to avoid a
  layout decision.
- **Brief 013 added a section to `.transport`.** `.transport > * + *` (393)
  auto-borders each new section, so the editor row already has a hairline. Check
  the spacing pass does not double it.

## Out Of Scope

The colour scheme, the card system itself, responsive behaviour below 1400px,
dark/light theming, animation, and any change to what a control does. Also out:
the marker gutter (brief 014 owns it) and the cue editor's internal layout
(brief 013 owns it) - this brief spaces the containers, not their contents.

## Escalate Instead Of Deciding

- If the single-row roster fails the legibility gate *and* the two-row fallback
  does not save meaningful height, stop and report rather than inventing a third
  layout. The honest answer may be that the roster is already about as small as
  it can usefully be.
- If brief 013's editor section makes the panel taller than the viewport at
  1920x1080, that is a real conflict between two shipped briefs and it needs a
  decision about which one gives - not a quiet shrink of the scrub track.

## Outcome (2026-08-07)

**Took the two-row fallback, not the primary single-row approach - measured,
not guessed.** Built the single row of ten first as decided. At 1400px each
card measured ~115px total; after the 44px portrait, the gap and the item's
own padding, the champion-name element's `clientWidth` was **37px** - even
`Renekton` (8 characters) overflowed and had to ellipsize down to about 3
visible characters. That's not "cleanly ellipsised," so per the brief's own
gate this took the documented fallback: two rows, smaller portrait (44→32px),
tighter item padding, the hint moved into a `title` attribute on `.roster`
instead of its own line. Re-tested with the brief's named worst-case names
(Cho'Gath, Seraphine, Renekton, Nunu & Willump) at the fallback's actual
182px-wide text column - all four fit with zero truncation, well inside the
gate.

**Before/after, measured at 1400px, both against a live connected replay
with real roster data** (not a static/disconnected snapshot - the pre-session
committed file was temporarily served from `app/public/` to get a real
"before" number under identical conditions, then deleted):

| | Before | After |
|---|---|---|
| `.scrub-track` width | 934px | 934px (unchanged) |
| `.roster` height | 196px | 176px |
| `.panel` height | 694px | 602px (no cue selected) |

Track width is provably unchanged - the hard requirement. Roster height is
down 20px (~10%), more modest than the single-row approach would have been,
but the single-row approach didn't survive the legibility gate.

**Found and fixed a real bug that was inflating every height measurement
along the way:** brief 013's `.cue-editor { display: flex; ... }` rule beats
the browser's default `[hidden] { display: none }` UA style at equal
specificity, so the editor was rendering - and holding ~160px of `.transport`
height - even while `.hidden` correctly read `true` in JS and every check in
brief 013's own outcome (which only ever tested the JS property, never the
rendered box) passed. Caught here because this brief's own measure-first
step compares raw pixel heights and the number didn't add up. Fixed with an
explicit `.cue-editor[hidden] { display: none; }` rule. This is brief 013's
bug, not this one's, but it shipped silently until a *different* brief's
own discipline (measure, don't assume) caught it - noted in both places.

**Other steps, in order:**
- Collapsed the duplicate `.roster-info` (was declared at two separate rules
  with a comment acknowledging the split) into one.
- Fixed `.roster-list`'s `justify-content: space-between` fighting its own
  `gap` - removed; the gap is now the actual gap at any width.
- Added the four spacing custom properties to `:root` and applied them to
  `.panel`, `.card`, `.transport > *` (the 13px odd-one-out is now 12px, and
  `13px` appears nowhere in the file as a spacing value), `.roster*`,
  `.cue-controls` and `.transport-controls`.
- Gave the roster a `card` border - it was the only top-level block without
  one. Decided deliberately, not by default: the panel now reads as blue
  status / roster / transport, all bordered the same way.
- Grouped `.transport-controls` with the existing `.control-sep`: seek
  controls (« 5s, 5s ») | pause | speed presets | event steppers. This also
  moved `seekFwd`, which had been sitting with the event-stepper group on the
  far side of pause/speed rather than next to `seekBack` - a pre-existing
  split that made "seek controls" not actually adjacent.

**Verified live:** portrait click still locks the camera (`cam-locked`
class, confirmed after the async roster-poll render cycle, not synchronously
- clicking doesn't update the indicator until the next 1Hz poll), name click
still selects the target frame (`frame-selected`), hide-names still swaps to
`Player N` (numbering intact, red still starts at 6), no horizontal or
vertical overflow at 1920x1080 with or without the cue editor open (828px
tall with it open, comfortably inside 1080px - brief 013's escalate
condition about a height conflict does not apply). Did not exercise the
disabled (`no-replay`) state live - toggling the class by hand on a
still-connected session gets immediately overwritten by the next real
`setState('connected', …)` call from the live poll, which is itself
evidence the wiring is live and correct, just not a clean way to observe the
disabled look. `.roster.disabled` / `.transport.disabled` CSS was not
touched by this brief, so there's no reason to expect a regression there
beyond ordinary code review.
