---
id: brief-008
state: ready
created: 2026-08-06
updated: 2026-08-06
agent: user
project: LOL-REPLAY-CONTROLLER
depends_on: [brief-006]
---

# Brief 008: Camera Stability

Closes [#3](https://github.com/fletch-spec/lol-replay-interface/issues/3).

## Problem Statement

The follow-cam works, and then the mouse touches the game window and it doesn't.
`fps` mode leaves the client's own First Person Camera controls live, so any
mouse movement over the game overwrites `cameraRotation`, and bumping the screen
edge flips the client to manual camera - which resets `cameraMode` to `top` and
makes every camera field inert until something re-asserts it. Measured directly:
a rotation set to `{0, 56, 0}` read back as `{21.1, 48.8, 0}` after a few seconds
of the mouse being over the game. During a recording that means the shot drifts
off the champion mid-sentence and there is no way to get it back without
stopping to re-lock. The API documents `cameraLockX/Y/Z` as "Lock FPS Camera at
x axis", which is the obvious guard, and nobody has ever sent them.

## Done Looks Like

You lock the camera to a champion, move the mouse across the game window, and
the shot stays where you put it. If the camera does get disturbed - by the
client's own camera dropdown, an edge bump, or anything else - the panel notices
and the shot comes back without you having to work out what happened.

## Hardest Part

Finding out what `cameraLockX/Y/Z` actually lock. The names say "Lock FPS Camera
at x axis" and that is the entire documentation. They could lock rotation about
an axis, lock position along an axis, or clamp one component of the look
direction. All three are plausible and they imply different guards.

This is a testing brief before it is a building brief. Establish what the three
flags do, one at a time, with the mouse deliberately disturbing the camera
between reads - then decide what to do with them.

If they turn out not to guard rotation at all, the fallback is re-asserting the
camera from the panel, and the brief becomes about doing that without fighting
the user when they *want* to move the camera manually.

## Can't Skip

- **Establish what each of `cameraLockX`, `cameraLockY`, `cameraLockZ` does**,
  individually, verified on screen. Record it in the wiki's Replay API page
  whatever the answer is - including "nothing observable", which is a result.
- **A locked shot survives mouse movement over the game window.** This is the
  actual acceptance test. Lock a champion, move the mouse around for ten
  seconds, confirm the framing is unchanged.
- **Manual camera control must still be possible.** Whatever guard ships must be
  something you can turn off, or must not apply when no champion is locked.
  Do not make the camera un-movable.
- **Recovery must not need a re-click.** If the client resets `cameraMode`, the
  panel should restore the shot on its own rather than silently doing nothing.
- **No new write path.** Use the existing `lockCamera()` / `postRender()`.
- **Never send `cameraMode: "tps"`.** It closes the game, reproduced twice.

## Notes

**What is already known**, so this doesn't get re-derived:

- `fps` mode is required for any camera control at all. In `top` the camera is
  on the game's directed rails and every camera field is inert.
- `lockCamera()` already sends `cameraMode` on every lock, specifically so a
  lock recovers from the client having reset it. That was a fix for exactly this
  family of problem and is worth reading before adding another mechanism.
- The client's First Person Camera keys are numpad 4/5/6/8 plus mouse, and are
  rebindable under Options -> Hotkeys -> First Person Camera. It may be that the
  cleanest guard is telling the user to unbind them, in which case say so in the
  wiki rather than building something.
- `cameraLookSpeed` ("Mouse look speed of the camera when in FPS mode") is
  worth trying at `0` as a cheap experiment before anything else. If mouse look
  can simply be slowed to nothing, that may be the whole fix.

**Detecting disturbance.** The panel already receives the full render object at
1Hz. Comparing the last-written `cameraRotation` against what comes back is
enough to notice drift without any new polling. Care is needed not to fight a
deliberate manual adjustment - a guard that snaps the camera back every second
while the user is trying to frame a shot by hand is worse than the drift.

**Out of scope:** camera paths, sequences, and anything that moves the camera on
its own. This brief keeps a shot still; it does not add new shots.
