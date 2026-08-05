---
id: brief-006
state: ready
created: 2026-08-04
updated: 2026-08-04
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

**Camera during narration.** Free-flying the camera while talking is genuinely
hard — most people can do one or the other. Fixed presets you snap between are
the realistic workflow. Favour more presets over smoother manual control.

**Sequences.** `/replay/sequence` accepts keyframed camera paths with easing for
automated moves. Deliberately out of scope: it's a rabbit hole, and it serves
edited cinematics rather than live control, which is outside this project's
scope. Note it as a future project if wanted.

**Out of scope:** `/replay/recording` (the client's own capture). OBS is better
and already set up. Do not build against it.
