# Decisions and information needed

Updated planning baseline: 15 November 2026. Confirmed items record the designer's follow-up. “Proposed” still means a working recommendation for items the designer has not answered.

## Useful next

| ID | Item | Current position |
| --- | --- | --- |
| D01 | TTS save and assets | **Received and inspected:** ZIP containing TS_Save_1560.json and its preview. Deck/model images are external references; embedded Lua is table control. Workshop URL is optional; STL files remain outstanding. See [TTS_REVIEW.md](TTS_REVIEW.md). |
| D02 | First online play mode | **Confirmed:** normal turns first, then the selectable simultaneous-actions variant. Both support up to seven connected players. Recommend the variant at four or more seated players when available; host choice remains explicit. |
| D03 | Rules baseline and errata | Written rules/cards v1.80 plus the designer's corrections and seven-player extension. **R01–R08 are resolved.** Rapid Advance follows the almanac rather than its card. The original hex versions are now confirmed current. |
| D04 | Cover and player identity | **Confirmed:** use `SPACE FORCE.png` as the cover reference; give each colour its own rocket silhouette from rulebook p2; use poker-chip action tokens with matching silhouettes and distinct rim patterns. Await rocket STLs. |
| D05 | Boards and chip geometry | **Confirmed:** seven action boards, one per player; chips snap to system suns and board indentations, with matching chip/sun/cutout diameters. |
| D06 | System assets | **Confirmed:** original twelve hexes are current. Supplied Asimov replaces the blank centre only at six players; Adams is the central seventh home only at seven players. Both are excluded from random pools. |
| D07 | Maximum player count and supply | **Confirmed:** two to seven players; 40 rockets, four chips, and one action board per player. At seven: 280 rockets, 28 chips, seven boards, plus one shared two-sided aid. |
| D08 | Seventh-player visual identity | **Provisional design choice:** orange (`#E87522`), a twin-pod rocket silhouette, and a triangular chip-rim pattern. Keep these distinct and replaceable pending design/STL review. |
| D09 | Lobby | **Confirmed:** join private rooms, browse/join public waiting games, and create public games. Use [LOBBY.md](LOBBY.md) for the proposed ready/host/cleanup policies. |
| D10 | First-play teaching | **Required feature:** [TUTORIAL.md](TUTORIAL.md) incorporates the first-play teaching specification; issue #1 is superseded and closed at the designer's request. Implementation remains outstanding. |
| D11 | Platform practices | **Proposed baseline:** [PLATFORM_REVIEW.md](PLATFORM_REVIEW.md) adds public-room, recovery, security, accessibility, loading, and operational checks. |
| D12 | Gameplay controls | **Confirmed scope:** Board, Techs, Event, Actions, and Player Aid with Reserve/Credits; phone gestures and desktop shortcuts. [GAMEPLAY_UI.md](GAMEPLAY_UI.md) proposes exact controls. |
| D13 | Idle-player progression | **Confirmed:** five-minute idle threshold, majority approval by the other active players, skip removed players' remaining turns, and automatic win for a sole remaining player. |
| D14 | Dropout integration | **P01–P05 confirmed:** automatic stack-token cleanup, other components remain, critical decisions delegated on behalf of the removed player, agreed bid handling, and forfeit snapshots. P01 is also confirmed. |
| D15 | Undo | **Confirmed:** uncommitted moves only, with no hidden-information reveal. No post-commit or table-vote override. |
| D16 | Shared player aid | **Confirmed:** one shared aid, both faces visible together in the fifth Player Aid view. Actions replaces the old personal-board view label. |

The designer review hub is [REVIEW_CHECKLIST.md](REVIEW_CHECKLIST.md); the live handoff list is [REMINDERS.md](REMINDERS.md).

## Resolve while building the engine

