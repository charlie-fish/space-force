# Source files and artwork

Inventory updated on 15 November 2026. Page references below are **one-based PDF page numbers**.

## Supplied references

| Source | Pages | Use |
| --- | ---: | --- |
| Space Force rules v1.80.pdf | 24 | Primary written rules, card almanac, simultaneous variant, and five Tech presets. |
| Space Force A4 Cardboard 1.40.pdf | 7 | Twelve system fronts, repeated action board, first-player marker, feature tokens, and Explore-token art. |
| 13th hex.pdf | 1 | Adams (left): seven-player central home system only. Asimov (right): six-player centre only. |
| SpaceForce Cards v1.80.pdf | 65 | Thirty Tech and thirty Event faces, their backs, and an additional first-player marker. |
| SpaceForce Player aid v1.50.pdf | 4 | Action reference, play sequence, scoring, quick-start layouts, and presets. Includes repeated print copies and more developed branding. |
| SPACE FORCE.png | — | Front-cover graphic supplied in chat; visual reference for branding, colours, and illustrated style. The original binary has not been archived in this checkout. |
| [Rules video](https://www.youtube.com/watch?v=b5LjEQc_m4Y) | — | Supplementary explanation. Automated access was throttled during discovery; its contents have not been verified. The rulebook itself warns the video may predate refinements. |
| Re__Space_Force_TTS_changes.zip | — | Received: save JSON and 256×256 preview, with linked artwork/models and embedded table-control Lua. See [TTS_REVIEW.md](TTS_REVIEW.md). |
| Rocket STL files | — | Awaiting the designer's files; use to verify the six original shapes, with a seventh distinct shape now also required. |

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

Banks, Attwood, Butler, Bujold, Clarke, and Simak are the six original home designs. The six other original tiles are non-home systems. **Designer correction: unused home designs are excluded from the hidden pool.** Choose hidden tiles only from the six original non-home designs. The special centre tiles below are excluded from all random pools.

[systems.csv](../catalog/systems.csv) includes all **fourteen supplied designs**. **The designer has confirmed that the original twelve system hexes are the correct latest versions.** That version check is complete. Tile layouts, planet/sun anchors, edge indices and rotations are now encoded in the [prototype data](PROTOTYPE.md#architecture-and-assets), extracted from PDF bounding boxes and checked against the source. Review their appearance during device playtests. Le Guin has four planets (2/2/1/1), and Lem has both left and right asteroid belts; these correct earlier catalogue transcriptions.

## Additional centre hexes: 13th hex.pdf

Both designs are on PDF page 1. Their restrictions come from the user's request; the PDF provides their artwork/component content.

| Design | Position on sheet | Used only for | Printed planets | Other printed features |
| --- | --- | --- | --- | --- |
| Adams | Left | Seven-player centre | One capacity-six home planet and four capacity-two planets | One black hole |
| Asimov | Right | Six-player centre | None | None; central sun is the chip snap target |

Asimov replaces the former blank-centre placeholder. Adams supplies the seventh home planet. Use the original twelve-tile outer layout plus the appropriate centre, face-up; each six/seven-player board contains **thirteen** systems. Never use both special tiles together, use them at other counts, or add them to the random home/hidden pools. Games with two to five players keep their existing layouts and original tile pools. The five-player diagram still uses the spare asteroid-belt token.

There are seven individual action boards and **one shared two-sided player aid**. Reuse the existing action-board design and display both aid faces together in the Player Aid view, side by side or responsively stacked. Repeated print copies in the four-page PDF do not imply extra aid components. Each board has four semicircular receiving indentations. Poker-chip action tokens, system suns, and these indentations have matching diameters. The full player supply is 280 rockets and 28 chips; chip colour, rocket silhouette, and rim pattern identify ownership. Details are in [COMPONENT_DESIGN.md](COMPONENT_DESIGN.md).

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

## Implemented prototype assets

The [art manifest](../src/art-data.json) maps stable component IDs to 85 optimised self-hosted WebP assets, dimensions, source pages and normalised anchors. The [extraction script](../scripts/prepare-assets.py) regenerates these from the supplied PDFs. Both aid faces are included once. The manifest also contains all 142 printed settlement-circle centres, the first-player token with Economy-stage rectangles, the Planet Nine token with its single settlement anchor, the circular black-hole Explore image, and the additional asteroid-belt/warp tokens from cardboard page 7. The belt image is vertical (64×322); rotate it by the chosen edge angle. The warp is landscape (240×182), with a semantic open-space anchor calculated at render time. Printed elongated-hole image layers are excluded from Clarke/Lem/Adams exports so the interface can place this same circular art for every hole type. Only artwork changes; semantic hole counts stay authoritative. Le Guin has no default hole. The matching cover illustration is extracted from rulebook page 1; the separately supplied PNG original remains to be archived. Full card artwork/reference data is available, while only the ten Family Tech effects are playable in this build.

## Artwork pipeline

Retain original PDFs and future source art in a controlled asset archive. Record provenance and a source checksum. Extract individual pieces with stable IDs; optimise web copies separately. Use an asset manifest to map a piece ID to its current artwork, attribution, dimensions, and fallback image. Keep planet capacities, edge barriers, and hit areas in semantic game data rather than trying to read them from the images at runtime.

Cards must have readable semantic text in the interface. Images can show the original design, but must not be the only representation of rules, costs, or available actions. New images should be replaceable without editing the engine or changing saved-game IDs. Responsive image sizes and lazy loading will keep the PDFs' print resolution out of the initial download.

The supplied front cover gives a visual direction of dark violet space, muted orange, sage green, cream, retro lettering, and textured illustration. Keep it as a replaceable cover asset; create optimised web copies when its source binary is archived. Player pieces use the six original silhouettes from rulebook page 2 plus a new seventh silhouette, checked against the forthcoming STLs where available.

The supplied sheets do not provide a standalone complete web asset set for all rocket/action pieces or all component backs. Provisional SVG rockets must provide seven different silhouettes; a single recoloured rocket would not satisfy the accessibility requirement. Player seven provisionally uses orange, a twin-pod silhouette, and a triangular chip-rim pattern. Poker-chip faces and visible rim patterns must remain distinct in greyscale and when stacked. Neutral backs are suitable provisional assets. Preserve the compatible branding in the player aid as well.

The cover is available as a visual reference in the conversation, but has no local original-file checksum yet. Do not fabricate file metadata or claim the PNG is committed. The source register records that distinction.

## Tabletop Simulator handoff

The ZIP has been received and inspected. It supplies `TS_Save_1560.json` and `TS_Save_1560.png`; the image is a preview, while component art/models are referenced by external URLs. Deck counts, transforms, snap points, dependencies, and the table-control script are inventoried in [TTS_REVIEW.md](TTS_REVIEW.md) and [tts-inventory.json](../catalog/tts-inventory.json). No imported Lua was executed. A Workshop URL remains an optional reference, not a prerequisite for using this save.

TTS saves contain setup information and references rather than embedding all image/model files. Exporting the accompanying assets avoids broken or inaccessible links. Running the mod in the Steam application is separate from inspecting and converting its files. See the official [importing guidance](https://kb.tabletopsimulator.com/custom-content/importing-mods/) and [save-file format](https://kb.tabletopsimulator.com/custom-content/save-file-format/).

The handoff reminder covers rocket STL files and records the completed hex-version check and supplied centre tiles: see [REMINDERS.md](REMINDERS.md).
