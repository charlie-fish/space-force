import test from "node:test";
import assert from "node:assert/strict";
import { harness } from "./ui-harness.mjs";
import {
  setup,
  step,
  botCommand,
  credits,
  ships,
  settlement,
  tech,
  system,
  canPlan,
  player,
  production,
  featureOptions,
  CARD_MAP,
} from "./helpers.mjs";
import { CARDS } from "../work/compiled/content.js";
import { restoreGame } from "../work/compiled/persistence.js";
import { replayGame } from "../work/compiled/engine.js";
import legacy from "./fixtures/v0.20-vorsprung-checkpoint.json" with { type: "json" };
const config = {
  techPreset: "remaining",
  scenario: "standard",
  events: "full",
};
const oneOff = [
  "all-your-base",
  "capital-injection",
  "communist-decree",
  "consolidation",
  "famine",
  "galactic-summit",
  "hive-mind",
  "migration",
  "multicultural-tension",
  "politics",
  "prophecy",
  "ragnarok",
  "stealth-invasion",
  "technological-singularity",
  "turtling",
  "vorsprung",
].map((id) => `event.${id}`);
function effect(name, settings = config) {
  let g = setup(3, 7, settings);
  g.phase = "event";
  g.turn = 0;
  g.pending = { kind: "eventSelect" };
  g.auction = { bids: [0, 0, 0], winner: 0, paid: 0 };
  g.revealedEvents = [
    `event.${name}`,
    name === "alliance" ? "event.capital-injection" : "event.alliance",
  ];
  if (name === "ragnarok") g.events = [];
  return step(g, { type: "selectEvent", event: `event.${name}` });
}
function action(event, count = 3) {
  const g = setup(count, 7, config);
  g.phase = "actions";
  g.turn = 0;
  g.players.forEach((p) => (p.unplaced = 0));
  g.systems[0].tokens = [0];
  g.systems[1].tokens = [1];
  g.activeEvent = { id: `event.${event}`, owner: 0, round: 1 };
  return g;
}
const tile = (id) => `#galaxy .system[data-system="${id}"]`;
const summary = (h) => h.root.querySelector(".active-event-summary");
function check(h, key, value) {
  const el = h.root.querySelector(`[data-check="${key}"]`);
  assert.ok(el);
  el.checked = value;
  el.dispatchEvent(new h.window.Event("change", { bubbles: true }));
}
function physicalClick(h, selector, detail = 1, x = 100, y = 300) {
  const el = h.root.querySelector(selector);
  assert.ok(el, selector);
  el.dispatchEvent(
    new h.window.MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      detail,
      clientX: x,
      clientY: y,
    }),
  );
}

test("all sixteen one-off Event summaries say Effect complete only after their full resolution", () => {
  for (const id of oneOff) {
    const h = harness();
    let g = effect(id.slice(6));
    h.app.setGame(g);
    if (g.eventFlow)
      assert.ok(!summary(h).textContent.includes("Effect complete"), id);
    for (let n = 0; n < 120 && g.phase === "event"; n++)
      g = step(g, botCommand(g));
    assert.equal(g.phase, "tech", id);
    h.app.setGame(g);
    assert.match(summary(h).textContent, /Effect complete/, id);
    assert.ok(summary(h).textContent.includes(CARD_MAP[id].title), id);
    assert.ok(!summary(h).textContent.includes(CARD_MAP[id].text), id);
    assert.equal(summary(h).querySelector(".event-selector"), null);
    h.close();
  }
});

test("all fourteen ongoing Event summaries retain their rules and identify the selector across views", () => {
  for (const card of CARDS.filter(
    (c) => c.type === "event" && !oneOff.includes(c.id),
  )) {
    const h = harness(),
      g = action(card.id.slice(6));
    g.activeEvent.owner = 1;
    g.players[1].name = "Alex <crew>";
    h.app.setGame(g);
    assert.ok(summary(h).textContent.includes(card.text));
    assert.ok(summary(h).textContent.includes("Selected by Alex <crew>."));
    assert.equal(summary(h).querySelector("crew"), null);
    h.click('[data-view="actions"]');
    assert.ok(summary(h).textContent.includes("Selected by Alex <crew>."));
    h.close();
  }
});

