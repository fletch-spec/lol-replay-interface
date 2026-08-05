---
id: brief-005
state: ready
created: 2026-08-04
updated: 2026-08-04
agent: user
project: LOL-REPLAY-CONTROLLER
depends_on: [brief-002, brief-004]
---

# Brief 005: Cue Points + A/B Loop

## Problem Statement

This is the brief the whole project exists for. Narrating a replay live means
knowing what you're going to say and when, then being able to redo a line without
losing your place. Right now a fluffed sentence means scrubbing back by hand,
finding the spot, and rebuilding your mental context — which is why single-pass
voiceover usually gets abandoned for editing in post.

## Done Looks Like

You can mark a set of timestamps with notes, then walk the replay through them
one key at a time — each press seeks to the next cue and holds paused, so you
talk, press, talk, press. Setting an A/B loop around a fight replays that section
continuously so a line can be re-recorded as many times as needed without
touching the scrub bar. Cues survive closing the browser and are tied to the
specific replay.

## Hardest Part

Making it usable without looking at it. The whole point is that your attention is
on the game and your voice, not the panel. If placing a cue takes two clicks and
a dialog, you'll stop doing it by the third replay. Every action here needs to be
one key.

## Can't Skip

- One-key cue placement at current playback position. No dialog, no confirm.
- Note text is optional and editable *after* placement — never blocking.
- Next/previous cue navigation on single keys, seeking and holding paused.
- A/B loop: set A, set B, toggle loop. Loop must survive being paused mid-loop.
- Persistence to `localStorage` keyed by game ID, surviving browser restart.
- Export cues as plain text with timestamps — this becomes the script and the
  video description/chapter markers.
- Cues render as distinct pins on the scrub track, visually different from
  brief 004's event markers. Two marker types on one bar must not be confusable.

## Notes

**Suggested keymap** (avoid collisions with brief 002's space / arrows):

```
M         place cue at current time
N / B     next / previous cue
[  /  ]   set loop A / set loop B
L         toggle loop
Esc       clear loop
```

**The core loop this enables:**

1. Watch through once at 2×, pressing M whenever something's worth mentioning
2. Go back, add notes to the cues — "explain ward timing", "this is the mistake"
3. Start recording. Press N, talk, press N, talk.
4. Fluff a line → `[` `]` around it, `L`, re-record until it's right, `Esc`

Step 4 is the value. Everything else is scaffolding for it.

**Cue placement from events.** Clicking an event marker from brief 004 while
holding a modifier should place a cue there. Most cues land on events anyway, and
this saves playing through to place them.

**Auto-pause lead-in.** Cues should seek to `cueTime - 2s` and pause, not to the
exact moment. You want the two seconds before the fight to set it up verbally,
not to arrive mid-explosion. Make the lead-in configurable but default it to 2s.

**Loop mechanics.** Poll playback; when `time >= B`, seek to A. The ~150ms seek
lag means the loop point is audible/visible as a small jump — acceptable, since
you're re-recording audio over it, not using the loop in the final cut. Don't
over-engineer smoothness here.

**Persistence shape:**

```js
// localStorage key: `cues:${gameId}`
[{ t: 842.5, note: "explain the ward timing", lead: 2 }, ...]
```

Game ID from `/replay/game` or the replay filename. If neither is stable across
sessions, fall back to `length` + `gameMode` as a composite key — imperfect but
good enough to distinguish replays in practice.

**Export format.** Plain text, one line per cue, `MM:SS — note`. Directly
pasteable as YouTube chapters. Do not invent a format; this is the one that gets
used.

**Out of scope:** audio recording itself. OBS handles that. The panel never
touches a microphone.
