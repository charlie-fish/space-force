# Major milestone v1.0.0

23 November 2026 · [Source tag](https://github.com/charlie-fish/space-force/tree/v1.0.0) · [Versioned downloads](https://github.com/charlie-fish/space-force/releases/tag/v1.0.0)

This saves the current **local normal-turn prototype** as a major version, with all thirty Techs and Events, seven player counts, bidding and the designer's accumulated interface corrections. The code review improves efficiency while preserving gameplay and controls. Online multiplayer and native mobile packages remain future deliverables.

## Efficiency review

- Legal orientations now isolate the candidate system once and share unchanged board/state data. Asteroid-target checks copy only the candidate system and its modified edge list. Read-only queries avoid serialising/copying the entire accepted command/log history; actual commands still receive full independent state copies, validation and conservation checks.
- Connectivity computes each system's current edges and warp flag once per query. A Tech purchase evaluates its rejection reason once.
- Free-space artwork placement computes boundary limits once per row and uses a direct obstacle loop, removing temporary arrays/closures from every candidate point. Candidate order, clearance scoring and resulting coordinates remain identical.
- Resume and decision navigation share one default-view helper. Touch targeting reads the same board hit once. Remove unused card/stack variables and enable TypeScript's unused-local/parameter checks.
- Release/save/export identity comes from shared version metadata; portable packaging reads the package version. Schema 11 and content `event-decks-board-targets-8` stay unchanged because the rules/state format have not changed.

Sampled Node 24.22.1 query timings on this implementation machine, using the same seven-player, seed-41, Batch-3 completed position with 456 accepted commands and 554 history entries:

| Query | v0.22 median | v1.0 median |
| --- | ---: | ---: |
| All legal rotations for one system | 5.320 ms | 0.184 ms |
| All Kessler Syndrome target edges | 59.661 ms | 1.621 ms |
| One free-space artwork placement | 0.263 ms | 0.104 ms |

Each median uses five repeated samples after warm-up: 30, 10 and 100 queries per sample respectively. These are local query measurements, not browser load-time or phone interaction benchmarks. Exact geometry/target outputs are separately checked against results captured before the refactor.

## Functionality and saves

The 0.22 board choices, Prophecy reminders and Migration totals remain. New games still draw ten Events/six normal rounds for 2–3 players or eight/five for 4–7, including test pools; Ragnarök can shorten play. All prior Tech, Event, draft/commit, warning and hidden-reveal rules remain.

Genuine 0.22 saves adopt the new release identity without changing their committed state, private bids or pending choices. Earlier supported migrations remain available. Older four-plus-player ten-card test games keep their original deck/schedule. The source tag, release notes and versioned desktop/static ZIPs preserve this major checkpoint independently of the workflow's short-lived artifacts.

## Mobile scope and next work

The [mobile app specification](MOBILE_APPS.md), with [structured requirements](../catalog/mobile-apps.json), adds Apple iPhone/iPad and Android phone/tablet apps. It covers browser cross-play on the same service, shared rules/client code, offline local play, lifecycle/reconnection, safe credentials, invitations, optional private notifications, accessibility and store acceptance. A native shell is a proposed implementation approach, to be checked on devices at the app milestone.

The **next coding phase is [authoritative online normal-turn play](NEXT_PHASE.md)**: public/private rooms, protected seats, per-seat visible state, durable games, reconnect/retry recovery and the confirmed five-minute majority-removal policy for up to seven independent players. Continue Event combinations and real-phone browser checks alongside it. Additional modes, administration/tutorial/release work and then the app/store milestone follow in the documented stages.

## Verification

All 334 rules/DOM/save/replay checks pass, including 190 completed seeded games, exact target/artwork results captured from 0.22 at all six player counts, three completed-game full-state comparisons and a genuine sealed-auction save. Strict compilation with unused-code checks and static/portable packaging pass. Compressed JavaScript is 76,759 bytes within the 200 KB budget; initial JS/CSS/cover total 140,827 bytes before HTTP headers. No runtime dependency was added. Real-browser/device visual verification remains outstanding; automated DOM tests do not establish store, phone or online-service readiness.
