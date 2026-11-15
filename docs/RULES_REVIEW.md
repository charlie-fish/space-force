# Rules review for implementation

Reviewed against `Space Force rules v1.80.pdf` and `SpaceForce Cards v1.80.pdf`, with the player aid and cardboard artwork as supporting references. Page numbers below refer to the PDF, counted from one.

Updated with the designer's clarifications on 13 November 2026. R01–R08 below are resolved. Where specified, these rulings take precedence over conflicting printed wording.

Current scope also includes the designer's seven-player extension and `13th hex.pdf`. The printed rulebook describes up to six players; the extension below is the designer's project instruction, not a claim about the printed edition.

This is an implementation outline and question register, not a replacement rulebook. The attached documents are game reference material. The user's explicit instructions about software scope, ignored pages, and additional component copies take precedence as project instructions.

## Components and state

The current supply is **40 rockets, four poker-chip action tokens, and one action board per player, up to seven players**: 280 rockets, 28 action chips, and seven boards, plus **one shared two-sided player aid** visible to all players. The shared supply remains 30 Tech cards, 30 Event cards, 16 Explore tokens, four additional feature tokens, and one first-player marker. The system catalogue contains fourteen designs: the original twelve, confirmed current by the designer, plus Asimov and Adams from `13th hex.pdf`. Use only the count-appropriate centre tile, so six/seven-player boards contain thirteen hexes. See [game-configuration.json](../catalog/game-configuration.json).

A rocket has a role determined by its location: Reserve, Credit, Ship in space, Settlement on a planet, invested rocket, or Tech ownership marker. Model these explicitly and preserve the physical supply limit. Destroyed Ships/Settlements normally become Credits; do not put them back in Reserve. Specific effects such as Famine and Sabotage explicitly use Reserve instead.

Planets hold settlements from multiple players. Ships occupy systems. An action-token stack is ordered, and only its top token is normally available. Each player board has four distinct slots: MOVE INTO, SETTLE, PRODUCE, ATTACK.

Preserve the six distinct rocket silhouettes shown on rulebook p2 and add a seventh distinct shape in a new colour. The provisional seventh-player style is orange with a twin-pod rocket silhouette and a triangular chip-rim pattern. Action tokens are poker chips carrying the player's colour and rocket silhouette, plus a different visible rim/side pattern for each player. Chips snap to the sun at each system's centre, including Asimov and Adams. Each chip is the same diameter as the sun and fits a semicircular receiving indentation on its owner's action board. Keep stack order and rim patterns visible. See [component design](COMPONENT_DESIGN.md).

## Setup: rulebook pp4–5 plus the seven-player extension

| Players | Systems in play | Centre tile | Initially face-up homes | Hidden non-home tiles | Event cards | Baseline rounds |
| ---: | ---: | --- | ---: | ---: | ---: | ---: |
| 2 | 4 | — | 2 | 2 | 10 | 6 |
| 3 | 6 | — | 3 | 3 | 10 | 6 |
| 4 | 8 | — | 4 | 4 | 8 | 5 |
| 5 | 10 | — | 5 | 5 | 8 | 5 |
| 6 | 13 | Asimov | 6 | 6 | 8 | 5 |
| 7 | 13 | Adams | 7 | 6 | 8 | 5 |

Use the actual diagrams rather than a generic hexagon of an arbitrary radius. The five-player layout uses the additional asteroid-belt token. For six/seven players, retain the original twelve-tile outer layout and put the appropriate special hex at the centre, face-up:

- **Six players: Asimov only.** It has a sun and no printed planets, black holes, warps, or belts. It replaces the former empty/blank centre and holds Ships and action-token stacks normally.
- **Seven players: Adams only.** It has a capacity-six home planet, four capacity-two planets, and one black hole. It supplies the seventh home system; all seven revealed homes participate in normal player-order home selection.

Asimov and Adams are excluded from all random home/hidden pools. Neither is used in games with two to five players. They are never used together. Adams' face-up setup does not place Explore tokens on its capacity-two planets; Explore tokens are placed on newly revealed systems by MOVE INTO, or by an applicable effect such as Prophecy. The initial three Ships at an Adams home are placed by setup, so its black hole does not destroy one then; later MOVE INTO actions apply its normal loss.

For two to six players, select the required home tiles randomly from the six original home designs and reveal them. At seven players, use all six original homes plus Adams. Choose the face-down tiles only from the six original non-home designs: **unused home designs are excluded from the hidden pool**. Return unused original home designs and unused special centre tiles to the box. Players choose a home in order and begin with three Settlements on its capacity-six home planet and three Ships in that system. Their other 34 rockets remain in Reserve.

