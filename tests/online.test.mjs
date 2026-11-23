import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sqliteStore } from "../server/sqlite.mjs";
import { createOnlineServer } from "../server/node.mjs";
import {
  OnlineService,
  decisionActor,
} from "../work/compiled/online/service.js";
import { handleApi } from "../work/compiled/online/http.js";
import { botCommand, step, setup, tech, replayGame } from "./helpers.mjs";

const HOUR = 3_600_000,
  MINUTE = 60_000;
const key = () =>
  Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");
const settings = (overrides = {}) => ({
  capacity: 7,
  visibility: "public",
  format: "live",
  techPreset: "random",
  events: "full",
  responseHours: 48,
  graceHours: 24,
  ...overrides,
});

test("concurrent retries reuse a single room and seat, while new setups reject the retired scenarios", async () => {
  const db = sqliteStore(),
    api = new OnlineService(db.store),
    secret = key();
  try {
    const body = { name: "Host", secret, settings: settings() };
    const [a, b] = await Promise.all([api.create(body), api.create(body)]);
    assert.equal(a.room.id, b.room.id);
    assert.equal(a.you, b.you);
    const joining = { name: "Guest", secret: key() };
    const [c, d] = await Promise.all([
      api.join(a.room.id, joining),
      api.join(a.room.id, joining),
    ]);
    assert.equal(c.you, d.you);
    assert.equal((await db.store.get(a.room.id)).members.length, 2);
    await assert.rejects(
      () =>
        api.create({
          ...body,
          secret: key(),
          settings: settings({ techPreset: "chains" }),
        }),
      /rulebook Tech preset/,
    );
    await assert.rejects(
      () =>
        api.create({
          ...body,
          secret: key(),
          settings: settings({ events: "foresight-test" }),
        }),
      /Random Events or No Events/,
    );
  } finally {
    db.close();
  }
});
async function table(count = 3, options = {}) {
  let time = 1_000_000;
  const db = sqliteStore(options.path),
    api = new OnlineService(db.store, () => time),
    players = [];
  for (let i = 0; i < count; i++) {
    const secret = key();
    const snapshot = i
      ? await api.join(players[0].snapshot.room.id, {
          name: `Player ${i + 1}`,
          secret,
        })
      : await api.create({
          name: "Player 1",
          secret,
          settings: settings(options.settings),
        });
    players.push({ secret, id: snapshot.you, snapshot });
  }
  const roomId = players[0].snapshot.room.id;
  for (const p of players)
    await api.lobbyAction(roomId, p.id, "ready", {
      ready: true,
      settings: settings(options.settings),
    });
  let ready = await api.get(roomId, players[0].id);
  await api.lobbyAction(roomId, players[0].id, "start", {
    version: ready.room.version,
  });
  return {
    db,
    api,
    players,
    roomId,
    time: () => time,
    advance: (ms) => (time += ms),
    close: db.close,
  };
}
async function send(t, playerId, command, extra = {}) {
  const member = t.players[playerId],
    snapshot = await t.api.get(t.roomId, member.id);
  return t.api.command(t.roomId, member.id, {
    id: crypto.randomUUID(),
    revision: snapshot.game.revision,
    decisionId: snapshot.decisionId,
    command,
    confirmIntent: true,
    confirmReserve: true,
    ...extra,
  });
}