test("Vorsprung offers expensive Techs first and selection can change before a separate commit", () => {
  const h = harness(),
    g = effect("vorsprung");
  h.app.setGame(g);
  const options = [
    ...h.root.querySelectorAll('#status-box [data-action="select-event-tech"]'),
  ];
  const costs = options.map((el) => Number(CARD_MAP[el.dataset.tech].cost));
  assert.deepEqual(
    costs,
    costs.slice().sort((a, b) => b - a),
  );
  assert.equal(
    h.root.querySelector('[data-action="commit-vorsprung"]').disabled,
    true,
  );
  const first = options[0].dataset.tech,
    second = options.at(-1).dataset.tech;
  h.click(
    `#status-box [data-action="select-event-tech"][data-tech="${first}"]`,
  );
  assert.equal(h.app.getGame(), g);
  h.click(
    `#status-box [data-action="select-event-tech"][data-tech="${second}"]`,
  );
  assert.equal(h.app.getGame(), g);
  assert.equal(
    h.root
      .querySelector(`#status-box [data-tech="${second}"]`)
      .getAttribute("aria-pressed"),
    "true",
  );
  h.click('[data-action="commit-vorsprung"]');
  assert.ok(h.app.getGame().players[0].techs.includes(second));
  assert.equal(h.app.getGame().revision, g.revision + 1);
  h.close();
});

test("Vorsprung card clicks select through the whole Tech card and require a commit without opening a modal", () => {
  const h = harness(),
    g = effect("vorsprung");
  h.app.setGame(g);
  h.click('[data-view="techs"]');
  h.click('.tech-card[data-tech-id="tech.foresight"] .tech-title h3');
  assert.equal(h.app.getGame(), g);
  assert.equal(h.root.querySelector(".modal"), null);
  assert.equal(h.window.document.activeElement.dataset.tech, "tech.foresight");
  assert.ok(
    h.root.querySelector(
      '.tech-card[data-tech-id="tech.foresight"].event-tech-selected',
    ),
  );
  assert.equal(
    h.root
      .querySelector('#status-box [data-tech="tech.foresight"]')
      .getAttribute("aria-pressed"),
    "true",
  );
  h.click('#game-panel [data-action="commit-vorsprung"]');
  assert.ok(h.app.getGame().players[0].techs.includes("tech.foresight"));
  h.close();
});

test("Vorsprung double-click selects and commits once across rerenders, while view changes cancel a partial double-click", () => {
  const h = harness(),
    g = effect("vorsprung");
  h.app.setGame(g);
  h.click('[data-view="techs"]');
  const card = '.tech-card[data-tech-id="tech.foresight"] .card-art-button';
  physicalClick(h, card);
  assert.equal(h.app.getGame(), g);
  h.click('[data-view="event"]');
  h.click('[data-view="techs"]');
  physicalClick(h, card, 2);
  assert.equal(h.app.getGame(), g);
  physicalClick(h, card, 1, 101, 301);
  assert.equal(h.app.getGame().revision, g.revision + 1);
  assert.ok(h.app.getGame().players[0].techs.includes("tech.foresight"));
  const after = h.app.getGame();
  h.root
    .querySelector(card)
    .dispatchEvent(
      new h.window.MouseEvent("dblclick", { bubbles: true, cancelable: true }),
    );
  assert.equal(h.app.getGame(), after);
  h.close();
  const native = harness();
  native.app.setGame(effect("vorsprung"));
  native.click('[data-view="techs"]');
  native.root.querySelector(card).dispatchEvent(
    new native.window.MouseEvent("dblclick", {
      bubbles: true,
      cancelable: true,
    }),
  );
  assert.ok(native.app.getGame().players[0].techs.includes("tech.foresight"));
  native.close();
});

