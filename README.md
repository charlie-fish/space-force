# Space Force

An online implementation of Charlie Fish's board game, planned for 2–7 players using desktop and mobile browsers.

**Current status: specification v0.5, 15 November 2026.** This repository contains the game plan/catalogues, seven-player extension, lobby and navigation requirements, confirmed five-minute majority-removal rule, and TTS review. Detailed dropout integration proposals are marked for review. A playable application has not been implemented or deployed.

## Project documents

- [Designer review checklist and next steps](docs/REVIEW_CHECKLIST.md)
- [Project brief and delivery stages](docs/PROJECT_BRIEF.md)
- [In-game views, gestures, and shortcuts](docs/GAMEPLAY_UI.md)
- [Idle-player removal and continued play](docs/DROPOUTS.md)
- [Rules review and implementation questions](docs/RULES_REVIEW.md)
- [Source files and artwork plan](docs/ASSETS.md)
- [Rocket, chip, and action-board design](docs/COMPONENT_DESIGN.md)
- [Public/private lobby and mode recommendations](docs/LOBBY.md)
- [Platform best practices and release checks](docs/PLATFORM_REVIEW.md)
- [Tabletop Simulator archive review](docs/TTS_REVIEW.md)
- [Decisions and information needed](docs/DECISIONS.md)
- [Reminders and outstanding asset handoffs](docs/REMINDERS.md)
- [Change log](CHANGELOG.md)

## Component catalogue

- [Source register](catalog/sources.csv)
- [Tech and Event cards](catalog/cards.csv): 30 of each, with PDF page references.
- [Systems](catalog/systems.csv): 14 supplied designs. Asimov is the centre only for six players; Adams is the centre only for seven. The original twelve designs are confirmed current.
- [Game configuration](catalog/game-configuration.json): player limit, component quantities, setup by player count, and provisional orange seventh-player style.
- [Lobby configuration](catalog/lobby-configuration.json): public/private rooms, readiness, and the four-plus-player recommendation with explicit host mode choice.
- [Interaction defaults](catalog/interaction-configuration.json): four views, persistent resources, gestures, and scoped shortcuts.
- [Dropout policy](catalog/dropout-policy.json): confirmed five-minute majority removal and separately marked integration proposals.
- [TTS inventory](catalog/tts-inventory.json): received save/preview, deck and model counts, and external asset dependencies.
- [Explore tokens](catalog/explore-tokens.csv): the complete 16-token distribution, including the three extra copies specified by the designer.
- [Tech presets](catalog/tech-presets.json): the five presets from rulebook page 24.
- [Designer rulings](catalog/rules-clarifications.json): confirmed rules, variant replacement policy, and the five-Tech PRODUCE example, ready to guide engine implementation.

The catalogue is an inventory, not an executable ruleset. Visual transcriptions of the systems need a second check before becoming production game data.

## Working approach

Use Git branches and pull requests for implementation, meaningful rules and multiplayer tests, and versioned releases. Record the engine, content, settings, and deployed release used by each game. Keep artwork references separate from rule identifiers so art can change independently.

The agreed delivery order is normal turns first, then the simultaneous-actions variant on rulebook page 14 as a selectable mode. Both support up to seven connected players. Recommend simultaneous actions for four or more seated players when available, while preserving the host's choice. Apply the designer's clarifications alongside the printed rules; Rapid Advance uses the almanac wording and does not perform a SETTLE action.

Use the supplied `SPACE FORCE.png` front-cover graphic as the visual reference, the six original rocket silhouettes from rulebook page 2 plus a seventh distinct silhouette, and poker-chip action tokens with individual rim patterns. Token diameter, system suns, and action-board receiving indentations must match.

At seven players the supply is **280 rockets, 28 action chips, seven action boards, and seven player aids**. The original twelve tiles form the outer layout; use Adams as the seventh home system in the centre. At six players, use Asimov in the centre. Each of those setups uses thirteen hexes; the two special centre tiles are never used together.

The lobby supports creating public games, joining waiting public games, and creating/joining unlisted private rooms. In play, use Board, Techs, Event, and My Board views with visible Reserve/Credits. After five minutes of qualifying inactivity, a majority of the other active players can remove the idle participant; their future turns are skipped and a sole remaining player wins. A skippable first-play teaching mode is tracked in [tutorial issue #1](https://github.com/charlie-fish/space-force/issues/1).

## Data and ownership

Space Force is designed by Charlie Fish. No open-source licence has been selected. Source-code licensing and artwork permissions are separate decisions.

This repository is public. Game records, feedback, newsletter addresses, consent evidence, credentials, and database backups belong in protected backend storage. The supplied original PDFs are registered by filename and checksum; their source files are retained outside this repository.
