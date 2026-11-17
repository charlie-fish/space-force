import test from "node:test";
import assert from "node:assert/strict";
import { harness } from "./ui-harness.mjs";
import {
  ART,
  CARD_MAP,
  CHAIN_TECHS,
  REMAINING_TECHS,
  canMove,
  credits,
  fixture,
  legalOrientations,
  settlement,
  setup,
  ships,
  step,
  system,
  tech,
} from "./helpers.mjs";

const tile = (id) => `#galaxy .system[data-system="${id}"]`;
function check(h, name, value) {
  const input = h.root.querySelector(`[data-check="${name}"]`);
  assert.ok(input);
  input.checked = value;
  input.dispatchEvent(new h.window.Event("change", { bubbles: true }));
}
function fullSystem(g, s, except) {
  for (const [i, p] of s.planets.entries()) {
    const n =
      p.capacity -
      p.owners.reduce((a, b) => a + b, 0) -
      (p.id === except ? 1 : 0);
    if (n > 0) settlement(g, s, i, 1, n);
  }
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
  g.systems.find((s) => s.id !== target.id).tokens = [1];
  return { g, from, target };
}

test("Status Box previews before, after and nested Tech effects before committing, and Investing clears the preview", () => {
  const h = harness(),
    g = fixture(),
    s = g.systems[0];
  for (const id of CHAIN_TECHS) tech(g, 0, id.slice(5));
  tech(g, 0, "mercenaries");
  tech(g, 0, "cloaking");
  h.app.setGame(g);
  h.click(tile(s.id));
  h.click('[data-kind="produce"]');
  const preview = h.root.querySelector("#status-box .tech-effect-preview");
  assert.ok(preview);
  for (const name of [
    "Population Explosion",
    "Spice",
    "Frontier Pioneer",
    "Government Incentives",
    "Rapid Advance",
    "Mercenaries",
  ])
    assert.ok(preview.textContent.includes(name));
  assert.match(preview.textContent, /After this action/);
  assert.match(preview.textContent, /Through free actions/);
  assert.equal(h.app.getGame(), g);
  assert.ok(
    [...h.root.querySelectorAll(".console *")].indexOf(preview) <
      [...h.root.querySelectorAll(".console *")].indexOf(
        h.root.querySelector('[data-action="commit-action"]'),
      ),
  );
  h.click('[data-kind="settle"]');
  assert.match(
    h.root.querySelector(".tech-effect-preview").textContent,
    /Before this action: Frontier Pioneer, Government Incentives/,
  );
  h.click('[data-kind="attack"]');
  check(h, "invest", false);
  assert.match(
    h.root.querySelector(".tech-effect-preview").textContent,
    /Before this action: Cloaking/,
  );
  check(h, "invest", true);
  assert.equal(h.root.querySelector(".tech-effect-preview"), null);
  h.close();
});

test("committed Reserve interrupts omit the intended-outcome question and have no Go back", () => {
  const h = harness();
  let g = fixture();
  tech(g, 0, "cloaking");
  credits(g, 0, g.players[0].reserve);
  g = step(g, { type: "resolve", action: "attack", system: g.systems[0].id });
  h.app.setGame(g);
  const modal = h.root.querySelector(".reserve-notice");
  assert.ok(modal);
  assert.doesNotMatch(
    modal.textContent,
    /Is this the outcome you intended|Is this what you intended/,
  );
  assert.equal(
    modal.querySelector('[data-action="cancel-confirmation"]'),
    null,
  );
  h.click('[data-action="acknowledge"]');
  assert.equal(h.app.getGame().pending.kind, "action");
  h.close();
});

test("finishing and resuming a game scrolls to Expedition results once while later view navigation remains usable", () => {
  const h = harness(),
    g = fixture(),
    scrolls = [];
  h.window.HTMLElement.prototype.scrollIntoView = function () {
    scrolls.push(this.id);
  };
  g.phase = "tech";
  g.finalEconomy = true;
  g.turn = 1;
  h.app.setGame(g);
  h.click('[data-action="pass-tech"]');
  assert.equal(h.app.getGame().phase, "finished");
  assert.deepEqual(scrolls, ["expedition-results"]);
  assert.equal(h.window.document.activeElement.id, "expedition-results");
  assert.ok(h.root.querySelector("#expedition-results table"));
  h.click('[data-view="techs"]');
  assert.equal(scrolls.filter((id) => id === "expedition-results").length, 1);
  h.click('[data-view="board"]');
  assert.equal(scrolls.filter((id) => id === "expedition-results").length, 1);
  const saved = h.window.localStorage.getItem("space-force.local-family.v1");
  const resumed = harness({
      getItem: (key) => (key === "space-force.local-family.v1" ? saved : null),
      setItem() {},
      removeItem() {},
    }),
    resumedScrolls = [];
  resumed.window.HTMLElement.prototype.scrollIntoView = function () {
    resumedScrolls.push(this.id);
  };
  resumed.click('[data-action="resume"]');
  assert.equal(resumed.app.getGame().phase, "finished");
  assert.deepEqual(resumedScrolls, ["expedition-results"]);
  resumed.close();
  h.close();
});

