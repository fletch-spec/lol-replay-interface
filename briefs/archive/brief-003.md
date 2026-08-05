---
id: brief-003
state: complete
created: 2026-08-04
updated: 2026-08-04
agent: user
project: LOL-REPLAY-CONTROLLER
depends_on: [brief-001]
---

# Brief 003: Player Lock + Keystroke Bridge

## Problem Statement

Camera-locking to a champion is the single most-used action when narrating a
replay, and the Replay API does not expose it. It's a spectator hotkey — 1-5 for
blue team, Q/W/E/R/T for red — which means the panel has to send real keystrokes
to the League window. This is the riskiest piece of the project and the one most
likely to be impossible in the form assumed here, so it gets its own brief.

## Done Looks Like

The panel shows ten champion portraits in two team blocks. Clicking one locks the
game camera to that champion on monitor 1, while Chrome keeps focus on monitor 2
— no alt-tab, no click into the game. Each portrait shows live KDA, CS, and gold
so stats can be narrated without leaving the panel.

## Hardest Part

Sending a keystroke to a window that does not have focus, to a game with
anti-cheat. `PostMessage` targets a background window but many games ignore
synthetic messages; `SendInput` is reliable but goes to the *foreground* window,
which means focusing League first and stealing focus from the browser. Resolve
this early — the answer determines whether the rest of the brief is even
buildable.

## Can't Skip

- **Spike the keystroke path before building any UI.** A throwaway script that
  sends `3` to the League window and visibly changes the camera. If that doesn't
  work, stop and read the fallback below — do not build the portrait grid first.
- Player data pulled from `/liveclientdata/playerlist`, not hardcoded.
- Portraits ordered blue team then red, matching hotkey order exactly. Mismatched
  ordering means wrong-champion locks mid-recording.
- Visual indicator of which champion is currently locked.
- Never send keystrokes when the replay client isn't the intended target — guard
  on window handle, not on assumption.

## Notes

**Do the spike first.** Roughly:

```js
// node-key-sender, or robotjs, or a tiny PowerShell shim
// Target: window class "RiotWindowClass", title "League of Legends (TM) Client"
```

Options in rough order of preference:

1. `PostMessage`/`SendMessage` to the window handle — no focus steal. Try first.
   Many games ignore it. Test before committing.
2. `SendInput` with a brief focus flip: focus League → send key → refocus Chrome.
   Works reliably but the focus flash may appear on capture. Test whether OBS
   picks it up — game capture usually doesn't, display capture will.
3. AutoHotkey called as a subprocess with `ControlSend`. Ugly, but AHK has solved
   this specific problem for twenty years and it may just work.

**Anti-cheat.** This is a replay client with no live game, and camera hotkeys are
not gameplay input, so the risk here is low in principle. It is still synthetic
input to a Riot process. Accept that risk knowingly or don't build this brief —
don't discover the concern halfway through.

**Fallback if the spike fails.** This is not a project-killer. Keep the portrait
grid as a stats readout, drive camera position via `/replay/render`
(`cameraPosition`, `cameraRotation`) instead of locking, and use brief 006's
preset system for fixed angles. You lose follow-cam, you keep everything else.
Note the outcome in `brief_log.md` either way — brief 006 wants to know.

**Player data:**

```
GET /liveclientdata/playerlist
```

Works during replays. Returns champion name, summoner name, scores
(kills/deaths/assists/creepScore), items, level, team. Poll at 1 Hz — this is
narration reference, not transport, and it doesn't need to be smooth.

**Portrait art.** Use Data Dragon:
`https://ddragon.leagueoflegends.com/cdn/<version>/img/champion/<Name>.png`.
Champion names from the API mostly match Data Dragon keys but not always
(Wukong/MonkeyKing is the classic trap). Cache locally so the panel works if
you're offline.

**Layout.** Left column, two blocks of five, blue above red. Hotkey number
printed on each portrait — it doubles as documentation and as a check that the
ordering is right.

## Outcome (2026-08-04)

Keystroke bridge is a **confirmed dead end**, not just "the spike failed."
Three synthetic-input methods tested, each with genuinely confirmed window
focus: `PostMessage`, `SendInput` (keyboard), `SendInput` (mouse double-click,
the client's actual manual lock mechanism, not the number-row hotkey the brief
assumed). Zero effect on camera state in every case — almost certainly
Vanguard blocking synthetic input generally. Don't re-attempt this approach in
a later brief.

Pivoted to a real documented API found via a sibling project
(fletch-spec/lol-path-mapper): `POST /replay/render {selectionName,
cameraAttached: true}`. This reliably selects the target champion (verified
repeatedly) but **does not deliver a working follow-cam** — tried `cameraMode`
`top` (shipped default), `focus` (selects the info frame, camera stays
parked), `path` (no visible change); `tps` closed the replay entirely on one
attempt. Shipped the brief's own documented fallback: portrait grid, live
KDA/CS (no gold — not exposed by the API for any player but the local
spectator), click-to-select with a lock indicator driven by real polled
state, no follow-cam.

**Brief 006 needs this**: don't assume `cameraAttached` gives camera follow,
and treat `cameraMode` changes as carrying a small but real crash risk.
