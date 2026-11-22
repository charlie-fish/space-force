import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { harness } from "./ui-harness.mjs";
import {
  ART,
  applyCommand,
  assertInvariants,
  botCommand,
  canMove,
  createGame,
  credits,
  fixture,
  setup,
  ships,
  settlement,
  step,
  system,
  tech,
  sinceLastDecision,
} from "./helpers.mjs";
import { restoreGame } from "../work/compiled/persistence.js";
import oldGame from "./fixtures/v0.9-completed-game.json" with { type: "json" };

function exploreFixture(effect = "otherSettlement") {
  const g = fixture(),
    s = g.systems.find((s) => s.planets.some((p) => p.capacity === 2)),
    p = s.planets.find((p) => p.capacity === 2);
  s.revealed = true;
  g.systems.forEach((s) => (s.tokens = []));
  s.tokens = [0];
  ships(g, s, 0, 3 - s.ships[0]);
  p.explore = effect;
  return { g, s, p };
}
function checkInvest(h) {
  const check = h.root.querySelector('[data-check="invest"]');
  check.checked = false;
  check.dispatchEvent(new h.window.Event("change", { bubbles: true }));
}

test("exploration can reveal and orient first; no Ship can move until a positive entry is committed", () => {
  let g = fixture();
  const from = system(g, g.players[0].home),
    target = g.systems.find((s) => !s.revealed && canMove(g, 0, from, s));
  g.systems.forEach((s) => (s.tokens = []));
  target.tokens = [0];
  g = step(g, {
    type: "resolve",
    system: target.id,
    action: "move",
    sources: {},
    reveal: true,
  });
  assert.equal(g.pending.kind, "orient");
  assert.equal(system(g, from.id).ships[0], 3);
  assert.equal(system(g, target.id).ships[0], 0);
  g = step(g, { type: "orient", rotation: g.pending.rotations[0] });
  assert.deepEqual(g.pending.sources, {});
  assert.throws(() => step(g, { type: "move", sources: {} }), /At least one/);
  g = step(g, { type: "move", sources: { [from.id]: 1 } });
  assert.equal(system(g, from.id).ships[0], 2);
});

test("a non-decision Explore outcome pauses the same player before placing committed Settlements", () => {
  let { g, s, p } = exploreFixture("credit3");
  credits(g, 0, g.players[0].reserve - 1);
  g = step(g, {
    type: "resolve",
    system: s.id,
    action: "settle",
    settlements: { [p.id]: 1 },
  });
  assert.equal(g.turn, 0);
  assert.equal(g.pending.kind, "ack");
  assert.equal(g.pending.title, "Explore result");
  assert.match(g.pending.messages.join(" "), /could not be completed in full/);
  assert.equal(system(g, s.id).planets.find((o) => o.id === p.id).owners[0], 0);
  assert.throws(() =>
    step(g, { type: "resolve", system: s.id, action: "produce" }),
  );
  g = step(g, { type: "acknowledge" });
  assert.equal(system(g, s.id).planets.find((o) => o.id === p.id).owners[0], 1);
  assertInvariants(g);
});

for (const keep of [true, false])
  test(`Explore displacement keeps all other commitments fixed while the leftover is ${keep ? "kept as a Ship" : "allocated elsewhere"}`, () => {
    let { g, s, p } = exploreFixture();
    const other = s.planets.find(
      (o) => o.id !== p.id && o.capacity >= 2 && o.owners[0] === 0,
    );
    g = step(g, {
      type: "resolve",
      system: s.id,
      action: "settle",
      settlements: { [p.id]: 2, [other.id]: 1 },
    });
    g = step(g, { type: "explore", recipient: 1 });
    assert.equal(g.pending.kind, "redistribute");
    assert.equal(g.pending.amount, 1);
    assert.deepEqual(
      system(g, s.id).planets.find((o) => o.id === p.id).owners,
      [1, 1],
    );
    assert.throws(
      () => step(g, { type: "redistribute", ships: 0, settlements: {} }),
      /every displaced/,
    );
    assert.throws(() =>
      step(g, {
        type: "redistribute",
        ships: 0,
        settlements: { [other.id]: 2 },
      }),
    );
    g = step(g, {
      type: "redistribute",
      ships: keep ? 1 : 0,
      settlements: keep ? {} : { [other.id]: 1 },
    });
    assert.equal(
      system(g, s.id).planets.find((o) => o.id === other.id).owners[0],
      keep ? 1 : 2,
    );
    assert.equal(system(g, s.id).ships[0], keep ? 1 : 0);
    assertInvariants(g);
  });

