---
id: brief-007
state: complete
created: 2026-08-05
updated: 2026-08-06
agent: user
project: LOL-REPLAY-CONTROLLER
depends_on: [brief-004, brief-005]
---

# Brief 007: Clickable Controls + Layout Review

## Problem Statement

Half the panel's functionality is keyboard-only, and the keyboard is exactly
what stops working during the job this project exists for. The panel lives on
monitor 2 while the replay client holds focus on monitor 1 - so while you are
actually narrating, browser hotkeys are dead. Every cue and loop action from
brief 005, plus event stepping and seek nudging, is currently reachable *only*
by a key the browser will not receive. Meanwhile the panel's layout has grown a
brief at a time: the event and cue lists float over the timeline they're meant
to help you read, the vertical stack under the scrub track has accumulated four
separate strips, and nothing has been looked at as a whole since it was a
720px column.

## Done Looks Like

Every action the panel can perform has a visible control you can click, grouped
into the card it belongs to, and every existing hotkey still does exactly what
it did before. Someone who has never seen the panel can drive a full narration
pass - place cues, step through them, set and run a loop - without being told a
single keyboard shortcut. Nothing that helps you read the timeline covers the
timeline. The panel fits its screen without dead space at the edges or crowding
in the middle.

## Hardest Part

Adding roughly nine controls to a panel whose whole value is that you can read
it at a glance, without turning it into a wall of buttons. These two pull in
opposite directions: targets you can hit without looking away from the game
want to be big, and a panel you can absorb in a glance wants to be small. Decide
which controls earn permanent space and which can be secondary, rather than
giving all nine equal weight.

The second risk is quieter: a button and a hotkey that drift apart. Two
codepaths for "place a cue" is one bug away from the button doing something
subtly different from `M`.

## Can't Skip

- Every keyboard action gets a clickable equivalent: seek ±5s, prev/next event,
  place cue, prev/next cue, set loop A, set loop B, toggle loop, clear loop.
- Every existing hotkey keeps working, unchanged. This brief adds a second way
  in, it does not move the door.
- One implementation per action. A button and its hotkey must call the same
  function - no parallel codepath that can drift.
- Buttons live in the card that owns the thing they act on. Transport controls
  with transport, cue and loop controls with cues. Do not create a single
  undifferentiated toolbar.
- Stateful controls show their state: loop armed vs set-but-off, which cue is
  current. A button that can be "on" must look on.
- Nothing that reads the timeline may cover the timeline. The events and cues
  lists currently float over the scrub track - that has to stop.
- No new seek path. Same `requestSeek` → `doSeek` → `withMutex` chain briefs 002
  and 005 already share.

## Notes

**Why the hotkeys aren't enough, specifically.** This is already logged in
`docs/REPLAY_API.md` as "keyboard shortcuts die silently when the panel loses
focus", and it's the same root cause behind the Stream Deck idea in the project
doc. The panel is a second-monitor instrument played while another window has
focus. Treat click as the primary input and the keyboard as the accelerator for
when the panel *does* have focus - not the reverse, which is what shipped.

**Current inventory**, so nothing gets missed:

| Action | Today |
|---|---|
| Pause / play | button + `Space` |
| Speed 0.25–4× | buttons |
| Seek ±5s / ±1s | `←` `→` / shift only |
| Prev / next event | `,` `.` only |
| Place cue | `M` only |
| Prev / next cue | `B` `N` only |
| Set loop A / B | `[` `]` only |
| Toggle loop | `L` only |
| Clear loop | `Esc` only |
| Events list | toggle button |
| Cues list | toggle button |
| Camera lock | click a roster card |

Eight of twelve are keyboard-only.

**The floating panels are the layout's real problem.** Brief 004 made the event
list an absolutely-positioned dropdown because a 170px in-flow column truncated
every description. That was the right call at 720px. The panel is 1400px now,
and the same dropdown drops *over* the scrub track - so opening the list to find
a moment hides the bar you're about to click. `ui_polish_plan.md` phase 3
already specifies the replacement (a persistent right rail with filter chips and
auto-scroll to the current event); this brief is the natural place to land it.
Read that file's phases 3 and 4 before starting - several items here are already
specified there in detail, including two open bugs.

