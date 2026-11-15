# Reminders and asset handoffs

Updated 15 November 2026. Keep this checklist current as files and checks arrive. These are persistent project reminders, not scheduled notifications.

Review priorities and next steps: [REVIEW_CHECKLIST.md](REVIEW_CHECKLIST.md).

## From the designer

- [ ] Review exact interface bindings and provisional player styling during the prototype. P01–P05 and the pre-commit/no-reveal Undo rule are confirmed; these reviews do not block implementation.

- [ ] Share the **Tabletop Simulator Workshop URL** if convenient; the save ZIP has been received and parsed, so this is an optional additional reference.
- [ ] Share the **rocket STL files**, with the colour mapping for the original designs if it is not clear from the filenames. Include a seventh design if available; the current seventh silhouette is provisional.

## Project work to retain

- [ ] Build Board/Techs/Event/Actions/Player Aid navigation with persistent Reserve/Credits, safe phone gestures, and desktop shortcuts.
- [ ] Implement the confirmed five-minute majority-removal core with reviewed phase handling, skipped turns, audit records, and automatic last-player victory.

- [ ] Implement the required first-play tutorial in [TUTORIAL.md](TUTORIAL.md). Reminder issue #1 is superseded by that specification and closed; this checkbox tracks implementation, which is still outstanding.
- [ ] Build the public/private lobby and the 4+ player simultaneous-mode recommendation, with explicit host choice, readiness, and fair reconnect handling.
- [ ] Prepare approved component images/models from the TTS references, verify their versions against the PDFs/rulings, and create optimised self-hosted web assets. The ZIP contains a preview, not the full linked art/model files.

- [ ] Prepare web assets and centre anchors from `13th hex.pdf`: **Asimov only for six players, Adams only for seven**. The supplied Asimov artwork replaces the old blank-hex task.
- [ ] Archive the original `SPACE FORCE.png` binary and prepare an optimised web copy when it is available to the asset pipeline. Its supplied appearance is already recorded as the cover reference.
- [ ] Build seven distinct rocket silhouettes and matching poker-chip faces/rim patterns; match chip, sun, and action-board indentation diameters. Orange, a twin-pod silhouette, and a triangular rim pattern are provisional for player seven.

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
