import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import baseline from "./fixtures/v0.22-compatibility.json" with { type: "json" };
import oldAuction from "./fixtures/v0.22-auction-checkpoint.json" with { type: "json" };
import {
  queryPosition,
  querySnapshot,
  completePosition,
  unchangedState,
} from "./performance-cases.mjs";
import {
  RELEASE_VERSION,
  GAME_SCHEMA,
  GAME_CONTENT,
} from "../work/compiled/version.js";
import { restoreGame } from "../work/compiled/persistence.js";
import { createGame, replayGame } from "./helpers.mjs";

const digest = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
function freeze(value) {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

for (const record of baseline.queries)
  test(`read-only ${record.count}-player targets and artwork match the captured 0.22 results without mutating frozen state`, () => {
    const g = freeze(queryPosition(record.count));
    assert.equal(digest(querySnapshot(g)), record.sha256);
  });

for (const record of baseline.games)
  test(`the major milestone preserves every committed state field of the 0.22 ${record.count}-player ${record.batch} game`, () => {
    const g = completePosition(record.count, record.batch);
    assert.equal(digest(unchangedState(g)), record.sha256);
    assert.deepEqual(g.scores, record.scores);
    assert.deepEqual(g.winners, record.winners);
    assert.deepEqual(replayGame(g), g);
  });

test("the release, package and saved-state identities agree while rules/content stay compatible", () => {
  const pkg = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  );
  const g = createGame(7);
  assert.equal(RELEASE_VERSION, "1.1.0");
  assert.equal(pkg.version, RELEASE_VERSION);
  assert.equal(g.engine, RELEASE_VERSION);
  assert.equal(g.schema, GAME_SCHEMA);
  assert.equal(g.content, GAME_CONTENT);
  assert.equal(g.schema, oldAuction.schema);
  assert.equal(g.content, oldAuction.content);
});

test("a genuine 0.22 sealed-auction checkpoint resumes in 1.0 with all pieces, private bids and pending decisions preserved", () => {
  const g = restoreGame(freeze(structuredClone(oldAuction)));
  assert.equal(g.engine, RELEASE_VERSION);
  assert.deepEqual(unchangedState(g), unchangedState(oldAuction));
  assert.equal(g.pending.kind, "bid");
  assert.equal(g.auction.bids[0], 0);
  assert.equal(g.auction.bids[1], null);
  assert.deepEqual(replayGame(g), g);
  assert.deepEqual(restoreGame(JSON.parse(JSON.stringify(g))), g);
  assert.throws(() => restoreGame({ ...oldAuction, schema: 10 }));
  assert.throws(() => restoreGame({ ...oldAuction, content: "unrecognised" }));
});
