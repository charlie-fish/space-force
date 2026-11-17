import test from "node:test";
import assert from "node:assert/strict";
import { harness } from "./ui-harness.mjs";
import {
  ART,
  applyCommand,
  botCommand,
  canMove,
  createGame,
  fixture,
  setup,
  system,
  credits,
  ships,
  settlement,
} from "./helpers.mjs";

test("Status Box is above the board and always contains the turn, supplies and shortcut-labelled views", () => {
  const h = harness();
  h.app.setGame(fixture());
  assert.ok(h.root.querySelector("#status-box .turn-bar"));
  assert.ok(h.root.querySelector("#status-box .player-roster"));
  assert.ok(
    h.root
      .querySelector("#status-box")
      .compareDocumentPosition(h.root.querySelector(".main-panel")) & 4,
  );
  for (const [view, label] of [
    ["board", "Board (B)"],
    ["techs", "Techs (T)"],
    ["event", "Event (E)"],
    ["actions", "Actions and Supply (A)"],
    ["player_aid", "Player aid (P)"],
  ]) {
    h.click(`[data-view="${view}"]`);
    assert.ok(h.root.querySelector("#status-box .turn-bar"));
    assert.ok(
      h.root.querySelector(`[data-view="${view}"]`).textContent.endsWith(label),
    );
  }
  h.close();
});

test("Plan has a blank sun and touch drag previews a placement until confirmed", () => {
  const h = harness();
  h.app.setGame(setup());
  const g = h.app.getGame(),
    target = g.systems.find((s) => !s.revealed),
    id = target.id;
  assert.ok(h.root.querySelector(".blank-sun"));
  assert.equal(h.root.querySelector(".plan-preview"), null);
  assert.equal(
    h.root.querySelector(".map-viewport").getAttribute("style"),
    null,
  );
  h.window.document.elementFromPoint = () =>
    h.root.querySelector(`[data-system="${id}"][role="button"]`);
  h.pointer(`[data-system="${id}"][role="button"]`, "pointerdown", 50, 50);
  h.pointer(".map-viewport", "pointermove", 100, 70);
  assert.ok(h.root.querySelector("#placement-chip"));
  assert.ok(h.root.querySelector(".drop-target"));
  h.pointer(".map-viewport", "pointerup", 100, 70);
  assert.equal(h.app.getGame().revision, g.revision);
  assert.deepEqual(system(h.app.getGame(), id).tokens, []);
  h.click('[data-action="place-chip"]');
  assert.equal(h.app.getGame().revision, g.revision + 1);
  h.click(`[data-system="${id}"][role="button"]`);
  assert.equal(h.app.getGame().revision, g.revision + 1);
  assert.equal(h.root.querySelector("#placement-chip"), null);
  h.close();
});

test("all 28 stack positions are visible without inspection and selectable top chips are highlighted", () => {
  const g = setup(7);
  g.phase = "actions";
  g.turn = 6;
  g.players.forEach((p) => (p.unplaced = 0));
  g.systems[0].tokens = Array.from({ length: 28 }, (_, i) => i % 7);
  const h = harness();
  h.app.setGame(g);
  const tile = h.root.querySelector(
    `[data-system="${g.systems[0].id}"][role="button"]`,
  );
  assert.deepEqual(
    [...tile.querySelectorAll(".stack-chip")].map((el) =>
      Number(el.dataset.owner),
    ),
    g.systems[0].tokens,
  );
  assert.ok(tile.querySelector(".selection-ring"));
  assert.equal(tile.querySelectorAll("[data-stack-index]").length, 0);
  h.click(`[data-system="${g.systems[0].id}"][role="button"]`);
  assert.equal(
    h.root.querySelectorAll(".system-stack-order [data-stack-index]").length,
    28,
  );
  h.close();
});

