import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { ART, FAMILY } from "./helpers.mjs";
import cards from "../src/cards-data.json" with { type: "json" };
import manifest from "../src/art-data.json" with { type: "json" };

test("all self-hosted artwork references exist and system hit areas remain inside their source hex", () => {
  const items = [
    ...Object.values(manifest.systems),
    ...Object.values(manifest.cards),
    ...Object.values(manifest.aids),
    ...Object.values(manifest.backs),
    manifest.cover,
  ];
  assert.equal(items.length, 80);
  for (const item of items) {
    const file = new URL(`../public${item.image}`, import.meta.url);
    assert.equal(statSync(file).size, item.bytes, item.image);
    assert.equal(readFileSync(file).subarray(0, 4).toString(), "RIFF");
    assert.ok(item.width > 0 && item.height > 0);
  }
  for (const s of Object.values(ART.systems))
    for (const p of [s.sun, ...s.planets]) {
      assert.ok(p.x > 0 && p.x < 1 && p.y > 0 && p.y < 1, s.name);
      assert.ok(p.radiusX > 0 && p.radiusY > 0);
    }
});

test("Family market matches the supplied preset; other cards remain reference data only", () => {
  assert.equal(cards.techs.length, 30);
  assert.equal(cards.events.length, 30);
  assert.equal(
    new Set([...cards.techs, ...cards.events].map((c) => c.id)).size,
    60,
  );
  assert.deepEqual(
    FAMILY.slice().sort(),
    cards.presets["preset.family"].techIds.slice().sort(),
  );
  for (const id of FAMILY)
    assert.ok(cards.techs.find((c) => c.id === id)?.text);
});
