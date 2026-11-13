# Decisions and information needed

Planning baseline: 13 November 2026. “Proposed” means a working recommendation, not an answer already given by the designer.

## Useful next

| ID | Item | Current position |
| --- | --- | --- |
| D01 | TTS Workshop link, saved-table JSON, associated images, and any scripts | Awaiting material. Helpful for asset extraction and layout verification; engine planning can continue without it. |
| D02 | First online play mode | Question sent: normal turns first, simultaneous variant first, or both. Proposed default if no preference: normal turns first, then the selectable variant. All options support six connected players. |
| D03 | Rules baseline and errata | Proposed baseline: written rules and cards v1.80, plus explicit corrections in the user's message. Older aid/art/video are supporting references. Ask whether any newer rulings exist, including in TTS. |

## Resolve while building the engine

The [rules review](RULES_REVIEW.md) keeps the actual questions with page references. Prioritise free-action trigger chains and Event timing; then resolve interactions as their handlers are implemented. Decisions must become versioned rules notes and meaningful test cases rather than implicit code behaviour.

For undo, the proposed default permits corrections before information reveals or subsequent actions, with table approval for a larger rollback. Ask the designer to confirm this policy before remote playtesting.

Proposed player access: invite-only rooms with guest names, a protected seat-resume token, and no compulsory player accounts. Room hosts can manage lobby seats; rules and scoring remain server-enforced. Public matchmaking, chat, competitive ratings, bots, and solo rules are not part of the stated base-game scope.

## Needed before public deployment or collecting addresses

| Item | Why it is needed |
| --- | --- |
| Preferred domain and approximate monthly hosting budget | Choose a viable realtime host, database, asset storage, and operational setup. |
| Expected playtest/public audience and simultaneous room count | Set load targets and cost limits; six players in one room does not define overall service capacity. |
| Owner/admin identity and preferred login method | Configure private administration with the real owner, without sharing a password in chat. |
| Controller/sender name, jurisdiction, and public contact address | Complete accurate privacy information and named newsletter consent. |
| Intended audience, including whether children are expected | Choose appropriate account/data practices and final privacy wording. |
| Retention preferences for game records, feedback, and unconfirmed subscriptions | Set real deletion/retention jobs and avoid retaining identifiable data indefinitely. |
| Existing mailing provider, if any | Integrate confirmation/unsubscribe handling; CSV export can be supported independently of campaigns. |
| Code licence and asset publication preferences | The GitHub repository is public; code and artwork permissions are distinct. |

These are launch inputs, not reasons to stop the rules engine or board prototype. Credentials belong in the chosen platform's secret settings, not in GitHub or this document.

## Defaults that can be revised through playtests

- Responsive HTML/SVG board with a detail panel on phones.
- Tap/click as the complete interaction model; optional dragging later.
- Short CSS/SVG animations with reduced-motion support.
- Named guest seats and invitation links for the first playtests.
- A readable in-game player aid generated from the approved rules text.
- Structured configuration records, an action log, and durable snapshots for each game.
- Active/confirmed newsletter subscribers exported by default, with suppression maintained separately.
- Current/previous major browsers as the initial compatibility target; older requirements to be named.

## Decision history

| Date | Decision/evidence |
| --- | --- |
| 2026-11-13 | User requires their `charlie-fish/space-force` GitHub repository and version control. |
| 2026-11-13 | GitHub reports the repository is public and empty, with push permission available through the connected integration. |
| 2026-11-13 | All four PDFs downloaded and reviewed; original checksums recorded. |
| 2026-11-13 | User's three extra Explore copies produce the complete 16-token supply. |
| 2026-11-13 | Written rulebook explicitly includes a simultaneous-actions variant, with two card exclusions. |
| 2026-11-13 | Video access was throttled; no claim is made to have watched or transcribed it. |

No hosting provider, paid service, final privacy text, or application deployment has been selected in this planning stage.
