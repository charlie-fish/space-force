# Rules review for implementation

Reviewed against `Space Force rules v1.80.pdf` and `SpaceForce Cards v1.80.pdf`, with the player aid and cardboard artwork as supporting references. Page numbers below refer to the PDF, counted from one.

This is an implementation outline and question register, not a replacement rulebook. The attached documents are game reference material. The user's explicit instructions about software scope, ignored pages, and additional component copies take precedence as project instructions.

## Components and state

The base supply is 40 rockets and four action tokens per player, up to six players; 30 Tech cards; 30 Event cards; 16 Explore tokens; 12 illustrated systems; player boards/aids; four additional feature tokens; and a first-player marker (rulebook p3).

A rocket has a role determined by its location: Reserve, Credit, Ship in space, Settlement on a planet, invested rocket, or Tech ownership marker. Model these explicitly and preserve the physical supply limit. Destroyed Ships/Settlements normally become Credits; do not put them back in Reserve. Specific effects such as Famine and Sabotage explicitly use Reserve instead.

Planets hold settlements from multiple players. Ships occupy systems. An action-token stack is ordered, and only its top token is normally available. Each player board has four distinct slots: MOVE INTO, SETTLE, PRODUCE, ATTACK.

## Setup: rulebook pp4–5

| Players | Illustrated tiles | Initially face-up homes | Event cards | Baseline rounds |
| ---: | ---: | ---: | ---: | ---: |
| 2 | 4 | 2 | 10 | 6 |
| 3 | 6 | 3 | 10 | 6 |
| 4 | 8 | 4 | 8 | 5 |
| 5 | 10 | 5 | 8 | 5 |
| 6 | 12, plus playable empty centre | 6 | 8 | 5 |

Use the actual diagrams rather than a generic hexagon of an arbitrary radius. The five-player layout uses the additional asteroid-belt token. The six-player central space can contain Ships and action tokens and is described as an empty system.

Select the required home tiles randomly and reveal them; choose the other tiles from the remaining systems and keep them face-down. Remaining home designs are not excluded from the hidden pool. Players choose a home in order and begin with three Settlements on its capacity-six home planet and three Ships in that system. Their other rockets remain in Reserve.

Display ten Techs for the game, either selected randomly or using a named preset. Keep the remainder available server-side for Technological Singularity. Prepare the shuffled Event draw pile and Explore supply. Record setup choices and randomness privately for reproducibility.

The physical rule for choosing the first player can be represented by a lobby choice, with random selection as a proposed convenience. Record the resulting seat order. Home orientations and exact tile/planet anchors still need to be encoded and checked against the diagrams/TTS.

## Round flow: rulebook pp6–13

**PLAN.** Clear last round's action-board tokens. In player order, place one action token on a system's stack, on top of existing tokens; continue until all have been placed. No passing unless an effect permits it. Face-down systems and the six-player centre are valid locations. Strategic Stall, Disruptor, Earth First, Politics, Filibuster, and Scrambler require explicit timing hooks.

**ACTIONS.** In order, resolve one eligible top token. Skip a player with no available top token; otherwise they cannot pass. Remove that token, choose an unused action-board slot, and perform that action in the token's system or Invest the action with a rocket from Reserve. Each slot can normally be used once per round. The resolution sequence must account for Insurance and for Cyber Attack's use of other players' tokens.

**MOVE INTO.** Bring any chosen own Ships from one or more adjacent systems into the active system. Adjacency normally means a shared edge; warp systems are mutually adjacent. Asteroid barriers block movement unless an effect overrides them. Reveal and orient a newly entered tile, keeping the entry legal and avoiding a disconnected board; put one hidden Explore token on each capacity-two planet there. For each black hole in the destination, destroy one incoming Ship, returned as its owner's Credit. That loss occurs as part of MOVE INTO, not automatically whenever a Ship is added by a different effect (p9).

**SETTLE.** Convert chosen Ships in the active system into Settlements within planet capacity. Take and resolve a planet's Explore token before settling it. Token rewards come from the relevant player's Reserve. A revealed Explore black hole remains in the system. Settlements cannot normally move, and players cannot normally destroy their own Settlements (pp9–10).

**PRODUCE.** Each planet containing the acting player's Settlement produces one Ship or Credit; a fully settled planet produces an additional one. Fullness counts everyone's Settlements. The player allocates the results between Credits and Ships, subject to Reserve supply; Ships go in the active system (pp10–11).

**ATTACK.** Remove chosen own Ships in the active system. Each removed Ship can remove up to two opposing Ships or one opposing Settlement. Different sacrificed Ships can be used for different target types. Removed pieces become their owners' Credits. A player cannot attack a planet's opposing Settlements while that player also has a Settlement on that planet. Patrol and other combat effects can add further restrictions (p11).

**ECONOMY.** Resolve Investments, Event, Tech, Reinforce, then pass the marker:

1. Convert invested rockets into Credits or Ships placed at home or in systems where the player has a Settlement.
2. Discard the previous Event and reveal two new Events, if available. Players submit secret Credit bids; reveal them together. Only the winner pays, ties follow current player order, and the winner chooses the Event. A bid may be zero. Credit balances are public; pending bids are private.
3. In player order, optionally buy one displayed Tech, pay its cost to Reserve, and use a Reserve rocket to mark ownership. Multiple players can own the same Tech; a player cannot rebuy one they own. Tech effects may modify this.
4. Add up to three Ships from Reserve at home or in systems with own Settlements; Assembly Line changes this to four.
5. Pass first player clockwise.

