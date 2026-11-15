# Designer review, reminders, and next steps

Updated 15 November 2026 · Specification v0.7

There is no playable application yet. Review the documents/data now; interaction and browser checks become concrete in the first prototype. These checks do not reopen the already-resolved R01–R08 or the confirmed original-hex versions.

## Check next

| Priority | Item | Where to review |
| --- | --- | --- |
| 1 | P01–P05 are confirmed, including inactivity, warnings, voting eligibility, stack cleanup, delegation, bids, and forfeit results. Verify these behaviours in the prototype. | [Dropout rule](DROPOUTS.md) |
| 2 | Five destinations, persistent Reserve/Credits counts, phone pinch/pan/swipe separation, and the proposed B/T/E/A/P shortcuts with camera/help controls. | [Gameplay interface](GAMEPLAY_UI.md) |
| 3 | Confirm the provisional seventh player's orange colour, twin-pod silhouette, and triangular chip rim; check the final six/seven shape-to-colour mapping when STLs arrive. | [Component design](COMPONENT_DESIGN.md), [game configuration](../catalog/game-configuration.json) |
| 4 | Verify the confirmed Undo boundary in the prototype: uncommitted moves only, with no hidden-information reveal. Committed moves cannot be undone. | [Project brief: undo](PROJECT_BRIEF.md#undo-policy) |
| 5 | Public/private lobby, ready/start behaviour, the 4+ recommendation with host choice, and proposed waiting-room handover/expiry defaults. Those waiting-room timers are separate from confirmed five-minute in-game inactivity. | [Lobby](LOBBY.md), [lobby configuration](../catalog/lobby-configuration.json) |
| 6 | Verify transcribed planet capacities, features, tile anchors/orientations, and layouts when the board prototype is shown. Current source versions are confirmed; Asimov is six-player centre only and Adams seven-player centre only. | [Asset map](ASSETS.md), [systems catalogue](../catalog/systems.csv), [rules review](RULES_REVIEW.md) |
| 7 | Admin game/score records, forfeit labels, feedback management, email export and consent wording, data retention, and whether the proposed browser/size targets meet your audience's needs. | [Project brief](PROJECT_BRIEF.md), [platform review](PLATFORM_REVIEW.md) |
| 8 | Verify the required first-play tutorial: personal contextual guidance, skip/replay, commit/undo limits, five views, and no forced multiplayer script. Both shared-aid faces must be visible. | [Tutorial specification](TUTORIAL.md) |

## Outstanding from you

- Rocket STL files and colour mapping, including a seventh design if available. Provisional silhouettes let development continue.
- Optional Tabletop Simulator Workshop URL. The supplied TTS ZIP has already been received and inspected; there is no need to resend it.
- When preparing hosting: domain and budget, expected simultaneous rooms, owner login preference, privacy controller/contact and jurisdiction, audience/retention preferences, any mailing provider, and code/art licensing choices. These are launch inputs, not prerequisites for a local rules/UI prototype. See [DECISIONS.md](DECISIONS.md#needed-before-public-deployment-or-collecting-addresses).

## Outstanding implementation reminders

- Build the required first-play teaching in [TUTORIAL.md](TUTORIAL.md). Issue #1 is closed as incorporated into the specification, not as an implementation completion.
- Prepare optimised component art from the PDFs and approved TTS links, ingest the cover source, and encode Asimov/Adams anchors.
- Implement seven distinct silhouettes/rim patterns, responsive navigation, public/private rooms, simultaneous play and its recommendation, and reviewed dropout handling.
- Implement the private admin area, game audit/results, feedback, and optional consented news sign-up/export.

The live checklist is [REMINDERS.md](REMINDERS.md). TTS review: [TTS_REVIEW.md](TTS_REVIEW.md). Original-hex confirmation and TTS-save receipt are completed items.

## Next development steps

1. Build the deterministic normal-turn rules engine and meaningful setup/action/resource/scoring tests for two to seven players, using the confirmed rules and versioned data.
2. Build a playable local board with the five views, Reserve/Credits display, safe gestures/shortcuts, and provisional replaceable art. Review it on a phone and desktop.
3. Add server-authoritative public/private rooms, seven independent clients, secret bids, save/rejoin, undo, and the reviewed five-minute majority-removal policy.
4. Complete all Techs/Events and combinations; add selectable simultaneous actions, dependency handling, and the four-plus-player recommendation.
5. Add owner administration, game/result audit, feedback, and optional newsletter consent/export, using real deployment/privacy configuration.
6. Deliver the required tutorial and finish accessibility, browser/device, load, deployment/recovery, and backup-restore verification before release.

All known rule clarifications are settled. Start the normal-turn rules/UI prototype with provisional replaceable art; asset handoffs and visual refinement can continue alongside development.
