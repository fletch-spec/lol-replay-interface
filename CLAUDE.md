# LoL Replay Controller

Browser control panel for League replays, on a second monitor, so voiceover can be recorded live in one pass. **Scope is live replay control only**: not an editor, clip exporter or stats tool. If a feature doesn't help someone talk over a replay in real time, it's out.

## Layout

`app/server.js` (Node helper: proxies the client's replay API, pushes state over WebSocket), `app/public/` (single-file vanilla JS panel, no build step), `briefs/` (specs with outcomes), `docs/sessions/` (one log per session), `tools/`. `README.md` has setup; the wiki has Architecture and Replay API facts.

## Commands

```bash
run.bat                      # installs deps on first run, opens http://localhost:3000
cd app && npm install && npm start
```

The League client needs `EnableReplayApi=1` in `game.cfg` and a full restart, or the panel just says "no replay loaded".

## Rules

- **Never send `cameraMode: "tps"`**: it closes the game (reproduced twice).
- Work follows the brief process in `briefs/`: `TRIAGE.md` orders the queue, `AUTHOR.md` writes a brief (one per session), `PASSOFF.md` executes one, `REVIEW.md` judges it. Each brief records an Outcome. Don't build outside a brief.
- Every action gets both a button and a keyboard shortcut.
- Verified against Chromium browsers; other engines are best effort.
