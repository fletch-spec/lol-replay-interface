---
brief: brief-NNN
branch: brief/NNN
date: YYYY-MM-DD
model: sonnet
result: pass | partial | blocked
---

# Report NNN

## Verification

One row per numbered step in the brief's Verification section. Same numbers,
same order, none omitted. `Evidence` is the measurement, not the claim - a
number, a rect, a count, a logged string. "Works" is not evidence.

| # | Step | Result | Evidence |
|---|---|---|---|
| 1 | | PASS / FAIL / PARTIAL / NOT RUN | |

## Deviations

[Every departure from `Decision`, `Implementation Steps` or `Where The Code Is`,
with the reason the code forced it. Declaring a deviation is correct; a silent
one is the one thing this tier must never do. Empty is fine.]

## Escalations

[Anything hit from `Escalate Instead Of Deciding`, plus anything that should
have been there and wasn't. Questions for Fletcher, stated as questions.]

## Findings not asked for

[Things discovered that the brief did not ask about. Brief 026's growing scan
count went here and was the most useful thing it produced. Empty is fine.]

## Files touched

| File | Symbols | Lines +/- |
|---|---|---|

## Left behind

[Anything knowingly not done, and why. Out-of-scope items that suggested
themselves and were correctly refused go here too - that is evidence the fence
held.]

---

## Verdict

*Filled in by the reviewing session (`REVIEW.md`), not by the executing one.*

---

**Cap: 60 lines of content.** The reviewer reads this file, the diff, and three
sections of the brief - nothing else. Every line here is a line that buys a line
of loaded context somewhere else, so prose that repeats the brief is a loss.
Report what happened, not what was supposed to happen.
