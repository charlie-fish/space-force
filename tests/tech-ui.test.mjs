import test from "node:test";
import assert from "node:assert/strict";
import { harness } from "./ui-harness.mjs";
import {
  CHAIN_TECHS,
  ART,
  CARD_MAP,
  credits,
  fixture,
  production,
  settlement,
  setup,
  ships,
  step,
  system,
  tech,
} from "./helpers.mjs";

const tile = (id) => `#galaxy .system[data-system="${id}"]`;
function check(h, name, checked) {
  const el = h.root.querySelector(`[data-check="${name}"]`);
  assert.ok(el);
  el.checked = checked;
  el.dispatchEvent(new h.window.Event("change", { bubbles: true }));
}
function submit(h) {
  h.root
    .querySelector("#setup-form")
    .dispatchEvent(
      new h.window.Event("submit", { bubbles: true, cancelable: true }),
    );
}
function confirm(h) {
  assert.ok(h.root.querySelector(".modal"));
  assert.equal(
    (
      h.root
        .querySelector(".modal")
        .textContent.match(/Is this what you intended\?/g) ?? []
    ).length,
    1,
  );
  assert.doesNotMatch(
    h.root.querySelector(".modal").textContent,
    /Is that what you intended/,
  );
  h.click('[data-action="confirm-command"]');
}

test("setup defaults to the last ten Techs, permits Family/mixed, and labels the optional five-Tech scenario", () => {
  const h = harness();
  assert.equal(
    h.root.querySelector('[data-setting="tech-preset"]').value,
    "remaining",
  );
  assert.match(
    h.root.querySelector('[data-check="chain-scenario"]').parentElement
      .textContent,
    /five Reserve markers.*designer scenario/,
  );
  h.input('[data-setting="tech-preset"]', "family");
  check(h, "chain-scenario", true);
  assert.equal(
    h.root.querySelector('[data-setting="tech-preset"]').value,
    "chains",
  );
  h.input('[data-setting="tech-preset"]', "mixed");
  submit(h);
  assert.deepEqual(h.app.getGame().config, {
    techPreset: "mixed",
    scenario: "five-tech-chain",
    events: "full",
    eventBatch: "batch-1",
  });
  assert.deepEqual(h.app.getGame().players[0].techs, CHAIN_TECHS);
  assert.equal(h.app.getGame().players[0].reserve, 35);
  h.close();
  const family = harness();
  check(family, "chain-scenario", true);
  family.input('[data-setting="tech-preset"]', "family");
  assert.equal(
    family.root.querySelector('[data-check="chain-scenario"]').checked,
    false,
  );
  submit(family);
  assert.deepEqual(family.app.getGame().config, {
    techPreset: "family",
    scenario: "standard",
    events: "full",
    eventBatch: "batch-1",
  });
  family.close();
});

test("Disruptor-blocked PLAN systems remain inspectable but cannot place by button or double-click", () => {
  const h = harness(),
    g = setup(),
    s = g.systems[0];
  g.disruptions.push({ owner: 1, system: s.id, round: g.round });
  h.app.setGame(g);
  assert.equal(
    h.root.querySelector(".console h2").textContent,
    "Place your next action token",
  );
  h.click(tile(s.id));
  assert.match(
    h.root.querySelector("#system-status").textContent,
    /Disruptor blocks your placement here this round/,
  );
  assert.ok(h.root.querySelector('[data-action="place-chip"]').disabled);
  assert.ok(
    h.root
      .querySelector("#system-status")
      .textContent.includes(ART.systems[s.template].name),
  );
  h.click(tile(s.id));
  h.click('[data-action="place-chip"]');
  assert.equal(h.app.getGame(), g);
  assert.equal(h.root.querySelector(".plan-preview"), null);
  h.click(tile(g.systems.find((other) => other.id !== s.id).id));
  assert.equal(
    h.root.querySelector('[data-action="place-chip"]').disabled,
    false,
  );
  h.close();
});

