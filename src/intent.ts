import {
  blackHoles,
  nameOf,
  reinforceCount,
  system,
  beforeActionHooks,
  attackCost,
  movementLosses,
} from "./engine.js";
import type { Command, Game } from "./types.js";

const total = (values: Record<string, number> = {}) =>
  Object.values(values).reduce((a, b) => a + b, 0);

/** Confirm draft consequences without changing the rules or exposing a hidden result. */
export function intentWarnings(game: Game, command: Command): string[] {
  const messages: string[] = [];
  const effect =
    command.type === "act" && game.context
      ? {
          ...command,
          type: "resolve" as const,
          action: game.context.kind,
          system: game.context.system,
          invest: false,
        }
      : command;
  command = effect;
  if (
    command.type === "resolve" &&
    !command.invest &&
    !(
      game.pending?.kind !== "action" &&
      beforeActionHooks(game, command.action).length
    )
  ) {
    if (command.action === "move" && !command.reveal && !total(command.sources))
      messages.push(
        "No Ships are selected to move. Use your MOVE INTO action without moving any Ships?",
      );
    if (
      command.action === "settle" &&
      command.settlements &&
      !total(command.settlements) &&
      !Object.values(command.replacements ?? {}).some(
        (targets) => total(targets) > 0,
      )
    )
      messages.push(
        "No Settlements are selected. Use your SETTLE action without settling any Ships?",
      );
    if (command.action === "attack") {
      const sacrifice = command.attack?.sacrifice ?? 0;
      if (!sacrifice)
        messages.push(
          "No Ships are selected to sacrifice. Use your ATTACK action without attacking any Ships?",
        );
      else {
        const needed = attackCost(
          game,
          total(command.attack?.ships),
          Object.values(command.attack?.settlements ?? {}).reduce(
            (n, targets) => n + total(targets),
            0,
          ),
        );
        if (sacrifice > needed)
          messages.push(
            `You chose to sacrifice ${sacrifice} Ships, but these targets need only ${needed}. The ${sacrifice - needed} extra Ship${sacrifice - needed === 1 ? "" : "s"} will also be destroyed and become your Credits. Are you sure?`,
          );
      }
    }
  }
  const destination =
    command.type === "resolve" && command.action === "move" && !command.invest
      ? command.system
      : command.type === "move" && game.pending?.kind === "move"
        ? game.pending.system
        : null;
  if (destination && (command.type === "resolve" || command.type === "move")) {
    const target = system(game, destination),
      incoming = total(command.sources);
    if (target.revealed && incoming && blackHoles(target)) {
      const holes = blackHoles(target),
        losses = movementLosses(
          game,
          target,
          command.sources ?? {},
          command.carried,
          command.passengerLosses,
        ),
        lost = losses.total;
      messages.push(
        `You are sending ${incoming} Ship${incoming === 1 ? "" : "s"} into ${nameOf(target)}, which has ${holes} black hole${holes === 1 ? "" : "s"}. ${lost} incoming Ship${lost === 1 ? "" : "s"} will be destroyed and returned as Credits.${losses.carried.some((n) => n > 0) ? ` Gravity Drive casualties: ${losses.own} of your Ships and ${losses.passengers.reduce((n, v) => n + v, 0)} carried opponent Ships.` : ""}`,
      );
    }
  }
  if (command.type === "allocate" && game.phase === "reinforce") {
    const available = reinforceCount(game),
      allocated = total(command.ships);
    if (allocated < available)
      messages.push(
        `You can place ${available} reinforcement Ships, but selected only ${allocated}. Leave ${available - allocated} in Reserve and continue?`,
      );
  }
  return messages;
}

export function reserveNotice(game: Game) {
  const pending = game.pending;
  return pending?.kind === "ack" &&
    (pending.title === "Reserve limit" || pending.title === "Reserve empty")
    ? pending
    : null;
}

/** A draft may not preview an Explore reward or the face of a hidden system/card. */
export function revealsHiddenInformation(before: Game, after: Game): boolean {
  if (before.events.length !== after.events.length) return true;
  return before.systems.some((old, i) => {
    const next = after.systems[i];
    return (
      (!old.revealed && next.revealed) ||
      old.planets.some(
        (p, j) => p.explore !== null && next.planets[j]?.explore !== p.explore,
      )
    );
  });
}
