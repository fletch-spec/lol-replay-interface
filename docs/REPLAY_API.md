# Replay API - hard-won notes

Things about the League replay API (`https://127.0.0.1:2999`) that cost real
time to discover, kept because the obvious reading of the docs is wrong for most
of them. Open bugs live in [Issues](../../../issues); this file is durable
behaviour, not a task list.

## Read `/Help`, not the swagger JSON

`/Help?format=Full&target=<Type>` returns per-field and per-enum-value
descriptions that `/swagger/v3/openapi.json` drops entirely. `HudCameraMode`
serialises as an **empty enum** in swagger, while `/Help` names all five values
with descriptions. This is what finally cracked the camera problem after three
briefs of black-box guessing.

The generated `/docs` HTML page 404s on curl - fetch `/Help` or the swagger JSON
directly.

## Partial POSTs work, and failures are silent

`PostReplayRender`: *"Allows modifying the current render properties. All values
are optional."* Same for playback. Verified: `{"interfaceMinimap": false}` alone
changed exactly **1 of 66 fields**. No read-modify-write needed.

But **unknown field names return HTTP 200 and are silently ignored.** A
deliberate nonsense field and a plausible-but-nonexistent one behave identically,
and neither appears in a subsequent GET. A status code proves nothing here -
verify writes by reading the field back.

## Camera

### Follow-cam - one request

```json
POST /replay/render
{
  "cameraMode": "fps",
  "selectionName": "<riotIdGameName>",
  "cameraAttached": true,
  "selectionOffset": { "x": 0, "y": 1700, "z": -1150 },
  "cameraRotation": { "x": 0, "y": 56, "z": 0 }
}
```

Set once, no polling. Verified tracking a champion across many samples with zero
further requests.

- **`cameraMode: "fps"` is load-bearing.** In the default `top` mode the camera
  is on the game's own directed rails and *every* other camera field is inert.
  This is why the API looked incapable of follow-cam for three briefs:
  `selectionOffset` and `cameraAttached` were being tested under `top`, where
  they legitimately do nothing.
- `cameraAttached: true` is what makes it follow. It is a real control, not the
  status readout its description ("True if the camera is attached…") implies.
- `selectionOffset` frames the shot relative to the champion.
- `cameraRotation` is `(yaw, pitch, roll)` in `(x, y, z)`.

### ⚠️ `cameraMode: "tps"` closes the game

Reproduced twice, including once in an earlier session. Accepted without error,
then `League of Legends.exe` is gone and `LeagueCrashHandler64` is running.
Treat as unusable, not merely risky. `fps` is safe.

| mode | behaviour |
|---|---|
| `top` | default. Camera on the game's directed rails; camera writes are inert. |
| `fps` | free camera. Required for follow-cam and presets. |
| `tps` | **closes the game.** |
| `focus` | selects the champion's info frame, camera stays parked. |
| `path` | no visible change. |

### Aiming is empirical

Yaw's world direction isn't documented and can't be read back - the API reports
the rotation you *set*, never where the camera is actually looking. For a fixed
offset the required aim is a constant (the direction to the champion is always
−offset), so it's set once rather than recomputed.

Confirmed good: offset `{0, 1700, -1150}` with rotation `{0, 56, 0}`. Yaw `0`
pairs with the offset on **−z**; the other three cardinal directions all put the
champion off-frame. Scaling `y`/`z` together at the ~1.48 ratio changes distance
without disturbing the aim.

Safe fallback if a framing ever looks wrong: offset `{0, 2000, 0}` with pitch
`90`. Looking straight down, yaw cannot matter.

The fast way to find an aim is to cycle the four cardinal offset directions at a
fixed pitch and look at the screen.

### `selectionName` clears itself

It reads back correctly for a few seconds after being set, then goes empty on its
own with no request. Consequences:

- Send `selectionName` in **every** camera POST. A later POST of
  `selectionOffset` *without* it freezes the follow - there's nothing left to
  attach to.
- Don't drive UI state from it. An indicator polling `selectionName` drops out
  spontaneously while the camera is still very much locked.
- Once attached, the follow keeps running even after it reads back empty. The
  empty readback is a display quirk, not a detach.

### The in-game camera mode resets yours

Picking "Directed Camera" from the client's own dropdown, or bumping the screen
edge (which flips it to manual), puts `cameraMode` back to `top` - and then every
camera field goes inert again. Send `cameraMode` with every camera write rather
than setting it once.

Switching `cameraMode` also **resets `fieldOfView`**, so carry FOV through
explicitly or it snaps back to a default.

### Mouse-look overrides `cameraRotation`

In `fps` mode the game's own First Person Camera hotkeys stay live (numpad
4/5/6/8 + mouse, rebindable under Options → Hotkeys → First Person Camera). A
rotation set to `{0, 56, 0}` read back as `{21.1, 48.8, 0}` after the user looked
around. `cameraLockX/Y/Z` ("Lock FPS Camera at x axis") are the documented
guardrail and are **untested**.

## Events

### `EventID` is not stable across seeks

The client reassigns a new `EventID` to the same real event every time playback
re-passes that point in game-time - the same kill appeared under four different
IDs after repeated seeking. Deduplicate on a content fingerprint (event name +
bucketed time + killer/victim), never on `EventID`.

### The feed is cumulative, not complete

`/liveclientdata/eventdata` returns events up to the current playback position.
Getting a whole game's events means seeking to the end, waiting for the feed to
populate (a `GameEnd` event is the completion signal), and seeking back.

### Structure IDs

`Turret_TChaos_L2_P3_2521511112_0`. Only the team segment (`TOrder`/`TChaos`) is
safe to read - the `L`/`P` numbers have no documented lane mapping, and guessing
"bot outer" from them prints confident nonsense.

## No stable game identifier exists

`/replay/game` returns only `processID`, an OS process id that changes every
client launch. No path in the spec carries a match ID or the replay filename -
all 30 checked. Anything persisting per-replay has to use a composite; this
project uses `gameMode` + `length`.

`gameMode` is **not** in the Replay API at all - it's on
`/liveclientdata/gamestats`, along with `mapName`, which is what camera presets
key by since world coordinates don't transfer between maps.

## Synthetic input is blocked

Spectator hotkeys (1-5, Q/W/E/R/T) cannot be driven. PostMessage, SendInput
keyboard and SendInput mouse were each tested with confirmed window focus - zero
effect, almost certainly Vanguard. Don't re-attempt it; use the API instead.

## Champion name gotcha

While Gnar is transformed, `/liveclientdata/playerlist` reports
`championName: "Mega Gnar"`, which is not a Data Dragon champion id. Worth
checking whether Elise, Nidalee, Jayce and Karma behave similarly.

## Reference implementation

<https://github.com/RiotGames/leaguedirector> - Riot's own open-source tool
against this exact API. Reading it overturned two confident conclusions reached
from black-box testing alone. Check it before deciding something is impossible.
