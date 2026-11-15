import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { mountApp } from "../work/compiled/ui.js";
import {
  ART,
  applyCommand,
  botCommand,
  canMove,
  createGame,
  fixture,
  setup,
  system,
} from "./helpers.mjs";

function harness(storage) {
  const dom = new JSDOM(
    '<!doctype html><html><body><div id="app"></div></body></html>',
    { url: "https://space-force.test/" },
  );
  const { window } = dom;
  const root = window.document.querySelector("#app");
  const app = mountApp(root, storage ?? window.localStorage);
  const click = (selector) => {
    const el = root.querySelector(selector);
    assert.ok(el, `Missing control: ${selector}`);
    el.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  };
  const key = (selector, value, extra = {}) => {
    const el = root.querySelector(selector);
    assert.ok(el);
    el.dispatchEvent(
      new window.KeyboardEvent("keydown", {
        key: value,
        bubbles: true,
        cancelable: true,
        ...extra,
      }),
    );
  };
  const input = (selector, value, event = "change") => {
    const el = root.querySelector(selector);
    assert.ok(el);
    el.value = value;
    el.dispatchEvent(new window.Event(event, { bubbles: true }));
  };
  const pointer = (selector, type, x, y, id = 1) => {
    const event = new window.MouseEvent(type, {
      clientX: x,
      clientY: y,
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperties(event, {
      pointerType: { value: "touch" },
      pointerId: { value: id },
    });
    root.querySelector(selector).dispatchEvent(event);
  };
  return {
    app,
    root,
    window,
    click,
    key,
    input,
    pointer,
    close: () => {
      app.destroy();
      window.close();
    },
  };
}

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
    root.querySelector(".header-player").textContent,
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
  h.close();
});

test("draft Undo resets choices without changing state; commit consumes a slot and cannot be undone", () => {
  const h = harness();
  const { app, root, window, click } = h;
  const g = fixture();
  app.setGame(g);
  click(`[data-system="${g.systems[0].id}"][role="button"]`);
  click('[data-kind="produce"]');
  assert.equal(app.getGame().revision, g.revision);
  click('[data-action="undo-draft"]');
  assert.equal(root.querySelector('[data-action="commit-action"]'), null);
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
  input(`[data-number="source"][data-id="${from.id}"]`, "2");
  click('[data-action="commit-action"]');
  assert.equal(app.getGame().pending.kind, "orient");
  assert.match(root.querySelector(".console").textContent, /Undo locked/);
  click('[data-action="orient"]');
  assert.equal(app.getGame().pending.kind, "move");
  const saved = window.localStorage.getItem("space-force.local-family.v1");
  h.close();
  const resumed = harness({
    getItem: (key) => (key.endsWith("v1") ? saved : null),
    setItem() {},
  });
  resumed.click('[data-action="resume"]');
  assert.equal(resumed.app.getGame().pending.kind, "move");
  assert.equal(resumed.root.querySelector('[data-number="source"]').value, "2");
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
  assert.ok(h.root.querySelector('[data-action="feature"]'));
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
    assert.equal(record.game.engine, "0.8.0");
    assert.equal(record.game.content, "family-simple-events-1");
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
      h.click('[data-action="decision"]');
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
