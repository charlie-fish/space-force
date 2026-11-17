import test from "node:test";
import assert from "node:assert/strict";
import { harness } from "./ui-harness.mjs";
import {
  applyCommand,
  canMove,
  createGame,
  credits,
  fixture,
  setup,
  ships,
  step,
  system,
  tech,
} from "./helpers.mjs";
import { restoreGame } from "../work/compiled/persistence.js";
import old16 from "./fixtures/v0.16-tech-order-completed.json" with { type: "json" };

const tile = (id) => `#galaxy .system[data-system="${id}"]`;
function exploring() {
  const g = fixture(),
    from = system(g, g.players[0].home),
    target = g.systems.find((s) => !s.revealed && canMove(g, 0, from, s));
  g.systems.forEach((s) => (s.tokens = []));
  target.tokens = [0];
  g.systems.find((s) => s.id !== target.id).tokens = [1];
  return {
    g: step(g, {
      type: "resolve",
      action: "move",
      system: target.id,
      sources: { [from.id]: 1 },
    }),
    id: target.id,
  };
}
const angle = (h) =>
  Number(
    h.root
      .querySelector(".rotation-options strong")
      .textContent.replace("°", ""),
  );

test("all hex artwork precedes every placed component, including the five-player asteroid beside Clarke", () => {
  for (let count = 2; count <= 7; count++) {
    const h = harness();
    let g = setup(count),
      s = g.systems.find((s) => s.extraEdges.length) || g.systems[0];
    if (!s.extraEdges.length) {
      s.extraEdges = [0];
      g.features.asteroid = true;
    }
    s.extraHoles++;
    s.extraWarp = true;
    g.features.warp = true;
    g = step(g, { type: "plan", system: g.players[0].home });
    h.app.setGame(g);
    const backgrounds = [
        ...h.root.querySelectorAll("#galaxy .system-background image"),
      ],
      pieces = [
        ...h.root.querySelectorAll(
          "#galaxy .asteroid-belt-token,#galaxy .black-hole-token,#galaxy .warp-token,#galaxy .settlement-piece,#galaxy .fleet-badge,#galaxy .stack-chip",
        ),
      ];
    assert.equal(backgrounds.length, g.systems.length);
    assert.ok(pieces.length);
    for (const background of backgrounds)
      for (const piece of pieces)
        assert.ok(
          background.compareDocumentPosition(piece) &
            h.window.Node.DOCUMENT_POSITION_FOLLOWING,
        );
    assert.equal(
      h.root.querySelector("#galaxy").lastElementChild.classList.value,
      "system-labels",
    );
    assert.equal(
      h.root.querySelectorAll('#galaxy .system[role="button"]').length,
      g.systems.length,
    );
    h.close();
  }
});

test("Players and supply stays open during a draft but collapses for a new decision even when the same player goes again", () => {
  for (const consecutive of [false, true]) {
    const h = harness(),
      g = fixture(),
      s = g.systems[0];
    tech(g, 0, "flexible-economy");
    credits(g, 0, 2);
    if (consecutive) {
      s.tokens = [0, 0];
      g.systems[1].tokens = [];
    }
    h.app.setGame(g);
    assert.equal(h.root.querySelector(".player-roster").open, false);
    h.root.querySelector(".player-roster").open = true;
    h.click('[data-view="techs"]');
    assert.equal(h.root.querySelector(".player-roster").open, true);
    h.click('[data-view="board"]');
    h.click('#status-box [data-action="return-credit"]');
    assert.equal(h.root.querySelector(".player-roster").open, true);
    h.click(tile(s.id));
    h.click('[data-kind="attack"]');
    assert.equal(h.root.querySelector(".player-roster").open, true);
    h.click('[data-action="commit-action"]');
    assert.equal(h.app.getGame().turn, consecutive ? 0 : 1);
    assert.equal(h.root.querySelector(".player-roster").open, false);
    h.close();
  }
});

test("the supply summary distinguishes invested slots from additional free-action investments", () => {
  const h = harness(),
    g = fixture(),
    p = g.players[0];
  p.used = ["move", "produce", "attack"];
  p.investedActions = ["move", "produce"];
  p.freeInvestments = ["move", "settle"];
  p.invested = 4;
  p.reserve -= 4;
  h.app.setGame(g);
  const text = h.root.querySelector(
    '.player-roster [data-player="0"]',
  ).textContent;
  assert.match(text, /3\/4 slots used.*2 Invested/);
  assert.match(text, /\+2 from free actions/);
  assert.doesNotMatch(text, /4 Invested/);
  assert.match(
    h.root.querySelector('.player-roster [data-player="1"]').textContent,
    /0 Invested/,
  );
  h.close();
});

