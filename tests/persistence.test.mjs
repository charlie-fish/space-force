import test from "node:test";
import assert from "node:assert/strict";
import { restoreGame } from "../work/compiled/persistence.js";
import legacy from "./fixtures/v0.8-first-round.json" with { type: "json" };

test("real 0.8 saves migrate through setup, drafts, hidden reveals and the Event boundary", () => {
  for (const checkpoint of legacy.checkpoints) {
    const old = {
      ...legacy,
      commands: legacy.commands.slice(0, checkpoint.commands),
      revision: checkpoint.commands,
    };
    const restored = restoreGame(old);
    assert.equal(restored.engine, "0.21.0");
    assert.equal(restored.phase, checkpoint.phase);
    assert.equal(restored.pending?.kind ?? null, checkpoint.pending);
    assert.equal(restored.players.length, 3);
    assert.equal(restored.round, 1);
  }
  assert.throws(() =>
    restoreGame({ ...legacy, content: "unsupported-variant" }),
  );
});
