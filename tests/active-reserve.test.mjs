import test from "node:test";
import assert from "node:assert/strict";
import {
  fixture,
  tech,
  credits,
  ships,
  step,
  system,
  replayGame,
  applyActiveReserveRules,
  assertInvariants,
} from "./helpers.mjs";
import { restoreGame } from "../work/compiled/persistence.js";
import completed16 from "./fixtures/v0.16-tech-order-completed.json" with { type: "json" };

function rivalGift(effect, reserve = 0, flexible = false) {
  let g = fixture(),
    s = g.systems[0],
    p = s.planets[1];
  if (flexible) tech(g, 1, "flexible-economy");
  credits(g, 1, 3);
  ships(g, g.systems[1], 1, g.players[1].reserve - reserve);
  p.explore = effect;
  g = step(g, {
    type: "resolve",
    system: s.id,
    action: "settle",
    settlements: { [p.id]: 1 },
  });
  return { g, id: s.id, pid: p.id };
}

for (const effect of ["otherShips", "otherSettlement"])
  for (const flexible of [false, true])
    test(`${effect} with no rival Reserve fails automatically ${flexible ? "with" : "without"} Flexible economy`, () => {
      const { g, id, pid } = rivalGift(effect, 0, flexible),
        beforeShips = system(g, id).ships[0];
      const next = step(g, { type: "explore", recipient: 1 });
      assert.equal(next.pending, null);
      assert.equal(next.context, null);
      assert.equal(next.turn, 1);
      assert.equal(next.players[1].reserve, 0);
      assert.equal(next.players[1].credits, 3);
      assert.equal(system(next, id).ships[1], 0);
      assert.equal(
        system(next, id).planets.find((p) => p.id === pid).owners[1],
        0,
      );
      assert.equal(
        system(next, id).planets.find((p) => p.id === pid).owners[0],
        1,
      );
      assert.equal(system(next, id).ships[0], beforeShips - 1);
      assert.equal(
        next.log.some(
          (l) => l.player === 1 && l.text.startsWith("Reserve limit:"),
        ),
        false,
      );
      assert.deepEqual(restoreGame(JSON.parse(JSON.stringify(next))), next);
    });

test("a two-Ship rival gift with one available rocket places one and continues without a warning", () => {
  const { g, id } = rivalGift("otherShips", 1, true),
    next = step(g, { type: "explore", recipient: 1 });
  assert.equal(next.pending, null);
  assert.equal(next.turn, 1);
  assert.equal(system(next, id).ships[1], 1);
  assert.equal(next.players[1].reserve, 0);
  assert.equal(next.players[1].credits, 3);
});

test("a failed rival gift does not suppress the active player's subsequent Banking shortfall", () => {
  const prepared = rivalGift("otherShips", 0, true);
  let g = prepared.g;
  tech(g, 0, "flexible-economy");
  tech(g, 0, "banking");
  credits(g, 0, 3);
  ships(g, g.systems[0], 0, g.players[0].reserve);
  g.context.bank = true;
  g = step(g, { type: "explore", recipient: 1 });
  assert.equal(g.pending.kind, "reserve");
  assert.equal(g.pending.owner, 0);
  assert.equal(g.pending.label, "Banking");
  assert.equal(g.turn, 0);
  g = step(g, { type: "returnCredits", count: 1 });
  g = step(g, { type: "completeReserve" });
  assert.equal(g.players[0].invested, 1);
  assert.equal(g.turn, 1);
  assert.equal(g.players[1].credits, 3);
});

for (const flexible of [false, true])
  test(`an old unacknowledged rival ${flexible ? "recovery" : "warning"} resumes without an extra gain`, () => {
    const prepared = rivalGift("otherShips", 1, flexible);
    let g = prepared.g;
    g.activeReserveChecksFrom = g.revision + 2;
    g = step(g, { type: "explore", recipient: 1 });
    assert.equal(g.pending.kind, flexible ? "reserve" : "ack");
    assert.equal(system(g, prepared.id).ships[1], 1);
    g.activeReserveChecksFrom = g.revision;
    applyActiveReserveRules(g);
    assertInvariants(g);
    assert.equal(g.pending, null);
    assert.equal(g.turn, 1);
    assert.equal(system(g, prepared.id).ships[1], 1);
    assert.equal(g.players[1].credits, 3);
    assert.equal(
      system(g, prepared.id).planets.find((p) => p.id === prepared.pid)
        .owners[0],
      1,
    );
  });

test("a completed 0.17 record migrated from the genuine 0.16 history retains scores and exact replay", () => {
  const record = {
    ...completed16,
    engine: "0.17.0",
    schema: 8,
    content: "ordered-techs-shortfall-review-5",
    confirmedTechRulesFrom: completed16.revision,
  };
  const g = restoreGame(record);
  assert.equal(g.phase, "finished");
  assert.equal(g.activeReserveChecksFrom, record.revision);
  assert.deepEqual(g.scores, completed16.scores);
  assert.deepEqual(g.winners, completed16.winners);
  assert.deepEqual(replayGame(g), g);
});
