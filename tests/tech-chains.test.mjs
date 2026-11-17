import test from "node:test";
import assert from "node:assert/strict";
import {
  ART,
  CHAIN_TECHS,
  IMPLEMENTED_TECHS,
  NEW_TECHS,
  TECH_PRESETS,
  applyCommand,
  assertInvariants,
  botCommand,
  canMove,
  createGame,
  credits,
  featureOptions,
  fixture,
  freeSpace,
  player,
  production,
  purchaseCost,
  purchaseReason,
  scoreGame,
  settlement,
  settlementSpace,
  setup,
  ships,
  step,
  system,
  tech,
} from "./helpers.mjs";
import { restoreGame } from "../work/compiled/persistence.js";
import { fleetPositions } from "../work/compiled/geometry.js";
import oldCompleted from "./fixtures/v0.11-completed.json" with { type: "json" };

function chainFixture(banking = false) {
  const g = fixture();
  for (const id of CHAIN_TECHS) tech(g, 0, id.slice(5));
  if (banking) tech(g, 0, "banking");
  return { g, id: g.systems[0].id };
}
function finishChain(game, choose = botCommand) {
  let g = game;
  const checkpoints = [];
  for (let i = 0; g.context && i < 80; i++) {
    assert.equal(g.turn, 0, "A child effect must keep the root actor's turn");
    const checkpoint = JSON.parse(JSON.stringify(g));
    assert.deepEqual(restoreGame(checkpoint), g);
    checkpoints.push(g);
    g = step(checkpoint, choose(checkpoint));
  }
  assert.equal(g.context, null, "The chain must terminate");
  return { g, checkpoints };
}

test("ten-card displays expose all thirty implemented Techs and scenario markers come from Reserve", () => {
  assert.equal(NEW_TECHS.length, 10);
  assert.equal(new Set(IMPLEMENTED_TECHS).size, 30);
  for (const techPreset of Object.keys(TECH_PRESETS)) {
    const g = setup(7, 4, { techPreset, scenario: "five-tech-chain" });
    assert.equal(g.market.length, 10);
    assert.equal(new Set(g.market).size, 10);
    assert.ok(g.market.every((t) => IMPLEMENTED_TECHS.includes(t)));
    for (const p of g.players) {
      assert.deepEqual(p.techs, CHAIN_TECHS);
      assert.equal(p.reserve, 29);
    }
    assert.ok(g.log.some((l) => /Designer test scenario/.test(l.text)));
  }
  assert.throws(() =>
    createGame(2, 1, [], { techPreset: "all", scenario: "standard" }),
  );
});

test("R01 completes Population → Frontier → Government → Rapid before Spice repeats, without recursive SETTLE", () => {
  const { g: before, id } = chainFixture();
  const initialShips = system(before, id).ships[0];
  const initialProduction = production(before, system(before, id));
  const started = step(before, {
    type: "resolve",
    system: id,
    action: "produce",
  });
  assert.equal(
    system(started, id).ships[0],
    initialShips + initialProduction + 1,
  );
  assert.equal(started.players[0].credits, 0);
  assert.equal(started.context.kind, "move");
  assert.equal(started.context.parent.kind, "settle");
  assert.equal(started.context.parent.parent.kind, "produce");
  const { g, checkpoints } = finishChain(started);
  const effects = g.log.slice(before.log.length).map((l) => l.text);
  assert.equal(effects.filter((t) => t.startsWith("Produced")).length, 2);
  assert.equal(
    effects.filter((t) => t.startsWith("Frontier Pioneer:")).length,
    2,
  );
  assert.equal(
    effects.filter((t) => t.startsWith("Government Incentives:")).length,
    2,
  );
  assert.equal(
    effects.filter((t) => t.startsWith("Population Explosion:")).length,
    2,
  );
  assert.equal(
    effects.filter((t) => t.startsWith("Rapid Advance: convert")).length,
    2,
  );
  assert.equal(effects.filter((t) => t.startsWith("Spice:")).length, 1);
  assert.match(
    effects.findLast((t) => t.startsWith("Produced")),
    /3 Ships/,
  );
  const firstSpice = effects.findIndex((t) => t.startsWith("Spice:"));
  assert.ok(
    effects
      .slice(0, firstSpice)
      .some((t) => t.startsWith("Placed 2 Settlements")),
  );
  assert.deepEqual(g.players[0].used, ["produce"]);
  assert.equal(g.turn, 1);
  assert.equal(system(g, id).tokens.length, 0);
  assert.deepEqual(system(g, before.systems[1].id).tokens, [1]);
  assert.ok(checkpoints.some((s) => s.pending.kind === "rapid"));
  assert.ok(
    checkpoints.some(
      (s) => s.pending.kind === "action" && s.pending.action === "produce",
    ),
  );
  assertInvariants(g);
});

