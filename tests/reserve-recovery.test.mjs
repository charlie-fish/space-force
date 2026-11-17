import test from "node:test";
import assert from "node:assert/strict";
import {
  CHAIN_TECHS,
  CARD_MAP,
  applyCommand,
  assertInvariants,
  attackCost,
  botCommand,
  credits,
  fixture,
  player,
  production,
  purchaseCost,
  purchaseReason,
  replayGame,
  settlement,
  setup,
  ships,
  step,
  system,
  tech,
} from "./helpers.mjs";
import { restoreGame } from "../work/compiled/persistence.js";
import legacy from "./fixtures/v0.15-flexible-completed.json" with { type: "json" };

function flexibleFixture(reserve = 0, count = 6, extras = []) {
  const g = fixture(),
    s = g.systems[0];
  tech(g, 0, "flexible-economy");
  for (const t of extras) tech(g, 0, t);
  credits(g, 0, count);
  ships(g, s, 0, g.players[0].reserve - reserve);
  return g;
}
function producing() {
  const g = fixture(),
    s = g.systems[0];
  tech(g, 0, "flexible-economy");
  settlement(g, s, 0, 0, 3);
  settlement(g, s, 1, 0, 1);
  credits(g, 0, 6);
  ships(g, s, 0, g.players[0].reserve - 1);
  return g;
}
function refill(g, owner = g.pending.owner) {
  return applyCommand(g, owner, { type: "returnCredits", count: 1 });
}

test("partial production completes from one-Credit top-ups without repeating the initial gain or consuming another action", () => {
  let g = producing();
  const id = g.systems[0].id,
    before = system(g, id).ships[0];
  assert.equal(production(g, system(g, id)), 3);
  g = step(g, { type: "resolve", action: "produce", system: id });
  assert.equal(g.pending.kind, "reserve");
  assert.equal(g.pending.remaining, 2);
  assert.equal(system(g, id).ships[0], before + 1);
  g = refill(g);
  g = step(g, { type: "useReserve" });
  assert.equal(g.pending.remaining, 1);
  assert.equal(g.turn, 0);
  assert.equal(system(g, id).ships[0], before + 2);
  const saved = restoreGame(JSON.parse(JSON.stringify(g)));
  assert.deepEqual(saved, g);
  g = refill(saved);
  g = step(g, { type: "useReserve" });
  assert.equal(g.context, null);
  assert.equal(g.turn, 1);
  assert.equal(system(g, id).ships[0], before + 3);
  assert.deepEqual(g.players[0].used, ["produce"]);
  assert.equal(g.players[0].credits, 4);
  assert.equal(g.log.filter((l) => l.text.startsWith("Produced ")).length, 1);
});

test("unfinished production can be allocated between Ships and Credits without changing completed output", () => {
  let g = producing(),
    id = g.systems[0].id,
    initialShips = g.systems[0].ships[0];
  g = step(g, { type: "resolve", action: "produce", system: id });
  g = refill(g);
  g = step(g, { type: "useReserve", credits: 2 });
  assert.equal(g.pending.effect.credits, 1);
  assert.equal(g.pending.remaining, 1);
  g = refill(g);
  g = step(g, { type: "useReserve" });
  assert.equal(system(g, id).ships[0], initialShips + 1);
  assert.equal(g.players[0].credits, 6); // Two returned Credits and two newly produced Credits.
});

test("continuing a shortfall keeps only the applied result and an unavailable Reserve cannot be overdrawn", () => {
  let g = producing(),
    id = g.systems[0].id,
    initial = g.systems[0].ships[0];
  g = step(g, { type: "resolve", action: "produce", system: id });
  const before = JSON.stringify(g);
  assert.throws(() => step(g, { type: "useReserve" }), /Return a Credit/);
  assert.equal(JSON.stringify(g), before);
  g = step(g, { type: "finishReserve" });
  assert.equal(system(g, id).ships[0], initial + 1);
  assert.equal(g.turn, 1);
  assert.equal(g.players[0].credits, 6);
  assert.throws(() => step(g, { type: "useReserve" }), /No Reserve/);
});

