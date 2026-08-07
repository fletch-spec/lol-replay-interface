---
id: brief-008
state: complete
created: 2026-08-06
updated: 2026-08-07
agent: user
project: LOL-REPLAY-CONTROLLER
depends_on: [brief-006]
executes_after: none
model: sonnet
---

# Brief 008: Camera Stability

Closes [#3](https://github.com/fletch-spec/lol-replay-interface/issues/3).

> Line numbers in this brief are from commit `d0ae049`. If they don't match,
> grep for the symbol name - the names are stable, the lines are not.

## Problem Statement

The follow-cam works, and then the mouse touches the game window and it doesn't.
`fps` mode leaves the client's own First Person Camera controls live, so mouse
movement over the game overwrites `cameraRotation`, and bumping the screen edge
flips the client to manual camera - which resets `cameraMode` to `top` and makes
every camera field inert until something re-asserts it.

Measured directly: a rotation set to `{0, 56, 0}` read back as `{21.1, 48.8, 0}`
after a few seconds of mouse movement over the game. During a recording that
means the shot drifts off the champion mid-sentence and there is no way back
without stopping to re-lock.

## Done Looks Like

You lock the camera to a champion, move the mouse across the game window for ten
seconds, and the framing is unchanged. If the camera does get disturbed - by the
client's own camera dropdown, an edge bump, anything - the panel notices and the
shot comes back without you working out what happened.

## Decision (already made - do not re-litigate)

This is a **testing brief first, a building brief second**. Run the experiments
in the order below and stop at the first one that passes the acceptance test.
They are ordered cheapest-first, and each one that fails is still a result worth
writing to the wiki.

Do **not** start by building drift detection. It is the fallback, it is the most
code, and it is the only option that can fight the user when they deliberately
move the camera by hand. If experiment 1 or 2 works, the fallback is not built
at all.

### Experiment 1 - `cameraLookSpeed: 0`

Documented as "Mouse look speed of the camera when in FPS mode". If mouse look
can be slowed to nothing, that is the entire fix and it is one field.

### Experiment 2 - `cameraLockX` / `cameraLockY` / `cameraLockZ`, one at a time

Documented in full as "Lock FPS Camera at x axis", which is why nobody has ever
sent them. They could lock rotation about an axis, position along an axis, or
clamp one component of the look direction. All three are plausible and imply
different guards. Test each flag alone, with the mouse deliberately disturbing
the camera between reads, and record what each one actually does.

### Experiment 3 (fallback) - detect drift and re-assert

Only if 1 and 2 both fail. The panel already receives the whole render object at
1Hz (`server.js:206` `pollRoster`, broadcast into `applyRenderState` at
`index.html:1903`), so comparing the last-written `cameraRotation` against what
comes back needs no new polling. See the Traps section before writing any of it.

## Where The Code Is

| What | File | Symbol | Line |
|---|---|---|---|
| Camera lock write | `app/public/index.html` | `lockCamera()` | 1483 |
| Re-frame on distance change | `app/public/index.html` | `applyFraming()` | 1620 |
| Generic render POST | `app/public/index.html` | `postRender()` | 1826 |
| Intended rotation constant | `app/public/index.html` | `FOLLOW_ROTATION` | 1459 |
| Distance → offset | `app/public/index.html` | `followOffset()` | 1469 |
| Last render object from client | `app/public/index.html` | `renderState` / `applyRenderState()` | 1823 / 1903 |
| Which champion is followed | `app/public/index.html` | `lastAction` | 1602 |
| 1Hz render broadcast | `app/server.js` | `pollRoster()` | 206 |

## Implementation Steps

1. **Start the helper and confirm a replay is live.**
   `curl -s http://localhost:3000/api/replay/playback` returns JSON with a
   non-zero `length`. Everything below goes through the panel's own proxy on
   port 3000, which avoids the self-signed cert dance on 2999.
   *Done when:* you get playback JSON back.

2. **Capture a baseline render object.**
   ```bash
   curl -s http://localhost:3000/api/replay/render > /tmp/render-before.json
   ```
   *Done when:* the file contains `cameraRotation`, `cameraMode`,
   `cameraLookSpeed` and the three `cameraLock*` fields. If any are missing from
   the response, that itself is the finding - record it and say so.

3. **Reproduce the drift before trying to fix it.** Lock a champion from the
   panel, read `cameraRotation`, move the mouse over the game window for ~5s,
   read it again. You must see the numbers change. A fix cannot be verified
   against a bug you have not reproduced in this session.
   *Done when:* you have two different `cameraRotation` readings written down.

4. **Experiment 1.** Send `{"cameraLookSpeed": 0}`, then repeat step 3's mouse
   disturbance and re-read.
   ```bash
   curl -s -X POST http://localhost:3000/api/replay/render \
     -H 'Content-Type: application/json' -d '{"cameraLookSpeed":0}'
   ```
   *Done when:* you can say whether rotation still drifts. If it does not, skip
   to step 7.

5. **Experiment 2.** For each of `cameraLockX`, `cameraLockY`, `cameraLockZ`
   individually: set it `true`, disturb, re-read rotation *and* position, then
   set it back to `false` before testing the next one. Never test two at once -
   if the pair works you will not know which one did it.
   *Done when:* you have a one-line description of the observed effect of each
   of the three flags, including "nothing observable" where that is the answer.

6. **Experiment 3, only if 4 and 5 both failed.** In `applyRenderState()`, compare
   `render.cameraRotation` against `FOLLOW_ROTATION` and `render.cameraMode`
   against `'fps'`. On a mismatch while `lastAction.kind === 'camera'`, re-send
   the same body `lockCamera()` sends. Reuse `lockCamera()` itself rather than
   writing a second body - the field list has already been got wrong once.
   *Done when:* a deliberate camera-mode change in the client's own dropdown is
   corrected by the panel within ~2s, with no click from you.

7. **Ship the guard behind something you can turn off.** Whichever mechanism
   won, it must be defeatable - a chip in the status bar next to Cinematic, or
   simply not applying while `lastAction.kind !== 'camera'`. Prefer the latter:
   it is free and there is nothing to discover.
   *Done when:* with no champion locked, the camera can be moved by hand exactly
   as it can today.

8. **Write the result to the wiki's Replay API page**, whatever it is, including
   the negatives from steps 4 and 5.

## Verification

The acceptance test, run end to end, in this order:

1. Lock a champion from the roster.
2. Note the framing on screen (which champion, how centred).
3. Move the mouse continuously across the game window for ten seconds.
4. Framing is unchanged.
5. Open the client's own camera dropdown, pick a different camera, close it.
6. Within ~2s the panel has the shot back.
7. Click the locked champion's portrait again to unlock, then move the camera by
   hand. It moves.

Steps 4 and 7 are the pair that matters - 4 alone is satisfied by a camera
nobody can move, which is a worse panel.

## Can't Skip

- **A locked shot survives ten seconds of mouse movement.** This is the
  acceptance test; everything else is means.
- **Manual camera control still works** when nothing is locked. Do not ship a
  camera nobody can move.
- **Record what each of the three `cameraLock*` flags does**, individually,
  in the wiki. "Nothing observable" is a result and saves the next session the
  same hour.
- **No new write path.** Everything goes through `lockCamera()` or
  `postRender()`. Do not add a third function that builds a render body.
- **Never send `cameraMode: "tps"`.** It closed the replay client, reproduced
  twice. Not once, in any experiment, not even to see what it does.

## Traps

- **A status code proves nothing here.** The Replay API returns HTTP 200 for
  unknown field names and silently ignores them (`postRender()` at 1826 says so
  in a comment). If `cameraLockY` is not a real field, you will get a 200 and no
  effect. Verify every write by reading `/api/replay/render` back, never by
  checking `res.ok`.
- **`cameraMode` must ride along on every camera write.** `lockCamera()` sends
  it every time on purpose - anything that flips the client to `top` makes
  `selectionName` and `cameraAttached` inert, and without re-sending the mode
  the roster buttons silently stop working. If you add a new write, it needs the
  mode too.
- **Switching `cameraMode` resets `fieldOfView`.** That is why `currentFov()`
  (1479) exists and why every camera body carries FOV forward. A new write that
  omits it will snap the FOV to a default mid-shot.
- **Posting `selectionOffset` without `selectionName` detaches the follow.**
  Noted on `applyFraming()` (1620). Any re-assert must carry the name.
- **Another app on this machine drives the same replay client.** If the camera
  moves with no request from the panel, that is the cause before it is a bug.
  Ask before treating unexplained movement as evidence.
- **A 1Hz re-assert loop fights a user framing a shot by hand.** If experiment 3
  ships, it must only run while a champion is locked, and it must compare
  against what the panel last *wrote*, not against a constant - otherwise the
  distance slider's own writes look like drift.

## Out Of Scope

Camera paths, camera sequences, saved camera presets (removed deliberately in
the 2026-08-06 scope review - do not reintroduce them), and anything that moves
the camera on its own. This brief keeps a shot still. It does not add new shots.

## Escalate Instead Of Deciding

- If any experiment looks like it is about to repeat the `tps` crash - stop and
  confirm before you have League close on you again.
- If the render object does not contain the `cameraLock*` fields at all, that
  changes the brief's premise. Report it rather than substituting a guess.
- If the only workable guard turns out to be "tell the user to unbind the
  client's First Person Camera keys" (numpad 4/5/6/8, rebindable under
  Options → Hotkeys → First Person Camera), say so - that is a wiki change, not
  a code change, and it is a legitimate outcome for this brief.

