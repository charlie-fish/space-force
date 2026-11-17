import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { harness } from "./ui-harness.mjs";
import {
  ART,
  applyCommand,
  credits,
  fixture,
  settlement,
  ships,
  system,
} from "./helpers.mjs";

function targetGame() {
  const g = fixture(),
    s = g.systems[0];
  g.phase = "tech";
  credits(g, 0, 12);
  s.rotation = 2;
  s.extraWarp = true;
  s.extraHoles = 1;
  s.extraEdges = [3];
  g.features.warp = true;
  g.features.asteroid = true;
  ships(g, s, 1, 2);
  const planet = s.planets.findIndex((p) => !p.home);
  settlement(g, s, planet, 0, 1);
  s.planets.find((p, i) => !p.home && i !== planet).explore = "credit2";
  return applyCommand(g, 0, { type: "buy", tech: "tech.disruptor" });
}

function checkReferences(h) {
  const ids = [...h.root.querySelectorAll("[id]")].map((el) => el.id);
  assert.equal(
    ids.length,
    new Set(ids).size,
    "SVG definitions must not duplicate IDs",
  );
  for (const use of h.root.querySelectorAll(".system-preview use"))
    assert.ok(h.root.querySelector(use.getAttribute("href")));
  for (const image of h.root.querySelectorAll(
    ".system-preview image[clip-path]",
  )) {
    const id = image.getAttribute("clip-path").match(/#([^)]*)/)[1];
    assert.ok(h.root.querySelector(`#${id}`));
  }
}

test("Tech system previews show the committed board geometry and public pieces, and select without committing", () => {
  const h = harness(),
    g = targetGame(),
    s = g.systems[0];
  h.app.setGame(g);
  const preview = h.root.querySelector(`[data-preview-system="${s.id}"]`),
    board = h.root.querySelector(`#galaxy .system[data-system="${s.id}"]`);
  assert.ok(preview);
  assert.equal(preview.querySelector('[role="button"],[tabindex]'), null);
  for (const part of [
    ".fleet-badge",
    ".black-hole-token",
    ".asteroid-belt-token",
    ".warp-token",
    ".explore-token",
  ])
    assert.equal(
      preview.querySelectorAll(part).length,
      board.querySelectorAll(part).length,
      part,
    );
  assert.deepEqual(
    [...preview.querySelectorAll(".preview-chip")].map(
      (el) => el.dataset.owner,
    ),
    [...board.querySelectorAll(".stack-chip")].map((el) => el.dataset.owner),
  );
  assert.deepEqual(
    [
      ...preview.querySelectorAll("[data-preview-planet] .settlement-piece"),
    ].map((el) => el.getAttribute("transform")),
    [...board.querySelectorAll("[data-planet] .settlement-piece")].map((el) =>
      el.getAttribute("transform"),
    ),
  );
  assert.equal(
    preview.querySelector(".system-background > g").getAttribute("transform"),
    h.root
      .querySelector(`#galaxy [data-background-system="${s.id}"] > g`)
      .getAttribute("transform"),
  );
  assert.match(preview.getAttribute("aria-label"), /3 Ships/);
  checkReferences(h);
  const revision = g.revision;
  h.click(`[data-preview-system="${s.id}"]`);
  assert.equal(h.app.getGame().revision, revision);
  assert.equal(
    h.root.querySelector(".feature-options button").dataset.systemId,
    s.id,
  );
  assert.equal(
    h.root
      .querySelector(".feature-options button")
      .getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(h.root.querySelector(".feature-options").scrollLeft, 0);
  h.close();
});

test("hidden-system previews show only public backs and work when the Board view is absent", () => {
  const h = harness(),
    g = targetGame(),
    hidden = g.systems.find((s) => !s.revealed);
  h.app.setGame(g);
  for (const key of ["t", "e", "a", "p"]) {
    h.key("#status-box", key);
    assert.equal(h.root.querySelector("#galaxy"), null);
    const preview = h.root.querySelector(
      `[data-preview-system="${hidden.id}"]`,
    );
    assert.ok(preview.querySelector(`image[href="${ART.backs.system.image}"]`));
    assert.equal(
      preview.querySelector(
        'image[href="' + ART.systems[hidden.template].image + '"]',
      ),
      null,
    );
    assert.equal(preview.querySelector("[data-preview-planet]"), null);
    assert.equal(
      preview.querySelector(".black-hole-token,.warp-token,.explore-token"),
      null,
    );
    assert.doesNotMatch(
      preview.innerHTML,
      new RegExp(ART.systems[hidden.template].name),
    );
    assert.equal(preview.querySelector(".blank-sun") !== null, true);
    checkReferences(h);
  }
  const revision = h.app.getGame().revision;
  h.click(`[data-preview-system="${hidden.id}"]`);
  assert.equal(h.app.getGame().revision, revision);
  assert.equal(system(h.app.getGame(), hidden.id).revealed, false);
  h.close();
});

test("system previews update after a replaced position and keep miniature counts readable", () => {
  const h = harness(),
    g = targetGame(),
    s = g.systems[0];
  h.app.setGame(g);
  const selector = `[data-preview-system="${s.id}"]`;
  const initial = h.root.querySelector(selector).getAttribute("aria-label");
  h.click(selector);
  h.key("#status-box", "t");
  h.key("#status-box", "b");
  assert.equal(
    h.root.querySelector(selector).getAttribute("aria-label"),
    initial,
  );
  const changed = structuredClone(g),
    target = system(changed, s.id);
  ships(changed, target, 0, 1);
  h.app.setGame(changed);
  const preview = h.root.querySelector(selector);
  assert.match(preview.getAttribute("aria-label"), /4 Ships/);
  const font = Number.parseFloat(
    preview.style.getPropertyValue("--board-text-size"),
  );
  assert.ok((font * 96) / (Math.sqrt(3) * 100 + 24) >= 13.3333);
  assert.equal(
    preview.querySelector('[data-fleet-player="0"] text').textContent,
    "4",
  );
  assert.equal(g.systems[0].ships[0], 3);
  checkReferences(h);
  h.close();
});

test("Tech choices use a horizontal content-sized layout without fixed card-height or wide mobile gaps", () => {
  const css = readFileSync(
    new URL("../src/style.css", import.meta.url),
    "utf8",
  );
  for (const tech of ["genesis", "artificial-warp", "kessler-syndrome"]) {
    const h = harness(),
      g = fixture();
    g.phase = "tech";
    credits(g, 0, 12);
    const style = h.window.document.createElement("style");
    style.textContent = css;
    h.window.document.head.append(style);
    h.app.setGame(applyCommand(g, 0, { type: "buy", tech: `tech.${tech}` }));
    const flow = h.window.getComputedStyle(
      h.root.querySelector(".feature-options"),
    );
    assert.equal(flow.flexDirection, "row");
    assert.equal(flow.flexWrap, "nowrap");
    const button = h.root.querySelector(".feature-options button"),
      box = h.window.getComputedStyle(button);
    assert.equal(box.flexBasis, "auto");
    assert.equal(Number.parseFloat(box.minWidth), 0);
    assert.ok(Number.parseFloat(box.maxWidth) <= 176);
    if (tech === "genesis")
      assert.equal(
        h.window.getComputedStyle(button.querySelector("svg")).width,
        "44px",
      );
    if (tech === "artificial-warp") assert.equal(box.width, "112px");
    h.close();
  }
});