for (const action of ["settle", "attack"])
  test(`Flexible Economy recovers a missing before-${action} Ship exactly once`, () => {
    const name = action === "settle" ? "frontier-pioneer" : "cloaking";
    let g = flexibleFixture(0, 6, [name]),
      id = g.systems[0].id,
      before = g.systems[0].ships[0];
    g = step(g, { type: "resolve", action, system: id });
    assert.equal(g.pending.kind, "reserve");
    g = refill(g);
    g = step(g, { type: "useReserve" });
    assert.equal(g.pending.kind, "action");
    assert.equal(system(g, id).ships[0], before + 1);
    g = step(g, {
      type: "act",
      ...(action === "settle" ? { settlements: {} } : {}),
    });
    assert.equal(g.context, null);
    assert.equal(system(g, id).ships[0], before + 1);
    assert.deepEqual(g.players[0].used, [action]);
    assert.equal(
      g.log.filter((l) =>
        l.text.startsWith(CARD_MAP[`tech.${name}`].title + ": added"),
      ).length,
      1,
    );
  });

test("Banking can recover its single investment and root Investing does not run Banking twice", () => {
  let g = flexibleFixture(0, 6, ["banking"]),
    id = g.systems[0].id;
  g = step(g, {
    type: "resolve",
    action: "move",
    system: id,
    sources: {},
    bank: true,
  });
  assert.equal(g.pending.label, "Banking");
  assert.equal(g.context.bankDone, true);
  g = refill(g);
  g = step(g, { type: "useReserve" });
  assert.equal(g.players[0].invested, 1);
  assert.deepEqual(g.players[0].investedActions, ["move"]);
  assert.equal(g.turn, 1);
  let invested = flexibleFixture(0, 6, ["banking"]);
  invested = step(invested, {
    type: "resolve",
    action: "attack",
    system: id,
    invest: true,
  });
  assert.equal(invested.pending.effect.banking, false);
  invested = refill(invested);
  invested = step(invested, { type: "useReserve" });
  assert.equal(invested.players[0].invested, 1);
  assert.deepEqual(invested.players[0].investedActions, ["attack"]);
  assert.equal(invested.turn, 1);
});

test("a partial Explore Credit reward can recycle its first Credit to finish, then places the original Settlement once", () => {
  let g = flexibleFixture(1, 0),
    id = g.systems[0].id,
    pid = g.systems[0].planets[1].id,
    before = g.systems[0].ships[0];
  g.systems[0].planets[1].explore = "credit3";
  g = step(g, {
    type: "resolve",
    action: "settle",
    system: id,
    settlements: { [pid]: 1 },
  });
  assert.equal(g.pending.kind, "reserve");
  assert.equal(g.pending.remaining, 2);
  assert.equal(g.players[0].credits, 1);
  assert.equal(system(g, id).planets[1].owners[0], 0);
  for (let n = 0; n < 2; n++) {
    g = refill(g);
    g = step(g, { type: "useReserve" });
  }
  assert.equal(g.context, null);
  assert.equal(system(g, id).planets[1].owners[0], 1);
  assert.equal(system(g, id).ships[0], before - 1);
  assert.equal(g.players[0].credits, 1);
  assert.equal(
    g.log.filter((l) => l.text.startsWith("Explore token revealed: +3")).length,
    1,
  );
  assert.equal(system(g, id).planets[1].explore, null);
});

for (const effect of ["otherShips", "otherSettlement"])
  test(`an opponent's ${effect} gift fails without a Reserve interruption even when they own Flexible economy`, () => {
    let g = fixture(),
      id = g.systems[0].id,
      p = g.systems[0].planets[1];
    tech(g, 1, "flexible-economy");
    credits(g, 1, 2);
    ships(g, g.systems[1], 1, g.players[1].reserve);
    p.explore = effect;
    const ownShips = g.systems[0].ships[0],
      otherShips = g.systems[0].ships[1];
    g = step(g, {
      type: "resolve",
      action: "settle",
      system: id,
      settlements: { [p.id]: 1 },
    });
    g = step(g, { type: "explore", recipient: 1 });
    assert.equal(g.pending, null);
    assert.equal(g.context, null);
    assert.equal(g.turn, 1);
    assert.equal(g.players[1].credits, 2);
    assert.equal(g.players[1].reserve, 0);
    assert.equal(system(g, id).ships[1], otherShips);
    assert.equal(system(g, id).planets[1].owners[1], 0);
    assert.equal(system(g, id).planets[1].owners[0], 1);
    assert.equal(system(g, id).ships[0], ownShips - 1);
    assert.match(
      g.log.findLast((l) => l.text.startsWith("Explore result:")).text,
      /gift.*failed.*Reserve was empty/,
    );
  });

