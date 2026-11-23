import test from "node:test";
import assert from "node:assert/strict";
import { harness } from "./ui-harness.mjs";
import {
  ART,
  applyCommand,
  assertInvariants,
  canMove,
  credits,
  fixture,
  legalOrientations,
  setup,
  system,
} from "./helpers.mjs";

const tile = (id) => `#galaxy .system[data-system="${id}"]`;
function invest(h, value) {
  const input = h.root.querySelector('[data-check="invest"]');
  input.checked = value;
  input.dispatchEvent(new h.window.Event("change", { bubbles: true }));
}
function movement(holes = 0) {
  const g = fixture(),
    from = g.systems[0],
    target = g.systems.find((s) => !s.revealed && canMove(g, 0, from, s));
  target.rotation = legalOrientations(g, target.id, { [from.id]: 1 })[0];
  target.revealed = true;
  target.extraHoles = holes;
  g.systems.forEach((s) => (s.tokens = []));
  target.tokens = [0];
  g.systems[1].tokens = [1];
  return { g, from, target };
}
for (const action of ["move", "settle", "attack"])
  test(`empty ${action} confirms before consuming the chip, and Go back preserves the draft`, () => {
    const h = harness(),
      g = fixture(),
      s = g.systems[0];
    h.app.setGame(g);
    h.click(tile(s.id));
    h.click(`[data-kind="${action}"]`);
    invest(h, false);
    h.click('[data-action="commit-action"]');
    assert.ok(h.root.querySelector(".modal"));
    assert.equal(h.app.getGame(), g);
    assert.equal(h.app.getGame().revision, g.revision);
    assert.equal(
      h.root.querySelector(".modal button").dataset.action,
      "cancel-confirmation",
    );
    h.click('[data-action="cancel-confirmation"]');
    assert.equal(h.app.getGame(), g);
    assert.equal(
      h.root
        .querySelector(`[data-kind="${action}"]`)
        .getAttribute("aria-pressed"),
      "true",
    );
    h.click('[data-action="commit-action"]');
    h.click('[data-action="confirm-command"]');
    const after = h.app.getGame();
    assert.ok(after.players[0].used.includes(action));
    assert.deepEqual(
      after.systems.map((s) => s.ships),
      g.systems.map((s) => s.ships),
    );
    assert.deepEqual(
      after.systems.map((s) => s.planets.map((p) => p.owners)),
      g.systems.map((s) => s.planets.map((p) => p.owners)),
    );
    assert.equal(after.turn, 1);
    assertInvariants(after);
    h.close();
  });

test("Investing an empty action does not ask for an empty-action confirmation", () => {
  for (const action of ["move", "settle", "attack"]) {
    const h = harness(),
      g = fixture();
    h.app.setGame(g);
    h.click(tile(g.systems[0].id));
    h.click(`[data-kind="${action}"]`);
    invest(h, true);
    h.click('[data-action="commit-action"]');
    assert.equal(h.root.querySelector(".modal"), null);
    assert.equal(h.app.getGame().players[0].invested, 1);
    h.close();
  }
});

test("arrival loss confirms the exact number before moving or spending any Ships", () => {
  const h = harness(),
    { g, from, target } = movement(2);
  h.app.setGame(g);
  h.click(tile(target.id));
  h.click('[data-kind="move"]');
  h.input(`[data-number="source"][data-id="${from.id}"]`, "1");
  h.click('[data-action="commit-action"]');
  assert.match(h.root.querySelector(".modal").textContent, /2 black holes/);
  assert.match(
    h.root.querySelector(".modal").textContent,
    /1 incoming Ship will be destroyed/,
  );
  assert.equal(h.app.getGame(), g);
  h.click('[data-action="cancel-confirmation"]');
  assert.equal(h.root.querySelector('[data-number="source"]').value, "1");
  h.input('[data-number="source"]', "2");
  h.click('[data-action="commit-action"]');
  assert.match(
    h.root.querySelector(".modal").textContent,
    /2 incoming Ships will be destroyed/,
  );
  h.click('[data-action="confirm-command"]');
  const after = h.app.getGame();
  assert.equal(system(after, from.id).ships[0], 1);
  assert.equal(system(after, target.id).ships[0], 0);
  assert.equal(after.players[0].credits, g.players[0].credits + 2);
  assert.equal(after.turn, 1);
  assertInvariants(after);
  h.close();
});

test("black holes in the departure system do not trigger the arrival warning", () => {
  const h = harness(),
    { g, from, target } = movement();
  assert.ok(ART.systems[from.template].fixedBlackHoles.length);
  h.app.setGame(g);
  h.click(tile(target.id));
  h.click('[data-kind="move"]');
  h.input('[data-number="source"]', "2");
  h.click('[data-action="commit-action"]');
  assert.equal(h.root.querySelector(".modal"), null);
  assert.equal(system(h.app.getGame(), target.id).ships[0], 2);
  assert.equal(h.app.getGame().players[0].credits, g.players[0].credits);
  h.close();
});

