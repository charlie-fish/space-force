# Prototype 0.20 · Events, bidding and three test batches

17 November 2026 · [Implementation branch](https://github.com/charlie-fish/space-force/tree/prototype/normal-turns) · [Downloadable builds](https://github.com/charlie-fish/space-force/actions/workflows/prototype.yml)

All 30 Event effects and sealed bidding are now implemented for local normal-turn games with two to seven players. The designer-approved current rocket appearances remain; **the action to provide rocket STLs is closed**. No new models are needed.

## Start a batch

1. Download `space-force-local-prototype` from the latest successful workflow, extract the whole ZIP, and open `index.html` on desktop. On phones use an HTTP(S) address in Safari/Chrome; [Files preview cannot run the game reliably](PHONE_TESTING.md).
2. Choose **Full Events & sealed bidding**, then an **Event scenario**. Batch 1 is the default. Choose your Tech preset independently; Last ten Techs, printed presets, Random and the R01 starting-Tech scenario remain available. Foresight is included normally with full Events.
3. Play the first round. In Economy, after Investments, two Events appear. Pass the device to the named player and select **I am … · enter bid**. Each player may bid from zero to their public Credit balance. Submitting covers the input before the next handoff.
4. After everyone commits, reveal bids together. Only the winner returns their bid to Reserve. Ties go to the earliest player in current player order, starting with first player. The winner selects one Event; the other is discarded.
5. Resolve immediate choices in the Status Box. Continuous Event text stays visible there and in Event (E). A round effect lasts through the selecting Economy, the next PLAN/ACTIONS, and the following Investments; it expires exactly at **Discard the previous Event**.
6. Replay the **same map code, player count and settings**, selecting the previously discarded card from each pair. Only one of each pair is selected, so two complementary runs are needed to exercise all ten effects. The Event view records selected/discarded cards and bids and lists the batch pool. Ragnarök adds an auction immediately and shortens the action-round count; the deck's pairs remain fixed.

Each designer test batch uses **exactly ten Events at every player count**. Standard random games follow the rulebook: ten for two/three players, eight for four to seven. Simpler Events still ignore card text and skip bidding; the labelled legacy Foresight test remains available for older Tech tests.

## The three scenarios

| Batch 1 · Economy & rules | Batch 2 · Actions & conflict | Batch 3 · Board & planning |
| --- | --- | --- |
| Communist Decree | Cyber Attack | Ragnarök |
| Economic Boom | Ceasefire | Stealth Invasion |
| Luddite Decree | Ammo Shortage | Scrambler |
| Vorsprung | Black Cloud | Multicultural Tension |
| Turtling | Alliance | Politics |
| Recession | Flexibility | Gravitational Lensing |
| Capital Injection | All Your Base | Migration |
| Technological Singularity | Consolidation | Famine |
| El Mayarah | Spacetime Rip | Galactic Summit |
| Earth First | Hive Mind | Prophecy |

## What to check

- **Economy:** Communist Decree/Turtling return all Credits before rewards. Economic Boom doubles Invested rockets, including Banking, and survives through cash-in. Luddite suppresses Tech powers, prices/protection and acquisition effects while ownership still scores. Vorsprung's free claim consumes a Reserve marker and resolves its acquisition without using the ordinary Tech purchase. Technological Singularity adds four unused display cards. El Mayarah doubles only the selector's shared-planet production. Capital Injection allows up to ten Credits.
- **Actions:** Cyber Attack allows any top token but only unused receiving slots, displaying the borrowed token's colour. Flexibility separates the chosen action from its receiving slot. Ceasefire/Recession require Investment of ATTACK/PRODUCE, including free actions. Black Cloud forbids Ship targets; Alliance protects its selector from the chosen opponent only. Spacetime Rip changes adjacency for its selector. All Your Base and Consolidation resolve full free-action Tech chains, then return to Economy. Hive Mind gives direct Ships, one per shared planet.
- **Board/planning:** Politics leaves a blocked slot and only three PLAN tokens after cleanup. Filibuster choices precede Scrambler. Earth First restricts the first actual placed token, including after Strategic Stall. Gravitational Lensing ignores belts and disables warp jumps without changing structural board-connectivity validation. Stealth Invasion adds Ships directly to face-up systems. Migration preserves each owner's Settlement total within one system and respects capacity. Famine returns the selected half of home-system Settlements, rounded up. Galactic Summit relocates all owners' Ships without entry casualties. Prophecy adds available tokens to distinct empty face-up systems and reveals all board tokens without applying rewards until settlement.
- **Timing:** Ragnarök repeats bidding with a fresh pair and shortens the game by one round when another pair exists. With an empty deck it does nothing. Drawing the last pair still permits another action round; the later Economy that cannot draw a pair ends after Tech, without reinforcements.
- **Recovery:** Refresh during bidding, Event choice, a free action, acquisition, Reserve warning, or a revealed Explore token. Committed bids/choices remain fixed. Bid inputs stay covered after refresh. Export is unavailable during unrevealed bidding to avoid accidental disclosure; it is available after reveal and includes full setup, Event history, commands and scores.

## Confirmed and provisional interactions

The designer confirmed E01–E03 during implementation:

- Ammo Shortage + Death Sun: each sacrifice removes up to **two Ships OR two Settlements**, with separate sacrifices for mixed target types.
- End PLAN: **Filibuster before Scrambler**.
- Hive Mind: **direct Ship rewards, no PRODUCE action hooks**.

**Historical 0.20 interpretation, superseded in [0.21](PLAYTEST_CHANGES_0.21.md):** the first-token-only exception below is no longer current. On 20 November the designer confirmed E04: with Earth First active, a Disruptor targeting an opponent home system has no blocking effect throughout the affected PLAN phase.

Other implementation conventions for further review: Flexibility applies at each resolution using an unused receiving slot. Migration is a relocation, preserving ownership and not triggering SETTLE hooks or Explore tokens; unchanged existing Arcologies overflow may remain. Galactic Summit is a relocation, not MOVE INTO: it neither triggers movement Techs nor black-hole entry losses, and a hidden target stays hidden. Spacetime Rip allows non-neighbour systems as destinations; real shared asteroid edges still apply. These conventions do not replace confirmed R01–R08/C01–C04/E01–E03.

## Validation and limits

Automated rules/DOM tests cover all thirty Events, auction ties/zero bids/payment, batch coverage, active-Event expiry, forced choices, Tech combinations, pending-choice recovery and deterministic replay. Full-game tests include all three batches at all supported player counts alongside the existing Tech games. Version 0.19 and earlier supported saves replay into 0.20 while retaining their simpler/Foresight-test mode; new Event effects are never switched on in an old game.

This remains trusted-device pass-and-play. Bids are hidden in the interface during handoff, while full local state remains on the device. Authoritative remote rooms/secrets, simultaneous/asynchronous play and private administration remain later milestones. Real-browser/phone visual checks are still pending; DOM tests do not replace those playtests.