test("Genesis resumes after separate Explore and Settlement shortfalls without flipping or placing twice", () => {
  let g = setup();
  tech(g, 0, "flexible-economy");
  credits(g, 0, 6);
  ships(g, g.systems[0], 0, g.players[0].reserve - 3);
  g.phase = "tech";
  const target = g.systems[0].planets[1];
  target.explore = "credit3";
  g = step(g, { type: "buy", tech: "tech.genesis" });
  // Prepare a legal late-game position with two Reserve after the ownership marker and payment.
  ships(g, g.systems[0], 0, g.players[0].reserve - 2);
  g = step(g, { type: "feature", system: g.systems[0].id, planet: target.id });
  assert.equal(g.pending.kind, "reserve");
  assert.equal(g.pending.label, "Explore Credits");
  while (g.pending?.label === "Explore Credits") {
    g = refill(g);
    g = step(g, { type: "useReserve" });
  }
  assert.equal(g.pending.label, "Genesis Settlement");
  g = refill(g);
  g = step(g, { type: "useReserve" });
  assert.equal(g.turn, 1);
  assert.equal(g.pending, null);
  assert.equal(g.systems[0].planets[1].owners[0], 1);
  assert.equal(
    g.players[0].techs.filter((t) => t === "tech.genesis").length,
    1,
  );
});

test("reinforcement top-ups preserve earlier Ships, legal destinations and the full allowance cap", () => {
  let g = flexibleFixture(1, 5),
    id = g.players[0].home;
  g.phase = "reinforce";
  const before = system(g, id).ships[0];
  g = step(g, { type: "allocate", credits: 0, ships: { [id]: 1 } });
  assert.equal(g.pending.remaining, 2);
  g = refill(g);
  assert.throws(
    () => step(g, { type: "useReserve", ships: { [id]: 2 } }),
    /cannot exceed/,
  );
  const illegal = g.systems.find((s) => !s.revealed).id;
  assert.throws(
    () => step(g, { type: "useReserve", ships: { [illegal]: 1 } }),
    /at home/,
  );
  g = step(g, { type: "useReserve", ships: { [id]: 1 } });
  g = refill(g);
  g = step(g, { type: "useReserve", ships: { [id]: 1 } });
  assert.equal(system(g, id).ships[0], before + 3);
  assert.equal(g.turn, 1);
  assert.equal(g.pending, null);
  let empty = flexibleFixture(0, 0);
  empty.phase = "tech";
  empty.turn = 1;
  empty = step(empty, { type: "buy", tech: null });
  assert.equal(empty.turn, 0);
  assert.equal(empty.pending.label, "Reinforcements");
  empty = step(empty, { type: "finishReserve" });
  assert.equal(empty.turn, 1);
  assert.equal(empty.pending, null);
});

test("Reserve recovery in the R01 chain and Banking preserves each parent action across saves", () => {
  let g = flexibleFixture(1, 15, [
      ...CHAIN_TECHS.map((t) => t.slice(5)),
      "banking",
    ]),
    id = g.systems[0].id;
  g = step(g, { type: "resolve", action: "produce", system: id, bank: true });
  let recovered = 0;
  for (let i = 0; g.context && i < 120; i++) {
    assert.equal(g.turn, 0);
    assert.deepEqual(restoreGame(JSON.parse(JSON.stringify(g))), g);
    if (g.pending?.kind === "reserve" && g.players[0].credits) {
      g = refill(g);
      g = step(g, {
        type: "useReserve",
        ...(g.pending.effect.kind === "production"
          ? { credits: g.pending.remaining }
          : {}),
      });
      recovered++;
    } else g = step(g, botCommand(g));
  }
  assert.equal(g.context, null);
  assert.ok(recovered >= 4);
  assert.equal(g.turn, 1);
  assert.deepEqual(g.players[0].used, ["produce"]);
  for (const title of [
    "Population Explosion",
    "Frontier Pioneer",
    "Government Incentives",
  ])
    assert.equal(
      g.log.filter(
        (l) => l.text.startsWith(title + ":") && !l.text.includes("completed"),
      ).length,
      2,
    );
  assert.equal(g.log.filter((l) => l.text.startsWith("Spice:")).length, 1);
  assert.equal(g.log.filter((l) => l.text.startsWith("Produced ")).length, 2);
  assert.equal(g.players[0].invested, 6);
  assert.equal(g.players[0].freeInvestments.length, 5);
  assertInvariants(g);
});

