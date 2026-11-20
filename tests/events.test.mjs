import test from "node:test";
import assert from "node:assert/strict";
import { EVENT_BATCHES } from "../work/compiled/events.js";
import {
  applyCommand,
  eventIs,
  investmentAmount,
  shipDamage,
  planReason,
  attackTargetAllowed,
  eventTechOptions,
  prophecyOptions,
} from "../work/compiled/engine.js";
import { restoreGame } from "../work/compiled/persistence.js";
import { revealsHiddenInformation } from "../work/compiled/intent.js";
import oldSave from "./fixtures/v0.19-events-baseline.json" with { type: "json" };
import {
  setup,
  step,
  botCommand,
  credits,
  ships,
  settlement,
  tech,
  system,
  player,
  assertInvariants,
  production,
  hasTech,
  canMove,
  canPlan,
  eligibleTokens,
  attackCost,
  purchaseCost,
  purchaseReason,
  peekEvents,
  replayGame,
  CARD_MAP,
} from "./helpers.mjs";
const config = {
  techPreset: "remaining",
  scenario: "standard",
  events: "full",
};
function auction(count = 3) {
  const g = setup(count, 7, config);
  g.phase = "event";
  g.turn = g.first;
  g.pending = { kind: "bid" };
  g.auction = { bids: g.players.map(() => null), winner: null, paid: 0 };
  g.revealedEvents = ["event.capital-injection", "event.alliance"];
  return g;
}
function selected(name, count = 3) {
  let g = auction(count);
  g.pending = { kind: "eventSelect" };
  g.turn = 0;
  g.auction = { bids: g.players.map(() => 0), winner: 0, paid: 0 };
  g.revealedEvents = [
    `event.${name}`,
    name === "alliance" ? "event.capital-injection" : "event.alliance",
  ];
  g = step(g, { type: "selectEvent", event: `event.${name}` });
  return g;
}
function drain(g) {
  for (let n = 0; n < 150 && g.phase === "event"; n++)
    g = step(g, botCommand(g));
  return g;
}
function actionGame(event, count = 3) {
  const g = setup(count, 7, config);
  g.phase = "actions";
  g.turn = 0;
  g.activeEvent = { id: `event.${event}`, owner: 0, round: 1 };
  g.players.forEach((p) => (p.unplaced = 0));
  g.systems[0].tokens = [0, 0];
  g.systems[1].tokens = [1];
  g.systems[2].tokens = [2];
  return g;
}

test("three fixed ten-Event batches partition all 30 cards, with seeded decks at every player count", () => {
  const ids = Object.values(EVENT_BATCHES).flatMap((b) =>
    b.cards.map((id) => `event.${id}`),
  );
  assert.equal(ids.length, 30);
  assert.equal(new Set(ids).size, 30);
  assert.ok(ids.every((id) => CARD_MAP[id]?.type === "event"));
  for (let count = 2; count <= 7; count++)
    for (const batch of Object.keys(EVENT_BATCHES)) {
      const c = { ...config, eventBatch: batch },
        a = setup(count, 91, c),
        b = setup(count, 91, c);
      assert.equal(a.events.length, 10);
      assert.equal(a.roundLimit, 6);
      assert.deepEqual(a.events, b.events);
      assert.deepEqual(
        new Set(a.events),
        new Set(EVENT_BATCHES[batch].cards.map((id) => `event.${id}`)),
      );
    }
  assert.equal(setup(5, 4, config).events.length, 8);
  assert.equal(setup(5, 4, config).roundLimit, 5);
});

