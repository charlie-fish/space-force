import test from "node:test";
import assert from "node:assert/strict";
import {
  fixture,
  tech,
  credits,
  ships,
  step,
  system,
  setup,
  purchaseCost,
  replayGame,
} from "./helpers.mjs";
import { restoreGame } from "../work/compiled/persistence.js";
import legacy from "./fixtures/v0.16-tech-order-completed.json" with { type: "json" };

test("Insurance gives no reward after its owner resolves their final token while other players continue", () => {
  let g = fixture(),
    id = g.systems[0].id;
  tech(g, 0, "insurance");
  g.systems[1].tokens = [1, 1];
  g.players[0].used = ["move", "settle", "produce"];
  g = step(g, { type: "resolve", system: id, action: "attack", invest: true });
  assert.equal(g.turn, 1);
  const initial = g.players[0].credits;
  g = step(g, {
    type: "resolve",
    system: g.systems[1].id,
    action: "move",
    invest: true,
  });
  assert.equal(g.turn, 1);
  assert.equal(g.pending, null);
  assert.equal(g.players[0].credits, initial);
  assert.throws(() => step(g, { type: "insurance" }), /No Insurance/);
});

test("buried tokens keep Insurance active across skips and an empty home remains a legal Ship destination", () => {
  let g = fixture(),
    s = g.systems[1],
    home = system(g, g.players[0].home);
  tech(g, 0, "insurance");
  const colony = home.planets.find((p) => p.home);
  g.players[0].reserve += colony.owners[0];
  colony.owners[0] = 0;
  g.systems[0].tokens = [];
  s.tokens = [0, 1, 1, 1];
  g.turn = 1;
  g.players[0].used = ["move", "produce", "settle"];
  const before = home.ships[0];
  for (const action of ["move", "produce"]) {
    g = step(g, { type: "resolve", system: s.id, action, invest: true });
    assert.equal(g.pending.kind, "insurance");
    g = step(g, { type: "insurance", system: home.id });
    assert.equal(g.turn, 1);
  }
  assert.equal(system(g, home.id).ships[0], before + 2);
  assert.equal(system(g, home.id).planets.find((p) => p.home).owners[0], 0);
});

test("applying a waiting effect uses only its remaining allowance and deliberately accepts an unfilled remainder", () => {
  let g = fixture();
  tech(g, 0, "flexible-economy");
  credits(g, 0, 3);
  ships(g, g.systems[0], 0, g.players[0].reserve);
  const id = g.systems[0].id,
    before = g.systems[0].ships[0];
  g = step(g, { type: "resolve", system: id, action: "produce" });
  assert.equal(g.pending.remaining, 1);
  g = step(g, { type: "returnCredits", count: 1 });
  g = step(g, { type: "completeReserve" });
  assert.equal(g.turn, 1);
  assert.equal(system(g, id).ships[0], before + 1);
  assert.equal(g.log.filter((l) => l.text.startsWith("Produced ")).length, 1);
  let declined = fixture();
  tech(declined, 0, "flexible-economy");
  credits(declined, 0, declined.players[0].reserve);
  declined = step(declined, {
    type: "resolve",
    system: declined.systems[0].id,
    action: "produce",
  });
  declined = step(declined, { type: "completeReserve" });
  assert.equal(declined.turn, 1);
  assert.equal(declined.pending, null);

  let nested = fixture();
  tech(nested, 0, "flexible-economy");
  tech(nested, 0, "banking");
  credits(nested, 0, 3);
  ships(nested, nested.systems[0], 0, nested.players[0].reserve);
  nested = step(nested, {
    type: "resolve",
    system: nested.systems[0].id,
    action: "produce",
    bank: true,
  });
  nested = step(nested, { type: "returnCredits", count: 1 });
  nested = step(nested, { type: "completeReserve" });
  assert.equal(nested.pending.label, "Banking");
  assert.equal(nested.players[0].invested, 0);
  nested = step(nested, { type: "returnCredits", count: 1 });
  nested = step(nested, { type: "completeReserve" });
  assert.equal(nested.turn, 1);
  assert.equal(nested.players[0].invested, 1);
  assert.deepEqual(nested.players[0].used, ["produce"]);
});

test("Sabotage always pays chosen X without a Research lab discount while other purchases remain discounted", () => {
  const g = setup(2, 8, { techPreset: "remaining", scenario: "standard" });
  g.phase = "tech";
  tech(g, 0, "research-lab");
  tech(g, 1, "arcologies");
  credits(g, 0, 16);
  assert.equal(purchaseCost(g, "tech.sabotage", 0, false, 12, 5), 12);
  assert.equal(purchaseCost(g, "tech.sabotage", 0, true, 12, 5), 12);
  assert.equal(purchaseCost(g, "tech.arcologies"), 2);
  const result = step(g, {
    type: "buy",
    tech: "tech.sabotage",
    value: 12,
    target: { player: 1, tech: "tech.arcologies" },
  });
  assert.equal(result.players[0].credits, 4);
  const historical = { ...g, confirmedTechRulesFrom: g.revision + 1 };
  assert.equal(purchaseCost(historical, "tech.sabotage", 0, false, 12, 5), 6);
});

test("genuine completed 0.16 games preserve prior ordering choices, Insurance rewards, scores and exact replay", () => {
  const g = restoreGame(legacy);
  assert.equal(g.phase, "finished");
  assert.deepEqual(g.scores, legacy.scores);
  assert.deepEqual(g.winners, legacy.winners);
  assert.deepEqual(replayGame(g), g);
});

test("unresolved 0.16 order and exhausted-Insurance decisions adopt the corrections without changing completed gains", () => {
  for (const checkpoint of legacy.checkpoints) {
    const n = checkpoint.commands,
      g = restoreGame({
        ...legacy,
        revision: n,
        commands: legacy.commands.slice(0, n),
      });
    if (checkpoint.kind === "order")
      assert.equal(g.pending.kind, "mercenaries");
    else {
      assert.notEqual(g.pending?.kind, "insurance");
      assert.deepEqual(
        g.players.map((p) => p.credits),
        checkpoint.credits,
      );
    }
    assert.deepEqual(replayGame(g), g);
    assert.deepEqual(restoreGame(JSON.parse(JSON.stringify(g))), g);
  }
});