test("production Ships and Credits stay linked in both directions and commit the displayed split", () => {
  const h = harness(),
    g = fixture(),
    id = g.systems[0].id;
  h.app.setGame(g);
  h.click(`[data-system="${id}"][role="button"]`);
  h.click('[data-kind="produce"]');
  const total = Number(
    h.root.querySelector('[data-number="produce-ships"]').value,
  );
  assert.ok(total > 0);
  assert.equal(
    h.root.querySelector('[data-number="produce-credits"]').value,
    "0",
  );
  h.input('[data-number="produce-ships"]', String(total));
  assert.equal(
    h.root.querySelector('[data-number="produce-credits"]').value,
    "0",
  );
  h.input('[data-number="produce-credits"]', String(total));
  assert.equal(
    h.root.querySelector('[data-number="produce-ships"]').value,
    "0",
  );
  h.click('[data-action="commit-action"]');
  assert.equal(h.app.getGame().players[0].credits, total);
  h.close();
});

test("Settlement quantities and snapped previews can increase and decrease before any command is committed", () => {
  const h = harness(),
    g = fixture(),
    s = g.systems[0],
    p = s.planets.find((p) => !p.home && p.capacity >= 2);
  h.app.setGame(g);
  h.click(`[data-system="${s.id}"][role="button"]`);
  h.click('[data-kind="settle"]');
  const input = `[data-number="settlement"][data-planet="${p.id}"]`;
  h.input(input, "2");
  assert.equal(h.app.getGame().revision, g.revision);
  assert.equal(h.root.querySelectorAll(".settlement-draft").length, 2);
  h.input(input, "1");
  assert.equal(h.root.querySelectorAll(".settlement-draft").length, 1);
  assert.equal(system(h.app.getGame(), s.id).ships[0], 3);
  const slot =
    ART.systems[s.template].planets[s.planets.indexOf(p)].settlementSlots[0];
  assert.ok(slot);
  h.click('[data-action="commit-action"]');
  assert.equal(
    system(h.app.getGame(), s.id).planets.find((o) => o.id === p.id).owners[0],
    1,
  );
  assert.equal(system(h.app.getGame(), s.id).ships[0], 2);
  h.close();
});

test("Status Box reports hidden Explore tokens and then shows the revealed outcome", () => {
  const h = harness(),
    g = fixture(),
    s = g.systems[0],
    p = s.planets.find((p) => !p.home);
  p.capacity = 1;
  p.explore = "otherSettlement";
  h.app.setGame(g);
  h.click(`[data-system="${s.id}"][role="button"]`);
  assert.match(
    h.root.querySelector("#status-box").textContent,
    /1 Explore token/,
  );
  h.click('[data-kind="settle"]');
  h.input(`[data-number="settlement"][data-planet="${p.id}"]`, "1");
  h.click('[data-action="commit-action"]');
  assert.equal(h.app.getGame().pending.kind, "explore");
  assert.match(
    h.root.querySelector("#status-box").textContent,
    /Explore token revealed/,
  );
  h.click('[data-recipient="1"]');
  assert.match(
    h.root.querySelector("#status-box").textContent,
    /received 1 Settlement/,
  );
  assert.deepEqual(
    system(h.app.getGame(), s.id).planets.find((q) => q.id === p.id).owners,
    [0, 1],
  );
  h.close();
});

test("attack limits targets by sacrifice, shows planet graphics, and confirms excess sacrifices", () => {
  const h = harness(),
    g = fixture(),
    s = g.systems[0],
    index = s.planets.findIndex((p) => !p.home && p.capacity >= 2);
  ships(g, s, 0, 2);
  ships(g, s, 1, 5);
  settlement(g, s, index, 1, 2);
  h.app.setGame(g);
  h.click(`[data-system="${s.id}"][role="button"]`);
  h.click('[data-kind="attack"]');
  assert.match(h.root.querySelector("#status-box").textContent, /out of 5/);
  assert.ok(h.root.querySelector(".attack-planet svg"));
  assert.doesNotMatch(
    h.root.querySelector(".attack-planets").textContent,
    /protected because/,
  );
  h.input('[data-number="sacrifice"]', "2");
  h.input('[data-number="target-ships"]', "99");
  assert.equal(h.root.querySelector('[data-number="target-ships"]').value, "5");
  assert.equal(h.root.querySelector('[data-number="target-colony"]').max, "2");
  h.input('[data-number="sacrifice"]', "1");
  assert.equal(h.root.querySelector('[data-number="target-ships"]').value, "2");
  h.input('[data-number="sacrifice"]', "3");
  h.input('[data-number="target-ships"]', "1");
  h.input('[data-number="target-colony"]', "1");
  h.click('[data-action="commit-action"]');
  assert.ok(h.root.querySelector('[role="dialog"]'));
  assert.equal(h.app.getGame().revision, g.revision);
  h.click('[data-action="cancel-confirmation"]');
  assert.equal(h.root.querySelector('[data-number="sacrifice"]').value, "3");
  h.click('[data-action="commit-action"]');
  h.click('[data-action="confirm-command"]');
  assert.equal(h.app.getGame().players[0].credits, 3);
  assert.equal(h.app.getGame().players[1].credits, 2);
  h.close();
});

