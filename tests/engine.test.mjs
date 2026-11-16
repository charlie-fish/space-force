import test from "node:test";
import assert from "node:assert/strict";
import {
  ART,
  CARD_MAP,
  FAMILY,
  LAYOUTS,
  applyCommand,
  assertInvariants,
  availableSystems,
  blackHoles,
  boardConnected,
  botCommand,
  canMove,
  canPlan,
  createGame,
  credits,
  eligibleTokens,
  featureOptions,
  fixture,
  freeSpace,
  legalOrientations,
  player,
  production,
  purchaseReason,
  reinforceCount,
  scoreGame,
  settlement,
  setup,
  ships,
  step,
  system,
  tech,
  warp,
} from "./helpers.mjs";

test("source-correct setups, component counts, deterministic randomness, and special centres for 2–7", () => {
  assert.deepEqual(
    ART.systems["system.le-guin"].planets.map((p) => p.capacity),
    [2, 2, 1, 1],
  );
  assert.deepEqual(ART.systems["system.lem"].blockedEdges, [0, 3]);
  for (let count = 2; count <= 7; count++) {
    const g = setup(count);
    assertInvariants(g);
    assert.deepEqual(createGame(count, 99), createGame(count, 99));
    assert.equal(g.systems.length, count >= 6 ? 13 : count * 2);
    assert.equal(new Set(g.players.map((p) => p.home)).size, count);
    assert.equal(
      g.systems.filter((s) => !s.revealed).length,
      Math.min(count, 6),
    );
    for (const s of g.systems.filter((s) => !s.revealed))
      assert.equal(ART.systems[s.template].homePlanetIndex, null);
    assert.equal(g.features.asteroid, count === 5);
    assert.equal(g.exploreBag.length, 16);
    assert.equal(g.events.length, count <= 3 ? 10 : 8);
    for (const p of g.players) {
      assert.equal(p.reserve, 34);
      assert.equal(p.unplaced, 4);
      assert.equal(system(g, p.home).ships[p.id], 3);
    }
    const centre = g.systems.find((s) => s.role === "centre");
    if (count >= 6)
      assert.equal(
        centre.template,
        count === 6 ? "system.asimov" : "system.adams",
      );
    else assert.equal(centre, undefined);
    assert.equal(boardConnected(g), true);
    assert.deepEqual(
      g.systems.map((s) => [s.q, s.r]),
      LAYOUTS.find((l) => l.players === count).cells.map((c) => [c.q, c.r]),
    );
  }
  assert.throws(() => createGame(8));
  assert.throws(() => createGame(1));
});

test("planning is in player order; stack tops determine turns and each slot can be used once", () => {
  let g = setup();
  const id = g.systems[0].id;
  for (let i = 0; i < 8; i++) {
    assert.equal(g.turn, i % 2);
    g = step(g, { type: "plan", system: id });
  }
  assert.equal(g.phase, "actions");
  assert.equal(g.turn, 1);
  assert.deepEqual(
    eligibleTokens(g).map((s) => s.id),
    [id],
  );
  g = step(g, { type: "resolve", system: id, action: "move", invest: true });
  assert.equal(g.turn, 0);
  assert.equal(g.players[1].invested, 1);
  g = step(g, { type: "resolve", system: id, action: "move", invest: true });
  assert.throws(
    () =>
      step(g, { type: "resolve", system: id, action: "move", invest: true }),
    /unused/,
  );
});

test("wrong actor, stale revision, illegal quantities, and unknown commands leave state unchanged", () => {
  const g = fixture();
  const before = JSON.stringify(g);
  assert.throws(
    () =>
      applyCommand(g, 1, {
        type: "resolve",
        system: g.systems[0].id,
        action: "produce",
      }),
    /turn/,
  );
  assert.throws(
    () =>
      applyCommand(
        g,
        0,
        { type: "resolve", system: g.systems[0].id, action: "produce" },
        g.revision - 1,
      ),
    /changed/,
  );
  assert.throws(() =>
    step(g, {
      type: "resolve",
      system: g.systems[0].id,
      action: "produce",
      credits: -1,
    }),
  );
  assert.throws(() => step(g, { type: "undo" }), /Unknown/);
  assert.equal(JSON.stringify(g), before);
});

