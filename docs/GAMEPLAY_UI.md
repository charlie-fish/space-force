# In-game navigation and controls

Version 0.6 · 15 November 2026 · Specification, not implemented

The designer requires easy access to Board, Techs, Event, Actions, and Player Aid. Actions contains the player's action board with Reserve and Credits; Player Aid contains one shared two-sided reference visible to all players. Phone gestures and desktop shortcuts complement visible controls. Exact bindings/layout below are proposed defaults to validate in the first playable prototype.

## Five persistent destinations

| Destination | Contents |
| --- | --- |
| Board | Whole-map view, legal selections, system/planet details, action-token stack order, zoom controls, and Fit board |
| Techs | Shared displayed Techs, costs and public ownership, the player's owned Techs, readable card details, and purchase eligibility when relevant |
| Event | Active Event and its remaining duration; the two publicly revealed candidates and bidding/selection controls during the Event step; a clear empty state when no Event is active |
| Actions | Four action slots and their used/available/Invested/Event-blocked states, plus the player's Reserve and Credits, each with a distinct label and count |
| Player Aid | One shared reference with both faces rendered together: Actions and Play Sequence/Scoring |

Always show a compact current-turn/phase indicator, waiting/pending-action status, and the player's Reserve/Credits totals. Keep those two resource counts accessible while inspecting Techs or the Event. Actions expands them into the corresponding supply areas using the player's rocket silhouette and colour. Explain the other rocket roles through a supply breakdown so all forty rockets remain understandable.

Use a labelled bottom navigation bar or equivalent on phones. On larger screens, keep the board visible with docked detail panels where space permits. The same five destinations and names work in either layout. Provide obvious close/back controls and a Return to required action button when a decision is waiting in another view.

Preserve map pan/zoom, selected system, card scroll position, and keyboard focus when switching views. Switching views never submits a game action, loses a draft bid, or reveals a secret. Label draft previews separately from confirmed resource totals. The Event view shows only information the player is entitled to see; Foresight's private peek remains restricted.

## Phone and tablet controls

- Pinch/spread on the board zooms around the gesture focus. One-finger dragging on the board background pans it.
- Tap a system, planet, or chip to inspect/select it. Use explicit confirmations for game-changing actions.
- Swipe between detail views through a dedicated header/handle area. Panning the board or scrolling a card must not unexpectedly switch destinations.
- Provide visible zoom-in, zoom-out, Fit board, destination tabs, and accessible directional/detail controls so multi-touch or swiping is never required.
- Keep zoomed-board controls and touch hit areas usable without changing the specified visual chip/sun/cutout proportions. Provide a detail/list alternative where pieces are crowded.
- Support portrait, landscape, mobile safe areas, and on-screen keyboards. Preserve ordinary browser/text zoom outside the board's gesture area.

The single-pointer alternatives follow [W3C guidance on pointer gestures](https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures.html).

## Shared player aid

There is **one shared player aid**, not one supply copy per player. Both faces are visible in the Player Aid view without flipping or selecting a front/back tab. Render them side by side on wider screens and stacked in the same scrollable view on phones, keeping text legible. Every player can open this reference independently. The source PDF contains repeated print copies; these do not imply extra game components.

## Proposed desktop shortcuts

| Key | Result |
| --- | --- |
| B | Board |
| T | Techs |
| E | Event |
| A | Actions |
| P | Player Aid |
| R | Fit/reset board camera |
| + / − | Zoom board in/out while the board has focus |
| Arrow keys | Pan while the board has focus |
| Escape | Close the current detail/overlay and restore focus |
| ? | Open shortcut help |

Show shortcut hints beside visible controls and provide a Help reference. Character shortcuts operate only within the focused game interface and can be disabled in preferences. Ignore them in editable fields, bid inputs, room-name forms, and feedback forms. Do not override browser/OS shortcuts using Ctrl/Cmd/Alt. Camera shortcuts do not submit moves; there is no global key that silently buys, attacks, bids, or ends a turn.

Focus-scoped/disableable character shortcuts follow [W3C guidance on character-key shortcuts](https://www.w3.org/WAI/WCAG22/Understanding/character-key-shortcuts.html). Exact bindings remain a prototype review item.

## Commit and Undo

Undo is available only while a move is uncommitted and no hidden information has been revealed during that resolution. Once committed, a move cannot be undone, even if no other player has acted. A hidden reveal, such as flipping an Explore token, also prevents Undo; any reveal step creates an irreversible checkpoint and its required follow-up must be completed. Disable Undo while a commit request is unresolved. A rejected request returns to an editable draft only if no state change or reveal occurred. Navigation and text-field editing are separate from game Undo. See the [confirmed undo policy](PROJECT_BRIEF.md#undo-policy).

## Idle warnings and recovery

Show a pending decision and any inactivity warning in every destination. Reading Techs must not hide a warning that a required response is outstanding. Provide an explicit I'm still here acknowledgement; camera movement need not be recorded as player activity. A proposed warning appears after four minutes, before the confirmed five-minute removal threshold. Server state decides eligibility; browser timers only display it. See [DROPOUTS.md](DROPOUTS.md).

On reconnect, restore the interface context after synchronising authoritative game state. An invalidated draft receives a clear explanation and fresh legal choices. A removed player's old controls cannot submit actions.

## Prototype acceptance checks

Verify all five views and Reserve/Credits access on phones and desktops. Exercise pinch focus, pan/swipe separation, button alternatives, keyboard focus, text-entry shortcut suppression, readable card text, safe-area layout, preserved camera/drafts, and warnings visible in every view. No navigation or camera action may mutate game state. Both shared-aid faces must be rendered together; committed or reveal-bearing resolutions must reject Undo.

Structured defaults: [interaction-configuration.json](../catalog/interaction-configuration.json). Designer review: [REVIEW_CHECKLIST.md](REVIEW_CHECKLIST.md).
