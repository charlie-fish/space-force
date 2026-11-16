import { applyCommand, assertInvariants, createGame } from "./engine.js";
import type { Command, Game } from "./types.js";

/** Replay compatible older records, accepting only the newly added pauses. */
export function restoreGame(value: unknown): Game {
  const stored = value as {
    engine: string;
    schema: number;
    content: string;
    revision: number;
    seed: number;
    players: { name: string }[];
    commands: { actor: number; command: Command }[];
  };
  if (stored.engine === "0.8.0" || stored.engine === "0.9.0") {
    const expected = stored.engine === "0.8.0" ? 1 : 2;
    if (
      stored.schema !== expected ||
      stored.content !== "family-simple-events-1" ||
      !Array.isArray(stored.commands) ||
      stored.commands.length !== stored.revision ||
      !Array.isArray(stored.players)
    )
      throw Error("Invalid legacy save.");
    let game = createGame(
      stored.players.length,
      stored.seed,
      stored.players.map((p) => p.name),
    );
    const advanceAddedPauses = () => {
      for (let i = 0; i < 100; i++) {
        if (game.pending?.kind === "ack")
          game = applyCommand(game, game.turn, { type: "acknowledge" });
        else if (game.pending?.kind === "redistribute")
          game = applyCommand(game, game.turn, {
            type: "redistribute",
            ships: game.pending.amount,
            settlements: {},
          });
        else if (stored.engine === "0.8.0" && game.phase === "event")
          game = applyCommand(game, game.turn, { type: "continueEvent" });
        else return;
      }
      throw Error("Legacy resolution could not complete.");
    };
    for (const record of stored.commands) {
      advanceAddedPauses();
      if (record.command.type === "nextRound" && game.phase === "plan")
        continue;
      game = applyCommand(game, record.actor, record.command);
    }
    advanceAddedPauses();
    assertInvariants(game);
    return game;
  }
  assertInvariants(value as Game);
  return value as Game;
}
