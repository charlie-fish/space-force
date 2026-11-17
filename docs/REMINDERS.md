# Reminders and asset handoffs

Updated 17 November 2026. Keep this checklist current as files and checks arrive. These are persistent project reminders, not scheduled notifications.

Review priorities and next steps: [REVIEW_CHECKLIST.md](REVIEW_CHECKLIST.md).

## From the designer

- [ ] Review exact interface bindings and provisional player styling during the prototype. P01–P05 and the pre-commit/no-reveal Undo rule are confirmed; these reviews do not block implementation.

- [ ] Share the **Tabletop Simulator Workshop URL** if convenient; the save ZIP has been received and parsed, so this is an optional additional reference.
- [ ] Share the **rocket STL files**, with the colour mapping for the original designs if it is not clear from the filenames. Include a seventh design if available; the current seventh silhouette is provisional.

## Project work to retain

- [x] Build local Board/Techs/Event/Actions and Supply/Player Aid navigation with persistent Reserve/Credits, touch camera/view gestures, and desktop shortcuts.
- [x] Implement all seven designer playtest batches, including Status history/S, compact legal-chip rings, explicit PLAN confirmation, Explore pauses/redistribution, Reserve warnings, allocation balancing and final-state views. See the [0.15 checklist](PLAYTEST_CHANGES_0.15.md).
- [x] Add ten more Techs and selectable displays, with the R01 starting-Tech scenario, nested free-action checkpoints, shared Arcologies space, Patrol protection, Research Lab prices and Strategic Stall. The subsequent release completes all thirty Tech effects.
- [x] Implement the last ten Techs, printed/random displays, before/after previews and results scrolling. Foresight is available in a labelled nonstandard test and excluded with legal replacement from normal simpler Events.
- [x] Apply the [0.17 corrections](PLAYTEST_CHANGES_0.17.md): fixed Mercenaries/Rapid Advance order, Insurance eligibility/home rewards, Flexible economy subheading and Go back warnings, and Sabotage wording/payment.
- [x] C01–C04 confirmed by the designer; record them with R01–R08 in the rules catalogue.
- [x] Implement home double-click/double-tap, inline Foresight/Flexible Economy, resumable Reserve-limited effects, Filibuster stack-position labels, Sabotage contrast/X reset/minimum payment and corrected Death Sun groups. See [the 0.16 guide](PLAYTEST_CHANGES_0.16.md).
- [ ] Complete Event effects/auctions and remaining interactions; test their remote/simultaneous behaviour.
- [ ] Complete formal browser/phone and accessibility playtests. The designer has tested desktop/narrow-window layouts; a real Safari phone run remains outstanding. See [phone instructions](PHONE_TESTING.md) and [validation](PROTOTYPE.md#validation).
- [ ] Implement the confirmed five-minute majority-removal core with reviewed phase handling, skipped turns, audit records, and automatic last-player victory.

- [ ] Complete the personal first-play tutorial in [TUTORIAL.md](TUTORIAL.md). An initial skippable/replayable local phase guide is implemented. Reminder issue #1 stays closed; per-seat progress and later multiplayer teaching remain outstanding.
- [ ] Implement [asynchronous play](ASYNCHRONOUS_PLAY.md), including protected resume, catch-up history and its own agreed response/grace/removal-vote policy. Do not apply live five-minute inactivity.
- [ ] Build the public/private lobby and the 4+ player simultaneous-mode recommendation, with explicit host choice, readiness, and fair reconnect handling.
- [ ] Prepare approved component images/models from the TTS references, verify their versions against the PDFs/rulings, and create optimised self-hosted web assets. The ZIP contains a preview, not the full linked art/model files.

- [x] Prepare web assets and centre anchors from `13th hex.pdf`: **Asimov only for six players, Adams only for seven**. The supplied Asimov artwork replaces the old blank-hex task.
- [ ] Archive the original `SPACE FORCE.png` binary and prepare an optimised web copy when it is available to the asset pipeline. Its supplied appearance is already recorded as the cover reference.
- [x] Build seven provisional rocket silhouettes and matching chip faces/rim motifs, anchored to printed suns and matching receiving cutouts. Orange, a twin-pod silhouette, and a triangular rim pattern are provisional for player seven.
- [ ] Validate silhouette/colour mapping and final chip/board proportions against the forthcoming STLs and device playtests.

- [x] Implement and test complete local normal-turn Family/simpler-Events games, including all ten Family Techs, scoring, draft Undo, autosave/resume and deterministic record export.
- [x] Prepare 85 optimised self-hosted PDF assets, including both aid faces, Economy/Planet Nine tokens circular black-hole artwork and the original asteroid-belt/warp feature tokens. Archive of the original inline PNG remains outstanding.

## Recorded and settled

- [x] Dropout P02–P05 confirmed, including stack-token removal and decisions made on behalf of the removed player.
- [x] Undo restricted to uncommitted moves with no hidden-information reveal.
- [x] Five views specified, including Actions and a shared Player Aid displaying both faces.

- [x] Designer confirmed five-minute idle removal approved by a majority of the other active players; removed players skip remaining turns and a sole remaining participant wins.
- [x] Recorded five-view navigation, phone gestures, desktop shortcuts, and visible Reserve/Credits requirements.

- [x] Received and inspected `Re__Space_Force_TTS_changes.zip`: save JSON, preview, component inventory, and embedded table-control Lua.
- [x] Tutorial requirements incorporated into [TUTORIAL.md](TUTORIAL.md); reminder [issue #1](https://github.com/charlie-fish/space-force/issues/1) superseded and closed at the designer's request.
- [x] Recorded public/private lobby scope and the recommendation for simultaneous play at four or more players.

- [x] `SPACE FORCE.png` received as an inline visual reference for the front cover.
- [x] **Normal turns first**, then the selectable simultaneous-actions variant.
- [x] Increased scope to **seven players**: 280 rockets, 28 action chips, seven action boards, and one shared two-sided player aid. Each board has four chip-receiving indentations.
- [x] Designer confirmed the original twelve system hexes are the latest versions.
- [x] Received `13th hex.pdf` with Adams on the left and Asimov on the right; replaced the blank-centre placeholder with the count-specific named systems.
- [x] Hidden systems exclude unused home designs.
- [x] R01–R08 resolved and the Prophecy/asteroid-warp edge cases recorded.

The outstanding file handoffs do not block rules-engine development using provisional semantic pieces and the recorded rulings. Check and update this list during subsequent project iterations.
