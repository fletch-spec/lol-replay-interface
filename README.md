# LoL Replay Controller

Browser control panel for League of Legends replays. Runs on a second monitor and
drives the replay client on the first, so voiceover can be recorded live in a
single pass while OBS captures the game.

**Scope: live replay control only.** Not an editor, not a clip exporter, not a
stats tool. If a feature doesn't help someone talk over a replay in real time,
it's out.

## Quick start

1. Enable the replay API: `EnableReplayApi=1` under `[General]` in the client's
   `Config/game.cfg`. **Nothing works before this.**
2. Double-click `run.bat`.

It installs dependencies on first run, starts the helper and opens
<http://localhost:3000>. Needs Node 18+ and Windows.

Manual equivalent:

```bash
cd app
npm install
npm start
```

## What it does

- **Transport** - scrub, pause, speed presets, frame-accurate nudging
- **Event timeline** - kills, objectives and structures as markers on the scrub
  bar, clustered by lane, champion portraits on hover, click to seek
- **Cue points** - one key drops a cue at the playhead, another steps through
  them, each landing paused a couple of seconds early so you can set the moment
  up verbally. Notes persist per replay and export as `MM:SS - note` for
  YouTube chapters.
- **A/B loop** - mark a section and loop it while you re-record a line
- **Camera** - lock the camera to any champion and follow them, with a distance
  slider, plus named camera presets saved per map
- **HUD** - one-press cinematic mode, or toggle any individual HUD element
- Every action has both a button and a keyboard shortcut

## Documentation

Everything lives in the [wiki](../../wiki):

| Page | What's in it |
|---|---|
| [Setup](../../wiki/Setup) | Requirements, running, keyboard reference, startup gotchas |
| [Architecture](../../wiki/Architecture) | How the helper and panel fit together, what to know before editing |
| [Replay API](../../wiki/Replay-API) | Hard-won facts about the client's API |
| [Brief Process](../../wiki/Brief-Process) | How this was built, and what each brief got wrong |
| [UI Polish Plan](../../wiki/UI-Polish-Plan) | Timeline fidelity pass |

Open problems are in [Issues](../../issues). The specs this was built from are in
[`briefs/`](briefs/), each with an Outcome section recording what actually
happened.

## Layout

```
run.bat            start here
app/server.js      Node helper - proxies the client API, pushes state over WS
app/public/        single-file panel, vanilla JS, no build step
briefs/            the specs this was built from, with outcomes
```

⚠️ **`cameraMode: "tps"` closes the game.** Reproduced twice. Don't send it.
See [Replay API](../../wiki/Replay-API).
