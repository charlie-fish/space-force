import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import worker from "../dist/server/index.js";

// Run the actual deployment bundle with D1's statement/batch API. Schema is
// applied separately, matching hosted migration ownership rather than requests.
test("the built Worker serves cached assets and uses the migrated D1 binding for protected game transactions", async () => {
  const database = new DatabaseSync(":memory:");
  database.exec(
    readFileSync(
      new URL("../drizzle/0000_online.sql", import.meta.url),
      "utf8",
    ),
  );
  let inRequest = false;
  const DB = {
    prepare(sql) {
      assert.ok(
        !inRequest || !/^\s*(CREATE|ALTER|DROP)\b/i.test(sql),
        "Requests must not create schema",
      );
      return {
        values: [],
        bind(...values) {
          this.values = values;
          return this;
        },
        async all() {
          const stmt = database.prepare(sql);
          if (stmt.columns().length)
            return {
              results: stmt.all(...this.values),
              meta: {
                changes: Number(
                  database.prepare("SELECT changes() AS n").get().n,
                ),
              },
            };
          return {
            results: [],
            meta: { changes: Number(stmt.run(...this.values).changes) },
          };
        },
      };
    },
    async batch(statements) {
      database.exec("BEGIN IMMEDIATE");
      try {
        const results = [];
        for (const stmt of statements) results.push(await stmt.all());
        database.exec("COMMIT");
        return results;
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    },
  };
  const env = { DB };
  async function request(path, body, token, headers = {}) {
    inRequest = true;
    try {
      return await worker.fetch(
        new Request("https://space-force.test" + path, {
          method: body ? "POST" : "GET",
          headers: {
            ...headers,
            ...(body ? { "content-type": "application/json" } : {}),
            ...(token ? { authorization: `Bearer ${token}` } : {}),
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        }),
        env,
      );
    } finally {
      inRequest = false;
    }
  }
  try {
    const index = await request("/");
    assert.equal(index.status, 200);
    assert.match(await index.text(), /Space Force/);
    const etag = index.headers.get("etag");
    assert.equal(
      (await request("/", null, null, { "if-none-match": etag })).status,
      304,
    );
    assert.equal((await request("/api/health")).status, 200);
    const settings = {
      capacity: 2,
      visibility: "private",
      format: "async",
      techPreset: "random",
      events: "full",
      responseHours: 48,
      graceHours: 24,
    };
    const secrets = [
      crypto.randomUUID() + crypto.randomUUID(),
      crypto.randomUUID() + crypto.randomUUID(),
    ].map((s) => Buffer.from(s).toString("base64url").slice(0, 43));
    const a = await (
      await request("/api/rooms", { name: "One", secret: secrets[0], settings })
    ).json();
    const room = a.room.id;
    const b = await (
      await request(`/api/rooms/${room}/join`, {
        name: "Two",
        secret: secrets[1],
      })
    ).json();
    for (const token of secrets)
      assert.equal(
        (
          await request(
            `/api/rooms/${room}/ready`,
            { ready: true, settings },
            token,
          )
        ).status,
        200,
      );
    const reviewed = await (
      await request(`/api/rooms/${room}`, null, secrets[0])
    ).json();
    const started = await (
      await request(
        `/api/rooms/${room}/start`,
        { version: reviewed.room.version },
        secrets[0],
      )
    ).json();
    assert.equal(started.game.phase, "homes");
    assert.equal(
      started.clocks[0].eligibleAt - started.clocks[0].dueAt,
      24 * 3600000,
    );
    assert.equal("seed" in started.game, false);
    assert.equal((await request(`/api/rooms/${room}`)).status, 401);
    const home = started.game.systems.find(
      (s) => s.revealed && s.planets.some((p) => p.home),
    );
    const command = {
      id: crypto.randomUUID(),
      revision: started.game.revision,
      decisionId: started.decisionId,
      command: { type: "home", system: home.id },
    };
    assert.equal(
      (await request(`/api/rooms/${room}/command`, command, secrets[1])).status,
      403,
    );
    const committed = await (
      await request(`/api/rooms/${room}/command`, command, secrets[0])
    ).json();
    const retried = await (
      await request(`/api/rooms/${room}/command`, command, secrets[0])
    ).json();
    assert.equal(committed.snapshot.game.revision, 1);
    assert.equal(retried.snapshot.game.revision, 1);
    assert.equal(retried.accepted, command.id);
    assert.notEqual(a.you, b.you);
  } finally {
    database.close();
  }
});
