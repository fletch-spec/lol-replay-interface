---
id: brief-001
state: complete
created: 2026-08-04
updated: 2026-08-04
agent: user
project: LOL-REPLAY-CONTROLLER
depends_on: []
---

# Brief 001: Replay API Proxy + Panel Shell

## Problem Statement

The LoL Replay API is HTTPS on `127.0.0.1:2999` with a Riot self-signed cert and
no CORS headers. A browser page cannot call it — the fetch fails on cert
validation, and would fail on origin policy even if it didn't. Every later brief
depends on solving this once. Nothing else can be built until a page served in
Chrome can read and write replay state.

## Done Looks Like

A Node helper runs from one command. Opening `http://localhost:3000` in Chrome on
monitor 2 shows a dark panel displaying the current replay's game mode, total
length, and live playback time updating roughly ten times a second. Clicking a
test button sets the replay speed to 0.5× and the game on monitor 1 visibly slows
down. Closing and reopening the browser reconnects without restarting the helper.

## Hardest Part

Confirming the API is actually reachable before writing any UI. If
`EnableReplayApi=1` isn't set in `game.cfg`, or the replay isn't running, every
request fails identically to a code bug and you'll debug the wrong layer for an
hour. Prove the connection with curl first, then write code.

## Can't Skip

- Verify the API by hand before writing the helper:
  `curl -k https://127.0.0.1:2999/replay/game`
- Helper serves the panel **and** proxies the API from the same origin. Do not
  try to make the browser talk to :2999 directly — that is the whole problem.
- `rejectUnauthorized: false` on the outbound https agent.
- Proxy passes through GET and POST, preserving JSON bodies and status codes.
- A visible connection state in the UI: connected / no replay / helper down.
  These three fail differently and must look different.
- Polling loop that survives the replay client not running — no unhandled
  rejections, no console spam, no crash.

## Notes

**Enable the API first.** In `Config/game.cfg` (in the League install, not the
Riot Client folder), under `[General]`, add:

```
EnableReplayApi=1
```

Restart the client. Start any replay. Then confirm:

```
curl -k https://127.0.0.1:2999/replay/game
```

Expected: JSON with `processID`, `gameMode`, `length`. If this 404s or hangs, stop
and fix it — no amount of code works around it.

**Read the real spec.** The client generates its own OpenAPI spec at
`https://127.0.0.1:2999/docs`. Field names in these briefs are from memory and may
be wrong. The spec is authoritative. Check it before trusting anything written
here.

**Suggested layout:**

```
lol-replay-controller/
  server.js          # express: static + /api proxy
  public/
    index.html       # entire panel, single file
```

**Proxy shape:**

```js
const agent = new https.Agent({ rejectUnauthorized: false });
app.use('/api', async (req, res) => {
  const url = `https://127.0.0.1:2999${req.originalUrl.replace(/^\/api/, '')}`;
  // forward method, JSON body, status, response body
});
```

Panel then calls `/api/replay/playback` — same origin, no CORS, no cert prompt.

**Endpoints this brief touches:**

- `GET /replay/game` → `{processID, gameMode, length}`
- `GET /replay/playback` → `{time, length, speed, paused, seeking}`
- `POST /replay/playback` with `{speed: 0.5}`

**Polling.** 10 Hz on `/replay/playback` is fine and is what makes the UI feel
live. Use `setInterval`, but guard against overlapping requests if the client
stalls. A plain WebSocket push from helper to browser is nicer than browser-side
polling and worth doing now — later briefs all want it.

**Styling.** Dark. This sits next to a game on a second monitor in a dim room; a
white panel will blind you and bleed light onto your face if you're on camera.
Large hit targets — you'll be clicking without looking while talking.

**Out of scope for this brief:** scrubbing, camera, players, HUD toggles. One
number updating on screen and one speed change proves the whole pipeline. Stop
there.
