import {
  applyCommand,
  assertInvariants,
  createGame,
  production,
  system,
  player,
  applyConfirmedTechRules,
  applyActiveReserveRules,
} from "./engine.js";
import type { Command, Game, GameConfig } from "./types.js";

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
    config?: GameConfig;
    legacyRulesUntil?: number;
    reserveRecoveryFrom?: number;
    confirmedTechRulesFrom?: number;
  };
  if (stored.engine === "0.14.0") {
    if (
      stored.schema !== 5 ||
      stored.content !== "tech-chains-simple-events-2" ||
      !Array.isArray(stored.commands) ||
      stored.commands.length !== stored.revision ||
      !Array.isArray(stored.players) ||
      !stored.config
    )
      throw Error("Invalid legacy save.");
    let game = createGame(
      stored.players.length,
      stored.seed,
      stored.players.map((p) => p.name),
      stored.config,
    );
    game.activeReserveChecksFrom = stored.revision;
    for (const record of stored.commands)
      game = applyCommand(game, record.actor, record.command);
    return game;
  }
  if (["0.15.0", "0.16.0", "0.17.0"].includes(stored.engine)) {
    const version16 = stored.engine !== "0.15.0";
    const version17 = stored.engine === "0.17.0";
    if (
      stored.schema !== (version17 ? 8 : version16 ? 7 : 6) ||
      stored.content !==
        (version17
          ? "ordered-techs-shortfall-review-5"
          : version16
            ? "confirmed-techs-reserve-recovery-4"
            : "all-techs-event-tracker-3") ||
      !Array.isArray(stored.commands) ||
      stored.commands.length !== stored.revision ||
      !Array.isArray(stored.players) ||
      !stored.config
    )
      throw Error("Invalid legacy save.");
    let game = createGame(
      stored.players.length,
      stored.seed,
      stored.players.map((p) => p.name),
      stored.config,
    );
    game.legacyRulesUntil = version16
      ? stored.legacyRulesUntil!
      : stored.revision;
    game.reserveRecoveryFrom = version16
      ? stored.reserveRecoveryFrom!
      : stored.revision;
    game.confirmedTechRulesFrom = version17
      ? stored.confirmedTechRulesFrom!
      : stored.revision;
    game.activeReserveChecksFrom = stored.revision;
    let recovery: { before: Game; index: number } | null = null;
    for (const [index, record] of stored.commands.entries()) {
      const before = game;
      game = applyCommand(game, record.actor, record.command);
      if (
        game.pending?.kind === "ack" &&
        game.pending.messages.some((m) => m.includes("Reserve"))
      ) {
        if (record.command.type !== "returnCredits")
          recovery = { before, index };
      } else recovery = null;
    }
    // An unacknowledged old shortfall can use the new continuation, without undoing its gains.
    if (recovery && !version16) {
      let upgraded = {
        ...recovery.before,
        reserveRecoveryFrom: recovery.before.revision,
      };
      for (const record of stored.commands.slice(recovery.index))
        upgraded = applyCommand(upgraded, record.actor, record.command);
      if (upgraded.pending?.kind === "reserve") game = upgraded;
    }
    applyConfirmedTechRules(game);
    applyActiveReserveRules(game);
    assertInvariants(game);
    return game;
  }
  if (["0.8.0", "0.9.0", "0.10.0", "0.11.0"].includes(stored.engine)) {
    const expected =
      stored.engine === "0.8.0"
        ? 1
        : stored.engine === "0.9.0"
          ? 2
          : stored.engine === "0.10.0"
            ? 3
            : 4;
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
    // Older migrations can insert acknowledgements or remove obsolete commands.
    game.activeReserveChecksFrom = Number.MAX_SAFE_INTEGER;
    const advanceAddedPauses = () => {
      if (stored.engine === "0.10.0" || stored.engine === "0.11.0") return;
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
    let obsoleteDisruptorChoice = false;
    for (const record of stored.commands) {
      advanceAddedPauses();
      if (obsoleteDisruptorChoice && record.command.type === "feature") {
        obsoleteDisruptorChoice = false;
        continue;
      }
      obsoleteDisruptorChoice =
        record.command.type === "buy" &&
        record.command.tech === "tech.disruptor" &&
        (game.finalEconomy || game.round >= (game.players.length <= 3 ? 6 : 5));
      if (record.command.type === "nextRound" && game.phase === "plan")
        continue;
      let command = record.command;
      if (
        command.type === "resolve" &&
        command.action === "produce" &&
        command.credits === undefined
      )
        command = {
          ...command,
          credits: Math.min(
            player(game).reserve,
            production(game, system(game, command.system)),
          ),
        };
      game = applyCommand(game, record.actor, command);
    }
    advanceAddedPauses();
    game.activeReserveChecksFrom = game.revision;
    const previousTurn = game.turn;
    applyActiveReserveRules(game);
    if (game.turn !== previousTurn && game.decisions.length)
      game.decisions[game.decisions.length - 1].player = game.turn;
    assertInvariants(game);
    return game;
  }
  assertInvariants(value as Game);
  return value as Game;
}
