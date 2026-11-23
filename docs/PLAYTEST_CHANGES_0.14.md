# Prototype 0.14 playtest changes

17 November 2026. Normal turns and simpler Events remain the playable modes for 2–7 people sharing one device.

## Setup and the ten new Techs

The setup screen defaults to **New Techs**, a ten-card display containing all ten additions below. **Family** retains the original ten cards. **Tech chain mix** combines the five R01 cards with Banking, Agility, Genesis, Arcologies and Research Lab. These last two displays are playtest presets, not additional printed presets. There are still ten shared cards in each game, and one purchase per player per Economy.

| New Tech | Implemented effect |
| --- | --- |
| Population Explosion | After PRODUCE, resolve a free SETTLE in the active system, including its before/after Techs. |
| Government Incentives | Before SETTLE, resolve a free MOVE INTO in the active system, including Rapid Advance. |
| Frontier Pioneer | Before SETTLE, add one Ship from Reserve in the active system. Warn if Reserve is empty. |
| Rapid Advance | After MOVE INTO, optionally convert one of your Ships in the active system into a Settlement. This follows the almanac: it is a direct conversion, so it does not trigger SETTLE Techs. Explore tokens still resolve. |
| Spice | After PRODUCE and its complete other-Tech chain, resolve a second PRODUCE with newly calculated output. It triggers the other Techs, but cannot trigger Spice again. |
| Arcologies | Allow one Settlement above printed capacity. The extra space is shared across all owners; a planet at capacity or one above is full for production. Extra Settlements receive a distinct board position. |
| Cloaking | Before ATTACK, add one Ship from Reserve, then choose attack quantities. Warn if Reserve is empty. |
| Patrol | Protect your Settlements while your Ships remain in that system. One attack may eliminate all your Ships and then your Settlements if the attacker pays the full sacrifice cost. Protection is owner-specific. |
| Research Lab | Offer half-price purchases rounded down, and an alternative full-price purchase. It does not discount its own acquisition; Patents, affordability and the ownership-marker requirement still apply. |
| Strategic Stall | Offer one PLAN pass per round, consuming that placement turn without consuming a token or action slot. All four tokens must still eventually be placed. |

## Test the confirmed R01 example

1. Start a **new** game; existing saves retain their original display. Select **New Techs**, or **Tech chain mix** if also testing Banking.
2. Enable **R01 chain test**. This clearly labelled designer scenario gives every player Population Explosion, Government Incentives, Frontier Pioneer, Rapid Advance and Spice before home selection. Their five ownership markers come from Reserve: after home selection each player has 29 Reserve, three Ships, three Settlements and five Tech markers. These Techs score normally. This is a testing setup, not a normal rule.
3. Place an action token on your home during PLAN. In ACTIONS, select an available stack there and PRODUCE. Production initially defaults entirely to Ships.
4. Resolve the free Government Incentives MOVE INTO. An empty MOVE is allowed and still offers Rapid Advance if an existing Ship can convert. Choose a Rapid conversion or skip it, then allocate the Population Explosion SETTLE.
5. Spice now offers another PRODUCE. Its output reflects the newly settled/full planets. Complete the second Government → Rapid → SETTLE sequence. The chain ends without another Spice activation.

The order is **PRODUCE → Population Explosion SETTLE → Frontier Pioneer + Government Incentives MOVE INTO → Rapid Advance direct conversion → complete SETTLE → Spice PRODUCE → repeat the other Tech effects**. Frontier Pioneer resolves before Government Incentives for this implemented combination. No extra action token or action-board slot is consumed by free actions. Root actions with before-effects commit their token/slot first and choose their main quantities after those effects finish.

The scenario makes this practical at all player counts: in a normal four-plus-player game, the fifth purchase occurs after the final ACTIONS phase, too late to use all five together. Test ordinary acquisition separately with the scenario disabled.

Banking follows its “whenever you do an action” wording: each free action offers its own optional Banking investment. Direct Rapid conversion, Frontier/Cloaking Ship additions and Strategic Stall passes do not count as actions. Bonus free-action investments are recorded separately from used action-board slots. Investing a root action instead of performing it does not activate the chain or double-invest through Banking.

## Other requested changes

- PRODUCE starts with the maximum available Ships and zero Credits. Editing either quantity continues to update the other.
- A Disruptor-blocked system can be selected and inspected in PLAN. **Place chip here** is disabled with an explanation; double-click/double-tap cannot place a token there.
- Actions and Supply scoring says **patrolled systems**.
- Decision interrupts contain one **Is this what you intended?** prompt; the duplicated **Is that what you intended?** is removed.
- Investment instructions say **Choose Credits or Ships (anywhere you have a Settlement). Clicking a legal system on the board adds one Ship there.**
- The initial PLAN heading says **Place your next action token**.

## Checks to try

- Try the R01 chain with empty MOVE bodies, with incoming Ships, with Rapid skipped, with Explore rewards, and with an almost-empty Reserve. Refresh during a free action, a Rapid choice or an Explore interrupt and continue.
- Fill a planet with Arcologies, including a shared planet. Check that owners cannot create separate extra spaces and that both full and overfull planets produce the bonus.
- Attack Patrol-protected Settlements before and after targeting every defender Ship; try Ships owned by a different player too. With Cloaking, check that the added Ship is available before choosing targets.
- Buy Research Lab, then compare the discounted and full-price buttons, including odd prices. Try Strategic Stall in successive rounds.
- Verify Ship-first production, blocked-system inspection, confirmation wording and the six requested text/default changes on desktop and a real phone. See [phone testing](PHONE_TESTING.md).

The engine is now 0.14.0/schema 5, with the chosen display/scenario and nested action checkpoints saved and exported. Older 0.8–0.11 engine records migrate by replay, preserving their original max-Credit production defaults and completed scores. Browser/device visual verification remains outstanding; automated rules, DOM, replay and production-package checks are recorded in [PROTOTYPE.md](PROTOTYPE.md#validation).