The [rules review](RULES_REVIEW.md) records the confirmed answers to all eight original questions, with page references and the full five-Tech PRODUCE example. [rules-clarifications.json](../catalog/rules-clarifications.json) captures the same decisions for future engine work. Turn these rulings and the Prophecy/warp edge cases into meaningful scenarios as the engine is implemented; they are no longer outstanding questions.

Undo is now confirmed as pre-commit only and forbidden after a hidden-information reveal. P01–P05 are also settled. No further rules decisions are needed to start the normal-turn rules/UI prototype.

Player access now includes public waiting-game discovery and private invitations, with guest names, protected seat-resume credentials, and no compulsory account. Room hosts manage waiting-room seats/settings; rules, scoring, and secret views remain server-enforced. The public lobby is now in scope; ranked matchmaking, global chat, competitive ratings, bots, and solo rules remain future features. Proposed lobby defaults are a 120-second waiting-room host-transfer grace and a 30-minute empty-lobby expiry, both configurable and subject to playtesting.

## Needed before public deployment or collecting addresses

| Item | Why it is needed |
| --- | --- |
| Preferred domain and approximate monthly hosting budget | Choose a viable realtime host, database, asset storage, and operational setup. |
| Expected playtest/public audience and simultaneous room count | Set load targets and cost limits; seven players in one room does not define overall service capacity. |
| Owner/admin identity and preferred login method | Configure private administration with the real owner, without sharing a password in chat. |
| Controller/sender name, jurisdiction, and public contact address | Complete accurate privacy information and named newsletter consent. |
| Intended audience, including whether children are expected | Choose appropriate account/data practices and final privacy wording. |
| Retention preferences for game records, feedback, and unconfirmed subscriptions | Set real deletion/retention jobs and avoid retaining identifiable data indefinitely. |
| Existing mailing provider, if any | Integrate confirmation/unsubscribe handling; CSV export can be supported independently of campaigns. |
| Code licence and asset publication preferences | The GitHub repository is public; code and artwork permissions are distinct. |

These are launch inputs, not reasons to stop the rules engine or board prototype. Credentials belong in the chosen platform's secret settings, not in GitHub or this document.

## Defaults that can be revised through playtests

- Responsive HTML/SVG board with a detail panel on phones.
- Tap/click as the complete interaction model; optional dragging later.
- Short CSS/SVG animations with reduced-motion support.
- Named guest seats and invitation links for the first playtests.
- A readable in-game player aid generated from the approved rules text.
- Structured configuration records, an action log, and durable snapshots for each game.
- Active/confirmed newsletter subscribers exported by default, with suppression maintained separately.
- Current/previous major browsers as the initial compatibility target; older requirements to be named.

The seven-player limit, separate rocket silhouettes, chip face/rim identity, snapping geometry, seven action boards, exclusive Asimov/Adams centre rules, and normal-turn-first delivery order are confirmed requirements. Player seven's specific orange/twin-pod/triangular visual style is a provisional choice.

## Decision history

