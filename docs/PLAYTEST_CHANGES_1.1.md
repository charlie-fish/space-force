# v1.1.0 — online normal turns

23 November 2026.

New games now offer Random Techs by default or the five rulebook presets, and Random Events by default or No Events (simple version). Local map codes start blank. Retired test scenarios remain only inside legacy-save/replay compatibility and internal regression fixtures.

The lobby supports private invitations, joinable public waiting games, 2–7 seats, readiness, host settings and handover on leave. A single server owns accepted game state. Choose live or asynchronous play; both currently use normal turns. The simultaneous-actions variant remains separate future work.

Live rooms implement the confirmed five-minute idle policy. Asynchronous rooms use the designer-confirmed 48-hour response plus 24-hour grace default, configurable before start. See [online play](ONLINE_PLAY.md) for voting, pauses, delegation, protected seat recovery and hosting.

## Try with separate devices

- Create a private room; join its invitation from another browser or phone. Review settings, Ready and start. Try all five views while someone else acts.
- Complete a sealed auction with players submitting in different orders. Verify private bids/Foresight and hidden systems/Explore effects remain private.
- Refresh during a pending choice; resume with the private recovery key on another device. Disconnect while committing, then Retry; the action should occur once.
- Try a live idle warning/removal vote and an asynchronous room. Async deadlines must survive closing/reopening; offline waiting must not start five-minute removal.
- Check action-token cleanup, delegated choices and last-player victory after resignation/removal. Verify all final views and shared final scores.
- Confirm Random/printed Techs and Random/No Events are the only new-game options, and the map field starts blank locally.

Do not put private recovery keys in feedback. Real Safari/Android visual and gesture testing remains outstanding; the desktop/narrow-window checks from previous iterations still apply.

## Verification

All 356 checks pass, plus the built-Worker integration smoke check. Automated coverage includes prior rules/Tech/Event/replay/save checks plus server authorisation and projection, concurrent joins/bids, ready/start races, nonce retries, durable restart, confirmed timing/pause/vote races, forfeiture/delegation, independent DOM sessions and complete seven-player games. The Worker smoke check executes the built artifact against the committed migrations and a D1-compatible transactional adapter.

The static/portable ZIPs remain local pass-and-play. For online play, use the hosted service or run `npm start` behind HTTPS with persistent storage; a static host alone does not provide multiplayer. v1.0.0 and older release guides remain historical snapshots.