test("Reserve-limited Produce, Banking, Investments and reinforcements all stop before the next player", () => {
  let g = fixture(),
    s = g.systems[0],
    side = s.planets.findIndex((p) => !p.home);
  settlement(g, s, side, 0, 1);
  settlement(g, s, side, 1, s.planets[side].capacity - 1);
  credits(g, 0, g.players[0].reserve - 1);
  g = step(g, { type: "resolve", system: s.id, action: "produce", credits: 1 });
  assert.equal(g.turn, 0);
  assert.equal(g.pending.kind, "ack");
  assert.match(g.pending.messages.join(" "), /Production/);
  g = step(g, { type: "acknowledge" });
  assert.equal(g.turn, 1);
  g = fixture();
  g.players[0].reserve--;
  g.players[0].invested = 1;
  credits(g, 0, g.players[0].reserve);
  g = step(g, {
    type: "resolve",
    system: g.systems[0].id,
    action: "move",
    invest: true,
  });
  assert.equal(g.pending.kind, "ack");
  assert.match(g.pending.messages[0], /Investment/);
  g = fixture();
  tech(g, 0, "banking");
  credits(g, 0, g.players[0].reserve);
  g = step(g, {
    type: "resolve",
    system: g.systems[0].id,
    action: "move",
    bank: true,
  });
  assert.equal(g.pending.kind, "ack");
  assert.match(g.pending.messages[0], /Banking/);
  g = fixture();
  g.phase = "reinforce";
  credits(g, 0, g.players[0].reserve - 1);
  credits(g, 1, g.players[1].reserve);
  g = step(g, {
    type: "allocate",
    credits: 0,
    ships: { [g.players[0].home]: 1 },
  });
  assert.equal(g.turn, 0);
  assert.equal(g.pending.kind, "ack");
  g = step(g, { type: "acknowledge" });
  assert.equal(g.turn, 1);
  assert.equal(g.pending.kind, "ack");
  g = step(g, { type: "acknowledge" });
  assert.equal(g.phase, "plan");
  assert.equal(g.first, 1);
});

test("Since your last turn starts at the previous decision, including consecutive decisions by the same player", () => {
  let g = createGame(2, 8);
  g = step(g, {
    type: "home",
    system: g.systems.find((s) => s.planets.some((p) => p.home)).id,
  });
  g = step(g, {
    type: "home",
    system: g.systems.find(
      (s) => s.planets.some((p) => p.home) && s.id !== g.players[0].home,
    ).id,
  });
  g = step(g, { type: "plan", system: g.systems[0].id });
  g = step(g, { type: "plan", system: g.systems[0].id });
  const history = sinceLastDecision(g);
  assert.equal(
    history.filter((l) => l.text.startsWith("Placed an action chip")).length,
    2,
  );
  assert.ok(history.every((l) => l.revision > 2));
  const sample = exploreFixture("blackHole");
  g = step(sample.g, {
    type: "resolve",
    system: sample.s.id,
    action: "settle",
    settlements: { [sample.p.id]: 1 },
  });
  assert.equal(g.decisions[g.decisions.length - 1].player, 0);
  assert.ok(sinceLastDecision(g).some((l) => l.text.includes("black hole")));
});

test("completed genuine 0.9 game migrates to the same scores and winners with the new pauses inserted", () => {
  const g = restoreGame(oldGame);
  assert.equal(g.engine, "0.22.0");
  assert.equal(g.phase, "finished");
  assert.deepEqual(g.scores, oldGame.expected.scores);
  assert.deepEqual(g.winners, oldGame.expected.winners);
});

