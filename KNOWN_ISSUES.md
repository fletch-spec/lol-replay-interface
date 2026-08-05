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

### [blocker] `cameraMode: "tps"` reliably closes the game — do not send it

Reproduced 2026-08-05, second occurrence. `POST /replay/render
{"cameraMode":"tps"}` with a valid held selection, paused, was accepted and the
game process was gone seconds later (`League of Legends.exe` absent,
`LeagueCrashHandler64` running). Brief 003 hit the same thing and recorded it as
a one-off worth caution; it is not a one-off, it is 2 for 2. Treat `tps` as
unusable, not risky.

### [RESOLVED] Follow-cam — solved 2026-08-05, see Resolved section

Superseded. `fps` + repeated `selectionName` + `selectionOffset` works. The
mode-by-mode findings below stand and are why it took this long to find.

All five documented `HudCameraMode` values are accounted for:

| mode | result |
|---|---|
| `top` | shipped default. Camera on the game's own directed rails. |
| `fps` | **the only mode that visibly moves the camera.** Free camera — but it does not attach to the selection: position was byte-identical across three different selected champions. |
| `tps` | closes the game. See above. |
| `focus` | selects the champion's info frame, camera stays parked (brief 003). |
| `path` | no visible change (brief 003). |

`cameraAttached` is a **status readout, not a control** — its own description is
a predicate ("True if the camera is attached to an object"), and the `Sequence`
schema carries a keyframe track for every genuinely writable `Render` field
including `selectionName` and `selectionOffset` but has **no track for
`cameraAttached`**. The panel has been writing to it since brief 003 with no
effect. It reads `true` permanently regardless of selection.

Confirmed on-screen by the user during the same test: switching `cameraMode` via
the API did not change the in-game camera mode indicator, which stayed on
"directed camera". The API camera and the spectator client's own directed camera
appear to be separate systems.

The reason all of this looked like a dead end for three briefs: `selectionOffset`
is a **no-op in `top` mode**, because there the camera is on the game's own
directed rails. It only does anything once the camera is free — which is what
`fps` gives you. Nobody had tried the two together. See the Resolved section.

### [bug] The roster lock indicator can't be trusted

`selectionName` clears itself. Observed twice during testing: it read back as
the champion's name for several seconds, then went empty on its own with no
request from the panel. `server.js` polls it once a second to drive the green
"locked" border, so the border drops off spontaneously — and it was never
indicating a camera lock in the first place, only a selection.

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

### [blocker] Follow-cam — SOLVED 2026-08-05

Open since brief 003. The recipe:

1. `POST /replay/render {"cameraMode":"fps"}` — once. This frees the camera from
   the game's directed rails. **Never `tps`; it closes the game.**
2. Then repeatedly `POST /replay/render {"selectionName":"<riotIdGameName>",
   "selectionOffset":{"x":0,"y":900,"z":-600}}` on a timer.

Each POST snaps the camera to that champion's *current* world position plus the
offset. There is no native follow — `selectionOffset` is a one-shot, verified by
holding a selection for 5s of playback with the camera frozen. Re-posting at
400ms synthesises the follow, and the camera tracked a champion smoothly through
a fight. Verified live: the offset applies exactly (champion ground level
y≈53 + `y:900` = camera y≈953), and switching `selectionName` between three
champions put the camera at three distinct, correct map positions.

**`selectionName` must be included in every POST**, not set once — it clears
itself spontaneously (see the roster-indicator bug above).

**Not yet worked out:** `cameraRotation` is untouched by any of this, so the
camera keeps whatever angle it had. A usable over-the-shoulder shot needs a
pitch set alongside the offset. Also unmeasured: what POST rate is smooth enough
without hammering the client — 400ms tracked visibly but was not tuned.

This changes brief 006 materially. Camera presets are no longer the *only*
camera control available, and "lock camera to champion" — the thing brief 003
set out to do and shipped without — is implementable.

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