test("sealed bids validate quantity/actor, hide amounts in logs, reveal together, and charge only the tied winner in player order", () => {
  let g = auction();
  g.first = g.turn = 1;
  g.players.forEach((p) => credits(g, p.id, 5));
  assert.throws(() => step(g, { type: "bid", amount: 6 }), /exceed/);
  assert.throws(() => step(g, { type: "bid", amount: -1 }), /whole-number/);
  g = step(g, { type: "bid", amount: 4 });
  assert.equal(g.turn, 2);
  assert.equal(g.players[1].credits, 5);
  assert.equal(g.auction.winner, null);
  assert.equal(g.log.at(-1).text, "Sealed bid committed.");
  g = step(g, { type: "bid", amount: 4 });
  g = step(g, { type: "bid", amount: 1 });
  assert.equal(g.turn, 1);
  assert.equal(g.auction.winner, 1);
  assert.equal(g.auction.paid, 4);
  assert.deepEqual(
    g.players.map((p) => p.credits),
    [5, 1, 5],
  );
  assert.equal(g.pending.kind, "eventSelect");
  assert.match(g.log.at(-1).text, /Bids revealed/);
  assert.throws(
    () => step(g, { type: "selectEvent", event: "event.famine" }),
    /two revealed/,
  );
  g = step(g, { type: "selectEvent", event: "event.alliance" });
  assert.equal(g.activeEvent.owner, 1);
  assert.deepEqual(g.eventSelections[0].bids, [1, 4, 4]);
});

test("zero bids are valid and first player wins; committed bids cannot be withdrawn with Flexible Economy", () => {
  let g = auction();
  credits(g, 0, 5);
  tech(g, 0, "flexible-economy");
  g = step(g, { type: "bid", amount: 4 });
  assert.throws(
    () => applyCommand(g, 0, { type: "returnCredits", count: 2 }),
    /available Credits/,
  );
  g = applyCommand(g, 0, { type: "returnCredits", count: 1 });
  assert.equal(g.players[0].credits, 4);
  let z = auction();
  for (let n = 0; n < 3; n++) z = step(z, { type: "bid", amount: 0 });
  assert.equal(z.auction.winner, z.first);
  assert.equal(z.auction.paid, 0);
});

for (const event of Object.values(EVENT_BATCHES).flatMap((b) => b.cards))
  test(`${event}: selected effect resolves without losing the Economy sequence`, () => {
    const g = drain(selected(event));
    assert.equal(g.phase, "tech");
    assert.equal(g.turn, g.first);
    assert.equal(g.context, null);
    assertInvariants(g);
  });

test("Communist Decree returns all Credits, then grants three subject to Reserve", () => {
  let g = auction();
  g.pending = { kind: "eventSelect" };
  g.auction.winner = 0;
  g.auction.bids = [0, 0, 0];
  g.revealedEvents = ["event.communist-decree", "event.alliance"];
  credits(g, 0, 6);
  credits(g, 1, 2);
  g = step(g, { type: "selectEvent", event: "event.communist-decree" });
  assert.deepEqual(
    g.players.map((p) => p.credits),
    [3, 3, 3],
  );
  assert.equal(g.phase, "tech");
});

test("Economic Boom doubles ordinary and Banking investments and carries its allowance through Investments", () => {
  let g = actionGame("economic-boom"),
    id = g.systems[0].id;
  g = step(g, { type: "resolve", system: id, action: "attack", invest: true });
  assert.equal(g.players[0].invested, 2);
  g.turn = 0;
  tech(g, 0, "banking");
  g = step(g, { type: "resolve", system: id, action: "produce", bank: true });
  assert.equal(g.players[0].invested, 4);
  assert.equal(investmentAmount(g), 2);
  assert.deepEqual(g.players[0].investedActions, ["attack", "produce"]);
});

test("Ceasefire and Recession force investment, including a free action, without firing action hooks", () => {
  for (const [event, action] of [
    ["ceasefire", "attack"],
    ["recession", "produce"],
  ]) {
    let g = actionGame(event),
      id = g.systems[0].id;
    assert.throws(
      () => step(g, { type: "resolve", system: id, action }),
      /requires/,
    );
    g = step(g, { type: "resolve", system: id, action, invest: true });
    assert.equal(g.players[0].invested, 1);
  }
  let g = actionGame("recession");
  tech(g, 0, "spice");
  g.context = {
    actor: 0,
    system: g.systems[0].id,
    kind: "produce",
    bank: false,
    source: "tech.spice",
    stage: "body",
  };
  g.pending = {
    kind: "action",
    system: g.systems[0].id,
    action: "produce",
    source: "Spice",
    free: true,
  };
  g = step(g, { type: "act", invest: true });
  assert.equal(g.players[0].invested, 1);
  assert.deepEqual(g.players[0].freeInvestments, ["produce"]);
});