test("public discovery excludes private rooms, credentials are hashed and projected state hides every unrevealed system/token/deck", async () => {
  const t = await table(3, { settings: { visibility: "private" } });
  try {
    assert.equal((await t.api.list()).length, 0);
    const room = await t.db.store.get(t.roomId),
      view = await t.api.get(t.roomId, t.players[0].id);
    for (const field of ["seed", "rng", "events", "exploreBag", "commands"])
      assert.equal(field in view.game, false, field);
    for (const s of view.game.systems.filter((s) => !s.revealed)) {
      assert.equal(s.template, null);
      assert.deepEqual(s.planets, []);
    }
    assert.notEqual(room.game.seed, 0);
    const credentials = (
      await t.db.store.db.query("SELECT token_hash FROM sf_credentials")
    ).results;
    assert.ok(credentials.every((row) => row.token_hash.length === 64));
    assert.ok(!JSON.stringify(credentials).includes(t.players[0].secret));
    await assert.rejects(() => t.api.authenticate(t.roomId, key()), /invalid/);
    const fake = await handleApi(
      new Request(`https://game.test/api/rooms/${t.roomId}`),
      t.api,
    );
    assert.equal(fake.status, 401);
    const foreign = await handleApi(
      new Request("https://game.test/api/rooms", {
        headers: { Origin: "https://evil.test" },
      }),
      t.api,
    );
    assert.equal(foreign.status, 403);
  } finally {
    t.close();
  }
});

