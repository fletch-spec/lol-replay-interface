---
name: triage-briefs
description: Triage open GitHub issues on this repo (fletch-spec/lol-replay-interface) into executable briefs in briefs/ready/. Use when the brief queue is empty or thin and issues have piled up, or when the user says "triage the issues", "fill the queue", or "turn these issues into briefs". Produces brief files, a queue order, and brief_log.md entries - never touches app/ code.
---

# Triage issues into briefs

The full procedure lives in [`briefs/TRIAGE.md`](../../../briefs/TRIAGE.md).
**Read it before starting** - this file is the entry point, not the process.

## Scope test

> If a feature doesn't help someone talk over a replay in real time, it's out.

Live replay control only. Not an editor, not a stats tool.

## The short version

1. **Read first.** Every open issue including `wontfix` ones; the last ~30 lines
   of `briefs/brief_log.md`; the Outcome sections of recently archived briefs;
   `briefs/PASSOFF.md`'s five facts.
2. **Open the code for every issue.** A brief written without reading the code
   has to be rewritten before it can be executed - this has already happened to
   three briefs. Find the owning symbol and the mechanism, not just the symptom.
3. **Apply the scope test per issue**, and say the verdict even when it is
   obviously "keep".
4. **Give every issue a disposition:** brief, blocked, constraint record, cut, or
   reframed. Only one of those is a brief.
5. **Write the briefs** to `briefs/ready/` using `briefs/template.md`. The
   Decision section states the approach *and* why each alternative lost. The
   Where The Code Is table carries real symbols and line numbers from a named
   commit.
6. **Order the queue** by dependency, keep numeric order equal to execution
   order, and check for two briefs owning the same UI region or function.
7. **Log every decision** in `briefs/brief_log.md` (`date | brief-NNN | from ->
   to | reasoning`), and update `PASSOFF.md`'s queue line and date.
8. **Close the shipped issues, then commit and push.** Close with a comment
   naming the brief that closed them; leave partial work open with the residue
   named. End with `git status --short` and `git log --oneline origin/main..main`
   both empty.

## Hard rules

- **No code changes.** Triage writes briefs, not fixes.
- **GitHub is the source of truth.** Nothing a triage pass produces may stay
  local. Push before you stop - this reversed on 2026-08-08 and `TRIAGE.md`
  records why. The wiki is a separate repo - clone fresh, push separately.
- **Never invent strings from memory** (champion names, `EventName`s, API
  fields). Instruct the brief to log real values first.
- **Open questions go in `Escalate Instead Of Deciding`**, never in Decision.
