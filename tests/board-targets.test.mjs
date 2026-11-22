import test from "node:test";
import assert from "node:assert/strict";
import { harness } from "./ui-harness.mjs";
import {
  setup,
  step,
  system,
  settlement,
  tech,
  featureOptions,
  prophecyOptions,
  botCommand,
  fixture,
} from "./helpers.mjs";

const config = {
  techPreset: "remaining",
  scenario: "standard",
  events: "full",
};
const tile = (id) => `#galaxy .system[data-system="${id}"]`;
const planet = (id, p) => `${tile(id)} [data-planet="${p}"]`;
function effect(name, count = 3) {
  let g = setup(count, 7, config);
  g.phase = "event";
  g.turn = 0;
  g.pending = { kind: "eventSelect" };
  g.auction = { bids: g.players.map(() => 0), winner: 0, paid: 0 };
  g.revealedEvents = [`event.${name}`, "event.alliance"];
  return step(g, { type: "selectEvent", event: `event.${name}` });
}
function mouse(h, selector, type = "click", detail = 1) {
  const el = h.root.querySelector(selector);
  assert.ok(el, selector);
  el.dispatchEvent(
    new h.window.MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: 120,
      clientY: 180,
      detail,
    }),
  );
}
function tap(h, selector, x = 120, y = 180) {
  h.pointer(selector, "pointerdown", x, y);
  h.pointer(selector, "pointerup", x, y);
}

test("every Tech system, planet and edge target can be selected on the board and double-clicked to commit once", () => {
  for (const name of [
    "artificial-warp",
    "planet-nine",
    "disruptor",
    "planet-killer",
    "genesis",
    "kessler-syndrome",
  ]) {
    const h = harness(),
      g = setup(3, 7, config);
    tech(g, 0, name);
    g.phase = "tech";
    g.turn = 0;
    g.pending = { kind: "feature", tech: `tech.${name}` };
    const o = featureOptions(g, `tech.${name}`)[0];
    assert.ok(o, name);
    h.app.setGame(g);
    h.click('[data-view="board"]');
    const target = o.planet
      ? planet(o.system, o.planet)
      : o.edge !== undefined
        ? `${tile(o.system)} [data-edge="${o.edge}"]`
        : tile(o.system);
    mouse(h, target);
    assert.equal(h.app.getGame(), g);
    assert.ok(
      h.root.querySelector(
        '[data-action="feature-option"][aria-pressed="true"]',
      ),
      name,
    );
    assert.equal(
      h.root.querySelector('[data-action="commit-feature"]').disabled,
      false,
    );
    const oldTarget = h.root.querySelector(target);
    mouse(h, target, "click", 2);
    const committed = h.app.getGame();
    assert.equal(committed.revision, g.revision + 1, name);
    assert.equal(committed.commands.at(-1).command.type, "feature", name);
    assert.equal(committed.commands.at(-1).command.system, o.system, name);
    oldTarget.dispatchEvent(
      new h.window.MouseEvent("dblclick", { bubbles: true, detail: 2 }),
    );
    oldTarget.dispatchEvent(
      new h.window.MouseEvent("click", { bubbles: true }),
    );
    assert.equal(
      h.app.getGame(),
      committed,
      "native and synthetic events cannot commit twice",
    );
    h.close();
  }
});

test("native double-click selects a valid target, while an invalid planet cannot confirm another draft target", () => {
  const h = harness(),
    g = setup(3, 7, config);
  tech(g, 0, "genesis");
  g.phase = "tech";
  g.pending = { kind: "genesis" };
  const o = featureOptions(g, "tech.genesis")[0];
  h.app.setGame(g);
  h.click('[data-view="board"]');
  mouse(h, planet(o.system, o.planet));
  const home = system(g, g.players[0].home),
    homePlanet = home.planets.find((p) => p.home);
  mouse(h, planet(home.id, homePlanet.id), "dblclick", 2);
  assert.equal(h.app.getGame(), g);
  mouse(h, planet(o.system, o.planet), "dblclick", 2);
  assert.equal(h.app.getGame().revision, g.revision + 1);
  h.close();
});