test("the final seat is claimed once under concurrent joins and an active room cannot accept another player", async () => {
  const db = sqliteStore(),
    api = new OnlineService(db.store);
  try {
    const a = await api.create({
      name: "Host",
      secret: key(),
      settings: settings({ capacity: 2 }),
    });
    const joined = await Promise.allSettled([
      api.join(a.room.id, { name: "A", secret: key() }),
      api.join(a.room.id, { name: "B", secret: key() }),
    ]);
    assert.equal(joined.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal((await db.store.get(a.room.id)).members.length, 2);
    const b = joined.find((r) => r.status === "fulfilled").value;
    for (const p of [a, b])
      await api.lobbyAction(a.room.id, p.you, "ready", {
        ready: true,
        settings: a.room.settings,
      });
    const ready = await api.get(a.room.id, a.you);
    await api.lobbyAction(a.room.id, a.you, "start", {
      version: ready.room.version,
    });
    await assert.rejects(
      () => api.join(a.room.id, { name: "Late", secret: key() }),
      /already started/,
    );
  } finally {
    db.close();
  }
});

test("ready checks bind to reviewed settings and starting rejects stale rosters or unready players", async () => {
  const db = sqliteStore(),
    api = new OnlineService(db.store);
  try {
    const a = await api.create({
      name: "A",
      secret: key(),
      settings: settings(),
    });
    const b = await api.join(a.room.id, { name: "B", secret: key() });
    await assert.rejects(
      () =>
        api.lobbyAction(a.room.id, a.you, "start", { version: b.room.version }),
      /ready/,
    );
    for (const p of [a, b])
      await api.lobbyAction(a.room.id, p.you, "ready", {
        ready: true,
        settings: a.room.settings,
      });
    const previous = await api.get(a.room.id, a.you);
    const changed = settings({ format: "async" });
    await api.lobbyAction(a.room.id, a.you, "settings", { settings: changed });
    assert.ok(
      (await api.get(a.room.id, a.you)).room.members.every((m) => !m.ready),
    );
    await assert.rejects(
      () =>
        api.lobbyAction(a.room.id, b.you, "ready", {
          ready: true,
          settings: a.room.settings,
        }),
      /Settings changed/,
    );
    for (const p of [a, b])
      await api.lobbyAction(a.room.id, p.you, "ready", {
        ready: true,
        settings: changed,
      });
    await assert.rejects(
      () =>
        api.lobbyAction(a.room.id, a.you, "start", {
          version: previous.room.version,
        }),
      /roster changed/,
    );
  } finally {
    db.close();
  }
});

test("accepted command IDs deduplicate lost responses, reject changed payloads and prevent acting for another seat", async () => {
  const t = await table();
  try {
    const a = await t.api.get(t.roomId, t.players[0].id),
      g = (await t.db.store.get(t.roomId)).game;
    const command = botCommand(g),
      request = {
        id: crypto.randomUUID(),
        revision: g.revision,
        decisionId: a.decisionId,
        command,
      };
    await assert.rejects(
      () => t.api.command(t.roomId, t.players[1].id, request),
      /not your decision/,
    );
    const first = await t.api.command(t.roomId, t.players[0].id, request);
    const retry = await t.api.command(t.roomId, t.players[0].id, request);
    assert.equal(retry.accepted, first.accepted);
    assert.equal(retry.snapshot.game.revision, first.snapshot.game.revision);
    await assert.rejects(
      () =>
        t.api.command(t.roomId, t.players[0].id, {
          ...request,
          command: { type: "home", system: "different" },
        }),
      /already used/,
    );
    await assert.rejects(
      () =>
        t.api.command(t.roomId, t.players[1].id, {
          ...request,
          id: crypto.randomUUID(),
          command: { type: "forfeit", player: 0 },
        }),
      /not available/,
    );
  } finally {
    t.close();
  }
});

test("all seven players can submit private bids concurrently and only the winner pays after simultaneous reveal", async () => {
  const t = await table(7);
  try {
    let room = await t.db.store.get(t.roomId);
    while (room.game.pending?.kind !== "bid") {
      const actor = decisionActor(room.game, room.game.turn);
      await send(t, actor, botCommand(room.game));
      room = await t.db.store.get(t.roomId);
    }
    const snapshots = await Promise.all(
      t.players.map((p) => t.api.get(t.roomId, p.id)),
    );
    const amounts = room.game.players.map((p) => Math.min(p.id, p.credits)),
      credits = room.game.players.map((p) => p.credits);
    const r = await t.api.command(t.roomId, t.players[6].id, {
      id: crypto.randomUUID(),
      revision: room.game.revision,
      decisionId: snapshots[6].decisionId,
      command: { type: "bid", amount: amounts[6] },
    });
    assert.equal(r.snapshot.game.auction.bids[6], amounts[6]);
    const hidden = await t.api.get(t.roomId, t.players[0].id);
    assert.equal(hidden.game.auction.bids[6], 0);
    assert.deepEqual(
      (await t.db.store.get(t.roomId)).game.players.map((p) => p.credits),
      credits,
    );
    await Promise.all(
      t.players.slice(0, 6).map((p, i) =>
        t.api.command(t.roomId, p.id, {
          id: crypto.randomUUID(),
          revision: room.game.revision,
          decisionId: snapshots[i].decisionId,
          command: { type: "bid", amount: amounts[i] },
        }),
      ),
    );
    const revealed = await t.api.get(t.roomId, t.players[0].id),
      winner = amounts.indexOf(Math.max(...amounts));
    assert.equal(revealed.game.pending.kind, "eventSelect");
    assert.deepEqual(revealed.game.auction.bids, amounts);
    assert.deepEqual(
      revealed.game.players.map((p) => p.credits),
      credits.map((n, i) => n - (i === winner ? amounts[i] : 0)),
    );
  } finally {
    t.close();
  }
});

test("asynchronous windows persist across restart, ignore five-minute disconnection and keep a 24-hour grace period", async () => {
  const directory = mkdtempSync(join(tmpdir(), "space-force-online-")),
    path = join(directory, "games.sqlite");
  const t = await table(3, { path, settings: { format: "async" } });
  let reopened;
  try {
    const original = await t.api.get(t.roomId, t.players[0].id),
      due = original.clocks[0].dueAt;
    t.advance(6 * MINUTE);
    assert.ok(
      !(await t.api.get(t.roomId, t.players[1].id)).removals.find(
        (r) => r.memberId === t.players[0].id,
      ).eligible,
    );
    t.advance(48 * HOUR - 6 * MINUTE);
    let state = await t.api.get(t.roomId, t.players[1].id);
    assert.equal(state.clocks[0].dueAt, due);
    assert.equal(state.clocks[0].warning, true);
    assert.equal(
      state.removals.find((r) => r.memberId === t.players[0].id).eligible,
      false,
    );
    t.close();
    reopened = sqliteStore(path);
    const api = new OnlineService(reopened.store, t.time);
    assert.equal(
      await api.authenticate(t.roomId, t.players[0].secret),
      t.players[0].id,
    );
    t.advance(24 * HOUR);
    state = await api.get(t.roomId, t.players[0].id);
    assert.equal(
      state.clocks[0].dueAt,
      due,
      "reopening the app does not postpone the asynchronous decision",
    );
    assert.equal(
      state.removals.find((r) => r.memberId === t.players[0].id).eligible,
      true,
    );
    state = await api.playAction(t.roomId, t.players[1].id, "vote-remove", {
      member: t.players[0].id,
    });
    assert.equal(state.game.players[0].forfeited, undefined);
    state = await api.playAction(t.roomId, t.players[2].id, "vote-remove", {
      member: t.players[0].id,
    });
    assert.equal(state.game.players[0].forfeited, true);
    const delegate = await api.get(t.roomId, t.players[1].id);
    assert.equal(delegate.canAct, true);
    assert.equal(delegate.actingFor, 0);
    const full = await reopened.store.get(t.roomId),
      home = botCommand(full.game);
    const result = await api.command(t.roomId, t.players[1].id, {
      id: crypto.randomUUID(),
      revision: full.game.revision,
      decisionId: delegate.decisionId,
      command: home,
    });
    assert.equal(result.snapshot.game.players[0].reserve, 34);
    assert.equal(
      result.snapshot.game.players[1].reserve,
      40,
      "delegation spends the original player's resources",
    );
  } finally {
    reopened?.close();
    try {
      t.close();
    } catch {}
    rmSync(directory, { recursive: true, force: true });
  }
});

test("live inactivity warns at four minutes, requires a strict majority, and a reconnect cancels old approvals", async () => {
  const t = await table();
  try {
    t.advance(4 * MINUTE);
    let state = await t.api.get(t.roomId, t.players[1].id);
    await t.api.get(t.roomId, t.players[2].id);
    assert.equal(state.clocks[0].warning, true);
    assert.equal(
      state.removals.find((v) => v.memberId === t.players[0].id).eligible,
      false,
    );
    t.advance(MINUTE);
    for (const p of t.players.slice(1)) await t.api.get(t.roomId, p.id);
    state = await t.api.playAction(t.roomId, t.players[1].id, "vote-remove", {
      member: t.players[0].id,
    });
    assert.equal(
      state.removals.find((v) => v.memberId === t.players[0].id).yes.length,
      1,
    );
    assert.equal(state.game.players[0].forfeited, undefined);
    await t.api.get(t.roomId, t.players[0].id);
    await assert.rejects(
      () =>
        t.api.playAction(t.roomId, t.players[2].id, "vote-remove", {
          member: t.players[0].id,
        }),
      /not currently available/,
    );
    t.advance(5 * MINUTE);
    for (const p of t.players.slice(1)) await t.api.get(t.roomId, p.id);
    state = await t.api.playAction(t.roomId, t.players[2].id, "vote-remove", {
      member: t.players[0].id,
    });
    assert.equal(
      state.removals.find((v) => v.memberId === t.players[0].id).yes.length,
      1,
      "old votes do not revive",
    );
  } finally {
    t.close();
  }
});

test("an agreed pause freezes decisions and removal; resuming retains the remaining response time", async () => {
  const t = await table(3, { settings: { format: "async" } });
  try {
    const before = (await t.api.get(t.roomId, t.players[0].id)).clocks[0].dueAt;
    for (const p of t.players)
      await t.api.playAction(t.roomId, p.id, "pause", {});
    t.advance(80 * HOUR);
    let paused = await t.api.get(t.roomId, t.players[0].id);
    assert.equal(paused.paused, true);
    assert.equal(paused.canAct, false);
    assert.ok(paused.removals.every((v) => !v.eligible));
    paused = await t.api.playAction(t.roomId, t.players[1].id, "pause", {
      resume: true,
    });
    assert.equal(paused.clocks[0].dueAt, before + 80 * HOUR);
  } finally {
    t.close();
  }
});

test("forfeiture removes every unresolved action token, preserves other pieces and resolves first-player Economy order", () => {
  let g = setup(3, 7, {
    techPreset: "family",
    scenario: "standard",
    events: "simpler",
  });
  g.phase = "tech";
  g.turn = 0;
  g.systems[0].tokens = [0, 1, 0, 2];
  tech(g, 0, "patents");
  const ships = g.systems.map((s) => s.ships.slice()),
    planets = g.systems.map((s) => s.planets.map((p) => p.owners.slice()));
  g = step(g, { type: "forfeit", player: 0 });
  assert.equal(g.turn, 1);
  assert.equal(g.phase, "tech");
  assert.equal(g.first, 1);
  assert.deepEqual(g.systems[0].tokens, [1, 2]);
  assert.deepEqual(
    g.systems.map((s) => s.ships),
    ships,
  );
  assert.deepEqual(
    g.systems.map((s) => s.planets.map((p) => p.owners)),
    planets,
  );
  assert.ok(g.players[0].techs.includes("tech.patents"));
  g = step(g, { type: "buy", tech: null });
  assert.equal(g.turn, 2);
  assert.equal(g.phase, "tech");
  g = step(g, { type: "buy", tech: null });
  assert.equal(g.phase, "reinforce");
  assert.equal(g.turn, 1);
});

test("last-player victory bypasses pending endgame choices and records position scores separately", async () => {
  const t = await table(3);
  try {
    await t.api.playAction(t.roomId, t.players[0].id, "resign", {});
    const state = await t.api.playAction(
      t.roomId,
      t.players[2].id,
      "resign",
      {},
    );
    assert.equal(state.game.phase, "finished");
    assert.equal(state.game.endReason, "last_player_remaining");
    assert.deepEqual(state.game.winners, [1]);
    assert.equal(state.game.scores.length, 3);
    await assert.rejects(
      () => send(t, 0, { type: "home", system: "bad" }),
      /forfeited|not your decision/,
    );
  } finally {
    t.close();
  }
});

test("complete live and asynchronous server games retain rules, limited supplies, final scores and replay", async () => {
  for (const format of ["live", "async"]) {
    const t = await table(7, { settings: { format, techPreset: "random" } });
    try {
      let room = await t.db.store.get(t.roomId);
      for (let n = 0; n < 1800 && room.game.phase !== "finished"; n++) {
        const owner = room.game.turn,
          actor = decisionActor(room.game, owner);
        await send(t, actor, botCommand(room.game));
        room = await t.db.store.get(t.roomId);
      }
      assert.equal(room.game.phase, "finished");
      assert.equal(room.game.round <= 5, true);
      assert.equal(room.members.length, 7);
      assert.equal(room.game.scores.length, 7);
      assert.ok(room.game.winners.length > 0);
      assert.deepEqual(replayGame(room.game), room.game);
    } finally {
      t.close();
    }
  }
});

test("the real HTTP server serves seven isolated clients and persists their seats without sharing credentials", async () => {
  const app = createOnlineServer({ path: ":memory:" });
  await new Promise((resolve) => app.server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const post = async (path, data, token) =>
    fetch(base + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });
  try {
    const people = [];
    for (let i = 0; i < 7; i++) {
      const token = key();
      const response = await post(
        i ? `/api/rooms/${people[0].state.room.id}/join` : "/api/rooms",
        {
          name: `HTTP ${i}`,
          secret: token,
          ...(!i ? { settings: settings() } : {}),
        },
      );
      assert.equal(response.status, 201);
      people.push({ token, state: await response.json() });
    }
    const roomId = people[0].state.room.id;
    for (const person of people) {
      const r = await post(
        `/api/rooms/${roomId}/ready`,
        { ready: true, settings: settings() },
        person.token,
      );
      assert.equal(r.status, 200);
    }
    const host = await (
      await fetch(`${base}/api/rooms/${roomId}`, {
        headers: { Authorization: `Bearer ${people[0].token}` },
      })
    ).json();
    const started = await post(
      `/api/rooms/${roomId}/start`,
      { version: host.room.version },
      people[0].token,
    );
    assert.equal(started.status, 200);
    const states = await Promise.all(
      people.map((p) =>
        fetch(`${base}/api/rooms/${roomId}`, {
          headers: { Authorization: `Bearer ${p.token}` },
        }).then((r) => r.json()),
      ),
    );
    assert.equal(new Set(states.map((s) => s.you)).size, 7);
    assert.equal(states.filter((s) => s.canAct).length, 1);
    const all = JSON.stringify(states);
    for (const person of people) assert.ok(!all.includes(person.token));
    assert.ok(states.every((s) => !s.game.seed && !s.game.commands));
    const denied = await post(
      `/api/rooms/${roomId}/command`,
      {
        id: crypto.randomUUID(),
        revision: states[0].game.revision,
        decisionId: states[0].decisionId,
        command: botCommand((await app.service.store.get(roomId)).game),
      },
      people[1].token,
    );
    assert.equal(denied.status, 403);
  } finally {
    await app.close();
  }
});

test("a response or reconnect that wins the transaction cancels a racing final removal vote", async () => {
  for (const response of ["ack", "home"]) {
    const t = await table();
    try {
      t.advance(5 * MINUTE);
      for (const p of t.players.slice(1)) await t.api.get(t.roomId, p.id);
      await t.api.playAction(t.roomId, t.players[1].id, "vote-remove", {
        member: t.players[0].id,
      });
      const original = t.db.store.db.batch.bind(t.db.store.db);
      let release, entered;
      const held = new Promise((r) => (release = r)),
        reached = new Promise((r) => (entered = r));
      let intercepted = false;
      t.db.store.db.batch = async (queries) => {
        if (
          !intercepted &&
          queries[0]?.sql.startsWith("UPDATE sf_rooms") &&
          String(queries[0].params[5]).includes('"forfeited":true')
        ) {
          intercepted = true;
          entered();
          await held;
        }
        return original(queries);
      };
      const vote = t.api.playAction(t.roomId, t.players[2].id, "vote-remove", {
        member: t.players[0].id,
      });
      const rejection = assert.rejects(vote, /not currently available/);
      await reached;
      if (response === "ack")
        await t.api.playAction(t.roomId, t.players[0].id, "ack-presence", {});
      else await send(t, 0, botCommand((await t.db.store.get(t.roomId)).game));
      release();
      await rejection;
      assert.equal(
        (await t.db.store.get(t.roomId)).game.players[0].forfeited,
        undefined,
      );
    } finally {
      t.close();
    }
  }
});

test("a removed first player still receives a delegated home and the remaining game completes with exact replay", async () => {
  const t = await table(3, {
    settings: { format: "async", events: "simpler" },
  });
  try {
    await t.api.playAction(t.roomId, t.players[0].id, "resign", {});
    let room = await t.db.store.get(t.roomId);
    assert.equal(decisionActor(room.game, room.game.turn), 1);
    for (let n = 0; n < 1500 && room.game.phase !== "finished"; n++) {
      await send(
        t,
        decisionActor(room.game, room.game.turn),
        botCommand(room.game),
      );
      room = await t.db.store.get(t.roomId);
    }
    assert.equal(room.game.phase, "finished");
    assert.equal(room.game.players[0].forfeited, true);
    assert.ok(room.game.players[0].home);
    assert.ok(!room.game.winners.includes(0));
    assert.ok(room.game.systems.every((s) => !s.tokens.includes(0)));
    assert.deepEqual(replayGame(room.game), room.game);
  } finally {
    t.close();
  }
});
