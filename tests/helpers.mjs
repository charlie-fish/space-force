import {
  applyCommand,
  assertInvariants,
  availableSystems,
  canMove,
  canPlan,
  createGame,
  eligibleTokens,
  featureOptions,
  freeSpace,
  legalOrientations,
  player,
  production,
  purchaseReason,
  reinforceCount,
  settlementSpace,
  system,
} from "../work/compiled/engine.js";
export * from "../work/compiled/engine.js";
export {
  ART,
  CARD_MAP,
  FAMILY,
  LAYOUTS,
  CHAIN_TECHS,
  NEW_TECHS,
  TECH_PRESETS,
  IMPLEMENTED_TECHS,
} from "../work/compiled/content.js";

export function step(g, command) {
  const next = applyCommand(g, g.turn, command);
  assertInvariants(next);
  return next;
}
export function setup(count = 2, seed = 7, config) {
  let g = createGame(count, seed, [], config);
  while (g.phase === "homes")
    g = step(g, {
      type: "home",
      system: g.systems.find(
        (s) =>
          s.planets.some((p) => p.home) &&
          !g.players.some((p) => p.home === s.id),
      ).id,
    });
  return g;
}
export function fixture() {
  const g = setup();
  g.phase = "actions";
  g.turn = 0;
  for (const p of g.players) p.unplaced = 0;
  g.systems[0].tokens = [0];
  g.systems[1].tokens = [1];
  return g;
}
export function credits(g, id, count) {
  g.players[id].reserve -= count;
  g.players[id].credits += count;
}
export function ships(g, s, id, count) {
  g.players[id].reserve -= count;
  s.ships[id] += count;
}
export function settlement(g, s, index, id, count) {
  g.players[id].reserve -= count;
  s.planets[index].owners[id] += count;
}
export function tech(g, id, name) {
  g.players[id].reserve--;
  g.players[id].techs.push(`tech.${name}`);
}

// A deterministic test driver, not a solo player shipped in the application.
export function botCommand(g) {
  if (g.phase === "event") return { type: "continueEvent" };
  if (g.phase === "pass") return { type: "nextRound" };
  const p = player(g),
    pending = g.pending;
  if (pending?.kind === "ack") return { type: "acknowledge" };
  if (pending?.kind === "redistribute")
    return { type: "redistribute", ships: pending.amount, settlements: {} };
  if (pending?.kind === "orient")
    return { type: "orient", rotation: pending.rotations[0] };
  if (pending?.kind === "move")
    return { type: "move", sources: pending.sources };
  if (pending?.kind === "action") {
    const active = system(g, pending.system);
    const command = { type: "act", bank: true };
    if (pending.action === "settle") {
      let remaining = active.ships[g.turn];
      command.settlements = Object.fromEntries(
        active.revealed
          ? active.planets.map((planet) => {
              const n = Math.min(remaining, settlementSpace(g, planet));
              remaining -= n;
              return [planet.id, n];
            })
          : [],
      );
    }
    return command;
  }
  if (pending?.kind === "rapid") {
    const option = featureOptions(g, "tech.rapid-advance")[0];
    return option
      ? { type: "rapid", planet: option.planet }
      : { type: "rapid", skip: true };
  }
  if (pending?.kind === "settle") {
    const s = system(g, pending.system);
    const planet = s.planets.find((p) => settlementSpace(g, p));
    return planet && s.ships[g.turn]
      ? { type: "settle", planet: planet.id, count: 1 }
      : { type: "finishSettle" };
  }
  if (pending?.kind === "explore")
    return { type: "explore", recipient: (g.turn + 1) % g.players.length };
  if (pending) {
    const options = featureOptions(
      g,
      pending.kind === "genesis" ? "tech.genesis" : pending.tech,
    );
    return { type: "feature", ...options[0] };
  }
  if (g.phase === "homes")
    return {
      type: "home",
      system: g.systems.find(
        (s) =>
          s.planets.some((p) => p.home) &&
          !g.players.some((p) => p.home === s.id),
      ).id,
    };
  if (g.phase === "plan") {
    if (p.techs.includes("tech.strategic-stall") && p.stalledRound !== g.round)
      return { type: "planPass" };
    // Stack half at home and half at the nearest expansion route.
    const home = system(g, p.home);
    const next =
      g.systems.find((s) => !s.revealed && canMove(g, p.id, home, s)) ??
      g.systems.find((s) => s.id !== home.id && canMove(g, p.id, home, s));
    return {
      type: "plan",
      system:
        [next, home, next, home]
          .filter(Boolean)
          .find(
            (s, i) => i === (p.unplaced - 1) % (next ? 4 : 2) && canPlan(g, s),
          )?.id ?? g.systems.find((s) => canPlan(g, s)).id,
    };
  }
  if (g.phase === "actions") {
    const options = eligibleTokens(g);
    if (!p.used.includes("move"))
      for (const s of options) {
        const from = g.systems.find(
          (o) => o.ships[p.id] > 0 && canMove(g, p.id, o, s),
        );
        if (
          from &&
          (s.revealed ||
            legalOrientations(g, s.id, { [from.id]: from.ships[p.id] }).length)
        )
          return {
            type: "resolve",
            action: "move",
            system: s.id,
            sources: { [from.id]: from.ships[p.id] },
            bank: true,
          };
      }
    if (!p.used.includes("settle")) {
      const s = options.find(
        (s) =>
          s.revealed &&
          s.ships[p.id] &&
          s.planets.some((p) => settlementSpace(g, p)),
      );
      if (s)
        return {
          type: "resolve",
          action: "settle",
          system: s.id,
          bank: true,
          settlements: Object.fromEntries(
            s.planets
              .filter((p) => settlementSpace(g, p))
              .slice(0, s.ships[g.turn])
              .map((p) => [p.id, 1]),
          ),
        };
    }
    if (!p.used.includes("produce")) {
      const s = options.find((s) => production(g, s) > 0);
      if (s)
        return { type: "resolve", action: "produce", system: s.id, bank: true };
    }
    return {
      type: "resolve",
      system: options[0].id,
      action: ["attack", "produce", "settle", "move"].find(
        (a) => !p.used.includes(a),
      ),
      invest: true,
    };
  }
  if (g.phase === "investments")
    return { type: "allocate", credits: p.invested, ships: {} };
  if (g.phase === "tech") {
    // Mix acquisition effects and passive Techs across seeds and seats.
    const index = (g.seed + g.round + g.turn) % g.market.length;
    const order = [...g.market.slice(index), ...g.market.slice(0, index)];
    return {
      type: "buy",
      tech: order.find((t) => !purchaseReason(g, t)) ?? null,
    };
  }
  if (g.phase === "reinforce")
    return {
      type: "allocate",
      credits: 0,
      ships: { [availableSystems(g)[0].id]: reinforceCount(g) },
    };
  throw Error(`Unexpected phase ${g.phase}`);
}
