---
brief: brief-027
branch: brief/027
date: 2026-08-10
model: sonnet
result: pass
---

# Report 027

## Verification

| # | Step | Result | Evidence |
|---|---|---|---|
| 1 | Scan completes, note count | PASS | `Events (25)` visible, `eventsByKey.size` 28 raw. |
| 2 | Scan again, same count | PASS | Two forced full scans (harvestDone reset via console, real UI click, ~925s each at 32x): both landed at 28 raw / 25 visible. |
| 3 | No adjacent dup rows <2s | PASS | Full scroll + programmatic sweep: `survivingDupsUnder2s: []` after two scans. |
| 4 | Multikill rows preserved | PASS | Live 2x multikill present (KillStreak 2, t=810.27). Synthetic 2x/3x 0.5s apart returns distinct keys - no 3x exists on this replay to sample live. |
| 5 | Diff killers same second = 2 rows | PASS | `3:11 Gnar killed Jax` / `3:11 Morgana killed Wukong`, both present. |
| 6 | Steppers hit every row, no skip/repeat | PARTIAL | Normal spacing: 185→190.79→191.49→403.14→back to 206.01, all correct via real clicks. 4 pairs share an *identical* EventTime (different identity, e.g. a mutual kill at t=191.494); `stepEvent()`'s own `time+0.5` buffer (untouched, not owned by this brief) skips the second one. Confirmed live: stepping from 191.494 jumps to 206.006, skipping Lemon Destructor's kill. Pre-existing - the old fingerprint never merged these (different killer/victim) and stepEvent's buffer logic predates this brief. |
| 7 | Marker count = hover card rows | PASS | Busiest cluster: 3 events (First Blood, Nocturne→Sivir, Morgana→Zeri). `showHoverCard()` renders exactly 3 `.hc-row`. |
| 8 | Cue placed, survives reload | PASS | Placed at t=206.006 via real `+ Cue` click, reloaded, both it and the pre-existing cue (t=380.566) present with identical times. Removed after proving persistence. |
| 9 | Reload count matches pre-reload | PASS | 28 raw / 25 visible, identical before and after reload. |

## Deviations

- **`eventFingerprint()` deleted, not left in place.** Step 2 said "leave it for
  now"; by step 4, `mergeEvents()` no longer calls it and it became fully dead
  code (grepped zero call sites). Removed rather than left as an orphan.
- **Step 7's second scan used a real click after resetting `harvestDone` via
  console** - the UI has no "rescan a completed replay" affordance by design
  (brief 009). Same code path (`scanReplay()`) either way.

## Escalations

None triggered. Step 1 found real duplicate pairs (0.616s/0.364s/0.386s/0.539s
gaps on this live replay, not brief 017's exact numbers - different replay).
Step 6 found no surviving pair under 2s. Cache self-healed without a version
bump (step 5).

## Findings not asked for

- V6's stepper skip (see row 6) is real but out of this brief's `owns:` -
  `stepEvent()` and its `time+0.5` buffer aren't in Implementation Steps or
  Where The Code Is as something this brief changes. Worth its own brief if
  simultaneous-timestamp events are common enough to matter.

## Files touched

| File | Symbols | Lines +/- |
|---|---|---|
| `app/public/panel.js` | `eventIdentity()` (new), `eventFingerprint()` (removed), `DEDUPE_TOLERANCE_S`/`eventAnchors`/`eventAnchorKey()` (new), `mergeEvents()`, `clearEventsDisplay()` | +42/-17 |

## Left behind

- The stepper skip above - real, pre-existing, not this brief's to fix.

---

## Verdict

**PASS.** Reviewed 2026-08-10 (Opus). No corrections needed before merge.

9 of 9 Verification steps have results. Nothing in `Out Of Scope` was touched -
one file, five symbols, with `EVENTS_CACHE_VERSION`, `CLUSTER_PX`,
`describeEvent()` and the harvest all untouched.

**All four `Can't Skip` items verified against the shipped file, not the
report's word for them:**

1. *Step 1 before any edit* - four pairs measured at 0.616 / 0.364 / 0.386 /
   0.539s. Different replay than brief 017's, so different numbers; the Escalate
   clause fires only on *no* pairs, so this was correctly not an escalation.
2. *The anchor must not move* - `eventAnchorKey()` returns `${identity}|${anchor}`
   on a hit and neither pushes nor rewrites. Confirmed in code, not inferred.
3. *`KillStreak` stays in the identity* - present and last in the tuple, with the
   `|| ''` coercion kept on every optional field as the Traps section required.
4. *Clear the anchors wherever `eventsByKey` is cleared* - `eventsByKey.clear()`
   occurs exactly once in the file (`:1203`) with `eventAnchors.clear()` on the
   next line, and `eventsByKey` is never reassigned after init. "Wherever" is
   satisfied because there is only one where.

**Both deviations accepted.** Deleting `eventFingerprint()` is the end state of a
step that said "leave it for now"; it had zero call sites by step 4. Resetting
`harvestDone` via console to force a second scan works around an affordance brief
009 removed on purpose and runs the same `scanReplay()` path.

**The PARTIAL on V6 passes and the "pre-existing" claim holds structurally.**
`stepEvent()` appears zero times in the diff, and the affected pairs have
different identities, so the old fingerprint never merged them either.

One thing the report framed slightly too cleanly, now recorded in the Outcome:
the bug is pre-existing but its *exposure* may be new. Last-copy-wins previously
overwrote stored `EventTime`s with independently-jittered values that would
rarely tie exactly; first-copy-wins preserves both original times, which for a
truly simultaneous pair are identical - the exact input `stepEvent()`'s `+0.5`
buffer mishandles. Stated as an untested hypothesis, with the before/after tie
count named as what would settle it. It does not argue against first-copy-wins.

**Report quality: good.** Judging this never required opening the codebase for
intent - only two claims needed checking against the file, and both were
`Can't Skip` items that no diff can show (a symbol's continued presence, and the
absence of a second clear site). That is the schema working.

One nit for the next report: `Deviations` and `Escalations` cite "step 5/6/7"
meaning *Implementation* steps while the table numbers *Verification* steps, and
both sets exist and disagree. Say which.

**Not fixed here, by rule:** the stepper skip is adjacent work and becomes a
commission for `AUTHOR.md`, not a commit in a review.
