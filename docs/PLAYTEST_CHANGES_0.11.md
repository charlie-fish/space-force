# Third playtest changes — prototype 0.11.0

16 November 2026. Implements the latest desktop/narrow-window feedback. The playable scope remains local normal-turn Family/simpler Events; asynchronous play is now specified for a future milestone.

| Feedback | Result |
| --- | --- |
| iPhone ZIP opens blank | Added [phone-testing instructions](PHONE_TESTING.md) and an initial HTML loading/help message. Files is a document preview; use an HTTP(S) address in Safari. Desktop ZIP use remains supported as a playtest option. |
| No premature PLAN chip | A semi-transparent board chip appears only for the active player's selected system. No chip cursor is shown before selection. Selection clears after placement and on entering PLAN. |
| Double-click/double-tap placement | Two rapid selections of the same legal system commit once. The pair is bound to player/revision; synthetic clicks after touch, other systems, view changes and blocked systems cannot commit a stray move. The placement button remains available. |
| Top-to-bottom stack list | System status lists the top chip as 1, with subsequent chips below it. Accessible board summaries use the same direction. |
| White rocket outline | Ivory rockets have a dark outline on the board, planet illustrations, player badges and supply graphics. |
| Bold Invest and scroll | “Invest instead of acting” is bold; changing it scrolls System status to the top below the sticky header. |
| Clearer chip rims | Removed grey outer outlines, preserving owner-coloured rims and their distinct patterns. |
| Asynchronous option | Added [ASYNCHRONOUS_PLAY.md](ASYNCHRONOUS_PLAY.md), lobby/configuration links and persistent reminders. Its response/removal policy is separate; live five-minute inactivity never applies. Numerical asynchronous windows remain to be agreed before that feature is implemented. |
| Final table headings | Players; Planets Settled; Systems Patrolled; Techs Owned; Total Score; Credits. |
| Winner wording | A sole winner “rules the galaxy”; tied winners still share it. |
| Finished Status Box prompt | Removed the empty “Select a system.” prompt after scoring. Final-state inspection remains available. |
| Kessler Syndrome art | Additional belts use the supplied page-seven feature token, rotated to the selected global edge. The five-player setup belt uses the same art. |
| Artificial Warp art | Uses the supplied feature token, positioned in available space while avoiding planets, the sun and holes where possible; fleets also avoid the added warp. Planet Nine placement accounts for it. |
| Last-round Disruptor | Has no placement effect or required placement choice in the final round. Card/detail text explains this; ownership still scores its usual point. |
| View scrolling | B/T/E/A/P and view controls retain approximately 2cm more content above the panel, in addition to the sticky-header allowance. |
| Remove duplicate turn title | Kept the highlighted player badge/name and its next-step prompt; removed the repeated possessive turn text. |
| System names above graphics | Names are in the final board overlay layer, above chips and all other system art. Each semi-transparent bar is measured from its own text, with about three screen pixels of padding each side. |
| Camera controls | The last three controls are −, +, Reset View, making Reset View rightmost. |
| History collapsed by default | “Since your last turn” renders collapsed, even after it was expanded in the preceding rendered state. |
| Select a highlighted stack | Replaced the old “highlighted chip” wording with “highlighted stack”. |
| Stronger legal-stack outline | A 2.5px opaque coloured ring marks the top chip; it remains behind the whole stack so it does not cover lower rims. Hover/focus changes its colour. |
| Explore result wording | The message begins “+2 Credits:” or the relevant quantity, omitting the redundant “Explore” prefix under the Explore result heading. |

## Efficiency and compatibility

Unchanged board geometry is cached per system. Coordinates/features and occupied fleet slots invalidate the relevant cache; ownership-only and draft edits reuse it. Chip rims/patterns are defined once per player in the board SVG and referenced by each chip. Standalone action-board, cursor and dragged chips retain self-contained artwork. No runtime dependency was added.

In one local repeated-layout microbenchmark, 260 layout requests took approximately 4.22 seconds before caching and 0.14 seconds after; every resulting position matched exactly. This measures repeated geometry work, not browser frame rate, page-load speed or real-phone performance.

Old 0.8, 0.9 and 0.10 saves migrate by replay. A genuine completed 0.10 record preserves its scores/winners, and a saved final Disruptor choice now progresses without a dead-end placement.

All **96 automated tests** pass, including complete seeded games across every player count and the new interaction/migration/cache checks. Strict TypeScript, production/portable packaging, all 85 artwork references and compressed-bundle limits pass. Initial JavaScript is about 49 KB compressed; initial JS/CSS/cover total is about 112 KB before HTTP headers.

The designer has tested on desktop and in a narrow desktop window. Formal cross-browser and real-phone visual/gesture checks remain outstanding. The current iPhone Files preview attempt is not a Safari playtest.