test("production defaults to maximum Ships, and the requested score, Investment and confirmation wording is present", () => {
  const h = harness(),
    g = fixture(),
    s = g.systems[0];
  h.app.setGame(g);
  h.click(tile(s.id));
  h.click('[data-kind="produce"]');
  const total = Math.min(g.players[0].reserve, production(g, s));
  assert.equal(
    h.root.querySelector('[data-number="produce-ships"]').value,
    String(total),
  );
  assert.equal(
    h.root.querySelector('[data-number="produce-credits"]').value,
    "0",
  );
  h.click('[data-action="commit-action"]');
  assert.equal(system(h.app.getGame(), s.id).ships[0], s.ships[0] + total);
  h.click('[data-view="actions"]');
  assert.match(
    h.root.querySelector(".score-preview").textContent,
    /patrolled systems/,
  );
  assert.doesNotMatch(
    h.root.querySelector(".score-preview").textContent,
    /ship systems/,
  );
  const allocation = fixture();
  allocation.phase = "investments";
  allocation.players[0].reserve--;
  allocation.players[0].invested = 1;
  h.app.setGame(allocation);
  assert.match(
    h.root.querySelector(".status-decision").textContent,
    /Choose Credits or Ships \(anywhere you have a Settlement\)\. Clicking a legal system on the board adds one Ship there\./,
  );
  h.close();
});

test("the complete R01 chain is playable through free MOVE, Rapid conversion, SETTLE and recomputed PRODUCE controls", () => {
  const h = harness(),
    g = fixture(),
    s = g.systems[0];
  for (const t of CHAIN_TECHS) tech(g, 0, t.slice(5));
  h.app.setGame(g);
  h.click(tile(s.id));
  h.click('[data-kind="produce"]');
  h.click('[data-action="commit-action"]');
  assert.equal(h.app.getGame().pending.action, "move");
  assert.match(
    h.root.querySelector(".status-decision").textContent,
    /Free Move into/,
  );
  h.click('[data-action="commit-effect"]');
  confirm(h);
  assert.equal(h.app.getGame().pending.kind, "rapid");
  h.click(`.feature-options [data-planet="${s.planets[0].id}"]`);
  h.click('[data-action="commit-rapid"]');
  assert.equal(h.app.getGame().pending.action, "settle");
  h.input(`[data-number="settlement"][data-planet="${s.planets[0].id}"]`, "2");
  h.input(`[data-number="settlement"][data-planet="${s.planets[1].id}"]`, "2");
  h.click('[data-action="commit-effect"]');
  assert.equal(h.app.getGame().pending.action, "produce");
  assert.equal(
    h.root.querySelector('[data-number="produce-ships"]').value,
    "3",
  );
  // Inspecting another system must not retarget a committed free action's controls.
  h.click(tile(g.systems[1].id));
  h.input('[data-number="produce-ships"]', "2");
  assert.equal(
    h.root.querySelector('[data-number="produce-credits"]').value,
    "1",
  );
  h.input('[data-number="produce-ships"]', "3");
  h.click('[data-action="commit-effect"]');
  h.click('[data-action="commit-effect"]');
  confirm(h);
  h.click('[data-action="skip-rapid"]');
  h.input(`[data-number="settlement"][data-planet="${s.planets[2].id}"]`, "3");
  h.click('[data-action="commit-effect"]');
  assert.equal(h.app.getGame().context, null);
  assert.deepEqual(h.app.getGame().players[0].used, ["produce"]);
  assert.equal(h.app.getGame().turn, 1);
  assert.equal(
    h.app.getGame().log.filter((l) => l.text.startsWith("Frontier Pioneer:"))
      .length,
    2,
  );
  h.close();
});

test("a saved free-action checkpoint restores its controls and committed parent", () => {
  let g = fixture();
  for (const t of CHAIN_TECHS) tech(g, 0, t.slice(5));
  g = step(g, { type: "resolve", system: g.systems[0].id, action: "produce" });
  const h = harness();
  h.window.localStorage.setItem(
    "space-force.local-family.v1",
    JSON.stringify(g),
  );
  // The landing's availability is captured at mount; use a fresh mount with the same storage.
  const storage = h.window.localStorage;
  const resumed = harness(storage);
  resumed.click('[data-action="resume"]');
  assert.equal(resumed.app.getGame().pending.action, "move");
  assert.ok(resumed.root.querySelector('[data-action="commit-effect"]'));
  assert.equal(resumed.app.getGame().context.parent.parent.kind, "produce");
  resumed.click('[data-action="commit-effect"]');
  confirm(resumed);
  assert.equal(resumed.app.getGame().pending.kind, "rapid");
  resumed.close();
  h.close();
});