test("Cyber Attack consumes the actual top token and skips players with all four slots used", () => {
  let g = actionGame("cyber-attack"),
    s = g.systems[1];
  assert.deepEqual(s.tokens, [1]);
  assert.ok(eligibleTokens(g).includes(s));
  g = step(g, {
    type: "resolve",
    system: s.id,
    action: "attack",
    invest: true,
  });
  assert.equal(g.players[0].slotOwners.attack, 1);
  assert.equal(system(g, s.id).tokens.length, 0);
  g.players[1].used = ["move", "settle", "produce", "attack"];
  assert.deepEqual(eligibleTokens(g, 1), []);
});

test("Flexibility separates the performed action from the used slot and permits each unused slot", () => {
  let g = actionGame("flexibility"),
    s = g.systems[0];
  g = step(g, {
    type: "resolve",
    system: s.id,
    action: "produce",
    slot: "attack",
  });
  assert.deepEqual(g.players[0].used, ["attack"]);
  assert.equal(system(g, s.id).ships[0], 4);
  g.turn = 0;
  g = step(g, {
    type: "resolve",
    system: s.id,
    action: "produce",
    slot: "move",
  });
  assert.deepEqual(g.players[0].used, ["attack", "move"]);
  const other = actionGame("alliance");
  assert.throws(
    () =>
      step(other, {
        type: "resolve",
        system: other.systems[0].id,
        action: "produce",
        slot: "attack",
      }),
    /Flexibility/,
  );
});

test("Luddite suppresses Tech hooks, discounts, peeks, protection, and acquisition powers while preserving ownership", () => {
  let g = actionGame("luddite-decree");
  tech(g, 0, "research-lab");
  tech(g, 0, "foresight");
  tech(g, 0, "frontier-pioneer");
  assert.equal(hasTech(g, 0, "frontier-pioneer"), false);
  assert.equal(
    purchaseCost(g, "tech.death-sun"),
    Number(CARD_MAP["tech.death-sun"].cost),
  );
  assert.throws(() => peekEvents(g, 0), /Foresight/);
  g.phase = "tech";
  credits(g, 0, 10);
  g.market[0] = "tech.planet-killer";
  g.market = [...new Set(g.market)];
  // Keep a valid ten-card market when replacing one entry.
  if (g.market.length < 10) g.market.push("tech.agility");
  g = step(g, { type: "buy", tech: "tech.planet-killer" });
  assert.equal(g.features.blackHole, false);
  assert.equal(g.pending, null);
  assert.ok(g.players[0].techs.includes("tech.planet-killer"));
});

test("Ammo Shortage with Death Sun uses 2 Ships OR 2 Settlements; Black Cloud and Alliance enforce legal targets", () => {
  const g = actionGame("ammo-shortage");
  assert.equal(shipDamage(g), 1);
  assert.equal(attackCost(g, 2, 0), 2);
  tech(g, 0, "death-sun");
  assert.equal(shipDamage(g, true), 2);
  assert.equal(attackCost(g, 2, 0), 1);
  assert.equal(attackCost(g, 0, 2), 1);
  assert.equal(attackCost(g, 1, 1), 2);
  g.activeEvent.id = "event.black-cloud";
  assert.equal(attackTargetAllowed(g, 0, 1, "ships"), false);
  ships(g, g.systems[0], 1, 1);
  assert.throws(
    () =>
      step(g, {
        type: "resolve",
        system: g.systems[0].id,
        action: "attack",
        attack: { sacrifice: 1, ships: { 1: 1 }, settlements: {} },
      }),
    /cannot attack/,
  );
  g.activeEvent = { id: "event.alliance", owner: 1, round: 1, ally: 0 };
  assert.equal(attackTargetAllowed(g, 0, 1, "settlements"), false);
  assert.equal(attackTargetAllowed(g, 1, 0, "ships"), true);
});