Display ten Techs for the game, either selected randomly or using a named preset. Keep the remainder available server-side for Technological Singularity. Prepare the shuffled Event draw pile and Explore supply. Record setup choices and randomness privately for reproducibility.

The physical rule for choosing the first player can be represented by a lobby choice, with random selection as a proposed convenience. Record the resulting seat order. Home orientations and exact tile/planet anchors still need to be encoded and checked against the diagrams/TTS.

## Round flow: rulebook pp6–13

**PLAN.** Clear last round's action-board tokens. In player order, place one action token on a system's stack, on top of existing tokens; continue until all have been placed. No passing unless an effect permits it. Face-down systems and the count-appropriate centre system are valid locations. Strategic Stall, Disruptor, Earth First, Politics, Filibuster, and Scrambler require explicit timing hooks.

**ACTIONS.** In order, resolve one eligible top token. Skip a player with no available top token; otherwise they cannot pass. Remove that token, choose an unused action-board slot, and perform that action in the token's system or Invest the action with a rocket from Reserve. Each slot can normally be used once per round. The resolution sequence must account for Insurance and for Cyber Attack's use of other players' tokens.

**MOVE INTO.** Bring any chosen own Ships from one or more adjacent systems into the active system. Adjacency normally means a shared edge; warp systems are mutually adjacent. Asteroid barriers block movement unless an effect overrides them. Reveal and orient a newly entered tile, keeping the entry legal and avoiding a disconnected board; put one hidden Explore token on each capacity-two planet there. **Asteroid belts may cut off edge connections if warp connections still keep the board connected.** Include warp links in the connectivity check for tile orientation and belt placement. For each black hole in the destination, destroy one incoming Ship, returned as its owner's Credit. That loss occurs as part of MOVE INTO, not automatically whenever a Ship is added by a different effect (p9).

**SETTLE.** Convert chosen Ships in the active system into Settlements within planet capacity. **Arcologies allows its owner to place a Settlement in one extra space above printed capacity; this is a single extra space per planet, shared across all Arcologies owners, not an extra space per owner.** A planet is full for PRODUCE and Soylent Green at either its printed capacity or one Settlement above it. Take and resolve a planet's Explore token before settling it. Token rewards come from the relevant player's Reserve. A revealed Explore black hole remains in the system. Settlements cannot normally move, and players cannot normally destroy their own Settlements (pp9–10).

Prophecy can place an “add an opponent Settlement” Explore token on a capacity-one planet. When a player later attempts to settle it, they choose an opponent for the token's Settlement first. If that reward can be placed, it fills the planet, leaving no normal space for the acting player. They can settle it themselves only if Arcologies or Soylent Green applies; Soylent Green still requires all planets in the active system to be full. The Explore recipient is an opponent, not the acting player.

**PRODUCE.** Each planet containing the acting player's Settlement produces one Ship or Credit; a fully settled planet produces an additional one. Fullness counts everyone's Settlements. The player allocates the results between Credits and Ships, subject to Reserve supply; Ships go in the active system (pp10–11).

An otherwise empty action may be chosen to activate its before/after Tech effects. It is still an action rather than an Investment, even if its main effect changes no pieces (designer ruling R04).

**ATTACK.** Remove chosen own Ships in the active system. Each removed Ship can remove up to two opposing Ships or one opposing Settlement. Different sacrificed Ships can be used for different target types. Removed pieces become their owners' Credits. A player cannot attack a planet's opposing Settlements while that player also has a Settlement on that planet. Patrol and other combat effects can add further restrictions (p11).

**ECONOMY.** Resolve Investments, Event, Tech, Reinforce, then pass the marker:

1. Convert invested rockets into Credits or Ships placed at home or in systems where the player has a Settlement.
2. Discard the previous Event and reveal two new Events, if available. Players submit secret Credit bids; reveal them together. Only the winner pays, ties follow current player order, and the winner chooses the Event. A bid may be zero. Credit balances are public; pending bids are private.
3. In player order, optionally buy one displayed Tech, pay its cost to Reserve, and use a Reserve rocket to mark ownership. Multiple players can own the same Tech; a player cannot rebuy one they own. Tech effects may modify this.
4. Add up to three Ships from Reserve at home or in systems with own Settlements; Assembly Line changes this to four.
5. Pass first player clockwise.

A selected Event's “during this round” effect begins immediately when the auction winner selects it. It remains in force through the rest of that Economy phase, the next PLAN/ACTIONS phases, and the next Economy's Investments, ending exactly when that subsequent Event step says “Discard the previous Event”. Clear previous-round action tokens without erasing still-active Event restrictions; for example, Politics must reserve its chosen action slot for the affected round.

There are no automatic replenishments of the displayed Tech market after ordinary purchases: it is shared ownership rather than removing the card. Extra Techs enter through the appropriate Event.