test("Stealth Invasion board choices preview available Ships and double-click confirms the displayed allocation", () => {
  const h = harness(),
    g = effect("stealth-invasion");
  h.app.setGame(g);
  h.click('[data-view="board"]');
  const a = g.systems[0],
    b = g.systems[1];
  mouse(h, tile(a.id));
  assert.equal(
    h.root.querySelector(`[data-number="event-ships"][data-id="${a.id}"]`)
      .value,
    "3",
  );
  mouse(h, tile(b.id));
  assert.equal(
    h.root.querySelector(`[data-number="event-ships"][data-id="${a.id}"]`)
      .value,
    "0",
  );
  assert.equal(
    h.root.querySelector(`[data-number="event-ships"][data-id="${b.id}"]`)
      .value,
    "3",
  );
  assert.equal(
    h.root.querySelector(".board-system-choice").dataset.choiceSystem,
    b.id,
  );
  h.input(`[data-number="event-ships"][data-id="${b.id}"]`, "2");
  mouse(h, tile(a.id));
  assert.equal(
    h.root.querySelector(`[data-number="event-ships"][data-id="${b.id}"]`)
      .value,
    "2",
  );
  mouse(h, tile(a.id), "click", 2);
  const next = h.app.getGame();
  assert.equal(next.revision, g.revision + 1);
  assert.equal(system(next, b.id).ships[0], b.ships[0] + 2);
  assert.equal(system(next, a.id).ships[0], a.ships[0]);
  h.close();
});

test("Stealth Invasion touch double-tap commits once and synthetic clicks do not carry into the next decision", () => {
  const h = harness(),
    g = effect("stealth-invasion"),
    a = g.systems[0];
  h.app.setGame(g);
  h.click('[data-view="board"]');
  tap(h, tile(a.id));
  assert.equal(h.app.getGame(), g);
  const oldTarget = h.root.querySelector(tile(a.id));
  tap(h, tile(a.id), 122, 179);
  const next = h.app.getGame();
  assert.equal(next.revision, g.revision + 1);
  assert.equal(system(next, a.id).ships[0], a.ships[0] + 3);
  oldTarget.dispatchEvent(new h.window.MouseEvent("click", { bubbles: true }));
  assert.equal(h.app.getGame(), next);
  h.close();
});

test("touch pan, pinch, cancellation, view changes and changed game state cancel target double-taps", () => {
  for (const kind of ["pan", "pinch", "cancel", "view", "state"]) {
    const h = harness(),
      g = effect("stealth-invasion"),
      target = tile(g.systems[0].id);
    h.app.setGame(g);
    h.click('[data-view="board"]');
    tap(h, target);
    if (kind === "pan") {
      h.pointer(target, "pointerdown", 120, 180);
      h.pointer(target, "pointermove", 160, 180);
      h.pointer(target, "pointerup", 160, 180);
    } else if (kind === "pinch") {
      h.pointer(target, "pointerdown", 120, 180);
      h.pointer(target, "pointerdown", 180, 180, 2);
      h.pointer(target, "pointermove", 210, 180, 2);
      h.pointer(target, "pointerup", 210, 180, 2);
      h.pointer(target, "pointerup", 120, 180);
    } else if (kind === "cancel") {
      h.pointer(target, "pointerdown", 120, 180);
      h.pointer(target, "pointercancel", 120, 180);
    } else if (kind === "view") {
      h.key(".game-shell", "t");
      h.key(".game-shell", "b");
    } else {
      h.app.setGame(structuredClone(g));
    }
    tap(h, target);
    assert.equal(h.app.getGame().revision, g.revision, kind);
    h.close();
  }
});

