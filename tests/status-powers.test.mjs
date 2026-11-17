import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { harness } from "./ui-harness.mjs";
import {
  CARD_MAP,
  createGame,
  credits,
  fixture,
  setup,
  ships,
  step,
  system,
  tech,
} from "./helpers.mjs";

const tile = (id) => `#galaxy .system[data-system="${id}"]`;
function clocked(run) {
  const original = Date.now;
  let now = 10000;
  Date.now = () => now;
  try {
    run((ms) => (now += ms));
  } finally {
    Date.now = original;
  }
}
function supplyShortfall(count = 4) {
  let g = fixture();
  tech(g, 0, "flexible-economy");
  credits(g, 0, count);
  ships(g, g.systems[0], 0, g.players[0].reserve);
  return step(g, {
    type: "resolve",
    system: g.systems[0].id,
    action: "produce",
  });
}

test("home double-click commits exactly one home, retains a button alternative and rejects ineligible systems", () =>
  clocked((tick) => {
    const h = harness(),
      g = createGame(2, 7);
    h.app.setGame(g);
    const homes = g.systems.filter((s) => s.planets.some((p) => p.home)),
      id = homes[0].id,
      other = homes[1].id,
      hidden = g.systems.find((s) => !s.revealed).id;
    h.click(tile(hidden));
    h.click(tile(hidden));
    assert.equal(h.app.getGame().revision, 0);
    h.click(tile(id));
    assert.equal(h.app.getGame().revision, 0);
    assert.ok(h.root.querySelector('[data-action="choose-home"]'));
    tick(100);
    h.click(tile(id));
    assert.equal(h.app.getGame().players[0].home, id);
    assert.equal(h.app.getGame().turn, 1);
    assert.equal(h.app.getGame().revision, 1);
    h.click(tile(other));
    h.click(tile(other));
    assert.equal(
      h.app.getGame().revision,
      1,
      "extra click must not claim for the next player",
    );
    tick(500);
    h.click(tile(id));
    h.click(tile(id));
    assert.equal(
      h.app.getGame().revision,
      1,
      "claimed home remains ineligible",
    );
    h.click(tile(other));
    h.click('[data-action="choose-home"]');
    assert.equal(h.app.getGame().players[1].home, other);
    assert.equal(h.app.getGame().phase, "plan");
    h.click(tile(other));
    assert.equal(
      h.app.getGame().revision,
      2,
      "home shortcut must not carry into PLAN",
    );
    h.close();
  }));

test("home touch double-tap commits, while pan, pinch and cancellation cannot count as selection taps", () =>
  clocked((tick) => {
    const h = harness(),
      g = createGame(2, 7),
      id = g.systems[0].id;
    h.app.setGame(g);
    const tap = () => {
      h.pointer(tile(id), "pointerdown", 80, 80);
      h.pointer(tile(id), "pointerup", 80, 80);
    };
    tap();
    h.pointer(tile(id), "pointerdown", 80, 80);
    h.pointer(tile(id), "pointermove", 110, 80);
    h.pointer(tile(id), "pointerup", 110, 80);
    tick(100);
    tap();
    assert.equal(h.app.getGame().revision, 0);
    h.pointer(tile(id), "pointerdown", 80, 80);
    h.pointer(tile(id), "pointerdown", 100, 80, 2);
    h.pointer(tile(id), "pointerup", 100, 80, 2);
    h.pointer(tile(id), "pointerup", 80, 80);
    tick(100);
    tap();
    assert.equal(h.app.getGame().revision, 0);
    h.pointer(tile(id), "pointerdown", 80, 80);
    h.pointer(tile(id), "pointercancel", 80, 80);
    tick(100);
    tap();
    assert.equal(h.app.getGame().revision, 0);
    tick(100);
    tap();
    assert.equal(h.app.getGame().players[0].home, id);
    assert.equal(h.app.getGame().revision, 1);
    h.click(tile(id));
    assert.equal(h.app.getGame().revision, 1);
    h.close();
  }));

test("Foresight and Flexible Economy stay above and below active Status supply across all views, and peeks hide at handoff", () => {
  const h = harness(),
    g = fixture();
  g.config.events = "foresight-test";
  tech(g, 0, "foresight");
  tech(g, 0, "flexible-economy");
  credits(g, 0, 1);
  h.app.setGame(g);
  for (const view of ["board", "techs", "event", "actions", "player_aid"]) {
    h.click(`[data-view="${view}"]`);
    const fore = h.root.querySelector("#status-box .foresight-inline"),
      supply = h.root.querySelector("#status-box .status-supply"),
      flex = h.root.querySelector("#status-box .flexible-inline");
    assert.ok(
      fore.compareDocumentPosition(supply) &
        h.window.Node.DOCUMENT_POSITION_FOLLOWING,
    );
    assert.ok(
      supply.compareDocumentPosition(flex) &
        h.window.Node.DOCUMENT_POSITION_FOLLOWING,
    );
  }
  assert.doesNotMatch(h.root.textContent, /Tech powers/);
  h.click('#status-box [data-action="show-peek"]');
  assert.ok(h.root.querySelector(".foresight-cards"));
  h.click('#status-box [data-action="return-credit"]');
  assert.equal(h.app.getGame().players[0].credits, 0);
  assert.ok(
    h.root.querySelector('#status-box [data-action="return-credit"]').disabled,
  );
  assert.ok(h.root.querySelector(".foresight-cards"));
  h.app.setGame(structuredClone(h.app.getGame()));
  assert.equal(h.root.querySelector(".foresight-cards"), null);
  h.click('#status-box [data-action="show-peek"]');
  h.click('[data-view="board"]');
  h.click(tile(g.systems[0].id));
  h.click('[data-kind="produce"]');
  h.click('[data-action="commit-action"]');
  assert.equal(h.app.getGame().turn, 1);
  assert.equal(h.root.querySelector(".foresight-cards"), null);
  assert.equal(h.root.querySelector("#status-box .foresight-inline"), null);
  for (const id of g.events.slice(0, 2))
    assert.equal(
      h.root.querySelector(".history").textContent.includes(CARD_MAP[id].title),
      false,
    );
  h.close();
});

