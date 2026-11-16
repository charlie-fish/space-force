# Second playtest changes — prototype 0.10.0

16 November 2026. Implements the designer's latest feedback on the local normal-turn Family/simpler-Events prototype. These changes supersede overlapping controls in the [0.9 checklist](PLAYTEST_CHANGES_0.9.md). They do not add remote rooms, full Event effects or simultaneous turns.

## Status Box, navigation and readability

| Request | Implemented behaviour |
| --- | --- |
| Separate Status Box heading and S | “Status Box (S)” occupies its own heading line on desktop; S scrolls to the document top. |
| Mobile titles omit shortcuts | Phone/touch headings omit bracketed keys: Status Box, Board, Techs, Event, Actions and Supply, Player aid. Desktop headings show S/B/T/E/A/P. |
| View shortcut scrolling | B/T/E/A/P select the corresponding view and scroll its panel to the top, allowing for the sticky header. Editable inputs and browser modifiers suppress character shortcuts; the preference can disable them. |
| Highlight whose turn it is | Both the player's rocket/name badge and possessive turn title are highlighted. The next-step instruction appears immediately below in black. |
| “Since your last turn” | A collapsible history replaces the previous-action result box. It contains logged actions/outcomes since this player's preceding required decision; every accepted decision point counts, including consecutive choices by the same player. Draft edits and navigation do not count. |
| Stack numbers in System status | Full numbered bottom-to-top order appears in System status, with no numerical order ribbon on the board. |
| Players & supply includes scores | The summary shows each player's current points alongside public supplies. |
| 10-point minimum | Live HTML text has a 10pt floor. Board labels counter-scale to remain readable when zoomed out; source card/aid lettering retains its original pixels with semantic reference text alongside. |
| Actions phase label | The phase is “Actions”; its separate view is “Actions and Supply”. |
| Final views | Board, Techs, Event, Actions and Supply, and Player aid remain selectable below “Expedition complete”, without changing the final state. |

## Board pieces and action drafts

| Request | Implemented behaviour |
| --- | --- |
| Double Settlement rockets | Board Settlement rockets are now 24 world units, twice their former size, at the measured capacity anchors. |
| Legal-chip ring | Each selectable top chip has a thin opaque ring behind every chip in its stack, so it cannot cover lower chips. Desktop hover changes the ring colour. |
| Compact tall stacks | Every chip is retained, with the owner colour on its rim and a condensed offset capped at 32 units overall. A 12-chip stack and even a 28-chip stack retain their complete order. |
| Circular black holes | Printed, Planet Killer and revealed Explore holes all use the supplied circular black-hole Explore artwork. The old printed holes are omitted from the relevant exported tile layers. |
| Meaning of “◉ +1” | It meant one additional black hole in that system. The shorthand has been removed; actual circular tokens now show those holes. |
| Le Guin | No default black hole. Its four planets retain capacities 2/2/1/1. |
| Asteroid wording | System summaries show the count, such as “2 asteroid edges”, instead of listing edge numbers. |
| Plan may be changed | Clicking another system or dragging a chip changes only the preview. “Place chip here” is the sole placement confirmation. An immediate confirmation after a touch drag is accepted. |
| Invest checkbox position | “Invest instead of acting” sits immediately above Commit action. |
| Produce layout and Reserve limit | Ships produced appears above Credits produced; the quantities remain linked. A shortfall explains how the Reserve limits output. |
| Loss wording | Destroyed rockets are “returned as Credits”. |
| Empty Attack defaults to Invest | Invest starts selected when there are no legal opposing Ships or Settlements, including only protected settlements. The player can unselect it. |
| Choose targets first | Attack target changes automatically raise the sacrifice to their cost, capped by available own Ships. All selected targets remain legal; excess manual sacrifices still require confirmation. |
| Sacrifice counter | Displays chosen sacrifices / sacrifices needed by the targets. |
| Attack scrolling | The opposing-planet scroller preserves its position while quantities change. |
| Exploration before Ship selection | Commit the reveal, preview/confirm a legal orientation, then choose Ships to send. At least one Ship must enter through an original legal route. An unrevealed system cannot be peeked at and then abandoned with zero Ships. |

## Economy, choices and interruptions

| Request | Implemented behaviour |
| --- | --- |
| Investments on Board | Investments opens the Board. Reinforcements also uses the Board. |
| Rebalance Investments | Increasing a full allocation preserves the edited choice and reduces the topmost other allocation (Credits is first when another system is edited). Switching from system to Credits or vice versa works without manually clearing the former choice. |
| Board-click allocation | During Investments/reinforcements, clicking an eligible system adds one if possible. Pending acknowledgements cannot allocate more. |
| Reinforcement upper limit | Quantity controls and the engine reject totals above the available allowance/Reserve. |
| Unused reinforcements | Confirm allocation opens a confirmation when fewer reinforcements are assigned than can be placed. Cancelling preserves the draft. |
| Automatic first-player pass | The marker passes and the next PLAN round starts automatically after reinforcements finish. No extra button is needed. Final Economy still scores after Tech, without reinforcement or handover. |
| Selected planet/system/edge first | A selected Tech target moves to the leftmost chooser position and its horizontal scroll resets to the far left, including Kessler Syndrome edges chosen on the board. |
| Darker token-used notice | Used-token notices on Tech cards have dark text on a light background. |
| Ineffective token-Tech purchase | A confirmation appears before spending Credits if the relevant unique token is already on the board; cancelling leaves Credits unchanged. Optional placements remain optional. |
| Non-choice Explore results | Credits/black-hole outcomes pause the active player with the result and an Ok button before resolution continues. |
| Displaced committed Settlement | If an opponent's Explore Settlement takes one of two committed spaces, place the active player's one Settlement that fits, then ask where the displaced rocket goes: keep it as a Ship or allocate it to another eligible planet. Only that displaced amount is editable; all other committed placements remain fixed. |
| Reserve-shortfall interruptions | Reserve-limited production, Investing/Banking, Explore rewards and reinforcement outcomes explain what could be completed, pause the active player, and require Ok before advancing. Forty rockets per player are conserved. |

## Verification and review

All **84 automated checks** pass, including 72 complete seeded games across every supported player count, rocket conservation, exact command replay, genuine 0.8/0.9 save migration and DOM interaction tests. The production/portable builds pass TypeScript, artwork-reference, relative-path and bundle-budget checks: approximately 47 KB compressed JavaScript and 110 KB initial JS/CSS/cover before HTTP headers.

Visual browser/phone checks remain outstanding. Review the ring/stack readability, larger settlements, circular-hole placement, 10pt labels, destination scrolling and mobile gestures in a complete game. Automated DOM checks do not establish visual appearance or touch behaviour on real hardware. Download instructions are in the [README](../README.md#run-the-prototype); remaining milestones and file reminders are in the [review checklist](REVIEW_CHECKLIST.md).
