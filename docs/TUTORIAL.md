# First-play tutorial

Version 0.6 · 15 November 2026 · Required feature; implementation not built

The tutorial is part of the main specification. The designer requested that its reminder issue be closed after incorporation; [issue #1](https://github.com/charlie-fish/space-force/issues/1) is retained as the historical reminder, not as evidence that the feature has been implemented.

## Experience

Offer contextual guidance to first-time players during their first actual game. Guidance is personal to each player, can be dismissed or skipped, and can be replayed from Help. It uses the real rules engine and the player's permitted view of the current game, without requiring a separate scripted match, a bot, or a solo ruleset.

Show one short, relevant instruction at a time. Highlight legal choices and explain why an action is unavailable. Keep the player's current task, Commit control, resource totals, and inactivity warning accessible. Guidance must not make a move, change game rules, pause opponents, or force an opponent to follow a script.

## Teaching sequence

1. Explain the objective and the five views: Board, Techs, Event, Actions, and Player Aid. Show that the shared aid displays both faces together.
2. Explain the player's colour/shape and rocket roles, including Reserve, Credits, Ships, Settlements, Investments, and Tech markers.
3. Teach PLAN placement, ordered chip stacks, eligible top tokens, and why a turn may be skipped.
4. Introduce MOVE INTO, SETTLE, PRODUCE, ATTACK, and Invest as they become relevant. Preview consequences before commitment.
5. Explain that Undo works only for an uncommitted move with no hidden-information reveal. An Explore flip or other irreversible reveal locks that resolution; committed moves cannot be undone.
6. Teach Economy, Investments, secret bids, Event selection/duration, Tech purchases, reinforcement, and the normal end/scoring/tie rules.
7. Explain presence warnings, the confirmed five-minute majority-removal rule, and how to acknowledge being present while reading or learning.
8. When the simultaneous variant is delivered, teach secret token/slot selection, lock/reveal, and declaring dependencies. Explain Tech/Event exceptions when encountered rather than presenting the entire almanac at the start.

## Accessibility, privacy, and progress

Every step works by tap/click and keyboard, with readable text, predictable focus, reduced-motion support, and no requirement for sound. Keep the guide compatible with all five views, phone orientation changes, zoom, and reconnects. Showing the guide must not hide a pending game decision.

Remember the player's preference/progress where optional local storage is available, with a session fallback. Do not require a permanent account, email address, subscription, or new tracking identifier. Tutorial state is separate from game state: skip/replay does not rewind moves or reveal hidden information.

## Acceptance criteria

- A new player can learn during an ordinary multiplayer game, while other players independently use or skip guidance.
- Help can replay the tutorial; dismissal and progress survive navigation/reconnect where storage permits.
- Guidance uses the same legal-action and permitted-information projections as normal play, including both play modes when available.
- All five destinations, both shared-aid faces, resource roles, commit/undo limits, and idle warnings are covered.
- Instructions never commit commands, alter rules, reveal secrets, reset a match, or block opponents.
- The guide remains readable and operable with touch, keyboard, zoom, small screens, and reduced motion.

Deliver this with onboarding and verify it before release. Data reference: [tutorial-configuration.json](../catalog/tutorial-configuration.json). Interface: [GAMEPLAY_UI.md](GAMEPLAY_UI.md).