test("only genuinely shared planets are described as protected", () => {
  const h = harness(),
    g = fixture(),
    s = g.systems[0],
    home = s.planets.findIndex((p) => p.home);
  settlement(g, s, home, 1, 1);
  h.app.setGame(g);
  h.click(`[data-system="${s.id}"][role="button"]`);
  h.click('[data-kind="attack"]');
  const invest = h.root.querySelector('[data-check="invest"]');
  invest.checked = false;
  invest.dispatchEvent(new h.window.Event("change", { bubbles: true }));
  assert.equal(
    (
      h.root
        .querySelector(".attack-planets")
        .textContent.match(/Protected because you share it/g) || []
    ).length,
    1,
  );
  h.close();
});

test("Invest defaults on empty actions, can be unchecked, and invested slots show a rocket marker", () => {
  const h = harness(),
    g = fixture(),
    s = g.systems.find((s) => !s.revealed);
  s.revealed = true;
  g.systems.forEach((s) => (s.tokens = []));
  s.tokens = [0, 0];
  h.app.setGame(g);
  h.click(`[data-system="${s.id}"][role="button"]`);
  for (const action of ["move", "settle", "produce", "attack"]) {
    h.click(`[data-kind="${action}"]`);
    assert.equal(h.root.querySelector('[data-check="invest"]').checked, true);
  }
  const check = h.root.querySelector('[data-check="invest"]');
  check.checked = false;
  check.dispatchEvent(new h.window.Event("change", { bubbles: true }));
  assert.equal(h.root.querySelector('[data-check="invest"]').checked, false);
  h.click('[data-kind="move"]');
  h.click('[data-action="commit-action"]');
  h.click('[data-view="actions"]');
  const label = [...h.root.querySelectorAll(".action-slot")].find((el) =>
    el.textContent.includes("Move into"),
  );
  assert.match(label.textContent, /Invested this round/);
  assert.ok(label.querySelector("small svg.rocket"));
  h.close();
});

test("Techs sort by cost and token cards show when their token has already been placed", () => {
  const h = harness(),
    g = fixture();
  g.phase = "tech";
  credits(g, 0, 15);
  g.features = { warp: true, planet: true, asteroid: true, blackHole: true };
  h.app.setGame(g);
  h.click('[data-view="techs"]');
  const values = [...h.root.querySelectorAll("[data-tech-value]")].map((el) =>
    Number(el.dataset.techValue),
  );
  assert.deepEqual(
    values,
    values.slice().sort((a, b) => a - b),
  );
  for (const id of [
    "artificial-warp",
    "planet-nine",
    "kessler-syndrome",
    "planet-killer",
  ])
    assert.ok(h.root.querySelector(`[data-tech-id="tech.${id}"] .token-used`));
  assert.match(
    h.root.querySelector("#status-box").textContent,
    /15 Credits available/,
  );
  h.close();
});

test("planet and Kessler edge selections on the map highlight their Status Box options before commitment", () => {
  for (const id of ["genesis", "kessler-syndrome"]) {
    const h = harness(),
      g = fixture();
    g.phase = "tech";
    credits(g, 0, 12);
    const pending = applyCommand(g, 0, { type: "buy", tech: `tech.${id}` });
    h.app.setGame(pending);
    const target =
      id === "genesis"
        ? h.root.querySelector(".feature-options button[data-planet]")
        : h.root.querySelector(".edge-target");
    const systemId =
      id === "genesis" ? target.dataset.systemId : target.dataset.system;
    const selector =
      id === "genesis"
        ? `#galaxy [data-system="${systemId}"][data-planet="${target.dataset.planet}"]`
        : `#galaxy .edge-target[data-system="${systemId}"][data-edge="${target.dataset.edge}"]`;
    h.click(selector);
    assert.ok(h.root.querySelector('.feature-options [aria-pressed="true"]'));
    assert.equal(h.app.getGame().revision, pending.revision);
    assert.equal(
      h.root.querySelector('[data-action="commit-feature"]').disabled,
      false,
    );
    h.click('[data-action="commit-feature"]');
    assert.equal(h.app.getGame().revision, pending.revision + 1);
    h.close();
  }
});

