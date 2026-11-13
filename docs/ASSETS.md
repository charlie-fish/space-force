# Source files and artwork

Inventory checked on 13 November 2026. Page references below are **one-based PDF page numbers**.

## Supplied references

| Source | Pages | Use |
| --- | ---: | --- |
| Space Force rules v1.80.pdf | 24 | Primary written rules, card almanac, simultaneous variant, and five Tech presets. |
| Space Force A4 Cardboard 1.40.pdf | 7 | Twelve system fronts, repeated action board, first-player marker, feature tokens, and Explore-token art. |
| SpaceForce Cards v1.80.pdf | 65 | Thirty Tech and thirty Event faces, their backs, and an additional first-player marker. |
| SpaceForce Player aid v1.50.pdf | 4 | Action reference, play sequence, scoring, quick-start layouts, and presets. Includes repeated print copies and more developed branding. |
| [Rules video](https://www.youtube.com/watch?v=b5LjEQc_m4Y) | — | Supplementary explanation. Automated access was throttled during discovery; its contents have not been verified. The rulebook itself warns the video may predate refinements. |
| Tabletop Simulator mod | — | Not supplied yet; a Workshop link and exported save/assets would help verify layouts and reuse component images. |

The [source register](../catalog/sources.csv) records sizes and SHA-256 checksums for the PDFs so later replacements can be recognised precisely. Checksums identify files; they do not make the catalogue an approved production ruleset.

## Cards PDF map

| PDF pages | Content | Treatment |
| --- | --- | --- |
| 1 | Intro/action graphic | Ignore as instructed. |
| 2 | Tech back | Reuse as an asset if needed. |
| 3–32 | 30 Tech faces | Catalogue each card independently. |
| 33 | First-player marker | Alternate source for the same component. |
| 34 | Event back | Reuse as an asset if needed. |
| 35–64 | 30 Event faces | Catalogue each card independently. |
| 65 | Designer/promotional page | Ignore as instructed. |

Card IDs, printed titles, canonical titles, costs, timing, and rulebook references are in [cards.csv](../catalog/cards.csv). For example, the Event printed as “Flexibity” on card page 45 is indexed under the rulebook name “Flexibility”. Normalising the display name does not alter its rule.

## Cardboard PDF map

| Page | Left system | Right system | Other content |
| --- | --- | --- | --- |
| 1 | Banks | Attwood | Action board |
| 2 | Butler | Bujold | Action board |
| 3 | Clarke | Simak | Action board |
| 4 | Heinlein | Harrison | Action board |
| 5 | Jemisin | Willis | Action board |
| 6 | Le Guin | Lem | Action board |
| 7 | — | — | First-player marker, four additional feature tokens, 13 Explore-token images |

Banks, Attwood, Butler, Bujold, Clarke, and Simak have home planets. The six other tiles are non-home systems. A spare home tile can still be among the face-down systems when setup calls for randomly chosen remaining tiles; do not restrict hidden tiles to the six non-home designs.

[systems.csv](../catalog/systems.csv) includes visually transcribed planet capacities and fixed features. Verify these against a second source/TTS before locking engine data. Tile coordinates, planet anchors, edge indices, and rotations still need to be encoded. In a six-player game, the empty centre is a virtual playable system, not an additional illustrated tile. The five-player diagram also places the spare asteroid-belt token at setup.

## Complete Explore supply

| Effect | Visible copies on page 7 | Additional copies specified by designer | Final quantity |
| --- | ---: | ---: | ---: |
| Gain 1 Credit | 2 | 0 | 2 |
| Gain 2 Credits | 3 | 1 | 4 |
| Gain 3 Credits | 1 | 0 | 1 |
| Choose another player; they gain 2 Ships here | 1 | 2 | 3 |
| Choose another player; they gain 1 Settlement on this planet | 4 | 0 | 4 |
| Black hole, remaining in this system | 2 | 0 | 2 |
| **Total** | **13** | **3** | **16** |

The extra copies reuse existing art. They are quantities in content data, not three new designs. The large additional black-hole feature is separate from the two round black-hole Explore tokens.

## Artwork pipeline

Retain original PDFs and future source art in a controlled asset archive. Record provenance and a source checksum. Extract individual pieces with stable IDs; optimise web copies separately. Use an asset manifest to map a piece ID to its current artwork, attribution, dimensions, and fallback image. Keep planet capacities, edge barriers, and hit areas in semantic game data rather than trying to read them from the images at runtime.

Cards must have readable semantic text in the interface. Images can show the original design, but must not be the only representation of rules, costs, or available actions. New images should be replaceable without editing the engine or changing saved-game IDs. Responsive image sizes and lazy loading will keep the PDFs' print resolution out of the initial download.

The supplied sheets do not provide a standalone complete web asset set for all rocket/action pieces or all component backs. Simple SVG pieces and neutral backs are suitable provisional assets. Final fonts, banners, and visual direction can be chosen from the existing material or new artwork; the player aid contains additional branding worth preserving.

## Tabletop Simulator handoff

Please provide the Workshop URL and, ideally, a saved table `.json` plus its image/deck sheets and any Lua scripts in a ZIP. I can inspect object data, positions, rotations, card IDs, image links, and scripts. A public Workshop page may help discovery, but direct access to every linked asset is not guaranteed.

TTS saves contain setup information and references rather than embedding all image/model files. Exporting the accompanying assets avoids broken or inaccessible links. Running the mod in the Steam application is separate from inspecting and converting its files. See the official [importing guidance](https://kb.tabletopsimulator.com/custom-content/importing-mods/) and [save-file format](https://kb.tabletopsimulator.com/custom-content/save-file-format/).