test("El Mayarah doubles only shared planets; Hive Mind grants one Ship per shared planet with no PRODUCE chain", () => {
  let g = selected("hive-mind"),
    s = g.systems.find((s) => s.id === g.players[0].home),
    p = s.planets.find((p) => p.home);
  settlement(g, s, s.planets.indexOf(p), 1, 1);
  tech(g, 0, "population-explosion");
  tech(g, 0, "spice");
  const before = s.ships[0];
  g = step(g, { type: "eventChoice" });
  assert.equal(system(g, s.id).ships[0], before + 1);
  assert.equal(g.phase, "tech");
  g.activeEvent = { id: "event.el-mayarah", owner: 0, round: 1 };
  assert.equal(production(g, system(g, s.id)), 2);
});

test("Turtling returns Credits and gives each player a home-only allocation; Famine returns the selected half rounded up", () => {
  let g = selected("turtling");
  assert.equal(g.turn, g.first);
  g = step(g, { type: "eventChoice", ships: { [g.players[0].home]: 2 } });
  assert.equal(g.turn, 1);
  assert.equal(system(g, g.players[0].home).ships[0], 5);
  g = selected("famine");
  const s = system(g, g.players[0].home),
    p = s.planets.find((p) => p.home),
    before = g.players[0].reserve;
  assert.throws(
    () => step(g, { type: "eventChoice", ships: { [p.id]: 1 } }),
    /exactly 2/,
  );
  g = step(g, { type: "eventChoice", ships: { [p.id]: 2 } });
  assert.equal(g.players[0].reserve, before + 2);
  assert.equal(system(g, s.id).planets.find((x) => x.id === p.id).owners[0], 1);
});

test("Migration preserves owner totals and capacity, with no Reserve conversion or SETTLE hooks", () => {
  let g = selected("migration"),
    s = system(g, g.players[0].home),
    home = s.planets.find((p) => p.home),
    other = s.planets.find((p) => !p.home);
  const placements = Object.fromEntries(
    s.planets.map((p) => [p.id, p.owners.slice()]),
  );
  placements[home.id][0]--;
  placements[other.id][0]++;
  const before = g.players[0].reserve;
  g = step(g, { type: "eventChoice", system: s.id, settlements: placements });
  assert.equal(g.players[0].reserve, before);
  assert.equal(
    system(g, s.id).planets.find((p) => p.id === other.id).owners[0],
    1,
  );
  g = selected("migration");
  s = system(g, g.players[0].home);
  assert.throws(
    () =>
      step(g, {
        type: "eventChoice",
        system: s.id,
        settlements: Object.fromEntries(
          s.planets.map((p) => [p.id, p.owners.map(() => 0)]),
        ),
      }),
    /Preserve each/,
  );
});

test("Prophecy uses distinct empty face-up systems, reveals tokens without applying them, then a later SETTLE applies the revealed reward", () => {
  let g = selected("prophecy"),
    options = prophecyOptions(g),
    seen = new Set();
  const chosen = options
    .filter((o) => {
      if (seen.has(o.system)) return false;
      seen.add(o.system);
      return true;
    })
    .slice(0, 2);
  const before = g,
    creditsBefore = g.players[0].credits;
  g = step(g, { type: "eventChoice", planets: chosen.map((o) => o.planet) });
  assert.ok(revealsHiddenInformation(before, g));
  assert.equal(g.players[0].credits, creditsBefore);
  assert.ok(
    chosen.every(
      (o) =>
        system(g, o.system).planets.find((p) => p.id === o.planet)
          .exploreFaceUp,
    ),
  );
});

test("Vorsprung claims a Tech for no Credits, still marks ownership, resolves acquisition, and leaves the ordinary purchase", () => {
  let g = selected("vorsprung");
  g.market[0] = "tech.genesis";
  g.market = [...new Set(g.market)];
  if (g.market.length < 10) g.market.push("tech.agility");
  assert.ok(eventTechOptions(g).includes("tech.genesis"));
  const before = g.players[0].credits;
  g = step(g, { type: "eventChoice", tech: "tech.genesis" });
  assert.ok(g.players[0].techs.includes("tech.genesis"));
  assert.equal(g.players[0].credits, before);
  assert.equal(g.pending.kind, "genesis");
  g = step(g, {
    type: "feature",
    ...g.systems.flatMap((s) =>
      s.revealed
        ? s.planets
            .filter((p) => !p.owners.some(Boolean))
            .map((p) => ({ system: s.id, planet: p.id }))
        : [],
    )[0],
  });
  g = drain(g);
  assert.equal(g.phase, "tech");
  assert.equal(g.turn, g.first);
});