test("Cloaking quantities appear after the bonus Ship; Strategic Stall exposes one pass per round", () => {
  const h = harness(),
    g = fixture(),
    s = g.systems[0];
  tech(g, 0, "cloaking");
  ships(g, s, 1, 2);
  h.app.setGame(g);
  h.click(tile(s.id));
  h.click('[data-kind="attack"]');
  assert.match(
    h.root.querySelector(".console").textContent,
    /Before this action: Cloaking/,
  );
  assert.equal(h.root.querySelector('[data-number="sacrifice"]'), null);
  h.click('[data-action="commit-action"]');
  assert.equal(h.root.querySelector('[data-number="sacrifice"]').max, "4");
  const plan = setup();
  tech(plan, 0, "strategic-stall");
  h.app.setGame(plan);
  h.click('[data-action="plan-pass"]');
  assert.equal(h.app.getGame().players[0].unplaced, 4);
  assert.equal(h.app.getGame().turn, 1);
  h.close();
});

test("Research Lab offers discounted and full-price buttons with the correct affordability", () => {
  const h = harness(),
    g = setup(2, 7, { techPreset: "chains", scenario: "standard" });
  g.phase = "tech";
  tech(g, 0, "research-lab");
  credits(g, 0, 10);
  h.app.setGame(g);
  h.click('[data-view="techs"]');
  const id = "tech.arcologies",
    cost = CARD_MAP[id].cost;
  assert.match(
    h.root.querySelector(`[data-tech-id="${id}"] .primary`).textContent,
    new RegExp(`Buy for ${Math.floor(cost / 2)} Credits · Research Lab`),
  );
  h.click(`[data-tech-id="${id}"] [data-full-price="true"]`);
  assert.equal(h.app.getGame().players[0].credits, 10 - cost);
  h.close();
});

test("Arcologies draws the extra Settlement at a distinct snap point without shifting existing markers", () => {
  const h = harness(),
    g = fixture(),
    s = g.systems[0],
    p = s.planets[1];
  tech(g, 0, "arcologies");
  settlement(g, s, 1, 0, p.capacity);
  h.app.setGame(g);
  const before = [
    ...h.root.querySelectorAll(
      `${tile(s.id)} [data-planet="${p.id}"] .settlement-piece`,
    ),
  ].map((el) => el.getAttribute("transform"));
  const next = step(g, {
    type: "resolve",
    system: s.id,
    action: "settle",
    settlements: { [p.id]: 1 },
  });
  h.app.setGame(next);
  const after = [
    ...h.root.querySelectorAll(
      `${tile(s.id)} [data-planet="${p.id}"] .settlement-piece`,
    ),
  ].map((el) => el.getAttribute("transform"));
  assert.equal(after.length, p.capacity + 1);
  assert.deepEqual(after.slice(0, before.length), before);
  assert.equal(new Set(after).size, after.length);
  h.close();
});

test("Patrol target controls unlock after all defending Ships are targeted and clear illegal targets when that changes", () => {
  const h = harness(),
    g = fixture(),
    s = g.systems[0],
    p = s.planets[1];
  tech(g, 1, "patrol");
  ships(g, s, 1, 2);
  settlement(g, s, 1, 1, 1);
  h.app.setGame(g);
  h.click(tile(s.id));
  h.click('[data-kind="attack"]');
  const target = `[data-number="target-colony"][data-planet="${p.id}"]`;
  assert.equal(h.root.querySelector(target).max, "0");
  assert.match(
    h.root.querySelector(".attack-planets").textContent,
    /Patrol: target all their Ships first/,
  );
  h.input('[data-number="target-ships"][data-id="1"]', "2");
  assert.equal(h.root.querySelector(target).max, "1");
  h.input(target, "1");
  assert.equal(h.root.querySelector('[data-number="sacrifice"]').value, "2");
  h.input('[data-number="target-ships"][data-id="1"]', "1");
  assert.equal(h.root.querySelector(target).value, "0");
  assert.equal(h.root.querySelector(target).max, "0");
  h.close();
});
