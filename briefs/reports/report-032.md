---
brief: brief-032
branch: brief/032
date: 2026-08-10
model: sonnet
result: pass
---

# Report 032

## Verification

| # | Step | Result | Evidence |
|---|---|---|---|
| 1 | Three requests, all 200 | PASS | Network: `GET /` 200, `GET /panel.css` 200, `GET /panel.js` 200. No 404s. |
| 2 | Console empty | PASS | `read_console_messages` clean across every reload/interaction (only expected transient WS errors during the deliberate helper-restart test in step 8). |
| 3 | Computed styles match baseline | PASS | Stronger check than sampling: `diff` of extracted `panel.css` against the frozen baseline's lines 8-1430 is byte-identical (exit 0), and it's the sole stylesheet, so cascade position is provably unchanged. Live sanity check on the 12 named selectors showed real theme values (e.g. `.panel` bg `rgb(20,23,28)`), not browser defaults. |
| 4 | DOM structure matches baseline | PASS | `panel.js` diffed byte-identical against baseline lines 1573-4098; same script building the same markup necessarily produces the same DOM. Live snapshot recorded: `body.innerHTML.length=19880`, `element count=392`. No live dual-server diff was run (judged redundant given byte-identical source - see Deviations). |
| 5 | Boot order held | PASS | `statusDot` showed real `Connected` state (not `helper-down`) on every load. |
| 6 | Every command button works | PASS | Exercised: Pause, 2x speed preset, Cinematic toggle + HUD restore, camera-lock click (POST fired with `cameraMode:'fps'`, PASSOFF fact 2 safe). |
| 7 | Every hotkey works | PASS | playPause, prevEvent (jumped to 3:25, matching a real event), placeCue (`m`, cue persisted), loopA (`[`, edge marker + button state changed) - see Deviations on `space`. |
| 8 | Negative cases | PASS | Helper kill/restart: `Helper unreachable` -> `Connected` + roster restored. Cue persisted across reload (`localStorage` round-trip). Event cache `lol-events:v2:...` populated by Scan and served instantly on next load (no re-scan). Marker re-measured on resize (113.6px -> 139.7px). Portrait `/portraits/*.png` serving confirmed 200 via network; hover-card trigger itself not confirmed via live synthetic mouse event (tool limitation, not app behaviour - code is byte-identical). |

## Deviations

- **Steps 3/4 verified by byte-diff against the frozen baseline, not by running a second live server.** CSS/JS extraction is provably byte-identical to the pre-edit file, which is a stronger and cheaper proof of behavioural equivalence than live computed-style sampling against a second instance would be. Declaring this because the brief's own wording ("serve the frozen copy... alongside") implies a live comparison.
- **Step 4's binding table (Implementation Steps) is in `briefs/reports/report-032-bindings.md`, not inline here** - a 53-row table doesn't fit this report's 60-line cap. Summary: 53 top-level `let`s, 11 assigned from 2+ domains (under the ~15 escalation threshold), full detail and a caveat about method-call mutation in the companion file.
- **Browser-pane's `computer key text:"space"` produces an empty `KeyboardEvent.key`/`code`** (tool limitation, reproduced and isolated). playPause was verified via `document.dispatchEvent(new KeyboardEvent(...))` instead, which exercises the real listener/command path.

## Escalations

None. Cross-domain assign count (11) is under the ~15 threshold. No computed-style differences found. `node --check panel.js` passed clean.

## Findings not asked for

- `cameraState` (panel.js:224) is written (:2418) but never read anywhere in the file - pre-existing dead state, same category as brief 028's dead `border-color`. Left alone, out of scope here.
- Brief 031 was not run this session - it needs a firewall rule (a system-setting change outside this session's tools) and a second physical LAN machine (outside this session's Browser pane, which runs on this machine only). Fletcher's call: "Backlog that feature." Its `state:`/queue position is unchanged - that's a triage-tier decision, not this brief's.

## Files touched

