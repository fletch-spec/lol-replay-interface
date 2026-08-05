---
id: brief-002
state: complete
created: 2026-08-04
updated: 2026-08-04
agent: user
project: LOL-REPLAY-CONTROLLER
depends_on: [brief-001]
---

# Brief 002: Transport Control

## Problem Statement

Controlling a replay currently means alt-tabbing to the game, finding the tiny
replay bar, and dragging it — which breaks the recording and puts the mouse
cursor on camera. The panel needs a transport big enough to operate blind while
talking: play, pause, scrub, speed, and frame-accurate nudging.

## Done Looks Like

You can run a full replay start to finish without touching the game window. The
scrub bar shows position and updates as the replay plays. Dragging it seeks
cleanly with no visible stutter on the OBS capture. Speed changes are one click.
Spacebar pauses. Arrow keys step 5 seconds; shift-arrows step 1 second. The time
display shows game clock, not wall clock.

## Hardest Part

Seek behaviour under load. Naively firing a POST per mousemove floods the client
and the game visibly hitches — which is fatal, because this is being recorded.
Scrub must update the UI optimistically at 60fps while sending at most one write
to the client, on release.

## Can't Skip

- Debounced scrub: UI follows the mouse immediately, the client receives one
  write on mouseup. Never write mid-drag.
- Pause → seek → set speed → unpause ordering on every seek. Changing speed
  during an active seek behaves unpredictably.
- Speed presets as discrete buttons, not a slider: 0.25× / 0.5× / 1× / 2× / 4×.
  Sliders can't be hit accurately without looking.
- Keyboard: space = pause, ←/→ = ±5s, shift+←/→ = ±1s. Must not fire while
  focus is in a text input.
- Time displayed as `MM:SS` game clock. Never raw seconds.
- Pause button state reflects the *client's* actual paused flag from polling,
  not the panel's assumption. They desync.

## Notes

**State comes from the client, not the panel.** `/replay/playback` is the single
source of truth. The panel renders what it polls. If you track paused state
locally, it will drift the first time you pause in-game and the button will lie.
Only exception is the scrub bar during an active drag — that follows the mouse
until release, then hands control back to polling.

**Endpoint:**

```
GET  /replay/playback  → {time, length, speed, paused, seeking}
POST /replay/playback    {time: 420.5}     # seek
POST /replay/playback    {speed: 2.0}      # speed
POST /replay/playback    {paused: true}    # pause
```

Confirm field names against `/docs` — `seeking` in particular is read-only and
POSTing it may error.

**Seek sequencing.** Wrap it:

```js
async function seekTo(t) {
  await post({ paused: true });
  await post({ time: t });
  if (wasPlaying) await post({ paused: false });
}
```

The ~150ms lag is inherent. Don't fight it — just don't multiply it by firing
fifty of them during a drag.

**Layout.** Transport spans the full width at the bottom of the panel, and it
should be uncomfortably large — the scrub track at least 40px tall. This is the
control you'll use most and often peripherally. Leave vertical space above the
track: brief 004 renders event markers into it and brief 005 adds cue pins.

**Speed and voiceover.** 0.5× is the useful default for narration — real time is
too fast to explain anything, and 0.25× makes champion animations look wrong
enough to distract. Make 0.5× visually the primary button.

**Out of scope:** event markers, cue points, looping, camera. Transport only.