test("Rapid Advance is optional, works after an empty MOVE, and never runs SETTLE before-hooks", () => {
  let g = fixture();
  const s = g.systems[0];
  for (const t of [
    "rapid-advance",
    "frontier-pioneer",
    "government-incentives",
  ])
    tech(g, 0, t);
  const initialReserve = player(g).reserve;
  g = step(g, { type: "resolve", system: s.id, action: "move", sources: {} });
  assert.equal(g.pending.kind, "rapid");
  const skipped = step(g, { type: "rapid", skip: true });
  assert.deepEqual(system(skipped, s.id).planets, s.planets);
  const converted = step(g, { type: "rapid", planet: s.planets[1].id });
  assert.equal(system(converted, s.id).planets[1].owners[0], 1);
  assert.equal(system(converted, s.id).ships[0], s.ships[0] - 1);
  assert.equal(converted.players[0].reserve, initialReserve);
  assert.equal(
    converted.log.some((l) => l.text.startsWith("Frontier Pioneer:")),
    false,
  );
  assert.equal(
    converted.log.some((l) => l.text.startsWith("Government Incentives:")),
    false,
  );
});

test("free actions may Bank once each, while direct conversions and Reserve additions do not Bank", () => {
  const { g: before, id } = chainFixture(true);
  const result = finishChain(
    step(before, {
      type: "resolve",
      system: id,
      action: "produce",
      bank: true,
    }),
  ).g;
  assert.equal(result.players[0].invested, 6);
  assert.equal(
    result.log.filter((l) => l.text.startsWith("Banking:")).length,
    6,
  );
  assert.deepEqual(result.players[0].investedActions, ["produce"]);
  assert.deepEqual(result.players[0].freeInvestments, [
    "move",
    "settle",
    "produce",
    "move",
    "settle",
  ]);
  const invested = step(before, {
    type: "resolve",
    system: id,
    action: "produce",
    invest: true,
    bank: true,
  });
  assert.equal(invested.players[0].invested, 1);
  assert.equal(invested.context, null);
  assert.equal(invested.pending, null);
});

test("an empty Reserve pauses and resumes nested before/after hooks once, including Banking", () => {
  const { g: before, id } = chainFixture(true);
  credits(before, 0, before.players[0].reserve);
  const started = step(before, {
    type: "resolve",
    system: id,
    action: "produce",
    bank: true,
  });
  assert.equal(started.pending.kind, "ack");
  assert.equal(started.pending.after.kind, "afterHooks");
  const { g, checkpoints } = finishChain(started);
  assert.ok(
    checkpoints.some(
      (p) => p.pending.kind === "ack" && p.pending.after.kind === "beforeHooks",
    ),
  );
  assert.equal(
    g.log.filter((l) => l.text.startsWith("Frontier Pioneer: added")).length,
    2,
  );
  assert.equal(g.log.filter((l) => l.text.startsWith("Produced")).length, 2);
  assert.equal(g.players[0].invested, 0);
  assert.equal(g.players[0].reserve, 0);
});