## End of game: rulebook pp6,12,14

The designer confirmed that playing the last pair of Events does not immediately end the game: there is a further action round, and then an Event step with nothing left to draw. Finish after Tech in that final Economy phase, without Reinforce or passing first player. Ragnarök can shorten the game; consuming the last pair during its extra Event step follows the same later no-cards-to-draw boundary. Normal games therefore last six rounds for 2–3 players and five rounds for 4–7 players unless an effect shortens them.

Resolve Eminent Domain and other applicable endgame effects, then score:

- One point per planet with at least one own Settlement.
- One point per system with at least one own Ship.
- One point per owned Tech.

Ties use the greatest number of Credits; any remaining tie is a shared win. Record the components of the score, not only the total. Distinct-planet and distinct-system counting matters; neither is a count of pieces.

## Online idle-removal adaptation

The designer requested a way to continue without a player who does not return, and confirmed **five minutes** and **a majority of the other active players**. After approved removal, skip that participant's remaining turns; if exactly one non-removed participant remains, that participant automatically wins. The initial board, mode, and round setup stay fixed. [DROPOUTS.md](DROPOUTS.md) records confirmed P02–P05: automatically remove action tokens from board stacks, keep other components, delegate game-critical decisions to the next player on the removed player's behalf, preserve/cancel bids at the agreed reveal boundary, and label forfeit scores. Only P01 inactivity/electorate details remain for review. This is an online adaptation alongside the printed rules, separate from the settled R01–R08.

## Variants and presets

**Simpler Events, p12:** use Event cards only as a round tracker, ignore their effects, skip the auction, and exclude Foresight from the Tech pool. Treat this as an explicit game setting.

**Delivery order agreed:** implement normal turns first, then add this variant as a selectable game setting. Up to seven players can be connected in either mode. **Recommend simultaneous play for four or more seated players once the variant is available.** The host may choose normal turns; this recommendation changes no rules or card exclusions. See [LOBBY.md](LOBBY.md).

**Simultaneous actions, p14:** remove Cyber Attack from Events and Gravity Drive from Techs. PLAN and ECONOMY remain unchanged. During ACTIONS, every eligible player selects a top token, then assigns it secretly to an unused action slot. **Only token/slot choices are secret.** Reveal together, then players carry out their actions simultaneously; action parameters are not separately committed in secret. Any player can declare a dependency, which switches resolution to the disambiguation order **for all participating players**: MOVE INTO before SETTLE before PRODUCE before ATTACK, with player order where needed.

Online implementation needs separate selection, assignment, reveal, and resolution states. Do not expose a player's secret slot assignment while another can still change theirs. The server must resolve dependencies consistently; simply allowing seven browsers to submit ordinary turns at the same time would not implement this variant.

**Presets, p24:** Aggressive, Cunning, Economic, Family, and Peaceful each contain ten Techs. They are indexed in [tech-presets.json](../catalog/tech-presets.json). Replace each preset card excluded by the chosen variant with a random legal Tech of printed value **2 or 3**, keeping ten distinct Techs in the display. Select replacements from eligible cards not already in the display and record the actual choices with the setup.

## Designer rulings — R01–R08 resolved

Source: the designer's follow-up message on 13 November 2026. Keep these rulings versioned with the game content; a machine-readable reference is in [rules-clarifications.json](../catalog/rules-clarifications.json). It is a specification, not an implemented engine.

| ID | Confirmed ruling | Reference / implementation consequence |
| --- | --- | --- |
| R01 | Free actions activate applicable before/after Tech effects. Spice's extra PRODUCE does not trigger Spice again, but does trigger the other applicable Techs. Rapid Advance converts one Ship directly; it is not a SETTLE action. | pp15–19. The Rapid Advance almanac wording takes precedence over its card. Finish the first PRODUCE chain before resolving Spice's bonus PRODUCE and its chain. |
| R02 | A “during this round” Event applies from selection until “Discard the previous Event” in the subsequent Economy's Event step. | pp12–13,20–23. Includes the selecting Economy's remaining steps and the next Economy's Investments. Preserve active restrictions through PLAN cleanup. |
| R03 | The recorded endgame interpretation is correct: stop after Tech in the Economy whose Event step cannot draw more Events, not immediately when the last pair is drawn. | pp6,12,14,22. Ragnarök can consume a pair and shorten the game. |
| R04 | A player may choose an otherwise empty action solely to trigger its before/after Tech effects. | pp8–11. Do not require a nonzero main effect as a prerequisite for these triggers. |
| R05 | Arcologies provides one shared extra space per planet. A planet with its printed capacity or capacity plus one Settlements is full for PRODUCE and Soylent Green. | pp15,19. Multiple Arcologies owners do not create further spaces. Apply Explore rewards before the acting player's settlement. |
| R06 | Only token/slot choices are secret. After reveal, players act simultaneously, or any player may declare a dependency and activate ordered resolution for all players. | p14. Action parameters are chosen during resolution; use the four-action priority and player order when disambiguating. |
| R07 | With Research Lab, Sabotage's destruction value is its undiscounted value. Sabotage cannot target Sabotage. | pp18–19. Keep nominal value separate from Credits actually paid. |
| R08 | Replace each excluded preset Tech with a random legal Tech of value 2 or 3. | pp12,14,24. Preserve a ten-card, distinct, legal preset display and record replacements. |