test("Prophecy board planet selection is idempotent and double-tap commits the whole legal draft", () => {
  const h = harness(),
    g = effect("prophecy");
  const options = prophecyOptions(g),
    a = options[0],
    b = options.find((o) => o.system !== a.system);
  h.app.setGame(g);
  h.click('[data-view="board"]');
  h.click(planet(a.system, a.planet));
  assert.equal(
    h.root.querySelectorAll(
      '[data-action="prophecy-planet"][aria-pressed="true"]',
    ).length,
    1,
  );
  tap(h, planet(b.system, b.planet));
  assert.equal(
    h.root.querySelectorAll(
      '[data-action="prophecy-planet"][aria-pressed="true"]',
    ).length,
    2,
  );
  tap(h, planet(b.system, b.planet));
  const next = h.app.getGame();
  assert.equal(next.revision, g.revision + 1);
  assert.deepEqual(next.commands.at(-1).command.planets, [a.planet, b.planet]);
  assert.ok(
    system(next, a.system).planets.find((p) => p.id === a.planet).exploreFaceUp,
  );
  h.close();
});

test("Prophecy refuses a second new planet in one system and cannot confirm a hidden target", () => {
  const h = harness(),
    g = effect("prophecy");
  const options = prophecyOptions(g),
    a = options[0],
    b = options.find((o) => o.system === a.system && o.planet !== a.planet);
  assert.ok(b);
  h.app.setGame(g);
  h.click('[data-view="board"]');
  h.click(planet(a.system, a.planet));
  mouse(h, planet(b.system, b.planet), "dblclick", 2);
  assert.equal(h.app.getGame(), g);
  assert.equal(
    h.root.querySelectorAll(
      '[data-action="prophecy-planet"][aria-pressed="true"]',
    ).length,
    1,
  );
  mouse(h, tile(g.systems.find((s) => !s.revealed).id), "dblclick", 2);
  assert.equal(h.app.getGame(), g);
  h.close();
});

test("face-up Explore reminders disclose all six effects after Prophecy and never disclose later hidden tokens", () => {
  let g = effect("prophecy");
  const effects = {
    credit1: /gains 1 Credit from Reserve/,
    credit2: /gains 2 Credits from Reserve/,
    credit3: /gains 3 Credits from Reserve/,
    otherShips: /another player: they receive up to 2 Ships/,
    otherSettlement:
      /another player: they receive 1 Settlement.*before your Settlements/,
    blackHole: /Add a black hole.*Existing Ships are unharmed/,
  };
  const empty = g.systems
    .filter((s) => s.revealed)
    .flatMap((s) =>
      s.planets.filter((p) => !p.owners.some(Boolean)).map((p) => ({ s, p })),
    );
  const targets = Object.keys(effects).map((key, i) => {
    const { s, p } = empty[i];
    const index = g.exploreBag.indexOf(key);
    assert.ok(index >= 0);
    g.exploreBag.splice(index, 1);
    p.explore = key;
    return { system: s.id, planet: p.id, key };
  });
  const hidden = harness();
  hidden.app.setGame(g);
  hidden.click('[data-view="board"]');
  hidden.click(tile(targets[0].system));
  assert.equal(hidden.root.querySelector(".revealed-explore-reminder"), null);
  hidden.close();
  g = step(g, { type: "eventChoice", planets: [] });
  for (let n = 0; n < 200 && g.phase !== "actions"; n++)
    g = step(g, botCommand(g));
  assert.equal(g.phase, "actions");
  const h = harness();
  h.app.setGame(g);
  h.click('[data-view="board"]');
  for (const o of targets) {
    h.click(tile(o.system));
    const reminder = h.root.querySelector(".revealed-explore-reminder");
    assert.ok(reminder);
    assert.match(reminder.textContent, effects[o.key]);
  }
  const later = system(g, g.systems.find((s) => !s.revealed).id);
  later.revealed = true;
  later.planets[0].explore = g.exploreBag.pop();
  later.planets[0].exploreFaceUp = false;
  h.app.setGame(g);
  h.click(tile(later.id));
  assert.match(
    h.root.querySelector(".explore-summary").textContent,
    /1 Explore token/,
  );
  assert.equal(h.root.querySelector(".revealed-explore-reminder"), null);
  assert.match(
    h.root.querySelector(`${tile(later.id)} .explore-label`).textContent,
    /\?/,
  );
  h.close();
});

