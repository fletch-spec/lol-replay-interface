# Brief Log

Append-only. One line per state change.

Format: `YYYY-MM-DD | brief-NNN | old-state -> new-state | note`

---

2026-08-04 | brief-001 | - -> ready | queue created
2026-08-04 | brief-002 | - -> ready | queue created
2026-08-04 | brief-003 | - -> ready | queue created
2026-08-04 | brief-004 | - -> ready | queue created
2026-08-04 | brief-005 | - -> ready | queue created
2026-08-04 | brief-006 | - -> ready | queue created
2026-08-04 | brief-001 | ready -> complete | proxy + panel shell built, verified live against replay API, moved to archive
2026-08-04 | brief-002 | ready -> complete | transport control (scrub/pause/speed/keyboard) built, verified live against replay API, moved to archive
2026-08-04 | brief-003 | ready -> complete | PARTIAL: keystroke bridge is a confirmed dead end (PostMessage/SendInput keyboard/SendInput mouse all blocked, likely Vanguard). Pivoted to POST /replay/render {selectionName, cameraAttached} per fletch-spec/lol-path-mapper - selects champion reliably but does NOT deliver a working follow-cam (tried top/focus/path modes; tps crashed the replay once). Shipped brief's own documented fallback: portrait grid, live KDA/CS, click-to-select with real-state lock indicator, no follow-cam. Brief 006 must not assume cameraAttached gives camera follow.
2026-08-04 | brief-004 | ready -> complete | Event timeline built: harvest-on-connect (seek to end, poll for GameEnd, seek back) via brief 002's existing seek path, cached in localStorage by gameMode+length. Markers in-track, clustered, colour-coded; unrecognised event names logged not dropped (caught InhibRespawned live). No API surprises this brief.
2026-08-05 | brief-005 | ready -> in-progress | cue points + A/B loop. Pre-check: /replay/game exposes only processID (per-launch, not stable across sessions) and no path in the whole spec carries a match ID or replay filename, so the brief's primary game-ID suggestion is unusable — falling back to its own documented gameMode+length composite, shared with brief 004's event cache.
2026-08-05 | brief-005 | in-progress -> complete | Cue points + A/B loop built and verified live. One-key M/N/B/[/]/L/Esc; cues seek to t-2s and hold paused via a new holdPaused flag inside the EXISTING doSeek (no second seek path); loop runs off the same 10Hz playback push, inert while paused so pausing mid-loop doesn't cancel it. Cue nav steps an index cursor, not a time search — searching by time re-finds the same cue forever because the lead-in lands you before it. Persistence keyed by gameMode+length via a shared replayIdentity(); survived a full reload and a mid-session replay swap. Export is MM:SS — note, timestamp alone when unannotated, shown in a selected textarea as well as copied. Not done: no UI for per-cue lead-in (stored and honoured, just not editable).
2026-08-05 | brief-007 | - -> ready | clickable controls + layout review. Written after 005 shipped keyboard-only cue/loop actions: 8 of 12 panel actions are hotkey-only, and hotkeys don't fire while the replay client holds focus, which is the whole narration scenario. Also folds in the floating-list-covers-the-timeline problem and the open layout bugs. Independent of 006; recommend running it after.
