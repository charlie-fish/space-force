# Decisions and information needed

Updated planning baseline: 13 November 2026. Confirmed items record the designer's follow-up. “Proposed” still means a working recommendation for items the designer has not answered.

## Useful next

| ID | Item | Current position |
| --- | --- | --- |
| D01 | TTS Workshop link, saved-table JSON, associated images, and any scripts | Awaiting material. Helpful for asset extraction and layout verification; engine planning can continue without it. |
| D02 | First online play mode | **Confirmed:** normal turns first, then the selectable simultaneous-actions variant. Both support six connected players. |
| D03 | Rules baseline and errata | Written rules/cards v1.80 plus the designer's explicit corrections. **R01–R08 are resolved.** Rapid Advance follows the almanac rather than its card. Older aid/art/video remain supporting references; current hex versions still need checking. |
| D04 | Cover and player identity | **Confirmed:** use `SPACE FORCE.png` as the cover reference; give each colour its own rocket silhouette from rulebook p2; use poker-chip action tokens with matching silhouettes and distinct rim patterns. Await rocket STLs. |
| D05 | Boards and chip geometry | **Confirmed:** six action boards, one per player; chips snap to system suns and board indentations, with matching chip/sun/cutout diameters. |
| D06 | System assets | **Confirmed task:** add a blank six-player centre hex. Designer to check whether the supplied system hexes are the latest versions. |

The concrete handoff checklist is in [REMINDERS.md](REMINDERS.md).

## Resolve while building the engine

The [rules review](RULES_REVIEW.md) records the confirmed answers to all eight original questions, with page references and the full five-Tech PRODUCE example. [rules-clarifications.json](../catalog/rules-clarifications.json) captures the same decisions for future engine work. Turn these rulings and the Prophecy/warp edge cases into meaningful scenarios as the engine is implemented; they are no longer outstanding questions.

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

The separate rocket silhouettes, chip face/rim identity, snapping geometry, six action boards, and normal-turn-first delivery order are confirmed requirements, not optional defaults.

## Decision history

| Date | Decision/evidence |
| --- | --- |
| 2026-11-13 | User requires their `charlie-fish/space-force` GitHub repository and version control. |
| 2026-11-13 | At initial inspection, GitHub reported the repository was public and empty, with push permission available through the connected integration; the initial planning documents were subsequently committed. |
| 2026-11-13 | All four PDFs downloaded and reviewed; original checksums recorded. |
| 2026-11-13 | User's three extra Explore copies produce the complete 16-token supply. |
| 2026-11-13 | Written rulebook explicitly includes a simultaneous-actions variant, with two card exclusions. |
| 2026-11-13 | Video access was throttled; no claim is made to have watched or transcribed it. |
| 2026-11-13 | Designer confirmed normal turns first, then the selectable variant; specified colourblind-accessible rocket/chip design and the six individual action boards. |
| 2026-11-13 | Designer corrected the hidden tile pool, answered R01–R08, and clarified Prophecy on capacity-one planets and connectivity through warps. |
| 2026-11-13 | Designer supplied `SPACE FORCE.png` as a cover reference and requested reminders for TTS files, rocket STLs, and the latest-hex check; the blank centre hex is now an explicit additional asset. |

No hosting provider, paid service, final privacy text, or application deployment has been selected in this planning stage.
