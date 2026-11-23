import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { createOnlineServer } from "../server/node.mjs";
import { OnlineClient } from "../work/compiled/online/client.js";
import { mountGameClient } from "../work/compiled/lobby.js";
import { botCommand, setup, tech } from "./helpers.mjs";

async function eventually(check) {
  for (let n = 0; n < 100; n++) {
    if (await check()) return;
    await new Promise((r) => setTimeout(r, 10));
  }
  assert.fail("The interface did not reach its expected state");
}
async function server() {
  const app = createOnlineServer({ path: ":memory:" });
  await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
  return { ...app, base: `http://127.0.0.1:${app.server.address().port}/api` };
}
function browser(base, options = {}) {
  const dom = new JSDOM(
    '<!doctype html><html><body><div id="app"></div></body></html>',
    { url: options.url ?? "https://space-force.test/" },
  );
  dom.window.scrollTo = () => {};
  const root = dom.window.document.querySelector("#app");
  let storage;
  try {
    storage = dom.window.localStorage;
  } catch {}
  const client = new OnlineClient(storage, options.fetcher ?? fetch, base);
  const app = mountGameClient(root, storage, client);
  const click = (selector) => {
    const el = root.querySelector(selector);
    assert.ok(el, selector);
    assert.equal(el.disabled ?? false, false, `${selector} is disabled`);
    el.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  };
  const input = (selector, value, event = "input") => {
    const el = root.querySelector(selector);
    assert.ok(el, selector);
    el.value = value;
    el.dispatchEvent(new dom.window.Event(event, { bubbles: true }));
  };
  const submit = (selector) => {
    const form = root.querySelector(selector);
    assert.ok(form, selector);
    form.dispatchEvent(
      new dom.window.Event("submit", { bubbles: true, cancelable: true }),
    );
  };
  return {
    dom,
    root,
    app,
    client,
    click,
    input,
    submit,
    close: () => {
      app.destroy();
      dom.window.close();
    },
  };
}
async function startTwo(a, b, format = "live") {
  await Promise.all([a.app.ready, b.app.ready]);
  a.input('#create-room [data-lobby-field="name"]', "Charlie");
  if (format === "async")
    a.input('#create-room [data-room-setting="format"]', "async", "change");
  a.submit("#create-room");
  await eventually(() => a.app.getSession());
  const room = a.app.getSession().room;
  b.input('#join-room [data-lobby-field="name"]', "Delta");
  b.input('[data-lobby-field="room"]', room);
  b.submit("#join-room");
  await eventually(() => b.app.getSession());
  a.click('[data-lobby-action="ready"]');
  await eventually(
    () =>
      a.app
        .getSession()
        .snapshot.room.members.find(
          (m) => m.id === a.app.getSession().snapshot.you,
        ).ready,
  );
  b.click('[data-lobby-action="ready"]');
  await eventually(() =>
    b.app.getSession().snapshot.room.members.every((m) => m.ready),
  );
  await a.app.getSession().refresh();
  a.click('[data-lobby-action="start"]');
  await eventually(() => a.app.getGameApp()?.getGame());
  await b.app.getSession().refresh();
  await eventually(() => b.app.getGameApp()?.getGame());
  return room;
}

test("the portable local flow has only random/rulebook Techs, Random/No Events and a blank map code", async () => {
  const b = browser("/api", { url: "file:///tmp/space-force/index.html" });
  try {
    await b.app.ready;
    const preset = b.root.querySelector('[data-setting="tech-preset"]');
    assert.equal(preset.value, "random");
    assert.deepEqual(
      [...preset.options].map((o) => o.value),
      ["random", "family", "aggressive", "cunning", "economic", "peaceful"],
    );
    const events = b.root.querySelector('[data-setting="event-mode"]');
    assert.equal(events.value, "full");
    assert.deepEqual(
      [...events.options].map((o) => o.value),
      ["full", "simpler"],
    );
    assert.equal(b.root.querySelector("#map-code").value, "");
    assert.equal(b.root.querySelector('[data-check="chain-scenario"]'), null);
    assert.equal(b.root.querySelector('[data-setting="event-batch"]'), null);
  } finally {
    b.close();
  }
});