test("reducing an uncommitted normal allocation clears Soylent replacements that no longer qualify", () => {
  const h = harness(),
    g = fixture(),
    s = g.systems[0],
    last = s.planets.at(-1);
  tech(g, 0, "soylent-green");
  fullSystem(g, s, last.id);
  h.app.setGame(g);
  h.click(tile(s.id));
  h.click('[data-kind="settle"]');
  const normal = `[data-number="settlement"][data-planet="${last.id}"]`,
    replacement = `[data-number="replacement"][data-planet="${s.planets[1].id}"]`;
  h.input(normal, "1");
  h.input(replacement, "1");
  h.input(normal, "0");
  assert.equal(h.root.querySelector(replacement), null);
  h.input(normal, "1");
  assert.equal(h.root.querySelector(replacement).value, "0");
  h.click('[data-action="commit-action"]');
  assert.equal(h.app.getGame().players[1].credits, 0);
  assert.equal(system(h.app.getGame(), s.id).ships[0], 2);
  h.close();
});

test("full Events include Foresight normally; simpler Events still replace it", () => {
  const h = harness();
  assert.equal(
    h.root.querySelector('[data-setting="tech-preset"]').value,
    "remaining",
  );
  assert.equal(
    h.root.querySelector('[data-setting="event-mode"]').value,
    "full",
  );
  h.input('[data-setting="event-mode"]', "simpler");
  h.root
    .querySelector("#setup-form")
    .dispatchEvent(
      new h.window.Event("submit", { bubbles: true, cancelable: true }),
    );
  assert.equal(h.app.getGame().market.includes("tech.foresight"), false);
  assert.equal(h.app.getGame().config.events, "simpler");
  h.close();
  const testGame = harness();
  testGame.root
    .querySelector("#setup-form")
    .dispatchEvent(
      new testGame.window.Event("submit", { bubbles: true, cancelable: true }),
    );
  assert.deepEqual(testGame.app.getGame().market, REMAINING_TECHS);
  assert.equal(testGame.app.getGame().config.events, "full");
  testGame.close();
});

test("Gravity Drive controls cap passengers, choose casualties, and confirm the affected owners before movement", () => {
  const h = harness(),
    { g, from, target } = movement(1);
  tech(g, 0, "gravity-drive");
  ships(g, from, 1, 2);
  h.app.setGame(g);
  h.click(tile(target.id));
  h.click('[data-kind="move"]');
  h.input(`[data-number="source"][data-id="${from.id}"]`, "2");
  const passengers = `[data-number="carried"][data-origin="${from.id}"][data-id="1"]`;
  assert.equal(h.root.querySelector(passengers).max, "2");
  h.input(passengers, "1");
  assert.equal(
    h.root.querySelector('[data-number="passenger-loss"]').value,
    "1",
  );
  h.input('[data-number="passenger-loss"]', "0");
  h.click('[data-action="commit-action"]');
  assert.match(
    h.root.querySelector(".modal").textContent,
    /Gravity Drive casualties: 1 of your Ships and 0 carried opponent Ships/,
  );
  h.click('[data-action="cancel-confirmation"]');
  assert.equal(h.root.querySelector(passengers).value, "1");
  h.click('[data-action="commit-action"]');
  h.click('[data-action="confirm-command"]');
  assert.equal(system(h.app.getGame(), target.id).ships[0], 1);
  assert.equal(system(h.app.getGame(), target.id).ships[1], 1);
  assert.equal(h.app.getGame().players[0].credits, 1);
  h.close();
});

