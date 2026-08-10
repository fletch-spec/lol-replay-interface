---
brief: brief-032
branch: brief/032
created: 2026-08-10
---

# Plan 032

| # | Work product | File : symbol | Done when |
|---|---|---|---|
| 1 | Freeze baseline copy | index.html : whole file | copy exists outside repo, `git status --short` shows only the branch |
| 2 | Extract CSS | index.html:8-1430 → panel.css | panel.css is 1,423 lines, index.html has no `<style>` tag, panel still renders |
| 3 | Extract JS | index.html:1573-4098 → panel.js | `node --check panel.js` passes, index.html is under 200 lines, panel loads with empty console |
| 4 | Cross-domain `let` binding table | panel.js : ~48 top-level `let`s | every one has a row with read-set, assign-set, assign count |
| 5 | Re-point ready/ briefs' code tables | briefs/ready/021,027,028,029,030,031 | no brief names index.html in a code table; 3 random rows spot-check correct |
| 6 | report-032.md + push | briefs/reports/report-032.md | git status --short empty, branch on remote |

## Deltas from the brief

Anchors match the brief almost exactly at current HEAD (`a3cc6eb`, not `260a170`):
`<style>` 7-1431, `<body>` 1433, `<script>` 1572-4099, file is 4101 lines (brief said
4098/4099/4101 - identical). No re-derivation needed; line numbers below are current.

## Blocking now

None. Helper is up, replay is connected (roster populated, 3 events), tree is clean.
