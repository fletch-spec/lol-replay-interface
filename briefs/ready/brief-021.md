---
id: brief-021
state: in-progress
created: 2026-08-07
updated: 2026-08-08
agent: user
project: LOL-REPLAY-CONTROLLER
depends_on: [brief-008]
executes_after: brief-020
model: sonnet
---

# Brief 021: Find Out What Streamer Mode Does To Camera Control

Closes [#16](https://github.com/fletch-spec/lol-replay-interface/issues/16).

> **This issue has an empty body.** Its whole content is the title: "(in-game)
> streamer mode disables camera control". Everything below the Problem Statement
> is reconstruction from the code, not from a report. Step 1 is confirming the
> symptom before anything else - if it does not reproduce as described, say so
> and stop.

> Line numbers in this brief are from commit `e8e05b9`. If they don't match,
> grep for the symbol name - the names are stable, the lines are not.

## Problem Statement

Turning on the client's streamer mode is reported to stop the panel's camera
control working. Camera control is the feature the panel was rebuilt around:
briefs 003 and 006 both lost time to a keystroke bridge that could not work
(#10), and the follow-cam via `/replay/render` is what replaced it. If a client
setting silently disables it, then a take can be recorded with the panel's
central control inert and no indication on screen.

Three outcomes are possible and they lead to completely different work:

1. **A panel bug.** The panel sends something that conflicts with streamer mode,
   or reads back a state it misinterprets. Fix it.
2. **A client constraint**, like `cameraMode: "tps"` closing the game (#9) or
   spectator hotkeys being unreachable by synthetic input (#10). Then this is not
   fixable here, and the deliverable is a constraint record plus a visible
   warning in the panel - not a workaround.
3. **Not reproducible**, or caused by the other app on this machine that drives
   the same replay client (PASSOFF fact 5).

This project has already paid for guessing which of these applies. Briefs 003 and
006 built a whole keystroke bridge against outcome 2.

## Done Looks Like

A written answer to "what exactly stops working, and why", backed by
before/after `/replay/render` reads with streamer mode off and on. Either a fix,
or a constraint record in the wiki and the README with the same permanence as #9
and #10.

## Decision (already made - do not re-litigate)

**This is an investigation brief, structured cheapest-first, exactly like brief
008.** It ships code only if step 3 finds a panel-side cause. Building a
detect-and-warn indicator before knowing whether the client is at fault is the
mistake brief 008 avoided by stopping when experiment 1 worked.

**Read state back, never trust a `200`.** PASSOFF fact 1, and it is first in that
list because it is the most common way to finish a brief that does not work. The
Replay API accepts unknown field names, ignores them, and returns success. Every
claim in this brief's Outcome must come from a `GET /replay/render` after the
write, not from the response to the write.

**Do not send `cameraMode: "tps"` at any point** (PASSOFF fact 2, #9). It closes
the game. Reproduced twice. `fps` is what the follow-cam uses.

### Rejected before starting

- **Building a "camera control unavailable" warning first.** That is the fix for
  outcome 2 and it is wrong for outcome 1, where the panel would be warning about
  its own bug.
- **Working around it by re-asserting the camera on a timer.** Brief 008 rejected
  a 1Hz re-assert loop for a real reason: it fights deliberate manual framing.
  That reasoning does not stop applying here.
- **Any keystroke-based fallback.** #10. Do not retry.

## Where The Code Is

| What | File | Symbol | Line |
|---|---|---|---|
| Camera lock write | `app/public/index.html` | `lockCamera()` | 1608 |
| Selection-only write | `app/public/index.html` | `selectTarget()` | 1654 |
| Distance re-frame | `app/public/index.html` | `applyFraming()` | grep |
| Render state cache | `app/public/index.html` | `applyRenderState()` / `renderState` | 2035 / 1955 |
| Adoption heuristic | `app/public/index.html` | `render.cameraAttached && render.cameraMode === 'fps'` | 2045 |
| HUD toggle list | `app/public/index.html` | `HUD_TOGGLES` | 1914 |
| Cinematic hide list | `app/public/index.html` | `CINEMATIC_HIDE` | 1937 |
| Render POST helper | `app/public/index.html` | `postRender()` | 1958 |
| Render fetch (server) | `app/server.js` | `pollRoster()` → `/replay/render` | 238 |
| Camera broadcast | `app/server.js` | `camera: { attached, selectionName, mode }` | 248-254 |
| API proxy | `app/server.js` | `proxyToReplayApi()` | 151 |

## Implementation Steps

1. **Reproduce it, and write down what "disables" means.** With a replay loaded
   and the helper running, lock the camera to a champion from the roster. Confirm
   it follows. Turn on streamer mode in the client. Try again. Record precisely
   which of these stops working:
   - the roster click producing any camera movement at all
   - the camera attaching but not following
   - the distance slider
   - the target frame on info click (`selectTarget()`, 1654)
   - all of the above, or none
   *Done when:* you can state the symptom in one sentence, from observation. **If
   it does not reproduce, stop here and report that** - an empty-bodied issue
   that does not reproduce is a closeable issue, not a mystery.

2. **Diff the render object.** Read `/replay/render` with streamer mode off, then
   on, and diff:
   ```bash
   curl -s http://localhost:3000/api/replay/render
   ```
   *Done when:* you have both objects and a list of every field that differs. If
   nothing differs, that is itself the finding - the client is changing behaviour
   without changing reported state.

3. **Check whether the API even models streamer mode.** The swagger is
   authoritative for field names (PASSOFF), and the `/docs` HTML page 404s on
   curl:
   ```bash
   curl -sk https://127.0.0.1:2999/swagger/v3/openapi.json
   ```
   Search it for a streamer-mode field. `HUD_TOGGLES` (1914) does not carry one,
   so if the API does expose it, the panel has never touched it.
   *Done when:* you can say whether the field exists in the spec, by name.

4. **Test the write path directly**, out of the panel. With streamer mode on,
   POST a known-good follow-cam body - the one `lockCamera()` sends at 1615-1634 -
   and immediately read the state back.
   *Done when:* you know whether the write is rejected, accepted-and-ignored, or
   accepted-and-applied-but-overridden. These are three different bugs.

5. **Only if steps 2-4 point at the panel: fix it.** Most likely shapes: the
   adoption heuristic at 2045 misreading a changed `cameraMode`, or a field
   streamer mode resets that `lockCamera()` does not re-send. Note that
   `cameraMode` is already re-sent on every lock for exactly this class of reason
   - the comment at 1616-1621 explains which client actions silently reset it,
   and streamer mode may simply be another one.
   *Done when:* camera lock works with streamer mode on, verified by reading
   state back.

6. **Only if steps 2-4 point at the client: write the constraint record.** Match
   #9 and #10's shape - what was tested, what happened, and "not fixable here,
   recorded so it doesn't get retried". Wiki Replay API page, and the README if
   it rises to #9's level. Then add the smallest possible panel-side signal that
   camera control is unavailable - a chip, matching the focus chip brief 011
   shipped. **One chip. Not a system.**
   *Done when:* the record exists and the panel says something rather than
   failing silently.

## Verification

Whichever branch you land in:

1. Streamer mode off: camera lock, distance slider and target frame all work.
   Confirmed by reading `/replay/render` back, not by the POST returning 200.
2. Streamer mode on: the documented behaviour happens - either it works (fix), or
   the panel says it cannot (constraint).
3. Toggling streamer mode with a camera already locked does something
   predictable. Report what.
4. `cameraLookSpeed: 0` still suppresses mouse-look drift (brief 008's fix) in
   whichever states camera control does work.
5. The roster lock indicator reflects reality - it must not show a lock that is
   not in effect. That is the failure mode that ruins a take silently.
6. Nothing in this brief sent `cameraMode: "tps"`. Confirm by grep, not memory.

## Can't Skip

- **Read state back after every write.** PASSOFF fact 1.
- **Never send `cameraMode: "tps"`.** PASSOFF fact 2, #9.
- **No keystroke bridge.** #10.
- **The lock indicator must never claim a lock that is not active.** If camera
  control is disabled, the panel must not look like it is working.
- **Say which of the three outcomes happened**, explicitly, in the Outcome
  section. "Fixed" without saying what was wrong is what left #16 with an empty
  body in the first place.

## Traps

- **Another app on this machine drives the same replay client** (PASSOFF fact 5).
  Camera movement you did not command is probably that. Ask before calling it a
  bug - and be aware it can also make a broken camera lock look like it works.
- **`applyRenderState()` (2035) caches the whole render object** and the adoption
  heuristic at 2045 infers an active follow from `cameraAttached && cameraMode
  === 'fps'`. If streamer mode changes either field, the panel's idea of its own
  state diverges from the client's without any write failing.
- **`selectionOffset` detaches the follow if sent without `selectionName`** -
  brief 008 recorded this. Any hand-rolled test POST must send both.
- **`cameraMode` resets `fieldOfView`** (brief 008, and `currentFov()` at 1604
  exists because of it). A test write that omits FOV will look like it broke
  something it did not.
- **Streamer mode may be a *client settings* toggle with no API representation
  at all.** If step 3 finds nothing in the swagger, the panel cannot detect it,
  which makes outcome 2's chip undetectable and turns it into a documentation-only
  outcome. That is an acceptable result - say so rather than inventing detection.
- **`pollRoster()` swallows all four requests on any failure** (`server.js` 258).
  If streamer mode makes `/replay/render` fail, the roster, camera state and
  events all go quiet together and the panel looks disconnected rather than
  restricted. Brief 016 is fixing that; if it has already run, this trap may
  present differently.

## Out Of Scope

The HUD toggle grid and Cinematic (1914, 1937) unless streamer mode turns out to
be one of those fields. Camera drift (brief 008, closed). Any new camera control -
free-fly, presets, FOV. Brief 008's Outcome already flagged that there is no
unlock toggle in the codebase and called it new scope; that is still true and it
is still not this brief.

## Escalate Instead Of Deciding

- **If step 1 does not reproduce the symptom**, stop and ask. The issue body is
  empty and the reporter has context this brief does not.
- **If it turns out to be a client constraint**, the deliverable is a record and
  a chip - do not start building around it. #10 is a whole brief's worth of work
  spent learning that lesson.
- **If the fix would require re-asserting the camera on a timer**, stop. Brief
  008 rejected that with a reason that still holds, and reversing it is a
  project-level call.
- **If streamer mode turns out to affect more than the camera** - the event feed,
  the roster, `playerlist` names - that is bigger than this issue and needs its
  own triage pass.

## Progress (blocked, not complete)

**Step 3 done.** `curl -sk https://127.0.0.1:2999/swagger/v3/openapi.json`
searched case-insensitively for `streamer` and every `stream*` match: none.
The API does not model streamer mode anywhere in its spec. Confirmed at the
`/replay/render` response level too - a live read (below) has no field that
plausibly maps to it either. Per the brief's own Trap, this means *if* outcome
2 (client constraint) turns out to be the answer, there is no field to poll
and no detect-and-warn chip is buildable - that branch would be
documentation-only by necessity, not by choice.

**Step 2's "before" half done** - streamer mode presumably off, no lock
active:
```json
{"cameraAttached": false, "cameraLockX": false, "cameraLockY": false, "cameraLockZ": false,
 "cameraLookSpeed": 1.0, "cameraMode": "top", "selectionName": "", ...}
```
Full baseline captured and available for a before/after diff once there's an
"after" to diff it against.

**Step 1 cannot run from this session.** It requires turning on streamer mode
inside the League client's own in-game settings, physically - not reachable
through the panel, the proxy, or anything else in this session's toolset. Per
this brief's own Escalate section ("if step 1 does not reproduce the
symptom, stop and ask") and Decision ("read state back, never trust a 200" -
there is no write to make here without the client's actual streamer-mode
toggle first), this is where the brief stops until Fletcher can toggle it and
report what changes.