test("Death Sun target-first controls calculate mixed target costs and still warn about unnecessary sacrifices", () => {
  const h = harness(),
    g = fixture(),
    s = g.systems[0],
    p = s.planets[1];
  tech(g, 0, "death-sun");
  ships(g, s, 1, 2);
  settlement(g, s, 1, 1, 1);
  h.app.setGame(g);
  h.click(tile(s.id));
  h.click('[data-kind="attack"]');
  h.input('[data-number="target-ships"][data-id="1"]', "2");
  h.input(`[data-number="target-colony"][data-planet="${p.id}"]`, "1");
  assert.equal(h.root.querySelector('[data-number="sacrifice"]').value, "2");
  assert.match(h.root.querySelector(".attack-budget").textContent, /2 \/ 2/);
  h.input('[data-number="sacrifice"]', "3");
  h.click('[data-action="commit-action"]');
  assert.match(
    h.root.querySelector(".modal").textContent,
    /targets need only 2/,
  );
  h.click('[data-action="cancel-confirmation"]');
  h.input('[data-number="sacrifice"]', "2");
  h.click('[data-action="commit-action"]');
  assert.equal(system(h.app.getGame(), s.id).ships[1], 0);
  assert.equal(system(h.app.getGame(), s.id).planets[1].owners[1], 0);
  h.close();
});

test("Mercenaries conversion appears before Rapid Advance without an ordering choice", () => {
  const h = harness();
  let { g, from, target } = movement(2);
  tech(g, 0, "mercenaries");
  tech(g, 0, "rapid-advance");
  credits(g, 0, 3);
  g = step(g, {
    type: "resolve",
    action: "move",
    system: target.id,
    sources: { [from.id]: 2 },
  });
  h.app.setGame(g);
  assert.equal(h.root.querySelector('[data-action="order-after"]'), null);
  assert.equal(h.root.querySelector('[data-number="mercenaries"]').max, "3");
  h.input('[data-number="mercenaries"]', "3");
  h.click('[data-action="commit-mercenaries"]');
  assert.equal(h.app.getGame().pending.kind, "rapid");
  assert.equal(system(h.app.getGame(), target.id).ships[0], 3);
  h.click('[data-action="skip-rapid"]');
  assert.equal(h.app.getGame().context, null);
  h.close();
});

test("Soylent replacement controls appear once, use available Ships and commit without an empty-SETTLE warning", () => {
  const h = harness(),
    g = fixture(),
    s = g.systems[0],
    p = s.planets[0];
  tech(g, 0, "soylent-green");
  fullSystem(g, s);
  h.app.setGame(g);
  h.click(tile(s.id));
  h.click('[data-kind="settle"]');
  assert.equal(h.root.querySelectorAll(".soylent-controls").length, 1);
  h.input(
    `[data-number="replacement"][data-planet="${p.id}"][data-id="1"]`,
    "1",
  );
  h.click('[data-action="commit-action"]');
  assert.equal(h.root.querySelector(".modal"), null);
  assert.equal(h.app.getGame().players[1].credits, 1);
  assert.equal(system(h.app.getGame(), s.id).planets[0].owners[0], 4);
  h.close();
});

test("Soylent is available in Explore displacement controls after the last planet becomes full", () => {
  const h = harness(),
    g = fixture(),
    s = g.systems[0],
    p = s.planets.at(-1);
  tech(g, 0, "soylent-green");
  fullSystem(g, s, p.id);
  p.explore = "otherSettlement";
  h.app.setGame(g);
  h.click(tile(s.id));
  h.click('[data-kind="settle"]');
  h.input(`[data-number="settlement"][data-planet="${p.id}"]`, "1");
  h.click('[data-action="commit-action"]');
  h.click('[data-action="recipient"][data-recipient="1"]');
  assert.equal(h.app.getGame().pending.kind, "redistribute");
  h.input(
    `[data-number="replacement"][data-planet="${p.id}"][data-id="1"]`,
    "1",
  );
  assert.equal(
    h.root.querySelector('[data-number="redistribute-ships"]').value,
    "0",
  );
  h.click('[data-action="commit-redistribute"]');
  assert.equal(system(h.app.getGame(), s.id).planets.at(-1).owners[0], 1);
  assert.equal(h.app.getGame().players[1].credits, 1);
  h.close();
});

test("Filibuster exposes exact tokens and Insurance offers eligible Ship locations during a skipped turn", () => {
  const h = harness();
  let g = setup();
  tech(g, 0, "filibuster");
  const id = g.systems[0].id;
  while (!g.pending) g = step(g, { type: "plan", system: id });
  h.app.setGame(g);
  h.click(
    `[data-action="filibuster-option"][data-system-id="${id}"][data-index="0"]`,
  );
  h.click('[data-action="commit-filibuster"]');
  assert.equal(h.app.getGame().phase, "actions");
  assert.equal(system(h.app.getGame(), id).tokens.at(-1), 0);
  g = fixture();
  tech(g, 0, "insurance");
  g.systems.forEach((s) => (s.tokens = []));
  g.systems[1].tokens = [0, 1, 1];
  g.turn = 1;
  g = step(g, {
    type: "resolve",
    action: "move",
    system: g.systems[1].id,
    invest: true,
  });
  const home = system(g, g.players[0].home),
    before = home.ships[0];
  for (const p of home.planets) {
    g.players[0].reserve += p.owners[0];
    p.owners[0] = 0;
  }
  h.app.setGame(g);
  h.click(`[data-action="insurance-ship"][data-system-id="${home.id}"]`);
  assert.equal(system(h.app.getGame(), home.id).ships[0], before + 1);
  assert.equal(h.app.getGame().turn, 1);
  h.close();
});

