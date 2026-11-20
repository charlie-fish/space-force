# Space Force

A browser implementation of Charlie Fish's board game, for desktop and mobile.

**Current implementation: prototype 0.21.0, 20 November 2026.** A complete local pass-and-play game for **2–7 players sharing one device**, with normal turns, **all 30 Techs, all 30 Events and sealed bidding**. Three selectable Event scenarios each contain ten different cards. Simpler Events remain available. Remote multiplayer is the next implementation milestone.

## Run the prototype

For a desktop playtest without installing Node, open a successful [Prototype checks run](https://github.com/charlie-fish/space-force/actions/workflows/prototype.yml), download **space-force-local-prototype**, extract the entire ZIP, and try opening `index.html`. Keep its `art/` folder alongside it. If your browser restricts local files, use the HTTP instructions below. The portable copy has build checks; visual browser/device verification is still pending. **On iPhone, open a web address in Safari instead of opening index.html in Files:** see [phone testing instructions](docs/PHONE_TESTING.md).


Install [Node.js 24 LTS](https://nodejs.org/), then run:

```sh
git clone https://github.com/charlie-fish/space-force.git
cd space-force
git switch prototype/normal-turns
npm ci
npm run dev
```

Open **http://localhost:5173**. Choose players, names, a Tech display, and **Full Events & sealed bidding**. Select **Batch 1 · Economy & rules**, **Batch 2 · Actions & conflict**, or **Batch 3 · Board & planning**; each uses ten fixed Events at every player count. Batch 1 and Last ten Techs are the defaults. Standard random decks and simpler Events are also available. Foresight is legal normally with full Events. For the five-Tech PRODUCE example, enable **R01 chain test**: everyone starts with those Techs using five Reserve markers each.

Select homes by button or double-click/double-tap. Events start in the first Economy: enter private bids using the covered handoff screens, then the winner chooses a card. Replay the same settings and map code, choosing the discarded alternatives, to test all ten cards in a batch. See the [0.21 Event feedback guide](docs/PLAYTEST_CHANGES_0.21.md) and [complete batch lists](docs/PLAYTEST_CHANGES_0.20.md). On a phone on the same network, open Vite's Network URL in Safari/Chrome; see [phone instructions](docs/PHONE_TESTING.md).

For a production static build, run `npm run build`; serve the generated `dist/` directory over HTTP(S). `npm run preview` serves that build locally on port 4173. `npm run package` also creates the portable playtest copy in `work/portable/`. The build supports hosting under a subpath. GitHub Actions runs the tests/build and provides a downloadable `space-force-static-prototype` artifact; it does not publish a live site.

## Included now

- Correct layouts, home/hidden pools, and 40 rockets/four chips per player. Six-player games use Asimov; seven-player games use Adams as the central seventh home.
- Ordered chip stacks, all four actions, Investments, limited supplies, Economy, all thirty Tech effects, nested free-action chains, final scoring and tie-breaks.
- All Techs: the final additions are Death Sun, Gravity Drive, Soylent Green, Mercenaries, Filibuster, Insurance, Eminent Domain, Sabotage, Flexible Economy and Foresight. Includes carried-Ship/casualty choices, separate Death Sun target groups, replacement Settlements, Insurance while own tokens remain, home-system reward placement, endgame chains and Sabotage without a Research lab discount. Mercenaries always resolves before Rapid Advance. The optional R01 starting-Tech scenario remains available.
- Board, Techs, Event, Actions and Supply, and Player aid views, including after scoring. Both shared-aid faces appear together. Reserve and Credits stay visible; the player summary shows everyone's public supplies and current scores in order from the current first player, plus invested-slot counts. It starts collapsed at each required decision.
- Hex artwork is drawn below every placed component, fixing the five-player Clarke/asteroid overlap. System names remain on top. Click/tap the explored system for a clockwise orientation preview before Commit; buttons remain available.
- Seven designer-approved rocket silhouettes and matching poker-chip rim motifs, with chips anchored to the printed suns.
- A top Status Box with highlighted turn details, a clear prompt, selected system/stack order, before/after/chained Tech previews before commitment, and a “Since your last turn” history toggle. Completion/resume scrolls to the results once; later view navigation stays available.
- Inline Foresight with its heading above its button, above the active owner’s Reserve/Credits and one-Credit Flexible Economy returns below. Reserve warnings offer Go back and a reminder to return Credits in the Status Box; unfinished effects preserve previous gains/hooks. Only the active player gets Reserve interruptions; rival gifts use available Reserve and fail automatically when it is empty. C01–C04 are confirmed.
- Selected-only chip previews with button or double-click/double-tap confirmation, compact owner-coloured stacks, clear legal-chip rings, doubled Settlement rockets and circular black-hole artwork, plus the supplied asteroid-belt and warp tokens.
- Linked vertical production quantities, target-first attacks, editable Settlement allocations, 60-degree orientation previews before exploration movement choices, and compact selected-first Tech choices with current-state system previews.
- Map pan/pinch/zoom, grouped pan/zoom/Reset View controls, shortcuts that scroll to their destination (S for Status Box; B/T/E/A/P for views), a 10pt live-text minimum, reduced motion and a skippable contextual guide. Shortcut hints are hidden on phones.
- Event summaries mark completed one-off effects and name ongoing selectors. Vorsprung supports sorted selection/commit and double-click claims; Sabotage defaults to the highest affordable target. El Mayarah, Economic Boom, Alliance, Black Cloud and Disruptor show relevant reminders; Turtling defaults to available home Ships.
- Visible Economy stages, sealed bidding/Event selection, Investments/reinforcements on the Board and automatic first-player handover.
- Explore outcome acknowledgements, locked-commitment Settlement redistribution, Reserve-shortfall pop-ups and confirmations for empty actions, inbound black-hole losses, excess sacrifices, unused reinforcements or ineffective Tech purchases.
- Editable action and Settlement drafts, without a redundant Undo button. Committed actions and hidden reveals stay locked. Autosave/resume works through pending reveals and choices, with a session fallback when storage is blocked.
- Exportable local game records with version, setup seed, command history, final state and scores. Deterministic replay tests cover complete games.
- Optimised, self-hosted artwork from the supplied PDFs, replaceable through stable IDs and an art manifest. No runtime framework, external fonts, Steam links, or 3D engine.

See [the 0.21 Event guidance and Tech choices](docs/PLAYTEST_CHANGES_0.21.md), [the 0.20 Events playtest guide](docs/PLAYTEST_CHANGES_0.20.md) and [the previous 0.19 changes](docs/PLAYTEST_CHANGES_0.19.md) and [prototype scope, controls, validation and limitations](docs/PROTOTYPE.md). The [0.18](docs/PLAYTEST_CHANGES_0.18.md), [0.17](docs/PLAYTEST_CHANGES_0.17.md), [0.16](docs/PLAYTEST_CHANGES_0.16.md), [0.15](docs/PLAYTEST_CHANGES_0.15.md), [0.14](docs/PLAYTEST_CHANGES_0.14.md), [0.13](docs/PLAYTEST_CHANGES_0.13.md), [0.12](docs/PLAYTEST_CHANGES_0.12.md), [0.11](docs/PLAYTEST_CHANGES_0.11.md), [0.10](docs/PLAYTEST_CHANGES_0.10.md) and [0.9](docs/PLAYTEST_CHANGES_0.9.md) checklists record previous iterations.

## Next milestones

The designer approved the current rockets and reported that all 30 Techs work as intended. The STL handoff is closed. Version 0.21 adds Event completion/selector reminders, Vorsprung selection and commit, affordable Sabotage defaults and confirmed Earth First precedence; combined interactions and real-device verification remain playtest priorities.

1. Playtest the three implemented Event batches, bidding, Tech/Event combinations, duration/expiry, forced choices and end timing. Record feedback against the seed and exported game record.
2. Test real phones through an HTTP(S) preview alongside that work; see [phone instructions](docs/PHONE_TESTING.md). A narrow desktop window does not replace Safari/Chrome testing on a phone.
3. Add the authoritative server, public/private lobby, protected seats, seven independent clients, private state/bids, durable game/audit records, reconnect/recovery and confirmed five-minute majority removal.
4. Add selectable simultaneous actions, recommended for four or more players, and the specified [asynchronous option](docs/ASYNCHRONOUS_PLAY.md) with its own agreed response/removal policy. Retain normal turns and local play.
5. Build owner administration, game/score history, feedback management and optional GDPR-aware news sign-up/export. Complete the personal tutorial and cross-browser/device, accessibility, performance, deployment and backup verification before public launch.

Review status, remaining inputs and acceptance checks: [designer checklist](docs/REVIEW_CHECKLIST.md) and [reminders](docs/REMINDERS.md).

The current local game stores the full state on the shared device. Server-owned secrets, access control, durable multi-game records, feedback and mailing data are later milestones. There are no room or sign-up forms in this build.

## Development

```sh
npm test       # rules, complete games, deterministic replay, assets, and DOM interactions
npm run check  # strict TypeScript
npm run build  # production bundle, artwork references and compressed-JavaScript budget
```

The 305 automated checks cover all 30 Events and Techs, auctions, pending-choice recovery, and 180 complete seeded games across all supported player counts. DOM tests run in JSDOM; they do not replace visual browser/device testing. See [the validation record](docs/PROTOTYPE.md#validation).

Code: [engine](src/engine.ts), [UI](src/ui.ts), [state and commands](src/types.ts). Data: [layouts](src/layouts-data.json), [art/anchors](src/art-data.json), [card reference text](src/cards-data.json). All thirty Tech effects are implemented, with printed/random/playtest displays and legal exclusions. All Event effects and bidding are implemented locally; [Event rules and test pools](src/events.ts) remain separate from artwork.

## Project documents

- [Designer review checklist and next steps](docs/REVIEW_CHECKLIST.md)
- [Project brief and delivery stages](docs/PROJECT_BRIEF.md)
- [Gameplay interface](docs/GAMEPLAY_UI.md) · [dropouts](docs/DROPOUTS.md) · [asynchronous play](docs/ASYNCHRONOUS_PLAY.md) · [tutorial](docs/TUTORIAL.md)
- [Rules review and confirmed rulings](docs/RULES_REVIEW.md) · [rules data](catalog/rules-clarifications.json)
- [Assets and provenance](docs/ASSETS.md) · [component design](docs/COMPONENT_DESIGN.md) · [TTS review](docs/TTS_REVIEW.md)
- [Lobby](docs/LOBBY.md) · [platform release checks](docs/PLATFORM_REVIEW.md)
- [Decisions](docs/DECISIONS.md) · [outstanding reminders](docs/REMINDERS.md) · [change log](CHANGELOG.md)

## Data and ownership

Space Force is designed by Charlie Fish. No open-source licence has been selected; code licensing and artwork permissions are separate decisions. The original PDFs are registered by filename/checksum and retained outside this public repository. The cover is extracted from the matching rulebook illustration; the original inline PNG binary remains to be archived.

Private game records, feedback, newsletter addresses, consent evidence, credentials, and backups belong in protected backend storage, never this public Git repository.
