import { CARD_MAP } from "../work/compiled/content.js";
import {
  applyCommand,
  assertInvariants,
  availableSystems,
  canMove,
  canSoylent,
  hasTech,
  sabotageTargets,
  canPlan,
  createGame,
  eligibleTokens,
  featureOptions,
  eventTechOptions,
  prophecyOptions,
  forcedInvestment,
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
  REMAINING_TECHS,
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

function settleChoices(g, s, spread = false) {
  let remaining = s.ships[g.turn];
  const settlements = Object.fromEntries(
    s.revealed
      ? s.planets.map((p) => {
          const n = Math.min(remaining, settlementSpace(g, p), spread ? 1 : 40);
          remaining -= n;
          return [p.id, n];
        })
      : [],
  );
  const replacements = {};
  if (canSoylent(g, s, g.turn, settlements))
    for (const p of s.planets)
      for (const owner of g.players.filter((p) => p.id !== g.turn)) {
        const n = Math.min(remaining, p.owners[owner.id]);
        if (n) {
          replacements[p.id] ??= {};
          replacements[p.id][owner.id] = n;
          remaining -= n;
        }
      }
  return { settlements, replacements };
}

// A deterministic test driver, not a solo player shipped in the application.
export function botCommand(g) {
  if (g.phase === "pass") return { type: "nextRound" };
  const p = player(g),
    pending = g.pending;
  if (pending?.kind === "bid")
    return {
      type: "bid",
      amount: Math.min(p.credits, (g.seed + g.turn + g.round) % 5),
    };
  if (pending?.kind === "eventSelect")
    return {
      type: "selectEvent",
      event: g.revealedEvents[(g.seed + g.round + g.eventHistory.length) % 2],
    };
  if (pending?.kind === "scrambler")
    return {
      type: "scramble",
      system: g.systems.find((s) => s.tokens.length).id,
    };
  if (pending?.kind === "eventChoice") {
    const key = pending.event.slice(6);
    if (key === "politics") return { type: "eventChoice", action: "attack" };
    if (key === "famine") {
      const home = system(g, p.home),
        ships = {};
      let needed = Math.ceil(
        home.planets.reduce((n, planet) => n + planet.owners[p.id], 0) / 2,
      );
      for (const planet of home.planets) {
        const n = Math.min(needed, planet.owners[p.id]);
        ships[planet.id] = n;
        needed -= n;
      }
      return { type: "eventChoice", ships };
    }
    if (key === "vorsprung") {
      const tech = eventTechOptions(g)[0];
      return { type: "eventChoice", ...(tech ? { tech } : { skip: true }) };
    }
    if (key === "prophecy") {
      const seen = new Set();
      return {
        type: "eventChoice",
        planets: prophecyOptions(g)
          .filter((o) => {
            if (seen.has(o.system)) return false;
            seen.add(o.system);
            return true;
          })
          .slice(0, Math.min(3, g.exploreBag.length))
          .map((o) => o.planet),
      };
    }
    if (key === "galactic-summit") {
      const target = g.systems.find((s) => !s.planets.some((p) => p.home));
      return {
        type: "eventChoice",
        ...(target ? { system: target.id } : { skip: true }),
      };
    }
    if (key === "alliance")
      return { type: "eventChoice", player: (g.turn + 1) % g.players.length };
    return {
      type: "eventChoice",
      system: p.home,
      ships: { [p.home]: Math.min(3, p.reserve) },
      amount: Math.min(10, p.reserve),
    };
  }
  if (pending?.kind === "filibuster") {
    const s = g.systems.find((s) => s.tokens.includes(g.turn));
    return s
      ? { type: "filibuster", system: s.id, index: s.tokens.indexOf(g.turn) }
      : { type: "filibuster", skip: true };
  }
  if (pending?.kind === "insurance") return { type: "insurance" };
  if (pending?.kind === "mercenaries")
    return { type: "mercenaries", count: Math.min(3, p.credits) };
  if (pending?.kind === "afterOrder")
    return { type: "orderAfter", tech: "mercenaries" };
  if (pending?.kind === "eminent") return { type: "eminent", use: true };
  if (pending?.kind === "reserve") return { type: "finishReserve" };
  if (pending?.kind === "ack") return { type: "acknowledge" };
  if (pending?.kind === "redistribute")
    return { type: "redistribute", ships: pending.amount, settlements: {} };
  if (pending?.kind === "orient")
    return { type: "orient", rotation: pending.rotations[0] };
  if (pending?.kind === "move")
    return { type: "move", sources: pending.sources };
  if (pending?.kind === "action") {
    const active = system(g, pending.system);
    const command = {
      type: "act",
      bank: true,
      ...(forcedInvestment(g, pending.action) ? { invest: true } : {}),
    };
    if (pending.action === "settle")
      Object.assign(command, settleChoices(g, active));
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
  if (g.phase === "event") return { type: "continueEvent" };
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
    if (hasTech(g, p.id, "strategic-stall") && p.stalledRound !== g.round)
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
          (s.planets.some((p) => settlementSpace(g, p)) || canSoylent(g, s)),
      );
      if (s)
        return {
          type: "resolve",
          action: "settle",
          system: s.id,
          bank: true,
          ...settleChoices(g, s, true),
        };
    }
    if (!p.used.includes("produce") && !forcedInvestment(g, "produce")) {
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
    const target = sabotageTargets(g)[0],
      value = target ? Number(CARD_MAP[target.tech].cost) : 0;
    const selected =
      order.find(
        (t) =>
          !purchaseReason(
            g,
            t,
            g.turn,
            false,
            t === "tech.sabotage" ? value : undefined,
            target,
          ),
      ) ?? null;
    return {
      type: "buy",
      tech: selected,
      ...(selected === "tech.sabotage" ? { value, target } : {}),
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