test("the lobby creates an asynchronous invitation and both devices accept its 48+24 policy before starting", async () => {
  const s = await server(),
    a = browser(s.base),
    b = browser(s.base);
  try {
    await startTwo(a, b, "async");
    const state = a.app.getSession().snapshot;
    assert.equal(state.room.settings.format, "async");
    assert.equal(state.room.settings.responseHours, 48);
    assert.equal(state.room.settings.graceHours, 24);
    assert.equal(state.game.config.techPreset, "random");
    assert.equal(state.game.config.events, "full");
    assert.equal(state.game.config.eventBatch, "standard");
    assert.equal(state.game.config.scenario, "standard");
    assert.ok(a.root.querySelector(".online-status"));
    assert.match(
      a.root.querySelector(".online-deadline").textContent,
      /48h|47h/,
    );
    assert.match(
      b.root.querySelector(".turn-instruction").textContent,
      /Waiting for Charlie/,
    );
    assert.equal(b.root.querySelector('[data-action="choose-home"]'), null);
    assert.equal(a.app.getGameApp().getGame().seed, 0);
    assert.deepEqual(a.app.getGameApp().getGame().commands, []);
  } finally {
    a.close();
    b.close();
    await s.close();
  }
});

test("board commands reach the server and each online Actions view stays on its own player's supply", async () => {
  const s = await server(),
    a = browser(s.base),
    b = browser(s.base);
  try {
    const room = await startTwo(a, b);
    const home = a.app
      .getGameApp()
      .getGame()
      .systems.find((x) => x.revealed && x.planets.some((p) => p.home));
    a.click(`#galaxy .system[data-system="${home.id}"]`);
    a.click('[data-action="choose-home"]');
    await eventually(() => a.app.getGameApp().getGame().revision === 1);
    await b.app.getSession().refresh();
    assert.equal(
      (await s.service.store.get(room)).game.players[0].home,
      home.id,
    );
    assert.equal(b.app.getSession().snapshot.canAct, true);
    a.click('[data-view="actions"]');
    assert.match(
      a.root.querySelector(".actions-view h2").textContent,
      /Charlie/,
    );
    assert.equal(a.root.querySelector('[data-action="choose-home"]'), null);
    const second = b.app
      .getGameApp()
      .getGame()
      .systems.find(
        (x) => x.revealed && x.planets.some((p) => p.home) && x.id !== home.id,
      );
    b.click(`#galaxy .system[data-system="${second.id}"]`);
    b.click('[data-action="choose-home"]');
    await eventually(() => b.app.getGameApp().getGame().phase === "plan");
    await a.app.getSession().refresh();
    assert.equal(a.app.getSession().snapshot.canAct, true);
  } finally {
    a.close();
    b.close();
    await s.close();
  }
});

test("a lost HTTP response keeps the same command ID and Retry cannot commit the home choice twice", async () => {
  const s = await server();
  let lose = true;
  const fetcher = async (url, init) => {
    const response = await fetch(url, init);
    if (lose && String(url).endsWith("/command")) {
      lose = false;
      await response.text();
      throw new TypeError("Simulated lost response");
    }
    return response;
  };
  const a = browser(s.base, { fetcher }),
    b = browser(s.base);
  try {
    const room = await startTwo(a, b);
    const home = a.app
      .getGameApp()
      .getGame()
      .systems.find((x) => x.revealed && x.planets.some((p) => p.home));
    a.click(`#galaxy .system[data-system="${home.id}"]`);
    a.click('[data-action="choose-home"]');
    await eventually(
      () =>
        a.app.getSession().pending &&
        a.root.querySelector('[data-action="online-retry"]')?.disabled ===
          false,
    );
    assert.equal((await s.service.store.get(room)).game.revision, 1);
    const original = a.app.getSession().record.pending.id;
    a.click('[data-action="online-retry"]');
    await eventually(() => !a.app.getSession().pending);
    const full = await s.service.store.get(room);
    assert.equal(full.game.revision, 1);
    assert.ok(
      await s.service.store.receipt(
        room,
        a.app.getSession().record.member,
        original,
      ),
    );
  } finally {
    a.close();
    b.close();
    await s.close();
  }
});