| Date | Decision/evidence |
| --- | --- |
| 2026-11-13 | User requires their `charlie-fish/space-force` GitHub repository and version control. |
| 2026-11-13 | At initial inspection, GitHub reported the repository was public and empty, with push permission available through the connected integration; the initial planning documents were subsequently committed. |
| 2026-11-13 | All four PDFs downloaded and reviewed; original checksums recorded. |
| 2026-11-13 | User's three extra Explore copies produce the complete 16-token supply. |
| 2026-11-13 | Written rulebook explicitly includes a simultaneous-actions variant, with two card exclusions. |
| 2026-11-13 | Video access was throttled; no claim is made to have watched or transcribed it. |
| 2026-11-13 | Designer confirmed normal turns first, then the selectable variant; specified colourblind-accessible rocket/chip design and the six individual action boards. |
| 2026-11-13 | Designer corrected the hidden tile pool, answered R01–R08, and clarified Prophecy on capacity-one planets and connectivity through warps. |
| 2026-11-13 | Designer supplied `SPACE FORCE.png` as a cover reference and requested reminders for TTS files, rocket STLs, and the latest-hex check; the blank centre hex is now an explicit additional asset. |
| 2026-11-13 | Designer subsequently increased the limit to seven, adding 40 rockets, four chips, and a board; extend the reusable aid to the seventh player as well. |
| 2026-11-13 | Designer confirmed the original hexes are current and supplied `13th hex.pdf`: Asimov only at the six-player centre, Adams only at the seven-player centre. This supersedes the earlier blank-hex task. |
| 2026-11-13 | Planning setup retains the existing twelve-tile outer layout at six/seven players, with Adams as the seventh home when used. Seven-player Events/rounds follow the existing four-plus-player rule. |
| 2026-11-15 | Designer supplied the TTS ZIP and requested a public/private lobby, a 4+ player simultaneous-mode recommendation, and a tutorial reminder. |
| 2026-11-15 | ZIP inspected: saved JSON and preview; six-player components and externally linked assets; table-control Lua only. Tutorial task created as issue #1. |
| 2026-11-15 | Added proposed public-room, mobile recovery, security, accessibility, performance, deployment, and operations acceptance checks. |
| 2026-11-15 | Designer requested intuitive Board/Techs/Event/Actions/Player Aid access and a dropout progression rule, then confirmed five minutes and majority approval by the other active players. |
| 2026-11-15 | Added the interface defaults, confirmed removal core, reviewable phase/forfeit proposals, and a linked designer review/next-step checklist. |
| 2026-11-15 | Designer confirmed P02–P05, clarified delegation on behalf of the removed player, restricted Undo to uncommitted/no-reveal moves, renamed Actions, and added a shared two-sided Player Aid view. |
| 2026-11-15 | Designer requested that the tutorial become part of the main spec and reminder issue #1 be closed. STL files remain outstanding. |
| 2026-11-15 | Designer confirmed P01. All known rule clarifications are settled and implementation can start with provisional art. |

No hosting provider, paid service, final privacy text, or application deployment has been selected in this planning stage.

## Before implementing asynchronous removal

Asynchronous online play is required alongside live and local play. Agree its response window, grace period, removal-vote deadline/electorate and reminder policy before implementing that mode. These do not inherit the confirmed live five-minute rule. See [ASYNCHRONOUS_PLAY.md](ASYNCHRONOUS_PLAY.md).

## Confirmed Tech interpretations and controls (17 November 2026)

The designer confirmed C01–C04: Gravity Drive carrier origins/routes and casualty ownership, Eminent Domain player order with ACTIONS-only Banking, Soylent fullness timing/excluded destroyed planets, and Sabotage's mandatory legal target with no reversal of earlier effects. R01–R08 remain settled. See [the confirmed table](PLAYTEST_CHANGES_0.16.md#confirmed-interpretations) and [structured rules](../catalog/rules-clarifications.json).

The designer also corrected Death Sun to three opposing Ships OR two Settlements per sacrifice, prohibiting mixed types within one sacrifice, and required Sabotage to pay at least the target's full printed value even with Research Lab. Nominal X still governs target eligibility under R07. Payment is the greater of that floor and the ordinary discounted X; deliberately higher payment remains available. Original card art is retained with updated semantic text and designer-override provenance.

Prototype 0.16 puts active-owner Foresight above Status Box resources and one-Credit Flexible Economy returns below them, replacing the Tech powers menu. Reserve-limited effects can use returned Credits to complete their unfinished part without repeating gains, reveals or nested action hooks. Foreign Explore gifts use the recipient's own resources while retaining the acting turn. Home double-click/double-tap and Filibuster top/bottom labels are implemented.

All thirty Tech effects remain implemented for local normal turns. Owners choose Mercenaries/Rapid Advance order. The nonstandard Foresight test is explicitly labelled; normal simpler Events exclude that card and apply R08 replacement. Historical completed 0.15 records preserve prior combat/payment outcomes; future commands use the corrected rules, and unfinished Reserve warnings upgrade to recovery continuations.