test("Status heading and S shortcut scroll to the top; view shortcuts scroll the chosen panel", () => {
  const h = harness();
  h.app.setGame(fixture());
  const scrolls = [];
  h.window.scrollTo = (o) => scrolls.push(o);
  const panels = [];
  h.window.HTMLElement.prototype.scrollIntoView = function (o) {
    panels.push({ id: this.id, options: o });
  };
  assert.equal(
    h.root.querySelector(".status-title").textContent.trim(),
    "Status Box (S)",
  );
  assert.equal(h.root.querySelector(".status-phase").textContent, "Actions");
  h.key(".main-panel", "s");
  assert.equal(scrolls.at(-1).top, 0);
  for (const key of ["b", "t", "e", "a", "p"]) {
    h.key("#status-box", key);
    assert.equal(panels.at(-1).id, "game-panel");
  }
  assert.equal(
    h.root.querySelector(".turn-instruction").previousElementSibling.className,
    "player-badge",
  );
  h.close();
});

test("Plan can be changed across systems before Place chip here; stack numbers live only in System status", () => {
  const h = harness(),
    g = setup();
  h.app.setGame(g);
  for (const s of g.systems.slice(0, 2)) {
    h.click(`[data-system="${s.id}"][role="button"]`);
    assert.equal(h.app.getGame().revision, g.revision);
  }
  const id = g.systems[1].id;
  h.click('[data-action="place-chip"]');
  assert.deepEqual(system(h.app.getGame(), id).tokens, [0]);
  assert.equal(h.app.getGame().revision, g.revision + 1);
  h.close();
});

test("12-chip stacks stay compact and selection rings sit behind every chip", () => {
  const h = harness(),
    g = setup(3),
    s = g.systems[0];
  g.phase = "actions";
  g.turn = 2;
  s.tokens = Array.from({ length: 12 }, (_, i) => i % 3);
  h.app.setGame(g);
  const tile = h.root.querySelector(`[data-system="${s.id}"][role="button"]`),
    ring = tile.querySelector(".selection-ring"),
    chips = tile.querySelectorAll(".stack-chip");
  assert.equal(chips.length, 12);
  assert.ok(
    Math.max(...[...chips].map((el) => Number(el.dataset.chipRise))) <= 32,
  );
  assert.ok(ring.compareDocumentPosition(chips[0]) & 4);
  assert.equal(tile.querySelectorAll("[data-stack-index]").length, 0);
  h.click(`[data-system="${s.id}"][role="button"]`);
  assert.equal(h.root.querySelectorAll(".system-stack-order li").length, 12);
  h.close();
});

test("Since your last turn replaces the last-action box and supplies include live scores", () => {
  const h = harness(),
    g = setup();
  h.app.setGame(g);
  assert.equal(h.root.querySelector(".action-result"), null);
  assert.match(
    h.root.querySelector(".since-last-turn summary").textContent,
    /Since your last turn/,
  );
  assert.match(
    h.root.querySelector(".player-roster").textContent,
    /2 points currently/,
  );
  h.close();
});

test("Investments transfer allocation from the topmost other entry and allow adding by board click", () => {
  const h = harness(),
    g = fixture();
  g.phase = "investments";
  g.players[0].reserve--;
  g.players[0].invested = 1;
  h.app.setGame(g);
  const home = g.players[0].home;
  h.click(`[data-system="${home}"][role="button"]`);
  assert.equal(
    h.root.querySelector('[data-number="allocate-credits"]').value,
    "0",
  );
  assert.equal(
    h.root.querySelector(`[data-number="allocate-system"][data-id="${home}"]`)
      .value,
    "1",
  );
  h.input('[data-number="allocate-credits"]', "1");
  assert.equal(
    h.root.querySelector(`[data-number="allocate-system"][data-id="${home}"]`)
      .value,
    "0",
  );
  assert.equal(
    h.root.querySelector('[data-number="allocate-credits"]').value,
    "1",
  );
  h.close();
});

