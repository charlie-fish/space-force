import { ART, TECH_PRESETS } from "./content.js";
import { escape } from "./html.js";
import { mountApp, rocket } from "./ui.js";
import { OnlineClient, RoomSession } from "./online/client.js";
import { PUBLIC_PRESETS } from "./online/protocol.js";
import type {
  OnlineSnapshot,
  RoomSettings,
  RoomSummary,
} from "./online/protocol.js";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const defaults: RoomSettings = {
  capacity: 7,
  visibility: "private",
  format: "live",
  techPreset: "random",
  events: "full",
  responseHours: 48,
  graceHours: 24,
};
const control = (
  label: string,
  action: string,
  extra = "",
  disabled = false,
  style = "secondary",
) =>
  `<button type="button" class="${style}" data-lobby-action="${action}" ${extra} ${disabled ? "disabled" : ""}>${label}</button>`;
export function mountGameClient(
  root: HTMLElement,
  storage?: StorageLike,
  client = new OnlineClient(storage),
) {
  let active: RoomSession | null = null,
    gameApp: ReturnType<typeof mountApp> | null = null;
  let stopped = false,
    busy = false,
    error = "",
    available: boolean | null = null,
    name = "",
    roomCode = "",
    recovery = "";
  let screen: "home" | "waiting" | "game" | "local" = "home";
  let settings = { ...defaults },
    editSettings: RoomSettings | null = null,
    publicRooms: RoomSummary[] = [];
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;
  const document = root.ownerDocument;
  const location = document.defaultView?.location;
  const invite = location?.hash.match(/^#join=([a-f0-9-]{36})$/)?.[1];
  if (invite) roomCode = invite;
  function settingsControls(value: RoomSettings) {
    return `<div class="lobby-settings"><label>Seats <select data-room-setting="capacity">${Array.from({ length: 6 }, (_, i) => `<option value="${i + 2}" ${value.capacity === i + 2 ? "selected" : ""}>${i + 2}</option>`).join("")}</select></label><label>Room <select data-room-setting="visibility"><option value="private" ${value.visibility === "private" ? "selected" : ""}>Private invitation</option><option value="public" ${value.visibility === "public" ? "selected" : ""}>Public waiting game</option></select></label><label>Play <select data-room-setting="format"><option value="live" ${value.format === "live" ? "selected" : ""}>Live online</option><option value="async" ${value.format === "async" ? "selected" : ""}>Asynchronous</option></select></label><label>Tech display <select data-room-setting="techPreset">${PUBLIC_PRESETS.map((id) => `<option value="${id}" ${value.techPreset === id ? "selected" : ""}>${TECH_PRESETS[id].label}</option>`).join("")}</select></label><label>Events <select data-room-setting="events"><option value="full" ${value.events === "full" ? "selected" : ""}>Random Events</option><option value="simpler" ${value.events === "simpler" ? "selected" : ""}>No Events (simple version)</option></select></label>${value.format === "async" ? `<label>Response window <select data-room-setting="responseHours">${[24, 48, 72, 168].map((n) => `<option value="${n}" ${value.responseHours === n ? "selected" : ""}>${n} hours</option>`).join("")}</select></label><label>Grace period <select data-room-setting="graceHours">${[12, 24, 48].map((n) => `<option value="${n}" ${value.graceHours === n ? "selected" : ""}>${n} hours</option>`).join("")}</select></label>` : ""}</div>`;
  }
  function timing(value: RoomSettings) {
    return value.format === "async"
      ? `${value.responseHours} hours to respond, then ${value.graceHours} hours of grace before a removal vote.`
      : "Attend together. A required decision left unanswered, or a continuous disconnection, can qualify for removal after five minutes. A warning appears at four minutes.";
  }
  function roomList() {
    return publicRooms.length
      ? publicRooms
          .map(
            (room) =>
              `<article class="public-room"><div><strong>${escape(room.members.find((m) => m.id === room.host)?.name ?? "Space Force")}'s game</strong><p>${room.settings.format === "async" ? "Asynchronous" : "Live"} · ${room.members.length} / ${room.settings.capacity} seats · ${TECH_PRESETS[room.settings.techPreset].label} · ${room.settings.events === "full" ? "Random Events" : "No Events"}</p></div>${control("Join", "join-public", `data-room="${room.id}"`, busy || room.members.length >= room.settings.capacity)}</article>`,
          )
          .join("")
      : "<p>No public games are waiting right now. Create one above or join a private invitation.</p>";
  }
  function savedList() {
    return (
      Object.values(client.seats)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map((record) => {
          const status = record as typeof record & {
            yourTurn?: boolean;
            status?: string;
          };
          return `<li><div><strong>${escape(record.name)}</strong><span>${record.format === "async" ? "Asynchronous" : "Live"}${status.yourTurn ? " · Your decision is due" : status.status === "finished" ? " · Finished" : ""}</span></div>${control(status.status === "finished" ? "View results" : "Resume", "resume", `data-room="${record.room}"`, busy)}</li>`;
        })
        .join("") ||
      "<li>Your online seats will appear here so you can return later.</li>"
    );
  }
  function home() {
    if (stopped) return;
    screen = "home";
    root.innerHTML = `<main class="online-lobby"><header class="lobby-heading"><img src="${ART.cover.image}" width="155" height="212" alt="Space Force cover"/><div><span class="eyebrow">Space Force</span><h1>Find your next expedition.</h1><p>Play together now, take turns over several days, or share one device.</p>${control("Local pass-and-play", "local", "", false, "quiet")}</div></header>${error ? `<p class="error" role="alert">${escape(error)}</p>` : ""}${available === false ? "<p class='scope-note'>The online service is unavailable at this address. Local pass-and-play remains available.</p>" : ""}<div class="lobby-grid"><section class="console"><h2>Create a game</h2><form id="create-room"><label>Your name <input data-lobby-field="name" name="player-name" maxlength="24" autocomplete="nickname" required value="${escape(name)}"/></label>${settingsControls(settings)}<p class="timing-policy">${timing(settings)} Removal needs a strict majority of eligible other players. Decisions use normal turns.</p><button class="primary" ${busy || !available ? "disabled" : ""}>${busy ? "Connecting…" : "Create room"}</button></form></section><section class="console"><h2>Join a private room</h2><form id="join-room"><label>Your name <input data-lobby-field="name" maxlength="24" required value="${escape(name)}" autocomplete="nickname"/></label><label>Room code or invitation <input data-lobby-field="room" value="${escape(roomCode)}" required autocomplete="off"/></label><button class="secondary" ${busy || !available ? "disabled" : ""}>Join room</button></form><details><summary>Resume with a private key</summary><form id="recover-seat"><label>Private recovery key <input type="password" data-lobby-field="recovery" value="${escape(recovery)}" autocomplete="off" required/></label><button class="secondary" ${busy || !available ? "disabled" : ""}>Resume seat</button></form></details></section></div><section class="console"><div class="section-heading"><h2>Public games waiting for players</h2>${control("Refresh", "refresh", "", busy || !available, "quiet")}</div><div id="public-rooms">${roomList()}</div></section><section class="console"><h2>Your games</h2><ul class="saved-seats" id="saved-seats">${savedList()}</ul><p>Seats are saved in this browser. Use your private recovery key to return from another device.</p></section></main>`;
  }
  function waiting() {
    if (!active || stopped) return;
    screen = "waiting";
    const state = active.snapshot,
      room = state.room,
      you = room.members.find((m) => m.id === state.you)!,
      host = room.host === state.you;
    const open = [
      ...root.querySelectorAll<HTMLDetailsElement>("details[data-keep]"),
    ]
      .filter((d) => d.open)
      .map((d) => d.dataset.keep);
    root.innerHTML = `<main class="online-lobby waiting-room"><header class="lobby-heading"><div><span class="eyebrow">${room.settings.format === "async" ? "Asynchronous" : "Live online"} · ${room.settings.visibility === "private" ? "Private room" : "Public game"}</span><h1>Gather your fleet.</h1><p>${room.members.length} / ${room.settings.capacity} players</p></div>${control("Leave room", "leave", "", busy, "quiet")}</header>${error ? `<p class="error" role="alert">${escape(error)}</p>` : ""}<div class="lobby-grid"><section class="console"><h2>Players</h2><ol class="waiting-players">${room.members.map((member) => `<li>${rocket(member.style, 30)}<div><strong>${escape(member.name)}${member.id === state.you ? " (you)" : ""}${member.id === room.host ? " · host" : ""}</strong><span>${member.ready ? "Ready" : "Reviewing settings"} · ${member.connected ? "Connected" : "Away"}</span></div>${host && member.id !== state.you ? control("Remove", "remove-waiting", `data-member="${member.id}"`, busy, "quiet") : ""}</li>`).join("")}</ol>${control(you.ready ? "Not ready" : "Ready — I accept these settings", "ready", "", busy, you.ready ? "secondary" : "primary")}${host ? control(`Start with ${room.members.length} players`, "start", "", busy || room.members.length < 2 || !room.members.every((m) => m.ready), "primary") : "<p>The host can start when everyone is ready.</p>"}</section><section class="console"><h2>Game settings</h2><p>${TECH_PRESETS[room.settings.techPreset].label} Techs · ${room.settings.events === "full" ? "Random Events" : "No Events (simple version)"} · normal turns.</p><p class="timing-policy">${timing(room.settings)} A strict majority of eligible other players must approve removal. A sole remaining player wins.</p><p>The starting player count determines the board and game length: 2–3 players use six rounds; 4–7 use five. Ragnarök can shorten play.</p>${host ? `<details data-keep="settings"><summary>Change settings</summary><form id="change-room">${settingsControls(editSettings ?? room.settings)}<p>Changing settings clears everyone's Ready status.</p><button class="secondary" ${busy ? "disabled" : ""}>Apply settings</button></form></details>` : ""}</section></div><section class="console"><h2>Invite players</h2><p>Share this invitation to join an empty seat before the game starts.</p><input readonly class="invitation" value="${escape(`${location?.origin ?? ""}${location?.pathname ?? "/"}#join=${room.id}`)}" aria-label="Room invitation"/>${control("Copy invitation", "copy-invite", "", false, "secondary")}<p>Room code: <code>${room.id}</code></p><details data-keep="recovery"><summary>Private seat recovery</summary><p>Keep this key private. It can resume your seat on another device.</p><input readonly class="seat-key" value="${escape(active.recoveryKey)}" aria-label="Private recovery key"/>${control("Copy private key", "copy-key", "", false, "quiet")}</details></section></main>`;
    for (const key of open) {
      const d = root.querySelector<HTMLDetailsElement>(
        `details[data-keep="${key}"]`,
      );
      if (d) d.open = true;
    }
  }
  function showGame(snapshot: OnlineSnapshot) {
    if (!active || !snapshot.game || stopped) return;
    if (screen !== "game" || !gameApp) {
      gameApp?.destroy();
      root.innerHTML = '<div class="online-game-root"></div>';
      gameApp = mountApp(root.firstElementChild as HTMLElement, storage, {
        remote: active,
        onLobby: backHome,
      });
      screen = "game";
    }
    gameApp.receiveRemote(snapshot);
  }
  async function open(session: RoomSession) {
    active?.stop();
    gameApp?.destroy();
    gameApp = null;
    active = session;
    editSettings = null;
    error = "";
    session.onUpdate = (snapshot) => {
      if (active !== session || stopped) return;
      snapshot.game ? showGame(snapshot) : waiting();
    };
    session.onClosed = (message) => {
      if (active !== session || stopped) return;
      backHome();
      error = message;
      home();
    };
    session.onConnection = (online, message) => {
      if (active !== session || stopped) return;
      const nextMessage = online ? "" : message,
        changed = nextMessage !== error;
      error = nextMessage;
      if (screen === "game") gameApp?.connection(error);
      else if (screen === "waiting" && changed) waiting();
    };
    if (session.snapshot.game) showGame(session.snapshot);
    else waiting();
    session.start();
  }
  function showLocal() {
    active?.stop();
    active = null;
    gameApp?.destroy();
    root.innerHTML = '<div class="local-game-root"></div>';
    screen = "local";
    gameApp = mountApp(root.firstElementChild as HTMLElement, storage, {
      onLobby: backHome,
    });
  }
  function backHome() {
    active?.stop();
    active = null;
    gameApp?.destroy();
    gameApp = null;
    error = "";
    home();
    void refresh();
  }
  async function refresh() {
    if (stopped || !available || screen !== "home") return;
    try {
      publicRooms = await client.rooms();
      await client.refreshSeats();
      if (screen === "home") {
        const list = root.querySelector("#public-rooms");
        if (list) list.innerHTML = roomList();
        const saved = root.querySelector("#saved-seats");
        if (saved) saved.innerHTML = savedList();
      }
    } catch (cause) {
      error =
        cause instanceof Error ? cause.message : "Unable to refresh games.";
    }
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => void refresh(), 15_000);
  }
  async function run(task: () => Promise<unknown>) {
    if (busy || stopped) return;
    busy = true;
    error = "";
    screen === "waiting" ? waiting() : home();
    try {
      await task();
    } catch (cause) {
      error =
        cause instanceof Error
          ? cause.message
          : "The request could not be completed.";
    } finally {
      busy = false;
      if (screen === "home") home();
      else if (screen === "waiting") waiting();
    }
  }
  const input = (event: Event) => {
    const field = event.target as HTMLInputElement;
    if (field.dataset.lobbyField === "name") name = field.value;
    if (field.dataset.lobbyField === "room") roomCode = field.value;
    if (field.dataset.lobbyField === "recovery") recovery = field.value;
  };
  const change = (event: Event) => {
    const field = event.target as HTMLSelectElement,
      key = field.dataset.roomSetting as keyof RoomSettings | undefined;
    if (!key) return;
    const value = ["capacity", "responseHours", "graceHours"].includes(key)
      ? Number(field.value)
      : field.value;
    if (screen === "waiting")
      editSettings = {
        ...(editSettings ?? active!.snapshot.room.settings),
        [key]: value,
      };
    else settings = { ...settings, [key]: value };
    if (key === "format") screen === "waiting" ? waiting() : home();
  };
  const submit = (event: Event) => {
    const form = event.target as HTMLFormElement;
    if (
      !["create-room", "join-room", "recover-seat", "change-room"].includes(
        form.id,
      )
    )
      return;
    event.preventDefault();
    name =
      form.querySelector<HTMLInputElement>('[data-lobby-field="name"]')
        ?.value ?? name;
    if (form.id === "create-room")
      void run(async () => open(await client.create(name, settings)));
    else if (form.id === "join-room") {
      const code = roomCode.match(/[a-f0-9-]{36}/)?.[0] ?? roomCode.trim();
      void run(async () => open(await client.join(code, name)));
    } else if (form.id === "recover-seat")
      void run(async () => open(await client.recover(recovery)));
    else if (active)
      void run(async () => {
        await active!.action("settings", {
          settings: editSettings ?? active!.snapshot.room.settings,
        });
        editSettings = null;
      });
  };
  const click = (event: Event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>(
      "[data-lobby-action]",
    );
    if (!button || button.disabled) return;
    const action = button.dataset.lobbyAction;
    if (action === "local") {
      showLocal();
      return;
    }
    if (action === "refresh") {
      void refresh();
      return;
    }
    if (action === "resume") {
      void run(async () => open(await client.resume(button.dataset.room!)));
      return;
    }
    if (action === "join-public") {
      if (!name.trim()) {
        roomCode = button.dataset.room!;
        error = "Enter your name to join this game.";
        home();
        root
          .querySelector<HTMLInputElement>('[data-lobby-field="name"]')
          ?.focus();
        return;
      }
      void run(async () => open(await client.join(button.dataset.room!, name)));
      return;
    }
    if (!active) return;
    if (action === "ready")
      void run(() =>
        active!.action("ready", {
          ready: !active!.snapshot.room.members.find(
            (m) => m.id === active!.snapshot.you,
          )!.ready,
          settings: active!.snapshot.room.settings,
        }),
      );
    if (action === "start")
      void run(() =>
        active!.action("start", { version: active!.snapshot.room.version }),
      );
    if (action === "remove-waiting")
      void run(() =>
        active!.action("remove-waiting", { member: button.dataset.member }),
      );
    if (action === "leave")
      void run(async () => {
        await active!.leave();
        backHome();
      });
    if (action === "copy-invite" || action === "copy-key") {
      const value =
        action === "copy-key"
          ? active.recoveryKey
          : `${location?.origin ?? ""}${location?.pathname ?? "/"}#join=${active.room}`;
      root
        .querySelector<HTMLInputElement>(
          action === "copy-key" ? ".seat-key" : ".invitation",
        )
        ?.select();
      void document.defaultView?.navigator.clipboard
        ?.writeText(value)
        .catch(() => {});
    }
  };
  root.addEventListener("click", click);
  root.addEventListener("submit", submit);
  root.addEventListener("input", input);
  root.addEventListener("change", change);
  home();
  const ready = (async () => {
    available =
      location?.protocol === "file:" ? false : await client.available();
    if (stopped) return;
    if (!available && !invite) showLocal();
    else {
      home();
      await refresh();
    }
  })();
  return {
    ready,
    client,
    open,
    showLocal,
    getSession: () => active,
    getGameApp: () => gameApp,
    destroy: () => {
      stopped = true;
      active?.stop();
      gameApp?.destroy();
      if (refreshTimer) clearTimeout(refreshTimer);
      root.removeEventListener("click", click);
      root.removeEventListener("submit", submit);
      root.removeEventListener("input", input);
      root.removeEventListener("change", change);
      root.replaceChildren();
    },
  };
}
