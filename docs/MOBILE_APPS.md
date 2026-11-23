# iOS and Android applications

23 November 2026 · Required product milestone; specification only

Provide installable Space Force apps for **Apple iOS/iPadOS (iPhone and iPad)** and **Android phones and tablets**, distributed through the Apple App Store and Google Play. Mobile browser support remains a requirement. The apps are added to the product scope; version 1.0.0 is the local browser prototype milestone and does not contain native app packages.

Structured requirements: [mobile-apps.json](../catalog/mobile-apps.json).

## Shared game and services

- Reuse the browser client's rules, stable content/art IDs, draft controls and five views. Keep one rules implementation and one authoritative online service so browser, Apple and Android users can play together in the same public or private room, with up to seven players.
- Retain local pass-and-play. Expose live normal turns, simultaneous actions and asynchronous play as their respective server milestones become available, using the same rules and timing policies across platforms.
- Use the same private administration, game records/scores, feedback and optional publication-news service. Consent is separate from gameplay and from notification permission. Apply the same tutorial, accessibility and expansion requirements.
- Record app release, engine/content version and platform with each game/session. Supported client versions must interoperate with the server; show a clear update/rejoin path when an old app needs an update. Preserve existing saves during app upgrades.

The proposed implementation reuses the web client inside a small native shell, with Capacitor as the initial candidate. Validate real-device lifecycle, secure storage, deep links, notifications and store requirements in a focused prototype before selecting the shell. Keep platform adapters separate from game rules and rendering. This is an engineering recommendation, not a requirement to maintain separate native rule engines.

## Controls and lifecycle

- Provide Board, Techs, Event, Actions and Supply, and both Player aid faces. Retain the Status Box, selected-target highlights, editable drafts, double-tap confirmation, warnings and button alternatives. Use readable touch targets, safe areas and layouts for small phones and large tablets.
- Support pinch zoom, pan and carefully scoped swipes without accidental commits. Respect system text sizing, screen readers, contrast and reduced motion. Support external keyboards where available and avoid keyboard hints on ordinary touch-only layouts.
- Reconnect after lock/unlock, backgrounding, process termination and switching between Wi-Fi and mobile data. Resolve the latest accepted server revision before enabling a decision again. Retry an uncertain submission with its original command ID so a resumed app cannot act twice.
- Keep uncommitted drafts locally where safe. After a remote state change, revalidate the draft and explain any now-unavailable choices. Never commit an offline multiplayer action or invent a hidden-information result locally.
- Apply the server-owned live inactivity/removal policy when an app is backgrounded or disconnected. Ordinary asynchronous waiting uses its separate policy; push delivery does not determine whether a player is idle or removed.
- Bundle/cache the client and public artwork so local pass-and-play can work offline. Online games show connection state and reconnect controls when the network is unavailable. Cache/version artwork independently of game state and load detailed card/aid art on demand where possible.

## Invitations, notifications and security

- Open invitations using verified Universal Links/App Links, with a browser fallback. The same invitation can join a compatible app or browser. An invitation is not a credential for another player's protected seat.
- Store private resume credentials using appropriate Keychain/Keystore-backed storage. Use HTTPS/WSS and the same server-side seat authorisation and hidden-state projection as browsers. Never ship service credentials, unrevealed deck order, the Explore supply or other players' private choices in app bundles or notifications.
- Offer optional, contextual notifications for required decisions and relevant deadlines. Keep lock-screen text generic; do not expose bids, Foresight peeks, secret choices or invitation credentials. Provide per-game controls and observe system notification settings. Permission denial must leave the game usable.
- Restrict embedded game content/navigation to trusted origins, open unrelated links safely, and limit native permissions to features actually used. Keep signing keys and store/service credentials outside Git. Review any third-party SDK's collection before inclusion.
- Cover app data collection, notification tokens, optional contact details, consent withdrawal and deletion in the actual privacy notice and store disclosures. Apply the separate newsletter consent/export rules from the project brief.

## Delivery and acceptance

Implement the apps after the shared online service and cross-platform browser flow are stable. Use TestFlight and Google Play internal/closed testing before store submission. Plan for app icons, launch assets, screenshots, support/privacy URLs, age/content declarations, platform signing, update/rollback procedures and review lead time.

Completion requires:

1. Signed iOS/iPadOS and Android packages, with documented build/release steps and protected signing material.
2. A complete seven-seat game combining browser, iOS and Android participants, with correct private bids/peeks, final scores and durable history.
3. Device tests for background/resume, forced termination, network changes, duplicate submissions, invitations, notification opt-out, app updates and save recovery.
4. Phone/tablet accessibility, gesture and performance checks on supported real devices, plus offline local pass-and-play.
5. Store privacy/support information, the required tutorial and production services ready before public submission. Publish only when the store milestone is explicitly undertaken.

Store accounts, signing ownership, intended OS support, privacy/support contacts and push-provider configuration are later app-release inputs, tracked in [REMINDERS.md](REMINDERS.md). The immediate coding milestone remains [authoritative remote play](NEXT_PHASE.md).
