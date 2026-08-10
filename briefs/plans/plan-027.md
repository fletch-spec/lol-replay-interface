---
brief: brief-027
branch: brief/027
created: 2026-08-10
---

# Plan 027

| # | Work product | File : symbol | Done when |
|---|---|---|---|
| 1 | Baseline measurement (console script grouping by identity minus time) | `panel.js` : console, ad hoc | you have a list of same-identity pairs and their gaps, and a total event count. Brief 017 predicts pairs at ~0.91s, ~0.25s and ~0.18s; brief 026 predicts ~34 pairs inside 2s on a twice-scanned replay. |
| 2 | `eventIdentity()` added, `eventFingerprint()` rewritten to call it | `panel.js` : `eventFingerprint()` :847 | `eventFingerprint(e)` still returns a string that differs for two events differing in any non-time field, and the app still runs unchanged. |
| 3 | Anchor index + `DEDUPE_TOLERANCE_S` + gap-test key function | `panel.js` : new, near `eventsByKey` :717 | called twice with two events 0.18s apart and identical in every other field, it returns the same key both times; called with two 2.5s apart, two different keys. |
| 4 | `mergeEvents()` rewritten first-copy-wins; anchor index cleared in `clearEventsDisplay()` | `panel.js` : `mergeEvents()` :1188, `clearEventsDisplay()` :1180 | re-merging the same array twice leaves the count and every `EventTime` identical, and a disconnect/reconnect starts from zero anchors. |
| 5 | Cache self-heal proof (v2 cache with known dup, reload, compare) | `panel.js` : `loadCachedEvents()` :1233 | the raw cached array is longer than the rendered count by exactly the number of duplicate pairs step 1 found, with no version bump. |
| 6 | Re-run step 1's measurement on new build | same script | every same-identity pair with a gap under 2s from its anchor is gone, and you can name any pair that survived and why. |
| 7 | Scan the same replay twice in one session | live app | the second scan's final count equals the first's. |

## Deltas from the brief

None. All anchors (`eventFingerprint()` :847, `mergeEvents()` :1188, `eventsByKey` :717,
`visibleEvents()` :861, `clearEventsDisplay()` :1180, `loadCachedEvents()` :1233,
`EVENTS_CACHE_VERSION` :1220, `IGNORED_EVENT_NAMES` :739) verified by grep against
`panel.js` and match the brief's line table exactly - no drift.

## Blocking now

None. Helper running, replay connected, 29 events already cached from a prior
scan - usable for step 1's baseline.