test("clicking the system being oriented previews clockwise rotations without committing and keeps the button alternatives", () => {
  const h = harness(),
    { g, id } = exploring();
  h.app.setGame(g);
  const initial = angle(h),
    other = g.systems.find((s) => s.id !== id).id;
  h.click(tile(other));
  assert.equal(angle(h), initial);
  h.click(tile(id));
  assert.equal(angle(h), (initial + 60) % 360);
  assert.equal(h.app.getGame(), g);
  const artwork = h.root.querySelector(
    `#galaxy [data-background-system="${id}"] > g`,
  );
  assert.equal(
    artwork.getAttribute("transform"),
    `rotate(${(initial + 60) % 360})`,
  );
  for (let i = 1; i < 6; i++) h.click(tile(id));
  assert.equal(angle(h), initial);
  h.click('[data-action="rotate-preview"][data-delta="-1"]');
  h.click('[data-action="rotate-preview"][data-delta="1"]');
  assert.equal(angle(h), initial);
  h.click('[data-action="commit-orientation"]');
  assert.equal(h.app.getGame().pending.kind, "move");
  assert.equal(system(h.app.getGame(), id).rotation, initial / 60);
  h.close();
});

test("orientation taps rotate once while tap jitter, synthetic clicks, pan, pinch and cancellation remain distinct", () => {
  const h = harness(),
    { g, id } = exploring();
  h.app.setGame(g);
  const initial = angle(h),
    selector = tile(id);
  h.pointer(selector, "pointerdown", 50, 50);
  h.pointer(selector, "pointermove", 54, 51);
  h.pointer(selector, "pointerup", 54, 51);
  assert.equal(angle(h), (initial + 60) % 360);
  h.click(selector);
  assert.equal(
    angle(h),
    (initial + 60) % 360,
    "the generated click must not rotate a second time",
  );
  h.pointer(selector, "pointerdown", 50, 50);
  h.pointer(selector, "pointerup", 50, 50);
  const preview = angle(h);
  assert.equal(preview, (initial + 120) % 360);
  h.pointer(selector, "pointerdown", 50, 50);
  h.pointer(selector, "pointermove", 90, 50);
  h.pointer(selector, "pointerup", 90, 50);
  assert.equal(angle(h), preview);
  h.pointer(selector, "pointerdown", 50, 50);
  h.pointer(selector, "pointerdown", 100, 50, 2);
  h.pointer(selector, "pointermove", 125, 50, 2);
  h.pointer(selector, "pointerup", 125, 50, 2);
  h.pointer(selector, "pointerup", 50, 50);
  assert.equal(angle(h), preview);
  h.pointer(selector, "pointerdown", 50, 50);
  h.pointer(selector, "pointercancel", 50, 50);
  assert.equal(angle(h), preview);
  assert.equal(h.app.getGame(), g);
  h.close();
});

test("a saved 0.18 black-hole Explore result adopts the new wording while preserving its committed effect", () => {
  let g = createGame(
      old16.players.length,
      old16.seed,
      old16.players.map((p) => p.name),
      old16.config,
    ),
    n = 0;
  g.confirmedTechRulesFrom = old16.revision;
  g.activeReserveChecksFrom = old16.revision;
  for (const { actor, command } of old16.commands) {
    g = applyCommand(g, actor, command);
    if (
      g.pending?.kind === "ack" &&
      g.pending.messages.some((m) => m.includes("A black hole"))
    ) {
      n = g.revision;
      break;
    }
  }
  assert.ok(n);
  const modern = restoreGame({
      ...old16,
      revision: n,
      commands: old16.commands.slice(0, n),
    }),
    saved = structuredClone(modern);
  saved.engine = "0.18.0";
  saved.pending.messages = saved.pending.messages.map((m) =>
    m.replace("A black hole is added", "A black hole remains"),
  );
  saved.log.forEach(
    (l) =>
      (l.text = l.text.replace(
        "A black hole is added",
        "A black hole remains",
      )),
  );
  const migrated = restoreGame(saved);
  assert.deepEqual(migrated, modern);
  assert.equal(
    migrated.pending.messages[0],
    "A black hole is added to this system. Existing Ships are unharmed.",
  );
  assert.deepEqual(
    step(migrated, { type: "acknowledge" }),
    step(modern, { type: "acknowledge" }),
  );
});
