# Local playable prototype 0.10.0

16 November 2026. This document describes the implemented build; the project brief retains the full product requirements.

Detailed implementation changes: [second playtest feedback](PLAYTEST_CHANGES_0.10.md); [previous iteration](PLAYTEST_CHANGES_0.9.md).

## Playable scope

Two to seven people share one browser/device. Normal turns, the rulebook's Family Tech preset, and its simpler Events variant form a complete game. There is no mode selector offering unsupported cards or simultaneous turns. The first seat starts; seat order is entered at setup. A map code seeds home selection, hidden systems, Explore tokens, and the Event deck reproducibly.

Each player chooses a home, receiving three Settlements and three Ships. PLAN places four chips each in order, with a changeable preview followed by “Place chip here”. ACTIONS skips players with no available top chip; each player resolves their four chips into unused action slots, acting or Investing. Economy cashes Investments on the Board, draws a pair of round-tracker Events with an explicit review/continue step, permits one Tech purchase each, reinforces on the Board, and automatically passes the first-player token before the next round. Two/three-player games last six rounds; four to seven last five. The Economy after the last pair has been consumed still permits Tech purchases, then scores without reinforcement.

All ten Family Techs work: Agility, Artificial Warp, Assembly Line, Banking, Disruptor, Genesis, Kessler Syndrome, Patents, Planet Killer, and Planet Nine. Optional acquisition placements can be declined; Genesis and Disruptor resolve their required legal choices. The five-player setup consumes the spare asteroid token. Explore-token black holes have a separate supply from Planet Killer's feature token. An area enclosed by asteroid belts is legal if warps still connect it.

The other base Techs requiring action hooks, auctions, Event effects, and expansion rules are outside this preset. All 60 supplied card faces and reference texts are prepared, but only Family Techs can be purchased. Full card coverage is a separate milestone.

## Controls and game records

- Use Board, Techs, Event, Actions and Supply, and Player aid, including after scoring. Both aid faces appear together. The top Status Box highlights the current player and turn, followed by the next-step prompt in black. “Players & supply” exposes everyone's public resources and current scores. System status contains numbered chip order; “Since your last turn” lists actions/outcomes since the active player's preceding required decision, including consecutive decisions by that player.
- Select a system, then an available action slot. Adjust the draft, choose Invest immediately above Commit if wanted, and Commit. Attacks allow choosing targets first, increasing the sacrifice to their cost within the available Ships. Production shows linked Ships and Credits vertically and explains Reserve limits. Empty/impossible actions default to Invest but may still be chosen deliberately.
- SETTLE previews an editable allocation across planets; commitment resolves the allocation, pausing for Explore outcomes and choices. If an opponent's Explore reward displaces an allocated Settlement, only the displaced amount may be reassigned to another eligible planet or kept as Ships. Earlier and queued commitments remain fixed. Non-choice Explore results require Ok. A revealed MOVE INTO is oriented before Ship quantities are chosen; at least one Ship must enter by a legal original route.
- Investments and reinforcement drafts can be allocated through board clicks or quantity controls. Investment edits rebalance other allocations automatically; reinforcements cannot exceed availability. Confirmations guard unused reinforcements, excess attack sacrifices and ineffective Tech purchases. Reserve shortfalls pause the affected player's decision and explain the completed outcome before Ok continues.
- Drag the map background or pan with buttons. Touch supports one-finger pan and two-finger pinch around the gesture focus. Use the grouped zoom/Reset View controls as alternatives. Swipe left/right over the view navigation to move between views; gestures on the board never switch views.
- B/T/E/A/P open the five views and scroll their panel to the top; S scrolls to the Status Box at the top of the document. Desktop headings show their key in brackets; phones omit these hints. With map focus, arrows pan, +/− zoom, and R resets the view. Escape closes Help/card details. ? opens Help. Character shortcuts can be disabled; editable fields and browser modifiers are respected. Tabs also support arrow/Home/End navigation.
- Live interface text has a 10pt minimum, including board labels at reduced zoom. Printed card/aid artwork retains its source lettering and has readable semantic reference text. All chips remain visible in compact owner-coloured stacks, with thin opaque legal-chip rings behind them; Settlement rockets are twice their previous size.
- The phase guide appears by default, can be hidden, and can be replayed from Help. This is the initial contextual teaching layer; per-seat progress and teaching of later multiplayer features remain outstanding under [TUTORIAL.md](TUTORIAL.md).
- Accepted commands autosave on this device, including pending Explore, acknowledgements, redistribution, orientation, movement and acquisition choices. Blocked storage leaves a usable session with a visible status. Version 0.8/0.9 records are upgraded by replay, handling new pauses and automatic handover while preserving their outcomes. An incompatible/corrupt save reports failure and permits a new game.
- “Game record” downloads JSON containing application version, timestamp, seed, players, ordered commands, current state, round/event configuration, completion status through `phase`, and final scores/winners when finished. The command history can reproduce the final state with the same engine/content version. Exporting does not create a private backend record.

