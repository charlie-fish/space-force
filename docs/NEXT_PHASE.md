# Next phase: authoritative online multiplayer

23 November 2026 · Stage 2 delivery plan after the v1.0.0 local prototype milestone

The local normal-turn game has all thirty Techs and Events, bidding, scoring, save/replay and the designer's current interface corrections. The next coding phase connects **two to seven independent players** through a public/private lobby while preserving those rules and controls. Continue Event playtesting and real-phone browser checks alongside this work.

## Deliverable

Players can create a public game or private room, join available seats, review settings and ready up, then finish a normal-turn game from different devices. They can resume their own seat after disconnection or a server restart. Accepted moves and final results survive process restarts. Each client receives only information its seat may see.

Normal turns still resolve in order even though all players are connected concurrently. The simultaneous-actions variant follows in Stage 3, recommended for four or more players once implemented. Asynchronous play also follows, with its separately agreed deadlines/removal rules. The mobile apps use the shared service after the browser flow is stable; see [MOBILE_APPS.md](MOBILE_APPS.md).

## Implementation sequence

1. **Separate the session boundary.** Keep the TypeScript engine shared, with a local session adapter for pass-and-play and a remote adapter for online commands/public updates. Preserve draft controls and existing confirmation behaviour. An authenticated server derives the actor from the protected seat and validates every command through the same rules engine.
2. **Add durable game transactions.** Persist game ID, initial settings, initial/remaining player counts, engine/content/schema/release versions, revision, accepted commands, current state, timestamps and end reason. Validate the expected revision, deduplicate the command ID and commit the state/history atomically before broadcasting or acknowledging acceptance. Rejected or retried commands must not spend resources twice. Preserve enough server-private setup for exact replay.
3. **Project visible state per seat.** Supply public pieces, market, current Event, scores and permitted decision controls. Keep unrevealed system identities/contents, the Event deck, Explore supply, seed/RNG, unrevealed bids and simultaneous choices server-private. Foresight returns only the authorised owner's peek. Do not send raw engine saves/history to clients; errors, logs and reconnect snapshots must also respect this boundary.
4. **Build the lobby and protected seats.** Support public waiting-game discovery, unlisted private invitations, guest names/colours, ready checks, host handover and final-seat/start race handling. Freeze the reviewed starting roster/settings in one transaction. Resume credentials protect occupied seats; joining an invitation cannot take an existing seat. Apply room/input rate limits and listing/feedback abuse controls as those endpoints arrive.
5. **Add transport and recovery.** Use small versioned messages, authoritative revisions, bounded reconnect/retry behaviour and a fresh visible snapshot after missed updates. Keep HTTP command/recovery endpoints available when a persistent connection fails. Reconnect after phone sleep, network changes and refresh; preserve valid uncommitted drafts and explain conflicts. Never expose the next bidder's private entry on another client's handoff.
6. **Implement confirmed live dropouts.** Apply [DROPOUTS.md](DROPOUTS.md), including the five-minute eligibility clock, four-minute warning, strict-majority electorate, cancellation on a timely return and atomic response/removal races. Remove unresolved action tokens, preserve other pieces/passive effects, skip forfeited turns/bids and delegate necessary decisions to the next non-removed player on the removed player's behalf. A sole remaining non-removed player wins immediately; record that end reason and the position-score snapshot separately.
7. **Run the external alpha.** Exercise complete games on separate desktop/mobile browsers and all player counts, collect game-linked feedback, and review server-backed rules/hidden-state behaviour before expanding modes. Preserve the v1.0.0 tag and repeatable local tests as the reference.

Proposed service stack: TypeScript on Node.js LTS, a small HTTPS/WebSocket service and transactional SQL storage, initially PostgreSQL. Retain the existing lightweight browser client. The deployment/provider choice, capacity target, backups and production secrets are implementation/launch inputs; these recommendations do not provision paid services or deploy anything in the v1.0.0 milestone.

## Acceptance criteria

| Area | Evidence required before Stage 2 is complete |
| --- | --- |
| Multiplayer | Complete games with 2–7 independent browser clients, including a seven-client game mixing desktop and real mobile browsers. Current Tech/Event combinations, bidding, expiry, final Economy, scores and component conservation remain correct. |
| Privacy and authorisation | Another seat, private room, unauthenticated request or stale credential cannot read private state or act for a player. Inspect network payloads and reconnect/error paths for hidden-information leaks. |
| Concurrency | Concurrent final-seat/start/ready actions resolve once. Stale/out-of-turn/duplicate commands and retries are rejected or return the original accepted result safely. |
| Durability | Refresh, disconnect, lost acknowledgements and server restart recover the same accepted revision and pending choice, including sealed bids and nested free actions. Restore a backup successfully. |
| Dropouts | Exercise P01–P05 in every affected phase, including stacked tokens, removed auction winners, delegated forced choices and last-player victory. Idle spectators are not removed for merely waiting. |
| Usability | Connection/waiting/return states and unavailable actions are clear in all five views. The existing draft/commit and hidden-reveal Undo policy remains intact. |
| Operations | Record game variables, completion/abandonment/end reason, scores, release and audit history. Set bounded room/message rates, secure secret storage, monitoring and a documented rollback/restore path. |

## Following phases

- **Stage 3:** simultaneous actions and asynchronous play, with the latter's numerical response/grace/voting policy agreed before implementation.
- **Stage 4:** owner administration with change log, game/score records, feedback management, and optional GDPR-aware publication-news consent/export.
- **Stage 5:** complete personal tutorial, production browser/accessibility/performance verification, deployment, monitoring and backups.
- **Stage 6:** iOS/iPadOS and Android packages, mixed-platform testing and store delivery using the same online service.

The designer can continue to report Event issues with map code, settings and an exported local game record. Remaining service/privacy inputs stay in [REMINDERS.md](REMINDERS.md); they do not prevent the server/session work from beginning.
