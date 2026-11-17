# Prototype 0.16 playtest guide

Historical release: [0.17](PLAYTEST_CHANGES_0.17.md) supersedes its Reserve pop-up controls, Mercenaries/Rapid Advance ordering, Insurance eligibility/destinations and Sabotage discount behaviour. C01–C04 remain confirmed.

17 November 2026. C01–C04 are **designer-confirmed**. This release updates the local 2–7 player normal-turn prototype; all thirty Techs remain available through ten-card displays.

## What changed

- **Home selection:** double-click or double-tap an available home to choose it. One click selects a preview; **Choose this home** remains available. Panning, pinching and cancelled touches do not choose a home. Extra clicks cannot choose for the next player.
- **Flexible Economy:** **Return 1 Credit to Reserve** appears in the Status Box immediately below the active owner's Reserve/Credits, across all five views. Each press moves exactly one Credit and preserves the current draft and turn. It is disabled when no Credits remain.
- **Foresight:** **Peek at next two Events** appears immediately above the active owner's Reserve/Credits. It opens private images inline; **Hide private peek** closes them. Looking does not draw cards or publish their names in history. The peek hides when the turn changes or Events are drawn. The former **Tech powers** menu and pop-up have been removed.
- **Filibuster:** exact-token choices now identify **(top)** and **(bottom)**, with token #1 at the top. A single-token stack has both labels.
- **Sabotage:** selected target text uses dark lettering. Selecting a target sets X to its printed value, including when switching to a cheaper target. Payment must cover the target's full printed price even with Research Lab. At X=5 against a value-five Tech, pay **5**, rather than the old discounted 2. A higher chosen X can cost more: payment is the greater of the target's printed price and the usual Research Lab-discounted X. Full-price payment remains optional where it differs. R07 still uses nominal X for destruction eligibility; Sabotage cannot target itself.
- **Death Sun:** each sacrificed Ship removes up to **three opposing Ships OR two Settlements**. One sacrifice cannot combine the two target types. The minimum cost is `ceil(Ships / 3) + ceil(Settlements / 2)`: three Ships alone cost one sacrifice, two Settlements alone cost one, and one Ship plus one Settlement cost two. The controls, target limits, automatic sacrifice quantities and excess-sacrifice warning share that calculation. Shared-planet and Patrol protection still apply.

Foresight remains available through the explicitly labelled **Foresight test (nonstandard)** setup. Normal simpler Events exclude it and apply the confirmed R08 replacement; Event effects and auctions are still disabled. On a shared device the next player can see anything left on screen: hide a peek before handoff. Server-enforced private information belongs to the remote-play milestone.

## Completing a Reserve-limited effect

When a Flexible Economy owner cannot finish an effect because Reserve is short, a focused pop-up shows what has already happened and what remains. Return Credits **one at a time**, then press **Apply … Reserve** or **Complete effect**. The effect uses only the unfinished allowance. You can repeat this or choose **Continue with current result** to leave the rest uncompleted. Completed gains, placements, action slots and hidden reveals stay committed. There is no Go back and no intended-outcome question.

Recovery covers production, Explore Credits, opponent Explore Ship/Settlement gifts, Frontier Pioneer, Cloaking, Banking, Investing, Insurance, Genesis and reinforcements. During an opponent's Explore gift the controls use that recipient's Credits/Reserve while preserving the acting player's turn and waiting Settlement. A gift that fills a planet still resolves before the acting player's Settlement/locked redistribution.

Production recovery offers linked quantities for **remaining Ships** and **remaining Credits**; it leaves the output already produced unchanged. Reinforcement recovery allows only legal home/Settlement systems, keeps earlier allocated Ships in place and never exceeds the full allowance. Returning Credits alone does not apply them or finish the interruption. Declining remains possible when Credits are empty.

New Credits from a partial Explore reward can themselves return to Reserve to finish that same reward. The unfinished amount decreases each time, so this never repeats the original reward or creates extra rockets. Before/after effects resume once in the correct nested action, including the full R01 chain and non-recursive Spice.

## Confirmed interpretations

| ID | Designer-confirmed rule |
| --- | --- |
| **C01 — Gravity Drive** | Passengers start with their inbound carriers and use the carriers' legal routes. Transport precedes destination casualties. A lost carrier does not kill its passenger again. Each destination black hole removes one incoming Ship, capped by all inbound carriers/passengers; the mover chooses whose Ships are lost. |
| **C02 — Eminent Domain** | Owners resolve in current player order, starting with the first player, before scoring. Banking is inactive outside ACTIONS. Applicable R01 hooks still resolve for the free SETTLE. |
| **C03 — Soylent Green** | Recheck fullness before each placement, including after Explore. Ignore destroyed/blocked planets. Printed capacity and capacity-plus-one both count as full under R05. |
| **C04 — Sabotage** | Require a legal opponent non-Sabotage target; no targetless zero-cost point. Removing ownership ends ongoing effects without reversing existing pieces, conversions or Arcologies overflow. |

These confirmations supplement R01–R08. The new Death Sun grouping and Sabotage payment floor above supersede the previous implementation and original card wording where they differ. Their semantic reference text records the designer override; the original card artwork is preserved.

## Check next

1. Start a new game and test home double-click/double-tap, the button alternative and phone panning/pinching.
2. Own Flexible Economy, lower Reserve, and try production, Investing, reinforcements and before-effects. Apply several one-Credit top-ups; then try declining, saving/reloading partway, and an opponent Explore gift. Earlier gains must not repeat.
3. Combine Flexible Economy with the **R01 chain test**. Check that Population Explosion/Frontier Pioneer/Government Incentives run twice, Rapid Advance never starts another SETTLE chain, and Spice adds exactly one PRODUCE.
4. Test Foresight show/hide and Credit returns in each view, including a pending decision. Check that peeks hide at handoff and names never enter public history.
5. Lift top, middle, bottom and singleton tokens using Filibuster. Switch Sabotage targets from an expensive Tech to a cheaper one, checking X and the minimum payment with Research Lab.
6. Attack with Death Sun using pure and mixed targets, particularly one Ship plus one Settlement, and compare the automatic sacrifice cost with the rule above.

## Saves and validation

Engine **0.16.0**, schema **7**, content **confirmed-techs-reserve-recovery-4** saves include the remaining effect, affected owner and continuation. Genuine 0.15 records migrate by replay: completed historical commands retain their old Death Sun costs and Sabotage payments, while new commands use the corrected rules. An unfinished 0.15 Reserve warning upgrades to recoverable output without repeating initial gains. Exported history records both compatibility boundaries; `replayGame` reproduces it. Earlier supported 0.8–0.11/0.14 saves still migrate.

Rules, DOM, save migration and command replay checks cover these changes, including real completed 0.15 history and interrupted reward/chain states. The full suite also exercises 126 seeded complete games across 2–7 players, rocket conservation and all artwork references. Production/portable packaging checks the compressed JavaScript budget. Real-browser and phone visual/gesture checks remain outstanding; see [phone testing](PHONE_TESTING.md) and [validation](PROTOTYPE.md#validation).
