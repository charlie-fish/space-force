# Designer review, reminders, and next steps

Updated 17 November 2026 · Local prototype v0.19

The [local prototype](PROTOTYPE.md) implements normal turns, all thirty Tech effects, ten-card printed/random/playtest displays and Events as a round tracker for two to seven people sharing a device. On 17 November 2026 the designer reported that all 30 Techs seem to be working as intended. Record the initial local Tech playtest as complete; combined Tech/Event behaviour and real-browser/phone verification remain outstanding. R01–R08, C01–C04 and the original hex versions remain confirmed. The recommended next implementation milestone is all 30 Event effects and their auction in local normal-turn play.

Implemented feedback: [prototype 0.19 board layers and controls](PLAYTEST_CHANGES_0.19.md), with [0.18](PLAYTEST_CHANGES_0.18.md), [0.17](PLAYTEST_CHANGES_0.17.md), [0.16](PLAYTEST_CHANGES_0.16.md), [0.15](PLAYTEST_CHANGES_0.15.md), [0.14](PLAYTEST_CHANGES_0.14.md), [0.13](PLAYTEST_CHANGES_0.13.md), [0.12](PLAYTEST_CHANGES_0.12.md), [0.11](PLAYTEST_CHANGES_0.11.md), [0.10](PLAYTEST_CHANGES_0.10.md) and [0.9](PLAYTEST_CHANGES_0.9.md) retained as history. The designer has tested desktop/narrow-window layouts; real-phone testing remains outstanding. See [phone instructions](PHONE_TESTING.md).

## Check next

| Priority | Item | Where to review |
| --- | --- | --- |
| 1 | Implement all 30 Event effects and the auction locally: private bids/handoffs, ties, payment, active-Event duration/expiry, forced decisions, end timing and Tech interactions. Retain simpler Events as an option; Foresight becomes usable in ordinary full-Event games. | [Rules review](RULES_REVIEW.md), [Event reference text](../src/cards-data.json) |
| 2 | Test the existing build on a real phone through an HTTP(S) address in Safari/Chrome. Check pan/pinch/tap orientation, five views, text, stack order, dialogs and pending-choice refresh. Narrow desktop windows do not replace phone testing. | [Phone instructions](PHONE_TESTING.md), [0.19 guide](PLAYTEST_CHANGES_0.19.md), [gameplay interface](GAMEPLAY_UI.md) |
| 3 | Build authoritative online games for 2–7 separate browsers: protected seats, public/private rooms, ready/start, private state/bids, durable saves, rejoin/restart and duplicate/stale command rejection. Implement confirmed P01–P05 and the five-minute majority-removal policy, including sole-player victory. | [Project brief](PROJECT_BRIEF.md), [lobby](LOBBY.md), [dropouts](DROPOUTS.md) |
| 4 | Add selectable simultaneous actions with dependency resolution and the 4+ recommendation, plus asynchronous play with separately agreed deadlines/removal rules. Retain normal turns and local pass-and-play. | [Rules review](RULES_REVIEW.md), [asynchronous play](ASYNCHRONOUS_PLAY.md) |
| 5 | Add private owner administration, change/game/score history, feedback management and optional newsletter consent/export. Begin durable game auditing with the first online server, before the admin screens are finished. Confirm deployment, privacy and retention details before collecting addresses. | [Project brief](PROJECT_BRIEF.md), [platform review](PLATFORM_REVIEW.md) |
| 6 | Complete the personal first-play tutorial and release checks for accessibility, browser/device behaviour, performance, recovery and backup restoration. Both shared-aid faces remain visible. | [Tutorial](TUTORIAL.md), [platform review](PLATFORM_REVIEW.md) |
| 7 | Supply rocket STLs and confirm shape/colour mapping, including the provisional seventh orange/twin-pod/triangular design. These do not block Event or server development. | [Component design](COMPONENT_DESIGN.md), [reminders](REMINDERS.md) |
| 8 | Review asset anchors/layouts and draft-only Undo during continued playtests. Source hex versions, Asimov/Adams exclusivity and the commit/no-reveal boundary are settled. | [Assets](ASSETS.md), [rules review](RULES_REVIEW.md), [Undo policy](PROJECT_BRIEF.md#undo-policy) |

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

1. Keep v0.19 as the reviewed local Tech baseline. The designer's initial Tech playtest is complete; the 220 automated checks include 126 seeded full games, supply conservation, replay and older-save migration. This does not establish unimplemented Event interactions or remote privacy.
2. Complete all 30 Events and the auction in the local normal-turn game, then playtest full games with combined Tech/Event effects. This is the recommended next coding milestone. Normal-turn-first delivery remains unchanged.
3. Make an HTTP(S) playtest preview available and test real phones alongside Event development. No hosted preview is currently deployed; domain/production hosting is not required to test locally using the existing phone instructions.
4. Add authoritative public/private rooms, seven independent clients, hidden-state projection, durable game/audit records, reconnect/restart recovery, draft commitment and the confirmed five-minute majority-removal policy.
5. Add selectable simultaneous actions and the four-plus recommendation, followed by asynchronous play with its own agreed response/removal policy.
6. Add the private admin interface, feedback and consented newsletter/export; complete the personal tutorial, final assets and production verification before public launch.

R01–R08 and C01–C04 are confirmed; no further ruling on those items is outstanding. The first local prototype is implemented; asset handoffs and visual refinement can continue alongside the remaining development milestones.
