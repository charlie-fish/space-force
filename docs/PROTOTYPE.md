# Space Force v1.1.0 — implemented scope

23 November 2026. The [project brief](PROJECT_BRIEF.md) retains the complete intended product; this page describes what is playable now.

## Playable scope

Two to seven players can share a local device, join a live online room or take asynchronous normal turns over separate visits. All 30 Techs and all 30 Events, sealed bidding, correct player-count layouts, four actions, nested free-action chains, Economy, final scoring and designer rulings are implemented. Online rooms run the same rules engine authoritatively on the server.

New setups offer Random Techs (default) or Family/Aggressive/Cunning/Economic/Peaceful, plus Random Events (default) or No Events. Local map codes start blank; online seeds stay private. New 2–3-player games use ten Events/six normal rounds; 4–7 use eight/five. Test scenarios are removed from new-game controls. Existing supported saves retain their original configurations and histories, including historical ten-card test schedules.

Seven rocket shapes and chip-rim motifs, both faces of the shared player aid, Status Box prompts/history, board target/double-confirm controls, explicit pre-commit confirmations, touch camera/view gestures and desktop shortcuts remain available. Settlements and stack tokens use the approved artwork/anchors. All five views remain accessible after scores.

## Online service

Private invitations and public waiting games support 2–7 protected guest seats, reviewed settings/readiness, start revisions and host handover on leave. Game commands, state/history, receipts, settings, timestamps, completion/end reason and scores are durable. Compare-and-swap transactions and command IDs protect concurrent joins/bids, stale moves and retries. Per-seat projections withhold hidden system/Explore/deck/RNG/command information and private bids/Foresight.

The live five-minute policy and asynchronous 48-hour response plus 24-hour grace default are implemented, including strict-majority voting, unanimous pauses, clock persistence, response/removal races, unresolved-token cleanup, mandatory delegated choices and last-player victory. See [online play](ONLINE_PLAY.md), [dropouts](DROPOUTS.md) and [asynchronous policy](ASYNCHRONOUS_PLAY.md).

The service runs on Node 24 with persistent SQLite or as a Worker with migrated D1 storage. Conditional HTTPS polling supports ordinary proxies and phone reconnection. Browser storage holds protected resume credentials and unresolved request IDs, not the authoritative online game. A portable/static build runs local pass-and-play; it requires a server to offer online rooms.

## Validation

All 356 automated checks pass, alongside the separate built-Worker smoke check. The suite retains all rules/Tech/Event, supply-conservation, legacy-save and exact replay checks from v1.0.0, including its 190 completed seeded local games. Added checks cover HTTP authorisation/projections, concurrent seats/bids, reviewed setup, duplicate/lost responses, restart, live and asynchronous timing/voting/pause, delegated/forfeited play and complete seven-player games. Independent DOM clients verify seat recovery, own supply controls, private peeks, final scores and final views. A separate built-Worker smoke test applies committed SQL migrations before exercising D1-backed transactions and cached assets.

Strict TypeScript, static/portable builds, artwork references and the initial compressed-load budget are checked. GitHub Actions runs the suite, packaging and Worker adapter checks. Historical version guides retain their original validation counts; v1.1 adds service and interface coverage.

Visual browser/device QA has not been completed in this environment: the managed browser helper is unavailable. DOM/API checks are not a Safari/Android visual or gesture test. Use [PHONE_TESTING.md](PHONE_TESTING.md) and the [review checklist](REVIEW_CHECKLIST.md).

## Remaining product scope

The simultaneous secret-action variant and its 4+ recommendation, full personal tutorial, owner admin UI, feedback management, optional GDPR-aware publication-news collection/export, operational launch hardening and native Apple/Android apps remain future milestones. Game/audit records already persist for the admin work. Optional email/push reminders are not implemented and no notifications are sent.

Current changes: [v1.1](PLAYTEST_CHANGES_1.1.md). Historical local milestone: [v1.0](PLAYTEST_CHANGES_1.0.md). Detailed earlier Event/Tech iteration notes remain linked from [CHANGELOG](../CHANGELOG.md).