## Architecture and assets

The TypeScript engine accepts an actor, command and expected revision, clones state, validates the choice, resolves it, records the command, and checks supply invariants. Rejected commands leave the original unchanged. The UI keeps draft choices outside accepted game state. This provides a testable foundation for later server authority; a local revision check is not remote authentication.

State is plain versioned JSON. Stable system/card IDs link rules to [layout data](../src/layouts-data.json), [card text](../src/cards-data.json), and the [art manifest](../src/art-data.json). Artwork can be replaced without changing engine IDs. Board positions use axial coordinates with pointy-top geometry; planets, 142 printed settlement indicators and chip snap positions use normalised source-image/vector anchors and rotate with their system. Fleet badges and Planet Nine use a search for empty space to minimise overlap.

The 83 WebP assets total approximately 1.49 MB: 14 system fronts, 60 card faces, two aid faces, three backs, one cover, the first-player token, the Planet Nine token and the circular black-hole Explore image. Printed elongated holes are omitted from the Clarke/Lem/Adams export layers; all hole types use the same circular image at their semantic positions. Detailed card/aid images load on demand. The cover comes from the matching embedded rulebook illustration; no claim is made that the separately supplied PNG binary has been archived. Seven silhouettes remain provisional pending STLs, with distinct dot, stripe, bar, chevron, checker, wave and triangle chip rims.

To regenerate the PDF-derived assets, install PyMuPDF and Pillow outside the application dependency set and run:

```sh
python scripts/prepare-assets.py --source-dir /path/to/supplied/pdfs
```

The script reads the source catalogue and validates extracted planet capacities/features. It never runs TTS Lua or depends on live Steam URLs. Le Guin has four planets of capacity 2/2/1/1 and no default black hole; Lem has both left and right printed asteroid belts. These correct earlier catalogue transcriptions; the designer's supplied source versions remain current. The removed “◉ +1” label represented an additional black hole, now drawn directly.

## Validation

`npm test` passes 84 tests covering source/setup counts and all player layouts, action stacks and slots, revisions, hidden reveal checkpoints, movement/asteroids/warps/black holes, Explore gifts and supply limits, production, attack insurance, Investments, reinforcement, all ten Family Techs, end timing, scoring and ties. Seventy-two seeded full games (12 for each player count) check the forty-rocket invariant after every accepted command. A complete seven-player record is replayed to the identical final state. Asset checks verify all 83 files, printed settlement anchors and feature geometry. Genuine 0.8/0.9 saves migrate by replay, including pending reveals and matching completed scores/winners. JSDOM tests exercise setup, draft/confirm PLAN, target-first combat, allocation balancing/limits, acknowledgements, locked Settlement redistribution, decision history, shortcuts/scrolling, selected-first choosers, minimum text, gestures, storage failures, escaping and all five final-state views.

`npm run build` performs strict TypeScript compilation, builds the static application, verifies every artwork reference, checks relative asset paths, and enforces the 200 KB compressed JavaScript budget. The initial build is around 47 KB compressed JavaScript plus 9 KB CSS and a 53 KB cover, around 110 KB combined before HTTP headers. This is a build-size measurement, not a measured page-load or interaction-time result. GitHub Actions repeats the checks and uploads the static build plus a portable desktop playtest copy. The portable copy inlines the bundled module/CSS and keeps the art folder alongside `index.html`; local-file behaviour still needs browser verification.

Visual browser automation was unavailable in the implementation environment. No live deployment, Safari/Chrome/Firefox/Edge visual pass, phone hardware pass, Core Web Vitals result, or accessibility audit is claimed. The immediate review is a complete desktop game and a phone game, including pinch/pan/swipe separation, small-screen layout, colour/shape/rim readability, keyboard and browser zoom, and pending-choice refresh.

## Remaining product work

The prototype is trusted-device pass-and-play: the browser contains the full hidden state, anyone sharing it controls the current seat, and optional local storage is its only persistence. It has no accounts, networking, room list, chat, user-email collection, private owner area, or remote security boundary.

Next add authoritative rooms/seats, public/private lobby, independent clients, projected hidden information, command deduplication/recovery and the confirmed dropout policy. Then complete base cards/auctions and simultaneous actions, with the four-plus-player recommendation. Owner administration, durable game/result history, feedback, consented mailing/export, per-player tutorial, final assets and production verification remain tracked in [REMINDERS.md](REMINDERS.md).
