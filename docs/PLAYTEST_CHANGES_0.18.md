# Prototype 0.18 playtest guide

17 November 2026. This release changes Foresight layout and restricts Reserve interruptions to the active player. Existing confirmed Tech rules remain in effect.

## Changes

- **Foresight** now appears above its **Peek at next two Events** button, using the same vertical layout as Flexible economy. Its private peek/hide behaviour is unchanged.
- **Reserve checks apply only to the active player.** A rival who receives an Explore gift gets only what their Reserve can supply. No Reserve warning, confirmation or resource handoff interrupts the acting player's turn.
- With no Reserve, a rival's Ship or Settlement gift fails automatically, even if they own Flexible economy or have Credits. The failure is recorded in game history and the acting player's committed Settlement continues normally. For a two-Ship gift with one rocket available, the rival gets one Ship and play continues.
- The active player's own later effect can still trigger its normal Reserve check, such as Banking after the same SETTLE. The rival's shortage does not suppress an active-player warning.

## Why the Reserve dialogs remain separate

They are not all functionally identical.

| Dialog | Behaviour |
| --- | --- |
| **Reserve limit / Reserve empty** | Confirm a reduced or zero result. A predictable warning permits Go back before commitment; an already committed result requires acknowledgement. |
| **Reserve shortfall** | A Flexible economy owner can also go back to the Status Box, return Credits and apply the unfinished effect. Earlier commitments and hidden reveals stay fixed. |

The existing names and controls are retained, as requested when behaviour differs. Flexible economy reminders appear only for its owner. None of these dialogs appears solely because a non-active recipient lacks Reserve.

## Saves and checks

Engine **0.18.0**, schema **9**, content **active-player-reserve-checks-6** records the active-player-only rule boundary. Completed earlier game histories retain their accepted commands and results. An old save paused on a rival's Reserve warning/recovery continues without another interruption or extra reward; completed gift amounts and the acting player's committed Settlement stay fixed. An active player's pending recovery remains available. Earlier supported saves and exact command replay remain compatible.

Test both rival gift types with an empty Reserve, with and without Flexible economy; a partially available two-Ship gift; the acting player's own subsequent shortfall; and reloads of old pending interruptions. Also inspect Foresight above its button on desktop and phone. Automated rules, DOM, save and replay checks cover the game transitions; real-browser/phone visual verification remains outstanding. See [phone testing](PHONE_TESTING.md) and [validation](PROTOTYPE.md#validation).
