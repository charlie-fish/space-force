# In-game navigation and controls

Version 0.10 · 16 November 2026 · Local prototype implemented; remote requirements retained

The designer requires easy access to Board, Techs, Event, Actions and Supply, and Player Aid. Actions and Supply contains the player's action board with Reserve and Credits; Player Aid contains one shared two-sided reference visible to all players. Phone gestures and desktop shortcuts complement visible controls. Bindings and the local interactions below are implemented; visual browser/device validation remains pending. Remote-only controls remain planned.

## Five persistent destinations

| Destination | Contents |
| --- | --- |
| Board | Whole-map view, legal selections, system/planet details, action-token stack order, zoom controls, and Reset View |
| Techs | Shared displayed Techs, costs and public ownership, the player's owned Techs, readable card details, and purchase eligibility when relevant |
| Event | Active Event and its remaining duration; the two publicly revealed candidates and bidding/selection controls during the Event step; a clear empty state when no Event is active |
| Actions and Supply | Four action slots and their used/available/Invested/Event-blocked states, plus the player's Reserve and Credits, each with a distinct label and count |
| Player Aid | One shared reference with both faces rendered together: Actions and Play Sequence/Scoring |

Always show a compact current-turn/phase indicator, waiting/pending-action status, and the player's Reserve/Credits totals. Keep those two resource counts accessible while inspecting Techs or the Event. Actions and Supply expands them into the corresponding supply areas using the player's rocket silhouette and colour. Explain the other rocket roles through a supply breakdown so all forty rockets remain understandable.

Use a labelled bottom navigation bar or equivalent on phones. Place the Status Box above the board/views, with its own heading line. Highlight both the player/rocket badge and the possessive turn title, then put the next-step prompt immediately below in clear black text. Always include Players & supply, Reserve and Credits; show current scores in the expandable supply summary. Put the selected system, numbered chip-stack order, Explore counts and required decision here. A “Since your last turn” toggle lists actions/outcomes since the active player's preceding required decision; consecutive decisions by the same player each count. This replaces the previous-action box.

During Economy, show the supplied first-player token with its current stage highlighted. Investments and reinforcement controls use the Board. Pass the first-player marker/start the next round automatically after reinforcement; the final Economy still ends after Tech. Use “Actions” as the phase name and “Actions and Supply” as the view name. All five views remain available below the completed-game results. Provide obvious close/back controls and a Return to required action button when a decision is waiting in another view.

Preserve map pan/zoom, selected system, card scroll position, and keyboard focus when switching views. Switching views never submits a game action, loses a draft bid, or reveals a secret. Label draft previews separately from confirmed resource totals. The Event view shows only information the player is entitled to see; Foresight's private peek remains restricted.

## Phone and tablet controls

- Pinch/spread on the board zooms around the gesture focus. One-finger dragging on the board background pans it.
- During PLAN, desktop hover shows a translucent chip cursor/legal target. Clicking a system selects a changeable preview; only “Place chip here” commits it. Touch can tap, or drag a translucent chip over systems and release to select the preview; releasing off a legal target cancels the drag. Outside PLAN, select systems/planets/chips to inspect or prepare a draft.
- Swipe between detail views through a dedicated header/handle area. Panning the board or scrolling a card must not unexpectedly switch destinations.
- Provide visible zoom-in, zoom-out, Reset View, destination tabs, and accessible directional/detail controls so multi-touch or swiping is never required.
- Keep zoomed-board controls and touch hit areas usable without changing the specified visual chip/sun/cutout proportions. Provide a detail/list alternative where pieces are crowded.
- Support portrait, landscape, mobile safe areas, and on-screen keyboards. Preserve ordinary browser/text zoom outside the board's gesture area.
- Hide bracketed shortcut hints on phones/touch layouts; retain plain destination titles. Live text has a minimum size of 10pt, including board labels at reduced zoom. Source card/aid artwork has readable semantic text alongside.

The single-pointer alternatives follow [W3C guidance on pointer gestures](https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures.html).

## Shared player aid

There is **one shared player aid**, not one supply copy per player. Both faces are visible in the Player Aid view without flipping or selecting a front/back tab. Render them side by side on wider screens and stacked in the same scrollable view on phones, keeping text legible. Every player can open this reference independently. The source PDF contains repeated print copies; these do not imply extra game components.

## Desktop shortcuts

| Key | Result |
| --- | --- |
| S | Scroll to Status Box at the top of the document |
| B | Board, scrolling its panel to the top |
| T | Techs, scrolling its panel to the top |
| E | Event, scrolling its panel to the top |
| A | Actions and Supply, scrolling its panel to the top |
| P | Player aid, scrolling its panel to the top |
| R | Reset board camera |
| + / − | Zoom board in/out while the board has focus |
| Arrow keys | Pan while the board has focus |
| Escape | Close the current detail/overlay and restore focus |
| ? | Open shortcut help |