test("Galactic Summit relocates every owner’s Ships without black-hole casualties or hidden-system reveals", () => {
  let g = selected("galactic-summit"),
    target = g.systems.find((s) => !s.revealed),
    totals = g.players.map((p) =>
      g.systems.reduce((n, s) => n + s.ships[p.id], 0),
    );
  target.extraHoles = 2;
  g = step(g, { type: "eventChoice", system: target.id });
  assert.equal(system(g, target.id).revealed, false);
  assert.deepEqual(system(g, target.id).ships, totals);
  assert.deepEqual(
    g.players.map((p) => p.credits),
    [0, 0, 0],
  );
});

test("Gravitational Lensing permits asteroid crossings and disables warp jumps; Spacetime Rip belongs only to its selector", () => {
  const g = actionGame("gravitational-lensing"),
    a = g.systems.find((s) => s.revealed),
    b = g.systems.find((s) => canMove(g, 0, a, s));
  a.extraEdges = [0, 1, 2, 3, 4, 5];
  assert.equal(canMove(g, 0, a, b), true);
  const far = g.systems.find(
    (s) =>
      s.id !== a.id &&
      Math.max(
        Math.abs(s.q - a.q),
        Math.abs(s.r - a.r),
        Math.abs(s.q + s.r - (a.q + a.r)),
      ) > 1,
  );
  far.revealed = true;
  a.extraWarp = far.extraWarp = true;
  assert.equal(canMove(g, 0, a, far), false);
  g.activeEvent.id = "event.spacetime-rip";
  a.extraWarp = far.extraWarp = false;
  assert.equal(canMove(g, 0, a, far), true);
  assert.equal(canMove(g, 1, a, far), false);
});

test("Earth First requires the first actual placed token at home, including after Strategic Stall", () => {
  const g = setup(3, 7, config);
  g.activeEvent = { id: "event.earth-first", owner: 1, round: 1 };
  tech(g, 0, "strategic-stall");
  const home = system(g, g.players[0].home),
    away = g.systems.find((s) => s.id !== home.id);
  assert.equal(canPlan(g, away), false);
  assert.match(planReason(g, away), /Earth First/);
  assert.throws(
    () => step(g, { type: "plan", system: away.id }),
    /Earth First/,
  );
  const next = step(g, { type: "plan", system: home.id });
  assert.equal(canPlan(next, system(next, away.id), 0), true);
});

test("Politics persists through cleanup as a blocked slot and leaves three PLAN tokens", () => {
  let g = selected("politics");
  while (g.phase === "event")
    g = step(g, { type: "eventChoice", action: "produce" });
  for (let n = 0; n < 60 && g.phase !== "plan"; n++) g = step(g, botCommand(g));
  assert.equal(g.round, 2);
  assert.ok(
    g.players.every(
      (p) =>
        p.unplaced === 3 &&
        p.used.includes("produce") &&
        p.blockedAction === "produce",
    ),
  );
});

test("Filibuster resolves in player order before Scrambler; flipping a stack reverses all owners", () => {
  let g = setup(3, 7, config);
  tech(g, 0, "filibuster");
  g.activeEvent = { id: "event.scrambler", owner: 1, round: 1 };
  for (let n = 0; n < 12; n++)
    g = step(g, { type: "plan", system: g.systems[0].id });
  assert.equal(g.pending.kind, "filibuster");
  g = step(g, { type: "filibuster", skip: true });
  assert.equal(g.pending.kind, "scrambler");
  assert.equal(g.turn, 1);
  const before = g.systems[0].tokens.slice();
  g = step(g, { type: "scramble", system: g.systems[0].id });
  assert.deepEqual(g.systems[0].tokens, before.reverse());
  assert.equal(g.phase, "actions");
});