**Vertical stack under the track** has grown to four strips: cue pins, handle
time bubble, time readout, legend. That happened one brief at a time and has
never been designed as a whole. Consider whether the legend earns permanent
space once cue and loop controls are visible and self-labelling.

**Known layout bugs to fold in** (all in `docs/REPLAY_API.md`): `.speed-btn.primary`
draws an accent border while `.active` draws an accent fill, so two speed
buttons read as selected at once; seeks lag 100–200ms with no in-flight
indication, which invites a second click; the objective marker lane renders as
an empty band on replays with no dragon/baron events.

**Suggested control grouping**, not gospel:

```
transport card   ⏪5s  [Pause]  5s⏩   0.25× 0.5× 1× 2× 4×   ◂evt  evt▸
cue card         [+ Cue]  ◂ prev  next ▸   [A] [B] [Loop] [✕]
```

The cue card wants a home. It could be its own card under the transport
controls, or the cues list could become a rail alongside the events rail with
its controls in the header. Either is defensible; pick one and commit.

**Labelling.** Buttons should carry their hotkey as a hint (`Cue M`,
`Loop L`) - it teaches the accelerator without a legend, and makes the two-input
design self-documenting. If that reads as clutter at size, `title` attributes
are the fallback, but prefer visible.

**One implementation per action.** Simplest shape is a command table mapping an
id to a function, with both the `keydown` handler and the button `click`
handlers dispatching through it. That also gives a single place to ask "is this
action available right now" for disabled states - e.g. next-cue with no cues,
toggle-loop with no A/B set.

**Ordering against brief 006.** 006 adds HUD toggles and camera presets, which
is another substantial block of controls needing a home. Doing the layout review
first means redoing part of it after 006 lands; doing 006 first means it dumps
its controls into a layout that's about to change. Recommend running this brief
**after** 006 for that reason - or, if it runs first, treat "define where a new
control block goes" as part of the deliverable so 006 has an obvious slot rather
than a judgement call.

**Out of scope:** new replay-API functionality of any kind. This brief adds no
capability the panel doesn't already have - it makes what exists reachable and
readable. If you find yourself reading the swagger spec, you've drifted.

## Outcome (2026-08-06)

Shipped. No new API surface was touched, as instructed.

**The command table came first**, since drift was the risk worth designing
against rather than testing for afterwards. `COMMANDS` holds one entry per
action with `run`, plus optional `enabled` and `active` predicates; both the
`keydown` handler and every button dispatch through `runCommand(id)`. The
predicates turned out to earn their place twice over - they drive disabled
states (next-cue with no cues, toggle-loop with no A/B) and the "looks on"
state from the same declaration, so there is nowhere for the two to disagree.

Proof it holds, from live testing: arming the loop with the **button** made the
button render as on, then disarming with the **`L` hotkey** cleared that same
visual state. Placing a cue with the button and then with `M` produced two cues.
The Pause button predated the table and was still calling `togglePause()`
directly - that was the one action with two codepaths, now routed through
`runCommand('playPause')` and verified toggling both ways.

**Nine controls, three groups, no toolbar.** Transport card takes seek/pause/
speeds/event-stepping; a new cue card takes place-cue, cue stepping, and the
four loop controls. Every button carries its hotkey inline (`+ Cue M`,
`Loop L`), which replaced both lines of the old hint text - the accelerators
now teach themselves instead of being listed in a legend nobody reads.

**The floating lists are gone.** Events and cues are now one in-flow 330px rail
with tabs, verified `position: static` and not overlapping the track. This was
the layout's real problem: at 1400px the dropdown opened directly over the scrub
bar you were about to click.

**Three folded-in bugs, all fixed.** `.speed-btn.primary` now marks the
recommended speed with a dot instead of an accent border, so only one speed
button can look active. The scrub handle pulses while `seekRunning`, so a seek
in flight no longer looks settled. Empty marker lanes are collapsed rather than
reserved - replays with no dragon/baron events were rendering an empty band of
gutter that read as breakage.

**Layout result:** 1400×887 in a 1919×905 viewport, no overflow, 982px of scrub
track.

**Not done:** the legend under the track was left in place. The brief asks to
"consider whether the legend earns permanent space once cue and loop controls
are visible and self-labelling" - the loop and cue *controls* are now
self-labelling, but the marker *colours* on the track still aren't explained
anywhere else, so removing it would cost more than it saves. Worth revisiting if
the track ever gets marker labels of its own.