test("exploration is a committed reveal with legal rotation and mandatory entry; no free peek or undo", () => {
  let g = fixture();
  const from = system(g, g.players[0].home);
  const target = g.systems.find((s) => !s.revealed && canMove(g, 0, from, s));
  g.systems.forEach((s) => (s.tokens = []));
  target.tokens = [0];
  g = step(g, {
    type: "resolve",
    system: target.id,
    action: "move",
    sources: { [from.id]: 2 },
  });
  assert.equal(system(g, target.id).revealed, true);
  assert.equal(g.pending.kind, "orient");
  assert.equal(
    g.exploreBag.length,
    16 - target.planets.filter((p) => p.capacity === 2).length,
  );
  assert.throws(() =>
    step(g, { type: "resolve", system: target.id, action: "attack" }),
  );
  const rotation = g.pending.rotations[0];
  g = step(g, { type: "orient", rotation });
  assert.equal(g.pending.kind, "move");
  assert.throws(() => step(g, { type: "move", sources: {} }), /at least one/i);
  g = step(g, { type: "move", sources: { [from.id]: 2 } });
  assert.equal(system(g, from.id).ships[0], 1);
  assert.equal(
    system(g, target.id).ships[0],
    2 - Math.min(2, blackHoles(system(g, target.id))),
  );
});

test("asteroid belts block routes, Agility bypasses them, and distant warps connect", () => {
  const g = fixture();
  const a = g.systems[0],
    b = g.systems.find((b) => canMove(g, 0, a, b));
  a.extraEdges = [0, 1, 2, 3, 4, 5];
  assert.equal(canMove(g, 0, a, b), false);
  tech(g, 0, "agility");
  assert.equal(canMove(g, 0, a, b), true);
  const other = g.systems.find((s) => s.id !== a.id && s.id !== b.id);
  other.revealed = true;
  a.extraWarp = true;
  other.extraWarp = true;
  assert.equal(warp(a), true);
  assert.equal(canMove(g, 1, a, other), true);
  assert.equal(canMove(g, 0, a, a), false);
});

test("black holes insure one incoming Ship each; direct reinforcement ignores them", () => {
  let g = fixture();
  for (const s of g.systems) s.revealed = true;
  tech(g, 0, "agility");
  const target = g.systems[0];
  const from = g.systems.find((s) => canMove(g, 0, s, target));
  ships(g, from, 0, 3);
  target.extraHoles = 2;
  const before = target.ships[0],
    holes = blackHoles(target);
  g = step(g, {
    type: "resolve",
    system: target.id,
    action: "move",
    sources: { [from.id]: 3 },
  });
  assert.equal(system(g, target.id).ships[0], before + Math.max(0, 3 - holes));
  assert.equal(g.players[0].credits, Math.min(3, holes));
  g.phase = "reinforce";
  g.turn = g.first = 0;
  const count = reinforceCount(g),
    beforeDirect = system(g, target.id).ships[0];
  g = step(g, { type: "allocate", credits: 0, ships: { [target.id]: count } });
  assert.equal(system(g, target.id).ships[0], beforeDirect + count);
});

test("Explore gives an opponent their Settlement first and can consume the last space", () => {
  let g = fixture();
  const s = g.systems[0],
    planet = s.planets.find((p) => !p.home);
  planet.capacity = 1;
  planet.explore = "otherSettlement";
  const originalShips = s.ships[0];
  g = step(g, { type: "resolve", system: s.id, action: "settle" });
  g = step(g, { type: "settle", planet: planet.id, count: 1 });
  assert.equal(g.pending.kind, "explore");
  assert.throws(() => step(g, { type: "explore", recipient: 0 }), /another/);
  g = step(g, { type: "explore", recipient: 1 });
  const result = system(g, s.id).planets.find((p) => p.id === planet.id);
  assert.deepEqual(result.owners, [0, 1]);
  assert.equal(system(g, s.id).ships[0], originalShips);
});

