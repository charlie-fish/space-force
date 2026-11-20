import test from "node:test";
import assert from "node:assert/strict";
import {
  ART,
  CARD_MAP,
  IMPLEMENTED_TECHS,
  REMAINING_TECHS,
  TECH_PRESETS,
  applyCommand,
  assertInvariants,
  attackCost,
  botCommand,
  canMove,
  canSoylent,
  createGame,
  credits,
  fixture,
  featureOptions,
  legalOrientations,
  movementLosses,
  peekEvents,
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
import oldChain from "./fixtures/v0.14-chain-completed.json" with { type: "json" };

function movement(holes = 0) {
  const g = fixture(),
    from = g.systems[0],
    target = g.systems.find((s) => !s.revealed && canMove(g, 0, from, s));
  target.rotation = legalOrientations(g, target.id, { [from.id]: 1 })[0];
  target.revealed = true;
  target.extraHoles = holes;
  g.systems.forEach((s) => (s.tokens = []));
  target.tokens = [0];
  g.systems.find((s) => s.id !== target.id).tokens = [1];
  return { g, from, target };
}
function fullSystem(g, s, except) {
  for (const [i, p] of s.planets.entries()) {
    const free =
      p.capacity -
      p.owners.reduce((a, b) => a + b, 0) -
      (p.id === except ? 1 : 0);
    if (free > 0) settlement(g, s, i, 1, free);
  }
}

test("all thirty Techs are available; simpler Events replaces Foresight legally and the labelled test keeps it", () => {
  assert.equal(REMAINING_TECHS.length, 10);
  assert.equal(new Set(IMPLEMENTED_TECHS).size, 30);
  for (const techPreset of Object.keys(TECH_PRESETS)) {
    const g = createGame(7, 71, [], { techPreset, scenario: "standard" });
    assert.equal(g.market.length, 10);
    assert.equal(new Set(g.market).size, 10);
    assert.equal(g.market.includes("tech.foresight"), false);
    assert.deepEqual(createGame(7, 71, [], g.config), g);
  }
  const normal = createGame(2, 4, [], {
    techPreset: "remaining",
    scenario: "standard",
  });
  const substitute = normal.market.find((t) => !REMAINING_TECHS.includes(t));
  assert.ok([2, 3].includes(CARD_MAP[substitute].cost));
  assert.match(normal.log[0].text, /R08/);
  const laboratory = createGame(2, 4, [], {
    techPreset: "remaining",
    scenario: "standard",
    events: "foresight-test",
  });
  assert.deepEqual(laboratory.market, REMAINING_TECHS);
});

test("Death Sun sacrifices allocate exclusively to Ship groups or Settlement groups", () => {
  const g = fixture();
  tech(g, 0, "death-sun");
  for (let ships = 0; ships <= 10; ships++)
    for (let settlements = 0; settlements <= 10; settlements++) {
      let minimum;
      for (let own = 0; own <= 20 && minimum === undefined; own++)
        for (let shipGroups = 0; shipGroups <= own; shipGroups++) {
          if (
            ships <= 3 * shipGroups &&
            settlements <= 2 * (own - shipGroups)
          ) {
            minimum = own;
            break;
          }
        }
      assert.equal(
        attackCost(g, ships, settlements),
        minimum,
        `${ships} Ships + ${settlements} Settlements`,
      );
    }
});

test("Death Sun requires separate sacrifices for Ships and Settlements and keeps normal protections", () => {
  const g = fixture(),
    s = g.systems[0],
    p = s.planets[1];
  tech(g, 0, "death-sun");
  ships(g, s, 1, 2);
  settlement(g, s, 1, 1, 1);
  const result = step(g, {
    type: "resolve",
    system: s.id,
    action: "attack",
    attack: {
      sacrifice: 2,
      ships: { 1: 2 },
      settlements: { [p.id]: { 1: 1 } },
    },
  });
  assert.equal(result.players[0].credits, 2);
  assert.equal(result.players[1].credits, 3);
  assert.equal(system(result, s.id).ships[1], 0);
  assert.equal(system(result, s.id).planets[1].owners[1], 0);
  settlement(g, s, 1, 1, 1);
  assert.throws(
    () =>
      step(g, {
        type: "resolve",
        system: s.id,
        action: "attack",
        attack: {
          sacrifice: 1,
          ships: { 1: 1 },
          settlements: { [p.id]: { 1: 2 } },
        },
      }),
    /Death Sun/,
  );
  tech(g, 1, "patrol");
  assert.throws(
    () =>
      step(g, {
        type: "resolve",
        system: s.id,
        action: "attack",
        attack: { sacrifice: 1, ships: {}, settlements: { [p.id]: { 1: 1 } } },
      }),
    /Patrol/,
  );
});

test("Gravity Drive carries only one co-located opponent per inbound carrier, with a legal carrier route", () => {
  const { g, from, target } = movement();
  tech(g, 0, "gravity-drive");
  ships(g, from, 1, 3);
  const carried = { [from.id]: { 1: 2 } };
  const result = step(g, {
    type: "resolve",
    action: "move",
    system: target.id,
    sources: { [from.id]: 2 },
    carried,
  });
  assert.equal(system(result, from.id).ships[1], 1);
  assert.equal(system(result, target.id).ships[1], 2);
  assert.equal(system(result, target.id).ships[0], 2);
  assert.throws(
    () =>
      step(g, {
        type: "resolve",
        action: "move",
        system: target.id,
        sources: { [from.id]: 1 },
        carried,
      }),
    /one opponent Ship/,
  );
  assert.throws(
    () =>
      step(g, {
        type: "resolve",
        action: "move",
        system: target.id,
        sources: { [from.id]: 2 },
        carried: { [target.id]: { 1: 1 } },
      }),
    /Not enough passenger/,
  );
  const plain = movement();
  ships(plain.g, plain.from, 1, 1);
  assert.throws(
    () =>
      step(plain.g, {
        type: "resolve",
        action: "move",
        system: plain.target.id,
        sources: { [plain.from.id]: 1 },
        carried: { [plain.from.id]: { 1: 1 } },
      }),
    /Gravity Drive/,
  );
});

test("Gravity Drive black holes remove the chosen owners' incoming Ships and never strand or double-kill passengers", () => {
  const { g, from, target } = movement(3);
  tech(g, 0, "gravity-drive");
  ships(g, from, 1, 2);
  const sources = { [from.id]: 2 },
    carried = { [from.id]: { 1: 2 } };
  const losses = movementLosses(g, target, sources, carried);
  assert.equal(losses.total, 3);
  assert.equal(losses.own, 1);
  assert.equal(losses.passengers[1], 2);
  const result = step(g, {
    type: "resolve",
    action: "move",
    system: target.id,
    sources,
    carried,
    passengerLosses: { 1: 1 },
  });
  assert.equal(system(result, target.id).ships[0], 0);
  assert.equal(system(result, target.id).ships[1], 1);
  assert.equal(result.players[0].credits, 2);
  assert.equal(result.players[1].credits, 1);
  assert.throws(
    () =>
      step(g, {
        type: "resolve",
        action: "move",
        system: target.id,
        sources,
        carried,
        passengerLosses: { 1: 0 },
      }),
    /casualties/,
  );
  target.extraHoles = 6;
  const all = step(g, {
    type: "resolve",
    action: "move",
    system: target.id,
    sources,
    carried,
  });
  assert.equal(all.players[0].credits, 2);
  assert.equal(all.players[1].credits, 2);
  assert.equal(
    system(all, target.id).ships.reduce((a, b) => a + b),
    0,
  );
});

test("carried Ships survive an exploration/orientation save checkpoint and move only after mandatory entry", () => {
  let { g, from, target } = movement();
  target.revealed = false;
  tech(g, 0, "gravity-drive");
  ships(g, from, 1, 1);
  const carried = { [from.id]: { 1: 1 } };
  g = step(g, {
    type: "resolve",
    action: "move",
    system: target.id,
    sources: { [from.id]: 1 },
    carried,
  });
  assert.equal(g.pending.kind, "orient");
  g = step(restoreGame(JSON.parse(JSON.stringify(g))), {
    type: "orient",
    rotation: g.pending.rotations[0],
  });
  assert.deepEqual(g.pending.carried, carried);
  assert.equal(system(g, from.id).ships[1], 1);
  g = step(g, {
    type: "move",
    sources: { [from.id]: 1 },
    carried: g.pending.carried,
  });
  assert.equal(system(g, target.id).ships[1], 1);
});

test("Mercenaries always precedes Rapid Advance, including after black holes remove every incoming Ship", () => {
  const { g, from, target } = movement(2);
  tech(g, 0, "mercenaries");
  tech(g, 0, "rapid-advance");
  credits(g, 0, 3);
  const moved = step(g, {
    type: "resolve",
    action: "move",
    system: target.id,
    sources: { [from.id]: 2 },
  });
  assert.equal(moved.pending.kind, "mercenaries");
  assert.equal(system(moved, target.id).ships[0], 0);
  assert.throws(
    () => step(moved, { type: "orderAfter", tech: "rapid-advance" }),
    /No after-MOVE ordering/,
  );
  assert.throws(
    () => step(moved, { type: "rapid", planet: target.planets[0].id }),
    /No Rapid/,
  );
  let hired = step(moved, { type: "mercenaries", count: 3 });
  assert.equal(hired.pending.kind, "rapid");
  assert.equal(system(hired, target.id).ships[0], 3);
  hired = step(hired, { type: "rapid", planet: target.planets[0].id });
  assert.equal(system(hired, target.id).ships[0], 2);
  assert.equal(system(hired, target.id).planets[0].owners[0], 1);
  const declined = step(moved, { type: "mercenaries", count: 0 });
  assert.equal(declined.context, null);
  assert.equal(system(declined, target.id).planets[0].owners[0], 0);
  assert.throws(
    () => step(moved, { type: "mercenaries", count: 4 }),
    /whole-number/,
  );
});

test("Soylent Green uses Ships to replace opponents on full shared planets, bypassing ATTACK-only Patrol", () => {
  const g = fixture(),
    s = g.systems[0];
  tech(g, 0, "soylent-green");
  tech(g, 1, "patrol");
  fullSystem(g, s);
  ships(g, s, 1, 1);
  assert.equal(canSoylent(g, s), true);
  const replacements = {
    [s.planets[0].id]: { 1: 1 },
    [s.planets[1].id]: { 1: 1 },
  };
  const result = step(g, {
    type: "resolve",
    action: "settle",
    system: s.id,
    settlements: {},
    replacements,
  });
  assert.equal(system(result, s.id).ships[0], 1);
  assert.equal(result.players[1].credits, 2);
  assert.equal(system(result, s.id).planets[0].owners[0], 4);
  assert.equal(system(result, s.id).planets[1].owners[0], 1);
  assert.deepEqual(result.players[0].used, ["settle"]);
  assert.equal(system(result, s.id).ships[1], 1);
});

test("Soylent eligibility is rechecked after ordinary placements and respects shared Arcologies overflow", () => {
  const g = fixture(),
    s = g.systems[0],
    last = s.planets.at(-1);
  tech(g, 0, "soylent-green");
  tech(g, 0, "arcologies");
  fullSystem(g, s, last.id);
  assert.equal(canSoylent(g, s), false);
  assert.throws(
    () =>
      step(g, {
        type: "resolve",
        action: "settle",
        system: s.id,
        replacements: { [s.planets[1].id]: { 1: 1 } },
      }),
    /every unblocked planet/,
  );
  const result = step(g, {
    type: "resolve",
    action: "settle",
    system: s.id,
    settlements: { [last.id]: 1 },
    replacements: { [s.planets[1].id]: { 1: 1 } },
  });
  assert.equal(canSoylent(result, system(result, s.id), 0), true);
  assert.equal(system(result, s.id).ships[0], 1);
  const full = system(result, s.id).planets[1];
  assert.equal(settlementSpace(result, full, 0), 1);
  assert.equal(production(result, system(result, s.id), 0), 6);
});

test("an Explore gift filling the final space enables Soylent replacement in the locked redistribution decision", () => {
  let g = fixture();
  const s = g.systems[0],
    p = s.planets.at(-1);
  tech(g, 0, "soylent-green");
  fullSystem(g, s, p.id);
  p.explore = "otherSettlement";
  g = step(g, {
    type: "resolve",
    action: "settle",
    system: s.id,
    settlements: { [p.id]: 1 },
  });
  assert.equal(g.pending.kind, "explore");
  g = step(g, { type: "explore", recipient: 1 });
  assert.equal(g.pending.kind, "redistribute");
  assert.equal(canSoylent(g, system(g, s.id)), true);
  g = step(restoreGame(JSON.parse(JSON.stringify(g))), {
    type: "redistribute",
    ships: 0,
    settlements: {},
    replacements: { [p.id]: { 1: 1 } },
  });
  assert.equal(system(g, s.id).planets.at(-1).owners[0], 1);
  assert.equal(g.players[1].credits, 1);
  assert.equal(system(g, s.id).ships[0], 2);
  assert.equal(g.context, null);
});

test("Explore resolves before a Soylent replacement, preserving the replacement target across acknowledgement", () => {
  let g = fixture();
  const s = g.systems[0],
    p = s.planets[1];
  tech(g, 0, "soylent-green");
  fullSystem(g, s);
  p.explore = "credit1";
  g = step(g, {
    type: "resolve",
    action: "settle",
    system: s.id,
    settlements: {},
    replacements: { [p.id]: { 1: 1 } },
  });
  assert.equal(g.pending.kind, "ack");
  assert.equal(system(g, s.id).planets[1].owners[0], 0);
  g = step(restoreGame(JSON.parse(JSON.stringify(g))), { type: "acknowledge" });
  assert.equal(system(g, s.id).planets[1].owners[0], 1);
  assert.equal(g.players[0].credits, 1);
  assert.equal(g.players[1].credits, 1);
});

test("Filibuster owners lift the exact selected own token in first-player order after all placements", () => {
  let g = setup(3);
  tech(g, 0, "filibuster");
  tech(g, 2, "filibuster");
  g.first = 2;
  g.turn = 2;
  const id = g.systems[0].id;
  while (!g.pending) g = step(g, { type: "plan", system: id });
  assert.equal(g.pending.kind, "filibuster");
  assert.equal(g.turn, 2);
  const before = system(g, id).tokens.slice(),
    index = before.indexOf(2);
  g = step(g, { type: "filibuster", system: id, index });
  const expected = before.filter((_, i) => i !== index).concat(2);
  assert.deepEqual(system(g, id).tokens, expected);
  assert.equal(g.turn, 0);
  assert.equal(g.phase, "plan");
  assert.throws(
    () =>
      step(g, { type: "filibuster", system: id, index: expected.indexOf(1) }),
    /own action tokens/,
  );
  g = step(g, { type: "filibuster", skip: true });
  assert.equal(g.phase, "actions");
  assert.equal(
    g.systems.reduce((n, s) => n + s.tokens.length, 0),
    12,
  );
  assert.ok(g.players.every((p) => p.used.length === 0));
});

function insuranceFixture() {
  const g = fixture();
  tech(g, 0, "insurance");
  g.players[0].used = ["move", "settle", "produce"];
  g.systems.forEach((s) => (s.tokens = []));
  g.systems[1].tokens = [0, 1, 1];
  g.turn = 1;
  return g;
}
test("Insurance awards skipped turns only while the owner has tokens on the board", () => {
  let g = insuranceFixture(),
    id = g.systems[1].id;
  g = step(g, { type: "resolve", action: "move", system: id, invest: true });
  assert.equal(g.turn, 0);
  assert.equal(g.pending.kind, "insurance");
  const before = g.players[0].credits;
  g = step(g, { type: "insurance" });
  assert.equal(g.players[0].credits, before + 1);
  assert.equal(g.turn, 1);
  g = step(g, { type: "resolve", action: "attack", system: id, invest: true });
  assert.equal(g.turn, 0);
  assert.equal(g.pending, null);
  g = step(g, { type: "resolve", action: "attack", system: id, invest: true });
  assert.notEqual(g.phase, "actions");
  assert.equal(g.players[0].credits, before + 1);
});

test("Insurance Ships may use an empty home or a current Settlement, with Flexible Economy available before choosing", () => {
  let g = insuranceFixture();
  tech(g, 0, "flexible-economy");
  const home = system(g, g.players[0].home),
    oldHome = home.planets.find((p) => p.home);
  g.players[0].reserve += oldHome.owners[0];
  oldHome.owners[0] = 0;
  credits(g, 0, g.players[0].reserve);
  g = step(g, {
    type: "resolve",
    action: "move",
    system: g.systems[1].id,
    invest: true,
  });
  assert.equal(g.pending.kind, "insurance");
  const invalid = g.systems.find(
    (s) => s.id !== home.id && !s.planets.some((p) => p.owners[0]),
  );
  assert.throws(
    () => step(g, { type: "insurance", system: invalid.id }),
    /home system or/,
  );
  const empty = step(g, { type: "insurance" });
  assert.equal(empty.pending.kind, "reserve");
  g = step(g, { type: "returnCredits", count: 2 });
  assert.equal(g.pending.kind, "insurance");
  const initialShips = system(g, home.id).ships[0];
  g = step(g, { type: "insurance", system: home.id });
  assert.equal(system(g, home.id).ships[0], initialShips + 1);
  assert.equal(g.players[0].reserve, 1);
  assert.equal(g.turn, 1);
});

test("Flexible Economy works off-turn during an opponent Explore decision without consuming tokens or changing the pending choice", () => {
  let g = fixture(),
    s = g.systems[0],
    p = s.planets[1];
  tech(g, 1, "flexible-economy");
  credits(g, 1, g.players[1].reserve);
  p.explore = "otherShips";
  g = step(g, {
    type: "resolve",
    action: "settle",
    system: s.id,
    settlements: { [p.id]: 1 },
  });
  const pending = structuredClone(g.pending),
    used = g.players.map((p) => p.used.slice());
  g = applyCommand(g, 1, { type: "returnCredits", count: 2 });
  assert.equal(g.turn, 0);
  assert.deepEqual(g.pending, pending);
  assert.deepEqual(
    g.players.map((p) => p.used),
    used,
  );
  assert.equal(g.players[1].reserve, 2);
  assert.equal(g.commands.at(-1).actor, 1);
  g = step(g, { type: "explore", recipient: 1 });
  assert.equal(system(g, s.id).ships[1], 2);
  assert.equal(g.pending, null);
  assert.throws(
    () => applyCommand(g, 1, { type: "returnCredits", count: 41 }),
    /whole-number/,
  );
});

test("Eminent Domain runs a true free home SETTLE chain in player order before scoring, without ACTIONS-only Banking", () => {
  let g = setup();
  g.phase = "tech";
  g.finalEconomy = true;
  g.players.forEach((p) => (p.used = ["move", "settle", "produce", "attack"]));
  for (const id of [0, 1]) tech(g, id, "eminent-domain");
  for (const t of [
    "frontier-pioneer",
    "government-incentives",
    "rapid-advance",
    "banking",
  ])
    tech(g, 0, t);
  g = step(g, { type: "buy", tech: null });
  g = step(g, { type: "buy", tech: null });
  assert.equal(g.phase, "endgame");
  assert.equal(g.turn, 0);
  assert.equal(g.pending.kind, "eminent");
  g = step(g, { type: "eminent", use: true });
  assert.equal(g.pending.action, "move");
  g = step(g, { type: "act", sources: {}, bank: true });
  assert.equal(g.pending.kind, "rapid");
  const home = system(g, g.players[0].home);
  g = step(g, { type: "rapid", planet: home.planets[1].id });
  assert.equal(g.pending.action, "settle");
  assert.equal(g.pending.free, true);
  g = step(g, {
    type: "act",
    settlements: { [home.planets[2].id]: 1 },
    bank: true,
  });
  assert.equal(g.pending.kind, "eminent");
  assert.equal(g.turn, 1);
  assert.equal(g.players[0].invested, 0);
  g = step(g, { type: "eminent", use: false });
  assert.equal(g.phase, "finished");
  assert.deepEqual(g.scores, scoreGame(g));
  assert.equal(g.scores.find((s) => s.player === 0).planets, 3);
  assert.equal(g.players[0].used.length, 4);
});

test("Eminent Domain acquired in final Economy is used immediately before scoring", () => {
  let g = setup(2, 7, { techPreset: "remaining", scenario: "standard" });
  g.phase = "tech";
  g.finalEconomy = true;
  credits(g, 0, 3);
  g = step(g, { type: "buy", tech: "tech.eminent-domain" });
  g = step(g, { type: "buy", tech: null });
  assert.equal(g.pending.kind, "eminent");
  assert.equal(g.turn, 0);
});

test("Sabotage uses undiscounted value with Research Lab, allows deliberate overpayment, and returns the removed marker", () => {
  let g = setup(2, 8, { techPreset: "remaining", scenario: "standard" });
  g.phase = "tech";
  tech(g, 0, "research-lab");
  tech(g, 1, "arcologies");
  credits(g, 0, 20);
  assert.equal(purchaseCost(g, "tech.sabotage", 0, false, 5), 5);
  const reserve = g.players[1].reserve;
  const result = step(g, {
    type: "buy",
    tech: "tech.sabotage",
    value: 5,
    target: { player: 1, tech: "tech.arcologies" },
  });
  assert.equal(result.players[0].credits, 15);
  assert.equal(result.players[1].reserve, reserve + 1);
  assert.equal(result.players[1].techs.includes("tech.arcologies"), false);
  assert.equal(result.players[0].techs.includes("tech.sabotage"), true);
  const overpaid = step(g, {
    type: "buy",
    tech: "tech.sabotage",
    value: 11,
    target: { player: 1, tech: "tech.arcologies" },
    fullPrice: true,
  });
  assert.equal(overpaid.players[0].credits, 9);
  assert.equal(result.turn, 1);
  assert.throws(
    () =>
      step(g, {
        type: "buy",
        tech: "tech.sabotage",
        value: 4,
        target: { player: 1, tech: "tech.arcologies" },
      }),
    /No opponent Tech/,
  );
});

test("Sabotage rejects self, Sabotage, targetless and final-round purchases, and respects Patents", () => {
  const g = setup(2, 8, { techPreset: "remaining", scenario: "standard" });
  g.phase = "tech";
  credits(g, 0, 20);
  tech(g, 0, "arcologies");
  assert.match(
    purchaseReason(g, "tech.sabotage", 0, false, 5),
    /No opponent Tech/,
  );
  tech(g, 1, "sabotage");
  assert.throws(
    () =>
      step(g, {
        type: "buy",
        tech: "tech.sabotage",
        value: 5,
        target: { player: 1, tech: "tech.sabotage" },
      }),
    /No opponent Tech/,
  );
  tech(g, 1, "patents");
  assert.match(purchaseReason(g, "tech.sabotage", 0, false, 5), /Patents/);
  g.players[1].techs.splice(g.players[1].techs.indexOf("tech.patents"), 1);
  g.players[1].reserve++;
  tech(g, 1, "arcologies");
  assert.throws(
    () =>
      step(g, {
        type: "buy",
        tech: "tech.sabotage",
        value: 5,
        target: { player: 0, tech: "tech.arcologies" },
      }),
    /legal opposing Tech/,
  );
  g.round = 6;
  assert.match(purchaseReason(g, "tech.sabotage", 0, false, 5), /last round/);
});

test("Foresight returns only the owner's next two Events without drawing, public logging or state mutation", () => {
  const g = setup(2, 9, {
    techPreset: "remaining",
    scenario: "standard",
    events: "foresight-test",
  });
  tech(g, 1, "foresight");
  const before = JSON.stringify(g);
  assert.deepEqual(peekEvents(g, 1), g.events.slice(0, 2));
  assert.throws(() => peekEvents(g, 0), /Only a Foresight owner/);
  assert.equal(JSON.stringify(g), before);
  g.events.splice(0, 2);
  assert.deepEqual(peekEvents(g, 1), g.events.slice(0, 2));
  g.config.events = "simpler";
  assert.throws(() => peekEvents(g, 1), /Only a Foresight owner/);
});

test("genuine 0.14 nested-chain saves migrate at intermediate choices and retain final scores", () => {
  for (const point of oldChain.checkpoints) {
    const g = restoreGame({
      ...oldChain,
      revision: point.commands,
      commands: oldChain.commands.slice(0, point.commands),
    });
    assert.equal(g.pending.kind, point.pending);
    assert.equal(g.phase, point.phase);
    assert.equal(g.engine, "0.21.0");
    assert.ok(g.context);
  }
  const done = restoreGame(oldChain);
  assert.deepEqual(done.scores, oldChain.scores);
  assert.deepEqual(done.winners, oldChain.winners);
});

test("every new decision checkpoint survives JSON autosave and continues identically", () => {
  const checkpoints = [];
  let g = setup();
  tech(g, 0, "filibuster");
  while (!g.pending) g = step(g, { type: "plan", system: g.systems[0].id });
  checkpoints.push(g);
  g = insuranceFixture();
  g = step(g, {
    type: "resolve",
    action: "move",
    system: g.systems[1].id,
    invest: true,
  });
  checkpoints.push(g);
  const m = movement(2);
  g = m.g;
  tech(g, 0, "mercenaries");
  tech(g, 0, "rapid-advance");
  credits(g, 0, 3);
  g = step(g, {
    type: "resolve",
    action: "move",
    system: m.target.id,
    sources: { [m.from.id]: 2 },
  });
  checkpoints.push(g);
  g = step(g, { type: "mercenaries", count: 2 });
  checkpoints.push(g);
  g = setup();
  tech(g, 0, "eminent-domain");
  g.phase = "tech";
  g.finalEconomy = true;
  g.turn = 1;
  g = step(g, { type: "buy", tech: null });
  checkpoints.push(g);
  for (const checkpoint of checkpoints) {
    const restored = restoreGame(JSON.parse(JSON.stringify(checkpoint)));
    assert.deepEqual(restored, checkpoint);
    const command = botCommand(checkpoint);
    assert.deepEqual(step(restored, command), step(checkpoint, command));
  }
});

test("Sabotage ends ongoing ownership effects but retains already placed feature pieces", () => {
  let g = setup();
  g.market[0] = "tech.sabotage";
  g.phase = "tech";
  g.turn = 1;
  credits(g, 1, 4);
  g = step(g, { type: "buy", tech: "tech.planet-nine" });
  const target = featureOptions(g, "tech.planet-nine")[0];
  g = step(g, { type: "feature", ...target });
  const planet = structuredClone(system(g, target.system).planets.at(-1));
  g.phase = "tech";
  g.turn = 0;
  credits(g, 0, 4);
  g = step(g, {
    type: "buy",
    tech: "tech.sabotage",
    value: 4,
    target: { player: 1, tech: "tech.planet-nine" },
  });
  assert.equal(g.players[1].techs.includes("tech.planet-nine"), false);
  assert.equal(g.features.planet, true);
  assert.deepEqual(system(g, target.system).planets.at(-1), planet);
});

test("remaining-card, printed and random displays complete and exactly replay games at all supported counts", () => {
  const cases = [
    {
      techPreset: "remaining",
      events: "foresight-test",
      scenario: "five-tech-chain",
    },
    { techPreset: "peaceful", events: "simpler" },
    { techPreset: "economic", events: "simpler" },
    { techPreset: "cunning", events: "simpler" },
    { techPreset: "aggressive", events: "simpler" },
    { techPreset: "random", events: "simpler" },
  ];
  const exercised = new Set();
  for (let count = 2; count <= 7; count++)
    for (const config of cases) {
      let g = createGame(count, 100 + count, [], {
        scenario: "standard",
        ...config,
      });
      for (let i = 0; g.phase !== "finished" && i < 6000; i++) {
        const command = botCommand(g);
        // This driver chooses Credits to fund the expensive Tech interactions.
        if (
          command.type === "resolve" &&
          command.action === "produce" &&
          !command.invest
        )
          command.credits = Math.min(
            player(g).reserve,
            production(g, system(g, command.system)),
          );
        if (command.type === "act" && g.context?.kind === "produce")
          command.credits = Math.min(
            player(g).reserve,
            production(g, system(g, g.context.system)),
          );
        if (
          command.type === "buy" &&
          g.market.includes("tech.mercenaries") &&
          !purchaseReason(g, "tech.mercenaries")
        )
          command.tech = "tech.mercenaries";
        g = step(g, command);
        if (g.pending) exercised.add(g.pending.kind);
      }
      assert.equal(
        g.phase,
        "finished",
        JSON.stringify({ count, config, phase: g.phase, pending: g.pending }),
      );
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
    }
  for (const kind of ["eminent", "insurance", "filibuster", "mercenaries"])
    assert.ok(exercised.has(kind), `Missing full-game exercise: ${kind}`);
});
