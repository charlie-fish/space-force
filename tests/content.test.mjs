import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { ART, FAMILY } from "./helpers.mjs";
import cards from "../src/cards-data.json" with { type: "json" };
import manifest from "../src/art-data.json" with { type: "json" };
import {
  findOpenSpace,
  obstacles,
  rotatePoint,
  HEX_WIDTH,
} from "../work/compiled/geometry.js";

test("all self-hosted artwork references exist and system hit areas remain inside their source hex", () => {
  const items = [
    ...Object.values(manifest.systems),
    ...Object.values(manifest.cards),
    ...Object.values(manifest.aids),
    ...Object.values(manifest.backs),
    ...Object.values(manifest.features),
    manifest.firstPlayer,
    manifest.cover,
  ];
  assert.equal(items.length, 83);
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

test("settlement anchors cover all 142 printed capacity indicators and rotate with their hex", () => {
  let total = 0;
  for (const tile of Object.values(ART.systems))
    for (const p of tile.planets) {
      assert.equal(p.settlementSlots.length, p.capacity);
      for (const slot of p.settlementSlots) {
        assert.ok(
          Math.hypot((slot.x - p.x) / p.radiusX, (slot.y - p.y) / p.radiusY) <
            1,
        );
        const point = rotatePoint(slot.x, slot.y, 0);
        assert.ok(Math.abs(point.x - (slot.x - 0.5) * HEX_WIDTH) < 0.000001);
        const turned = rotatePoint(slot.x, slot.y, 6);
        assert.ok(
          Math.hypot(turned.x - point.x, turned.y - point.y) < 0.000001,
        );
        total++;
      }
    }
  assert.equal(total, 142);
  assert.equal(ART.firstPlayer.stages.length, 5);
});

test("Planet Nine uses available empty space across source systems instead of covering a planet centre", () => {
  for (const tile of Object.values(ART.systems)) {
    const s = {
      template: tile.id,
      planets: tile.planets,
      ships: [],
      extraHoles: 0,
      extraWarp: false,
    };
    const p = findOpenSpace(s, 0.18, 0.156);
    for (const planet of tile.planets)
      assert.ok(
        Math.hypot(
          (p.x - planet.x) / planet.radiusX,
          (p.y - planet.y) / planet.radiusY,
        ) > 1,
        tile.name,
      );
    assert.ok(p.x > 0 && p.x < 1 && p.y > 0 && p.y < 1);
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