test("Genesis without any empty valid planet asks for confirmation while preserving Credits on cancel", () => {
  const h = harness(),
    g = fixture();
  g.phase = "tech";
  credits(g, 0, 6);
  for (const s of g.systems.filter((s) => s.revealed))
    for (const p of s.planets)
      while (sum(p.owners) < p.capacity) {
        const owner = g.players.find((p) => p.reserve > 0);
        p.owners[owner.id]++;
        owner.reserve--;
      }
  h.app.setGame(g);
  h.click('[data-view="techs"]');
  h.click('[data-action="buy"][data-tech="tech.genesis"]');
  assert.match(
    h.root.querySelector('[role="dialog"]').textContent,
    /no empty, valid planets/,
  );
  h.click('[data-action="cancel-confirmation"]');
  assert.equal(h.app.getGame().players[0].credits, 6);
  h.click('[data-action="buy"][data-tech="tech.genesis"]');
  h.click('[data-action="confirm-command"]');
  assert.ok(h.app.getGame().players[0].techs.includes("tech.genesis"));
  assert.equal(h.app.getGame().players[0].credits, 0);
  h.close();
});

test("Economy shows every stage, an explicit Event step, and Board reinforcements after Tech", () => {
  const h = harness(),
    g = fixture();
  g.phase = "investments";
  g.players[0].invested = 1;
  g.players[0].reserve--;
  h.app.setGame(g);
  assert.match(
    h.root.querySelector(".first-player-token").getAttribute("aria-label"),
    /Investments/,
  );
  h.click('[data-action="allocate"]');
  assert.equal(h.app.getGame().phase, "event");
  assert.equal(h.app.getView(), "event");
  assert.equal(h.root.querySelectorAll(".event-pair img").length, 2);
  assert.match(
    h.root.querySelector(".first-player-token").getAttribute("aria-label"),
    /Event/,
  );
  h.click('[data-action="continue-event"]');
  assert.equal(h.app.getView(), "techs");
  h.click('[data-action="pass-tech"]');
  h.click('[data-action="pass-tech"]');
  assert.equal(h.app.getGame().phase, "reinforce");
  assert.equal(h.app.getView(), "board");
  assert.ok(h.root.querySelector('#status-box [data-action="allocate"]'));
  for (let i = 0; i < 2; i++) {
    h.click('[data-action="all-home"]');
    h.click('[data-action="allocate"]');
  }
  assert.equal(h.app.getGame().phase, "plan");
  assert.equal(h.app.getGame().first, 1);
  h.close();
});

function sum(a) {
  return a.reduce((n, v) => n + v, 0);
}

test("orientation buttons preview repeatable sixty-degree rotations and commit only a legal choice", () => {
  const h = harness(),
    g = fixture(),
    from = system(g, g.players[0].home),
    target = g.systems.find((s) => !s.revealed && canMove(g, 0, from, s));
  g.systems.forEach((s) => (s.tokens = []));
  target.tokens = [0];
  h.app.setGame(
    applyCommand(g, 0, {
      type: "resolve",
      system: target.id,
      action: "move",
      sources: { [from.id]: 1 },
    }),
  );
  const revision = h.app.getGame().revision,
    rotations = h.app.getGame().pending.rotations;
  for (let i = 0; i < 6; i++) {
    h.click('[data-action="rotate-preview"][data-delta="1"]');
    assert.equal(h.app.getGame().revision, revision);
  }
  assert.equal(
    h.root.querySelector('[data-action="commit-orientation"]').disabled,
    false,
  );
  h.click('[data-action="rotate-preview"][data-delta="-1"]');
  h.click('[data-action="rotate-preview"][data-delta="1"]');
  h.click('[data-action="commit-orientation"]');
  assert.equal(h.app.getGame().pending.kind, "move");
  assert.ok(rotations.includes(system(h.app.getGame(), target.id).rotation));
  h.close();
});