test("exploration reveals and orients before quantities, then confirms black-hole entry without reopening the reveal", () => {
  let g, from, target;
  for (let seed = 1; seed < 50; seed++) {
    g = setup(2, seed);
    from = system(g, g.players[0].home);
    target = g.systems.find(
      (s) =>
        !s.revealed &&
        ART.systems[s.template].fixedBlackHoles.length &&
        canMove(g, 0, from, s),
    );
    if (target) break;
  }
  assert.ok(target);
  g.phase = "actions";
  g.turn = 0;
  g.players.forEach((p) => (p.unplaced = 0));
  g.systems.forEach((s) => (s.tokens = []));
  target.tokens = [0];
  g.systems.find((s) => s.id !== target.id).tokens = [1];
  const h = harness();
  h.app.setGame(g);
  h.click(tile(target.id));
  h.click('[data-kind="move"]');
  assert.equal(h.root.querySelector('[data-number="source"]'), null);
  h.click('[data-action="commit-action"]');
  assert.equal(h.root.querySelector(".modal"), null);
  assert.equal(h.app.getGame().pending.kind, "orient");
  h.click('[data-action="commit-orientation"]');
  h.input(`[data-number="source"][data-id="${from.id}"]`, "1");
  const revision = h.app.getGame().revision;
  h.click('[data-action="finish-move"]');
  assert.match(h.root.querySelector(".modal").textContent, /will be destroyed/);
  assert.equal(h.app.getGame().revision, revision);
  h.click('[data-action="cancel-confirmation"]');
  assert.equal(system(h.app.getGame(), target.id).revealed, true);
  assert.equal(h.app.getGame().pending.kind, "move");
  assert.equal(h.app.getGame().revision, revision);
  h.click('[data-action="finish-move"]');
  h.click('[data-action="confirm-command"]');
  assert.equal(h.app.getGame().pending, null);
  assertInvariants(h.app.getGame());
  h.close();
});

test("empty Reserve investment is checked before commitment and needs no extra Status Box acknowledgement", () => {
  const h = harness(),
    g = fixture();
  credits(g, 0, g.players[0].reserve);
  h.app.setGame(g);
  h.click(tile(g.systems[0].id));
  h.click('[data-kind="move"]');
  invest(h, true);
  h.click('[data-action="commit-action"]');
  assert.equal(h.root.querySelector(".modal h2").textContent, "Reserve empty");
  assert.equal(h.app.getGame(), g);
  assert.equal(
    h.root.querySelector('#status-box [data-action="acknowledge"]'),
    null,
  );
  h.click('[data-action="cancel-confirmation"]');
  assert.equal(h.app.getGame(), g);
  h.click('[data-action="commit-action"]');
  h.click('[data-action="confirm-command"]');
  assert.equal(h.app.getGame().turn, 1);
  assert.equal(h.app.getGame().pending, null);
  assert.equal(h.root.querySelector(".modal"), null);
  assertInvariants(h.app.getGame());
  h.close();
});

test("saved committed Reserve notices resume as mandatory focused pop-ups, with background controls blocked", () => {
  let g = fixture();
  credits(g, 0, g.players[0].reserve);
  g = applyCommand(g, 0, {
    type: "resolve",
    system: g.systems[0].id,
    action: "move",
    invest: true,
  });
  const h = harness({
    getItem: (key) => (key.endsWith("v1") ? JSON.stringify(g) : null),
    setItem() {},
  });
  h.click('[data-action="resume"]');
  assert.equal(h.root.querySelector(".modal h2").textContent, "Reserve empty");
  assert.equal(h.root.querySelector("#status-box .outcome-notice"), null);
  assert.ok(h.window.document.activeElement.closest(".modal"));
  const before = h.app.getGame().revision;
  h.click('[data-view="techs"]');
  h.key("#tab-techs", "t");
  assert.equal(h.app.getView(), "board");
  h.key(".modal button", "Escape");
  assert.ok(h.root.querySelector(".modal"));
  assert.equal(h.app.getGame().revision, before);
  h.key(".modal button", "Tab", { shiftKey: true });
  assert.ok(h.window.document.activeElement.closest(".modal"));
  h.click('[data-action="acknowledge"]');
  assert.equal(h.app.getGame().turn, 1);
  assert.equal(h.root.querySelector(".modal"), null);
  h.close();
});

test("a Reserve-short Explore result cannot be previewed and cancelled before its hidden token commits", () => {
  const h = harness(),
    g = fixture(),
    s = g.systems[0],
    p = s.planets.find((p) => !p.home);
  p.explore = "credit3";
  credits(g, 0, g.players[0].reserve);
  h.app.setGame(g);
  h.click(tile(s.id));
  h.click('[data-kind="settle"]');
  h.input(`[data-number="settlement"][data-planet="${p.id}"]`, "1");
  h.click('[data-action="commit-action"]');
  assert.equal(h.app.getGame().revision, g.revision + 1);
  assert.equal(h.app.getGame().pending.title, "Explore result");
  assert.equal(
    h.root.querySelector('[data-action="cancel-confirmation"]'),
    null,
  );
  assert.equal(
    system(h.app.getGame(), s.id).planets.find((x) => x.id === p.id).explore,
    null,
  );
  assertInvariants(h.app.getGame());
  h.close();
});

test("a confirmation is rejected when a replacement game state arrives, preserving the new position", () => {
  const h = harness(),
    g = fixture();
  h.app.setGame(g);
  h.click(tile(g.systems[0].id));
  h.click('[data-kind="settle"]');
  h.click('[data-action="commit-action"]');
  assert.ok(h.root.querySelector(".modal"));
  const replacement = structuredClone(g);
  h.app.setGame(replacement);
  h.click('[data-action="confirm-command"]');
  assert.equal(h.app.getGame(), replacement);
  assert.match(
    h.root.querySelector('[role="alert"]').textContent,
    /game changed/,
  );
  assert.equal(replacement.players[0].used.length, 0);
  h.close();
});

test("Players and supply always follows the current first-player order, independently of the acting player", () => {
  const h = harness(),
    g = setup(4);
  g.turn = 1;
  for (const first of [0, 2, 3]) {
    g.first = first;
    h.app.setGame(g);
    assert.deepEqual(
      [...h.root.querySelectorAll(".player-roster > ul > li")].map((li) =>
        Number(li.dataset.player),
      ),
      Array.from({ length: 4 }, (_, i) => (first + i) % 4),
    );
  }
  h.close();
});
