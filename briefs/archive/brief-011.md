---
id: brief-011
state: complete
created: 2026-08-06
updated: 2026-08-07
agent: user
project: LOL-REPLAY-CONTROLLER
depends_on: [brief-003, brief-007, brief-010]
executes_after: brief-010
model: sonnet
---

# Brief 011: Narration Papercuts

Closes [#2](https://github.com/fletch-spec/lol-replay-interface/issues/2) and
[#8](https://github.com/fletch-spec/lol-replay-interface/issues/8).

> **Changed 2026-08-07:** this brief used to carry a third item - the per-cue
> lead-in editor, issue
> [#5](https://github.com/fletch-spec/lol-replay-interface/issues/5). That moved
> to brief 013, which redesigns the cue row the control would live in. Two
> briefs owning the same row meant whichever ran second inherited the other's
> layout. Do not add a lead-in control here.
>
> Line numbers are from commit `d0ae049`.

## Problem Statement

Two small things that each survive alone but add friction to every session.
Neither is worth a brief on its own; together they are an afternoon and the panel
stops nagging.

1. **Gnar 404s once a second.** While transformed, the client reports
   `championName: "Mega Gnar"`, which is not a Data Dragon id, so
   `/portraits/Mega%20Gnar.png` 404s. The roster re-renders at 1Hz and rebuilds
   every `<img>` from scratch (`renderRoster()` → `renderTeamBlock()` →
   `buildRosterItem()`), so it retries forever and fills the console with errors
   during narration.
2. **Dead keypresses look like a broken panel.** Hotkeys only fire when the
   browser has focus, which it usually does not while the replay client is
   focused on the other monitor. Brief 007 largely solved this by giving every
   action a button, but a keypress that silently does nothing still reads as a
   bug rather than as "wrong window".

## Done Looks Like

A session with Gnar in it produces a clean console and a visible Gnar portrait in
both forms. Pressing space while the game has focus tells you why nothing
happened, in one chip, without covering anything.

## Decision (already made - do not re-litigate)

**Gnar: fix by alias table, in `server.js`, applied before the map lookup.** Not
by swallowing the 404, and not by retry suppression on the client. The portrait
should appear, not merely stop erroring. `championKeyMap` already handles the
`MonkeyKing`/`Wukong` case by keying on both `id` and `name` (`loadChampionMap()`
at `server.js:85`), so a hardcoded alias applied in `normalizeChampionKey()`'s
caller is the smallest change consistent with what is there.

**Focus: a chip, and nothing more.** `document.hasFocus()` plus `window`
focus/blur events, rendering one chip in the existing `.chips` row. It does not
try to steal focus back, does not manage focus, and does not warn on individual
keypresses. The temptation is to make the panel clever about focus - the answer
is no. This is the stated Hardest Part of this brief and the only thing likely
to go wrong.

## Where The Code Is

| What | File | Symbol | Line |
|---|---|---|---|
| Name normalisation | `app/server.js` | `normalizeChampionKey()` | 77 |
| Champion map build | `app/server.js` | `loadChampionMap()` | 85 |
| Portrait route | `app/server.js` | `servePortrait()` | 107 |
| Roster portrait `<img>` | `app/public/index.html` | `buildRosterItem()` | 1556 |
| Hover-card portraits | `app/public/index.html` | `portraitImg()` | 2182 |
| Status chip row | `app/public/index.html` | `.chips` markup | 1138 |
| Chip styles | `app/public/index.html` | `.chip` | 354 |
| Keydown handler | `app/public/index.html` | `document.addEventListener('keydown')` | 3124 |

## Implementation Steps

1. **Add the alias table in `server.js`**, above `normalizeChampionKey()`:
   normalised-input → Data Dragon id. Apply it inside `servePortrait()` (107)
   before consulting `championKeyMap`, so both the roster and the hover card get
   the fix for free - `portraitImg()` (2182) hits the same route.
   *Done when:* `curl -sI "http://localhost:3000/portraits/Mega%20Gnar.png"`
   returns 200.

2. **Cover the other transforming champions in the same pass.** Gnar is not
   the only champion whose reported name changes at runtime. Check at minimum:
   Elise (spider form), Nidalee (cougar form), Jayce, Karma, Kayn (Rhaast /
   Shadow Assassin), Shyvana (dragon), Swain, Sion, Kled (dismounted), Anivia
   (egg), Maokai, Zac, Aphelios, and any `Super` / `Mega` / `Slayer` prefixed
   name. One alias each is cheap; discovering them one at a time over months is
   not.
   *Done when:* the table has an entry for every runtime name you can find, and
   a comment saying where the list came from.
   **Do not guess the strings.** The only authority is what the client actually
   reports - see the Traps section for how to collect them.

3. **Make an unknown champion name log once, not once per second.** Even with a
   complete alias table, a champion released after this table was written will
   404 forever. `servePortrait()` should log a distinct unresolved name once
   (same shape as `loggedUnknownEvents` at `index.html:1954`) and stay quiet
   afterwards. This is a safety net, not the fix - step 1 is the fix.
   *Done when:* an intentionally bogus name logs one line, not one per second.

4. **Add the focus chip.** A `<span class="chip focus">` in the `.chips` row
   (1138), shown only when `document.hasFocus()` is false. Wire it to `window`
   `focus`/`blur` plus one read on load. Wording is about the *panel*, not the
   game: **"click panel for keys"** says what to do; "not focused" does not.
   *Done when:* clicking the game window makes the chip appear, clicking the
   panel makes it vanish, with no polling loop.

5. **Confirm the chip never covers a control.** It is an inline chip in an
   existing flex row, so this should be free - but the row already holds four
   chips and wraps (`.statusbar` has `flex-wrap: wrap` at 329). Check at 1400px
   that adding a fifth chip does not push the scene controls onto a second line.
   *Done when:* the status bar is one line at 1400px with the chip visible.

## Verification

**Gnar:**
1. Open a replay containing Gnar. Let it play until he transforms.
2. Console is clean - no repeated 404s.
3. The portrait is visible in both forms.
4. `curl -sI "http://localhost:3000/portraits/Mega%20Gnar.png"` → 200.

**Focus chip:**
1. Panel focused: no chip. Press space - playback toggles.
2. Click the replay client window. The chip appears within a frame.
3. Press space. The game responds, the panel does not, and the chip explains why.
4. Click the panel. The chip disappears, space works again.
5. At 1400px the status bar is still a single row.

## Can't Skip

- **Gnar's portrait resolves while transformed**, and the fix is a name mapping
  rather than swallowing the 404.
- **Check the other transforming champions in the same pass**, per step 2.
- **The focus chip never covers a control**, and disappears the moment focus
  returns.
- **No focus stealing.** The panel never calls `window.focus()`, never warns per
  keypress, and never tries to route keys it did not receive.
- **No new commands.** Brief 007 settled the command table; this brief adds none
  and changes what none of the existing keys do.

## Traps

- **Do not invent the alias strings from memory.** The name the client reports
  is not always the obvious one, and a wrong alias is worse than a missing one -
  it maps a champion to the wrong portrait silently. Collect real values: add a
  one-line log of every distinct `championName` seen in `pollRoster()`
  (`server.js:206`), run through replays containing the transforming champions,
  and build the table from what comes out. If you cannot observe a champion,
  leave it out and say so rather than guessing.
- **`normalizeChampionKey()` strips non-alphanumerics and lowercases**, so
  `"Mega Gnar"` becomes `megagnar`. Alias keys must be in that same normalised
  form or they will never match.
- **The roster rebuilds every `<img>` at 1Hz.** The `error` handler at 1559
  replaces the image with a text fallback, and then the next poll builds a fresh
  `<img>` and tries again. Any "only retry once" logic on the client side will be
  wiped by the next render - which is why the fix belongs in `servePortrait()`.
- **Portraits are disk-cached** under `app/cache/portraits/` (`servePortrait()`
  at 111). After fixing an alias, an old 404 is not cached (only successes are
  written), but do check the directory if a portrait resolves to the wrong image.
- **`document.hasFocus()` is false while devtools has focus.** Expect the chip
  to appear while you are debugging; that is correct behaviour, not a bug.
- **The keydown handler already returns early for `INPUT`/`TEXTAREA`/
  contenteditable** (3127). Do not add focus logic there - the chip is a display
  concern and the handler is fine as it is.

## Out Of Scope

Rebinding hotkeys, changing what existing keys do, adding commands, the per-cue
lead-in editor (moved to brief 013), and the legend - brief 010 owns whether the
objective entry stays, and 015 owns its spacing.

## Escalate Instead Of Deciding

- If a transforming champion turns out to report a name that collides with a
  different real champion's id, stop - that is a mapping ambiguity and guessing
  it wrong shows the wrong face during narration.
- If the focus chip starts wanting to know *which* window has focus rather than
  just "not this one", that is the scope creep this brief is written against.
  Stop and ask.

## Outcome (2026-08-07)

Shipped both items, narrower than the brief's champion list because of what
this session could actually observe.

**Gnar fix:** `CHAMPION_NAME_ALIASES` added in `server.js`, consulted in
`servePortrait()` before the `championKeyMap` lookup, keyed post-
`normalizeChampionKey()` exactly as the Traps section warns. `curl -sI
".../Mega%20Gnar.png"` → 200, confirmed byte-identical to `Gnar.png` (same
sha256), and confirmed live in the panel's own roster - seeked the loaded
replay to a timestamp where Gnar was transformed, read the actual `<img>`
element back, real `src`, no `.roster-portrait-fallback` node. Unresolved
names log once via `loggedUnresolvedChampions`, verified with a bogus name:
three requests, one log line.

**Did not guess the rest of the list, per the brief's own instruction.**
Swept the one available replay's entire timeline (30 samples, every 60s)
against `/liveclientdata/playerlist` rather than eyeballing it, and diffed
every distinct `championName` per player. Result: `Mega Gnar` is the only
transformed name that occurred. Kayn was in this game and never left
`"Kayn"` - no Rhaast/Assassin transform happened. Elise, Nidalee, Jayce,
Karma, Shyvana, Sion, Kled, Anivia, Maokai, Zac and Aphelios were not in the
roster at all this session, so per the brief's explicit instruction they are
left out rather than guessed. The alias table's comment records exactly this
so the gap doesn't look like an oversight later.

**Focus chip:** `document.hasFocus()` plus `focus`/`blur` listeners, no
polling loop, wired to a `.chip.focus` matching the existing `.chip.loop`
show/hide pattern exactly (`display: none` / `.visible`). Verified the
underlying logic both directions by overriding `document.hasFocus` and
calling the handler directly (hides when true, shows when false); verified
the real-world half separately since the tab's actual focus state during
this session was itself unfocused (this session cannot click the real
League client window, or a browser window, to trigger genuine OS focus
changes) - `updateFocusChip()` correctly showed the chip against that real,
unforced state on load. At 1400px, all four visible chips plus the scene
controls measured at the same `top` offset - one row, not two.

**Not verifiable this session, flagged rather than assumed passing:** the
brief's own Verification steps 1-3 for the focus chip describe pressing
`Space` with the panel focused vs. the game client focused and confirming
which one responds. This session has no way to focus an actual second
window (there is no second window - only the panel, reachable through a
real browser, and the API). The keydown handler itself (3127) was not
touched, so there's no reason to expect a regression, but "no reason to
expect one" is not the same evidence as watching it happen - worth a quick
manual check.