test("setup exposes 2–7 seats, editable names, and a reproducible map code", () => {
  const h = harness();
  const { app, root, window, click, input } = h;
  click('[data-count="7"]');
  assert.equal(root.querySelectorAll("[data-name]").length, 7);
  input('[data-name="0"]', "Ada", "input");
  input("#map-code", "test map", "input");
  root
    .querySelector("#setup-form")
    .dispatchEvent(
      new window.Event("submit", { bubbles: true, cancelable: true }),
    );
  assert.equal(app.getGame().players.length, 7);
  assert.equal(app.getGame().players[0].name, "Ada");
  assert.equal(root.querySelectorAll('[role="tab"]').length, 5);
  assert.match(
    root.querySelector(".status-supply").textContent,
    /Reserve40Credits0/,
  );
  assert.match(root.querySelector(".turn-bar").textContent, /Ada/);
  h.close();
});

test("home and chip choices commit through the real interface; all five views remain available", () => {
  const h = harness();
  const { app, root, click } = h;
  app.setGame(createGame(2, 9));
  for (let i = 0; i < 2; i++) {
    const g = app.getGame();
    const s = g.systems.find(
      (s) =>
        s.planets.some((p) => p.home) &&
        !g.players.some((p) => p.home === s.id),
    );
    click(`[data-system="${s.id}"][role="button"]`);
    click('[data-action="choose-home"]');
  }
  assert.equal(app.getGame().phase, "plan");
  const id = app.getGame().systems[0].id;
  for (let i = 0; i < 8; i++) {
    click(`[data-system="${id}"][role="button"]`);
    click('[data-action="place-chip"]');
  }
  assert.equal(app.getGame().phase, "actions");
  for (const view of ["techs", "event", "actions", "player_aid", "board"]) {
    click(`[data-view="${view}"]`);
    assert.equal(app.getView(), view);
    assert.equal(
      root.querySelector(`[data-view="${view}"]`).getAttribute("aria-selected"),
      "true",
    );
  }
  click('[data-view="player_aid"]');
  assert.equal(root.querySelectorAll(".aid-faces img").length, 2);
  assert.match(root.querySelector(".aid-faces").textContent, /Move into/);
  assert.equal(root.querySelector(".aid-view h2").textContent, "Player aid");
  assert.doesNotMatch(
    root.querySelector(".aid-view").textContent,
    /Keep the essentials|Both faces are below|Draft only|Undo/,
  );
  h.close();
});

test("changing action choices resets the draft before commit without a redundant Undo button", () => {
  const h = harness();
  const { app, root, window, click } = h;
  const g = fixture();
  app.setGame(g);
  click(`[data-system="${g.systems[0].id}"][role="button"]`);
  click('[data-kind="produce"]');
  assert.equal(app.getGame().revision, g.revision);
  assert.equal(root.querySelector('[data-action="undo-draft"]'), null);
  click('[data-kind="move"]');
  assert.equal(app.getGame().revision, g.revision);
  click('[data-kind="produce"]');
  click('[data-action="commit-action"]');
  assert.equal(app.getGame().revision, g.revision + 1);
  assert.ok(app.getGame().players[0].used.includes("produce"));
  assert.equal(root.querySelector('[data-action="undo-draft"]'), null);
  assert.ok(window.localStorage.getItem("space-force.local-family.v1"));
  h.close();
});