test("reinforcements cap total quantities and confirm leaving available Ships unallocated", () => {
  const h = harness(),
    g = fixture();
  g.phase = "reinforce";
  const home = system(g, g.players[0].home);
  const other = g.systems.find((s) => s.revealed && s.id !== home.id);
  settlement(
    g,
    other,
    other.planets.findIndex((p) => !p.home),
    0,
    1,
  );
  h.app.setGame(g);
  h.input(`[data-number="allocate-system"][data-id="${home.id}"]`, "2");
  h.input(`[data-number="allocate-system"][data-id="${other.id}"]`, "99");
  assert.equal(
    h.root.querySelector(
      `[data-number="allocate-system"][data-id="${other.id}"]`,
    ).value,
    "1",
  );
  h.input(`[data-number="allocate-system"][data-id="${other.id}"]`, "0");
  h.click('[data-action="allocate"]');
  assert.ok(h.root.querySelector('[role="dialog"]'));
  assert.equal(h.app.getGame().revision, g.revision);
  h.click('[data-action="confirm-command"]');
  assert.equal(h.app.getGame().turn, 1);
  h.close();
});

test("target-first attack automatically raises sacrifice without exceeding available own Ships, and preserves scroll", () => {
  const h = harness(),
    g = fixture(),
    s = g.systems[0],
    p = s.planets.findIndex((p) => !p.home);
  ships(g, s, 1, 8);
  settlement(g, s, p, 1, 1);
  h.app.setGame(g);
  h.click(`[data-system="${s.id}"][role="button"]`);
  h.click('[data-kind="attack"]');
  h.input('[data-number="target-ships"]', "2");
  assert.equal(h.root.querySelector('[data-number="sacrifice"]').value, "1");
  const scroll = h.root.querySelector(".attack-planets");
  scroll.scrollTop = 97;
  h.input('[data-number="target-colony"]', "1");
  assert.equal(h.root.querySelector('[data-number="sacrifice"]').value, "2");
  assert.equal(h.root.querySelector(".attack-planets").scrollTop, 97);
  assert.match(h.root.querySelector(".attack-budget").textContent, /2 \/ 2/);
  h.input('[data-number="target-ships"]', "99");
  assert.equal(h.root.querySelector('[data-number="sacrifice"]').value, "3");
  assert.equal(h.root.querySelector('[data-number="target-ships"]').value, "4");
  h.close();
});

test("empty attacks default to Invest and the Invest checkbox directly precedes Commit", () => {
  const h = harness(),
    g = fixture(),
    s = g.systems[0];
  h.app.setGame(g);
  h.click(`[data-system="${s.id}"][role="button"]`);
  h.click('[data-kind="attack"]');
  assert.equal(h.root.querySelector('[data-check="invest"]').checked, true);
  const choice = h.root.querySelector(".invest-choice");
  assert.ok(
    choice.nextElementSibling.querySelector('[data-action="commit-action"]'),
  );
  h.close();
});

test("selected Tech planet, system and edge move to the first chooser position with scroll reset", () => {
  for (const id of ["genesis", "artificial-warp", "kessler-syndrome"]) {
    const h = harness(),
      g = fixture();
    g.phase = "tech";
    credits(g, 0, 12);
    h.app.setGame(applyCommand(g, 0, { type: "buy", tech: `tech.${id}` }));
    const buttons = h.root.querySelectorAll(".feature-options button"),
      last = buttons[buttons.length - 1],
      data = { ...last.dataset };
    h.root.querySelector(".feature-options").scrollLeft = 300;
    if (data.planet)
      h.click(
        `#galaxy [data-system="${data.systemId}"][data-planet="${data.planet}"]`,
      );
    else if (data.edge !== undefined)
      h.click(
        `#galaxy .edge-target[data-system="${data.systemId}"][data-edge="${data.edge}"]`,
      );
    else h.click(`#galaxy [data-system="${data.systemId}"][role="button"]`);
    const first = h.root.querySelector(".feature-options button");
    assert.equal(first.getAttribute("aria-pressed"), "true");
    assert.equal(first.dataset.systemId, data.systemId);
    assert.equal(h.root.querySelector(".feature-options").scrollLeft, 0);
    h.close();
  }
});

