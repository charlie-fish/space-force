# Fourth playtest changes — prototype 0.12.0

16 November 2026. This release updates the interface and confirmations for the local normal-turn Family/simpler-Events game.

| Feedback | Implemented behaviour |
| --- | --- |
| Simplify Player aid | Its heading is “Player aid”. Removed the introductory slogan/explanation and the Undo definition from this view. Both shared aid faces and their other readable reference text remain available. The Undo policy is still documented in Help. |
| Empty MOVE INTO | A non-Invested action with no incoming Ships requires confirmation. Go back preserves the draft and chip; confirming permits the deliberately empty action. |
| Empty SETTLE | A non-Invested action with no selected Settlements requires the same confirmation, without removing the legal empty-action option. |
| Empty ATTACK | A non-Invested action with zero sacrifices requires confirmation. Investing the slot bypasses the empty-action warning. |
| Reserve pop-ups | Predictable Reserve limit/empty outcomes are confirmed in a modal before commitment. Go back changes no game state. Confirming accepts the outcome and its existing continuation without another Status Box step. |
| Already committed Reserve outcomes | A Reserve checkpoint reached after commitment, or restored from a saved game, uses a focused mandatory modal. Confirm outcome continues it. Committed reveals stay locked; this does not introduce post-commit Undo. Other non-choice Explore results retain their existing Status Box acknowledgement. |
| Blink selectable yellow rings | Yellow legal-stack rings blink slowly. Blue hover/focus rings remain steady. Reduced-motion preferences keep the rings steady. The ring remains behind all chips so it does not cover lower rims. |
| Player order in supplies | The list always starts with the current first player and continues in player order, independently of whose decision is active. Stored player IDs/order are unchanged. |
| Black-hole entry warning | MOVE INTO confirms the selected incoming count, destination hole count and actual expected losses before moving any Ships. Go back preserves quantities. Only destination holes count; destroyed Ships become Credits. |
| Newly explored destination | Reveal and orientation still precede quantity selection. The entry-loss warning appears at Finish movement once the revealed holes and quantities are known; cancelling it retains the committed reveal and orientation. At least one Ship must still enter. |

All confirmations are tied to the current game/revision, snapshot the submitted quantities, trap keyboard focus and block background game controls. Stale confirmations cannot commit against a replacement position. Trial resolution stays private: a hidden system/Explore result is never shown as a cancellable preview.

Application version **0.12.0 retains rules-engine 0.11.0/schema 4**. No rule or saved-state format changed. Existing saves and command records remain compatible, including the engine's Reserve continuation checkpoints.

Validation: **108 automated tests**, including 72 complete seeded games, rocket conservation, old-save migration, exact replay and the new empty-action, loss-confirmation, Reserve-modal, focus/stale-state and first-player-order cases. TypeScript, production/portable packaging, all 85 artwork references and the compressed-bundle budget are checked. Browser/phone visual verification of the pop-ups and blinking remains outstanding.
