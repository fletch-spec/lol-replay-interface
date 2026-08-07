# LoL Replay Controller

Browser control panel for League of Legends replays. Runs on a second monitor and
drives the replay client on the first, so voiceover can be recorded live in a
single pass while OBS captures the game.

**Scope: live replay control only.** Not an editor, not a clip exporter, not a
stats tool. If a feature doesn't help someone talk over a replay in real time,
it's out.

![The panel: status bar with camera distance and cinematic controls, both team
rosters, transport controls, the scrub bar with event markers, the event list,
and the Cues card below it](docs/panel.png)

*Summoner names are replaced with placeholders in this screenshot.*

## Quick start

### 1. Enable the replay API - required, nothing works without it

The League client does not expose its replay API by default. Until you turn it
on there is no API to connect to, and the panel cannot tell you that - it just
sits on "no replay loaded" with a replay open in front of you.

Add this to `C:\Riot Games\League of Legends\Config\game.cfg`:

```ini
[General]
EnableReplayApi=1
```

Then **fully restart the League client** - the flag is only read at startup.

To confirm it took, open <https://127.0.0.1:2999/swagger/v3/openapi.json> in a
browser with a replay running and accept the certificate warning. JSON back
means the API is on.

### 2. Run it

Double-click `run.bat`. It installs dependencies on first run, starts the helper
and opens <http://localhost:3000>. Needs Node 18+ and Windows.

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
  slider
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
