# Prototype 0.21 · Event guidance and Tech choices

20 November 2026 · [Implementation branch](https://github.com/charlie-fish/space-force/tree/prototype/normal-turns) · [Downloadable builds](https://github.com/charlie-fish/space-force/actions/workflows/prototype.yml)

The three ten-card Event batches remain available. This update applies the designer's Event playtest feedback and confirms Earth First's precedence over Disruptor. [The 0.20 guide](PLAYTEST_CHANGES_0.20.md) lists the batches and explains complementary repeat runs.

## Changes to check

- **Earth First / Disruptor (E04 confirmed):** during the Tech phase, Disruptor warns that selecting an opponent's home system has no blocking effect under Earth First. This applies throughout the affected PLAN phase. Disruptor can still block other systems, including its owner's home for opponents. The placement chooser repeats the warning and identifies an ineffective selected target. Its ownership still scores normally.
- **Completed one-off Events:** after all choices, rewards, acknowledgements and free-action/acquisition chains finish, the Active Event area in the Status Box shows only the Event name and **Effect complete**. This covers All Your Base, Capital Injection, Communist Decree, Consolidation, Famine, Galactic Summit, Hive Mind, Migration, Multicultural Tension, Politics, Prophecy, Ragnarök, Stealth Invasion, Technological Singularity, Turtling and Vorsprung. An Event discarded by a repeated Event step is no longer active.
- **Ongoing Events:** the other fourteen Events keep their rules text in the Status Box and name the player who selected them. The full Event view and card references remain available.
- **Vorsprung:** eligible Techs in the Status Box are sorted by cost, highest first. Select one, change your choice if desired, then **Commit Tech claim**. Clicking an eligible card anywhere in the Techs view selects it; double-clicking selects and commits once. A quick pair of taps works there too. View changes and other controls cancel an incomplete double-click. Keyboard users can select the card button and use the explicit commit button. Unavailable cards still open their reference. Acquisition choices keep the Event unresolved until complete.
- **Sabotage:** the initial target is the most expensive legal opponent Tech the current player can afford to remove. Its full Credit value becomes X automatically, including with Research Lab. An explicit target/X edit is preserved. If no target is affordable, none is selected and purchase stays disabled. Returning Credits updates an untouched default; buying without changing it uses the displayed target and price.
- **El Mayarah:** selecting PRODUCE shows the beneficiary how many shared planets produce double, the extra production in the selected system, the full-planet bonus and Reserve limits. Other players do not get that beneficiary reminder.
- **Economic Boom:** choosing Invest shows a reminder beside the checkbox that two rockets are Invested instead of one, subject to Reserve. Invested action-slot markers in Actions and Supply show two rockets.
- **Turtling:** each player's default is three Ships at home, capped by available Reserve. An explicit lower amount or zero is retained until committed. Subsequent players get their own default.
- **Cyber Attack:** the System Status fallback says **Cyber Attack: Select a stack with any player's colour on top**.
- **Alliance:** ATTACK names the protected player for the restricted attacker, including when the action defaults to Invest. It explains the one-way restriction to other attackers without incorrectly prohibiting their targets.
- **Black Cloud:** ATTACK explains that Ships cannot be targeted and only opposing Settlements can be attacked, including when no eligible targets remain and Invest is selected by default.

## Text updates

- Death Sun: **3 opposing Ships or 2 opposing Settlements**, retaining separate sacrifices for mixed target types and Credits for all casualties. Ammo Shortage still changes the Ship limit to 2 under E01.
- ACTIONS guide: **Change your selection freely before Commit**.
- PLAN guide: **Decide which systems you want to take actions in. Action tokens form stacks. You will be able to take each action once per round, so plan ahead where you want to take those actions. Later, the stacks will be resolved from top to bottom.**
- Auction explanation adds **Winner selects the Event.**
- Bid handoff adds **The winner will pay their bid and select the Event.**

## Compatibility and validation

Engine 0.21 uses the existing schema 10/content `full-events-bidding-7`. Version 0.20 saves replay into 0.21, preserving committed bids, Event choices, pieces and pending effects; older supported migrations remain available. Uncommitted Vorsprung and Sabotage selections are drafts. Earth First's confirmed blocking rule applies when a saved game resumes.

Automated checks cover all 30 Event summaries, selection/commit/double-click paths, default target affordability and payment, Turtling defaults, action reminders, pending acquisition, save/replay, the 180 complete seeded games and existing Tech rules. Strict compilation and static/portable packaging remain required. Browser/phone visual verification remains pending; DOM tests do not replace real-device testing.
