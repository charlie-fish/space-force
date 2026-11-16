import { applyCommand, assertInvariants, createGame } from "./engine.js";
import type { Command, Game } from "./types.js";

/** Upgrade genuine 0.8 command records without discarding an in-progress game. */
export function restoreGame(value: unknown): Game {
  const stored = value as Game & { engine: string; schema: number };
  if ((stored as { engine: string }).engine === "0.8.0") {
    const old = value as {
      schema: number;
      content: string;
      revision: number;
      seed: number;
      players: { name: string }[];
      commands: { actor: number; command: Command }[];
    };
    if (
      old.schema !== 1 ||
      old.content !== "family-simple-events-1" ||
      !Array.isArray(old.commands) ||
      old.commands.length !== old.revision ||
      !Array.isArray(old.players)
    )
      throw Error("Invalid legacy save.");
    let game = createGame(
      old.players.length,
      old.seed,
      old.players.map((p) => p.name),
    );
    const acknowledge = () => {
      if (game.phase === "event")
        game = applyCommand(game, game.turn, { type: "continueEvent" });
      if (game.phase === "pass")
        game = applyCommand(game, game.turn, { type: "nextRound" });
    };
    for (const record of old.commands) {
      acknowledge();
      game = applyCommand(game, record.actor, record.command);
    }
    acknowledge();
    assertInvariants(game);
    return game;
  }
  assertInvariants(stored);
  return stored;
}
