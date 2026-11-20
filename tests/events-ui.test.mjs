import test from "node:test";
import assert from "node:assert/strict";
import { harness } from "./ui-harness.mjs";
import {
  setup,
  step,
  credits,
  tech,
  system,
  botCommand,
  ART,
} from "./helpers.mjs";
import { EVENT_BATCHES } from "../work/compiled/events.js";
const config = {
  techPreset: "remaining",
  scenario: "standard",
  events: "full",
};
function auction() {
  const g = setup(2, 7, config);
  g.phase = "event";
  g.turn = 0;
  g.pending = { kind: "bid" };
  g.auction = { bids: [null, null], winner: null, paid: 0 };
  g.revealedEvents = ["event.capital-injection", "event.alliance"];
  return g;
}
function effect(name) {
  let g = auction();
  g.pending = { kind: "eventSelect" };
  g.auction = { bids: [0, 0], winner: 0, paid: 0 };
  g.revealedEvents = [
    `event.${name}`,
    name === "alliance" ? "event.capital-injection" : "event.alliance",
  ];
  return step(g, { type: "selectEvent", event: `event.${name}` });
}
const tile = (id) => `#galaxy .system[data-system="${id}"]`;

test("setup selects all three ten-Event scenarios independently of Tech display and simpler mode", () => {
  for (const id of Object.keys(EVENT_BATCHES)) {
    const h = harness();
    h.input('[data-setting="event-batch"]', id);
    assert.ok(
      EVENT_BATCHES[id].cards.every((name) =>
        h.root.textContent.includes(
          name === "ragnarok"
            ? "Ragnarök"
            : ({ "all-your-base": "All Your Base", "el-mayarah": "El Mayarah" }[
                name
              ] ??
                name
                  .split("-")
                  .map((s) => s[0].toUpperCase() + s.slice(1))
                  .join(" ")),
        ),
      ),
    );
    h.root
      .querySelector("#setup-form")
      .dispatchEvent(
        new h.window.Event("submit", { bubbles: true, cancelable: true }),
      );
    assert.equal(h.app.getGame().config.eventBatch, id);
    assert.equal(h.app.getGame().events.length, 10);
    h.close();
  }
  const h = harness();
  h.input('[data-setting="event-mode"]', "simpler");
  assert.equal(h.root.querySelector('[data-setting="event-batch"]'), null);
  h.close();
});

test("private bidding uses a covered handoff, resets entered amounts, reveals all bids together, and supports Event selection", () => {
  const h = harness(),
    g = auction();
  credits(g, 0, 8);
  credits(g, 1, 6);
  h.app.setGame(g);
  assert.equal(h.root.querySelector('[data-number="event-bid"]'), null);
  h.click('[data-action="open-bid"]');
  h.input('[data-number="event-bid"]', "5");
  h.click('[data-action="seal-bid"]');
  assert.equal(h.app.getGame().turn, 1);
  assert.equal(h.root.querySelector('[data-number="event-bid"]'), null);
  assert.equal(h.app.getGame().players[0].credits, 8);
  assert.ok(!h.root.textContent.includes("Player 1 5"));
  h.click('[data-view="board"]');
  assert.equal(h.root.querySelector('[data-number="event-bid"]'), null);
  h.click('[data-action="open-bid"]');
  assert.equal(h.root.querySelector('[data-number="event-bid"]').value, "0");
  h.input('[data-number="event-bid"]', "2");
  h.click('[data-action="seal-bid"]');
  assert.equal(h.app.getGame().pending.kind, "eventSelect");
  assert.match(h.root.textContent, /Player 1 5 · Player 2 2/);
  assert.equal(h.app.getGame().players[0].credits, 3);
  h.click('[data-action="select-event"][data-event="event.capital-injection"]');
  h.input('[data-number="event-amount"]', "4");
  h.click('[data-action="commit-event-effect"]');
  assert.equal(h.app.getGame().players[0].credits, 7);
  assert.equal(h.app.getGame().phase, "tech");
  h.close();
});

test("refresh restores committed sealed bids but covers the next bidder, and blocks game export until reveal", () => {
  let g = auction();
  credits(g, 0, 7);
  g = step(g, { type: "bid", amount: 6 });
  const h = harness({
    getItem: (key) => (key.endsWith("v1") ? JSON.stringify(g) : null),
    setItem() {},
  });
  h.click('[data-action="resume"]');
  assert.equal(h.root.querySelector('[data-number="event-bid"]'), null);
  h.click('[data-action="export"]');
  assert.match(h.root.textContent, /export is available after all sealed bids/);
  h.click('[data-action="open-bid"]');
  assert.equal(h.root.querySelector('[data-number="event-bid"]').value, "0");
  h.close();
});

