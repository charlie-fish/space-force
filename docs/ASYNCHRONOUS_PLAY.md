# Asynchronous play

16 November 2026 · Required future option; specification only

The designer requires asynchronous online play in addition to local pass-and-play and live online play, including the simultaneous-actions variant. Players must be able to take their required decisions at different times and return later without keeping a browser open.

## Game options and experience

Separate the play format from action resolution. Local pass-and-play shares one device. Live online play expects participants to attend together. Asynchronous online play persists a match between visits. Normal-turn and simultaneous-action resolution retain their existing rules; asynchronous normal turns can ship first, while asynchronous simultaneous rounds still preserve secret chip/slot choices until every required submission is ready. Do not reveal a partial round or invent missing choices because a browser disconnected.

The lobby must label/filter asynchronous games, show their timing policy before joining, and require every participant to review it before starting. Asynchronous participants need not all remain connected. Start against the agreed roster/settings revision, then preserve the initial setup. Offer a clear list of ongoing games, whose response is required, what decision is waiting, and when a response is due.

Returning players see a concise catch-up history and their required decision. Persist every accepted checkpoint, support phone/desktop resume through protected seats, reject duplicate/stale submissions, and preserve the existing commit/no-reveal Undo boundary. Use server time for deadlines and show both local-date/time and relative time remaining.

## A separate removal policy

**The confirmed five-minute live-game inactivity rule does not apply to asynchronous games.** Being disconnected while waiting for a turn is expected and must not start an idle-removal clock.

An asynchronous policy must define:

- A response window starting when a required decision becomes available to that player.
- Advance warning/reminder timing, a grace period, pause handling, and exactly when removal becomes eligible.
- Approval/voting eligibility, how long an eligible vote remains open, and how a valid response cancels a pending removal.
- Fair handling of delegated choices, secret simultaneous selections, auctions, and several players becoming overdue together.

The response window, grace period and voting deadlines remain **to be agreed before implementing asynchronous removal**. No new numerical timeout is implied by the existing five-minute confirmation. Fix and record the chosen policy/version at match start; do not silently shorten an active game's deadlines.

After an approved removal, retain the established component cleanup, skipped turns, delegated mandatory choices, audit trail and last-player victory rules from [DROPOUTS.md](DROPOUTS.md). Their asynchronous eligibility/timer/electorate details need the separate policy above. Mere disconnection is never a forfeit.

In-app pending-game indicators are required. Additional turn/reminder notifications should be opt-in; any notification permission/address is separate from publication-news consent and remains subject to the privacy specification. This document authorises no messages being sent to players.

## Acceptance checks

- A player may close their browser between decisions and resume the correct pending checkpoint without losing the seat.
- Waiting offline does not trigger the live five-minute rule.
- All participants see and accept the asynchronous timing policy before starting.
- Required-decision deadlines survive server restart and are based on server time, not the browser clock.
- Catch-up history includes outcomes since the player's preceding decision without exposing others' hidden information.
- Simultaneous partial selections remain secret, and no deadline silently commits or reveals a missing selection.
- An approved removal progresses every phase and records its asynchronous policy/version and result reason.

Implementation is tracked in [REMINDERS.md](REMINDERS.md); current playable scope is in [PROTOTYPE.md](PROTOTYPE.md).
