---
id: brief-NNN
state: draft
created: YYYY-MM-DD
updated: YYYY-MM-DD
agent: user
project: LOL-REPLAY-CONTROLLER
depends_on: []
executes_after: brief-NNN
model: sonnet
---

# Brief NNN: {Title}

Closes [#N](https://github.com/fletch-spec/lol-replay-interface/issues/N).

> Line numbers in this brief are from commit `XXXXXXX`. If they don't match,
> grep for the symbol name - the names are stable, the lines are not.

## Problem Statement

[What problem is being solved, and why it matters during a live take. One or two
paragraphs. Include measured numbers where they exist - "markers get 0.5px per
second" beats "markers are cramped".]

## Done Looks Like

[Observable outcome. Someone else should be able to tell whether this is true
without asking you.]

## Decision (already made - do not re-litigate)

[The approach, stated as a decision rather than a menu. Then the rejected
alternatives, each with the reason it lost - this is what stops the executing
session re-deriving the same debate and picking differently.

If a genuine open question remains, it belongs in "Escalate Instead Of
Deciding", not here.]

## Where The Code Is

| What | File | Symbol | Line |
|---|---|---|---|
| | | | |

[Every touchpoint the brief refers to. Symbol names are the durable part.]

## Implementation Steps

1. **[Imperative.]** [Detail.]
   *Done when:* [checkable condition]

[Ordered. Cheapest or most-informative first. Every step gets a "Done when" that
can be checked without judgement.]

## Verification

[The actual acceptance test, as numbered steps against the live app. Not "test
it works". Include the negative cases - the thing that must still work
afterwards, not just the new behaviour.]

## Can't Skip

- **[Non-negotiable requirement.]** [Why, in one clause.]

## Traps

- **[The specific wrong thing that looks right.]** [Why it's wrong, and what to
  do instead. Cite the line that already explains it where one exists.]

[This section is where a session actually loses its afternoon. Prefer concrete
traps found in the code over general advice.]

## Out Of Scope

[Explicit list. Include the adjacent things that will suggest themselves
mid-build, and say which brief owns them instead.]

## Escalate Instead Of Deciding

- [Cases where stopping and asking beats guessing.]
