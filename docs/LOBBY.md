# Lobby, rooms, and mode recommendations

Updated 23 November 2026 · Public/private normal-turn lobby implemented in v1.1.0; future variant/cleanup notes retained

Current behaviour and credentials: [online guide](ONLINE_PLAY.md). Automatic absent-host handover, stale-room expiry, directory filters and simultaneous recommendations remain future refinements. The current directory labels live/asynchronous games and removes full/private/started rooms.

## Confirmed scope

The lobby lets players join a private room, browse and join public games waiting for more players, and create either a private room or a public game. The current limit is two to seven players. Keep guest access simple: a display name and available player identity, with no compulsory newsletter sign-up or permanent account.

Normal turns are implemented first; the simultaneous-actions variant follows as a selectable mode. **Recommend the simultaneous variant when there are four or more players**, while allowing the host to choose normal turns. The recommendation is guidance, not a rule change or a forced switch.

Offer live and [asynchronous online play](ASYNCHRONOUS_PLAY.md), labelled separately from normal/simultaneous action resolution. Public listings should expose/filter the pacing and show the agreed response/removal policy. An asynchronous game can be resumed between visits; its participants need not remain connected, and its removal policy does not use the live five-minute clock. The existing shared-device build remains local pass-and-play.

## Lobby and room flow

| Action | Expected experience |
| --- | --- |
| Join private room | Enter an invitation/code or follow a private link. Private rooms never appear in the public directory. Explain unavailable, expired, or full invitations without exposing private room details. |
| Browse public games | Show only live, joinable rooms in the waiting state. Display a room title, host display name, occupied seats/capacity, selected mode, and relevant preset/Event settings. Offer mode/open-seat filters and a clear empty state with a create-game action. |
| Create public game | Explicitly choose public visibility, a capacity from two to seven, and game settings. Publish the room only after creation succeeds. |
| Create private room | Create an unlisted room and share its invitation. A generic Create room flow may default to private; an explicitly labelled Create public game action creates a public room. |
| Wait for players | Show roster, connection status, ready state, settings, and who is host. Provide leave, invite, and ready controls. Refresh the public directory without disrupting focus or selections. |
| Start | The host starts after at least two seated players are connected and ready. Starting below capacity requires the final count/settings to be visible and confirmed. The actual starting count determines the board and Event setup. |
| Return to a game | Offer Continue for a protected existing seat. A room invitation does not grant ownership of an occupied seat. Explain reconnecting and synchronise before accepting another move. |

The directory lists public metadata only. It contains no email addresses, private invitation values, seat-resume credentials, bids, deck order, or private player views. In-progress games are removed from joinable listings and do not accept new random players into existing seats.

## Recommendation at four players

Use the **actual seated player count**, not the room's maximum capacity. At four through seven, show “Simultaneous actions recommended for 4+ players” alongside the mode selector and a brief explanation of reduced waiting. At two or three, retain the normal-turn starting choice while keeping either delivered mode selectable.

Re-evaluate the recommendation as players join or leave. Preserve an explicit mode choice. Changing the mode is a visible host action that resets readiness; it must never silently change a waiting or active game. Every seated player sees the final mode before confirming readiness.

While only normal turns have been implemented, do not offer an unusable mode selector or claim simultaneous play is available. The recommendation becomes actionable when that variant ships. Its card exclusions and preset replacements still apply; the recommendation itself changes no game rules.

## Ready checks and race handling

Seat allocation and start are authoritative server operations. Two users requesting the final seat cannot both succeed. The unsuccessful user receives a clear room-full result and an updated directory. Expired reservations are released, while a disconnected player's valid seat-resume credential remains distinct from a new join request.

For asynchronous rooms, readiness means the reviewed roster/settings/policy were accepted; simultaneous connection is not required.

Reset ready flags after material settings or roster changes, including mode, presets, Event variant, starting count, or visibility. Start against the exact roster/settings revision everyone reviewed. Disable double submission while a start is pending. If someone leaves or the roster changes during start, return to a reviewable waiting state rather than creating a partially joined game.

Record visibility, initial host, mode, settings, actual starting roster/count, and the configuration/version used. A host is a room-management role, not an administrator with access to private bids or other players' secrets.

## Disconnects and public-room upkeep

The server owns the room and game state. A host's browser closing must not delete a game. In a waiting room, transfer host controls to another connected participant after a visible grace period, revoke the old host role, and retain the room's visibility/settings. Provisional grace: 120 seconds, configurable after playtests.

Hide stale public listings when no connected participant can host them, and expire empty waiting rooms after a configurable idle period; proposed initial value: 30 minutes. Treat these as lobby cleanup policies, not rules for abandoning an active match.

In an active live match, reserve disconnected seats and allow recovery until the reviewed removal policy applies. The designer confirmed **five minutes** and **majority approval by the other active players**: offer an explicit removal option, skip the removed player's remaining turns, and award a win to a sole remaining participant. This is not an automatic kick or an ordinary enforced turn clock. Do not grant the seat to a stranger. [DROPOUTS.md](DROPOUTS.md) specifies server validation and confirmed P02–P05 for stack cleanup, remaining components, delegated choices, bids, and scoring; P01 eligibility details are also confirmed. The waiting-room 120-second grace and empty-room expiry above are separate proposed policies.

Provide plain-text display names/titles, bounded creation/join attempts, host kick controls before start, and a report action routed to the private admin area. Keep public visibility and abuse handling explicit. Public discovery does not require ranked matchmaking or global chat.

## Required first-play tutorial

[TUTORIAL.md](TUTORIAL.md) specifies the required first-play teaching feature. Offer personal, contextual guidance during the player's first actual game, with skip/dismiss and replay from Help. It must use the same rules and permitted state as ordinary play and must not pause opponents or expose hidden information. Add simultaneous lock/reveal/dependency guidance when that mode is delivered.

Deliver this with onboarding. The reminder issue is superseded by the specification and closed at the designer's request; implementation is not complete. See [REMINDERS.md](REMINDERS.md).

## Acceptance checks

- Private rooms are absent from directory responses, not merely hidden in the interface.
- Only joinable public waiting rooms appear; starting, full, expired, and in-progress rooms are handled correctly.
- Public creation, private invitations, guest joining, last-seat races, double starts, ready resets, and host handover work at every count from two to seven.
- The recommendation appears at four seated players, preserves host choice, and never enables an undelivered variant.
- A seven-player room can start with the correct reviewed count and applies the existing Asimov/Adams restrictions for the resulting match.
- A disconnected host or phone does not lose the game, duplicate a seat, or disclose secrets on reconnect.
- Confirmed five-minute majority removal skips remaining turns, clears blocking waits according to the reviewed policy, and distinguishes a last-player victory from mere connection loss.

Structured policy: [lobby-configuration.json](../catalog/lobby-configuration.json). Additional release checks: [PLATFORM_REVIEW.md](PLATFORM_REVIEW.md).