test("all black-hole types use the circular art, while Le Guin starts with none", () => {
  assert.equal(ART.systems["system.le-guin"].fixedBlackHoles.length, 0);
  const h = harness(),
    g = fixture(),
    s = g.systems[0];
  s.revealed = true;
  s.extraHoles = 2;
  const p = s.planets.find((p) => !p.home);
  p.blocked = true;
  s.extraHoles++;
  h.app.setGame(g);
  const tile = h.root.querySelector(`[data-system="${s.id}"][role="button"]`);
  assert.equal(
    tile.querySelectorAll(".black-hole-token image").length,
    ART.systems[s.template].fixedBlackHoles.length + 3,
  );
  assert.ok(
    [...tile.querySelectorAll(".black-hole-token image")].every(
      (el) => el.getAttribute("href") === ART.features.blackHole.image,
    ),
  );
  assert.doesNotMatch(tile.textContent, /◉ \+/);
  h.close();
});

test("Explore Ok and displaced-settlement controls keep the active player at the required decision", () => {
  const h = harness();
  let { g, s, p } = exploreFixture("blackHole");
  h.app.setGame(
    applyCommand(g, 0, {
      type: "resolve",
      system: s.id,
      action: "settle",
      settlements: { [p.id]: 1 },
    }),
  );
  assert.ok(h.root.querySelector('[data-action="acknowledge"]'));
  h.click('[data-action="acknowledge"]');
  assert.equal(
    system(h.app.getGame(), s.id).planets.find((o) => o.id === p.id).owners[0],
    1,
  );
  h.close();
  const k = harness();
  ({ g, s, p } = exploreFixture());
  g = applyCommand(g, 0, {
    type: "resolve",
    system: s.id,
    action: "settle",
    settlements: { [p.id]: 2 },
  });
  g = applyCommand(g, 0, { type: "explore", recipient: 1 });
  k.app.setGame(g);
  assert.ok(k.root.querySelector('[data-action="commit-redistribute"]'));
  assert.equal(k.root.querySelector('[data-number="settlement"]'), null);
  k.click('[data-action="commit-redistribute"]');
  assert.equal(
    system(k.app.getGame(), s.id).planets.find((o) => o.id === p.id).owners[0],
    1,
  );
  k.close();
});

test("buying a token Tech whose token is already used asks before spending Credits", () => {
  const h = harness(),
    g = fixture();
  g.phase = "tech";
  credits(g, 0, 8);
  g.features.warp = true;
  h.app.setGame(g);
  h.click('[data-view="techs"]');
  h.click('[data-tech="tech.artificial-warp"][data-action="buy"]');
  assert.match(
    h.root.querySelector('[role="dialog"]').textContent,
    /no token effect/,
  );
  assert.equal(h.app.getGame().players[0].credits, 8);
  h.click('[data-action="confirm-command"]');
  assert.ok(h.app.getGame().players[0].techs.includes("tech.artificial-warp"));
  h.close();
});

test("all five final views remain below Expedition complete and do not alter final game state", () => {
  let g = createGame(2, 17);
  while (g.phase !== "finished") g = step(g, botCommand(g));
  const h = harness();
  h.app.setGame(g);
  const revision = g.revision;
  for (const view of ["board", "techs", "event", "actions", "player_aid"]) {
    h.click(`[data-view="${view}"]`);
    assert.ok(h.root.querySelector(".final-scores"));
    assert.ok(
      h.root
        .querySelector(".final-scores")
        .compareDocumentPosition(h.root.querySelector("#game-panel")) & 4,
    );
    assert.equal(h.app.getGame().revision, revision);
    assert.equal(h.app.getView(), view);
  }
  h.click('[data-view="board"]');
  assert.ok(h.root.querySelector("#galaxy"));
  h.close();
});

test("live text sizes have a ten-point floor and mobile shortcut hints are hidden", () => {
  const css = readFileSync(
    new URL("../src/style.css", import.meta.url),
    "utf8",
  );
  const h = harness();
  for (const match of css.matchAll(/font-size:\s*([^;{}]+)/g)) {
    assert.ok(
      match[1].startsWith("max(10pt,") ||
        /^13\.333334px\s*!important$/.test(match[1].trim()),
      match[1],
    );
    const declaration = h.window.document.createElement("span").style;
    declaration.setProperty(
      "font-size",
      match[1]
        .replace(/\s*!important\s*$/, "")
        .replace(/var\(--board-text-size,\s*([^)]+)\)/g, "$1"),
    );
    assert.notEqual(declaration.fontSize, "", `Invalid font size: ${match[1]}`);
  }
  h.close();
  assert.match(
    css,
    /@media\s*\([^}]+\.shortcut-hint\s*\{[^}]*display:\s*none/s,
  );
});

