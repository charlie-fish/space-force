# Prototype 0.19 playtest guide

17 November 2026. This release updates board layering, the player summary and exploration controls. Existing confirmed game rules remain in effect.

- **Hex artwork is the lowest board layer.** All system fronts/backs are drawn before placed components, so a neighbouring hex cannot cover an asteroid token or another piece. This fixes the reported Clarke overlap in the five-player setup. Names remain on the highest layer. Tech system previews use the same rendering parts.
- **Players & supply starts collapsed for each new required decision**, including consecutive turns by the same player and pending steps of a free-action chain. It stays as the player left it while changing views, editing a draft or returning Credits through Flexible economy.
- The summary now shows, for example, **3/4 slots used · 1 Invested**. It counts invested action-board slots, including Banking on a normal action. Additional investments from free actions are shown separately, so they do not imply more than four slots.
- During orientation, **click or tap the revealed system to rotate it clockwise by 60°**. The existing clockwise/anti-clockwise buttons remain. Other systems do not rotate it. All six previews are available; only a legal orientation can be committed. Tapping, dragging, pinching and cancelled gestures remain distinct, and a generated touch click cannot rotate twice. Rotation stays a draft until Commit orientation.
- The black-hole Explore result now says **“A black hole is added to this system. Existing Ships are unharmed.”**

## Saves and checks

Engine **0.19.0** retains schema **9** and content **active-player-reserve-checks-6**. Version 0.18 records replay into the current engine, preserving accepted effects and normalising the cosmetic black-hole message, including a pending Explore acknowledgement. Earlier supported migrations remain available. Board rotation previews and the expanded/collapsed summary remain presentation state.

Checks cover background/component ordering at every player count, the five-player asteroid, summary persistence/reset across views and consecutive turns, invested-slot/free-action counts, click/tap orientation without premature commitment, gesture separation and a saved black-hole result. Complete rules/replay campaigns and production/portable packaging also run. Real-browser and real-phone visual verification remains outstanding; see [phone testing](PHONE_TESTING.md) and [validation](PROTOTYPE.md#validation).