test("Rapid Advance Explore rewards and committed free-SETTLE displacement resume the correct parent action", () => {
  let g = fixture();
  const id = g.systems[0].id,
    planetId = g.systems[0].planets[1].id;
  tech(g, 0, "rapid-advance");
  system(g, id).planets[1].explore = "credit2";
  g = step(g, { type: "resolve", system: id, action: "move" });
  g = step(g, { type: "rapid", planet: planetId });
  assert.equal(g.pending.kind, "ack");
  assert.equal(g.pending.after.resume, "rapid");
  g = step(restoreGame(JSON.parse(JSON.stringify(g))), { type: "acknowledge" });
  assert.equal(g.context, null);
  assert.equal(g.players[0].credits, 2);
  assert.equal(system(g, id).planets[1].owners[0], 1);

  g = fixture();
  tech(g, 0, "population-explosion");
  const s = g.systems[0],
    p = s.planets[1];
  settlement(g, s, 1, 1, p.capacity - 2);
  p.explore = "otherSettlement";
  g = step(g, { type: "resolve", system: s.id, action: "produce" });
  g = step(g, { type: "act", settlements: { [p.id]: 2 } });
  assert.equal(g.pending.kind, "explore");
  g = step(g, { type: "explore", recipient: 1 });
  assert.equal(g.pending.kind, "redistribute");
  assert.equal(g.pending.amount, 1);
  assert.equal(g.context.parent.kind, "produce");
  const fixed = system(g, s.id).planets[1].owners[0];
  g = step(restoreGame(JSON.parse(JSON.stringify(g))), {
    type: "redistribute",
    ships: 1,
    settlements: {},
  });
  assert.equal(g.context, null);
  assert.equal(system(g, s.id).planets[1].owners[0], fixed);
  assert.equal(g.players[0].used.length, 1);
});

test("Arcologies grants one shared extra space, and full/overfull planets keep their production bonus", () => {
  let g = fixture();
  const s = g.systems[0],
    p = s.planets[1];
  tech(g, 0, "arcologies");
  tech(g, 1, "arcologies");
  settlement(g, s, 1, 0, p.capacity);
  const output = production(g, s);
  assert.equal(freeSpace(p), 0);
  assert.equal(settlementSpace(g, p, 0), 1);
  assert.equal(settlementSpace(g, p, 1), 1);
  g = step(g, {
    type: "resolve",
    system: s.id,
    action: "settle",
    settlements: { [p.id]: 1 },
  });
  const over = system(g, s.id).planets[1];
  assert.equal(over.owners[0], p.capacity + 1);
  assert.equal(settlementSpace(g, over, 0), 0);
  assert.equal(settlementSpace(g, over, 1), 0);
  assert.equal(production(g, system(g, s.id), 0), output);
  assertInvariants(g);
  const nonOwner = fixture();
  const target = nonOwner.systems[0].planets[1];
  settlement(nonOwner, nonOwner.systems[0], 1, 0, target.capacity);
  assert.equal(settlementSpace(nonOwner, target), 0);
});

test("Arcologies applies to an opponent Explore recipient and leaves a single shared extra space", () => {
  let g = fixture();
  const s = g.systems[0],
    p = s.planets[1];
  tech(g, 0, "arcologies");
  tech(g, 1, "arcologies");
  settlement(g, s, 1, 0, p.capacity - 1);
  p.explore = "otherSettlement";
  g = step(g, {
    type: "resolve",
    system: s.id,
    action: "settle",
    settlements: { [p.id]: 1 },
  });
  g = step(g, { type: "explore", recipient: 1 });
  const result = system(g, s.id).planets[1];
  assert.equal(result.owners[1], 1);
  assert.equal(
    result.owners.reduce((a, b) => a + b),
    p.capacity + 1,
  );
});

test("Cloaking adds its Ship before attack quantities, with an interrupt if Reserve is empty", () => {
  let g = fixture();
  const s = g.systems[0],
    before = s.ships[0];
  tech(g, 0, "cloaking");
  ships(g, s, 1, 2);
  g = step(g, { type: "resolve", system: s.id, action: "attack" });
  assert.equal(g.pending.kind, "action");
  assert.equal(system(g, s.id).ships[0], before + 1);
  g = step(g, {
    type: "act",
    attack: { sacrifice: 1, ships: { 1: 2 }, settlements: {} },
  });
  assert.equal(system(g, s.id).ships[1], 0);
  assert.equal(g.players[1].credits, 2);
  let empty = fixture();
  tech(empty, 0, "cloaking");
  credits(empty, 0, empty.players[0].reserve);
  empty = step(empty, {
    type: "resolve",
    system: empty.systems[0].id,
    action: "attack",
  });
  assert.equal(empty.pending.title, "Reserve empty");
  empty = step(empty, { type: "acknowledge" });
  assert.equal(empty.pending.kind, "action");
  assert.equal(system(empty, empty.context.system).ships[0], 3);
});

