# LoL Replay Controller

<!-- project-type: tasks-and-stats -->
<!-- project-category: gaming -->
<!-- repo: TBD -->

Browser-based control panel for League of Legends replays. Runs on monitor 2,
drives the replay client on monitor 1, so voiceover can be recorded live in a
single pass while OBS captures the game.

**Scope: live replay control only.** Not an editor, not a clip exporter, not a
stats tool. If a feature doesn't help someone talk over a replay in real time,
it's out.

Related: [obs_stream_setup](../obs_stream_setup.md) (capture + editing side)

## Now

- **All 7 briefs complete; `briefs/ready/` is empty.** The panel does what the
  project set out to do, including the follow-cam that briefs 003–005 were
  written around the absence of. Open items live in
  [GitHub Issues](https://github.com/fletch-spec/lol-replay-interface/issues) -
  the two worth a next brief are depth of field / fog (deferred from 006) and
  `cameraLockX/Y/Z`, still untested, which is the guard against mouse-look
  disturbing a locked camera mid-narration.
  Briefs are started
  **manually, one at a time** - nothing auto-advances. See
  [briefs/brief_log.md](./briefs/brief_log.md).
- Timeline fidelity pass (phases 1–2 of
  [ui_polish_plan.md](./ui_polish_plan.md)) landed 2026-08-05, outside the
  brief queue. Phases 3–4 still open.
- Open problems live in
  [GitHub Issues](https://github.com/fletch-spec/lol-replay-interface/issues).
  Durable API behaviour lives in [docs/REPLAY_API.md](./docs/REPLAY_API.md).
  One copy each - issues describe what's broken, the API doc describes what's
  true.

## Brief Queue

| # | Brief | State | Depends on |
|---|---|---|---|
| 001 | Replay API proxy + panel shell | complete | - |
| 002 | Transport control | complete | 001 |
| 003 | Player lock + keystroke bridge | complete (partial) | 001 |
| 004 | Event timeline | complete | 002 |
| 005 | Cue points + A/B loop | complete | 002, 004 |
| 006 | HUD toggles + camera presets | complete | 001 |
| 007 | Clickable controls + layout review | complete | 004, 005 |

Briefs 002 and 003 both only need 001, so either can go second. 006 is
independent of the timeline work and can be pulled forward if you want a
cinematic pass sooner.

007 is independent of 006 but interacts with it: 006 adds another block of
controls that needs somewhere to live. Running 007 last means it lays out
everything once; running it first means treating "where does a new control
block go" as part of its deliverable.

## How To Start A Brief

1. Open `briefs/ready/brief-NNN.md`
2. Change `state: ready` → `state: in-progress`, set `updated:`
3. Append a line to `brief_log.md`
4. Hand the brief to Claude as the whole instruction - the brief is the spec
5. On finish: `state: complete`, move to `briefs/archive/`, log it

No brief starts itself. Nothing in the queue runs without step 1.

## Stack

- **Helper**: Node + Express. Proxies `https://127.0.0.1:2999`, bypasses the
  self-signed cert, adds CORS, caches Data Dragon champion portraits locally.
  No keystroke injection - see Notes, synthetic input is blocked by the client.
- **Panel**: single-file HTML + vanilla JS, no build step. Refresh to iterate.
- **Target**: Windows (LoL is Windows-only).

## Constraints

- Replay API must be enabled: `EnableReplayApi=1` under `[General]` in
  `Config/game.cfg`. Nothing works before this.
- The client generates its own spec at `https://127.0.0.1:2999/docs` - that is
  the authoritative field list, not any brief in this folder.
- Seeks have ~100-200ms lag and are visible on capture. Debounce every write.

## Stats

- Briefs complete: 7 / 7 - queue empty
- First working build: 2026-08-04
- First recorded VO using the panel: TBD

## Notes

- **Spectator hotkeys don't work - confirmed dead end.** Brief 003 spiked three
  synthetic-input methods (PostMessage, SendInput keyboard, SendInput mouse
  double-click) with genuinely confirmed window focus each time. Zero effect on
  camera state in every case. The client (almost certainly Vanguard) blocks
  synthetic input generally - not a targeting or timing problem, don't re-try
  this approach.
- **Camera follow-cam: SOLVED 2026-08-05** - one POST to `/replay/render` with
  `cameraMode: "fps"` + `selectionName` + `cameraAttached: true` +
  `selectionOffset` + `cameraRotation`. Native follow, no polling. The
  load-bearing part is `fps`: in the default `top` mode the camera is on the
  game's directed rails and *every* camera field is inert, which is why three
  briefs concluded the API couldn't do this. **`cameraMode: "tps"` closes the
  game - reproduced twice, do not send it.** Full recipe and framing maths in
  [docs/REPLAY_API.md](./docs/REPLAY_API.md).
- **Riot ships the reference implementation:
  <https://github.com/RiotGames/leaguedirector>.** Open source, drives this
  exact API. Its README documents "Attach camera to champion or minion" as a
  supported feature. Reading it corrected two confident-but-wrong conclusions
  reached from black-box testing alone. Check it before deciding this API can't
  do something.
- **Read `/Help?format=Full&target=<Type>` before trusting any brief's field
  list.** It carries per-enum-value descriptions the swagger JSON omits - the
  `HudCameraMode` enum shows as empty in swagger but `/Help` names all five
  modes. This is what finally cracked the camera problem.
- **Partial POSTs are supported.** `PostReplayRender`: "Allows modifying the
  current render properties. All values are optional." Same for playback. Brief
  006 does not need read-modify-write.
- **Camera follow-cam: the superseded brief-003 investigation.** `POST /replay/render` with
  `{selectionName, cameraAttached: true}` is a real documented API (found via
  fletch-spec/lol-path-mapper) and reliably selects the target champion
  (`selectionName` echoes back correctly, verified repeatedly) - but the camera
  itself does not visibly follow them. Tested `cameraMode`: `top` (shipped
  default, no crash, unconfirmed if it's a visible no-op or does something
  subtle), `focus` (selects the champion's info/stat frame, camera stays
  parked), `path` (no visible change). `tps` caused the replay to close
  entirely on one attempt - recovered on its own, not retried. Brief 003 ships
  with the fallback the brief itself anticipated: portrait grid, live KDA/CS,
  click-to-select with a lock indicator driven by real polled state - no
  follow-cam. **Brief 006 needs to know this before building camera presets**:
  don't assume `cameraAttached` gives a working follow, and treat `cameraMode`
  changes as having a small but real crash risk until proven otherwise.
- `/liveclientdata/allgamedata` works during replays and carries the event log.
  That's what makes the timeline cheap to build.
- **`/liveclientdata/eventdata`'s `EventID` is not stable across seeks.** The
  client reassigns a new `EventID` to the same real event every time playback
  re-passes that point in game-time - confirmed directly (the same kill at
  ~81.5s appeared under 4 different `EventID`s after repeated seeking). Brief
  004 originally deduped by `EventID` per its own brief text; that was wrong
  and inflated the event count 4-5x with visually-duplicate entries. Fixed by
  deduping on content (event name + time bucket + killer/victim/recipient)
  instead. **Anything that reads this endpoint must not key by `EventID`
  alone.**
- **There is no stable game identifier anywhere in the API.** Checked all 30
  paths in `/swagger/v3/openapi.json` during brief 005: no match ID, no replay
  filename, nothing that survives a client restart. `processID` is an OS
  process id and changes every launch. Anything that persists per-replay must
  use the `gameMode` + `length` composite - see `replayIdentity()` in
  `index.html`, which brief 004's event cache and brief 005's cues both key off
  so they can't drift apart.
- `/replay/game` (Replay API) only returns `processID` - no `gameMode`, no
  `length`, per the real `Game` schema in `/swagger/v3/openapi.json`. `length`
  lives on `/replay/playback` (matches original brief). `gameMode` isn't in the
  Replay API at all - it's on `/liveclientdata/gamestats`, a separate endpoint
  family on the same port. Brief 001's panel pulls game mode from there.
- Stretch, not scoped: Stream Deck mapped to the helper's HTTP endpoints. Better
  ergonomics than browser hotkeys, since the panel loses focus constantly.
- Another app on this machine ("a different replay mapping application") can
  independently drive the same replay client via the same API. If live testing
  shows time/paused/speed changing with no corresponding request from this
  panel, that's the likely cause, not a bug here. Confirmed during brief 002
  testing - pause it before testing this panel's transport for clean results.