test("S works from the page body and respects typing fields and browser modifier keys", () => {
  const h = harness();
  h.app.setGame(fixture());
  const scrolls = [];
  h.window.scrollTo = (o) => scrolls.push(o);
  h.window.document.body.dispatchEvent(
    new h.window.KeyboardEvent("keydown", { key: "s", bubbles: true }),
  );
  assert.equal(scrolls.length, 1);
  h.key(".main-panel", "s", { ctrlKey: true });
  assert.equal(scrolls.length, 1);
  const s = h.app.getGame().systems[0];
  h.click(`[data-system="${s.id}"][role="button"]`);
  h.click('[data-kind="produce"]');
  h.key('[data-number="produce-credits"]', "s");
  assert.equal(scrolls.length, 1);
  h.close();
});

test("all board Settlement pieces use double-sized 24-unit rockets at their existing anchors", () => {
  const h = harness();
  h.app.setGame(setup());
  const pieces = h.root.querySelectorAll(
    "#galaxy [data-planet] .settlement-piece",
  );
  assert.equal(pieces.length, 6);
  for (const piece of pieces)
    assert.match(piece.getAttribute("transform"), /scale\(0\.6\)/);
  h.close();
});

test("investment over-allocation reduces the first other system and keeps the edited choice", () => {
  const h = harness(),
    g = fixture(),
    home = system(g, g.players[0].home),
    other = g.systems.find((s) => s.revealed && s.id !== home.id);
  settlement(
    g,
    other,
    other.planets.findIndex((p) => !p.home),
    0,
    1,
  );
  g.phase = "investments";
  g.players[0].reserve -= 2;
  g.players[0].invested = 2;
  h.app.setGame(g);
  h.click(`[data-system="${home.id}"][role="button"]`);
  h.click(`[data-system="${other.id}"][role="button"]`);
  h.input('[data-number="allocate-credits"]', "1");
  assert.equal(
    h.root.querySelector(
      `[data-number="allocate-system"][data-id="${home.id}"]`,
    ).value,
    "0",
  );
  assert.equal(
    h.root.querySelector(
      `[data-number="allocate-system"][data-id="${other.id}"]`,
    ).value,
    "1",
  );
  h.close();
});

test("reinforcement board clicks add one when available and never exceed the allowance", () => {
  const h = harness(),
    g = fixture();
  g.phase = "reinforce";
  h.app.setGame(g);
  const home = g.players[0].home;
  for (let i = 0; i < 4; i++) h.click(`[data-system="${home}"][role="button"]`);
  assert.equal(
    h.root.querySelector(`[data-number="allocate-system"][data-id="${home}"]`)
      .value,
    "3",
  );
  assert.equal(h.app.getGame().revision, g.revision);
  h.close();
});

test("limited production explains Reserve availability and confirms before commitment", () => {
  const h = harness(),
    g = fixture(),
    s = g.systems[0],
    side = s.planets.findIndex((p) => !p.home);
  settlement(g, s, side, 0, 1);
  settlement(g, s, side, 1, s.planets[side].capacity - 1);
  credits(g, 0, g.players[0].reserve - 1);
  h.app.setGame(g);
  h.click(`[data-system="${s.id}"][role="button"]`);
  h.click('[data-kind="produce"]');
  assert.match(
    h.root.querySelector(".production-controls").textContent,
    /limited by Reserve/,
  );
  h.click('[data-action="commit-action"]');
  assert.equal(h.app.getGame().turn, 0);
  assert.match(
    h.root.querySelector(".modal").textContent,
    /could not be completed in full/,
  );
  assert.equal(h.app.getGame().revision, g.revision);
  h.click('[data-action="confirm-command"]');
  assert.equal(h.app.getGame().turn, 1);
  assert.equal(h.app.getGame().pending, null);
  h.close();
});