test("Vorsprung remains unresolved through acquisition choices, and an unavailable Tech cannot be claimed", () => {
  const h = harness(),
    g = effect("vorsprung", { ...config, techPreset: "family" });
  h.app.setGame(g);
  h.click('[data-view="techs"]');
  assert.equal(
    h.root.querySelector('.tech-card[data-tech-id="tech.banking"]').dataset
      .action,
    undefined,
  );
  h.click('.tech-card[data-tech-id="tech.banking"] .card-art-button');
  assert.ok(h.root.querySelector(".modal"));
  assert.equal(h.app.getGame(), g);
  h.click('[data-action="close-overlay"]');
  h.click(
    '#status-box [data-action="select-event-tech"][data-tech="tech.genesis"]',
  );
  h.click('#status-box [data-action="commit-vorsprung"]');
  assert.equal(h.app.getGame().pending.kind, "genesis");
  assert.ok(!summary(h).textContent.includes("Effect complete"));
  const option = featureOptions(h.app.getGame(), "tech.genesis")[0];
  h.click(
    `[data-action="feature-option"][data-system-id="${option.system}"][data-planet="${option.planet}"]`,
  );
  h.click('[data-action="commit-feature"]');
  assert.match(summary(h).textContent, /Effect complete/);
  h.close();
});

test("Earth First warns on Disruptor and disables its effect on opponents’ homes for everyone, while other targets remain effective", () => {
  const h = harness(),
    g = setup(3, 7, { ...config, techPreset: "family" });
  g.phase = "tech";
  g.activeEvent = { id: "event.earth-first", owner: 0, round: 1 };
  credits(g, 0, 10);
  h.app.setGame(g);
  h.click('[data-view="techs"]');
  assert.match(
    h.root.querySelector('[data-tech-id="tech.disruptor"] .earth-first-warning')
      .textContent,
    /opponent home system will have no effect/,
  );
  h.click('[data-action="buy"][data-tech="tech.disruptor"]');
  const home = g.players[1].home;
  h.click(`[data-action="feature-option"][data-system-id="${home}"]`);
  assert.match(
    h.root.querySelector("#status-box .earth-first-warning").textContent,
    /selected system will not be blocked/,
  );
  h.click('[data-action="commit-feature"]');
  const next = h.app.getGame();
  next.phase = "plan";
  next.round = 2;
  next.turn = 0;
  for (const p of next.players) p.unplaced = 4;
  let planned = next;
  for (let n = 0; n < 3; n++)
    planned = step(planned, {
      type: "plan",
      system: planned.players[planned.turn].home,
    });
  for (const p of planned.players)
    assert.equal(canPlan(planned, system(planned, home), p.id), true);
  const hidden = planned.systems.find((s) => !s.revealed);
  planned.disruptions.push({ owner: 0, system: hidden.id, round: 2 });
  assert.equal(canPlan(planned, hidden, 1), false);
  const ownHome = system(planned, planned.players[0].home);
  planned.disruptions.push({ owner: 0, system: ownHome.id, round: 2 });
  assert.equal(canPlan(planned, ownHome, 1), false);
  h.close();
});

test("Sabotage defaults to the most expensive affordable legal target, pays its full value with Research Lab, and preserves explicit choices", () => {
  const h = harness(),
    g = setup(3, 7, config);
  g.phase = "tech";
  tech(g, 0, "research-lab");
  credits(g, 0, 7);
  tech(g, 1, "spice");
  tech(g, 1, "banking");
  tech(g, 2, "arcologies");
  h.app.setGame(g);
  h.click('[data-view="techs"]');
  assert.equal(
    h.root.querySelector('[data-action="sabotage-target"][aria-pressed="true"]')
      .dataset.tech,
    "tech.banking",
  );
  assert.equal(
    h.root.querySelector('[data-number="sabotage-value"]').value,
    "7",
  );
  assert.match(
    h.root.querySelector(".sabotage-selection").textContent,
    /Player 2 · Banking/,
  );
  assert.match(
    h.root.querySelector('[data-action="buy"][data-tech="tech.sabotage"]')
      .textContent,
    /7 Credits/,
  );
  h.click('[data-action="sabotage-target"][data-tech="tech.arcologies"]');
  assert.equal(
    h.root.querySelector('[data-number="sabotage-value"]').value,
    "5",
  );
  h.click('[data-view="board"]');
  h.click('[data-view="techs"]');
  assert.equal(
    h.root.querySelector('[data-action="sabotage-target"][aria-pressed="true"]')
      .dataset.tech,
    "tech.arcologies",
  );
  h.click('[data-action="buy"][data-tech="tech.sabotage"]');
  assert.equal(h.app.getGame().players[0].credits, 2);
  assert.ok(!h.app.getGame().players[2].techs.includes("tech.arcologies"));
  h.close();
  const defaults = harness();
  defaults.app.setGame(g);
  defaults.click('[data-view="techs"]');
  defaults.click('[data-action="buy"][data-tech="tech.sabotage"]');
  assert.equal(defaults.app.getGame().players[0].credits, 0);
  assert.ok(!defaults.app.getGame().players[1].techs.includes("tech.banking"));
  defaults.close();
});

