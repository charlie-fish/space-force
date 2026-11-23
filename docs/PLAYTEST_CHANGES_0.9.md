# Playtest changes in prototype 0.9

These changes implement the designer's first prototype feedback. The playable scope remains local normal turns, Family Techs and simpler Events.

| Feedback | Implemented behaviour |
| --- | --- |
| Visible stack order | Thicker offset rims show the top stack. A numbered bottom-to-top ribbon shows every chip, including a full 28-chip stack, without selecting the system. Available top chips glow during ACTIONS. |
| Status Box | One box above the views/board contains the turn, Players & supply, Reserve/Credits, selected system, current decision, errors and action results. Hidden Explore-token counts appear there after a system is face-up. |
| Redundant Undo draft | Removed. Choose another action or edit quantities before committing. Accepted moves and hidden reveals remain irreversible. |
| Production | Both Ships and Credits have quantity controls and a visible total. Increasing one decreases the other. |
| Settlement positions | All 142 printed capacity indicators across 58 source planets have measured vector-circle anchors. Settlement rockets use those positions and rotate with their system. |
| Hidden system backs | A blank sun marks the chip snap position. |
| PLAN placement | Desktop uses a translucent chip cursor and legal hover previews; clicking places directly. Touch supports tap placement or dragging a ghost chip and releasing over a legal system. Releasing elsewhere cancels. Two-finger gestures pan/zoom instead of placing. |
| Exploration feedback | The Status Box shows each revealed Explore effect and the actual Credits, Ships or Settlement gained, including opponent choices and supply limits. |
| Orientation | Clockwise/anti-clockwise controls preview any number of 60-degree rotations. Commit is available only for a legal orientation; the reveal remains locked. |
| Fleet labels | Separate player badges use a search for empty space, avoiding planets, sun, printed features and previously placed badges as far as possible. Dense systems can still require some overlap. |
| Attack controls | The sacrifice control shows the available own Ships. Target maxima follow the current sacrifice budget, and reducing the sacrifice trims excess targets. Planet graphics show their existing Settlements. Protection is shown only for planets shared with an opponent. |
| Excess sacrifice | Commit opens a confirmation explaining the extra Ships that will be destroyed. Cancel preserves the draft. |
| Black holes | Loss is based only on the destination, at one Ship per black hole up to the number entering. Departures cause no loss. Movement results mention losses only when they occur. |
| Invested slots | The action board says “Invested this round” with a rocket marker, including successful Banking investments. |
| Camera and views | Fit is renamed Reset View; directional pan buttons sit beside zoom/reset. View labels include B/T/E/A/P. Actions is renamed Actions and Supply. |
| Tech display | Cards sort by printed value, low to high, with X/Sabotage last. The Status Box and persistent header show Credits. Token Techs indicate when their token is already on the board; purchase is still allowed. |
| Tech target selection | Planet/system choices on the board highlight matching Status Box options before Commit. Kessler has selectable/highlighted edge targets. |
| Genesis without a target | Buying opens a confirmation explaining that there is no empty valid planet and no bonus Settlement. |
| Planet Nine | The supplied planet token is placed in a gap chosen to minimise overlap with existing source graphics. |
| Economy | The supplied first-player token highlights Investments, Event, Tech, Reinforce or Pass as each step occurs. Events have an explicit review/continue step. After Tech, the Board opens and reinforcement controls appear in the Status Box. |
| SETTLE drafting | Add/subtract proposed Settlements across planets, preview the snapped rockets, then commit the whole allocation. If Explore creates a required choice, the committed allocation waits for that choice and then continues; it cannot be rolled back. |
| Existing saves | Version 0.8 command records are migrated by replay, including pending orientation, movement, SETTLE and Explore choices. The new acknowledgement steps are inserted without discarding the game. |

## Why the Event auction was skipped

The first prototype deliberately uses the rulebook's simpler Events variant: cards count rounds while their text and the auction are disabled. Version 0.8 advanced directly to Tech after drawing the pair, making the Event step easy to miss. Version 0.9 shows the pair and waits for “Continue to Tech”. Full Event effects and auctions remain a later milestone.

## Verification

Rules, DOM interactions, artwork geometry, old-save migration and complete-game replay are covered by automated checks. The full-game driver uses batch Settlement commands across all supported player counts. Browser/device visual playtesting remains outstanding; these checks do not establish final phone layout or real browser gesture performance.
