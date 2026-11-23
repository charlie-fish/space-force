# Prototype 0.22 · Event decks and board choices

22 November 2026 · [Implementation branch](https://github.com/charlie-fish/space-force/tree/prototype/normal-turns) · [Downloadable builds](https://github.com/charlie-fish/space-force/actions/workflows/prototype.yml)

This update applies the designer's player-count correction and board interaction requests. All 30 Techs and Events remain available in local normal-turn play.

## Event decks

| Players | Cards drawn at setup | Normal final round |
| --- | ---: | ---: |
| 2–3 | 10 | 6 |
| 4–7 | 8 | 5 |

This applies to every new setup, including all three test batches. Each batch is still a pool of ten different Events; four-plus-player games shuffle and draw eight of that pool. Replay the same map code/settings and select the other card from each pair to test the eight drawn effects. Use a different map code to sample the two omitted cards, or use two/three players to include all ten. The Event view shows the initial deck size.

Ragnarök can still bring the end forward. The final Economy still includes Tech purchases before scoring, as confirmed by R03.

## Changes to check

- **Board choices:** click/tap a legal system, planet or selectable edge to select the matching Status Box control. Double-click/double-tap selects and uses its current confirmation button. Feature Techs, Rapid Advance, Event system/planet choices, Filibuster and Insurance support this. Invalid targets and disabled confirmations cannot commit. The explicit controls remain available for keyboard use and changing a draft.
- **Several quantities or targets:** the shortcut confirms the **whole current draft**, just like the Status Box button. Edit quantities first when necessary. Stealth Invasion initially previews up to three available Ships in the board-selected system; changing the system moves an untouched preview. Once you edit quantities, the draft remains as edited. Prophecy adds a selected planet once; a second tap confirms instead of removing it. Its distinct-system and three-token limits still apply.
- **Allocations:** Investments/Reinforcements retain click-to-add-one. A confirming second click does not add another rocket. Existing empty-action, Reserve, black-hole and unused-reinforcement warnings remain in force. Pan, pinch, cancelled gestures, view changes and a changed decision cannot turn into a double-tap. Orienting an unexplored system retains tap-to-rotate and explicit Commit.
- **Prophecy reminders:** inspect a system after the Event resolves. The Explore count is followed by the full effect of each face-up token, associated with its planet preview. Newly revealed face-down tokens remain hidden, even if Prophecy was previously selected. Games without revealed tokens show no effect text.
- **Migration:** choosing a system shows every player's settlement total **before Migration** and their **currently assigned** draft count, including zeroes. Original totals remain visible while editing. Changing the selected system resets its draft; confirmation still rejects ownership totals that have not been preserved.

## Existing saves and verification

New games use engine 0.22.0, schema 11 and content `event-decks-board-targets-8`. The initial deck size is recorded for deterministic replay. Supported older saves migrate through their committed commands. In-progress four-plus-player ten-card test games from 0.20/0.21 keep their original deck and six-round schedule, with a Status Box notice; start a new game for the eight-card setup.

Automated checks cover all deck modes/player counts, final-round timing, genuine older-save continuation and matching final scores, system/planet/edge board choices, mouse/touch confirmation, invalid targets, gesture cancellation, Prophecy privacy and Migration totals. All 323 checks pass, including 187 completed seeded games; strict TypeScript and static/portable packaging also pass. Compressed JavaScript is 76,670 bytes, within the 200 KB budget, with no new runtime dependencies. DOM tests do not replace real Safari/Chrome/phone verification, which remains outstanding.
