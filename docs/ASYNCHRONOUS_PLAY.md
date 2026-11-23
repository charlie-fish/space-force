# Asynchronous play

23 November 2026 · Normal-turn implementation available in v1.1.0

Asynchronous rooms let players take decisions on separate visits. They share the same authoritative rules/service as live rooms, with protected seat recovery, persistent pending choices, private sealed bids, catch-up history and server-owned deadlines. Format and action resolution are separate: normal turns are implemented; simultaneous secret choices remain future work.

The designer confirmed a default **48-hour response window plus 24-hour grace period**. Hosts may configure 1–168 response hours and 1–72 grace hours before the match starts. All players review these settings before Ready; changing settings clears readiness. A required decision starts its own clock. Concurrent bidders each have their own response window. Offline waiting never invokes the live five-minute rule.

At the response deadline the interface warns; after grace the seat qualifies for a removal vote. Reopening the app does not extend a deadline. An accepted response cancels pending removal votes. Votes remain open while eligibility persists; a separate closing deadline is not imposed. Eligible other players must supply a strict majority; already-overdue/removed players and the target are excluded. A unanimous table pause freezes deadlines; any active player may resume. The last response/removal transaction to be accepted determines the resulting state without duplicate actions.

After removal, [P02–P05](DROPOUTS.md) apply: remove unresolved stack tokens, retain other components, skip future turns, delegate necessary choices and award immediate last-player victory. Initial layout/deck/round count stays fixed. Mere disconnection is not forfeiture.

Your games shows pending seats and required responses. The Status Box shows absolute local time plus relative time remaining, and actions since that seat's previous decision. These are in-app reminders; optional email/push reminders need a separate opt-in and remain future work. Publication-news consent must never be reused for game notifications.

Validation includes durable restart, unchanged deadlines on return, 48+24 eligibility, delegated setup, pause/resume, independent clients and complete games. Real-phone/backgrounding tests remain on the [review checklist](REVIEW_CHECKLIST.md). See [online play](ONLINE_PLAY.md) for joining, credentials, transport and deployment.