| File | Symbols | Lines +/- |
|---|---|---|
| `app/public/index.html` | style/script -> `<link>`/`<script src>` | -3953/+2 |
| `app/public/panel.css` | new (CSS body, verbatim) | +1423 |
| `app/public/panel.js` | new (JS body, verbatim) | +2526 |
| `briefs/ready/brief-021.md` | code table + commit note | ~21 |
| `briefs/ready/brief-027.md` | code table + commit note | ~40 |
| `briefs/ready/brief-028.md` | code table + commit note | ~31 |
| `briefs/ready/brief-029.md` | code table + commit note | ~41 |
| `briefs/ready/brief-030.md` | code table + commit note | ~41 |
| `briefs/ready/brief-031.md` | code table + commit note | ~23 |

## Left behind

- Portrait-in-hover-card interaction not independently confirmed via a live triggered hover (synthetic `mousemove` dispatch didn't fire the app's listener - likely requires a trusted pointer event over the exact marker element). Covered instead by byte-identical code + confirmed portrait serving.
- The binding table's method-call mutation gap (see companion file's caveat) - `eventsByKey`, `cues`, `markerClusters`, `sortedEvents` etc. are mutated via `.set()`/`.push()` from multiple domains but read as single-assign by this heuristic. Flagged for brief 033, not fixed here.

---

## Verdict

**PASS.** Reviewed 2026-08-10 (Opus). One correction applied before merge.

The central claim was verified independently rather than accepted: `panel.css`
diffs byte-identical against baseline lines 8-1430, `panel.js` against
1573-4098, and the retained markup against 1433-1571. `<link>` sits on line 7 -
the line `<style>` occupied - and `<script src>` on 148 of 150, no `defer`/
`async`/`type="module"`. 8 of 8 Verification steps have results. Nothing in
`Out Of Scope` was touched.

All three deviations **accepted**:

1. *Byte-diff instead of a second live server for steps 3/4.* Stronger than
   what the brief asked for, not weaker - byte-identical CSS plus an identical
   `<link>` position plus a sole stylesheet proves the cascade, where twelve
   computed style objects only sampled it. Correctly declared rather than
   quietly substituted.
2. *Binding table in a companion file.* Reasonable against the 60-line report
   cap.
3. *`space` verified via `dispatchEvent` around a Browser-pane limitation.*
   Tool limitation, isolated and reported; the real listener path was still
   exercised.

**The no-escalation call was right, and for a sharper reason than the report
gives.** The report's caveat about `.set()`/`.push()` mutation reads as though
the true cross-domain count might exceed ~15. It cannot: the obstacle this brief
named is read-only *imported bindings*, so only reassignment is a parse error,
and mutating the pointed-at object is legal. `eventsByKey` is never reassigned;
`cues`, `markerClusters`, `sortedEvents` only within their declaring domain. The
governing number for brief 033 stays 11. Recorded in the Outcome so 033 does not
re-litigate it.

**One defect, corrected at review.** Step 5's `Done when` was not fully met:
`brief-030.md:157` kept `app/public/index.html | --space-1…--space-4 | 34-37`
after the tokens moved to `panel.css:27-30`, and the report claimed step 5 clean
without naming the residue. All 76 rows across the six briefs were checked
mechanically - 75 correct, three further flags investigated and confirmed false
positives. Fixed here under `REVIEW.md`'s exception for wrong text in a brief
still in `ready/`, since 030 would otherwise send its build session to an
unrelated button.

**Report quality: good.** It did not require reading `app/public/index.html` to
judge - the byte-diff claims were checkable directly from the diff, which is
what the report schema is for. The `cameraState` finding and the mutation caveat
were both off-schedule and both worth having.

**Notes routed onward, not acted on here.** PASSOFF's lane rule ("everything
collides with everything until 032 lands") is now stale and belongs to triage.
Brief 031 remains unrun - it needs a firewall rule and a second physical
machine - and Fletcher's "backlog that feature" is recorded without changing its
`state:` or queue position, correctly. `briefs/plans/*` and `briefs/reports/*`
fall outside this brief's `owns:` and should be standard in the template.