### Confirmed R01 example

Assume the player owns Population Explosion, Government Incentives, Frontier Pioneer, Rapid Advance, and Spice, and chooses to use the applicable effects:

1. Resolve the standard PRODUCE.
2. Population Explosion grants a free SETTLE. Its before-effects include Frontier Pioneer adding one Ship and Government Incentives granting a free MOVE INTO.
3. Resolve that MOVE INTO, followed by Rapid Advance's optional direct conversion of one Ship into a Settlement. That conversion does **not** trigger Frontier Pioneer, Government Incentives, or other SETTLE-action hooks.
4. Complete the Population Explosion SETTLE after its before-effects.
5. Spice then grants a second PRODUCE. Repeat the Population Explosion → before-SETTLE effects → Government Incentives MOVE INTO → Rapid Advance conversion → SETTLE chain.
6. The Spice-granted PRODUCE does not activate Spice again. There is no third PRODUCE from Spice in this chain.

### Additional confirmed edge cases

- **Prophecy on a capacity-one planet:** resolve an opponent-Settlement token before the acting player's settlement. With the reward placed, the acting player needs an applicable Arcologies extra space or a legal Soylent Green replacement to settle there themselves.
- **Asteroid isolation with warps:** removing edge paths is permitted when warp links keep the board connected. Connectivity validation must use both kinds of link.
- **Setup pool correction:** hidden tiles come only from non-home designs; unused home designs are excluded.

All eight original questions are answered, and the original hex versions are confirmed. Outstanding artwork/STL preparation and file handoffs are tracked in [REMINDERS.md](REMINDERS.md). Further rule interactions can be checked during playtests without reopening settled rulings.

## Verification cases to preserve

- Four action slots, actual stack order, skipped turns, and component conservation, including Tech markers and Investments.
- Seven separate player action boards and one shared two-sided aid; seven rocket silhouettes; 280 rockets and 28 poker chips at maximum player count; distinct chip rim patterns; snapping to suns and matching action-board indentations.
- Correct setup pools for every player count, with unused home designs excluded from hidden tiles.
- Asimov only at the six-player centre; Adams only at the seven-player centre; both excluded from all random pools and never used together. Both boards contain thirteen systems.
- Adams as the seventh home: capacity six plus four capacity-two planets, normal starting pieces, no setup black-hole loss, and normal loss on later MOVE INTO.
- Correct entry orientations, warp adjacency, barrier connectivity including warp routes, and black-hole loss.
- The five-player setup consumes the one additional asteroid token, so Kessler Syndrome cannot place that same token while it remains on the board.
- Mixed-player planet fullness, one shared Arcologies extra space, fullness at capacity and capacity plus one, production allocation, limited Reserve supply, and settling shared planets.
- Prophecy's opponent-Settlement token on a capacity-one planet, including no normal space for the acting player and the Arcologies/Soylent Green cases.
- The full R01 five-Tech example, including no SETTLE hooks from Rapid Advance and no Spice recursion; empty actions must still activate applicable Techs.
- Ordinary combat, insurance Credits, shared-planet protection, and the interactions of Patrol, Death Sun, Ammo Shortage, Black Cloud, and Alliance.
- Secret bids, zero-bid ties, first-player precedence, Foresight's private view, and winner-only payment.
- Shared Tech ownership, Patents restrictions, Sabotage's undiscounted destruction value with Research Lab, the ban on targeting Sabotage, immediate effects, and one-purchase-per-round limits.
- Every preset and variant exclusion, with random legal value-2/3 replacements preserving ten distinct cards.
- Event selection/expiry boundaries, Politics through PLAN cleanup, Ragnarök, last-round Sabotage prohibition, endgame settlement, and shared wins.
- Simultaneous token/slot secrecy, parameters chosen after reveal, a dependency declaration switching all participants to ordered resolution, stale submissions, disconnects, and the confirmed pre-commit/no-reveal Undo boundary.

Include the reviewed idle-removal scenarios for every phase, majority thresholds, hidden choices, token-stack unblocking, preservation of the starting setup, and last-player completion. No rules-engine tests have been run at this planning stage; the engine does not yet exist.