test("Explore gifts obey Reserve limits and revealed black holes do not kill existing Ships", () => {
  for (const effect of ["otherShips", "credit3", "blackHole"]) {
    let g = fixture();
    const s = g.systems[0],
      planet = s.planets.find((p) => !p.home);
    planet.explore = effect;
    credits(
      g,
      effect === "otherShips" ? 1 : 0,
      g.players[effect === "otherShips" ? 1 : 0].reserve - 1,
    );
    const ownBefore = s.ships[0];
    g = step(g, { type: "resolve", system: s.id, action: "settle" });
    g = step(g, { type: "settle", planet: planet.id, count: 1 });
    if (effect === "otherShips") {
      g = step(g, { type: "explore", recipient: 1 });
      assert.equal(system(g, s.id).ships[1], 1);
      assert.equal(g.players[1].reserve, 0);
    }
    if (effect === "credit3") assert.equal(g.players[0].reserve, 0);
    if (g.pending?.kind === "ack") g = step(g, { type: "acknowledge" });
    if (effect === "blackHole") {
      assert.equal(system(g, s.id).extraHoles, 1);
      assert.equal(system(g, s.id).ships[0], ownBefore - 1);
    }
    assertInvariants(g);
  }
});

test("full shared planets produce a bonus; output respects Reserve and chosen Credit/Ship split", () => {
  let g = fixture();
  const s = g.systems[0],
    index = s.planets.findIndex((p) => !p.home),
    planet = s.planets[index];
  settlement(g, s, index, 0, 1);
  settlement(g, s, index, 1, planet.capacity - 1);
  assert.equal(production(g, s, 0), 3);
  assert.equal(production(g, s, 1), 2);
  const before = s.ships[0];
  g = step(g, { type: "resolve", system: s.id, action: "produce", credits: 1 });
  assert.equal(system(g, s.id).ships[0], before + 2);
  assert.equal(g.players[0].credits, 1);
});

test("attack mixes two Ships OR one Settlement per sacrifice, protects shared planets, and insures all losses", () => {
  let g = fixture();
  const s = g.systems[0];
  ships(g, s, 0, 2);
  ships(g, s, 1, 3);
  const index = s.planets.findIndex((p) => !p.home);
  settlement(g, s, index, 1, 1);
  const command = {
    type: "resolve",
    system: s.id,
    action: "attack",
    attack: {
      sacrifice: 2,
      ships: { 1: 2 },
      settlements: { [s.planets[index].id]: { 1: 1 } },
    },
  };
  assert.throws(
    () => step(g, { ...command, attack: { ...command.attack, sacrifice: 1 } }),
    /OR/,
  );
  const result = step(g, command);
  assert.equal(result.players[0].credits, 2);
  assert.equal(result.players[1].credits, 3);
  settlement(g, s, index, 0, 1);
  assert.throws(() => step(g, command), /share/);
});

test("Banking also invests an empty action, but ordinary Invest does not trigger it twice", () => {
  let g = fixture();
  tech(g, 0, "banking");
  const id = g.systems[0].id;
  const result = step(g, {
    type: "resolve",
    system: id,
    action: "move",
    bank: true,
  });
  assert.equal(result.players[0].invested, 1);
  g = step(g, {
    type: "resolve",
    system: id,
    action: "move",
    invest: true,
    bank: true,
  });
  assert.equal(g.players[0].invested, 1);
});

