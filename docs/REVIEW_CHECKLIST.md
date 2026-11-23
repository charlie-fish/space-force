# Designer review, reminders, and next steps

Updated 23 November 2026 · Major local prototype milestone v1.0.0

The [local prototype](PROTOTYPE.md) implements normal turns, all 30 Techs, all 30 Events and sealed bidding for two to seven people sharing a device. The designer approved the current rocket appearances and closed the STL action. The initial local Tech playtest is complete. Review the three ten-card Event scenarios and combined interactions next; browser/phone and remote verification remain outstanding. R01–R08, C01–C04 and Event rulings E01–E05 are confirmed.

Implemented feedback: [v1.0.0 efficiency review and app scope](PLAYTEST_CHANGES_1.0.md), [0.22 decks and board choices](PLAYTEST_CHANGES_0.22.md), [0.21 Event guidance and Tech choices](PLAYTEST_CHANGES_0.21.md), [0.20 Events/bidding and batch guide](PLAYTEST_CHANGES_0.20.md), [prototype 0.19 board layers and controls](PLAYTEST_CHANGES_0.19.md), with [0.18](PLAYTEST_CHANGES_0.18.md), [0.17](PLAYTEST_CHANGES_0.17.md), [0.16](PLAYTEST_CHANGES_0.16.md), [0.15](PLAYTEST_CHANGES_0.15.md), [0.14](PLAYTEST_CHANGES_0.14.md), [0.13](PLAYTEST_CHANGES_0.13.md), [0.12](PLAYTEST_CHANGES_0.12.md), [0.11](PLAYTEST_CHANGES_0.11.md), [0.10](PLAYTEST_CHANGES_0.10.md) and [0.9](PLAYTEST_CHANGES_0.9.md) retained as history. The designer has tested desktop/narrow-window layouts; real-phone testing remains outstanding. See [phone instructions](PHONE_TESTING.md).

The immediate coding milestone is [authoritative remote normal-turn play](NEXT_PHASE.md). [Apple/Android apps](MOBILE_APPS.md) are now required product scope and follow the shared online service.

## Check next