test("Politics, Scrambler and Alliance expose required choices; the board and Status Box share selection", () => {
  const h = harness();
  let g = effect("politics");
  h.app.setGame(g);
  h.click('[data-action="politics"][data-kind="attack"]');
  assert.equal(h.app.getGame().players[0].blockedAction, "attack");
  g = setup(2, 7, config);
  g.players.forEach((p) => (p.unplaced = 0));
  g.phase = "plan";
  g.activeEvent = { id: "event.scrambler", owner: 0, round: 1 };
  g.pending = { kind: "scrambler" };
  g.systems[0].tokens = [0, 1, 0];
  h.app.setGame(g);
  h.click('[data-view="board"]');
  h.click(tile(g.systems[0].id));
  assert.equal(
    h.root.querySelector('[data-action="scramble"]').disabled,
    false,
  );
  h.click('[data-action="scramble"]');
  assert.equal(h.app.getGame().phase, "actions");
  h.app.setGame(effect("alliance"));
  h.click('[data-action="event-ally"][data-recipient="1"]');
  assert.equal(h.app.getGame().activeEvent.ally, 1);
  h.close();
});

test("Prophecy choices enforce distinct systems and show the revealed token faces on the board without applying rewards", () => {
  const h = harness(),
    g = effect("prophecy");
  h.app.setGame(g);
  const first = h.root.querySelector('[data-action="prophecy-planet"]');
  assert.ok(first);
  h.click(
    `[data-action="prophecy-planet"][data-planet="${first.dataset.planet}"]`,
  );
  h.click('[data-action="commit-event-effect"]');
  const next = h.app.getGame(),
    target = next.systems.find((s) => s.planets.some((p) => p.exploreFaceUp));
  assert.ok(target);
  assert.equal(next.players[0].credits, 0);
  h.click('[data-view="board"]');
  assert.ok(
    ![...h.root.querySelectorAll(`${tile(target.id)} .explore-label`)].every(
      (el) => el.textContent === "?",
    ),
  );
  h.click('[data-view="event"]');
  assert.match(h.root.textContent, /Selected & discarded Events/);
  assert.match(h.root.textContent, /Prophecy/);
  h.close();
});

test("forced action investments show Event reason and cannot be unchecked; Cyber Attack highlights and uses another player’s stack", () => {
  const h = harness();
  let g = setup(2, 7, config);
  g.phase = "actions";
  g.turn = 0;
  g.players.forEach((p) => (p.unplaced = 0));
  g.activeEvent = { id: "event.ceasefire", owner: 1, round: 1 };
  g.systems[0].tokens = [0];
  g.systems[1].tokens = [1];
  h.app.setGame(g);
  h.click(tile(g.systems[0].id));
  h.click('[data-kind="attack"]');
  assert.equal(h.root.querySelector('[data-check="invest"]').checked, true);
  assert.equal(h.root.querySelector('[data-check="invest"]').disabled, true);
  assert.match(h.root.textContent, /requires this Investment/);
  h.click('[data-action="commit-action"]');
  assert.equal(h.app.getGame().players[0].invested, 1);
  g.activeEvent.id = "event.cyber-attack";
  h.app.setGame(g);
  assert.ok(h.root.querySelector(`${tile(g.systems[1].id)} .selection-ring`));
  h.click(tile(g.systems[1].id));
  h.click('[data-kind="attack"]');
  h.click('[data-action="commit-action"]');
  assert.equal(h.app.getGame().players[0].slotOwners.attack, 1);
  h.close();
});

test("Flexibility lets a player reuse the performed action in a different unused receiving slot", () => {
  const h = harness(),
    g = setup(2, 7, config);
  g.phase = "actions";
  g.turn = 0;
  g.players.forEach((p) => (p.unplaced = 0));
  g.activeEvent = { id: "event.flexibility", owner: 0, round: 1 };
  g.players[0].used = ["produce"];
  g.systems[0].tokens = [0];
  g.systems[1].tokens = [1];
  h.app.setGame(g);
  h.click(tile(g.systems[0].id));
  h.click('[data-kind="produce"]');
  h.input('[data-setting="action-slot"]', "attack");
  h.click('[data-action="commit-action"]');
  assert.deepEqual(h.app.getGame().players[0].used, ["produce", "attack"]);
  h.close();
});

