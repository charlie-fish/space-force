# Prototype 0.15 playtest guide

Historical release: see [0.16](PLAYTEST_CHANGES_0.16.md) for the current inline powers/Reserve recovery and corrected Death Sun/Sabotage rules. C01–C04 below were subsequently confirmed by the designer on 17 November 2026.

17 November 2026. All **30 Tech effects** are now implemented for local normal-turn play with 2–7 people on one device. Event effects/auctions and remote multiplayer remain separate milestones.

## Start a test

Start a **new game** and choose **Last ten Techs**, the new default display. Its **Foresight test** option is checked and explicitly labelled nonstandard: it keeps Foresight for testing private peeks while Events still only count rounds. In normal simpler Events, Foresight is excluded by the rulebook; turning this option off replaces it with a seeded random legal value-2/3 Tech under R08. No ineffective Foresight card is offered in normal simpler games.

The other displays remain available. All five printed presets—Family, Aggressive, Cunning, Economic and Peaceful—now work, as does a seeded Random display. Each game has ten distinct shared Techs. Selecting a different preset defaults back to normal simpler Events; the test checkbox can be enabled explicitly.

The optional **R01 chain test** still gives each player the five chain Techs, using five Reserve ownership markers. It can be combined with Last ten Techs to test Mercenaries, Soylent Green and Eminent Domain alongside the full chain. Ordinary acquisitions and Sabotage should also be checked with this scenario off. Existing saved games retain their selected display.

## The last ten Techs

| Tech | Controls and implemented effect |
| --- | --- |
| **Death Sun** | ATTACK targets automatically calculate the enhanced cost. Each sacrificed Ship grants its normal two opposing Ships **or** one Settlement, plus one extra opposing Ship or Settlement. One sacrifice can destroy two Ships plus one Settlement; it cannot destroy one Ship plus two Settlements. Shared-planet and Patrol protection still apply. |
| **Gravity Drive** | After choosing incoming Ships, choose opponent passengers from those origins, at most one per carrier. Choose whose incoming Ships are lost to destination black holes; the confirmation states your losses and passenger losses. Passenger casualties become their respective owners’ Credits. Exploration still requires orientation before choosing quantities and positive entry. |
| **Soylent Green** | SETTLE offers replacement quantities when all unblocked planets are full, including when the ordinary draft will fill the last space. Each replacement consumes an own Ship and returns an opposing Settlement as a Credit. Shared planets and Patrol do not prevent this SETTLE effect. Explore resolves first. If an Explore gift fills the last space, the locked redistribution controls offer newly legal replacements without reopening other commitments. |
| **Mercenaries** | After MOVE INTO, choose zero to three existing Credits to convert into Ships in the active system. Reserve is not required; these direct additions do not suffer entry black-hole losses. If Rapid Advance also applies, choose which Tech resolves first. |
| **Filibuster** | After everyone places all four tokens, owners resolve in current player order. Select the exact own token to lift from its stack to that same stack’s top, or pass. Token numbers count from the top. No token or action slot is consumed. |
| **Insurance** | Each actual ACTIONS turn skipped for lacking a top token offers a Credit or a Ship from Reserve. Ships require a current own Settlement; a home without a Settlement does not qualify. The printed rule also applies to owners who have already used all four slots while other chips remain. There is no further skip/reward cycle after the last chip resolves. |
| **Eminent Domain** | After the final Tech purchases, owners may take a free SETTLE at home before scores are calculated. Normal applicable before-effects and nested free actions resolve, including Frontier Pioneer, Government Incentives, Rapid Advance and Mercenaries. Arcologies and Soylent Green apply. No chip or unused slot is required. |
| **Sabotage** | During Tech purchase, select an opponent’s non-Sabotage Tech and an undiscounted value X. Research Lab discounts the payment, not the destruction value; full-price payment and deliberate overpayment remain possible. The removed ownership marker returns to its owner’s Reserve. Ownership/Patents, one-purchase and final-round restrictions still apply. |
| **Flexible Economy** | **Tech powers** opens the ongoing-power controls. Select the owner and return any available Credits to their Reserve, including during another player’s turn or an unresolved choice. This transfer preserves the turn and action draft and triggers no action effects. |
| **Foresight** | In the labelled test setup, **Tech powers** provides an owner handoff and a private peek at the next two face-down Events. Looking does not draw cards. Closing or switching owners hides the images; their names never enter public history or the Status Box. This is a trusted-device handoff, not server-enforced remote privacy. |

