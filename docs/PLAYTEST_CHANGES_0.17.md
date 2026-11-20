# Prototype 0.17 playtest guide

Historical release: [0.18](PLAYTEST_CHANGES_0.18.md) supersedes rival Reserve-warning/refill handoffs. Only the active player receives Reserve interruptions; rivals use available Reserve and empty-Reserve gifts fail automatically.

17 November 2026. This release applies the latest designer corrections to the local normal-turn prototype for 2–7 players. C01–C04 and R01–R08 remain confirmed.

## Tech timing and Insurance

**Mercenaries always resolves before Rapid Advance.** There is no ordering chooser. After MOVE INTO, complete or decline Mercenaries' conversion first, then use Rapid Advance if a legal Ship conversion is available. Ships hired by Mercenaries are available for Rapid Advance, including when black holes destroyed every incoming Ship. Direct additions still cause no black-hole entry losses. This order also applies inside nested free actions and after reloading.

**Insurance** now reads: “During the ACTIONS phase, while you still have action tokens on the board, each time your turn is skipped because none of your action tokens are on top of a stack, gain 1 Credit or 1 Ship. Place a gained Ship anywhere you have a Settlement, or in your home system.”

Buried tokens qualify; having used your final token ends eligibility even while other players continue. A home system remains a legal Ship destination after losing every Settlement there. Other Ship destinations need an own Settlement. The engine and controls enforce both conditions. Reserve limits and Flexible economy still apply.

## Flexible economy and Reserve warnings

The Status Box now shows the **Flexible economy** subheading above **Return 1 Credit to Reserve**. The old explanatory footer is removed. Credit returns remain one at a time and preserve the current draft and turn.

The **Reserve shortfall** interrupt contains the warning, a reminder that Flexible economy could increase Reserve before applying the effect, **Go back**, and **Confirm outcome**. It has no Reserve/Credit adjustment controls, quantities or private peek controls inside it.

For a predictable shortage, **Go back** cancels the proposed effect before commitment. Return Credits in the Status Box, then retry the original action. Accepting the warning proceeds with the available result.

If a shortage follows an already committed reveal or is resumed from a save, **Go back** returns to the Status Box while keeping completed gains, revealed information and earlier commitments fixed. Return Credits there, then **Apply effect**. Production/reinforcement choices for the unfinished amount appear outside the interrupt. Confirming an outcome applies the available portion and leaves an unfunded remainder uncompleted; further effects still resolve normally. Opponent Explore rewards use their recipient's resources without advancing the acting player's turn. No completed gain or Tech hook repeats.

## Sabotage wording and payment

- The reference text uses **(cannot be discounted by Research lab)**.
- The quantity label is **Credit value (X)**.
- The explanatory paragraph under that quantity is removed; the purchase button remains.
- Sabotage pays the chosen X without a Research lab discount. X must cover the selected target's full printed value. Other Tech purchases retain Research Lab's normal discount. Selecting a different target still resets X to its printed value, and selected text retains its dark contrast.

The separate discounted/full-price Sabotage choice is removed. Existing target, Patents, final-round and one-purchase restrictions still apply. Original card artwork is preserved; readable reference text records the designer corrections.

## Efficiency and saves

Confirmation dialogs reuse their already validated proposed state when the current game is unchanged, avoiding a second full command calculation. The existing identity/revision checks still reject stale confirmations. Removed ordering and payment choices no longer generate UI controls. Rules, view rendering and replaceable art remain separate; no runtime dependency was added.

Engine **0.17.0**, schema **8**, content **ordered-techs-shortfall-review-5** records the new rule boundary. Genuine completed 0.16 histories keep their previous ordering decisions, payments, Insurance rewards and final scores. Unresolved ordering/Insurance decisions adopt the corrections when loaded; completed effects are preserved. Pending Reserve effects open with the simplified warning. Earlier supported saves still migrate, and `replayGame` reproduces the recorded history and new boundary.

## Check next

1. Own both Mercenaries and Rapid Advance. Move into black holes, hire Ships, then convert one. Check that no order chooser appears. Repeat inside the R01 chain and across reloads.
2. Bury an Insurance owner's remaining token and skip their turn more than once. Try its Ship reward at an empty home. After their final token resolves, check that no more Insurance rewards appear.
3. Trigger a predictable Reserve shortage. Go back, return Credits in the Status Box, and retry. Check the new subheading and absence of adjustment controls inside the warning.
4. Reveal an Explore reward that runs short. Go back, refill in the Status Box and apply the waiting effect; confirm that the token stays revealed and initial gains/committed Settlements do not repeat. Also try accepting a shortage with no Credits.
5. Buy Sabotage with Research Lab, switch targets and change X. Check the new wording, absence of the removed paragraph and payment of the chosen X.

Rules, DOM, persistence, complete-game and command replay checks cover these changes. Production/portable packaging verifies the artwork and JavaScript budget. Real-browser and real-phone visual/gesture checks remain outstanding; see [phone testing](PHONE_TESTING.md) and [validation](PROTOTYPE.md#validation).