## Outcome (2026-08-07)

**Experiment 1 won. Stopped there, per the brief's own instruction - 2 and 3
were never built.**

Baseline confirmed live: all camera fields present in the render object,
resolving one of this brief's own escalation conditions before testing began.
Reproduced the bug first, with the user's own hand on the mouse (this session
has no way to drive a physical mouse over the game window itself, and did not
attempt synthetic input per Fact #4) - `cameraRotation` logged via a 1s
background poller swung from the locked baseline `{0, 56, 0}` to values up to
`{15-20, ~55, 0}` sustained, with brief spikes past `{300, ..., 0}` on fast
swings, while `cameraMode` stayed `fps` throughout (no edge-bump this pass).

Sent `cameraLookSpeed: 0` alongside the existing lock body, confirmed by
read-back, and asked for the same disturbance again. Confirmed by the user
directly ("good supress"): the shot held. Shipped in both places a camera
write happens while locked - `lockCamera()` and `applyFraming()` (the
distance-slider re-frame) - since the slider re-asserts the whole camera body
on every drag and an omission there would have reopened the drift window the
next time someone touched the slider mid-take.

Experiments 2 (`cameraLockX/Y/Z`) and 3 (drift-detect-and-reassert) were not
built. The brief says explicitly not to build 3 if an earlier one works, and
2 was skipped for the same reason step 4 gives permission for. **The three
`cameraLockX/Y/Z` flags remain formally untested** - if `cameraLookSpeed: 0`
is ever reverted or found insufficient in some mode this session didn't
reach, that testing still needs doing from scratch.

**Verification step 7 could not be run as written, and this predates this
session's changes.** "Click the locked champion's portrait again to unlock"
describes a toggle that does not exist in `lockCamera()` - clicking an
already-locked portrait re-sends the identical lock body, it does not detach.
There is no exposed "unlock and free-fly" control anywhere in the panel; the
only camera controls are lock-to-champion and the distance slider. Manual
camera control was checked instead in the only state where it is actually
reachable - before any champion has been locked this session, where
`cameraLookSpeed` is still the client's own default (`1.0`, confirmed in the
original baseline capture) since nothing in this brief touches it until the
first lock. Whether a real unlock control should exist is outside this
brief's scope (out-of-scope explicitly bars "anything that moves the camera
on its own"; a free-fly toggle is a new control, not a guard) - flagging
rather than building it.