Mercenaries/Rapid Advance ordering is a real choice: Mercenaries can create a Ship for Rapid Advance even after black holes remove all inbound carriers. Spice still completes the first PRODUCE’s entire other-Tech chain before its bonus PRODUCE; the bonus cannot trigger Spice again.

## Requested interface changes

- Before **Commit action**, the Status Box lists applicable **before**, **after** and **chained free-action** Tech effects. Investing clears the preview because it substitutes for performing the action. Committed free-action bodies preview their remaining effects.
- Committed Reserve interruptions with no **Go back** omit **Is this the outcome you intended?** Editable pre-commit confirmations keep their decision question.
- Completion automatically scrolls and moves focus to **Expedition results**, beneath the sticky header. Resuming a completed game does the same. Switching views afterward remains possible without being pulled back to the results.

## C01–C04 interpretations (subsequently confirmed)

These address details not explicitly settled by the printed rules. The designer has now **confirmed C01–C04**. R01–R08 remain settled. See the current guide for the subsequent Death Sun grouping and Sabotage payment corrections.

| ID | Implemented convention |
| --- | --- |
| **C01 — Gravity Drive** | Passengers start in the same origin as their inbound carriers and follow the carriers’ legal routes. Transport completes before destination casualties; losing a carrier does not cause a second passenger death. Each black hole destroys one incoming Ship, capped by all incoming carriers/passengers, with ownership selected by the mover. Passengers are the editable default casualties. |
| **C02 — Eminent Domain** | Multiple owners resolve in current player order, starting with the first player. Banking is inactive here because its almanac timing is **During ACTIONS**; normal R01 before/after hooks still apply to this free SETTLE. |
| **C03 — Soylent Green** | Recheck fullness before each placement, including after Explore and ordinary placements within the same SETTLE. Destroyed/blocked planets do not prevent the remaining planets from qualifying. Capacity and capacity-plus-one both count as full under confirmed R05. |
| **C04 — Sabotage** | Require a legal opponent target before taking payment, reflecting the mandatory removal instruction. Do not permit a targetless, zero-cost ownership point. Removing a Tech ends its ongoing effects but does not undo earlier token placements, conversions or existing Arcologies overflow. |

## Useful checks

- Select PRODUCE with the R01 cards and check the complete preview before committing. Try Investing instead and check that the preview disappears.
- Carry opponent Ships through multiple black holes. Compare different casualty allocations and test exploration with passengers, saving/reloading before movement finishes.
- Attack with mixed Death Sun targets, including a Patrol owner and a genuinely shared planet.
- Fill the last planet during SETTLE, then replace a Settlement. Also try the Explore reward that gives an opponent the last space; verify the replacement/keep-as-Ship decision and the fixed earlier allocations.
- Skip through Insurance rewards, including an exhausted owner. Empty their Reserve and use Flexible Economy before choosing the reward.
- Lift different own tokens from interleaved stacks with Filibuster and test several owners in the same PLAN phase.
- Buy Eminent Domain in the final Economy and complete its home SETTLE chain before inspecting scores. Confirm automatic results scrolling and all five final-state views.
- Use Sabotage with Research Lab at nominal value five: pay two or choose full price, remove a value-five target, and check the returned marker. Remove an immediate-placement Tech and verify that its board piece remains.
- Test Foresight’s handoff, peek/hide, and the changed next pair after the Event draw. Disable the nonstandard test option and verify legal replacement instead.

The save format is engine **0.15.0**, schema **6**, content **all-techs-event-tracker-3**. Autosaves include Filibuster, Insurance, after-MOVE ordering, Mercenaries, carried Ships, replacement commitments and the Eminent Domain queue. Genuine older engine 0.8–0.11 and 0.14 records migrate by replay. Local game exports record the display, Event test option, scenario, seed, commands, actors and scores.

Automated rules, DOM, persistence and replay checks pass, including complete campaigns at every player count. Build/portable checks cover all 85 artwork files and the compressed JavaScript budget. Real-browser/phone visual verification remains outstanding; see [phone testing](PHONE_TESTING.md) and [validation](PROTOTYPE.md#validation).
