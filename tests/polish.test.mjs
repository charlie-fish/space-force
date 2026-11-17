import test from "node:test";
import assert from "node:assert/strict";
import { harness } from "./ui-harness.mjs";
import {
  ART,
  applyCommand,
  assertInvariants,
  credits,
  featureOptions,
  fixture,
  isFinalRound,
  scoreGame,
  setup,
  step,
  system,
} from "./helpers.mjs";
import {
  warpPosition,
  blackHolePositions,
  fleetPositions,
} from "../work/compiled/geometry.js";
import { restoreGame } from "../work/compiled/persistence.js";
import oldGame from "./fixtures/v0.10-completed-game.json" with { type: "json" };

const tile = (id) => `#galaxy .system[data-system="${id}"]`;

test("cached geometry follows new features, planets and occupied fleet positions", () => {
  const g = fixture(),
    s = g.systems[0];
  const before = blackHolePositions(s).length;
  assert.equal(warpPosition(s), null);
  s.extraWarp = true;
  assert.ok(warpPosition(s));
  s.extraHoles++;
  assert.equal(blackHolePositions(s).length, before + 1);
  const p = s.planets.find((p) => !p.home);
  p.blocked = true;
  s.extraHoles++;
  assert.ok(blackHolePositions(s).some((h) => h.x === p.x && h.y === p.y));
  s.planets.push({
    id: "new",
    capacity: 1,
    owners: [0, 0],
    x: 0.4,
    y: 0.6,
    blocked: false,
    explore: null,
    home: false,
  });
  const warp = warpPosition(s);
  assert.ok(Math.hypot((warp.x - 0.4) / 0.09, (warp.y - 0.6) / 0.078) > 1);
  s.ships[1] = 0;
  assert.deepEqual(fleetPositions(s)[1], { x: 0, y: 0 });
  s.ships[1] = 1;
  assert.notDeepEqual(fleetPositions(s)[1], { x: 0, y: 0 });
});

test("reused chip rims resolve inside the board and action-board chips remain self-contained", () => {
  const h = harness(),
    g = setup(7),
    s = g.systems[0];
  g.phase = "actions";
  g.turn = 6;
  g.players.forEach((p) => (p.unplaced = 0));
  s.tokens = Array.from({ length: 28 }, (_, i) => i % 7);
  s.tokens.splice(6, 1);
  g.players[6].used = ["move"];
  h.app.setGame(g);
  const uses = h.root.querySelectorAll(".stack-chip use");
  assert.equal(uses.length, 27);
  for (const use of uses) {
    const rim = h.root.querySelector(use.getAttribute("href"));
    assert.ok(rim);
    assert.equal(rim.querySelectorAll('circle[r="26"][stroke]').length, 0);
  }
  h.key("#status-box", "a");
  assert.ok(h.root.querySelector(".poker-chip circle"));
  assert.equal(h.root.querySelector(".poker-chip use"), null);
  h.close();
});

test("Plan previews only the selected system; a double-click commits once for the correct player", () => {
  const h = harness(),
    g = setup(),
    [a, b] = g.systems;
  h.app.setGame(g);
  assert.equal(h.root.querySelector(".plan-preview"), null);
  assert.equal(h.root.querySelector(".map-viewport").style.cursor, "");
  h.click(tile(a.id));
  assert.equal(h.root.querySelectorAll(".plan-preview").length, 1);
  assert.ok(h.root.querySelector(`${tile(a.id)} .plan-preview`));
  assert.equal(h.app.getGame().revision, g.revision);
  h.click(tile(b.id));
  assert.equal(h.root.querySelectorAll(".plan-preview").length, 1);
  assert.ok(h.root.querySelector(`${tile(b.id)} .plan-preview`));
  assert.equal(h.app.getGame().revision, g.revision);
  h.click(tile(b.id));
  assert.equal(h.app.getGame().revision, g.revision + 1);
  assert.deepEqual(system(h.app.getGame(), b.id).tokens, [0]);
  assert.equal(h.root.querySelector(".plan-preview"), null);
  h.click(tile(b.id));
  assert.equal(h.app.getGame().revision, g.revision + 1);
  h.close();
});