test("predictable Flexible economy shortages offer Go back before commitment and keep Reserve controls in the Status Box", () => {
  const h = harness();
  let g = fixture();
  tech(g, 0, "flexible-economy");
  credits(g, 0, 4);
  ships(g, g.systems[0], 0, g.players[0].reserve);
  const id = g.systems[0].id,
    before = g.systems[0].ships[0];
  h.app.setGame(g);
  h.click(tile(id));
  h.click('[data-kind="produce"]');
  h.click('[data-action="commit-action"]');
  const modal = h.root.querySelector(".modal");
  assert.match(
    modal.textContent,
    /could use Flexible economy.*before applying this effect/,
  );
  assert.equal(
    modal.querySelector('[data-action="return-credit"],input'),
    null,
  );
  assert.equal(h.app.getGame(), g);
  h.click('[data-action="cancel-confirmation"]');
  assert.equal(h.root.querySelector(".modal"), null);
  assert.equal(h.app.getGame().players[0].used.length, 0);
  const controls = h.root.querySelector("#status-box .flexible-inline");
  assert.equal(
    controls.querySelector("strong").textContent,
    "Flexible economy",
  );
  assert.equal(controls.querySelector("small"), null);
  h.click('#status-box [data-action="return-credit"]');
  h.click('[data-action="commit-action"]');
  g = h.app.getGame();
  assert.equal(g.turn, 1);
  assert.equal(system(g, id).ships[0], before + 1);
  assert.equal(g.players[0].credits, 3);
  h.close();
});

test("committed Reserve warnings offer Go back to the Status Box and preserve previous output through apply and autosave", () => {
  const h = harness();
  h.app.setGame(supplyShortfall());
  const old = h.app.getGame(),
    id = old.systems[0].id,
    before = old.systems[0].ships[0];
  const modal = h.root.querySelector(".reserve-recovery");
  assert.ok(modal.contains(h.window.document.activeElement));
  assert.equal(
    modal.querySelector('input,[data-action="return-credit"]'),
    null,
  );
  assert.match(modal.textContent, /Go back/);
  h.click('[data-action="back-to-reserve"]');
  assert.equal(h.app.getGame(), old);
  assert.equal(h.root.querySelector(".modal"), null);
  h.click('#status-box [data-action="return-credit"]');
  h.click('[data-action="complete-reserve"]');
  const g = h.app.getGame();
  assert.equal(g.pending, null);
  assert.equal(g.turn, 1);
  assert.equal(system(g, id).ships[0], before + 1);
  assert.equal(g.log.filter((l) => l.text.startsWith("Produced ")).length, 1);
  assert.equal(
    JSON.parse(h.window.localStorage.getItem("space-force.local-family.v1"))
      .revision,
    g.revision,
  );
  h.close();
});

test("an empty-Credits shortfall can be accepted without adjustment controls or a soft lock", () => {
  const h = harness();
  h.app.setGame(supplyShortfall(0));
  const modal = h.root.querySelector(".reserve-recovery");
  assert.equal(
    modal.querySelector('[data-action="return-credit"],input'),
    null,
  );
  assert.ok(modal.contains(h.window.document.activeElement));
  h.click('[data-action="back-to-reserve"]');
  assert.ok(
    h.root.querySelector('#status-box [data-action="return-credit"]').disabled,
  );
  h.click('[data-action="complete-reserve"]');
  assert.match(
    h.root.querySelector(".modal").textContent,
    /could use Flexible economy/,
  );
  h.click('[data-action="confirm-command"]');
  assert.equal(h.app.getGame().turn, 1);
  assert.equal(h.root.querySelector(".modal"), null);
  h.close();
});