test("supply allocation validates destinations, cashes Investments, and permits declining reinforcement", () => {
  let g = fixture();
  g.phase = "investments";
  g.players[0].reserve -= 3;
  g.players[0].invested = 3;
  assert.throws(
    () => step(g, { type: "allocate", credits: 1, ships: {} }),
    /Allocate/,
  );
  const invalid = g.systems.find((s) => !availableSystems(g).includes(s));
  assert.throws(
    () => step(g, { type: "allocate", credits: 0, ships: { [invalid.id]: 3 } }),
    /home/,
  );
  g = step(g, {
    type: "allocate",
    credits: 2,
    ships: { [g.players[0].home]: 1 },
  });
  assert.equal(g.players[0].invested, 0);
  assert.equal(g.players[0].credits, 2);
  g.phase = "reinforce";
  g.turn = g.first = 0;
  tech(g, 0, "assembly-line");
  assert.equal(reinforceCount(g), 4);
  const reserve = g.players[0].reserve;
  g = step(g, { type: "allocate", credits: 0, ships: {} });
  assert.equal(g.players[0].reserve, reserve);
});

test("one shared Tech per turn, ownership marker, Patents, and no unimplemented Techs", () => {
  let g = fixture();
  g.phase = "tech";
  credits(g, 0, 10);
  credits(g, 1, 10);
  const reserve = g.players[0].reserve;
  g = step(g, { type: "buy", tech: "tech.agility" });
  assert.equal(
    g.players[0].reserve,
    reserve + CARD_MAP["tech.agility"].cost - 1,
  );
  assert.equal(g.turn, 1);
  g = step(g, { type: "buy", tech: "tech.agility" });
  assert.equal(g.players[1].techs.includes("tech.agility"), true);
  g.phase = "tech";
  g.turn = 0;
  tech(g, 0, "patents");
  assert.match(purchaseReason(g, "tech.agility", 0), /already/);
  assert.match(purchaseReason(g, "tech.patents", 1), /Patents/);
  assert.match(purchaseReason(g, "tech.spice", 0), /outside/);
});

test("Family acquisition effects: unique feature supply, Genesis, Disruptor, Planet Killer, and Planet Nine", () => {
  for (const name of [
    "artificial-warp",
    "kessler-syndrome",
    "genesis",
    "disruptor",
    "planet-killer",
    "planet-nine",
  ]) {
    let g = fixture();
    g.phase = "tech";
    credits(g, 0, 12);
    g = step(g, { type: "buy", tech: `tech.${name}` });
    assert.ok(g.pending);
    const options = featureOptions(g, `tech.${name}`);
    assert.ok(options.length);
    if (name === "planet-killer")
      for (const o of options)
        assert.equal(
          system(g, o.system).planets.find((p) => p.id === o.planet).home,
          false,
        );
    const option = options[0],
      before = structuredClone(g);
    g = step(g, { type: "feature", ...option });
    if (name === "genesis")
      assert.equal(
        system(g, option.system).planets.find((p) => p.id === option.planet)
          .owners[0],
        1,
      );
    if (name === "disruptor") {
      g.round++;
      assert.equal(canPlan(g, system(g, option.system), 1), false);
      assert.equal(canPlan(g, system(g, option.system), 0), true);
      g.round++;
      assert.equal(canPlan(g, system(g, option.system), 1), true);
    }
    if (name === "artificial-warp") {
      assert.equal(system(g, option.system).extraWarp, true);
      assert.equal(featureOptions(g, "tech.artificial-warp").length, 0);
    }
    if (name === "kessler-syndrome") {
      assert.equal(g.features.asteroid, true);
      assert.equal(boardConnected(g), true);
    }
    if (name === "planet-killer") {
      assert.equal(
        system(g, option.system).planets.find((p) => p.id === option.planet)
          .blocked,
        true,
      );
      assert.equal(g.features.blackHole, true);
    }
    if (name === "planet-nine") {
      assert.equal(
        system(g, option.system).planets.length,
        system(before, option.system).planets.length + 1,
      );
      assert.equal(system(g, option.system).planets.at(-1).capacity, 1);
    }
    assertInvariants(g);
  }
  const five = setup(5);
  assert.equal(featureOptions(five, "tech.kessler-syndrome").length, 0);
});