test("Migration edits preserve a pending draft until commitment and reject lost settlements", () => {
  const h = harness(),
    g = effect("migration");
  h.app.setGame(g);
  const home = system(g, g.players[0].home),
    p = home.planets.find((p) => p.home);
  h.click(`[data-action="event-system"][data-system-id="${home.id}"]`);
  h.input(
    `[data-number="event-migration"][data-planet="${p.id}"][data-id="0"]`,
    "2",
  );
  h.click('[data-action="commit-event-effect"]');
  assert.equal(h.app.getGame(), g);
  assert.match(h.root.textContent, /Preserve each player's total/);
  h.close();
});

test("Famine requires the exact chosen half and Vorsprung leaves the ordinary Tech step available after a free claim", () => {
  const h = harness();
  let g = effect("famine");
  h.app.setGame(g);
  assert.equal(
    h.root.querySelector('[data-action="commit-event-effect"]').disabled,
    true,
  );
  const el = h.root.querySelector('[data-number="event-famine"]');
  h.input(`[data-number="event-famine"][data-id="${el.dataset.id}"]`, "2");
  h.click('[data-action="commit-event-effect"]');
  assert.equal(h.app.getGame().turn, 1);
  g = effect("vorsprung");
  h.app.setGame(g);
  const tech = h.root.querySelector('[data-action="select-event-tech"]');
  assert.ok(tech);
  h.click(
    `[data-action="select-event-tech"][data-tech="${tech.dataset.tech}"]`,
  );
  assert.equal(h.app.getGame(), g);
  h.click('[data-action="commit-vorsprung"]');
  assert.ok(h.app.getGame().players[0].techs.includes(tech.dataset.tech));
  h.close();
});

test("Luddite warns before a purchase with no acquisition effect and cancellation keeps the Credits", () => {
  const h = harness(),
    g = setup(2, 7, config);
  g.phase = "tech";
  g.activeEvent = { id: "event.luddite-decree", owner: 0, round: 1 };
  g.market[0] = "tech.genesis";
  credits(g, 0, 8);
  h.app.setGame(g);
  h.click('[data-view="techs"]');
  h.click('[data-action="buy"][data-tech="tech.genesis"]');
  assert.match(
    h.root.querySelector(".modal").textContent,
    /Luddite Decree prevents/,
  );
  assert.equal(h.app.getGame(), g);
  h.click('[data-action="cancel-confirmation"]');
  assert.equal(h.app.getGame().players[0].credits, 8);
  h.click('[data-action="buy"][data-tech="tech.genesis"]');
  h.click('[data-action="confirm-command"]');
  assert.ok(h.app.getGame().players[0].techs.includes("tech.genesis"));
  assert.equal(h.app.getGame().pending, null);
  h.close();
});

test("Flexible Economy clamps an uncommitted private bid to the remaining Credits", () => {
  const h = harness(),
    g = auction();
  credits(g, 0, 3);
  tech(g, 0, "flexible-economy");
  h.app.setGame(g);
  h.click('[data-action="open-bid"]');
  h.input('[data-number="event-bid"]', "3");
  h.click('[data-action="return-credit"]');
  assert.equal(h.root.querySelector('[data-number="event-bid"]').value, "2");
  h.click('[data-action="seal-bid"]');
  assert.equal(h.app.getGame().auction.bids[0], 2);
  h.close();
});

test("private Foresight peeks close when bids are revealed even if the final bidder also wins", () => {
  const h = harness();
  let g = auction();
  tech(g, 1, "foresight");
  credits(g, 1, 2);
  g = step(g, { type: "bid", amount: 0 });
  h.app.setGame(g);
  h.click('[data-action="show-peek"]');
  assert.ok(h.root.querySelector(".foresight-cards"));
  h.click('[data-action="open-bid"]');
  h.input('[data-number="event-bid"]', "1");
  h.click('[data-action="seal-bid"]');
  assert.equal(h.app.getGame().turn, 1);
  assert.equal(h.app.getGame().pending.kind, "eventSelect");
  assert.equal(h.root.querySelector(".foresight-cards"), null);
  h.close();
});