test("selecting an empty-Reserve rival resolves the gift without a confirmation or resource handoff", () => {
  const h = harness();
  let g = fixture(),
    id = g.systems[0].id,
    p = g.systems[0].planets[1];
  tech(g, 1, "flexible-economy");
  credits(g, 1, 2);
  ships(g, g.systems[1], 1, g.players[1].reserve);
  p.explore = "otherShips";
  g = step(g, {
    type: "resolve",
    action: "settle",
    system: id,
    settlements: { [p.id]: 1 },
  });
  h.app.setGame(g);
  h.click('[data-action="recipient"][data-recipient="1"]');
  const next = h.app.getGame();
  assert.equal(h.root.querySelector(".modal"), null);
  assert.equal(h.root.querySelector(".reserve-effect"), null);
  assert.equal(next.pending, null);
  assert.equal(next.turn, 1);
  assert.equal(next.players[1].credits, 2);
  assert.equal(next.players[1].reserve, 0);
  assert.equal(system(next, id).ships[1], 0);
  assert.equal(system(next, id).planets[1].owners[0], 1);
  h.close();
});

test("Go back from a revealed Explore shortfall preserves the token, committed Settlement and initial Credit award", () => {
  const h = harness();
  let g = fixture(),
    id = g.systems[0].id,
    p = g.systems[0].planets[1];
  tech(g, 0, "flexible-economy");
  credits(g, 0, 3);
  ships(g, g.systems[0], 0, g.players[0].reserve - 1);
  p.explore = "credit3";
  const initialShips = g.systems[0].ships[0];
  h.app.setGame(g);
  h.click(tile(id));
  h.click('[data-kind="settle"]');
  h.input(`[data-number="settlement"][data-planet="${p.id}"]`, "1");
  h.click('[data-action="commit-action"]');
  assert.equal(h.app.getGame().pending.kind, "reserve");
  assert.equal(system(h.app.getGame(), id).planets[1].explore, null);
  const committed = h.app.getGame();
  h.click('[data-action="back-to-reserve"]');
  assert.equal(h.app.getGame(), committed);
  assert.equal(h.app.getGame().players[0].credits, 4);
  h.click('#status-box [data-action="return-credit"]');
  h.click('#status-box [data-action="return-credit"]');
  h.click('[data-action="complete-reserve"]');
  g = h.app.getGame();
  assert.equal(g.context, null);
  assert.equal(system(g, id).planets[1].owners[0], 1);
  assert.equal(system(g, id).ships[0], initialShips - 1);
  assert.equal(
    g.log.filter((l) => l.text.startsWith("Explore token revealed: +3")).length,
    1,
  );
  h.close();
});

test("Filibuster labels top, bottom and singleton tokens and Sabotage resets X on every selected target", () => {
  const h = harness();
  let g = setup();
  tech(g, 0, "filibuster");
  const a = g.systems[0].id,
    b = g.systems[1].id;
  while (!g.pending)
    g = step(g, {
      type: "plan",
      system: g.turn === 0 && g.players[0].unplaced === 1 ? b : a,
    });
  h.app.setGame(g);
  const options = [
    ...h.root.querySelectorAll('[data-action="filibuster-option"]'),
  ].map((b) => b.textContent);
  assert.ok(options.some((t) => /token #\d+ \(bottom\)/.test(t)));
  assert.ok(options.some((t) => /token #1 \(top\) \(bottom\)/.test(t)));
  assert.ok(options.some((t) => /token #\d+$/.test(t)));
  g = setup(2, 9, {
    techPreset: "remaining",
    scenario: "standard",
    events: "foresight-test",
  });
  g.phase = "tech";
  tech(g, 0, "research-lab");
  tech(g, 1, "arcologies");
  tech(g, 1, "flexible-economy");
  credits(g, 0, 10);
  h.app.setGame(g);
  h.click('[data-view="techs"]');
  h.click('[data-action="sabotage-target"][data-tech="tech.arcologies"]');
  assert.equal(
    h.root.querySelector('[data-number="sabotage-value"]').value,
    "5",
  );
  h.input('[data-number="sabotage-value"]', "12");
  h.click('[data-action="sabotage-target"][data-tech="tech.flexible-economy"]');
  assert.equal(
    h.root.querySelector('[data-number="sabotage-value"]').value,
    String(CARD_MAP["tech.flexible-economy"].cost),
  );
  const selected = h.root.querySelector(".sabotage-targets .selected");
  assert.equal(selected.dataset.tech, "tech.flexible-economy");
  const sabotage = h.root.querySelector(".sabotage-controls");
  assert.match(
    sabotage.querySelector(".quantity-row").textContent,
    /Credit value \(X\)/,
  );
  assert.equal(sabotage.querySelector("p"), null);
  assert.match(
    h.root.querySelector('[data-tech-id="tech.sabotage"] .tech-body > p')
      .textContent,
    /\(cannot be discounted by Research lab\)/,
  );
  h.input('[data-number="sabotage-value"]', "8");
  assert.match(
    h.root.querySelector('.sabotage-controls [data-action="buy"]').textContent,
    /8 Credits/,
  );
  assert.equal(
    h.root.querySelector(
      '[data-action="buy"][data-tech="tech.sabotage"][data-full-price]',
    ),
    null,
  );
  const css = readFileSync(
    new URL("../src/style.css", import.meta.url),
    "utf8",
  );
  assert.match(
    css,
    /\.sabotage-targets button.selected\s*\{[^}]*color:\s*#211d32/,
  );
  h.close();
});