test("asteroids may isolate a physical area if its warp still connects it", () => {
  const g = fixture();
  for (const s of g.systems) s.revealed = true;
  const isolated = g.systems[0],
    other = g.systems[1];
  isolated.extraWarp = true;
  other.extraWarp = true;
  isolated.extraEdges = [0, 1, 2, 3, 4, 5];
  assert.equal(boardConnected(g), true);
  isolated.extraWarp = false;
  assert.equal(boardConnected(g), false);
});

test("last Event pair is followed by another round; final Tech step scores without reinforcement", () => {
  let g = fixture();
  g.phase = "investments";
  g.events = g.events.slice(0, 2);
  g.players[0].invested = 1;
  g.players[0].reserve--;
  g = step(g, { type: "allocate", credits: 1, ships: {} });
  assert.equal(g.phase, "event");
  g = step(g, { type: "continueEvent" });
  assert.equal(g.finalEconomy, false);
  assert.equal(g.events.length, 0);
  while (g.phase === "tech") g = step(g, { type: "buy", tech: null });
  assert.equal(g.phase, "reinforce");
  g.phase = "investments";
  g.turn = g.first;
  g.players[g.turn].reserve--;
  g.players[g.turn].invested = 1;
  g = step(g, { type: "allocate", credits: 1, ships: {} });
  assert.equal(g.finalEconomy, true);
  assert.equal(g.phase, "event");
  g = step(g, { type: "continueEvent" });
  while (g.phase === "tech") g = step(g, { type: "buy", tech: null });
  assert.equal(g.phase, "finished");
  assert.equal(g.scores.length, 2);
  assert.deepEqual(g.winners, [0]); // identical points; two Credits beat zero
});

test("scoring counts planets and ship systems once, uses Tech count, and allows shared victory", () => {
  let g = fixture();
  assert.deepEqual(
    scoreGame(g).map((s) => s.total),
    [2, 2],
  );
  const s = system(g, g.players[0].home);
  settlement(g, s, 0, 0, 1);
  assert.equal(scoreGame(g)[0].planets, 1);
  g.phase = "tech";
  g.finalEconomy = true;
  g.turn = g.first = 0;
  g = step(g, { type: "buy", tech: null });
  g = step(g, { type: "buy", tech: null });
  assert.deepEqual(g.winners, [0, 1]);
  assert.throws(() => step(g, { type: "buy", tech: null }), /turn/);
});

test("exported command history replays an entire game to the identical final state", () => {
  let game = createGame(7, 3, [
    "Ada",
    "Bea",
    "Cai",
    "Dee",
    "Eli",
    "Flo",
    "Gus",
  ]);
  while (game.phase !== "finished") game = step(game, botCommand(game));
  const record = JSON.parse(JSON.stringify(game));
  let replay = createGame(
    7,
    record.seed,
    record.players.map((p) => p.name),
  );
  for (const { actor, command } of record.commands)
    replay = applyCommand(replay, actor, command);
  assert.deepEqual(replay, game);
});

test("Planet Killer insures existing Settlements; Genesis resolves hidden Explore before placing its Settlement", () => {
  let g = fixture();
  g.phase = "tech";
  credits(g, 0, 12);
  const target = g.systems[0],
    index = target.planets.findIndex((p) => !p.home);
  settlement(g, target, index, 1, 1);
  g = step(g, { type: "buy", tech: "tech.planet-killer" });
  g = step(g, {
    type: "feature",
    system: target.id,
    planet: target.planets[index].id,
  });
  assert.equal(g.players[1].credits, 1);
  assert.equal(system(g, target.id).planets[index].owners[1], 0);
  g = fixture();
  g.phase = "tech";
  credits(g, 0, 12);
  const s = g.systems[0],
    planet = s.planets.find((p) => !p.home);
  planet.explore = "otherSettlement";
  planet.capacity = 1;
  g = step(g, { type: "buy", tech: "tech.genesis" });
  g = step(g, { type: "feature", system: s.id, planet: planet.id });
  assert.equal(g.pending.kind, "explore");
  g = step(g, { type: "explore", recipient: 1 });
  assert.deepEqual(
    system(g, s.id).planets.find((p) => p.id === planet.id).owners,
    [0, 1],
  );
  assert.equal(g.turn, 1);
});

