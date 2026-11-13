# Space Force

An online implementation of Charlie Fish's board game, planned for 2–6 players using desktop and mobile browsers.

**Current status: specification v0.2, 13 November 2026.** This repository contains the project plan, component catalogue, and confirmed designer rulings R01–R08. A playable application has not been implemented or deployed.

## Project documents

- [Project brief and delivery stages](docs/PROJECT_BRIEF.md)
- [Rules review and implementation questions](docs/RULES_REVIEW.md)
- [Source files and artwork plan](docs/ASSETS.md)
- [Rocket, chip, and action-board design](docs/COMPONENT_DESIGN.md)
- [Decisions and information needed](docs/DECISIONS.md)
- [Reminders and outstanding asset handoffs](docs/REMINDERS.md)
- [Change log](CHANGELOG.md)

## Component catalogue

- [Source register](catalog/sources.csv)
- [Tech and Event cards](catalog/cards.csv): 30 of each, with PDF page references.
- [Systems](catalog/systems.csv): 12 supplied illustrated hexes plus the requested blank six-player centre hex; the designer's latest-version check is pending.
- [Explore tokens](catalog/explore-tokens.csv): the complete 16-token distribution, including the three extra copies specified by the designer.
- [Tech presets](catalog/tech-presets.json): the five presets from rulebook page 24.
- [Designer rulings](catalog/rules-clarifications.json): confirmed rules, variant replacement policy, and the five-Tech PRODUCE example, ready to guide engine implementation.

The catalogue is an inventory, not an executable ruleset. Visual transcriptions of the systems need a second check before becoming production game data.

## Working approach

Use Git branches and pull requests for implementation, meaningful rules and multiplayer tests, and versioned releases. Record the engine, content, settings, and deployed release used by each game. Keep artwork references separate from rule identifiers so art can change independently.

The agreed delivery order is normal turns first, then the simultaneous-actions variant on rulebook page 14 as a selectable mode. Both support six connected players. Apply the designer's clarifications alongside the printed rules; Rapid Advance uses the almanac wording and does not perform a SETTLE action.

Use the supplied `SPACE FORCE.png` front-cover graphic as the visual reference, six distinct rocket silhouettes from rulebook page 2, and poker-chip action tokens with individual rim patterns. Token diameter, system suns, and action-board receiving indentations must match.

## Data and ownership

Space Force is designed by Charlie Fish. No open-source licence has been selected. Source-code licensing and artwork permissions are separate decisions.

This repository is public. Game records, feedback, newsletter addresses, consent evidence, credentials, and database backups belong in protected backend storage. The supplied original PDFs are registered by filename and checksum; their source files are retained outside this repository.
