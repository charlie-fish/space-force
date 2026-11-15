# Change log

## 0.5.0 — 2026-11-15

- Specified Board, Techs, Event, and My Board views, with persistent Reserve/Credits totals and full action-board/supply details.
- Added proposed phone pinch/pan/swipe controls and visible alternatives, plus focus-scoped, disableable desktop shortcuts that respect text fields and browser commands.
- Recorded the designer's confirmation of a five-minute idle threshold and removal approved by a majority of the other active players. Removal is explicit, skips the departed player's remaining turns, and awards an automatic win when exactly one non-removed player remains.
- Added phase integration requirements to clear blocking unresolved action tokens, preserve original setup, reject stale controls, and keep play progressing.
- Marked inactivity/electorate details, abandoned-empire handling, pending-choice/bid handling, and forfeit scoring as concrete proposals for designer review.
- Added a linked designer review checklist with outstanding handoffs, launch inputs, and the next implementation steps.

This is a specification/catalogue release. The application and these behaviours are not implemented yet.

## 0.4.0 — 2026-11-15

- Added a lobby for public game creation/discovery/joining and unlisted private rooms, with ready checks, atomic joins/start, and proposed host handover/cleanup policies.
- Recommend the simultaneous-actions variant at four or more seated players once delivered; the host retains mode choice and normal-turn-first development remains agreed.
- Created tutorial reminder issue #1 for skippable personal guidance during a first actual game, with replay from Help.
- Inspected the supplied TTS ZIP: one save JSON and a 256×256 preview, both readable; registered checksums and component/dependency metadata.
- Confirmed the save contains 30 Techs, 30 Events, two six-system pools, sixteen Explore tokens, and 240 rockets in six colour groups sharing one mesh. It still needs adaptation for seven players and distinct silhouettes.
- Recorded that linked artwork/models are not bundled; the substantial embedded Lua controls the table. No imported scripts were executed or remote assets downloaded.
- Added proposed release checks for public-room abuse controls, secure realtime sessions, phone sleep/reconnection, accessibility, browser/network fallback, loading metrics, deployment compatibility, and backup restoration.

This release contains specification and catalogue changes; application behaviour and performance remain to be implemented and tested.

## 0.3.0 — 2026-11-13

- Increased the planned player limit to seven for normal turns and the subsequent selectable simultaneous-actions variant.
- Added the seventh player's 40 rockets, four poker-chip action tokens, action board, and player aid: 280 rockets, 28 chips, seven boards, and seven aids in total.
- Proposed orange, a twin-pod rocket silhouette, and a triangular chip-rim pattern for player seven; these visual choices remain replaceable pending design/STL review.
- Registered `13th hex.pdf`: Adams on the left and Asimov on the right of page one, bringing the catalogue to fourteen system designs.
- Replaced the blank-centre placeholder with Asimov, permitted only in the centre of six-player games.
- Added Adams only in the centre of seven-player games. Its capacity-six home planet supplies the seventh home; it also has four capacity-two planets and a black hole.
- Specified the existing twelve-tile outer layout for six/seven players, with the appropriate exclusive centre tile; both setups contain thirteen systems.
- Recorded the designer's confirmation that the original twelve system hexes are current and closed the version-check reminder.
- Added structured component/setup configuration and expanded planned multiplayer verification to seven clients. Other shared supplies remain unchanged; seven-player games use the existing four-plus-player Event/round rules.

This remains a documentation/catalogue release; there is no playable application yet.

## 0.2.0 — 2026-11-13

- Confirmed normal turns first, followed by the selectable simultaneous-actions variant.
- Corrected setup: unused home designs are excluded from the hidden-system pool.
- Resolved R01–R08 using the designer's rulings, including the complete five-Tech PRODUCE sequence, Spice's non-recursion, and Rapid Advance's direct conversion.
- Specified Event selection/expiry boundaries, the confirmed final-round boundary, and Tech triggers from otherwise empty actions.
- Clarified Arcologies' single shared extra space and fullness at capacity or capacity plus one; recorded Prophecy's capacity-one planet edge case.
- Specified the simultaneous variant's token/slot secrecy and table-wide ordered resolution when a dependency is declared.
- Recorded Sabotage's undiscounted value with Research Lab, its inability to target Sabotage, and random legal value-2/3 replacements for excluded preset Techs.
- Included warp links when checking whether asteroid belts disconnect the board.
- Counted all six player action boards and specified six rocket silhouettes, poker-chip faces/rim patterns, sun snapping, and matching board indentations.
- Registered the supplied front-cover image as a visual reference and added the requested blank six-player centre hex to the catalogue.
- Created reminders for the TTS export, rocket STLs, and designer check of the latest system hex versions.

This remains a documentation/catalogue release. The rules engine and interface have not been implemented or tested.

## 0.1.0 — 2026-11-13

- Established the project brief for browser and mobile play, private administration, game records, undo, feedback, and optional publication-news sign-up.
- Reviewed all 24 rulebook pages and catalogued the 30 Tech cards and 30 Event cards.
- Registered the 12 system hexes, player aids, additional feature tokens, and corrected 16-token Explore supply.
- Recorded the distinction between online play with normal turns and the simultaneous-actions rules variant.
- Proposed the architecture, staged delivery, verification requirements, and extension points.
- Identified rules questions and launch information still needed from the designer.

This release contains planning documents and inventories. There is no playable release or hosted service yet.
