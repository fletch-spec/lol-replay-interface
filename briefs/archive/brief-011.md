---
id: brief-011
state: ready
created: 2026-08-06
updated: 2026-08-06
agent: user
project: LOL-REPLAY-CONTROLLER
depends_on: [brief-003, brief-005, brief-007, brief-010]
---

# Brief 011: Narration Papercuts

Closes [#2](https://github.com/fletch-spec/lol-replay-interface/issues/2),
[#5](https://github.com/fletch-spec/lol-replay-interface/issues/5) and
[#8](https://github.com/fletch-spec/lol-replay-interface/issues/8).

## Problem Statement

Three small things that each survive alone but add friction to every session.
None is worth a brief on its own; together they are an afternoon and the panel
stops nagging.

1. **Gnar 404s once a second.** While transformed, the client reports
   `championName: "Mega Gnar"`, which is not a Data Dragon id, so the portrait
   route 404s. The roster re-renders at 1Hz, so it retries forever and fills the
   console with errors during narration.
2. **Cue lead-in is not editable.** Brief 005 shipped the storage - every cue
   carries a `lead` field, persisted and honoured when navigating - but no way
   to change it, so every cue uses the 2s default. Some moments want five
   seconds of run-up and some want none.
3. **Dead keypresses look like a broken panel.** Hotkeys only fire when the
   browser has focus, which it usually doesn't while the replay client is
   focused. Brief 007 largely solved this by giving every action a button, but a
   keypress that silently does nothing still reads as a bug rather than as
   "wrong window".

## Done Looks Like

A session with Gnar in it produces a clean console. A cue that needs a longer
run-up gets one, per cue, without a dialog. Pressing space while the game has
focus tells you why nothing happened instead of looking broken.

## Hardest Part

Not letting the third one grow. A focus indicator is a chip that appears when
`document.hasFocus()` is false. It is not a focus-management system, it does not
try to steal focus back, and it must never cover a control. The temptation is to
make the panel clever about focus; don't.

The first one has a trap worth checking rather than assuming: Gnar is probably
not the only champion whose reported name changes at runtime.

## Can't Skip

- **Gnar's portrait resolves while transformed**, and the fix is a name mapping
  rather than swallowing the 404 - the portrait should appear, not just stop
  erroring.
- **Check the other transforming champions** in the same pass: Elise, Nidalee,
  Jayce, Karma, and anything else that reports a different `championName` in a
  different form. One alias each is cheap; discovering them one at a time over
  months is not.
- **Lead-in is editable per cue** and persists with the cue. The existing `lead`
  field is the storage - do not add a second one.
- **Editing a lead-in must not block cue placement.** Same rule as notes in
  brief 005: `M` stays instant, everything else is edited afterwards.
- **The focus chip never covers a control**, and disappears the moment focus
  returns.

## Notes

**Gnar.** `normalizeChampionKey()` in `server.js` strips non-alphanumerics and
lowercases, so `"Mega Gnar"` becomes `megagnar` and misses. The champion map is
built from Data Dragon's `champion.json` by both `id` and `name`. An alias table
applied before lookup is the smallest fix. Note the map already handles the
`MonkeyKing`/`Wukong` case, so there is a precedent for exactly this.

**Lead-in UI.** The cue list rows already carry an editable note input and a
delete button; a small number field alongside is the obvious home. Cue rows live
in the rail now, not the old floating dropdown, so there is more width than
there used to be. Consider whether a per-cue value is even the right shape - a
single default that new cues inherit, plus per-cue override, may be less fiddly
than typing a number into every row.

**Focus chip.** `document.hasFocus()` plus `window` focus/blur events. The
statusbar already has a chip row (mode, speed, paused, loop) and one more fits
there. Keep the wording about the *panel*, not the game - "click panel for
keys" says what to do; "not focused" doesn't.

**Order.** Depends on 010 only because 010 may decide the legend should lose its
objective entry, and the legend is the sort of thing that gets tidied in a
papercuts pass. If 010 finds objectives are fine, that dependency is free.

**Out of scope:** rebinding hotkeys, and anything that changes what the existing
keys do. Brief 007 settled the command table; this brief adds no commands.
