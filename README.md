# LoL Replay Controller

Browser control panel for League of Legends replays. Runs on a second monitor and
drives the replay client on the first, so voiceover can be recorded live in a
single pass while OBS captures the game.

**Scope: live replay control only.** Not an editor, not a clip exporter, not a
stats tool. If a feature doesn't help someone talk over a replay in real time,
it's out.

## What it does

- **Transport** — scrub, pause, speed presets, frame-accurate nudging
- **Event timeline** — kills, objectives and structures as markers on the scrub
  bar, clustered by lane, with champion portraits on hover and click-to-seek
- **Cue points** — one key drops a cue at the playhead, another steps through
  them, each landing paused a couple of seconds early so you can set the moment
  up verbally. Notes are editable, persist per replay, and export as
  `MM:SS — note` for YouTube chapters
- **A/B loop** — mark a section and loop it while you re-record a line
- **Camera** — lock the camera to any champion and follow them, with a distance
  slider, plus named camera presets saved per map
- **HUD** — one-press cinematic mode, or toggle any individual HUD element
- Every action has both a button and a keyboard shortcut

## Requirements

- Windows (League is Windows-only)
- Node 18+
- The replay API enabled: `EnableReplayApi=1` under `[General]` in
  `Config/game.cfg`. **Nothing works before this.**

## Running

```bash
cd app
npm install
npm start
```

Then open <http://localhost:3000> with a replay loaded in the client.

## How it's built

- **Helper** (`app/server.js`) — Node + Express. Proxies the client's replay API
  on `https://127.0.0.1:2999`, bypasses its self-signed cert, and pushes
  playback, roster, event and render state to the panel over a WebSocket. Also
  caches champion portraits from Data Dragon.
- **Panel** (`app/public/index.html`) — single file, vanilla JS, no build step.
  Refresh to iterate.

## Docs

| File | What's in it |
|---|---|
| [`lol_replay_controller.md`](lol_replay_controller.md) | Project overview, brief queue, constraints |
| [`docs/REPLAY_API.md`](docs/REPLAY_API.md) | Hard-won facts about the replay API — read this before assuming anything is impossible |
| [`briefs/`](briefs/) | The specs this was built from, with an Outcome section on each recording what actually happened |
| [`ui_polish_plan.md`](ui_polish_plan.md) | Timeline fidelity pass, phases 1–2 shipped |

Open problems live in [GitHub Issues](../../issues).

## A note on the replay API

Several things about it are counter-intuitive enough to have cost multiple
rewrites — camera fields being inert in the default camera mode, event IDs that
change identity across seeks, unknown field names returning `200` and doing
nothing. `docs/REPLAY_API.md` collects them. Riot's own
[League Director](https://github.com/RiotGames/leaguedirector) is the reference
implementation and worth reading before concluding the API can't do something.

⚠️ **`cameraMode: "tps"` closes the game.** Reproduced twice. Don't send it.