test("Sabotage leaves no target selected when none is affordable and updates the default after returning Credits", () => {
  const h = harness(),
    g = setup(3, 7, config);
  g.phase = "tech";
  tech(g, 0, "flexible-economy");
  tech(g, 1, "banking");
  tech(g, 2, "arcologies");
  credits(g, 0, 7);
  h.app.setGame(g);
  h.click('[data-view="techs"]');
  h.click('[data-action="return-credit"]');
  assert.equal(
    h.root.querySelector('[data-action="sabotage-target"][aria-pressed="true"]')
      .dataset.tech,
    "tech.arcologies",
  );
  assert.equal(
    h.root.querySelector('[data-number="sabotage-value"]').value,
    "5",
  );
  h.close();
  const none = harness();
  const poor = structuredClone(g);
  poor.players[0].credits -= 5;
  poor.players[0].reserve += 5;
  none.app.setGame(poor);
  none.click('[data-view="techs"]');
  assert.equal(
    none.root.querySelector(
      '[data-action="sabotage-target"][aria-pressed="true"]',
    ),
    null,
  );
  assert.equal(
    none.root.querySelector('[data-action="buy"][data-tech="tech.sabotage"]')
      .disabled,
    true,
  );
  none.close();
});

test("El Mayarah explains actual shared-planet production, including full planets, only for its beneficiary", () => {
  const h = harness(),
    g = action("el-mayarah"),
    s = g.systems[0],
    home = s.planets.find((p) => p.home);
  settlement(g, s, s.planets.indexOf(home), 1, 1);
  h.app.setGame(g);
  h.click(tile(s.id));
  h.click('[data-kind="produce"]');
  assert.equal(production(g, s), 2);
  assert.match(
    h.root.querySelector("#system-status .action-event-reminder").textContent,
    /adding 1 production/,
  );
  settlement(
    g,
    s,
    s.planets.indexOf(home),
    1,
    home.capacity - home.owners.reduce((a, b) => a + b, 0),
  );
  h.app.setGame(g);
  h.click(tile(s.id));
  h.click('[data-kind="produce"]');
  assert.equal(production(g, s), 4);
  assert.match(
    h.root.querySelector("#system-status .action-event-reminder").textContent,
    /adding 2 production/,
  );
  g.turn = 1;
  s.tokens = [1];
  h.app.setGame(g);
  h.click(tile(s.id));
  h.click('[data-kind="produce"]');
  assert.equal(
    h.root.querySelector("#system-status .action-event-reminder"),
    null,
  );
  h.close();
});

test("Economic Boom explains an invested action next to its checkbox and shows two rocket markers per invested slot", () => {
  const h = harness(),
    g = action("economic-boom"),
    s = g.systems[0];
  h.app.setGame(g);
  h.click(tile(s.id));
  h.click('[data-kind="produce"]');
  check(h, "invest", true);
  assert.match(
    h.root.querySelector(".invest-choice").textContent,
    /Economic Boom: Invest two rockets instead of one/,
  );
  h.click('[data-action="commit-action"]');
  assert.equal(h.app.getGame().players[0].invested, 2);
  // Inspect the active player's board before the next required action.
  const next = h.app.getGame();
  next.turn = 0;
  h.app.setGame(next);
  h.click('[data-view="actions"]');
  const slot = [...h.root.querySelectorAll(".action-slot")].find(
    (el) => el.querySelector("strong").textContent === "Produce",
  );
  assert.equal(slot.querySelectorAll("small .rocket").length, 2);
  h.close();
});

