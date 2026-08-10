# Brief 032, Step 4: Cross-Domain Binding Table

Input for brief 033 (state architecture / module split), per brief 032's step 4.
Not brief 032's decision to act on - see brief 032's Decision section.

**Method:** static analysis of `app/public/panel.js`'s 53 top-level `let`
declarations. Domain ranges taken from the eleven groups' boundary symbols
(brief 032 step 4's own list), classified by a heuristic regex distinguishing
assignment (`name =`, `name++`, `name +=`, etc.) from read. Not a hand review
of every occurrence - a binding assigned inside a callback passed to another
domain, or reassigned via destructuring, could be misclassified. Treat the
11 cross-domain-assigned bindings below as a strong starting list, not a
guarantee, before brief 033 designs around it.

**Cross-domain assign count: 11** (brief 032's escalation threshold is ~15 -
no escalation needed).

## Bindings assigned from 2+ domains (decision-relevant)

| Binding | Declared | Read by | Assigned by |
|---|---|---|---|
| `gameModeKnown` | panel.js:62 | roster | roster, scan, connect |
| `gameMode` | panel.js:66 | transport, roster, events, cues | roster, connect |
| `lastPolled` | panel.js:69 | transport, events, scan, cues, playback, gutter, connect | transport, connect |
| `optimisticSpeed` | panel.js:89 | transport, connect | scan, playback, connect |
| `followDistance` | panel.js:234 | transport, camera, roster | transport, roster |
| `lastAction` | panel.js:381 | camera, roster, render | camera, roster, render |
| `lastProcessId` | panel.js:719 | scan | scan, connect |
| `harvestDone` | panel.js:724 | render, events, scan, commands | events, scan, connect |
| `scanInFlight` | panel.js:725 | events, scan, commands | scan, connect |
| `activeCue` | panel.js:1437 | scan, cues, playback | scan, cues, playback |
| `loopEnabled` | panel.js:1442 | scan, cues, commands | scan, cues |

## Bindings assigned from 0-1 domains (can likely stay module-private)

`currentState`(transport), `isDragging`(gutter), `dragPreviewTime`(gutter),
`seekRunning`(playback), `pendingSeekTarget`(playback), `pendingSeekHold`(playback),
`currentSeekTarget`(playback), `mutexQueue`(transport), `lastRenderedLength`(transport),
`lastHandleLabel`(transport), `lastHandleClamp`(transport), `lastPausedLabel`(transport),
`lastSpeedLabel`(transport), `cameraState`(connect - see report's Findings not
asked for: this one is dead, never read), `lockInFlight`(camera),
`framingTimer`(camera), `playerByName`(roster), `hideNames`(roster),
`lastPlayers`(roster), `renderState`(render), `cinematicOn`(render),
`eventsByKey`(unassigned - 0 assigns found, likely mutated via `.set()`/`.clear()`
not `=`, so this heuristic undercounts Map/Set mutation - recheck before
trusting it as private), `harvestToken`(scan), `markerClusters`(events),
`sortedEvents`(events), `markersRenderedWithoutTeams`(events),
`lastMarkerTrackWidth`(events), `activeClusterIdx`(events), `lastNextLabel`(events),
`lastNextSoon`(events), `hoverCluster`(events), `hoverAnchorEl`(events),
`hoverHideTimer`(events), `scanCancelRequested`(scan), `cues`(cues),
`cueIdentity`(cues), `loopA`(cues), `loopB`(cues), `clearArmed`(cues),
`clearArmTimer`(cues), `exportRestoreTimer`(cues), `ghostCluster`(gutter),
`ws`(connect), `reconnectTimer`(connect).

**Caveat:** the heuristic only matches `name = value` / `name++` / `name +=`
style assignment. Mutation via method call (`eventsByKey.set(...)`,
`cues.push(...)`) reads the binding but doesn't reassign it, so bindings like
`eventsByKey`, `cues`, `markerClusters` and `sortedEvents` show 0-1 assigns
here despite being mutated from multiple domains - their *mutation* footprint
is wider than this table's assign count suggests. Brief 033 should check
`.push`/`.set`/`.delete`/`.clear` call sites for these specifically, not just
`=` assignment.