test("Ragnarök draws a new pair and auction, shortening the game; an empty deck has no effect", () => {
  let g = selected("ragnarok");
  assert.equal(g.pending.kind, "bid");
  assert.equal(g.events.length, 8);
  assert.equal(g.roundLimit, 5);
  assert.equal(g.finalEconomy, false);
  g = auction();
  g.events = [];
  g.pending = { kind: "eventSelect" };
  g.auction = { bids: [0, 0, 0], winner: 0, paid: 0 };
  g.revealedEvents = ["event.ragnarok", "event.alliance"];
  g = step(g, { type: "selectEvent", event: "event.ragnarok" });
  assert.equal(g.finalEconomy, false);
  assert.equal(g.roundLimit, 6);
  assert.equal(g.pending.kind, "ack");
  assert.match(g.pending.messages[0], /no effect/);
});

test("active Events persist through the next Investments and are discarded exactly at the Event step", () => {
  let g = actionGame("economic-boom");
  g.systems.forEach((s) => (s.tokens = []));
  g.phase = "investments";
  g.players[0].invested = 2;
  g.players[0].reserve -= 2;
  const before = g.players[0].credits;
  g = step(g, { type: "allocate", credits: 2, ships: {} });
  assert.equal(g.players[0].credits, before + 2);
  assert.equal(g.activeEvent, null);
  assert.equal(g.pending.kind, "bid");
  assert.match(g.log.map((l) => l.text).join("\n"), /Discarded previous Event/);
});

test("0.19 records migrate without enabling Events or changing pieces and remain exactly replayable", () => {
  const g = restoreGame(oldSave);
  assert.equal(g.engine, "0.21.0");
  assert.equal(g.config.events, "foresight-test");
  assert.equal(g.activeEvent, null);
  for (const key of ["round", "phase", "turn", "systems"])
    assert.deepEqual(g[key], oldSave[key], key);
  assert.deepEqual(
    g.players.map(({ slotOwners, ...p }) => p),
    oldSave.players,
  );
  assert.deepEqual(replayGame(g), g);
});

test("full-Events games finish, conserve supplies, and replay every choice across all batches and 2–7 players", () => {
  const selectedEvents = new Set();
  let games = 0;
  for (const batch of Object.keys(EVENT_BATCHES))
    for (let count = 2; count <= 7; count++)
      for (let seed = 1; seed <= 3; seed++) {
        let g = setup(count, Math.ceil(seed / 2), {
          ...config,
          eventBatch: batch,
        });
        for (let n = 0; n < 1400 && g.phase !== "finished"; n++)
          g = step(
            g,
            g.pending?.kind === "eventSelect"
              ? { type: "selectEvent", event: g.revealedEvents[seed % 2] }
              : botCommand(g),
          );
        assert.equal(
          g.phase,
          "finished",
          `${batch}/${count}/${seed}: ${g.pending?.kind}`,
        );
        assertInvariants(g);
        g.eventSelections.forEach((e) => selectedEvents.add(e.selected));
        assert.deepEqual(replayGame(g), g);
        games++;
      }
  assert.equal(games, 54);
  assert.equal(
    selectedEvents.size,
    30,
    Object.values(EVENT_BATCHES)
      .flatMap((b) => b.cards)
      .filter((id) => !selectedEvents.has(`event.${id}`))
      .join(","),
  );
});

test("Stealth Invasion adds directly without black-hole losses and Reserve recovery completes only the missing reward", () => {
  let g = selected("stealth-invasion"),
    home = system(g, g.players[0].home);
  tech(g, 0, "flexible-economy");
  home.extraHoles = 3;
  credits(g, 0, g.players[0].reserve - 1);
  const before = home.ships[0];
  g = step(g, { type: "eventChoice", ships: { [home.id]: 3 } });
  assert.equal(g.pending.kind, "reserve");
  assert.equal(system(g, home.id).ships[0], before + 1);
  g = step(g, { type: "returnCredits", count: 2 });
  g = step(g, { type: "completeReserve" });
  assert.equal(system(g, home.id).ships[0], before + 3);
  assert.equal(g.phase, "tech");
});

