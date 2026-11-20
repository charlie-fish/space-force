# Idle-player removal and continued play

Updated 16 November 2026 · Live online policy; specification, not implemented

This confirmed five-minute policy covers **live online play**. Asynchronous play requires [its own policy](ASYNCHRONOUS_PLAY.md), with required-decision deadlines rather than treating ordinary offline waiting as inactivity. Do not apply this five-minute clock to asynchronous games.

The previous specification covered temporary disconnects, reconnection, waiting-room host handover, and pause/save. It did not define a complete in-match removal-and-skip rule. The designer has now requested that progression rule and confirmed **five minutes** and **approval by a majority of the other active players**.

## Confirmed core rule

1. After five minutes of qualifying inactivity, an option to remove the player becomes available. This is an explicit decision, not an automatic kick.
2. A strict majority of the other active players must approve. The target does not vote; the host has no unilateral override.
3. Once removed, the player forfeits participation and all remaining turns are skipped.
4. When exactly one non-removed player remains, that player immediately wins. Being the only connected browser does not by itself establish a winner.

Display the five-minute policy before a match starts. Keep it fixed during that match. The five-minute majority rule and all details P01–P05 are confirmed by the designer.

## Eligibility and voting safeguards — confirmed P01

Start a server-owned inactivity clock when the player is continuously disconnected, or when a required decision is waiting for their response. A player merely watching another player's turn is not idle for this purpose. A warning at four minutes offers I'm still here; an authenticated acknowledgement/response, or successful reconnect before removal, clears eligibility and cancels pending removal votes. An agreed table pause freezes the clock.

For the electorate, include other non-removed players who have not themselves qualified as idle. A disconnected player still within the five-minute grace remains in that electorate; someone already idle beyond the threshold cannot indefinitely block votes about other absent players. The designer confirmed this electorate definition as part of P01.

Approval needs `floor(eligible other players / 2) + 1` yes votes. For one through six eligible voters the thresholds are 1, 2, 2, 3, 3, and 4. Zero voters cannot remove anyone. Ties fail. Revalidate the clock, target, roster, and approvals atomically before applying removal; invalidate a stale vote when eligibility changes. With two players, the remaining player's approval is the required one vote and the confirmation must explain that removal ends the match.

The server serialises a last-moment response against removal. If the response is accepted first, cancel the vote. After removal commits, stale commands and old seat credentials cannot restore that player to active participation. Show a clear removal notice on return.

## Keep every phase progressing

At a safe resolution checkpoint, mark the participant forfeited and exclude them from all further turn/choice waits. Preserve completed actions and already-public information. Reject stale submissions after the new state revision.

Remove their unresolved action tokens from system stacks so they cannot block the remaining players. Preserve already-resolved slots/actions, including any token already legitimately resolved on another player's board through Cyber Attack. Clear affected draft/locked selections and let remaining players revise any choice invalidated by token removal; do not expose unrevealed slot assignments.

Skip the forfeited player's remaining PLAN placements, normal ACTIONS turns, simultaneous readiness, auction submissions, purchases, reinforcement allocations, and endgame decisions. Such forfeit skips do not trigger Insurance rewards. Pass the first-player marker and required player-order decisions over removed participants. No stranger takes the seat.

Keep the initial board, selected mode, Event deck, and round structure. A seven-player game does not replace Adams or regenerate its setup when fewer participants remain. Record starting and remaining player counts separately.

## Board state and unfinished choices — confirmed P02–P05

The designer approved these rulings, including the explicit P03 delegation wording below.

| ID | Confirmed rule |
| --- | --- |
| P02 | Automatically remove the player's action tokens from board stacks. Other components stay: Ships, Settlements, Tech ownership, and recorded resources. Pieces remain legal targets, casualty Credits stay with their owner, and applicable passive Tech effects continue. Removed players cannot win or take further turns. |
| P03 | Decisions that would break or stall the game if ignored go to the next non-removed player in player order, **to decide on behalf of the removed player**. Optional choices that can safely be ignored are declined/skipped. Preserve completed effects and revealed outcomes. |
| P04 | Cancel an unrevealed auction bid and release its reservation without exposing it. Preserve bids/payments already revealed and resolved. If a removed winner had not selected the Event, apply P03. |
| P05 | A last-player win records the final position-points snapshot and a forfeit result. Optional normal endgame choices do not delay the automatic win. Position points do not determine that winner. |

For P03, keep the removed player as the decision's original actor: ownership, costs, targets, and effects are evaluated on that player's behalf. The delegate supplies the choice and does not spend their own resources or gain the removed player's benefit merely by deciding. Supply only the information needed for that decision, without handing over the entire private seat.

Reserve/Credits/invested rockets remain accounted for in the removed participant's record. They generate no future interactive allocation waits. Automatic effects preserve the forty-rocket invariant; a decision that cannot be skipped safely follows P03. Existing pieces retain their original owner. Stack cleanup removes unresolved tokens; already-completed actions and legitimately resolved slots remain as recorded.

## Completion and private records

Apply the sole-remaining-player check after approved removal. Record status `completed`, finish reason `last_player_remaining`, and that player's winner ID, even if another participant has more position points. Do not classify this as an ordinary points victory. Under confirmed P05, store the position-points breakdown separately with `normal_endgame_scoring_completed = false` and forfeited-player flags.

If nobody remains, preserve an abandoned/no-winner result. If everyone simply disconnects, keep the game recoverable under the save/retention policy; disconnection alone does not create an automatic winner.

Privately log eligibility times/reasons, policy version and timeout, warning/acknowledgement events needed for audit, proposer, electorate/approvals, affected phase, resolution checkpoint, skipped turns, remaining roster, and result. Distinguish voluntary resignation, idle removal, ordinary completion, and abandonment. A committed removal cannot be reversed through game Undo. Any authorised record correction needs its own audit trail and is separate from the player Undo feature.

## Acceptance scenarios

- No removal option at 299 seconds; eligible at 300 seconds, subject to the reviewed inactivity definition. Watching opponents is not penalised.
- Majority thresholds work for every electorate size; a tie, zero voters, stale roster, or revived target cannot authorise removal.
- A removed host cannot veto removal; room-management duties transfer to an eligible remaining participant.
- Removal during PLAN, a blocking stack, simultaneous lock/reveal, bidding, Event selection, Tech purchase, or reinforcement never leaves an unreachable wait state.
- Hidden choices remain hidden; completed actions, revealed bids, initial setup, and mode are preserved.
- Exactly one non-removed player wins by the explicit result reason. One connected player among temporarily disconnected participants does not win automatically.
- No participant loses/gains an unaccounted rocket and no forfeited participant can act through an old tab or resume token.

Policy data: [dropout-policy.json](../catalog/dropout-policy.json). All details P01–P05 are settled. [REVIEW_CHECKLIST.md](REVIEW_CHECKLIST.md) now lists prototype checks rather than an outstanding dropout ruling. Verify that delegated decisions use the removed player as actor and that stack cleanup leaves other components intact.