test("Patrol protects only its owner's Settlements until all of that owner's Ships die, even in one attack", () => {
  const g = fixture(),
    s = g.systems[0],
    p = s.planets[1];
  tech(g, 1, "patrol");
  ships(g, s, 1, 2);
  settlement(g, s, 1, 1, 1);
  assert.throws(
    () =>
      step(g, {
        type: "resolve",
        system: s.id,
        action: "attack",
        attack: {
          sacrifice: 2,
          ships: { 1: 1 },
          settlements: { [p.id]: { 1: 1 } },
        },
      }),
    /Patrol/,
  );
  const next = step(g, {
    type: "resolve",
    system: s.id,
    action: "attack",
    attack: {
      sacrifice: 2,
      ships: { 1: 2 },
      settlements: { [p.id]: { 1: 1 } },
    },
  });
  assert.equal(system(next, s.id).ships[1], 0);
  assert.equal(system(next, s.id).planets[1].owners[1], 0);
  assert.equal(next.players[1].credits, 3);
  const three = setup(3);
  three.phase = "actions";
  three.players.forEach((p) => (p.unplaced = 0));
  const active = system(three, three.players[0].home);
  active.tokens = [0];
  tech(three, 1, "patrol");
  ships(three, active, 1, 1);
  settlement(three, active, 1, 2, 1);
  assert.doesNotThrow(() =>
    step(three, {
      type: "resolve",
      system: active.id,
      action: "attack",
      attack: {
        sacrifice: 1,
        ships: {},
        settlements: { [active.planets[1].id]: { 2: 1 } },
      },
    }),
  );
});

test("Research Lab halves later purchases rounding down, allows full price, and never discounts itself", () => {
  let initial = setup(2, 4, { techPreset: "chains", scenario: "standard" });
  initial.phase = "tech";
  credits(initial, 0, 10);
  const labCost = purchaseCost(initial, "tech.research-lab");
  const bought = step(initial, { type: "buy", tech: "tech.research-lab" });
  assert.equal(bought.players[0].credits, 10 - labCost);
  const later = structuredClone(bought);
  later.phase = "tech";
  later.turn = 0;
  const id = "tech.arcologies",
    full = purchaseCost(later, id, 0, true);
  assert.equal(purchaseCost(later, id), Math.floor(full / 2));
  const discount = step(later, { type: "buy", tech: id });
  const paidFull = step(later, { type: "buy", tech: id, fullPrice: true });
  assert.equal(
    discount.players[0].credits,
    later.players[0].credits - Math.floor(full / 2),
  );
  assert.equal(paidFull.players[0].credits, later.players[0].credits - full);
  assert.equal(
    discount.players[0].reserve,
    later.players[0].reserve + Math.floor(full / 2) - 1,
  );
  tech(later, 1, "patents");
  tech(later, 1, "arcologies");
  assert.match(purchaseReason(later, id), /Patents/);
});

test("Strategic Stall passes one PLAN turn per round without a chip, slot, or Banking effect", () => {
  let g = setup();
  tech(g, 0, "strategic-stall");
  tech(g, 0, "banking");
  const before = g.players[0].reserve;
  g = step(g, { type: "planPass" });
  assert.equal(g.turn, 1);
  assert.equal(g.players[0].unplaced, 4);
  assert.equal(g.players[0].invested, 0);
  assert.equal(g.players[0].reserve, before);
  assert.deepEqual(g.players[0].used, []);
  g = step(g, { type: "plan", system: g.systems[0].id });
  assert.throws(() => step(g, { type: "planPass" }), /once PLAN|one PLAN/);
  while (g.phase === "plan")
    g = step(g, { type: "plan", system: g.systems[0].id });
  assert.equal(
    g.systems.reduce((n, s) => n + s.tokens.length, 0),
    8,
  );
});

test("Frontier Ships on an unexplored system do not expose planets or generate Rapid choices", () => {
  let g = fixture();
  tech(g, 0, "frontier-pioneer");
  tech(g, 0, "government-incentives");
  tech(g, 0, "rapid-advance");
  const hidden = g.systems.find((s) => !s.revealed);
  g.systems.forEach((s) => (s.tokens = []));
  hidden.tokens = [0];
  g.systems.find((s) => s.id !== hidden.id).tokens = [1];
  g = step(g, { type: "resolve", action: "settle", system: hidden.id });
  assert.equal(system(g, hidden.id).revealed, false);
  assert.equal(system(g, hidden.id).ships[0], 1);
  const disguised = structuredClone(system(g, hidden.id));
  disguised.template = "system.clarke";
  disguised.planets = [];
  assert.deepEqual(
    fleetPositions(system(g, hidden.id)),
    fleetPositions(disguised),
  );
  g = step(g, { type: "act", sources: {} });
  assert.equal(g.pending.kind, "action");
  assert.equal(g.pending.action, "settle");
  assert.deepEqual(featureOptions(g, "tech.rapid-advance"), []);
  assert.throws(
    () => step(g, { type: "act", settlements: { [hidden.planets[0].id]: 1 } }),
    /Explore this system/,
  );
  g = step(g, { type: "act", settlements: {} });
  assert.equal(g.context, null);
  assert.equal(system(g, hidden.id).revealed, false);
});

