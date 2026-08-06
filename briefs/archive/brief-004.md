---
id: brief-004
state: complete
created: 2026-08-04
updated: 2026-08-04
agent: user
project: LOL-REPLAY-CONTROLLER
depends_on: [brief-002]
---

# Brief 004: Event Timeline

## Problem Statement

Finding the moments worth talking about means scrubbing blindly through 35
minutes of replay looking for fights. The replay client already knows when every
kill, dragon, baron, and tower happened - it's in the live client data. Surfacing
that as markers on the scrub bar turns aimless scrubbing into jumping between
known beats.

## Done Looks Like

The scrub bar shows coloured tick marks at every significant game event. Hovering
a tick shows what happened ("Baron - 24:10" / "Ace - blue team"). Clicking it
seeks there. A collapsible list beside the bar shows the same events
chronologically, and clicking a row seeks too. Loading a fresh replay repopulates
everything with no manual step.

## Hardest Part

The event feed is cumulative and arrives relative to playback position, not as a
complete list up front. Getting the *whole* game's events without playing through
the whole game requires either seeking to the end to harvest them and seeking
back, or accepting a progressively-filling timeline. Decide which, deliberately.

## Can't Skip

- Events pulled from `/liveclientdata/eventdata`, deduplicated by `EventID`.
- Markers render *into* the existing scrub track from brief 002 - not a separate
  bar beneath it. Vertical space on a control panel is expensive.
- Colour-coded by type. Kills, objectives, and towers must be distinguishable at
  a glance without reading labels.
- Click-to-seek reuses brief 002's `seekTo()` - same debounce, same pause/seek
  ordering. Do not write a second seek path.
- Events persist in panel state across seeks. Seeking backward must not wipe
  events already collected.

## Notes

**The harvest problem.** `/liveclientdata/eventdata` returns events that have
occurred up to the current playback position. Two approaches:

1. **Harvest pass** - on load, seek to `length`, wait for the feed to populate,
   read the full list, seek back to 0. Takes a few seconds and gives a complete
   timeline immediately. Do this if it works; test whether the client actually
   populates events on a fast-forward seek or only on real playback.
2. **Progressive** - collect as you play. Timeline fills in as you watch. Always
   works, but useless on first pass through a replay, which is exactly when you
   need it.

Try 1, fall back to 2. If 1 works, cache the harvested list keyed by game ID so
reopening the same replay is instant.

**Endpoint:**

```
GET /liveclientdata/eventdata
→ {"Events": [{"EventID": 0, "EventName": "GameStart", "EventTime": 0.05}, ...]}
```

Event names to handle: `ChampionKill`, `Multikill`, `Ace`, `FirstBlood`,
`TurretKilled`, `InhibKilled`, `DragonKill`, `BaronKill`, `HeraldKill`,
`FirstBrick`. Names vary by patch - log anything unrecognised rather than
dropping it silently, or you'll lose Atakhan or whatever's been added since.

**Colour scheme.** Suggestion, not gospel: kills red, objectives gold, towers
blue, aces white and taller than the rest. The eye should find aces instantly -
those are almost always the beats worth narrating.

**Density.** A 35-minute game with 40 kills puts markers ~2px apart at 1080p.
Cluster markers within 5px into a single wider tick showing a count, expanding on
hover. Without this the bar becomes a solid red smear by teamfight-heavy
mid-game.

**Why this brief matters more than it looks.** It's the difference between
"scrub around until you find something" and "here are the twelve moments in this
game." It's the input to brief 005 - cue points get placed by clicking events.

**Out of scope:** cue points, notes, looping. Read-only event display.

## Outcome (2026-08-04)

Harvest approach (option 1) works cleanly: seeking near `length` populates the
full cumulative event feed within ~1s, confirmed via direct API testing before
writing any UI. Shipped as an automatic on-connect harvest - pause/seek/resume
via brief 002's existing `requestSeek()`/`doSeek()` (no second seek path),
polling for a `GameEnd` event as the definitive completion signal (falls back
to a ~3s timeout if it never appears), then seeking back to wherever playback
was. Cached in `localStorage` keyed by `gameMode:length` - confirmed a page
reload lands on cached events instantly with no visible seek.

Markers render as an absolute layer inside the existing `.scrub-track` (not a
separate bar), clustered within 5px into a single tick with a count badge,
colour-coded (kill=red, objective=gold, tower=blue, ace=white+taller,
unrecognised=gray + console-logged rather than dropped - caught a real one,
`InhibRespawned`, during testing). Collapsible list added beside the scrub bar
as a fixed-width column so the track doesn't reflow when toggled. Verified
live: click-to-seek from both a marker and a list row lands on the exact
event timestamp; seeking backward to `time:10` after harvest did not drop any
of the 33 collected events.

**Correction, same day, post-ship:** deduplicating by `EventID` (as the
brief's Can't Skip explicitly says to) is wrong and caused a real bug. The
replay client reassigns a brand new `EventID` to the same real event every
time playback passes over that point in game-time again - confirmed directly:
the same Vayne-kills-Orianna moment at ~81.5s appeared under four
different `EventID`s (2, 28, 61, 62) after repeated seeking (both mine and
the other app's). This inflated the event count from a true ~30 to 138+ and
showed as visibly-identical entries stacked at the same timestamp. Fixed by
deduplicating on a content fingerprint (`EventName` + 200ms-bucketed
`EventTime` + killer/victim/recipient fields) instead of `EventID`. If a
later brief touches `/liveclientdata/eventdata` again: **do not key anything
by `EventID` alone**, it is not stable across seeks in this API.

Also fixed same pass: the cluster count badges were always-rendered and
collided into unreadable smashed text when clusters sat close together (now
hover-only); the collapsible event list was a cramped fixed 170px column that
truncated most event descriptions (now floats as a 280px absolute panel
anchored to the toggle, doesn't reflow the scrub bar); and `InhibRespawned`
was added to the ignored-events list (game-start housekeeping, not a
narration beat - still tracked internally, just not rendered).

No endpoint or scope surprises this brief - `/liveclientdata/eventdata`
matched the brief's documented shape exactly. The dedup-key assumption was
the surprise, not the endpoint itself.