| Priority | Item | Where to review |
| --- | --- | --- |
| 1 | Playtest all 30 implemented Events and bidding using the three batches: private bids/handoffs, ties, payment, active-Event duration/expiry, forced decisions, end timing and Tech interactions. Retain simpler Events as an option; Foresight becomes usable in ordinary full-Event games. | [Rules review](RULES_REVIEW.md), [Event reference text](../src/cards-data.json) |
| 2 | Test the existing build on a real phone through an HTTP(S) address in Safari/Chrome. Check pan/pinch/tap orientation, five views, text, stack order, dialogs and pending-choice refresh. Narrow desktop windows do not replace phone testing. | [Phone instructions](PHONE_TESTING.md), [0.19 guide](PLAYTEST_CHANGES_0.19.md), [gameplay interface](GAMEPLAY_UI.md) |
| 3 | Build authoritative online games for 2–7 separate browsers: protected seats, public/private rooms, ready/start, private state/bids, durable saves, rejoin/restart and duplicate/stale command rejection. Implement confirmed P01–P05 and the five-minute majority-removal policy, including sole-player victory. | [Project brief](PROJECT_BRIEF.md), [lobby](LOBBY.md), [dropouts](DROPOUTS.md) |
| 4 | Add selectable simultaneous actions with dependency resolution and the 4+ recommendation, plus asynchronous play with separately agreed deadlines/removal rules. Retain normal turns and local pass-and-play. | [Rules review](RULES_REVIEW.md), [asynchronous play](ASYNCHRONOUS_PLAY.md) |
| 5 | Add private owner administration, change/game/score history, feedback management and optional newsletter consent/export. Begin durable game auditing with the first online server, before the admin screens are finished. Confirm deployment, privacy and retention details before collecting addresses. | [Project brief](PROJECT_BRIEF.md), [platform review](PLATFORM_REVIEW.md) |
| 6 | Complete the personal first-play tutorial and release checks for accessibility, browser/device behaviour, performance, recovery and backup restoration. Both shared-aid faces remain visible. | [Tutorial](TUTORIAL.md), [platform review](PLATFORM_REVIEW.md) |
| 7 | Rocket appearance approved; STL handoff closed. Continue checking shape/rim readability on real devices. | [Component design](COMPONENT_DESIGN.md), [reminders](REMINDERS.md) |
| 8 | Review asset anchors/layouts and draft-only Undo during continued playtests. Source hex versions, Asimov/Adams exclusivity and the commit/no-reveal boundary are settled. | [Assets](ASSETS.md), [rules review](RULES_REVIEW.md), [Undo policy](PROJECT_BRIEF.md#undo-policy) |
| 9 | Deliver iPhone/iPad and Android apps using the same online service, with cross-play, safe background/reconnect handling, optional notifications and store testing. | [App specification](MOBILE_APPS.md) |

## Outstanding from you

- Earth First/Disruptor precedence is confirmed as E04; no further ruling on that interaction is needed. Review the warnings and updated Tech controls in [0.21](PLAYTEST_CHANGES_0.21.md).

- No rocket STLs are needed; this action is closed.
- Optional Tabletop Simulator Workshop URL. The supplied TTS ZIP has already been received and inspected; there is no need to resend it.
- When preparing hosting: domain and budget, expected simultaneous rooms, owner login preference, privacy controller/contact and jurisdiction, audience/retention preferences, any mailing provider, and code/art licensing choices. These are launch inputs, not prerequisites for a local rules/UI prototype. See [DECISIONS.md](DECISIONS.md#needed-before-public-deployment-or-collecting-addresses).

## Outstanding implementation reminders

- Extend the implemented skippable phase guide into the complete personal first-play teaching in [TUTORIAL.md](TUTORIAL.md). Issue #1 stays closed as incorporated into the specification.
- Review the optimised PDF artwork and encoded source anchors in the prototype. Archive the original inline PNG when available; current rockets are accepted.
- Review the implemented seven approved silhouettes/rim motifs and responsive navigation. Implement public/private rooms, simultaneous play and its recommendation, and reviewed dropout handling.
- Implement asynchronous play; agree its response/grace/vote timing before that milestone, independently of live five-minute removal. See [the specification](ASYNCHRONOUS_PLAY.md).
- Implement the private admin area, game audit/results, feedback, and optional consented news sign-up/export.
- Deliver the specified iOS/iPadOS and Android apps; prepare store/signing/privacy inputs at that later milestone.

The live checklist is [REMINDERS.md](REMINDERS.md). TTS review: [TTS_REVIEW.md](TTS_REVIEW.md). Original-hex confirmation and TTS-save receipt are completed items.

## Next development steps

1. Use the v1.0.0 tag as the current local reference; retain v0.19 as the designer-reviewed Tech checkpoint. Automated checks include 190 completed seeded games, exact 0.22 behaviour comparisons, supply conservation, replay and older-save migration. This does not replace designer Event playtests or establish remote privacy.
2. Playtest all three implemented Event batches and bidding, including combined Tech/Event effects. [Version 0.20](PLAYTEST_CHANGES_0.20.md) provides the test scenarios. Normal-turn-first delivery remains unchanged.
3. Make an HTTP(S) playtest preview available and test real phones alongside Event development. No hosted preview is currently deployed; domain/production hosting is not required to test locally using the existing phone instructions.
4. Follow [the Stage 2 plan](NEXT_PHASE.md): add authoritative public/private rooms, seven independent clients, hidden-state projection, durable game/audit records, reconnect/restart recovery, draft commitment and the confirmed five-minute majority-removal policy.
5. Add selectable simultaneous actions and the four-plus recommendation, followed by asynchronous play with its own agreed response/removal policy.
6. Add the private admin interface, feedback and consented newsletter/export; complete the personal tutorial, final assets and production verification before public launch.
7. Deliver the Apple and Android app milestone using the same service and a mixed-platform testing programme.

R01–R08 and C01–C04 are confirmed; no further ruling on those items is outstanding. The first local prototype is implemented; asset handoffs and visual refinement can continue alongside the remaining development milestones.