for (let count = 2; count <= 7; count++)
  test(`complete normal-turn ${count}-player games preserve all rockets through every command`, () => {
    for (let seed = 1; seed <= 12; seed++) {
      let g = createGame(count, seed),
        commands = 0;
      while (g.phase !== "finished" && commands < 1600) {
        g = step(g, botCommand(g));
        commands++;
      }
      assert.equal(g.phase, "finished", `seed ${seed}, revision ${g.revision}`);
      assert.equal(g.round, count <= 3 ? 6 : 5);
      assert.equal(g.eventHistory.length, count <= 3 ? 5 : 4);
      assert.ok(g.winners.length > 0);
      assert.ok(g.players.some((p) => p.techs.length));
      assert.ok(g.log.some((l) => l.text.startsWith("Moved")));
      assert.ok(g.log.some((l) => l.text.startsWith("Placed 1 Settlement")));
    }
  });

test("batch SETTLE validates the whole preview before commitment and resolves multiple Explore choices in order", () => {
  let g = fixture();
  const s = g.systems[0],
    planets = s.planets.filter((p) => !p.home).slice(0, 2);
  planets[0].explore = "otherSettlement";
  planets[1].explore = "credit2";
  const before = JSON.stringify(g),
    bad = { [planets[0].id]: 3, [planets[1].id]: 3 };
  assert.throws(() =>
    step(g, {
      type: "resolve",
      system: s.id,
      action: "settle",
      settlements: bad,
    }),
  );
  assert.equal(JSON.stringify(g), before);
  g = step(g, {
    type: "resolve",
    system: s.id,
    action: "settle",
    settlements: { [planets[0].id]: 1, [planets[1].id]: 1 },
  });
  assert.equal(g.pending.kind, "explore");
  assert.equal(
    system(g, s.id).planets.find((p) => p.id === planets[1].id).explore,
    "credit2",
  );
  g = step(g, { type: "explore", recipient: 1 });
  assert.equal(g.pending.kind, "ack");
  g = step(g, { type: "acknowledge" });
  assert.equal(g.pending, null);
  assert.equal(g.players[0].credits, 2);
  assert.equal(system(g, s.id).ships[0], 1);
  assert.equal(g.players[0].used.includes("settle"), true);
});

test("departure black holes cause no loss; arrival loses at most one incoming Ship per destination black hole", () => {
  let g = fixture();
  for (const s of g.systems) s.revealed = true;
  tech(g, 0, "agility");
  const from = system(g, g.players[0].home),
    target = g.systems.find(
      (s) => canMove(g, 0, from, s) && blackHoles(s) === 0,
    );
  from.extraHoles = 3;
  target.extraHoles = 0;
  g.systems.forEach((s) => (s.tokens = []));
  target.tokens = [0];
  const homeShips = from.ships[0];
  g = step(g, {
    type: "resolve",
    system: target.id,
    action: "move",
    sources: { [from.id]: 2 },
  });
  assert.equal(system(g, target.id).ships[0], 2);
  assert.equal(system(g, from.id).ships[0], homeShips - 2);
  assert.equal(g.players[0].credits, 0);
  assert.doesNotMatch(
    g.log.findLast((l) => l.text.startsWith("Moved")).text,
    /lost|black hole/,
  );
  g.phase = "actions";
  g.turn = 0;
  g.players[0].used = [];
  g.players[0].investedActions = [];
  system(g, from.id).tokens = [0];
  system(g, from.id).extraHoles = 3;
  g = step(g, {
    type: "resolve",
    system: from.id,
    action: "move",
    sources: { [target.id]: 2 },
  });
  assert.equal(g.players[0].credits, 2);
  assert.match(
    g.log.findLast((l) => l.text.startsWith("Moved")).text,
    /2 lost/,
  );
});