test("genuine completed 0.15 history retains old Sabotage payments, final scores and exact replay", () => {
  const g = restoreGame(legacy);
  assert.equal(g.phase, "finished");
  assert.equal(g.legacyRulesUntil, legacy.revision);
  assert.deepEqual(g.scores, legacy.scores);
  assert.deepEqual(g.winners, legacy.winners);
  assert.deepEqual(replayGame(g), g);
  const checkpoint = legacy.checkpoints.find(
      (c) => c.kind === "discounted-sabotage",
    ),
    n = checkpoint.commands;
  const prefix = restoreGame({
    ...legacy,
    revision: n,
    commands: legacy.commands.slice(0, n),
  });
  assert.deepEqual(
    prefix.players.map((p) => p.credits),
    checkpoint.credits,
  );
  assert.equal(checkpoint.paid, 1);
  assert.deepEqual(replayGame(prefix), prefix);
});

test("an unfinished genuine 0.15 Reserve warning upgrades to recoverable output without repeating completed gains", () => {
  const checkpoint = legacy.checkpoints.find((c) => c.kind === "reserve"),
    n = checkpoint.commands;
  let g = restoreGame({
    ...legacy,
    revision: n,
    commands: legacy.commands.slice(0, n),
  });
  assert.equal(g.pending.kind, "reserve");
  assert.deepEqual(
    g.players.map((p) => p.credits),
    checkpoint.credits,
  );
  assert.deepEqual(replayGame(g), g);
  const original = JSON.parse(JSON.stringify(g)),
    remaining = g.pending.remaining;
  g = refill(g);
  g = step(g, { type: "useReserve" });
  assert.equal(g.revision, n + 2);
  assert.ok(g.pending?.kind !== "reserve" || g.pending.remaining < remaining);
  assert.equal(
    g.players[original.pending.owner].credits,
    original.players[original.pending.owner].credits - 1,
  );
  assert.deepEqual(replayGame(g), g);
});

test("Sabotage payment floor applies to the selected target and Death Sun cannot mix targets within one sacrifice", () => {
  let g = setup(2, 8, { techPreset: "remaining", scenario: "standard" });
  g.phase = "tech";
  tech(g, 0, "research-lab");
  tech(g, 1, "arcologies");
  credits(g, 0, 4);
  const target = { player: 1, tech: "tech.arcologies" };
  assert.match(
    purchaseReason(g, "tech.sabotage", 0, false, 5, target),
    /5 Credits/,
  );
  assert.throws(
    () => step(g, { type: "buy", tech: "tech.sabotage", value: 5, target }),
    /5 Credits/,
  );
  credits(g, 0, 8);
  const paid = step(g, {
    type: "buy",
    tech: "tech.sabotage",
    value: 12,
    target,
  });
  assert.equal(paid.players[0].credits, 0);
  const combat = fixture(),
    s = combat.systems[0],
    p = s.planets[1];
  tech(combat, 0, "death-sun");
  ships(combat, s, 1, 3);
  settlement(combat, s, 1, 1, Math.min(2, p.capacity));
  assert.equal(attackCost(combat, 3, 0), 1);
  assert.equal(attackCost(combat, 0, 2), 1);
  assert.equal(attackCost(combat, 1, 1), 2);
  assert.throws(
    () =>
      step(combat, {
        type: "resolve",
        system: s.id,
        action: "attack",
        attack: {
          sacrifice: 1,
          ships: { 1: 1 },
          settlements: { [p.id]: { 1: 1 } },
        },
      }),
    /Death Sun/,
  );
  const old = { ...combat, legacyRulesUntil: combat.revision + 1 };
  assert.equal(attackCost(old, 1, 1), 1);
  const historical = step(old, {
    type: "resolve",
    system: s.id,
    action: "attack",
    attack: {
      sacrifice: 1,
      ships: { 1: 1 },
      settlements: { [p.id]: { 1: 1 } },
    },
  });
  assert.equal(attackCost(historical, 1, 1, 0), 2);
});
