---
id: brief-010
state: complete
created: 2026-08-06
updated: 2026-08-07
agent: user
project: LOL-REPLAY-CONTROLLER
depends_on: [brief-004, brief-009]
executes_after: brief-009
model: sonnet
---

# Brief 010: Event Feed Audit

Closes [#7](https://github.com/fletch-spec/lol-replay-interface/issues/7).

> Read-only investigation. The only code changes permitted are deletions of
> things the audit proves are unreachable, plus wiki updates.
>
> Line numbers are from commit `d0ae049`.

## Problem Statement

The one replay this project has been tested against contained no `DragonKill`,
`BaronKill` or `HeraldKill` at all - 99 `ChampionKill`, 16 `TurretKilled`, 13
`Multikill`, 4 `Ace`, and one each of `FirstBlood`, `FirstBrick` and
`InhibKilled`. Nothing was logged as unrecognised, so they were not being
miscategorised; they simply were not in what the client returned. That leaves
the panel advertising an objective category in its legend that may never appear,
and a marker lane that may be dead code. It is equally possible that game had no
dragons taken, which would make all of this fine. Nobody has checked a second
replay.

## Done Looks Like

You know whether the client reports neutral objectives, from evidence rather
than inference. The panel's categories match what the feed actually contains. If
objectives do not come through, the panel stops claiming they do. If they do,
there is a named test replay on record that proves it.

## Decision (already made - do not re-litigate)

The scope of this brief is **finding out what is true and making the panel match
it**. It does not extend the timeline, add categories, or change the fingerprint.

There is one open question this brief must answer with evidence, and one trap in
how it gets answered:

**"This replay also has no dragons" is not the finding.** It is the absence of a
finding. Only a replay you have *watched* a Baron get taken in can distinguish
"the feed omits objectives" from "these games had no objectives". Pick the test
replay by watching for the objective first, then checking whether the API saw it.
If you stop at the first negative you will hand back a confident wrong answer.

## New Evidence To Check First

The 2026-08-07 UI review's screenshots show a 29:20 replay reporting **4 events**
in the rail, all timestamped 29:01-29:11, growing to 6 once playback passed 1:27.
A 29-minute game with four events is not plausible.

That is consistent with the harvest populating only end-of-game events rather
than the full cumulative feed - which, if true, means this brief's entire premise
("the feed contained 99 kills and no dragons") describes a *partial* harvest, and
the objective question was never really tested at all.

**Check this before anything else.** If the harvest is incomplete, the dragon
question cannot be answered until it is fixed, and this brief stops and reports
rather than proceeding on a broken sample.

## Where The Code Is

| What | File | Symbol | Line |
|---|---|---|---|
| Name → category map | `app/public/index.html` | `EVENT_CATEGORY` | 1941 |
| Deliberately dropped names | `app/public/index.html` | `IGNORED_EVENT_NAMES` | 1953 |
| Unrecognised-name logging | `app/public/index.html` | `categoryFor()` | 1956 |
| Human-readable strings | `app/public/index.html` | `describeEvent()` | 1990 |
| Lane assignment | `app/public/index.html` | `LANE_FOR` | 2042 |
| Legend markup | `app/public/index.html` | `.legend` block | 1215 |
| Cache key to read | `app/public/index.html` | `eventsCacheKey()` | 2349 |
| Raw feed source | `app/server.js` | `pollRoster()` → `/liveclientdata/eventdata` | 213 |

## Implementation Steps

1. **Verify the harvest is complete** on the current test replay, per the
   section above. Open a replay, run the scan (brief 009 made it explicit), then:
   ```js
   JSON.parse(localStorage.getItem('lol-events:CLASSIC:1760')).length
   ```
   using the real key. Cross-check against the raw feed after a full scan:
   ```bash
   curl -s http://localhost:3000/api/liveclientdata/eventdata | python -c "import json,sys; e=json.load(sys.stdin)['Events']; print(len(e))"
   ```
   *Done when:* you can say whether the harvest returns tens of events or
   hundreds. If it is tens on a long game, **stop and report**.

2. **Pick two more replays deliberately.** At least one must be a game you have
   watched, or can watch, a dragon and a baron being taken in. Note the
   approximate in-game times of those objectives before touching the API.
   *Done when:* you have two replay files and written-down expected timestamps.

3. **Dump every distinct EventName per replay**, not just the ones being looked
   for:
   ```bash
   curl -s http://localhost:3000/api/liveclientdata/eventdata \
     | python -c "import json,sys,collections; e=json.load(sys.stdin)['Events']; print(collections.Counter(x['EventName'] for x in e))"
   ```
   Brief 004 caught `InhibRespawned` exactly this way. Atakhan, or whatever ships
   next, will arrive the same way.
   *Done when:* you have a name→count table for each replay.

4. **Check the payload shape if objectives do arrive.** `describeEvent()` (2001)
   prints `event.DragonType` for `DragonKill`, and that field has never been seen
   on a real event - it was assumed. Print a whole `DragonKill` object.
   *Done when:* either the field is confirmed, or `describeEvent()` is corrected
   to what the event actually carries.

5. **Make the panel match the answer.**
   - Objectives arrive → confirm they render in lane 1 with the right colour,
     and that `describeEvent()` produces something readable. No structural change.
   - Objectives never arrive → remove the objective legend entry (1217) and the
     `objective` category from `EVENT_CATEGORY`/`LANE_FOR`. The lane already
     collapses when empty (`laneSlot` at 2074), so this is about not advertising
     a category that cannot appear, not about a visible gutter.
   *Done when:* the legend describes only categories the feed can produce.

6. **Record the result in the wiki's Replay API page either way.** "The feed does
   report dragons, the event name is X, here is the payload" is exactly as
   valuable as the negative, and this is the only artifact of this brief that
   survives it.

## Verification

There is no UI to test. The deliverable is evidence, so the verification is that
the evidence is falsifiable:

- The wiki entry names the specific replays checked, not "a few replays".
- For any objective claimed absent, the entry states that the objective was
  *observed in the game* and *absent from the feed* - both halves.
- The name→count table is pasted in, so the next session can diff against it
  rather than re-running the whole audit.

## Can't Skip

- **Check at least two more replays**, at least one known to contain a dragon
  and a baron, verified against the game and not against assumption.
- **Log every distinct `EventName` seen**, not only the ones being looked for.
- **The panel must not advertise categories it cannot show.**
- **Record the result in the wiki** whichever way it goes.
- **Do the harvest-completeness check first.** Auditing a partial sample
  produces a confident wrong answer, which is worse than no audit.

## Traps

- **Stopping at the first negative.** Covered above; it is the main risk in this
  brief and it looks like success.
- **`EventID` still must never be used as a key** while poking at this code.
  `eventFingerprint()` (2020) is the key.
- **The 200ms fingerprint bucket** (`Math.round(event.EventTime * 5)` at 2023)
  means two genuinely distinct events within 200ms with identical participants
  collapse into one. If a count looks one short, check this before concluding
  the feed dropped something.
- **`categoryFor()` logs each unknown name once per page load**
  (`loggedUnknownEvents` at 1954). Reload the panel between replays or you will
  miss a new name on the second one.
- **Another app on this machine drives the same replay client.** If events
  appear that your playback never passed, that is the cause.

## Out Of Scope

Adding new event categories, changing the dedup fingerprint, marker rendering
and density (brief 014), and the legend's *layout* as opposed to its contents.

## Escalate Instead Of Deciding

- If step 1 shows the harvest is incomplete, stop. That is a bug in brief 004's
  mechanism, it invalidates this brief's sample, and it needs its own decision
  about whether it lands here or reopens 009.
- If objectives arrive under an event name not in `EVENT_CATEGORY`, adding it is
  a one-line change but it is still an extension - report the name and confirm
  before adding it.

## Outcome (2026-08-07)

**Stopped at step 1, as instructed.** The harvest is confirmed incomplete -
this brief's escalation condition for that exact finding fired, one brief
early (during brief 009's own live testing of the newly-explicit Scan
button, against the same replay).

Evidence, reproduced cleanly for this brief specifically: cleared the cache,
ran a real Scan through the panel UI against the live replay (`CLASSIC`,
length 1698.15s), and read the cached result straight from
`localStorage['lol-events:CLASSIC:1698']` per this brief's own step 1
method - **15 events**. Immediately after, independently seeked to `time:
1697` via a raw request (bypassing the panel entirely) and queried
`/liveclientdata/eventdata` directly at that same position after a 2s
settle - **24 events**, including `ChampionKill` **19** times against the
scan's own capture of roughly 10-11. Same replay, same end-of-game position,
two different counts depending only on which code path asked. The scan
under-reports even relative to a same-instant, same-position query - this
is not a "wait longer" problem, and it is not specific to brief 009's new
code path (the underlying seek-and-poll-for-`GameEnd` mechanism is
unchanged from brief 004).

Per the brief's own instruction, did not proceed to steps 2-6: did not pick
additional replays, did not audit for `DragonKill`/`BaronKill`/`HeraldKill`,
did not touch `EVENT_CATEGORY` or the legend. Auditing dragon/baron presence
against a harvest that demonstrably drops roughly a third of `ChampionKill`
events on its own home turf would produce exactly the "confident wrong
answer" this brief was written to avoid. No code changes made (correctly,
per this brief's own read-only constraint) beyond what brief 009 already
shipped.

**Also could not do this session, independent of the harvest bug:** picking
a second and third replay "known to contain a dragon and a baron" (step 2)
requires either watching a replay or knowing its contents in advance -
neither is available without the user's involvement, since this session has
no access to the actual League client window, only the panel and the API.
That gate would have applied even if the harvest turned out to be sound.

**This needs a decision the brief explicitly declines to make for me:**
whether the fix belongs in a reopened brief 004, a new fix pass on brief
009's `scanReplay()`, or its own brief. Recorded in
[Replay API](https://github.com/fletch-spec/lol-replay-interface/wiki/Replay-API#the-feed-is-cumulative-not-complete)
either way. The dragon/baron question itself remains completely open - not
"no objectives," genuinely unanswered.
