# Space Force

A browser implementation of Charlie Fish's board game, for desktop and mobile.

**Current implementation: prototype 0.8.0, 15 November 2026.** A complete local pass-and-play game for **2–7 players sharing one device**, using normal turns, the official ten-Tech **Family** preset, and the rulebook's **simpler Events** variant. Event cards count rounds; their effects and auctions are disabled. This is the first implementation milestone; remote multiplayer is next.

## Run the prototype

For a desktop playtest without installing Node, open a successful [Prototype checks run](https://github.com/charlie-fish/space-force/actions/workflows/prototype.yml), download **space-force-local-prototype**, extract the entire ZIP, and try opening `index.html`. Keep its `art/` folder alongside it. If your browser restricts local files, use the HTTP instructions below. The portable copy has build checks; visual browser/device verification is still pending.


Install [Node.js 24 LTS](https://nodejs.org/), then run:

```sh
git clone https://github.com/charlie-fish/space-force.git
cd space-force
git switch prototype/normal-turns
npm ci
npm run dev
```

Open **http://localhost:5173**. Choose the player count and names, start a game, and select homes in player order. The guide explains each phase. On a phone sharing the computer's network, use the Network URL printed by Vite.

For a production static build, run `npm run build`; serve the generated `dist/` directory over HTTP(S). `npm run preview` serves that build locally on port 4173. `npm run package` also creates the portable playtest copy in `work/portable/`. The build supports hosting under a subpath. GitHub Actions runs the tests/build and provides a downloadable `space-force-static-prototype` artifact; it does not publish a live site.

## Included now

- Correct layouts, home/hidden pools, and 40 rockets/four chips per player. Six-player games use Asimov; seven-player games use Adams as the central seventh home.
- Ordered chip stacks, all four actions, Investments, limited supplies, Economy, all ten Family Tech effects, final scoring and tie-breaks.
- Board, Techs, Event, Actions, and Player Aid views. Both shared-aid faces appear together. Reserve and Credits stay visible; the player summary shows everyone's public supplies.
- Seven provisional rocket silhouettes and matching poker-chip rim motifs, with chips anchored to the printed suns.
- Map pan/pinch/zoom, tap alternatives, view swipes on the navigation bar, keyboard shortcuts, focus handling, reduced motion, semantic card text, and a skippable contextual guide.
- Draft-only Undo. Committed actions and hidden reveals stay locked. Autosave/resume works through pending reveals and choices, with a session fallback when storage is blocked.
- Exportable local game records with version, setup seed, command history, final state and scores. Deterministic replay tests cover complete games.
- Optimised, self-hosted artwork from the supplied PDFs, replaceable through stable IDs and an art manifest. No runtime framework, external fonts, Steam links, or 3D engine.

See [prototype scope, controls, validation and limitations](docs/PROTOTYPE.md).

## Next milestones

1. Playtest this build on desktop and phones, review layouts/controls and provisional shapes, and fix usability issues.
2. Add the authoritative server, public/private lobby, protected seats, seven independent clients, reconnect/recovery, and the confirmed five-minute majority-removal policy.
3. Complete all 30 Techs and 30 Events, auctions and interactions; then add selectable simultaneous actions, recommended for four or more seated players.
4. Build owner administration, game/score audit, feedback management, optional GDPR-aware news sign-up/export, and the complete personal first-play tutorial.
5. Finish cross-browser/device, accessibility, performance, deployment, and recovery verification before public release.

The current local game stores the full state on the shared device. Server-owned secrets, access control, durable multi-game records, feedback and mailing data are later milestones. There are no room or sign-up forms in this build.

## Development

```sh
npm test       # rules, complete games, deterministic replay, assets, and DOM interactions
npm run check  # strict TypeScript
npm run build  # production bundle, artwork references and compressed-JavaScript budget
```

The tests include 72 complete seeded games across all supported player counts. DOM tests run in JSDOM; they do not replace visual browser/device testing. See [the validation record](docs/PROTOTYPE.md#validation).

Code: [engine](src/engine.ts), [UI](src/ui.ts), [state and commands](src/types.ts). Data: [layouts](src/layouts-data.json), [art/anchors](src/art-data.json), [card reference text](src/cards-data.json). Only the Family preset is playable; other card entries are reference data.

## Project documents

- [Designer review checklist and next steps](docs/REVIEW_CHECKLIST.md)
- [Project brief and delivery stages](docs/PROJECT_BRIEF.md)
- [Gameplay interface](docs/GAMEPLAY_UI.md) · [dropouts](docs/DROPOUTS.md) · [tutorial](docs/TUTORIAL.md)
- [Rules review and confirmed rulings](docs/RULES_REVIEW.md) · [rules data](catalog/rules-clarifications.json)
- [Assets and provenance](docs/ASSETS.md) · [component design](docs/COMPONENT_DESIGN.md) · [TTS review](docs/TTS_REVIEW.md)
- [Lobby](docs/LOBBY.md) · [platform release checks](docs/PLATFORM_REVIEW.md)
- [Decisions](docs/DECISIONS.md) · [outstanding reminders](docs/REMINDERS.md) · [change log](CHANGELOG.md)

## Data and ownership

Space Force is designed by Charlie Fish. No open-source licence has been selected; code licensing and artwork permissions are separate decisions. The original PDFs are registered by filename/checksum and retained outside this public repository. The cover is extracted from the matching rulebook illustration; the original inline PNG binary remains to be archived.

Private game records, feedback, newsletter addresses, consent evidence, credentials, and backups belong in protected backend storage, never this public Git repository.