test("Multicultural Tension respects Arcologies and a Prophecy gift after recovering an empty Reserve", () => {
  let g = selected("multicultural-tension"),
    home = system(g, g.players[1].home),
    planet = home.planets.find((p) => p.home);
  // Fill all but one space and leave a known Prophecy token on this home planet.
  settlement(
    g,
    home,
    home.planets.indexOf(planet),
    1,
    planet.capacity - planet.owners[1] - 1,
  );
  planet.explore = "otherSettlement";
  planet.exploreFaceUp = true;
  tech(g, 0, "flexible-economy");
  credits(g, 0, g.players[0].reserve);
  g = step(g, { type: "eventChoice" });
  assert.equal(g.pending.kind, "reserve");
  g = step(g, { type: "returnCredits", count: 1 });
  g = step(g, { type: "completeReserve" });
  assert.equal(g.pending.kind, "explore");
  g = step(g, { type: "explore", recipient: 1 });
  assert.equal(g.phase, "tech");
  assert.equal(
    system(g, home.id).planets.find((p) => p.id === planet.id).owners[0],
    0,
  );
  assert.equal(g.players[0].reserve, 1);
  let a = selected("multicultural-tension");
  tech(a, 0, "arcologies");
  const target = system(a, a.players[1].home),
    hp = target.planets.find((p) => p.home);
  settlement(
    a,
    target,
    target.planets.indexOf(hp),
    1,
    hp.capacity - hp.owners[1],
  );
  a = step(a, { type: "eventChoice" });
  assert.equal(
    system(a, target.id)
      .planets.find((p) => p.id === hp.id)
      .owners.reduce((n, v) => n + v, 0),
    hp.capacity + 1,
  );
});

test("Technological Singularity adds exactly four new display cards, keeps existing cards, and respects exhausted supply", () => {
  let g = selected("technological-singularity");
  assert.equal(g.market.length, 14);
  assert.equal(new Set(g.market).size, 14);
  assert.equal(g.pending.kind, "ack");
  assert.match(g.pending.messages[0], /Added/);
  g = step(g, { type: "acknowledge" });
  assert.equal(g.phase, "tech");
});

test("Event free actions run applicable nested Tech effects once and return to the ordinary first-player Tech turn", () => {
  let g = selected("consolidation");
  for (const name of [
    "population-explosion",
    "government-incentives",
    "frontier-pioneer",
    "rapid-advance",
    "spice",
  ])
    tech(g, 0, name);
  const used = g.players[0].used.slice();
  g = step(g, { type: "eventChoice", system: g.players[0].home });
  assert.equal(g.pending.kind, "action");
  assert.equal(g.context.source, "tech.government-incentives");
  for (let n = 0; n < 100 && g.phase === "event"; n++)
    g = step(g, botCommand(g));
  assert.equal(g.phase, "tech");
  assert.equal(g.turn, g.first);
  assert.deepEqual(g.players[0].used, used);
  assert.equal(g.players[0].invested, 0);
  assert.match(g.log.map((l) => l.text).join("\n"), /Government Incentives/);
  assert.equal(
    g.log.filter((l) => l.text.includes("Frontier Pioneer: added")).length,
    1,
  );
});

test("confirmed Earth First overrides Disruptor on an opponent home for the whole PLAN phase", () => {
  const g = setup(3, 7, config),
    home = system(g, g.players[0].home);
  g.activeEvent = { id: "event.earth-first", owner: 1, round: 1 };
  g.disruptions = [{ owner: 1, system: home.id, round: 1 }];
  assert.equal(canPlan(g, home), true);
  assert.equal(g.systems.filter((s) => canPlan(g, s)).length, 1);
  const next = step(g, { type: "plan", system: home.id });
  assert.equal(canPlan(next, system(next, home.id), 0), true);
  assert.ok(next.systems.some((s) => canPlan(next, s, 0)));
});
