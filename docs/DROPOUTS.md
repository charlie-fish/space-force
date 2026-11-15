# Idle-player removal and continued play

Version 0.5 · 15 November 2026 · Specification, not implemented

The previous specification covered temporary disconnects, reconnection, waiting-room host handover, and pause/save. It did not define a complete in-match removal-and-skip rule. The designer has now requested that progression rule and confirmed **five minutes** and **approval by a majority of the other active players**.

## Confirmed core rule

1. After five minutes of qualifying inactivity, an option to remove the player becomes available. This is an explicit decision, not an automatic kick.
2. A strict majority of the other active players must approve. The target does not vote; the host has no unilateral override.
3. Once removed, the player forfeits participation and all remaining turns are skipped.
4. When exactly one non-removed player remains, that player immediately wins. Being the only connected browser does not by itself establish a winner.

Display the five-minute policy before a match starts. Keep it fixed during that match. Proposed detailed interpretation of inactivity and the integration cases below remain for designer review; the duration and majority approval are settled.

## Eligibility and voting safeguards — proposed detail P01

Start a server-owned inactivity clock when the player is continuously disconnected, or when a required decision is waiting for their response. A player merely watching another player's turn is not idle for this purpose. A proposed warning at four minutes offers I'm still here; an authenticated acknowledgement/response, or successful reconnect before removal, clears eligibility and cancels pending removal votes. An agreed table pause freezes the clock.

For the electorate, include other non-removed players who have not themselves qualified as idle. A disconnected player still within the five-minute grace remains in that electorate; someone already idle beyond the threshold cannot indefinitely block votes about other absent players. This exact electorate definition is proposed, not an additional ruling already supplied by the designer.

Approval needs `floor(eligible other players / 2) + 1` yes votes. For one through six eligible voters the thresholds are 1, 2, 2, 3, 3, and 4. Zero voters cannot remove anyone. Ties fail. Revalidate the clock, target, roster, and approvals atomically before applying removal; invalidate a stale vote when eligibility changes. With two players, the remaining player's approval is the required one vote and the confirmation must explain that removal ends the match.

The server serialises a last-moment response against removal. If the response is accepted first, cancel the vote. After removal commits, stale commands and old seat credentials cannot restore that player to active participation. Show a clear removal notice on return.

## Keep every phase progressing

At a safe resolution checkpoint, mark the participant forfeited and exclude them from all further turn/choice waits. Preserve completed actions and already-public information. Reject stale submissions after the new state revision.

Remove their unresolved action tokens from system stacks so they cannot block the remaining players. Preserve already-resolved slots/actions, including any token already legitimately resolved on another player's board through Cyber Attack. Clear affected draft/locked selections and let remaining players revise any choice invalidated by token removal; do not expose unrevealed slot assignments.

Skip the forfeited player's remaining PLAN placements, normal ACTIONS turns, simultaneous readiness, auction submissions, purchases, reinforcement allocations, and endgame decisions. Such forfeit skips do not trigger Insurance rewards. Pass the first-player marker and required player-order decisions over removed participants. No stranger takes the seat.

Keep the initial board, selected mode, Event deck, and round structure. A seven-player game does not replace Adams or regenerate its setup when fewer participants remain. Record starting and remaining player counts separately.

## Board state and unfinished choices — proposed details

| ID | Proposed integration rule | What the designer should check |
| --- | --- | --- |
| P02 | Leave the removed player's existing Ships, Settlements, Tech ownership, and recorded resources in place. Pieces remain legal targets, normal casualty Credits remain with their owner, and applicable passive Tech effects continue. Removed players cannot win or receive new turns. | Whether the abandoned empire and its passive Techs should remain, or whether a different cleanup rule is desired. |
| P03 | Decline the removed player's future optional actions. If a compulsory public choice is still needed, delegate it to the next non-removed player in existing player order. Preserve completed effects; never reroll revealed outcomes. | Especially Event selection and mandatory card/Explore choices; the substitute selector is a game-design choice. |
| P04 | Cancel their unrevealed auction bid and release any reservation without exposing it. Preserve bids/payments already revealed and resolved. If the removed player won but had not chosen an Event, use P03 to finish selection. | Confirm this before/after-reveal distinction and delegation, rather than replaying an auction whose bids are already known. |
| P05 | For a last-player win, store a final position-points snapshot and mark it as a forfeit result; optional normal endgame choices do not delay the automatic win. | Confirm how scores from a forfeit game should appear and be included in statistics. |

Reserve/Credits/invested rockets remain accounted for in the forfeited participant's record. They generate no future interactive allocation waits. Any automatic rule affecting those pieces/resources must preserve the forty-rocket invariant; any mandatory decision owned by that participant follows the reviewed P03 policy. New choices of another participating player use the remaining roster where the rule permits; existing pieces still retain their original owner.

## Completion and private records

Apply the sole-remaining-player check after approved removal. Record status `completed`, finish reason `last_player_remaining`, and that player's winner ID, even if another participant has more position points. Do not classify this as an ordinary points victory. Under proposed P05, store the position-points breakdown separately with `normal_endgame_scoring_completed = false` and forfeited-player flags.

If nobody remains, preserve an abandoned/no-winner result. If everyone simply disconnects, keep the game recoverable under the save/retention policy; disconnection alone does not create an automatic winner.

Privately log eligibility times/reasons, policy version and timeout, warning/acknowledgement events needed for audit, proposer, electorate/approvals, affected phase, resolution checkpoint, skipped turns, remaining roster, and result. Distinguish voluntary resignation, idle removal, ordinary completion, and abandonment. An ordinary move undo cannot silently reverse a removal; any authorised result correction needs its own audit trail.

## Acceptance scenarios

- No removal option at 299 seconds; eligible at 300 seconds, subject to the reviewed inactivity definition. Watching opponents is not penalised.
- Majority thresholds work for every electorate size; a tie, zero voters, stale roster, or revived target cannot authorise removal.
- A removed host cannot veto removal; room-management duties transfer to an eligible remaining participant.
- Removal during PLAN, a blocking stack, simultaneous lock/reveal, bidding, Event selection, Tech purchase, or reinforcement never leaves an unreachable wait state.
- Hidden choices remain hidden; completed actions, revealed bids, initial setup, and mode are preserved.
- Exactly one non-removed player wins by the explicit result reason. One connected player among temporarily disconnected participants does not win automatically.
- No participant loses/gains an unaccounted rocket and no forfeited participant can act through an old tab or resume token.

Policy data: [dropout-policy.json](../catalog/dropout-policy.json). Review P01–P05 in [REVIEW_CHECKLIST.md](REVIEW_CHECKLIST.md) before treating those proposed details as settled engine rules.
