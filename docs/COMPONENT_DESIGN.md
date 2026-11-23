# Component design and player identity

Updated 17 November 2026. Seven distinct rocket silhouettes, poker-chip rim patterns and snapping are implemented locally. The designer approves the current rocket appearances; the STL handoff is closed.

## Visual reference

Use the supplied `SPACE FORCE.png` front-cover graphic as the branding reference: dark violet space, orange and sage spacecraft, cream highlights, textured illustration, and retro lettering. Preserve it as a replaceable cover asset. Detailed card text and interactive controls still need readable semantic HTML/SVG.

The six original player rocket silhouettes come from **rulebook page 2**, not from recolouring the spacecraft on the cover. Preserve those visibly different outlines. Add a seventh distinct silhouette in a new player colour. The current SVG appearances are accepted; STL verification is no longer required.

The accepted seventh-player style is **orange (`#E58A43`)**, a **twin-pod rocket silhouette** (two rocket bodies joined by a narrow bridge), and a **triangular chip-rim pattern**. These implemented visual choices are designer-approved and remain replaceable for future art. Keep the seventh silhouette and rim pattern distinct from all six original identities, including in greyscale.

## Supply and ownership

| Component | Per player | Seven-player supply | Identification |
| --- | ---: | ---: | --- |
| Rockets | 40 | 280 | Player colour plus that player's distinct rocket shape |
| Action tokens | 4 | 28 | Poker-chip face in player colour with matching rocket silhouette; distinct rim/side pattern |
| Player action boards | 1 | 7 | One separate board for each player, each with four receiving indentations |
| Shared player aid | — | 1 | Both faces visible together in the Player Aid view for every player |

Keep all seven identities stable across the board, chips, action boards, player summaries, action history, tooltips, and scoring. The seventh player is part of current scope. Any future increase beyond seven needs further distinct identities and rules. Do not identify a player using colour alone.

The seventh player adds 40 rockets, four chips, and one action board. There is only **one shared player aid**, with both sides visible to every player: side by side on wide screens and stacked in the same scrollable view on phones. Other shared supplies remain 30 Tech cards, 30 Event cards, 16 Explore tokens, four additional feature tokens, and one first-player marker. There are fourteen system designs in the asset catalogue; six/seven-player boards use the original twelve plus exactly one special centre, for thirteen systems in play. See [game-configuration.json](../catalog/game-configuration.json).

Rockets use the same player's shape in every role. Clearly distinguish Ships, Settlements, Credits, Investments, Reserve, and Tech markers through location and role presentation, without changing their owner's identity.

## Poker-chip action tokens

Make the tokens look like poker chips. Print each face with the player's colour and rocket shape, with sufficient contrast for the silhouette to remain recognisable. Give each player a different rim/side pattern that remains visible when tokens are stacked. Pattern assignment must be stable; exact pattern artwork can be refined during the visual prototype.

Show the true order of a stack and which chip is on top. Use a small visual offset or exposed sidewall so underlying players and rim patterns can be inspected without changing the logical stack. Provide a tap/focus stack detail view and accessible labels for ownership and order.

A chip's logical location is a system's centre anchor or one of its owner's action-board slots. Visual offsets for a stack must never alter the logical location or ordering.

## Shared size and snap geometry

Define a shared chip diameter in board coordinates, rather than fixing an unrelated screen-pixel size for each component:

`chip diameter = system sun diameter = action-board receiving cutout diameter`

Each system has a centre anchor at its sun. A placed action token snaps to that anchor and joins the top of its stack. When resolved, it snaps into the semicircular indentation for its chosen action on its owner's board. The four slots are MOVE INTO, SETTLE, PRODUCE, and ATTACK. There are seven separate action boards, one per player.

Scale the artwork and geometry together when zooming or resizing. Normalise centre/sun measurements across the final tile assets; do not guess them from screen pixels after an image has loaded. Touch hit areas may be larger than visible pieces without changing the shared visible diameter. Tapping a legal system or slot must support the same snap result as dragging.

Use the sun of **Asimov** as the centre anchor in six-player games, and the sun of **Adams** in seven-player games. Both designs are supplied in `13th hex.pdf`. Asimov replaces the former blank-centre placeholder; it has no planets. Adams is a home system with a capacity-six planet, four capacity-two planets, and a black hole. Each special tile is allowed only at its stated player count and central position.

## Asset status

- The designer has confirmed that the original twelve system hexes are the latest versions. Routine transcription/geometry checks still apply when encoding them.
- Asimov and Adams have been supplied. Use Asimov only at the six-player centre and Adams only at the seven-player centre. Neither enters a random tile pool.
- Rocket STL action closed: keep the accepted current silhouettes and continue device readability checks.
- Keep source assets, optimised web art, hit areas, and semantic game data separate so replacements do not change stable piece IDs.

The received TTS save contains 240 rockets in six colour groups sharing one mesh. Preserve the distinct-silhouette requirement from the rulebook/designer rather than adopting that shared mesh as the final player design. See [TTS_REVIEW.md](TTS_REVIEW.md), [REMINDERS.md](REMINDERS.md), and [ASSETS.md](ASSETS.md) for inventory, handoffs, and provenance.

## Future visual verification

Verify all seven silhouettes and rim patterns in greyscale, at phone sizes, and in mixed stacks. Check that keyboard focus/tap details identify every chip in order. Verify that chips sit correctly in system centres and action-board cutouts at different board zoom levels, including Asimov and Adams, and that each of the seven players has an independent four-slot board. These checks belong to the interface milestone.
