---
id: brief-012
state: ready
created: 2026-08-06
updated: 2026-08-06
agent: user
project: LOL-REPLAY-CONTROLLER
depends_on: [brief-006, brief-007, brief-008]
---

# Brief 012: Depth Of Field + Fog

Closes [#6](https://github.com/fletch-spec/lol-replay-interface/issues/6).

## Problem Statement

Brief 006 stripped the HUD, so the footage no longer looks like a scoreboard.
It still looks like a game being rendered flat. Depth of field and fog are the
layer that makes a shot read as footage rather than gameplay - a fight with the
far side of the map faded out and everything outside the focal band softened is
the difference between a screen recording and something you'd put in a video.
The API exposes all of it, and the panel touches none of it. Brief 006 asked for
these and deferred them because the toggle grid was already full and brief 007
was about to rewrite that layout; 007 has now landed, so the layout question is
answered and this is the last thing the panel can't do.

Runs last: it is the largest new surface, and it wants the camera work in 008
settled underneath it before it starts adding preset-bound effects.

## Done Looks Like

You can set up a shot - pick a camera preset, soften the background, drop fog
into the river - and save it, and coming back to that preset later gives you the
same shot rather than the same camera angle with the effects gone. Turning
everything off is one action and returns the replay to plain rendering. Nothing
is on by default.

## Hardest Part

**Depth of field is camera-relative and the camera moves.** The focal bands are
distances *from the camera*, and brief 006's follow-cam distance slider runs the
camera from ~700 to ~14000 units out. A `depthOfFieldMid` tuned at one distance
is focused on empty air at another, so a single global DoF setting is wrong
almost everywhere.

There are two defensible answers and this brief has to pick one before building
any UI:

1. **Bands scale with `followDistance`** - DoF works everywhere, at the cost of
   the numbers meaning something different depending on zoom.
2. **DoF belongs to camera presets only** - fixed vantage points have a fixed
   distance, so the bands are meaningful. Follow-cam gets fog but not DoF.

Decide this first. Building the sliders before deciding means building them
twice.

## Can't Skip

- **Everything off by default.** Brief 006's warning stands: dramatic in stills,
  distracting across 30 minutes of narration. A fresh panel must render exactly
  as it does today.
- **Camera presets carry these settings.** A "dragon pit" preset that restores
  position, rotation and FOV but not its fog and DoF is half a preset. Presets
  saved before this brief must still load without error and without applying
  garbage - they have no such fields.
- **One action turns everything off**, without having to remember which of the
  three systems you touched.
- **Verify by read-back, not status code.** The API returns HTTP 200 for field
  names that don't exist and silently ignores them. Confirm each field from the
  1Hz render broadcast.
- **No new write path.** Use the existing `postRender()`; do not add a second
  way to talk to `/replay/render`.
- **Never send `cameraMode: "tps"`.** It closes the game, reproduced twice.
- Do not dump sixteen sliders into the scene card. Brief 007 just laid this
  panel out; respect it.

## Notes

**Read `/Help?format=Full&target=Render` first**, not this field list. It
carries descriptions the swagger JSON drops entirely. The list below is from a
live GET and is grouped by system, but the semantics of the numeric fields have
not been verified against the client's own docs.

```
depthOfFieldEnabled, depthOfFieldNear, depthOfFieldMid, depthOfFieldFar,
depthOfFieldWidth, depthOfFieldCircle, depthOfFieldDebug

depthFogEnabled, depthFogColor, depthFogStart, depthFogEnd, depthFogIntensity

heightFogEnabled, heightFogColor, heightFogStart, heightFogEnd, heightFogIntensity
```

**Three systems, not one.** Worth keeping distinct in the UI:

- **Depth of field** - blurs outside a focal band. `Near`/`Mid`/`Far` are the
  distance bands, `Width` how wide the sharp band is, `Circle` the bokeh size.
- **Depth fog** - fog by distance from camera. Fades the far side of the map.
- **Height fog** - fog by world height. Pools in low ground and the river.

`depthOfFieldDebug` visualises the bands. Likely the fastest way to tune the
focal distance without guessing - try it early, and consider leaving it behind a
modifier rather than shipping it as a visible control.

**These are sliders and colour pickers, not chips.** The HUD toggles are
booleans and the chip grid suits them. This is a different control vocabulary,
which is part of why it wants its own home rather than more chips in the scene
card. A collapsed disclosure that is closed by default would keep the panel
readable, given everything here is off by default anyway.

**Fog colour is a `Color`/`ColorValue` in the schema, not a hex string.** Check
its shape before building a picker.

**Preset migration.** Existing presets in `localStorage` under
`campresets:<mapName>` hold `{name, position, rotation, fov}`. Loading one that
predates this brief must leave the effects alone rather than applying
`undefined`, and re-saving it should capture the current settings. This is the
most likely place for a silent bug.

**Interaction with the follow-cam.** Fog is camera-position-independent and
should work under the follow-cam without any special handling. DoF is the one
that needs the Hardest Part decision. If the answer is "presets only", say so in
the UI rather than letting someone tune a DoF that does nothing while a
champion is locked.

**Out of scope:** `/replay/sequence`, still. Keyframed effects over time serve
edited cinematics rather than live control. Also out of scope: `sunDirection`
and the skybox fields - same category, but nobody has asked for them and this
brief is already the largest remaining surface.
