# Next development phase

23 November 2026 · Following v1.1.0 online normal turns

Live and asynchronous normal-turn multiplayer, protected public/private rooms, durable/private server state and confirmed dropout handling are implemented. The v1.0.0 local milestone remains unchanged as a reference. The [v1.1 guide](PLAYTEST_CHANGES_1.1.md) explains current scope.

1. **Run a multiplayer playtest across real devices.** Complete two-player and seven-player games using desktop Chrome/Firefox/Safari, iPhone Safari and Android Chrome. Check touch/camera controls, phone sleep, reconnect, device recovery, private bids/Foresight and final scores. Automated DOM/HTTP checks do not establish visual or real-device compatibility.
2. **Add the selectable simultaneous-action variant.** Preserve secret token/slot choices until reveal, then allow declared dependencies to switch everyone to ordered resolution. Recommend it at four or more seated players once delivered; never enable an unavailable mode. Reuse the protected seats, transaction/retry, projection and pacing service.
3. **Build the owner administration and feedback milestone.** Expose the persisted game/settings/completion/end-reason/scores/audit records, a change log and managed game-linked feedback. Add separate optional publication-news consent and export with an approved controller/privacy/retention notice. Choose owner authentication and launch policies before collecting addresses.
4. **Finish the personal first-play tutorial and production readiness.** Retain the current contextual guide; add per-seat progress and useful in-game teaching without delaying opponents. Complete accessibility, browser/device coverage, operational monitoring, capacity tests, retention/cleanup and backup/restore rehearsal.
5. **Deliver Apple and Android apps.** Use the shared service and rules; prepare signing/store accounts, app assets, privacy/support URLs and opt-in notification choices as specified in [MOBILE_APPS.md](MOBILE_APPS.md).

No rocket STLs or additional rule rulings are needed to begin these steps. The optional TTS Workshop URL and original cover binary remain asset reminders. The user should next review the multiplayer checklist and report game format, player count, round/decision and observed result; keep private recovery keys out of reports.
