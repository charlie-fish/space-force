# Designer review and next steps

23 November 2026 · v1.1.0 online playtest

## Check now

- [ ] Use [the online play guide](ONLINE_PLAY.md) to create a private live room and an asynchronous room from separate devices. Check invitations, public waiting discovery, Ready/settings resets and correct setup for the actual count.
- [ ] Confirm new-game options are Random/printed Tech presets and Random/No Events, with no test scenarios and a blank local map code.
- [ ] Play complete two-player and seven-player games, including Tech/Event combinations and sealed bidding in different submission orders. Verify the agreed round counts and final scores/views.
- [ ] On iPhone Safari and Android Chrome, test tapping/double-tapping, gestures, small-screen readability, phone sleep, refresh during a decision and reconnect. See [phone instructions](PHONE_TESTING.md). Narrow desktop testing does not replace this.
- [ ] Resume one protected seat in another browser using its private recovery key. Never include that key in feedback. Verify private bids and Foresight from each player's perspective.
- [ ] Exercise live warning/removal, resignation, delegated mandatory choices, unresolved stack-token removal and last-player victory. Async defaults are confirmed at 48 hours plus 24 hours grace; closing/reopening must not extend the deadline.
- [ ] Check catch-up history and inspect all five views while another player acts. Report the room format, player count, round/decision and observed behaviour.

Code and current guide: [repository branch](https://github.com/charlie-fish/space-force/tree/prototype/normal-turns), [pull request #2](https://github.com/charlie-fish/space-force/pull/2), [change log](../CHANGELOG.md), [implemented scope](PROTOTYPE.md).

## Outstanding reminders

- Rocket STLs are closed; current rocket appearances are approved.
- The TTS ZIP was received and inspected. The Workshop URL is an optional extra reference; its linked remote art/models may still need archiving.
- Archive the original cover PNG binary when available; its supplied appearance is already used as the cover reference.
- Complete the personal first-play tutorial. Its specification is incorporated and reminder issue #1 remains closed.
- Before collecting newsletter addresses, agree controller/contact, privacy notice, retention and unsubscribe/deletion handling. Before publishing mobile apps, arrange store/signing ownership and support/privacy details.
- Rehearse backups/restores and decide server monitoring, retention and stale-room/absent-host cleanup before broad launch.

## Following implementation

1. Review multiplayer on real devices, then implement selectable simultaneous secret planning and ordered dependency resolution; recommend it for four or more players when available.
2. Build owner administration for the already-persisted game/audit/results records, feedback and separate consented news export.
3. Finish personal teaching/accessibility and production operations, then deliver Apple/Android apps using the shared service.

The detailed ongoing list is [REMINDERS.md](REMINDERS.md); the delivery plan is [NEXT_PHASE.md](NEXT_PHASE.md). No additional rule interpretation or STL handoff blocks the next phase.