test("hidden movement commits before orientation and restores its mandatory follow-up after reload", () => {
  const h = harness();
  const { app, root, click, input, window } = h;
  const g = fixture();
  const from = system(g, g.players[0].home);
  const target = g.systems.find((s) => !s.revealed && canMove(g, 0, from, s));
  g.systems.forEach((s) => (s.tokens = []));
  target.tokens = [0];
  app.setGame(g);
  click(`[data-system="${target.id}"][role="button"]`);
  assert.doesNotMatch(
    root.querySelector(".console").textContent,
    new RegExp(ART.systems[target.template].name),
  );
  click('[data-kind="move"]');
  assert.equal(root.querySelector('[data-number="source"]'), null);
  click('[data-action="commit-action"]');
  assert.equal(app.getGame().pending.kind, "orient");
  assert.match(
    root.querySelector(".console").textContent,
    /orientation preview/,
  );
  click('[data-action="commit-orientation"]');
  assert.equal(app.getGame().pending.kind, "move");
  input(`[data-number="source"][data-id="${from.id}"]`, "2");
  const saved = window.localStorage.getItem("space-force.local-family.v1");
  h.close();
  const resumed = harness({
    getItem: (key) => (key.endsWith("v1") ? saved : null),
    setItem() {},
  });
  resumed.click('[data-action="resume"]');
  assert.equal(resumed.app.getGame().pending.kind, "move");
  assert.equal(resumed.root.querySelector('[data-number="source"]').value, "0");
  resumed.input('[data-number="source"]', "2");
  resumed.click('[data-action="finish-move"]');
  assert.equal(resumed.app.getGame().pending, null);
  resumed.close();
});

test("shortcuts respect text fields, browser modifiers, modal focus, and the off switch", () => {
  const h = harness();
  const { app, root, window, click, key } = h;
  key('[data-name="0"]', "p");
  assert.equal(root.querySelector("#setup-form") !== null, true);
  app.setGame(setup());
  key(".main-panel", "p", { ctrlKey: true });
  assert.equal(app.getView(), "board");
  key(".main-panel", "p");
  assert.equal(app.getView(), "player_aid");
  assert.equal(window.document.activeElement.id, "tab-player_aid");
  click('[data-action="help"]');
  assert.ok(root.querySelector('[role="dialog"]'));
  assert.ok(window.document.activeElement.closest(".modal"));
  const check = root.querySelector('[data-check="shortcuts"]');
  check.checked = false;
  check.dispatchEvent(new window.Event("change", { bubbles: true }));
  key(".modal", "Escape");
  assert.equal(root.querySelector('[role="dialog"]'), null);
  key(".main-panel", "b");
  assert.equal(app.getView(), "player_aid");
  h.close();
});

test("map zoom/pan preserve the SVG and keyboard focus; touch gestures suppress accidental choices", () => {
  const h = harness();
  const { app, root, window, click, key, pointer } = h;
  app.setGame(setup());
  const svg = root.querySelector("#galaxy"),
    initial = svg.getAttribute("viewBox");
  const viewport = root.querySelector(".map-viewport");
  viewport.focus();
  key(".map-viewport", "+");
  assert.strictEqual(root.querySelector("#galaxy"), svg);
  assert.notEqual(svg.getAttribute("viewBox"), initial);
  assert.strictEqual(window.document.activeElement, viewport);
  key(".map-viewport", "ArrowRight");
  key(".map-viewport", "r");
  assert.equal(svg.getAttribute("viewBox"), initial);
  pointer(".map-viewport", "pointerdown", 50, 50);
  pointer(".map-viewport", "pointermove", 90, 60);
  pointer(".map-viewport", "pointerup", 90, 60);
  assert.strictEqual(root.querySelector("#galaxy"), svg);
  assert.notEqual(svg.getAttribute("viewBox"), initial);
  click('[data-system][role="button"]');
  assert.equal(root.querySelector('[data-action="place-chip"]'), null);
  h.close();
});

test("swiping the view tabs changes view without activating a game action", () => {
  const h = harness();
  h.app.setGame(setup());
  const revision = h.app.getGame().revision;
  h.pointer(".view-tabs", "pointerdown", 180, 10);
  h.pointer(".view-tabs", "pointerup", 80, 12);
  assert.equal(h.app.getView(), "techs");
  assert.equal(h.app.getGame().revision, revision);
  h.close();
});

