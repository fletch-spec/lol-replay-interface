---
id: brief-031
state: ready
created: 2026-08-08
updated: 2026-08-08
agent: user
project: LOL-REPLAY-CONTROLLER
depends_on: []
executes_after: null
model: sonnet
---

# Brief 031: Drive The Panel From The Other Machine, And Find Out What Breaks

Tests the control half of
[#31](https://github.com/fletch-spec/lol-replay-interface/issues/31). The video
card stays on the backlog until this is done - Fletcher's call, 2026-08-08.

> **Runs first, ahead of 027-030.** It is cheap, it gates #31, and two of its
> findings may change what "the panel's origin" means for work those briefs
> assume. Numeric order is deliberately broken here rather than renumbering four
> already-pushed briefs; `TRIAGE.md`'s rule is that renumbering costs more than
> the exception, and this is the exception.

> Line numbers in this brief's `Where The Code Is` table are from brief 032's
> merge commit, split across `index.html` (markup) and `panel.js`. Inline
> line references in the prose above are unchanged and predate the split. If
> the numbers don't match, grep for the symbol name - the names are stable,
> the lines are not.

## Problem Statement

The panel is supposed to be a second-screen instrument. Right now it runs on the
same machine as the replay client, which is the whole reason brief 011 had to
ship a focus chip: *the panel's hotkeys only fire while the panel has focus, and
the replay client takes focus during the thing the panel exists for.* Brief 007
was written around the same wall - eight of twelve actions were hotkey-only, and
hotkeys don't fire while the replay client holds focus. PASSOFF fact 4 says
spectator hotkeys can't be driven synthetically at all.

**Moving the panel to a second machine dissolves that entire class of problem.**
Two keyboards, two focus contexts; the replay client can hold focus forever and
the panel still hears every keypress.

And it appears to already work. `server.js` calls `server.listen(PORT)` (`:285`)
with no host argument, so Node binds all interfaces, not loopback. The panel
builds its socket as `` ws://${location.host} `` (`:3975`) rather than hard-coding
localhost. There is no absolute URL anywhere in the client. So a browser on
another LAN machine pointed at `http://<replay-machine>:3000` should get a
working panel today, with no code at all.

"Should" is doing work in that sentence, which is why this brief is a test and
not a feature. Two things are known to change on a LAN origin, both found by
reading rather than running:

1. **`navigator.clipboard` does not exist on a non-secure origin.**
   `http://192.168.x.x:3000` is not a secure context - browsers make exactly one
   HTTP exception, `localhost`/`127.0.0.1`. `exportCues()` (`:3451`) calls
   `navigator.clipboard.writeText()` inside a `try`, so it degrades rather than
   crashing: the `TypeError` is caught and it falls through to the textarea. But
   that means **brief 025's clipboard-first fix is inert on the LAN origin** and
   the panel is back to the exact behaviour #22 was filed about.
2. **`localStorage` is per-origin.** `http://localhost:3000` and
   `http://192.168.1.50:3000` are different origins, so the LAN machine starts
   with no cues (`cuesStorageKey()`, `:2798`), no event cache
   (`eventsCacheKey()`, `:2794`), no follow distance (`:1808`), no `hideNames`
   (`:2057`) and - the one that bites - no `cinematicRestore` (`:2212`), which is
   the saved HUD state a reload mid-cinematic uses to put the HUD back.

Neither is a reason not to do this. They are the reason to find out now, before
#31's video work assumes an origin that changes the answers.

## Done Looks Like

A browser on the second machine, pointed at `http://<replay-machine>:3000`,
drives a live replay: transport, seek, speed, camera, cues and hotkeys all
behave as they do on localhost, with control latency measured rather than
guessed. Every difference from the localhost experience is written down - which
of them are acceptable, which need work, and which brief would own that work.
The `README` says how to set it up, including the firewall rule.

## Decision (already made - do not re-litigate)

**This brief tests; it ships code only if the test finds something.** Same shape
as briefs 008 and 021: cheapest-first, and step 1 is allowed to end it. This
project has twice paid for building against an assumed mechanism (briefs 003 and
006 built a keystroke bridge for an outcome that did not apply), and every fact
in the Problem Statement above is a code reading, not an observation.

**No HTTPS, no certificates, no WebRTC.** Plain HTTP over the LAN. TLS is only
required for the *video* half of #31 - `RTCPeerConnection` needs a secure
context - and Fletcher has put the video card on the backlog behind this brief.
Adding TLS here would be building the expensive half of a feature that was
explicitly deferred.

**`server.listen(PORT)` stays as it is.** It already binds all interfaces. Making
the host explicit is a readability change, not a fix, and this brief does not
make changes it cannot justify with a finding.

**The clipboard and `localStorage` findings get measured and reported, not
fixed.** Both are real, both are named above, and neither can be decided until
Fletcher says whether the LAN machine becomes the panel's normal home or stays
an experiment. A fix chosen now would be a guess about that.

### Rejected before starting

- **Adding HTTPS "while we're in here".** It is #31's video prerequisite, it
  needs a locally-trusted cert rather than a self-signed one, and it is deferred.
- **A `--host` flag or config file.** Nothing needs configuring; it already
  listens on every interface. A flag would be ceremony around a working default.
- **Fixing the clipboard fallback pre-emptively** (e.g. `document.execCommand`).
  It is deprecated, it is a guess at a decision that has not been made, and
  brief 025's textarea fallback already handles the case correctly - it just is
  not the path that was supposed to be primary.
- **Authentication on the helper.** Named in Traps as a real exposure, but a home
  LAN is the threat model Fletcher is actually in, and inventing an auth layer
  for it is out of proportion.
- **Testing through a VPN or Tailscale.** Adds a variable to a test whose entire
  purpose is establishing the baseline.

## Where The Code Is

| What | File | Symbol | Line |
|---|---|---|---|
| Binds all interfaces (no host arg) | `app/server.js` | `server.listen(PORT)` | 285 |
| Port constant | `app/server.js` | `PORT` | 10 |
| Replay API target (must be local) | `app/server.js` | `REPLAY_HOST` / `REPLAY_PORT` | 8-9 |
| Proxy to the Replay API | `app/server.js` | `proxyToReplayApi()` | 151 |
| Static file serving | `app/server.js` | `express.static` | 190 |
| Portrait cache + serving | `app/server.js` | `servePortrait()` | 122 |
| WebSocket push | `app/server.js` | `WebSocketServer` / `broadcast()` | 193 / 195 |
| Client socket URL (origin-relative) | `app/public/panel.js` | `new WebSocket(...)` | 2403 |
| Clipboard-first export | `app/public/panel.js` | `exportCues()` | 1879 |
| Textarea fallback | `app/public/panel.js` | `exportAreaEl` | 1446 |
| Export notes popup | `app/public/panel.js` | `window.open()` | 1945 |
| Cue storage key | `app/public/panel.js` | `cuesStorageKey()` | 1226 |
| Event cache key | `app/public/panel.js` | `eventsCacheKey()` | 1222 |
| Other localStorage keys | `app/public/panel.js` | `followDistance` / `hideNames` / `cinematicRestore` / `lastFollow` | 236 / 485 / 640 / 697 |
| Focus chip (the thing this may retire) | `app/public/index.html` | `#focusChip` | 18 |

## Implementation Steps

1. **Find the replay machine's LAN address and open the port.** From an elevated
   PowerShell on the replay machine:

   ```
   Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback' }
   New-NetFirewallRule -DisplayName "LoL Replay Controller helper" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow -Profile Private
   ```

   *Done when:* `curl http://<lan-ip>:3000/` from the second machine returns the
   panel's HTML. If it does not, stop here - everything below depends on it, and
   the failure is a network fact worth reporting on its own.

2. **Load the panel on the second machine and watch it connect.** With a replay
   loaded on the replay machine.
   *Done when:* the status chip reads `Connected`, the roster populates with real
   portraits, and the scrub bar shows the replay's real length. Portraits coming
   through matters - they are served from the helper's own cache (`:122`), not
   from Riot, so a broken image means the static path is wrong rather than the
   network.

3. **Measure control latency, do not describe it.** Time the round trip from
   click to confirmed state change - press Pause and record the gap between the
   click and `lastPolled.paused` flipping in the WebSocket push. Ten samples.
   Do the same on localhost for a baseline.
   *Done when:* you have two medians and can say what the LAN costs in
   milliseconds. PASSOFF fact 1 applies - confirm by reading state back, never by
   `res.ok`.

4. **Work the panel the way a take does.** Seek by dragging, seek by clicking a
   marker, change speed, place cues with `M`, step events with `,` and `.`, arm a
   loop, lock the camera to a champion, toggle Cinematic and restore the HUD.
   *Done when:* every one behaves as it does on localhost, or you have a list of
   the ones that do not.

5. **Test the thing this is really for: hotkeys while the replay client has
   focus.** Click into the League client on the replay machine so it holds focus.
   Then use the panel's hotkeys from the second machine's keyboard.
   *Done when:* the hotkeys fire. This is the case that has never worked, and if
   it works now it is the headline finding - say so, and say what it means for
   the focus chip (`:1442`) and for brief 007's premise.

6. **Confirm the two known origin differences.** In the console on the LAN
   origin: `window.isSecureContext`, `typeof navigator.clipboard`, and
   `Object.keys(localStorage)`. Then click `Copy as text` and see which path it
   takes.
   *Done when:* both are confirmed or refuted with output, and you can state
   whether the panel is usable in spite of them.

7. **Write it down in the README.** The LAN address, the firewall rule, that the
   helper must run on the replay machine because it proxies `127.0.0.1:2999`
   (`:8-9`), and the two origin caveats.
   *Done when:* someone could set this up from the README without this brief.

## Verification

Run against the live app, from the second machine, with a real replay:

1. Panel loads, connects, and the roster shows ten champions with portraits.
2. Pause/play, ±5s seek, and speed changes all take effect on the replay
   machine's screen, confirmed by reading state back.
3. Scrub-drag lands where the ghost said it would.
4. A cue placed with `M` appears in the cue list and survives a reload **on that
   origin**.
5. Camera lock to a champion works, and Cinematic toggles the HUD and restores
   it.
6. `Scan replay` completes and the event count matches what the same replay
   produces on localhost. (If brief 027 has landed, this is also a second
   machine's confirmation of its dedupe.)
7. **The hotkey case:** with the League client focused on the replay machine,
   the panel's hotkeys still work from the second machine.
8. **Negative case:** localhost still works exactly as before, on the replay
   machine, at the same time.
9. **Negative case:** two browsers connected at once (localhost and LAN) both
   receive the WebSocket push and neither breaks the other. `broadcast()`
   (`:195`) already loops all clients, so this should hold - confirm it, because
   it is the configuration Fletcher will actually be in while testing.
10. **Negative case:** disconnecting the replay (close the client) puts the LAN
    panel into the same `no-replay` state as localhost, and reconnecting recovers
    within one poll tick.

## Can't Skip

- **Step 5.** It is the reason this is worth doing at all. Everything else is
  confirming that a working thing works.
- **Measure the latency (step 3), don't characterise it.** "Feels fine" is not a
  number, and #31's video work will need this baseline to compare against.
- **Test with both browsers connected (verification 9).** It is the real
  configuration during the test itself, and a bug there would look like a LAN bug.
- **Do not add TLS.** Deferred, deliberately, and it is the expensive half.

## Traps

- **The helper must run on the replay machine.** `REPLAY_HOST` is `127.0.0.1`
  (`:8`) and always will be - the Replay API only listens on loopback. Running
  the helper on the second machine gets you a panel that serves fine and can
  never connect to anything.
- **`http://<lan-ip>:3000` and `http://localhost:3000` are different origins.**
  Everything in `localStorage` is per-origin: cues, the event cache, follow
  distance, `hideNames`, `cinematicRestore`. A "my cues vanished" report during
  testing is this, not data loss - the localhost copy is still there.
- **`navigator.clipboard` is `undefined`, not broken.** `exportCues()` (`:3451`)
  catches the resulting `TypeError` and silently uses the textarea, so the
  symptom is "brief 025 didn't work" rather than an error. Check
  `window.isSecureContext` before concluding anything about the clipboard code.
- **The helper's `/api` proxy is now reachable by anything on the LAN**
  (`proxyToReplayApi()`, `:151`) and it forwards arbitrary paths to the League
  client. PASSOFF fact 2 - `cameraMode: "tps"` closes the game, reproduced twice -
  so this is a real if small exposure. Scope the firewall rule to the `Private`
  profile, which step 1 does, and do not put this on a network you don't own.
- **PASSOFF fact 5: another app on this machine drives the same replay client.**
  Unexplained playback or camera movement during this test is probably that, not
  a LAN bug. Ask before calling it one.
- **Windows may prompt for the firewall rule the first time Node binds**, and
  clicking the wrong button on that dialog produces exactly the symptom step 1
  tests for. Check for an existing blocking rule before adding a new one.
- **Hotkeys need panel focus even on the second machine** (brief 011's chip is
  about focus, not about which machine). Click the panel once before step 5, or
  the test fails for the old reason rather than a new one.

## Out Of Scope

The video card - `#31`'s other half, backlogged until this brief is wrapped, and
it needs HTTPS and a WHIP→WHEP pipeline that this brief deliberately does not
start. Any clipboard or `localStorage` fix. Authentication on the helper.
mDNS/hostname resolution, VPNs, Tailscale. Anything about how the panel *looks*
at the second machine's resolution - brief 030 owns scaling, and if this test
turns up a layout problem it belongs there with a measured width, not here.

## Escalate Instead Of Deciding

- **If step 1 fails**, report the network fact and stop. A firewall rule that
  will not take, or a router isolating clients, is not something to work around
  from inside the panel.
- **If step 5 works**, stop before deleting anything. The focus chip (`:1442`)
  and brief 007's whole premise become questionable, and retiring a shipped
  feature because a new configuration makes it redundant is Fletcher's call -
  especially since he will still use localhost sometimes.
- **If the clipboard or `localStorage` differences make the panel meaningfully
  worse on the LAN**, say so with the specifics and stop. Whether that is worth
  HTTPS, or a fallback, or nothing at all, depends on whether this becomes the
  normal way he runs it - and that is a question for him, not a decision for
  this brief.
