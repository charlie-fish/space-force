# Platform review and proposed release checks

15 November 2026 · Proposed engineering baseline

The existing brief already covers a server-authoritative engine, hidden information, undo boundaries, durable games, mobile controls, distinct player shapes, reduced motion, and private administration. The additions below make recovery, public-room handling, browser behaviour, and release verification more concrete. The lobby and four-plus-player recommendation are confirmed user requirements; engineering targets and default policies here are recommendations to validate during implementation.

## 1. Reliable participation

Preserve a seat through refresh, network changes, and phone sleep. Show connected, pending, reconnecting, and offline states distinctly. On return, obtain current server state/revision before allowing another move. Retry safe commands with their original IDs; never replay an uncertain move as a new command. Prevent two tabs from controlling one seat concurrently without a clear takeover flow.

The server advances phases and any configured deadlines. Hidden tabs throttle timers and animation callbacks, so client timers cannot decide whose turn ends. Pause decorative work in background tabs and resynchronise when visible. Test locking a phone, switching apps, returning through browser history, and changing between Wi-Fi and mobile data. [MDN: Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API).

Do not mark a temporary disconnect as an abandoned match. Public rooms also need the ready checks, stale-listing cleanup, and host handover in [LOBBY.md](LOBBY.md). A game must not depend on a particular player's device remaining open.

## 2. Public-room and realtime security

Use HTTPS/WSS, an explicit allowed-origin check on WebSocket handshakes, secure session handling, and authorisation for every room command. Revoke socket access when its session/seat expires. Bound message sizes, message rates, connections, joins, and room creation; validate payloads before processing. These controls apply to reconnect and HTTP fallback paths too. Keep credentials out of URL query strings and operational logs. [OWASP: WebSocket security](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html).

Private invitations should be generated with cryptographically strong randomness, be unlisted, and support revocation; short-code entry needs throttling. Exchange any invitation capability for the appropriate session and avoid leaking it through referrers. Treat room, seat, host, and owner/admin permissions separately. Joining a room cannot claim an occupied seat or grant access to another room's state.

Render names, room titles, and feedback as text. Use parameterised database access, CSRF protection where cookie-authenticated requests change state, and a restrictive Content Security Policy suited to the chosen host. Test hostile markup and cross-room requests. Require a maintained owner login with MFA/passkey support, protect exports server-side, and neutralise spreadsheet formulas in exported user-entered text. [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy).

Give public-room users a report action and the owner tools to delist abusive rooms and review reports. Keep IP/security metadata, if used for abuse prevention, purpose-limited and short-lived rather than putting it into ordinary game histories. Do not add advertising trackers or compulsory identity collection to guest play.

## 3. Accessibility and first-play usability

Retain tap/click alternatives to every drag interaction, keyboard navigation, visible focus, text game summaries, and player identification by colour, shape, and pattern. Aim for 44 CSS-pixel primary controls; dense board interactions can use larger hit areas or an equivalent accessible detail panel. The WCAG 2.2 minimum target rule is 24 CSS pixels with specified exceptions; larger primary controls are a product target. Support text/browser zoom and portrait/landscape without disabling browser zoom. [W3C: Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

Announce the current turn/phase and action results accessibly without moving focus unexpectedly or reading unrevealed choices. Confirm expensive or destructive actions with a concise consequence preview. Show why an action is unavailable and which player is currently needed. Sound, if added, is optional and starts after user interaction; visual status must suffice.

Track the skippable first-play tutorial in [issue #1](https://github.com/charlie-fish/space-force/issues/1). It teaches in context, is per player, can be replayed, and does not depend on building a solo mode. Optional progress storage must have a session fallback.

## 4. Browser and network compatibility

Test current/previous major Safari, Chrome, Firefox, and Edge releases, including real iPhone/iPad and Android checks as devices are available. Use standards-based HTML/SVG controls and feature detection. Installation, WebGL, hover, notifications, and optional storage must not be prerequisites for playing. If essential session storage/cookies are blocked, show a clear explanation rather than silently losing a seat.

Provide a bounded HTTPS polling fallback when a network persistently blocks WebSockets, using the same authentication, ordering, revisions, and hidden-state projections. Display its connection status honestly. This is a proposed compatibility feature to test, not an offline-play promise. When offline, stop accepting new committed moves until resynchronised.

Keep the action area usable around mobile browser bars, safe areas, and on-screen keyboards. Check small screens, slow devices, touch scrolling, and device rotation. Do not require fullscreen or autoplay permission. If a service worker is later added, it must not serve an incompatible app during a saved game.

## 5. Fast loading and stable rendering

Retain the existing targets of at most 200 KB compressed initial JavaScript and 1 MB initial lobby transfer. Add user-facing targets: **LCP ≤2.5 seconds, INP ≤200 ms, and CLS ≤0.1 at the 75th percentile**, measured separately for mobile and desktop once real measurements exist. These are targets, not current results. Use lab checks before launch and minimal, privacy-conscious field measurement when appropriate. [web.dev: Web Vitals](https://web.dev/articles/vitals).

Use responsive cover art, reserve image dimensions, load card art when needed, and serve compressed, content-hashed assets with suitable cache headers. Use a system-font fallback and a small font set. Keep gameplay functional while optional images load. Use small SVG/2D silhouettes instead of requiring TTS's 3D model runtime.

Import approved TTS artwork into the controlled asset pipeline, verify its source/version, and serve optimised copies. Avoid a live dependency on Steam image links, TTS table scenery, or music hosts for core gameplay. The ZIP supplies references rather than all those source assets. Do not fetch arbitrary player-supplied URLs or execute imported Lua.

## 6. Safe releases, operations, and data handling

Persist accepted state changes transactionally. Define restore/recovery targets with the chosen host, automate backups, and perform a real restore test. Pin games to compatible engine/content/clarification versions; a deploy must not force a reload mid-choice, strand old clients, or change an active game's rules. Retain compatible assets or provide a safe checkpoint/reload path. Keep private responses out of shared caches.

Monitor failed joins/reconnects, command errors, abandoned/completed games, room counts, server load, and response times. Attach safe game/release identifiers to feedback so bugs can be reproduced. Redact secrets, email addresses, invitation values, and private choices from general logs; keep necessary game audit data in authorised storage.

Agree the expected concurrent-room load before setting capacity promises. Limit idle rooms and queued work, test resource bounds, and use health checks and error alerts. Pin dependencies, apply security updates through reviewable releases, and verify rollback/recovery. CSV exports, newsletter withdrawal, retention/deletion jobs, and owner-only access need their own functional checks.

## Release evidence to collect

| Area | Evidence |
| --- | --- |
| Public/private lobby | Seven-client joins, final-seat/start races, private listing isolation, readiness resets, host handover, and cleanup scenarios |
| Fairness and secrets | Per-seat network/DOM/accessibility-tree checks; no hidden deck/bid/choice leaks; session expiry and cross-room rejection |
| Recovery | Phone sleep, network loss, tab takeover, retry, server restart, and saved-game continuation |
| Mobile/accessibility | Keyboard and screen-reader review, zoom, touch targets, reduced motion, orientation, and real-device checks where available |
| Loading | Built transfer sizes and measured LCP/INP/CLS on representative mobile/desktop conditions |
| Operations | Multi-room load target met, deployment compatibility, backup restoration, protected export, and retention/withdrawal checks |

No application tests or performance measurements have been run at the specification stage. Add these checks to the implementation milestones; avoid treating a documented target as verified behaviour.
