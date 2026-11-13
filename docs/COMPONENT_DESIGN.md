# Component design and player identity

Confirmed by the designer on 13 November 2026. These requirements guide the future interface; this document does not claim that graphics or snapping have been implemented.

## Visual reference

Use the supplied `SPACE FORCE.png` front-cover graphic as the branding reference: dark violet space, orange and sage spacecraft, cream highlights, textured illustration, and retro lettering. Preserve it as a replaceable cover asset. Detailed card text and interactive controls still need readable semantic HTML/SVG.

The six player rocket silhouettes come from **rulebook page 2**, not from recolouring the spacecraft on the cover. The page shows six visibly different outlines. Use these consistently until the designer's rocket STL files can be used to verify the exact forms and colour mapping.

## Supply and ownership

| Component | Per player | Base-game total | Identification |
| --- | ---: | ---: | --- |
| Rockets | 40 | 240 | Player colour plus that player's distinct rocket shape |
| Action tokens | 4 | 24 | Poker-chip face in player colour with matching rocket silhouette; distinct rim/side pattern |
| Player action boards | 1 | 6 | One separate board for each player, each with four receiving indentations |

Keep identity stable across the board, chips, action boards, player summaries, action history, tooltips, and scoring. A future seventh player will need an additional silhouette and rim pattern. Do not identify a player using colour alone.

Rockets use the same player's shape in every role. Clearly distinguish Ships, Settlements, Credits, Investments, Reserve, and Tech markers through location and role presentation, without changing their owner's identity.

## Poker-chip action tokens

Make the tokens look like poker chips. Print each face with the player's colour and rocket shape, with sufficient contrast for the silhouette to remain recognisable. Give each player a different rim/side pattern that remains visible when tokens are stacked. Pattern assignment must be stable; exact pattern artwork can be refined during the visual prototype.

Show the true order of a stack and which chip is on top. Use a small visual offset or exposed sidewall so underlying players and rim patterns can be inspected without changing the logical stack. Provide a tap/focus stack detail view and accessible labels for ownership and order.

A chip's logical location is a system's centre anchor or one of its owner's action-board slots. Visual offsets for a stack must never alter the logical location or ordering.

## Shared size and snap geometry

Define a shared chip diameter in board coordinates, rather than fixing an unrelated screen-pixel size for each component:

`chip diameter = system sun diameter = action-board receiving cutout diameter`

Each system has a centre anchor at its sun. A placed action token snaps to that anchor and joins the top of its stack. When resolved, it snaps into the semicircular indentation for its chosen action on its owner's board. The four slots are MOVE INTO, SETTLE, PRODUCE, and ATTACK. There are six such action boards, not one shared board.

Scale the artwork and geometry together when zooming or resizing. Normalise centre/sun measurements across the final tile assets; do not guess them from screen pixels after an image has loaded. Touch hit areas may be larger than visible pieces without changing the shared visible diameter. Tapping a legal system or slot must support the same snap result as dragging.

The blank six-player centre needs an equivalent central snap anchor. Its final appearance is still to be added; its lack of planets does not remove its ability to hold Ships or action tokens.

## Asset and version checks

- The designer wants to confirm that the supplied system hexes are the latest versions before their art/topology is finalised.
- Add the blank centre-system hex for six-player games. It has no printed planets or space features and represents the existing central playable system.
- Await the six rocket STL designs and use them to check shape identity and colour mapping.
- Keep source assets, optimised web art, hit areas, and semantic game data separate so replacements do not change stable piece IDs.

See [REMINDERS.md](REMINDERS.md) for the handoff list and [ASSETS.md](ASSETS.md) for source-file provenance.

## Future visual verification

Verify the six silhouettes and six rim patterns in greyscale, at phone sizes, and in mixed stacks. Check that keyboard focus/tap details identify every chip in order. Verify that chips sit correctly in system centres and action-board cutouts at different board zoom levels, and that each of the six players has an independent four-slot board. These checks belong to the interface milestone.