test("Eminent Domain offers a free action before results and hides ACTIONS-only Banking", () => {
  const h = harness();
  let g = setup();
  tech(g, 0, "eminent-domain");
  tech(g, 0, "banking");
  g.phase = "tech";
  g.finalEconomy = true;
  g.turn = 1;
  g = step(g, { type: "buy", tech: null });
  h.app.setGame(g);
  assert.equal(h.root.querySelector("#expedition-results"), null);
  h.click('[data-action="use-eminent"]');
  assert.equal(h.app.getGame().pending.action, "settle");
  assert.equal(h.root.querySelector('[data-check="bank"]'), null);
  const home = system(h.app.getGame(), h.app.getGame().players[0].home);
  h.input(
    `[data-number="settlement"][data-planet="${home.planets[1].id}"]`,
    "1",
  );
  h.click('[data-action="commit-effect"]');
  assert.equal(h.app.getGame().phase, "finished");
  assert.ok(h.root.querySelector("#expedition-results table"));
  h.close();
});

test("Sabotage controls charge chosen Credit value with Research Lab and enforce the target price", () => {
  const h = harness(),
    g = setup(2, 9, {
      techPreset: "remaining",
      scenario: "standard",
      events: "foresight-test",
    });
  g.phase = "tech";
  tech(g, 0, "research-lab");
  tech(g, 1, "arcologies");
  credits(g, 0, 10);
  h.app.setGame(g);
  h.click('[data-view="techs"]');
  assert.ok(
    h.root.querySelector('[data-action="buy"][data-tech="tech.sabotage"]')
      .disabled,
  );
  h.click('[data-action="sabotage-target"][data-tech="tech.arcologies"]');
  assert.equal(
    h.root.querySelector('[data-number="sabotage-value"]').value,
    "5",
  );
  assert.match(
    h.root.querySelector('[data-action="buy"][data-tech="tech.sabotage"]')
      .textContent,
    /for 5 Credits/,
  );
  h.input('[data-number="sabotage-value"]', "4");
  assert.ok(
    h.root.querySelector('[data-action="buy"][data-tech="tech.sabotage"]')
      .disabled,
  );
  h.input('[data-number="sabotage-value"]', "5");
  h.click('[data-action="buy"][data-tech="tech.sabotage"]');
  assert.equal(h.app.getGame().players[0].credits, 5);
  assert.equal(
    h.app.getGame().players[1].techs.includes("tech.arcologies"),
    false,
  );
  h.close();
});

test("inline Flexible Economy preserves an action draft and Foresight stays private to the active owner", () => {
  const h = harness(),
    g = fixture(),
    s = g.systems[0];
  g.config.events = "foresight-test";
  tech(g, 0, "flexible-economy");
  tech(g, 0, "foresight");
  credits(g, 0, 4);
  h.app.setGame(g);
  h.click(tile(s.id));
  h.click('[data-kind="produce"]');
  assert.equal(h.root.querySelector('[data-action="ongoing-techs"]'), null);
  h.click('.status-box [data-action="return-credit"]');
  h.click('.status-box [data-action="return-credit"]');
  assert.equal(h.app.getGame().players[0].credits, 2);
  assert.equal(h.app.getGame().turn, 0);
  h.click('.status-box [data-action="show-peek"]');
  for (const id of g.events.slice(0, 2))
    assert.ok(
      h.root
        .querySelector(".foresight-cards")
        .textContent.includes(CARD_MAP[id].title),
    );
  for (const id of g.events.slice(0, 2))
    assert.equal(
      h.root.querySelector(".history").textContent.includes(CARD_MAP[id].title),
      false,
    );
  h.click('.status-box [data-action="hide-peek"]');
  assert.equal(h.root.querySelector(".foresight-cards"), null);
  assert.equal(
    h.root.querySelector('[data-kind="produce"]').getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(
    h.root.querySelector('[data-number="produce-ships"]').value,
    "1",
  );
  h.close();
});