Desktop headings are Status Box (S), Board (B), Techs (T), Event (E), Actions and Supply (A), and Player aid (P); omit the brackets/keys on phones. Provide a Help reference. Character shortcuts work within the game interface or when the page body has focus, and can be disabled in preferences. Ignore them in editable fields, bid inputs, room-name forms, and feedback forms. Do not override browser/OS shortcuts using Ctrl/Cmd/Alt. Camera shortcuts do not submit moves; there is no global key that silently buys, attacks, bids, or ends a turn.

Focus-scoped/disableable character shortcuts follow [W3C guidance on character-key shortcuts](https://www.w3.org/WAI/WCAG22/Understanding/character-key-shortcuts.html). Device behaviour remains a playtest review item.

## Designer playtest refinements

Condense stacks with owner-coloured chip rims so all chips remain visible at twelve or more high. Put a thin opaque legal-top-chip ring behind the entire stack; desktop hover changes its colour without covering lower chips. Move numbered order into System status. Double the Settlement rocket size at the measured capacity anchors, retain a blank sun on system backs, and place fleet labels/Planet Nine in empty space where possible. Render every black hole with the circular Explore art; Le Guin has none by default. Show asteroid edge counts rather than edge indices.

Show linked production quantities vertically, Ships then Credits, and explain Reserve-limited output. Keep Invest directly above Commit. Empty Attack targets default to Invest, as do the previously specified impossible-action cases; the player may override this. Allow target-first combat, raising sacrifices automatically to the cost within available Ships; show chosen sacrifices / needed sacrifices and preserve the target scroller while editing. Ask before excess sacrifices or buying Genesis without a valid empty planet. SETTLE allocations and clockwise/anti-clockwise 60-degree orientation previews remain editable until their respective Commit. Reveal and orient a newly explored system before choosing Ship quantities, then require at least one Ship via an original legal entry route.

Investments default to Board, rebalance the topmost other allocation when an edit exceeds the full allocation, and support board-click placement. Reinforcements also support board clicks, cannot exceed availability, and ask before leaving usable allowance unallocated. Show token-used indicators on the four token Techs in dark text and confirm before finalising an ineffective token-Tech purchase. Sort Techs low-to-high, with Sabotage last. Board-selected Tech planets/systems/Kessler edges become the first chooser option and reset its horizontal scroll to the far left.

Non-choice Explore outcomes require Ok before continuing. If an opponent's reward displaces a committed Settlement, allow only that displaced amount to be reallocated or kept as Ships; already committed placements cannot be reduced. Pause and warn the active player whenever Reserve limits prevent the requested effect from completing in full. Use “returned as Credits” for losses. See the [complete 0.10 checklist](PLAYTEST_CHANGES_0.10.md) and [historical 0.9 checklist](PLAYTEST_CHANGES_0.9.md).

## Commit and Undo

There is no redundant Undo draft button: selecting another action or editing quantities changes the draft. Undo is available only while a move is uncommitted and no hidden information has been revealed during that resolution. Once committed, a move cannot be undone, even if no other player has acted. A hidden reveal, such as flipping an Explore token, also prevents Undo; any reveal step creates an irreversible checkpoint and its required follow-up must be completed. Disable Undo while a commit request is unresolved. A rejected request returns to an editable draft only if no state change or reveal occurred. Navigation and text-field editing are separate from game Undo. See the [confirmed undo policy](PROJECT_BRIEF.md#undo-policy).

## Idle warnings and recovery

Show a pending decision and any inactivity warning in every destination. Reading Techs must not hide a warning that a required response is outstanding. Provide an explicit I'm still here acknowledgement; camera movement need not be recorded as player activity. A warning appears after four minutes, before the confirmed five-minute removal threshold. Server state decides eligibility; browser timers only display it. See [DROPOUTS.md](DROPOUTS.md).

On reconnect, restore the interface context after synchronising authoritative game state. An invalidated draft receives a clear explanation and fresh legal choices. A removed player's old controls cannot submit actions.

## Prototype acceptance checks

Verify all five views and Reserve/Credits access on phones and desktops. Exercise pinch focus, pan/swipe separation, button alternatives, keyboard focus, text-entry shortcut suppression, readable card text, safe-area layout, preserved camera/drafts, and warnings visible in every view. No navigation or camera action may mutate game state. Both shared-aid faces must be rendered together; committed or reveal-bearing resolutions must reject Undo.

Structured defaults: [interaction-configuration.json](../catalog/interaction-configuration.json). Designer review: [REVIEW_CHECKLIST.md](REVIEW_CHECKLIST.md).
