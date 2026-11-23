# Space Force

A browser implementation of Charlie Fish's board game for **2–7 players**, on desktop or phone.

**v1.1.0: online normal turns.** Create private invitations or public waiting games, play live or asynchronously, and resume your protected seat on another device. Local pass-and-play remains available. All 30 Techs and 30 Events are implemented. The simultaneous secret-action variant and Apple/Android apps remain later milestones.

## Play and setup

Choose **Random Techs** (default) or Family, Aggressive, Cunning, Economic or Peaceful from the rulebook. Events are **Random Events** (default) or **No Events (simple version)**. The map-code field starts blank for local games; a supplied code makes their setup repeatable. Online setup uses a server-private random seed. Test scenarios are removed from new-game controls; existing saved test games still load.

Use the lobby to create a room, join a public waiting game, or enter a private invitation. Everyone reviews the settings and presses Ready; the host starts with the reviewed roster. The actual player count determines the board: Asimov is the six-player centre and Adams is the seven-player centre/home. Two/three players have ten Events and six normal rounds; four to seven have eight and five rounds. Ragnarök can shorten play.

Live games use the confirmed five-minute idle policy. Asynchronous rooms default to the designer-confirmed **48-hour response window plus 24-hour grace period**, configurable before starting. Eligible removal requires a strict majority of eligible other players; disconnection alone never forfeits a game. See [online play and recovery](docs/ONLINE_PLAY.md).

**Keep your private seat recovery key private.** An invitation joins an empty waiting seat; the recovery key controls your existing seat. Save that key before clearing browser data or changing device.

## Run online multiplayer

Install [Node.js 24 LTS](https://nodejs.org/), then:

```sh
git clone https://github.com/charlie-fish/space-force.git
cd space-force
git switch prototype/normal-turns
npm ci
npm run build
npm start
```

Open **http://localhost:3000**. Other devices on the same network can open the computer's network IP on port 3000. For Internet play, set `PUBLIC_ORIGIN` to the external HTTPS origin and run behind an HTTPS reverse proxy or use the D1-backed hosted Worker described in [the deployment guide](docs/ONLINE_PLAY.md#hosting-and-storage). Each device must use the same server address.

The Node service persists games in `private-data/space-force.sqlite`. Set `SPACE_FORCE_DB` and `PORT` to override the database path and port. Keep this directory outside any static hosting root and back it up. The production service is one Node process or the hosted D1 Worker; it is not an in-memory demo.

For development, run `npm run dev:online` in one terminal and `npm run dev` in another. Vite proxies `/api` to the service on port 3000. Use Vite's Network address on a phone. [Phone testing instructions](docs/PHONE_TESTING.md) explain why opening HTML from iPhone Files is insufficient.

## Local pass-and-play and downloads

Select Local pass-and-play in the lobby, or run `npm run dev` without the server. Static hosting and the portable ZIP offer local games only; putting a static ZIP online does not create a multiplayer service.

`npm run package` creates `dist/` for static hosting and `work/portable/` for desktop file opening. Keep `art/` alongside `index.html`. On iPhone, use a web address in Safari. Versioned local/static ZIPs and checksums are archived by the [release workflow](.github/workflows/release.yml); [v1.0.0](https://github.com/charlie-fish/space-force/releases/tag/v1.0.0) remains an immutable local reference.

## Controls and privacy

Board, Techs, Event, Actions and Supply, and Player aid remain available through final scoring. Use B/T/E/A/P on desktop, S for the Status Box, touch pan/pinch/swipe on phones, and labelled button alternatives. Change draft selections before Commit; committed moves and hidden reveals cannot be undone. The contextual guide can be dismissed and replayed.

Online commands are validated by the server against the current decision and protected seat. A retry uses the same command ID, so lost responses cannot spend resources twice. Unrevealed systems, Explore effects, Event decks, seed/RNG and other players' unrevealed bids stay server-side. Foresight is returned only to its authorised current owner. Public listings contain waiting-room metadata, not game secrets or credentials.

## Verify and build

```sh
npm test          # rules, replay, legacy saves, HTTP service and DOM interactions
npm run check     # strict TypeScript
npm run package   # static and portable builds; artwork/load-budget checks
npm run build:worker  # self-contained Worker and committed D1 migrations
node --test tests/worker.integration.mjs  # deployed-bundle/D1 adapter smoke test
```

DOM/HTTP tests exercise independent sessions and complete games; they do not replace real Safari/Chrome/mobile visual and gesture testing. See [implemented scope and validation](docs/PROTOTYPE.md), [v1.1 playtest guide](docs/PLAYTEST_CHANGES_1.1.md), and [next phase](docs/NEXT_PHASE.md).

## Project references

[Project brief](docs/PROJECT_BRIEF.md) · [Rules and designer rulings](docs/RULES_REVIEW.md) · [Dropouts](docs/DROPOUTS.md) · [Asynchronous play](docs/ASYNCHRONOUS_PLAY.md) · [Review checklist](docs/REVIEW_CHECKLIST.md) · [Reminders](docs/REMINDERS.md) · [Change log](CHANGELOG.md)

The owner admin area, feedback management, publication-news consent/export, full personal tutorial, simultaneous-action variant and native apps remain specified future work. Online game settings, accepted commands, timestamps, end reason and score records are already persisted for the later admin interface.

Core code: [rules](src/engine.ts), [interface](src/ui.ts), [lobby](src/lobby.ts), [online service](src/online/service.ts), [transport](src/online/client.ts), [Node server](server/node.mjs), [Worker](src/worker.ts). Artwork, card data, player identities and layout anchors remain separate from the service and rules to support future art and expansions.
