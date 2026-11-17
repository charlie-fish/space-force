# Change log

## 0.14.0 — 2026-11-17

- Default PRODUCE to maximum Ships, retain blocked PLAN systems for inspection with disabled placement, and apply the four requested wording changes.
- Implement ten additional Techs: Population Explosion, Government Incentives, Frontier Pioneer, Rapid Advance, Spice, Arcologies, Cloaking, Patrol, Research Lab and Strategic Stall. Family remains available; new ten-card displays expose the additions and a mixed interaction set.
- Resolve nested before/after free actions without consuming extra tokens/slots, preserve Explore/Reserve interruptions and saves, and implement the confirmed R01 sequence. Rapid Advance is direct conversion; Spice repeats the complete chain once with recalculated production. Banking optionally applies to each performed free action.
- Add the labelled R01 scenario, accounting for five starting Tech markers from each Reserve and recording the setup in exports. It makes the full example testable before the final Actions phase at every player count.
- Add shared Arcologies capacity/snaps, Cloaking before-effect quantities, owner-specific Patrol protection, Research Lab discount/full-price choices and once-per-round Strategic Stall passes.
- Upgrade engine/saves to 0.14.0/schema 5, with compatible replay of genuine 0.8–0.11 engine saves, preserving old production defaults and final scores.
- All 137 automated rules/DOM/replay checks pass, including 90 complete seeded games. Production and portable packaging pass at approximately 53 KB compressed JavaScript with all 85 self-hosted assets. Real-browser/phone visual verification remains pending. See the [complete 0.14 playtest guide](docs/PLAYTEST_CHANGES_0.14.md).

## 0.13.0 — 2026-11-16

- Updated the Actions and Supply explanation, stack-selection prompt and empty-ATTACK confirmation wording.
- Added thin black side segments to chip rims, leaving the middle clear to preserve player-colour readability.
- Replaced inherited column/fixed-size Tech choices with compact horizontal options; added current-state system previews without revealing unexplored contents.
- Reused the board renderer, shared SVG definitions and text-sizing logic for previews in every view. Cached unchanged target lists/preview markup and consolidated redundant chooser CSS without adding dependencies.
- All 112 tests and production/portable checks pass. Engine 0.11/schema 4 and saves remain compatible; browser/phone visual review remains pending.
- See the [complete 0.13 checklist](docs/PLAYTEST_CHANGES_0.13.md).

## 0.12.0 — 2026-11-16

- Simplified Player aid headings/reference text and kept both shared faces visible.
- Added pre-commit confirmations for empty MOVE INTO/SETTLE/ATTACK and for incoming black-hole losses, including the movement follow-up after exploration.
- Moved Reserve limit/empty interruptions to modals. Predictable shortages can be cancelled before commitment; already committed/resumed checkpoints require outcome confirmation without reopening hidden reveals or adding a Status Box step.
- Made yellow legal-chip rings blink, kept blue hover/focus rings steady, respected reduced motion, and ordered Players & supply from the current first player.
- Added focused/background-blocking and stale-confirmation safeguards. Application version 0.12 retains engine 0.11/schema 4 and existing save compatibility. All 108 tests and packaging checks pass; real-browser/phone visual review remains pending.
- See the [complete 0.12 checklist](docs/PLAYTEST_CHANGES_0.12.md).

## 0.11.0 — 2026-11-16

- Applied the third designer playtest batch: selected-only PLAN previews, guarded double-click/double-tap confirmation, top-first stack numbering, clearer chip rims/legal rings, dark Ivory rocket outlines and names drawn above all system art.
- Simplified Status Box turn text, collapsed history by default, made Invest bold with a System-status scroll target, retained more Status Box context during view changes and revised final-score labels/winner wording.
- Added the original asteroid-belt/warp feature-token artwork, rotated edge belts and open-space warp placement. Disruptor now has no final-round placement effect, with card/detail notice and compatible old-save recovery.
- Added iPhone HTTP/Safari testing instructions and a loading/help fallback for HTML previews. Specified asynchronous play with a separate removal-policy requirement; the live five-minute timeout does not apply.
- Cached unchanged geometry and reused board-chip SVG rims without adding dependencies. All 96 tests and production/portable checks pass; 85 self-hosted assets are included. Real-phone and formal cross-browser visual verification remain pending.
- See the [complete 0.11 feedback checklist](docs/PLAYTEST_CHANGES_0.11.md).

## 0.10.0 — 2026-11-16