test("Foresight is private to its current owner and disappears from their UI when the turn moves on", async () => {
  const s = await server(),
    a = browser(s.base),
    b = browser(s.base);
  try {
    const room = await startTwo(a, b);
    const data = await s.service.store.get(room),
      previous = data.version;
    const g = setup(2, 7, {
      techPreset: "random",
      scenario: "standard",
      events: "full",
      eventBatch: "standard",
    });
    g.phase = "actions";
    g.players.forEach((p) => (p.unplaced = 0));
    g.systems[0].tokens = [0];
    g.systems[1].tokens = [1];
    tech(g, 0, "foresight");
    data.game = g;
    await s.service.store.save(data, previous, crypto.randomUUID());
    await a.app.getSession().refresh();
    await b.app.getSession().refresh();
    a.click('[data-action="show-peek"]');
    assert.equal(a.root.querySelectorAll(".foresight-cards figure").length, 2);
    assert.equal(b.root.querySelector(".foresight-inline"), null);
    assert.deepEqual(b.app.getSession().snapshot.peek, []);
    await a.app.getSession().submit(
      {
        type: "resolve",
        system: g.systems[0].id,
        action: "produce",
        invest: true,
      },
      g.revision,
      { intent: true, reserve: true },
    );
    await a.app.getSession().refresh();
    assert.equal(a.root.querySelector(".foresight-cards"), null);
  } finally {
    a.close();
    b.close();
    await s.close();
  }
});

test("another browser can recover its exact protected seat and conditional polling returns no duplicate game body", async () => {
  const s = await server(),
    a = browser(s.base),
    b = browser(s.base),
    recovered = browser(s.base);
  try {
    const room = await startTwo(a, b, "async");
    await recovered.app.ready;
    recovered.input(
      '[data-lobby-field="recovery"]',
      a.app.getSession().recoveryKey,
    );
    recovered.submit("#recover-seat");
    await eventually(() => recovered.app.getSession());
    assert.equal(
      recovered.app.getSession().snapshot.you,
      a.app.getSession().snapshot.you,
    );
    const token = a.app.getSession().record.secret;
    const one = await fetch(`${s.base}/rooms/${room}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      etag = one.headers.get("ETag");
    const two = await fetch(`${s.base}/rooms/${room}`, {
      headers: { Authorization: `Bearer ${token}`, "If-None-Match": etag },
    });
    assert.equal(two.status, 304);
    assert.equal(await two.text(), "");
    const state = await (
      await fetch(`${s.base}/rooms/${room}/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).json();
    assert.equal(state.canAct, true);
    assert.equal(state.game, undefined);
    assert.equal(state.peek, undefined);
  } finally {
    a.close();
    b.close();
    recovered.close();
    await s.close();
  }
});

test("seven independent interfaces recover one finished game with the same scores and all final views", async () => {
  const s = await server(),
    browsers = Array.from({ length: 7 }, () => browser(s.base));
  try {
    await Promise.all(browsers.map((b) => b.app.ready));
    const options = {
      capacity: 7,
      visibility: "private",
      format: "async",
      techPreset: "random",
      events: "full",
      responseHours: 48,
      graceHours: 24,
    };
    const host = await browsers[0].client.create("Pilot 1", options),
      room = host.room;
    await browsers[0].app.open(host);
    for (let i = 1; i < 7; i++)
      await browsers[i].app.open(
        await browsers[i].client.join(room, `Pilot ${i + 1}`),
      );
    for (const b of browsers)
      await b.app
        .getSession()
        .action("ready", { ready: true, settings: options });
    await host.refresh();
    await host.action("start", { version: host.snapshot.room.version });
    await Promise.all(browsers.map((b) => b.app.getSession().refresh()));
    for (const b of browsers) b.app.getSession().stop();
    let full = await s.service.store.get(room);
    for (let n = 0; n < 1800 && full.game.phase !== "finished"; n++) {
      const b = browsers[full.game.turn],
        session = b.app.getSession();
      await session.refresh();
      const command = botCommand(full.game);
      const reply = await session.submit(command, full.game.revision, {
        intent: true,
        reserve: true,
      });
      assert.ok(reply.accepted);
      // The controller receives the same notification that an ordinary UI command uses.
      session.onUpdate?.(reply.snapshot);
      full = await s.service.store.get(room);
    }
    assert.equal(full.game.phase, "finished");
    await Promise.all(browsers.map((b) => b.app.getSession().refresh()));
    for (const b of browsers) {
      assert.ok(b.root.querySelector("#expedition-results"));
      assert.deepEqual(b.app.getGameApp().getGame().scores, full.game.scores);
      for (const view of ["board", "techs", "event", "actions", "player_aid"]) {
        b.click(`[data-view="${view}"]`);
        assert.ok(b.root.querySelector("#game-panel"));
      }
    }
  } finally {
    browsers.forEach((b) => b.close());
    await s.close();
  }
});