test("a Government free MOVE may reveal/orient a system and then return to the committed SETTLE", () => {
  let g = fixture();
  for (const t of [
    "frontier-pioneer",
    "government-incentives",
    "rapid-advance",
  ])
    tech(g, 0, t);
  const from = system(g, g.players[0].home),
    target = g.systems.find((s) => !s.revealed && canMove(g, 0, from, s));
  g.systems.forEach((s) => (s.tokens = []));
  target.tokens = [0];
  g.systems.find((s) => s.id !== target.id).tokens = [1];
  g = step(g, { type: "resolve", system: target.id, action: "settle" });
  assert.equal(g.pending.action, "move");
  g = step(g, { type: "act", reveal: true });
  assert.equal(g.pending.kind, "orient");
  assert.equal(g.context.parent.kind, "settle");
  g = step(restoreGame(JSON.parse(JSON.stringify(g))), {
    type: "orient",
    rotation: g.pending.rotations[0],
  });
  assert.equal(g.pending.kind, "move");
  const entry = g.pending.entrySources.find((id) => system(g, id).ships[0] > 0);
  g = step(g, { type: "move", sources: { [entry]: 1 } });
  assert.equal(g.pending.kind, "rapid");
  g = step(g, { type: "rapid", skip: true });
  assert.equal(g.pending.action, "settle");
  assert.equal(g.pending.free, false);
  assert.deepEqual(g.players[0].used, ["settle"]);
  g = step(g, { type: "act", settlements: {} });
  assert.equal(g.context, null);
  assert.equal(g.turn, 1);
});

test("genuine 0.11 records retain max-Credit defaults and final scores during migration", () => {
  const restored = restoreGame(oldCompleted);
  assert.equal(restored.engine, "0.20.0");
  assert.deepEqual(restored.scores, oldCompleted.scores);
  assert.deepEqual(restored.config, {
    techPreset: "family",
    scenario: "standard",
    events: "simpler",
  });
  for (const checkpoint of oldCompleted.checkpoints.filter(
    (_, i) => i % 8 === 0,
  )) {
    const g = restoreGame({
      ...oldCompleted,
      revision: checkpoint.commands,
      commands: oldCompleted.commands.slice(0, checkpoint.commands),
    });
    assert.equal(g.phase, checkpoint.phase);
    assert.equal(g.pending?.kind ?? null, checkpoint.pending);
  }
});

test("new displays and R01 scenarios finish and replay identical games across 2–7 seats", () => {
  const cases = [
    { techPreset: "chains", scenario: "standard" },
    { techPreset: "mixed", scenario: "standard" },
    { techPreset: "mixed", scenario: "five-tech-chain" },
  ];
  let chains = 0,
    stalls = 0;
  for (let count = 2; count <= 7; count++)
    for (const config of cases) {
      let g = createGame(count, 31 + count, [], config);
      for (let i = 0; g.phase !== "finished" && i < 4000; i++)
        g = step(g, botCommand(g));
      assert.equal(
        g.phase,
        "finished",
        JSON.stringify({ count, config, phase: g.phase, pending: g.pending }),
      );
      assert.deepEqual(g.scores, scoreGame(g));
      let replay = createGame(
        count,
        g.seed,
        g.players.map((p) => p.name),
        g.config,
      );
      for (const { actor, command } of g.commands)
        replay = applyCommand(replay, actor, command);
      assert.deepEqual(replay, g);
      assert.deepEqual(restoreGame(JSON.parse(JSON.stringify(g))), g);
      chains += g.log.filter((l) => l.text.startsWith("Spice:")).length;
      stalls += g.log.filter((l) =>
        l.text.startsWith("Strategic Stall:"),
      ).length;
    }
  assert.ok(chains > 0);
  assert.ok(stalls > 0);
});