test("two touch taps commit Plan once and ignore the synthetic mouse click", () => {
  const h = harness(),
    g = setup(),
    id = g.systems[0].id;
  h.app.setGame(g);
  h.window.document.elementFromPoint = () => h.root.querySelector(tile(id));
  const tap = () => {
    h.pointer(tile(id), "pointerdown", 55, 60);
    h.pointer(".map-viewport", "pointerup", 55, 60);
  };
  tap();
  assert.equal(h.app.getGame().revision, g.revision);
  assert.ok(h.root.querySelector(`${tile(id)} .plan-preview`));
  h.click(tile(id));
  assert.equal(h.app.getGame().revision, g.revision);
  h.pointer(tile(id), "pointerdown", 55, 60, 1);
  h.pointer(".map-viewport", "pointerdown", 90, 60, 2);
  h.pointer(".map-viewport", "pointerup", 55, 60, 1);
  h.pointer(".map-viewport", "pointerup", 90, 60, 2);
  tap();
  assert.equal(h.app.getGame().revision, g.revision);
  tap();
  assert.equal(h.app.getGame().revision, g.revision + 1);
  assert.deepEqual(system(h.app.getGame(), id).tokens, [0]);
  h.click(tile(id));
  assert.equal(h.app.getGame().revision, g.revision + 1);
  assert.equal(h.root.querySelector(".plan-preview"), null);
  h.close();
});

test("double-click never overrides a blocked Plan target or commits across a view change", () => {
  const h = harness(),
    g = setup(),
    id = g.systems[0].id;
  g.disruptions = [{ owner: 1, system: id, round: g.round }];
  h.app.setGame(g);
  h.click(tile(id));
  h.click(tile(id));
  assert.equal(h.app.getGame().revision, g.revision);
  assert.equal(h.root.querySelector(".plan-preview"), null);
  const other = g.systems[1].id;
  h.click(tile(other));
  h.key("#status-box", "t");
  h.key("#status-box", "b");
  h.click(tile(other));
  assert.equal(h.app.getGame().revision, g.revision);
  h.click('[data-action="zoom-in"]');
  h.click(tile(other));
  assert.equal(h.app.getGame().revision, g.revision);
  h.close();
});

test("System status numbers stacks from the top and Invest scrolls to those controls", () => {
  const h = harness(),
    g = fixture(),
    s = g.systems[0];
  s.tokens = [1, 0, 0];
  h.app.setGame(g);
  h.click(tile(s.id));
  const order = h.root.querySelectorAll(".system-stack-order li");
  assert.deepEqual(
    [...order].map((n) => Number(n.dataset.owner)),
    [0, 0, 1],
  );
  assert.equal(order[0].querySelector("span").textContent, "1.");
  assert.ok(order[0].textContent.includes("Top"));
  assert.equal(h.root.querySelector(".turn-title"), null);
  h.click('[data-kind="produce"]');
  const scrolls = [];
  h.window.HTMLElement.prototype.scrollIntoView = function () {
    scrolls.push(this.id);
  };
  const checkbox = h.root.querySelector('[data-check="invest"]');
  checkbox.checked = true;
  checkbox.dispatchEvent(new h.window.Event("change", { bubbles: true }));
  assert.equal(scrolls.at(-1), "system-status");
  assert.equal(
    h.root.querySelector(".invest-choice strong").textContent,
    "Invest instead of acting",
  );
  assert.equal(h.app.getGame().revision, g.revision);
  h.close();
});

test("history starts collapsed again after navigation and another decision; view scroll includes extra two centimetres", () => {
  const h = harness(),
    g = fixture();
  h.app.setGame(g);
  h.root.querySelector(".since-last-turn").open = true;
  h.key("#status-box", "t");
  assert.equal(h.root.querySelector(".since-last-turn").open, false);
  assert.ok(
    Math.abs(
      Number(
        h.root
          .querySelector("#game-panel")
          .style.scrollMarginTop.match(/[\d.]+/)[0],
      ) -
        (8 + (2 * 96) / 2.54),
    ) < 0.01,
  );
  h.key("#status-box", "b");
  h.click(tile(g.systems[0].id));
  h.click('[data-kind="move"]');
  h.root.querySelector(".since-last-turn").open = true;
  h.click('[data-action="commit-action"]');
  assert.equal(h.root.querySelector(".since-last-turn").open, false);
  h.close();
});

test("system names form the last board layer and their bars follow measured text bounds", () => {
  const h = harness(),
    g = fixture();
  h.window.SVGElement.prototype.getBBox = function () {
    return { x: -25, y: -93, width: 50, height: 14 };
  };
  h.app.setGame(g);
  const svg = h.root.querySelector("#galaxy");
  assert.equal(svg.lastElementChild.classList.value, "system-labels");
  assert.equal(svg.querySelectorAll(".system-label").length, g.systems.length);
  for (const rect of svg.querySelectorAll(".system-name-bar")) {
    assert.equal(Number(rect.getAttribute("width")), 56);
    assert.equal(Number(rect.getAttribute("x")), -28);
  }
  assert.deepEqual(
    [...h.root.querySelectorAll(".camera-controls button")]
      .slice(-3)
      .map((b) => b.dataset.action),
    ["zoom-out", "zoom-in", "fit"],
  );
  h.close();
});