There are no automatic replenishments of the displayed Tech market after ordinary purchases: it is shared ownership rather than removing the card. Extra Techs enter through the appropriate Event.

## End of game: rulebook pp6,12,14

The stated six/five round counts imply that playing the last pair of Events does not immediately end the game: there is a further action round, and then an Event step with nothing left to draw. Finish after Tech in that final Economy phase, without Reinforce or passing first player. Ragnarök can shorten the game. Confirm this boundary explicitly before writing the endgame tests, since p14's abbreviated wording could otherwise be read differently.

Resolve Eminent Domain and other applicable endgame effects, then score:

- One point per planet with at least one own Settlement.
- One point per system with at least one own Ship.
- One point per owned Tech.

Ties use the greatest number of Credits; any remaining tie is a shared win. Record the components of the score, not only the total. Distinct-planet and distinct-system counting matters; neither is a count of pieces.

## Variants and presets

**Simpler Events, p12:** use Event cards only as a round tracker, ignore their effects, skip the auction, and exclude Foresight from the Tech pool. Treat this as an explicit game setting.

**Simultaneous actions, p14:** remove Cyber Attack from Events and Gravity Drive from Techs. PLAN and ECONOMY remain unchanged. During ACTIONS, every eligible player selects a top token, then assigns it secretly to an unused action slot. Reveal together. Resolve independent actions simultaneously. Where actions conflict or depend on each other, resolve MOVE INTO before SETTLE before PRODUCE before ATTACK, and use player order when needed.

Online implementation needs separate selection, assignment, reveal, and resolution states. Do not expose a player's secret slot assignment while another can still change theirs. The server must resolve dependencies consistently; simply allowing six browsers to submit ordinary turns at the same time would not implement this variant.

**Presets, p24:** Aggressive, Cunning, Economic, Family, and Peaceful each contain ten Techs. They are indexed in [tech-presets.json](../catalog/tech-presets.json). Some contain Gravity Drive or Foresight, so exclusions for the chosen variants must be applied explicitly; the replacement policy is a designer question.

## Questions requiring a designer ruling

These are interpretations still needed, not confirmed defects in the board game. They can be answered progressively. The first two matter most for the engine structure.

| ID | Question | Reference / implementation consequence |
| --- | --- | --- |
| R01 | Do free actions activate every applicable “before/after you do an action” Tech? In particular, does Spice's extra PRODUCE trigger Spice again, and how do Population Explosion, Government Incentives, Frontier Pioneer, and Rapid Advance combine? | Tech almanac pp15–19; define the trigger order and recursion limit rather than inventing one. Rapid Advance converts a single Ship in the almanac but says SETTLE one Ship on its card. |
| R02 | When exactly does a selected Event's “during this round” effect begin and expire, including Tech/Reinforce in the Economy phase where it was selected and Investments before the next Event? How should Politics' occupied action slot survive the next PLAN clear? | pp7,12–13,20–23; affects event lifecycle, Tech suppression, and blocked slots. |
| R03 | Confirm the no-cards-left-to-draw end boundary described above. If Ragnarök uses the final available pair, does that lead to the same later final Economy boundary? | pp6,12,14,22; prevents ending one action round too early. |
| R04 | What counts as doing an action rather than Investing when zero pieces would move/change? Can a player choose an otherwise empty action solely to activate a Tech's before/after effect? | pp8–11; especially relevant to free actions, Banking, Cloaking, and Frontier Pioneer. |
| R05 | With Arcologies, is the extra settlement allowance a single extra space on a planet, or can different Arcologies owners each exceed the original capacity? How does this interact with Soylent Green and Explore effects? | pp15,19; preserve printed-capacity fullness while making legal placement unambiguous. |
| R06 | In the simultaneous variant, are only token/slot choices secret, or are all action parameters locked before reveal? When one action changes another's legal choices, does the affected player choose its parameters at resolution? | p14; affects hidden selections, interaction prompts, and dependency resolution. |
| R07 | For Sabotage plus Research Lab, does destruction value use the amount actually paid or the undiscounted value? How is an owned Sabotage valued as a target? | pp18–19; the variable X cost needs a precise rule. |
| R08 | When a preset contains a card excluded by the chosen variant, replace it with a random legal Tech or keep a smaller display? | pp12,14,24; keeps named presets and variant exclusions consistent. |

Other specific combinations can be checked in designer playtests rather than asking for an exhaustive ruling now. Artwork coordinates/capacities need a second transcription check; they are not questions requiring a rules change.

## Verification cases to preserve

- Four action slots, actual stack order, skipped turns, and component conservation, including Tech markers and Investments.
- Correct entry orientations, warp adjacency, barrier connectivity, black-hole loss, and the six-player empty centre.
- The five-player setup consumes the one additional asteroid token, so Kessler Syndrome cannot place that same token while it remains on the board.
- Mixed-player planet fullness, production allocation, limited Reserve supply, Explore choices, and settling shared planets.
- Ordinary combat, insurance Credits, shared-planet protection, and the interactions of Patrol, Death Sun, Ammo Shortage, Black Cloud, and Alliance.
- Secret bids, zero-bid ties, first-player precedence, Foresight's private view, and winner-only payment.
- Shared Tech ownership, Patents restrictions, Sabotage, discounts, immediate effects, and one-purchase-per-round limits.
- Event replacement, Ragnarök, last-round Sabotage prohibition, endgame settlement, and shared wins.
- Simultaneous lock/reveal, conflict/dependency order, stale submissions, disconnects, and approved undo checkpoints.

No rules-engine tests have been run at this planning stage; the engine does not yet exist.