test("Migration keeps every player's original total visible as the draft changes and resets on a different board system", async () => {
  const h = harness(),
    g = effect("migration"),
    home = system(g, g.players[0].home);
  const spare = home.planets.find((p) => !p.home && p.capacity >= 2),
    origin = home.planets.find((p) => p.home);
  settlement(g, home, home.planets.indexOf(spare), 1, 1);
  settlement(g, home, home.planets.indexOf(spare), 2, 1);
  h.app.setGame(g);
  h.click('[data-view="board"]');
  mouse(h, tile(home.id));
  assert.equal(
    h.root
      .querySelector('.migration-totals [data-owner="0"]')
      .textContent.includes("3 originally · 3 currently assigned"),
    true,
  );
  for (const id of [1, 2])
    assert.match(
      h.root.querySelector(`.migration-totals [data-owner="${id}"]`)
        .textContent,
      /1 originally · 1 currently assigned/,
    );
  h.input(
    `[data-number="event-migration"][data-planet="${origin.id}"][data-id="0"]`,
    "2",
  );
  assert.match(
    h.root.querySelector('.migration-totals [data-owner="0"]').textContent,
    /3 originally · 2 currently assigned/,
  );
  mouse(h, tile(home.id), "dblclick", 2);
  assert.equal(
    h.app.getGame(),
    g,
    "an invalid distribution still uses engine validation",
  );
  await new Promise((resolve) => setTimeout(resolve, 360));
  mouse(h, tile(g.players[1].home));
  assert.match(
    h.root.querySelector('.migration-totals [data-owner="0"]').textContent,
    /0 originally · 0 currently assigned/,
  );
  assert.match(
    h.root.querySelector('.migration-totals [data-owner="1"]').textContent,
    /3 originally · 3 currently assigned/,
  );
  mouse(h, tile(g.players[1].home), "click", 2);
  assert.equal(h.app.getGame().revision, g.revision + 1);
  assert.equal(h.app.getGame().pending, null);
  h.close();
});

test("free MOVE and SETTLE Event system choices and Scrambler share board selection and confirmation", () => {
  for (const name of ["all-your-base", "consolidation", "galactic-summit"]) {
    const h = harness(),
      g = effect(name);
    const target = g.systems.find(
      (s) => name !== "galactic-summit" || !s.planets.some((p) => p.home),
    );
    h.app.setGame(g);
    h.click('[data-view="board"]');
    mouse(h, tile(target.id));
    assert.ok(
      h.root.querySelector(
        `[data-action="event-system"][data-system-id="${target.id}"][aria-pressed="true"]`,
      ),
    );
    mouse(h, tile(target.id), "click", 2);
    assert.equal(h.app.getGame().revision, g.revision + 1, name);
    assert.equal(h.app.getGame().commands.at(-1).command.system, target.id);
    h.close();
  }
  const h = harness(),
    g = setup(3, 7, config);
  g.phase = "plan";
  g.players.forEach((p) => (p.unplaced = 0));
  g.pending = { kind: "scrambler" };
  g.activeEvent = { id: "event.scrambler", owner: 0, round: 1 };
  g.systems[0].tokens = [0, 1, 2];
  h.app.setGame(g);
  h.click('[data-view="board"]');
  tap(h, tile(g.systems[0].id));
  tap(h, tile(g.systems[0].id));
  assert.deepEqual(h.app.getGame().systems[0].tokens, [2, 1, 0]);
  assert.equal(h.app.getGame().revision, g.revision + 1);
  h.close();
});