test("Turtling defaults each player to three home Ships, caps at Reserve, and preserves an explicit zero", () => {
  const h = harness(),
    g = effect("turtling");
  h.app.setGame(g);
  assert.equal(h.root.querySelector('[data-number="event-ships"]').value, "3");
  h.click('[data-action="commit-event-effect"]');
  assert.equal(system(h.app.getGame(), g.players[0].home).ships[0], 6);
  assert.equal(h.app.getGame().turn, 1);
  assert.equal(h.root.querySelector('[data-number="event-ships"]').value, "3");
  h.close();
  const zero = harness();
  zero.app.setGame(g);
  zero.input('[data-number="event-ships"]', "0");
  assert.equal(
    zero.root.querySelector('[data-number="event-ships"]').value,
    "0",
  );
  zero.click('[data-action="commit-event-effect"]');
  assert.equal(system(zero.app.getGame(), g.players[0].home).ships[0], 3);
  zero.close();
  const limited = harness(),
    low = structuredClone(g);
  ships(low, system(low, low.players[0].home), 0, low.players[0].reserve - 1);
  limited.app.setGame(low);
  assert.equal(
    limited.root.querySelector('[data-number="event-ships"]').value,
    "1",
  );
  limited.close();
});

test("Alliance, Black Cloud and Cyber Attack explain restrictions before an empty action is committed", () => {
  const h = harness(),
    g = action("alliance"),
    s = g.systems[0];
  g.activeEvent.owner = 1;
  g.activeEvent.ally = 0;
  ships(g, s, 1, 3);
  h.app.setGame(g);
  h.click(tile(s.id));
  h.click('[data-kind="attack"]');
  assert.equal(h.root.querySelector('[data-check="invest"]').checked, true);
  assert.match(
    h.root.querySelector(".action-event-reminder").textContent,
    /cannot target Player 2's Ships or Settlements/,
  );
  check(h, "invest", false);
  assert.match(
    h.root.querySelector(".attack-controls").textContent,
    /Alliance protects Player 2/,
  );
  assert.equal(
    h.root.querySelector('[data-number="target-ships"][data-id="1"]'),
    null,
  );
  g.activeEvent = { id: "event.black-cloud", owner: 0, round: 1 };
  h.app.setGame(g);
  h.click(tile(s.id));
  h.click('[data-kind="attack"]');
  assert.match(
    h.root.querySelector(".action-event-reminder").textContent,
    /Ships cannot be targeted/,
  );
  check(h, "invest", false);
  assert.match(
    h.root.querySelector(".attack-controls").textContent,
    /Black Cloud prevents targeting Ships/,
  );
  g.activeEvent.id = "event.cyber-attack";
  h.app.setGame(g);
  h.click(tile(g.systems.find((s) => !s.tokens.length).id));
  assert.match(
    h.root.querySelector("#system-status").textContent,
    /Cyber Attack: Select a stack with any player's colour on top/,
  );
  h.close();
});

test("a genuine 0.20 pending Vorsprung claim migrates with its choices intact and remains replayable", () => {
  const g = restoreGame(legacy);
  assert.equal(g.engine, "0.21.0");
  assert.equal(g.pending.event, "event.vorsprung");
  assert.deepEqual(g.players, legacy.players);
  assert.deepEqual(g.systems, legacy.systems);
  assert.deepEqual(g.eventFlow, legacy.eventFlow);
  assert.deepEqual(replayGame(g), g);
  const h = harness();
  h.app.setGame(g);
  assert.equal(
    h.root.querySelector('[data-action="commit-vorsprung"]').disabled,
    true,
  );
  h.close();
});
