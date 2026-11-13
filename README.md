# Space Force

An online implementation of Charlie Fish's board game, planned for 2–6 players using desktop and mobile browsers.

**Current status: discovery and specification, 13 November 2026.** This repository contains the initial project plan and component catalogue. A playable application has not been implemented or deployed.

## Project documents

- [Project brief and delivery stages](docs/PROJECT_BRIEF.md)
- [Rules review and implementation questions](docs/RULES_REVIEW.md)
- [Source files and artwork plan](docs/ASSETS.md)
- [Decisions and information needed](docs/DECISIONS.md)
- [Change log](CHANGELOG.md)

## Component catalogue

- [Source register](catalog/sources.csv)
- [Tech and Event cards](catalog/cards.csv): 30 of each, with PDF page references.
- [Systems](catalog/systems.csv): 12 illustrated hexes; the six-player centre is an additional virtual system.
- [Explore tokens](catalog/explore-tokens.csv): the complete 16-token distribution, including the three extra copies specified by the designer.
- [Tech presets](catalog/tech-presets.json): the five presets from rulebook page 24.

The catalogue is an inventory, not an executable ruleset. Visual transcriptions of the systems need a second check before becoming production game data.

## Working approach

Use Git branches and pull requests for implementation, meaningful rules and multiplayer tests, and versioned releases. Record the engine, content, settings, and deployed release used by each game. Keep artwork references separate from rule identifiers so art can change independently.

The proposed initial mode uses normal turns with all players connected at once. The simultaneous-actions variant on rulebook page 14 is tracked separately, pending the designer's preference.

## Data and ownership

Space Force is designed by Charlie Fish. No open-source licence has been selected. Source-code licensing and artwork permissions are separate decisions.

This repository is public. Game records, feedback, newsletter addresses, consent evidence, credentials, and database backups belong in protected backend storage. The supplied original PDFs are registered by filename and checksum; their source files are retained outside this repository.
