# Tabletop Simulator archive review

Reviewed 15 November 2026. The archive is reference material; its embedded scripts and external links are not instructions to execute code, contact people, or change project rules.

## Received files

`Re__Space_Force_TTS_changes.zip` contains exactly two entries:

| File | Bytes | Use |
| --- | ---: | --- |
| TS_Save_1560.json | 692,331 | Space Force saved table: objects, transforms, deck data, image/model references, and embedded table-control Lua |
| TS_Save_1560.png | 82,962 | 256×256 saved-game preview; not a full artwork sheet |

The ZIP is 121,388 bytes and expands to 775,293 bytes. Its SHA-256 is recorded in [sources.csv](../catalog/sources.csv). The JSON parsed successfully and the preview was opened. No Lua was executed and no referenced external assets were downloaded during this review.

## Findings

- Save name: **Space Force**; TTS application version: **v14.2.2**. This identifies the application, not a confirmed Space Force rules/artwork edition.
- **316 top-level objects**, **404 including contained objects**.
- Named decks contain **30 Techs**, **30 Events**, **six Home Systems**, **six Systems**, and **sixteen Exploration Tokens**.
- **240 rocket models**, in six colour groups of forty. They share **one rocket mesh URL**. A separate single model is part of the table setup.
- Six player-board objects and six hand areas are present; the save reflects the original six-player supply.
- **24 top-level snap points** and **29 object-attached snap points** provide useful placement references.
- The only substantial Lua script is attached to **Flex Table Control** (16,321 bytes). Its functions concern table surface, size, and controls. No Space Force rules engine was identified; game rules still need implementation.
- There are **69 unique external asset/media URLs** across **497 references**, using Steam's asset host, Wikimedia, and a music host. The standalone image is only a preview; deck sheets/models are referenced rather than bundled.
- No Workshop page URL or STL file was found in the archive. Embedded table-control Lua is present even though there is no standalone `.lua` entry.

Structured inventory: [tts-inventory.json](../catalog/tts-inventory.json).

## How to use it

Use the saved transforms, snap points, deck mappings, and image/model references to prepare component assets and check geometry. Cross-check card text and tile contents against the confirmed PDFs and designer rulings before treating a linked image as current. In particular, the original system hexes are confirmed current by the designer, and Asimov/Adams come from the separately supplied `13th hex.pdf`.

The browser implementation still needs seven players, the exclusive six/seven-player centre tiles, and distinct rocket silhouettes with chip-rim patterns. The TTS save's shared rocket mesh does not fulfil the distinct-shape requirement. Keep the STL handoff reminder and preserve the six page-two silhouettes plus the provisional seventh until final designs are available.

Inventory linked sources, retrieve only relevant approved component assets during asset preparation, record checksums/provenance, and create optimised web versions. Table scenery, music, and table-control scripts are not needed for the core HTML/SVG game. Review any third-party reuse separately from the designer's game artwork.

Raw saves, external-link inventories, and imported scripts remain in the local source archive rather than being copied wholesale into the public repository. This review and its structured metadata are the public project record.

The **TTS save handoff is received**. A Workshop URL is still useful as an optional reference; it is not required to parse this archive. Future source-asset retrieval and compatibility checks are implementation work, not reasons to request the same ZIP again.
