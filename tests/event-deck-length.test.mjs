import test from "node:test";
import assert from "node:assert/strict";
import { harness } from "./ui-harness.mjs";
import { EVENT_BATCHES } from "../work/compiled/events.js";
import { restoreGame } from "../work/compiled/persistence.js";
import old from "./fixtures/v0.21-four-player-batch.json" with { type: "json" };
import {
  createGame,
  setup,
  step,
  botCommand,
  replayGame,
  scoreGame,
} from "./helpers.mjs";

const config = {
  techPreset: "remaining",
  scenario: "standard",
  events: "full",
};

test("all new Event modes and test pools deal ten cards for 2–3 players and eight for 4–7", () => {
  for (let count = 2; count <= 7; count++)
    for (const events of [undefined, "simpler", "foresight-test", "full"])
      for (const eventBatch of events === "full"
        ? ["standard", ...Object.keys(EVENT_BATCHES)]
        : ["standard"]) {
        const g = createGame(count, 41, [], { ...config, events, eventBatch });
        assert.equal(g.initialEventCards, count <= 3 ? 10 : 8);
        assert.equal(g.events.length, g.initialEventCards);
        assert.equal(g.roundLimit, count <= 3 ? 6 : 5);
        assert.deepEqual(replayGame(g), g);
      }
});

test("the last Economy and final results occur in round five for 4–7 players and round six for 2–3", () => {
  for (let count = 2; count <= 7; count++) {
    let g = setup(count, 41, { ...config, eventBatch: "batch-1" });
    for (let n = 0; n < 1400 && g.phase !== "finished"; n++)
      g = step(g, botCommand(g));
    assert.equal(g.phase, "finished");
    assert.equal(g.round, count <= 3 ? 6 : 5);
    assert.equal(g.finalEconomy, true);
    assert.equal(g.events.length, 0);
    assert.equal(g.eventSelections.length, count <= 3 ? 5 : 4);
    assert.deepEqual(replayGame(g), g);
  }
});

test("an actual 0.21 ten-card four-player save preserves its original deck, six-round schedule and final scores", () => {
  let g = restoreGame(old.game);
  assert.equal(g.engine, "1.1.0");
  assert.equal(g.initialEventCards, 10);
  assert.equal(g.roundLimit, 6);
  for (const key of [
    "events",
    "systems",
    "players",
    "commands",
    "eventSelections",
    "round",
    "phase",
    "pending",
  ])
    assert.deepEqual(g[key], old.game[key], key);
  assert.deepEqual(replayGame(g), g);
  const h = harness();
  h.app.setGame(g);
  assert.match(
    h.root.querySelector(".legacy-event-setup").textContent,
    /ten-card.*original deck.*six-round/,
  );
  h.close();
  for (let n = 0; n < 1400 && g.phase !== "finished"; n++)
    g = step(g, botCommand(g));
  assert.equal(g.phase, "finished");
  assert.equal(g.round, 6);
  assert.deepEqual(scoreGame(g), old.finalScores);
  assert.deepEqual(g.winners, old.finalWinners);
  assert.deepEqual(restoreGame(JSON.parse(JSON.stringify(g))), g);
  const fresh = createGame(4, old.game.seed, [], old.game.config);
  assert.equal(fresh.events.length, 8);
  assert.equal(fresh.roundLimit, 5);
});

test("random Event setup deals eight cards for seven players and the Event view shows that limit", () => {
  const h = harness();
  h.click('[data-action="count"][data-count="7"]');
  assert.equal(h.root.querySelector('[data-setting="event-batch"]'), null);
  h.root
    .querySelector("#setup-form")
    .dispatchEvent(
      new h.window.Event("submit", { bubbles: true, cancelable: true }),
    );
  assert.equal(h.app.getGame().events.length, 8);
  assert.equal(h.app.getGame().config.eventBatch, "standard");
  h.click('[data-view="event"]');
  assert.match(h.root.textContent, /8 initially/);
  h.close();
});
