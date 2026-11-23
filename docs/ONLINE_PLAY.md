# Online play and hosting — v1.1.0

23 November 2026. Live and asynchronous rooms both use the existing normal-turn rules. The simultaneous variant with secret token/slot choices remains a separate future option.

## Join, start and resume

1. Create a private invitation or public waiting game for 2–7 seats. Choose live or asynchronous pacing, Techs and Events. Private is the default visibility.
2. Share the invitation or select a public waiting game. Enter a name; no account, email address or newsletter subscription is required. Player identities follow seat order using seven shapes/colours/rim motifs.
3. Review the settings and mark Ready. Settings/roster changes clear readiness. The host starts with the displayed actual count and current room revision; live participants must be connected. Asynchronous participants may ready themselves on separate visits.
4. Open the same server address when returning. Your games shows saved seats and whose response is needed. Copy the private recovery key from the room or Status Box to resume the same seat in another browser. Never share that key as an invitation.

A public directory lists waiting games with free seats and a connected participant. Full, private and started games are excluded. A host leaving a waiting room passes control to the next seated player. A removed waiting player returns to the lobby; active seats cannot be claimed by newcomers. Automatic absent-host handover and stale-room expiry remain operational follow-up work.

## Timing and removal

**Live:** a required decision warns after four minutes and qualifies for a removal vote after five. “I'm still here”, a valid response, or reconnection cancels eligibility and pending votes. A continuously disconnected seat qualifies five minutes after the server declares it disconnected; heartbeat detection allows 45 seconds before that clock starts. Watching another player's turn while connected is not inactivity.

**Asynchronous:** the confirmed default is 48 hours from a required decision becoming available, followed by 24 hours of grace. The creator may choose 1–168 response hours and 1–72 grace hours before start. At the response deadline the interface shows a warning; at response plus grace the removal vote becomes available. Offline waiting and reopening/refreshing do not change the deadline. An accepted response cancels removal votes and creates the next decision's deadline. An asynchronous player may return and act during an open vote until removal commits.

For either format, removal requires `floor(eligible other players / 2) + 1` approvals. The target and other already-overdue/removed players are excluded; zero voters cannot remove anyone. Votes stay valid only while eligibility persists. They expire on a response/eligibility change; there is no separate vote-closing deadline. The server resolves response/removal races atomically. A unanimously agreed table pause freezes all clocks; any active player may resume it. Resignation is explicit and immediate after confirmation.

Removed players lose unresolved stack tokens and future turns. Ships, Settlements, resources and passive Tech ownership remain. Optional decisions are skipped; decisions necessary for progress are delegated to the next living player on the original owner's behalf. Mandatory home assignment is delegated to keep later home-based effects valid. Initial map/deck/round count remains fixed. A sole remaining player wins immediately; recorded position scores are labelled separately from the reason for winning. See [P01–P05](DROPOUTS.md).

## Decisions, secrets and reconnects

The server checks the authenticated actor, decision ID and expected game revision before accepting a command. Concurrent sealed bids are accepted for the same auction, including out of player order; amounts remain private until every eligible bid is submitted. Only the highest bidder pays, with ties in player order.

Every command has an idempotency ID. A lost response retains that exact command in browser storage; Retry asks the server for its accepted result instead of creating a second move. After refresh or a network change, the client fetches a fresh projection. Stale drafts explain that the decision changed. Drafts remain editable before commitment; hidden-reveal and committed-action Undo restrictions are unchanged.

Clients receive public board state, current decisions and permitted private information. They never receive seed/RNG, unrevealed system contents, the Event deck, Explore supply, raw command history or other unrevealed bids. Foresight peeks are seat-specific. Exporting an online view exports the permitted public snapshot, not a server-private replay. Local pass-and-play saves still contain the full trusted-device game.

Updates use conditional HTTP polling: approximately two seconds live and ten seconds asynchronous, with empty 304 responses when nothing visible changes. Summary checks in Your games do not reset presence clocks. This keeps the service compatible with ordinary HTTPS proxies and mobile reconnects without requiring a WebSocket connection.

## Hosting and storage

Run the Node service with the commands in [README](../README.md#run-online-multiplayer). Node 24's built-in SQLite support avoids a database package. The default file is `private-data/space-force.sqlite`; `SPACE_FORCE_DB` and `PORT` override it. Use one process for this file-backed deployment. Put it behind HTTPS for Internet use and set `PUBLIC_ORIGIN=https://your-game-host` so same-origin validation recognises the reverse proxy; bind the persistent volume outside `dist/` and never serve database/backups as assets.

For Sites/Cloudflare, `npm run build:worker` produces `dist/server/index.js` with the browser assets embedded and `.openai/hosting.json` naming the existing Site and logical `DB` D1 binding. Commit `drizzle/` with the schema-only migrations. Sites provisions D1 and applies pending migrations before uploading the Worker. Requests never create migration-owned tables. The same portable service and transaction rules run on both adapters.

Persisted room records include initial settings/roster, engine/schema/content versions, initial Event count, current state, full private command/replay record, timestamps, completion status, end reason and scores. Receipts and compare-and-swap revisions make accepted state/history writes atomic. Seat credentials are SHA-256 hashes of random 256-bit keys; raw credentials stay on the player's device. HTTP bodies, names and request rates are bounded. Static responses use a restrictive content policy and hashed-asset caching. Credentials do not appear in invitation URLs or public lists.

For a Node backup, stop the service, copy the SQLite file and any `-wal`/`-shm` companions together, then restart. Restore into a separate path and run the service against that path before switching production. Alternatively use SQLite's backup API under the operator's tooling. A test restores a persisted pending decision into a new service instance; a full operational backup/restore rehearsal and D1 backup policy are still launch checks. Protect server logs and backups like the live database.

This release retains game records without automatic deletion so they can feed the requested owner audit area. Before a broad public launch, agree retention, cleanup, monitoring and backup policy. The private admin UI, feedback/news forms, accounts, email/push reminders and store apps are not part of v1.1.0; no notifications are sent.
