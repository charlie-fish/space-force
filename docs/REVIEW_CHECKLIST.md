# Designer review, reminders, and next steps

Updated 17 November 2026 · Local prototype v0.18

The [local prototype](PROTOTYPE.md) implements normal turns, all thirty Tech effects, ten-card printed/random/playtest displays and Events as a round tracker for two to seven people sharing a device. Review a complete game on desktop and phone. Remote play and full Event effects remain later milestones. C01–C04 are designer-confirmed. Test the labelled Foresight setup, inline powers and resumable Reserve shortfalls in the latest guide. These checks do not reopen resolved R01–R08 or the confirmed original-hex versions.

Implemented feedback: [prototype 0.18 Reserve checks and Foresight layout](PLAYTEST_CHANGES_0.18.md), with [0.17](PLAYTEST_CHANGES_0.17.md), [0.16](PLAYTEST_CHANGES_0.16.md), [0.15](PLAYTEST_CHANGES_0.15.md), [0.14](PLAYTEST_CHANGES_0.14.md), [0.13](PLAYTEST_CHANGES_0.13.md), [0.12](PLAYTEST_CHANGES_0.12.md), [0.11](PLAYTEST_CHANGES_0.11.md), [0.10](PLAYTEST_CHANGES_0.10.md) and [0.9](PLAYTEST_CHANGES_0.9.md) retained as history. The designer has tested desktop/narrow-window layouts; real-phone testing remains outstanding. See [phone instructions](PHONE_TESTING.md).

## Check next

| Priority | Item | Where to review |
| --- | --- | --- |
| 1 | P01–P05 are confirmed, including inactivity, warnings, voting eligibility, stack cleanup, delegation, bids, and forfeit results. Verify these behaviours when the remote-play milestone is implemented. | [Dropout rule](DROPOUTS.md) |
| 2 | Test all Techs under confirmed C01–C04: Gravity passengers/casualties, Death Sun, Soylent replacements, Insurance, Filibuster, endgame SETTLE, Sabotage and inline ongoing powers. Check home double-click/double-tap, Sabotage without Research lab discounts, fixed Mercenaries/Rapid Advance order, Insurance token eligibility/empty-home rewards, separate Death Sun target groups and Go back to Status Box Reserve controls, Foresight heading position and automatic failed rival gifts without interruptions. Check before/after previews, results scrolling and the R01 starting-Tech scenario, free-action/Explore/Reserve/reload interruptions and non-recursive Spice/Rapid Advance. Also review Ship-first production and blocked-system inspection. Status Box/S and B/T/E/A/P scrolling; mobile titles, 10pt text, compact twelve-chip stacks/rings, larger Settlements, decision history, editable PLAN confirmation and phone gestures. Check compact Tech target choices/current-state previews, chip side outlines, confirmation pop-ups and all five final-state views. | [0.18 playtest checklist](PLAYTEST_CHANGES_0.18.md), [gameplay interface](GAMEPLAY_UI.md) |
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

- Extend the implemented skippable phase guide into the complete personal first-play teaching in [TUTORIAL.md](TUTORIAL.md). Issue #1 stays closed as incorporated into the specification.
- Review the optimised PDF artwork and encoded source anchors in the prototype. Archive the original inline PNG and ingest final rocket STLs when available.
- Review the implemented seven provisional silhouettes/rim motifs and responsive navigation. Implement public/private rooms, simultaneous play and its recommendation, and reviewed dropout handling.
- Implement asynchronous play; agree its response/grace/vote timing before that milestone, independently of live five-minute removal. See [the specification](ASYNCHRONOUS_PLAY.md).
- Implement the private admin area, game audit/results, feedback, and optional consented news sign-up/export.

The live checklist is [REMINDERS.md](REMINDERS.md). TTS review: [TTS_REVIEW.md](TTS_REVIEW.md). Original-hex confirmation and TTS-save receipt are completed items.

## Next development steps

1. Playtest the implemented deterministic normal-turn game, including all Techs, the Foresight test option and the R01 scenario. The 214 automated tests include 126 seeded full games, all player counts, rocket conservation, command replay and old-save migration.
2. Review the implemented five-view board, supplies, gestures/shortcuts, draft Undo, autosave/resume, both aid faces and provisional replaceable art on a phone and desktop. Visual browser/device QA is pending.
3. Add server-authoritative public/private rooms, seven independent clients, secret bids, save/rejoin, undo, and the reviewed five-minute majority-removal policy.
4. Complete Event effects/auctions and combinations; add selectable simultaneous actions, dependency handling, and the four-plus-player recommendation.
5. Add owner administration, game/result audit, feedback, and optional newsletter consent/export, using real deployment/privacy configuration.
6. Deliver the required tutorial and finish accessibility, browser/device, load, deployment/recovery, and backup-restore verification before release.

R01–R08 and C01–C04 are confirmed; no further ruling on those items is outstanding. The first local prototype is implemented; asset handoffs and visual refinement can continue alongside the remaining development milestones.
