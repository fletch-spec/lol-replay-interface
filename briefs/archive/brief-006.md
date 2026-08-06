---
id: brief-006
state: complete
created: 2026-08-04
updated: 2026-08-05
agent: user
project: LOL-REPLAY-CONTROLLER
depends_on: [brief-001]
---

# Brief 006: HUD Toggles + Camera Presets

## Problem Statement

Replay footage with the full spectator HUD burned in looks like a scoreboard, not
a video. Cleaning it up means toggling eight-odd settings in an in-game menu that
itself appears on the capture. Meanwhile `/replay/render` exposes all of them,
plus full camera control, as plain booleans and vectors — so both problems are
one panel section.

## Done Looks Like

A single "cinematic" button strips the HUD to nothing in one press, and pressing
it again restores it. Individual toggles for minimap, scoreboard, health bars,
particles, and floating text are available for finer control. Camera position and
rotation can be saved as named presets and restored with one click, so you can
jump to a fixed angle over dragon pit or mid lane and back.

## Hardest Part

`/replay/render` is a large object and the API may require the *whole* object on
POST rather than a partial patch — meaning a read-modify-write cycle for every
toggle, and any field you fail to preserve gets reset. Establish whether partial
POSTs work before building the toggle grid.

## Can't Skip

- Test a partial POST first: send `{interfaceMinimap: false}` alone and check
  nothing else changed. If fields reset, implement read-modify-write for all
  writes.
- Cinematic toggle stores the *previous* HUD state and restores it exactly.
  Not "restore to defaults" — to whatever it was.
- Camera presets persist to `localStorage`, named, keyed by map.
- Field of view control, since it's the highest-impact single cinematic setting.
- Do not use `interfaceAll: false` as the cinematic implementation without
  testing — it hides the replay control bar too, which removes your in-game
  visual reference. Verify this is acceptable or compose the toggle from
  individual fields.

## Notes

**Endpoint:**

```
GET  /replay/render
POST /replay/render
```

Relevant fields (verify against `/docs` — this list is from memory):

```
interfaceAll, interfaceScore, interfaceScoreboard, interfaceFrames,
interfaceMinimap, interfaceChat, interfaceTarget, interfaceQuests,
interfaceAnnounce, interfaceReplay, interfaceTimeline, interfaceKillCallouts,
healthBarChampions, healthBarStructures, healthBarWards, healthBarPets,
healthBarMinions,
particles, floatingText, outlineSelect, outlineHover, environment, characters,
cameraPosition {x,y,z}, cameraRotation {x,y,z}, cameraAttached, cameraMode,
fieldOfView, nearClip, farClip,
depthOfFieldEnabled, depthOfFieldCircle, depthOfFieldWidth,
depthOfFieldNear, depthOfFieldMid, depthOfFieldFar,
depthFogEnabled, depthFogColor, depthFogStart, depthFogEnd,
sunDirection, skyboxRotation, skyboxOffset, skyboxRadius
```

**Camera coordinates are world-space.** Presets do not transfer between maps —
Summoner's Rift coordinates mean nothing on ARAM. Key presets by map (from
`/replay/game` `gameMode`) or they'll silently send the camera into the void.

**Depth of field** is the difference between "screenshot" and "cinematic", and
also the easiest thing to overdo. Expose it but keep it off by default. Same for
fog — dramatic in stills, distracting over 30 minutes of narration.

**Interaction with brief 003.** If the keystroke bridge worked, camera presets
are a secondary tool and this brief is polish. If the bridge failed, presets are
your *only* camera control and this brief becomes the priority — build it right
after 002 and invest more in it. Check `brief_log.md` for the 003 outcome before
sizing this.

**UPDATE 2026-08-05 — read this before sizing the brief.** Both premises above
are now out of date:

- **Follow-cam works.** Solved outside the brief queue; full recipe in
  `KNOWN_ISSUES.md`. One POST: `cameraMode:"fps"` + `selectionName` +
  `cameraAttached:true` + `selectionOffset` + `cameraRotation`. So presets are
  *not* the only camera control, and "lock camera to champion" — brief 003's
  original goal — is now a one-liner this brief should wire into the roster.
- **`cameraMode:"tps"` closes the game.** Reproduced twice. Do not send it.
  `fps` is safe and is what the follow-cam needs.
- **Partial POSTs are supported**, documented: "Allows modifying the current
  render properties. All values are optional." The read-modify-write fallback in
  Hardest Part is not needed. Note the API returns **HTTP 200 for unknown field
  names and silently ignores them** — a typo in the toggle grid will look like
  success, so verify each toggle by reading the field back, not by status code.