test("blocked storage falls back to a session, invalid saves show a useful message, and names are escaped", () => {
  const h = harness({
    getItem() {
      throw Error("blocked");
    },
    setItem() {
      throw Error("blocked");
    },
  });
  h.app.setGame(createGame(2, 1, ["<img src=x onerror=alert(1)>", "x"]));
  assert.equal(h.root.querySelector("img[onerror]"), null);
  assert.match(
    h.root.querySelector(".game-footer").textContent,
    /Session only/,
  );
  h.close();
  const invalid = harness({ getItem: () => '{"schema":900}', setItem() {} });
  invalid.click('[data-action="resume"]');
  assert.match(
    invalid.root.querySelector('[role="alert"]').textContent,
    /could not be restored/,
  );
  assert.equal(invalid.app.getGame(), null);
  invalid.close();
});

test("contextual guide can be skipped and replayed from Help", () => {
  const h = harness();
  h.app.setGame(setup());
  assert.ok(h.root.querySelector(".guide"));
  h.click('[data-action="guide-off"]');
  assert.equal(h.root.querySelector(".guide"), null);
  h.click('[data-action="help"]');
  h.click('[data-action="guide-on"]');
  assert.ok(h.root.querySelector(".guide"));
  h.close();
});

test("resume opens pending Tech placements on the Board, and malformed view data recovers to setup", () => {
  let g = fixture();
  g.phase = "tech";
  g.players[0].reserve -= 3;
  g.players[0].credits = 3;
  g = applyCommand(g, 0, { type: "buy", tech: "tech.artificial-warp" });
  const h = harness({
    getItem: (key) => (key.endsWith("v1") ? JSON.stringify(g) : null),
    setItem() {},
  });
  h.click('[data-action="resume"]');
  assert.equal(h.app.getView(), "board");
  assert.ok(h.root.querySelector('[data-action="feature-option"]'));
  h.close();
  const corrupt = fixture();
  corrupt.phase = "tech";
  delete corrupt.market;
  const invalid = harness({
    getItem: (key) => (key.endsWith("v1") ? JSON.stringify(corrupt) : null),
    setItem() {},
  });
  invalid.click('[data-action="resume"]');
  assert.equal(invalid.app.getGame(), null);
  assert.ok(invalid.root.querySelector('[role="alert"]'));
  invalid.close();
});

test("game export downloads a versioned JSON record with setup, commands, and current state", async () => {
  const h = harness();
  h.app.setGame(setup());
  let blob, download;
  const originalCreate = URL.createObjectURL;
  URL.createObjectURL = (value) => {
    blob = value;
    return "blob:space-force-test";
  };
  h.window.HTMLAnchorElement.prototype.click = function () {
    download = this.download;
  };
  try {
    h.click('[data-action="export"]');
    const record = JSON.parse(await blob.text());
    assert.match(download, /^space-force-/);
    assert.equal(record.game.engine, "0.17.0");
    assert.equal(record.game.content, "ordered-techs-shortfall-review-5");
    assert.equal(record.game.commands.length, record.game.revision);
    assert.equal(record.game.seed, h.app.getGame().seed);
    assert.equal(record.game.phase, "plan");
  } finally {
    URL.createObjectURL = originalCreate;
    h.close();
  }
});

test("Tech, allocation, Explore, and final-score interfaces render real engine checkpoints", () => {
  const h = harness();
  let g = createGame(2, 3);
  const seen = new Set();
  for (let i = 0; i < 1000 && g.phase !== "finished"; i++) {
    g = applyCommand(g, g.turn, botCommand(g));
    if (
      ["investments", "tech", "reinforce"].includes(g.phase) &&
      !seen.has(g.phase)
    ) {
      h.app.setGame(g);
      assert.ok(
        h.root.querySelector(
          g.phase === "tech"
            ? '[data-action="pass-tech"]'
            : '[data-action="allocate"]',
        ),
      );
      seen.add(g.phase);
    }
    if (g.pending?.kind === "explore" && !seen.has("explore")) {
      h.app.setGame(g);
      h.click('[data-view="board"]');
      assert.ok(h.root.querySelector('[data-action="recipient"]'));
      seen.add("explore");
    }
  }
  assert.equal(g.phase, "finished");
  h.app.setGame(g);
  assert.equal(h.root.querySelectorAll(".score-table-wrap tbody tr").length, 2);
  assert.deepEqual([...seen].filter((s) => s !== "explore").sort(), [
    "investments",
    "reinforce",
    "tech",
  ]);
  h.close();
});