test("added belts rotate the supplied feature art and artificial warp occupies open space", () => {
  const h = harness(),
    g = fixture(),
    s = g.systems[0];
  s.extraEdges = [1, 4];
  s.extraWarp = true;
  g.features.warp = true;
  g.features.asteroid = true;
  h.app.setGame(g);
  const belts = h.root.querySelectorAll(`${tile(s.id)} .asteroid-belt-token`);
  assert.equal(belts.length, 2);
  assert.deepEqual(
    [...belts].map((b) => b.getAttribute("transform")),
    ["rotate(60)", "rotate(240)"],
  );
  for (const belt of belts)
    assert.equal(
      belt.querySelector("image").getAttribute("href"),
      ART.features.asteroidBelt.image,
    );
  const warp = h.root.querySelector(`${tile(s.id)} .warp-token`);
  assert.equal(
    warp.querySelector("image").getAttribute("href"),
    ART.features.warp.image,
  );
  const p = warpPosition(s);
  for (const planet of s.planets) {
    const source = ART.systems[s.template].planets[s.planets.indexOf(planet)];
    assert.ok(
      Math.hypot(
        (p.x - planet.x) / source.radiusX,
        (p.y - planet.y) / source.radiusY,
      ) > 1,
    );
  }
  assertInvariants(g);
  h.close();
});

test("Disruptor affects the following round normally but has no placement decision in the final round", () => {
  let g = fixture();
  g.phase = "tech";
  credits(g, 0, 10);
  assert.equal(isFinalRound(g), false);
  assert.ok(featureOptions(g, "tech.disruptor").length);
  g.round = 6;
  g.finalEconomy = true;
  assert.equal(isFinalRound(g), true);
  assert.equal(featureOptions(g, "tech.disruptor").length, 0);
  const before = scoreGame(g)[0].techs;
  g = step(g, { type: "buy", tech: "tech.disruptor" });
  assert.equal(g.pending, null);
  assert.equal(g.turn, 1);
  assert.equal(g.disruptions.length, 0);
  assert.equal(scoreGame(g)[0].techs, before + 1);
  assert.ok(g.log.some((l) => l.text.includes("Disruptor has no effect")));
  const h = harness();
  h.app.setGame(g);
  h.key("#status-box", "t");
  assert.match(
    h.root.querySelector('[data-tech-id="tech.disruptor"] .token-used')
      .textContent,
    /no effect in the last round/,
  );
  h.close();
});

test("genuine 0.10 final Disruptor saves resume without a dead-end choice and keep completed scores", () => {
  const checkpoint = oldGame.finalDisruptorCheckpoint;
  const pending = restoreGame({
    ...oldGame,
    commands: oldGame.commands.slice(0, checkpoint),
    revision: checkpoint,
  });
  assert.equal(pending.engine, "0.16.0");
  assert.equal(pending.pending, null);
  assert.equal(pending.phase, "tech");
  const completed = restoreGame(oldGame);
  assert.equal(completed.phase, "finished");
  assert.deepEqual(completed.scores, oldGame.scores);
  assert.deepEqual(completed.winners, oldGame.winners);
  const h = harness();
  h.app.setGame(completed);
  assert.deepEqual(
    [...h.root.querySelectorAll(".score-table-wrap thead th")].map(
      (t) => t.textContent,
    ),
    [
      "Players",
      "Planets Settled",
      "Systems Patrolled",
      "Techs Owned",
      "Total Score",
      "Credits",
    ],
  );
  assert.doesNotMatch(
    h.root.querySelector("#status-box").textContent,
    /Select a system\./,
  );
  assert.match(
    h.root.querySelector(".final-scores h1").textContent,
    /rules the galaxy|share the galaxy/,
  );
  h.close();
});

test("Explore result message omits the redundant Explore prefix and remains an explicit checkpoint", () => {
  let g = fixture(),
    s = g.systems[0],
    p = s.planets.find((p) => !p.home);
  p.explore = "credit2";
  g = applyCommand(g, 0, {
    type: "resolve",
    system: s.id,
    action: "settle",
    settlements: { [p.id]: 1 },
  });
  assert.equal(g.pending.kind, "ack");
  assert.equal(g.pending.title, "Explore result");
  assert.match(g.pending.messages[0], /^\+2 Credits:/);
  assert.doesNotMatch(g.pending.messages[0], /^Explore/);
  assertInvariants(g);
});
