# Known Issues

Open problems and unverified assumptions for the LoL Replay Controller.
Consolidated 2026-08-05 from the Notes section of `lol_replay_controller.md`,
brief Outcome sections, and `ui_polish_plan.md`.

**What goes where.** Planned work → `briefs/`. Confirmed API/client behaviour a
future session must not rediscover → Notes in `lol_replay_controller.md`. This
file → things that are wrong or unverified *right now* and aren't yet a brief.

Format: `[severity] title` — severity is `blocker` / `bug` / `annoyance` /
`unverified`.

---

## Open

### [blocker] Camera does not follow the selected champion

`cameraAttached: true` selects the champion but the camera stays parked, in
every `cameraMode` tested. Blocks brief 006, which must resolve it before
building camera presets — and must treat `cameraMode` writes as carrying real
crash risk (`tps` closed the replay once). No known workaround.

*Full detail — what was tested and what each mode did — is in the Notes section
of `lol_replay_controller.md`. Don't restate it here; keep one copy.*

### [blocker] Spectator hotkeys cannot be driven — confirmed dead end

Synthetic input is blocked by the client, almost certainly Vanguard. Three
methods tested with confirmed focus, zero effect. Listed so it doesn't get
retried, not because it's actionable.

*Full detail in the Notes section of `lol_replay_controller.md`.*

### [unverified] Objective events may be missing from the event feed

The test replay (CLASSIC, 36:35, 135 events) contains **no** `DragonKill`,
`BaronKill` or `HeraldKill` — only 99 `ChampionKill`, 16 `TurretKilled`, 13
`Multikill`, 4 `Ace`, and one each of `FirstBlood` / `FirstBrick` /
`InhibKilled`. Nothing was logged as an unrecognised `EventName`, so these
aren't being miscategorised — they simply aren't in what the client returned.

Consequence: the timeline's objective lane renders empty and the legend
advertises a category that never appears. Check against a second replay before
concluding either "the feed omits them" or "that game genuinely had none".

### [annoyance] Event harvest yanks playback to the end of the game

`harvestEvents()` seeks to `length - 1` to make the client emit its full
cumulative event list, then seeks back. Cached per (gameMode, length) in
`localStorage`, so it's a one-time cost per replay — but the first load of any
new replay visibly jumps the game to the end and back, which is disruptive if
it happens while recording. No fix known that doesn't lose the event list.

### [bug] Gnar's transform 404s the portrait route once per second

While Gnar is transformed, `/liveclientdata/playerlist` reports
`championName: "Mega Gnar"`, which is not a Data Dragon champion id, so
`/portraits/Mega%20Gnar.png` 404s. The roster re-renders at 1Hz, so it retries
forever and fills the browser console with 404s during narration. Spotted
during brief 005 testing; belongs to brief 003's roster code, not 005. Fix is
probably an alias in `normalizeChampionKey` (`server.js`) mapping transform
names back to the base champion — worth checking whether Elise, Nidalee, Jayce
and Karma report similarly.

### [annoyance] Cue lead-in is not editable

Brief 005 asks for a configurable lead-in and ships the storage for it: each
cue carries a `lead` field, persisted and honoured on navigation. There's just
no UI to change it, so every cue uses the 2s default. A small number field next
to the note in the cue list would finish it.

### [annoyance] Two speed buttons can look active at once

`.speed-btn.primary` (the 0.5× recommendation) draws an accent border while
`.speed-btn.active` draws an accent fill, so at any other speed two buttons read
as selected. Queued as phase 4 of `ui_polish_plan.md`.

### [annoyance] Seeks give no in-flight feedback

Seeks lag 100–200ms. The UI shows the optimistic target immediately with no
indication the write is still in flight, which invites a second click. Queued as
phase 4 of `ui_polish_plan.md`.

### [annoyance] Keyboard shortcuts die silently when the panel loses focus

The panel sits on monitor 2 and loses focus constantly. A dead spacebar looks
like a broken app. Queued as phase 4 of `ui_polish_plan.md` (a "keys inactive"
chip driven by `document.hasFocus()`).

---

## Environmental — not bugs in this project

### Another application drives the same replay client

A separate replay-mapping app on this machine writes to the same API. If
playback state changes with no request from this panel, that's the cause. Pause
it before trusting any transport test result.

---

## Resolved

### [bug] Timeline markers were built at the wrong width and never re-measured

Fixed 2026-08-05 (`ui_polish_plan.md` phase 1–2). Marker clustering is computed
in pixels, so markers are only correct for the width they were measured at.
Loaded in a hidden or background tab the panel lays out ~2px wide and all 135
events collapsed into two clusters — reproduced live. A `window.resize` listener
never fires for that, and `ResizeObserver` alone doesn't either: its callbacks
are delivered on the rendering loop, which browsers suspend for hidden tabs.
Fixed with a `ResizeObserver` on the track plus a 1s width poll as backstop.
Latent since brief 004.

### [bug] Clusters made most events unreachable

Fixed 2026-08-05. A cluster marker seeked only to its first event; the rest had
no click target at all. One cluster in the test replay hid five kills. Cluster
markers now expand into a hover card with one clickable row per event.

### [bug] `EventID` is not stable across seeks

Fixed in brief 004, same day it shipped. Dedupe by content fingerprint, never by
`EventID` — anything new that reads `/liveclientdata/eventdata` inherits this.
*Full detail in the Notes section of `lol_replay_controller.md`.*

### [bug] Structure kills displayed raw internal IDs

Fixed 2026-08-05. `Turret — Turret_TChaos_L2_P3_2521511112_0` now reads
`Turret (red) — LittleStep`. Only the team segment of the ID is parsed; the
`L`/`P` numbers have no documented lane mapping, so deriving "bot outer" from
them would print confident nonsense.