test("Investments double-click confirms the single board allocation and preserves quantity confirmation", () => {
  const h = harness(),
    g = setup(3, 7, config);
  g.phase = "investments";
  g.players[0].reserve -= 2;
  g.players[0].invested = 2;
  const home = system(g, g.players[0].home);
  h.app.setGame(g);
  mouse(h, tile(home.id));
  mouse(h, tile(home.id), "click", 2);
  const next = h.app.getGame();
  assert.equal(next.revision, g.revision + 1);
  assert.equal(system(next, home.id).ships[0], home.ships[0] + 1);
  assert.equal(next.players[0].credits, g.players[0].credits + 1);
  h.close();
});

test("Famine planet selection highlights its controls but cannot confirm an incomplete quantity", () => {
  const h = harness(),
    g = effect("famine"),
    home = system(g, g.players[0].home),
    p = home.planets.find((p) => p.home);
  h.app.setGame(g);
  h.click('[data-view="board"]');
  mouse(h, planet(home.id, p.id), "dblclick", 2);
  assert.equal(h.app.getGame(), g);
  assert.ok(
    h.root.querySelector(`.planet-choice.highlight [data-id="${p.id}"]`),
  );
  assert.equal(
    h.root.querySelector('[data-action="commit-event-effect"]').disabled,
    true,
  );
  h.input(`[data-number="event-famine"][data-id="${p.id}"]`, "2");
  mouse(h, planet(home.id, p.id), "dblclick", 2);
  assert.equal(h.app.getGame().revision, g.revision + 1);
  assert.equal(
    system(h.app.getGame(), home.id).planets.find((o) => o.id === p.id)
      .owners[0],
    1,
  );
  h.close();
});

test("Rapid Advance planet and Insurance system rewards use board confirmation without bypassing their effects", () => {
  const h = harness();
  let g = fixture();
  tech(g, 0, "rapid-advance");
  const home = system(g, g.players[0].home);
  g = step(g, {
    type: "resolve",
    system: home.id,
    action: "move",
    sources: {},
  });
  assert.equal(g.pending.kind, "rapid");
  const o = featureOptions(g, "tech.rapid-advance")[0];
  h.app.setGame(g);
  h.click('[data-view="board"]');
  mouse(h, planet(o.system, o.planet), "dblclick", 2);
  assert.equal(h.app.getGame().revision, g.revision + 1);
  assert.equal(
    system(h.app.getGame(), o.system).ships[0],
    system(g, o.system).ships[0] - 1,
  );
  h.close();
  const insured = harness();
  g = fixture();
  tech(g, 0, "insurance");
  g.pending = { kind: "insurance", after: 0, remaining: 1 };
  insured.app.setGame(g);
  mouse(insured, tile(g.players[0].home));
  assert.ok(
    insured.root.querySelector(
      '[data-action="insurance-ship"][aria-pressed="true"]',
    ),
  );
  mouse(insured, tile(g.players[0].home), "click", 2);
  assert.equal(insured.app.getGame().revision, g.revision + 1);
  assert.equal(
    system(insured.app.getGame(), g.players[0].home).ships[0],
    system(g, g.players[0].home).ships[0] + 1,
  );
  insured.close();
});

test("Filibuster selects the exact touched own token and double-tap lifts that token", () => {
  const h = harness(),
    g = fixture(),
    s = g.systems[0];
  tech(g, 0, "filibuster");
  g.pending = { kind: "filibuster", remaining: [] };
  g.phase = "plan";
  s.tokens = [0, 1, 0, 1];
  h.app.setGame(g);
  h.click('[data-view="board"]');
  const target = `${tile(s.id)} [data-stack-position="0"]`;
  tap(h, target);
  assert.ok(
    h.root.querySelector(
      '[data-action="filibuster-option"][data-index="0"][aria-pressed="true"]',
    ),
  );
  tap(h, target);
  assert.deepEqual(h.app.getGame().systems[0].tokens, [1, 0, 1, 0]);
  assert.equal(h.app.getGame().revision, g.revision + 1);
  h.close();
});