- Applied the second designer playtest batch: separate Status Box heading/S shortcut, highlighted turn and prompt, decision-based “Since your last turn” history, score summaries, 10pt live text, destination scrolling and mobile-specific labels.
- Condensed every chip in tall stacks with owner-coloured rims and thin legal-chip rings; moved stack numbering into System status and doubled Settlement rockets. Replaced printed, Planet Killer and Explore holes with the supplied circular Explore artwork; Le Guin remains hole-free by default.
- Made PLAN placement a changeable preview until “Place chip here”; kept Investments on the Board, balanced investment edits automatically, capped reinforcement drafts and enabled board-click allocation.
- Added target-first attacks, preserved attack scrolling, reordered selected Tech targets, vertical production controls, supply-limit explanations and confirmations for unused reinforcements or tokenless Tech effects.
- Revealed and oriented explored systems before Ship quantities, required positive legal entry, paused non-choice Explore outcomes for Ok, and added a locked-commitment redistribution decision when an opponent's reward displaces a Settlement.
- Added Reserve-shortfall acknowledgements, automatic first-player handover and all five final-state views below the completed-game results. Autosaves preserve pending decisions; genuine 0.8/0.9 records migrate by replay.
- All 84 rules/content/DOM/migration checks pass, including 72 seeded complete games and exact record replay. Production packaging passes with 83 self-hosted assets and approximately 47 KB compressed JavaScript. Browser/phone visual testing remains outstanding.
- See the [complete 0.10 feedback checklist](docs/PLAYTEST_CHANGES_0.10.md). The playable preset remains local normal-turn Family/simpler Events.

## 0.9.0 — 2026-11-16

- Applied the designer's first playtest feedback: top Status Box, visible stack order, highlighted chips, direct/drag PLAN placement, linked production, draft SETTLE allocations and repeatable rotation previews.
- Added measured settlement snaps, adaptive fleet/Planet Nine placement, graphical attack targets and legal quantity caps, excess-sacrifice/empty-Genesis confirmations, invested-slot markers, token-availability badges, sorted Techs and board-linked feature/edge choices.
- Renamed Actions to Actions and Supply, labelled view shortcuts, regrouped pan/zoom/Reset View controls and retained public supplies in the persistent header.
- Made Event and first-player handover explicit Economy steps, highlighted stages on the supplied first-player token, and moved reinforcement decisions to the Board's Status Box.
- Preserved old games through versioned command replay. Added regression coverage for the new interactions, hidden reveal batches, inbound-only black-hole losses and source geometry.
- See [the complete feedback checklist](docs/PLAYTEST_CHANGES_0.9.md). Full Event effects/auctions and remote services remain later milestones; browser/device visual verification is still pending.

## 0.8.0 — 2026-11-15

- Implemented the first local 2–7-player normal-turn prototype using the official Family Tech preset and simpler Events variant. Includes setup, chip stacks, four actions, Investments, all ten Family Techs, Economy, scoring and ties.
- Added the five views, visible public supplies, seven provisional silhouettes with distinct chip rims, sun snap anchors, touch camera/navigation, keyboard/focus controls, both shared-aid faces and an initial skippable phase guide.
- Added pre-commit draft Undo, locked reveal follow-ups, optional autosave/resume and exportable game records with deterministic command replay.
- Prepared 80 optimised self-hosted assets and source anchors; corrected Le Guin's planet count/capacities and Lem's two asteroid edges in the catalogue. Supplied original versions remain confirmed current.
- Added rules/DOM/asset tests, 72 seeded complete-game checks across all player counts, a build-size budget and GitHub Actions build artifacts. Visual browser/device testing remains pending.
- Remote rooms, the full card set/auctions, simultaneous play, dropout handling, private administration/feedback/newsletter, and the complete personal tutorial remain later milestones; see [prototype scope](docs/PROTOTYPE.md).

## 0.7.0 — 2026-11-15

- Confirmed P01 inactivity, warning, acknowledgement/pause, and voting-electorate details. All P01–P05 dropout rulings are now settled.
- Removed stale pending-rule reminders and recorded that no further designer decisions or final artwork are prerequisites for starting the first local normal-turn prototype.
- Clarified implementation milestones: rules/UI and a complete local game first; authoritative rooms/synchronisation/recovery for the remote-play milestone; production administration/hosting and final art later.

This remains specification work; the playable application still needs implementation.

## 0.6.0 — 2026-11-15

- Confirmed dropout P02–P05: automatically remove action tokens from board stacks; retain other components and passive effects; delegate game-critical decisions to the next player on behalf of the removed player; use the agreed bid handling and forfeit-score snapshots. Only P01 eligibility details remain proposed.
- Replaced the prior post-commit/table-rollback proposal with confirmed pre-commit-only Undo. Any hidden-information reveal locks that resolution, including an Explore flip.
- Renamed My Board to Actions and added a fifth easy-to-reach Player Aid view, with proposed shortcut P.
- Corrected the supply to one shared two-sided player aid. Both faces are rendered together; seven individual action boards remain.
- Incorporated the first-play tutorial as a required feature in TUTORIAL.md and structured configuration. Its reminder issue #1 is superseded and closed at the designer's request; tutorial implementation is still outstanding.
- Updated review/reminder lists and cross-file policies. Rocket STLs remain outstanding.

This is a specification/catalogue release, not a playable implementation.

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