- **Read `/Help?format=Full&target=Render`**, not the field list in these Notes.
  It carries descriptions the swagger JSON omits entirely.

**Requested feature: zoom slider.** Follow-cam framing is set by
`selectionOffset` distance, and the first fixed value tested read as too close.
Scaling the offset while holding the `y:z` ratio keeps the aim constant — e.g.
`{y:900,z:-600}`, `{y:1800,z:-1200}` and `{y:2700,z:-1800}` are all pitch 56.3°,
just further out. So a single "distance" slider can drive both offset components
from one number without ever recomputing rotation. `fieldOfView` (default 45) is
a second, different kind of zoom — expose whichever reads better, but they are
not interchangeable.

**Camera during narration.** Free-flying the camera while talking is genuinely
hard — most people can do one or the other. Fixed presets you snap between are
the realistic workflow. Favour more presets over smoother manual control.

**Sequences.** `/replay/sequence` accepts keyframed camera paths with easing for
automated moves. Deliberately out of scope: it's a rabbit hole, and it serves
edited cinematics rather than live control, which is outside this project's
scope. Note it as a future project if wanted.

**Out of scope:** `/replay/recording` (the client's own capture). OBS is better
and already set up. Do not build against it.

## Outcome (2026-08-05)

Shipped. Every Can't Skip item verified against a live replay.

**Hardest Part was a non-issue, and the docs said so.** Partial POSTs work:
sending `{"interfaceMinimap": false}` alone changed exactly **1 of 66 fields**,
diffed field by field. The client documents this too — `PostReplayRender` reads
"All values are optional." No read-modify-write anywhere.

The real trap is the opposite one: **the API returns HTTP 200 for field names
that don't exist and silently ignores them.** Confirmed by posting
`cameraLookAtTarget` and a deliberate nonsense control — identical 200s, neither
appearing in a subsequent GET. A status code proves nothing here, so every
toggle reflects state read back from the 1Hz render broadcast rather than
assuming the write landed.

**`interfaceAll: false` was tested and rejected as the cinematic implementation.**
It does not cascade — the individual `interface*` booleans keep their values, so
it is cleanly reversible, and it also flips `interfaceAnnounce`. But per the
brief's warning it takes the in-game replay control bar with it. Cinematic is
composed from 16 individual fields instead, with `interfaceReplay` deliberately
excluded so that reference stays on screen.

**Amended 2026-08-06, post-brief, at the user's request:** restore now forces a
minimum set back on regardless of what was saved — minimap, frames, target
frame, all five health bars, and fog of war. Exact restore alone could hand back
a state you can't work in: if those were already off when you hit Cinematic,
turning it off left you without a minimap or health bars and looked like the
restore had failed. Everything outside that floor still restores exactly. The
FOV slider this brief shipped was also removed — camera distance is the zoom
that matters and two interacting "zoom" controls was worse than one; FOV is
still carried through camera writes so locking a champion doesn't reset it.

**Cinematic restore is exact, not defaults.** Verified from a deliberately mixed
starting state (minimap on, scoreboard off, wards off, chat on): all 16 fields
went false, `interfaceReplay` stayed true, and restoring returned every field to
its exact prior value including the ones already off. The snapshot persists to
`localStorage`, so a browser reload mid-cinematic can still put the HUD back.

**Camera presets** save position + rotation + FOV, named, keyed by `mapName`
from `/liveclientdata/gamestats` (`Map11`), persisted to
`campresets:<mapName>`. Verified: saved a vantage point, moved the camera well
away, clicked the preset, and position/rotation/FOV all came back exactly.
Applying a preset sends `cameraMode: "fps"` and `cameraAttached: false` —
`fps` because in `top` mode the camera is on the game's rails and a written
`cameraPosition` does nothing, and detaching because a preset is a fixed vantage
point rather than a follow.

**The camera premise in this brief was already obsolete when it started.**
Follow-cam was solved outside the queue (see `KNOWN_ISSUES.md`), so presets are
a secondary tool, as the brief's own "Interaction with brief 003" note
anticipated for the case where the bridge worked. `cameraMode: "tps"` was never
sent — it closes the game, reproduced twice.

**Not done:** depth of field and fog. The brief says expose them but keep them
off by default; they are the "screenshot vs cinematic" controls and none of the
16 fields behind them are wired up. Deliberate — the toggle grid is already at
17 chips and brief 007 is about to review this layout. `/replay/sequence` stayed
out of scope as instructed.
