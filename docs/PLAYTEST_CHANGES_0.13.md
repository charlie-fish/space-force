# Fifth playtest changes — prototype 0.13.0

16 November 2026. This interface release keeps the existing rules-engine 0.11.0/schema 4 and save compatibility.

| Feedback | Implemented behaviour |
| --- | --- |
| Actions and Supply explanation | “Four action slots. You can do each action once per round.” |
| Distinguish adjacent chips of one colour | Each chip has two very thin black outline segments near its left/right lower rim. The middle remains unoutlined so player colours and rim patterns stay clear. The segments remain thin when zooming. |
| Status Box stack prompt | “Select a stack with your colour on top.” |
| Empty ATTACK prompt | “Use your ATTACK action without attacking any Ships?” The action remains a legal deliberate choice after confirmation. |
| Compact planet choices | Removed the inherited column layout and fixed 210/190px sizing. Target choices now flow horizontally and size to content; planet thumbnails are 44px, without the former large empty boxes. Selected-first ordering and scrolling remain available. |
| System graphics in target choices | Small 96×110px system previews show current orientation, Ships, Settlements, Explore markers, chips and space features. A compact caption names the system. The whole choice remains a normal button; preview pieces add no nested controls. |
| Hidden systems | Disruptor's unexplored targets show backs and public pieces, without exposing hidden tile fronts, planets or Explore contents. Previews work in all five views, including when the main Board SVG is absent. |

The board and system previews use the same renderer. Shared clip/chip definitions are emitted once per game view. Miniature live text uses the existing 10pt screen minimum; previews do not inherit board camera zoom.

The efficiency review added caches for unchanged legal-target lists and system-preview markup, with invalidation when a position is replaced. This avoids repeated legality searches and drawing generation during target selection while retaining engine validation on commit. Redundant chooser CSS was consolidated. No dependency or new artwork download was added.

Validation: **112 automated tests** pass, including complete seeded games across all supported player counts, supply conservation, exact replay, old-save compatibility, current-state/hidden-state previews, selection without commitment, all-view SVG references, replacement-state updates and compact chooser styles. Production/portable builds retain all 85 self-hosted assets and pass the bundle budget. Browser/phone visual review remains outstanding.
