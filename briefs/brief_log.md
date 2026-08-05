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
