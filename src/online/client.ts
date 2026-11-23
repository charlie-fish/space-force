import type { Command, Game } from "../types.js";
import type {
  CommandReply,
  CommandRequest,
  OnlineSnapshot,
  RoomSettings,
  RoomSummary,
} from "./protocol.js";

type StorageLike = Pick<Storage, "getItem" | "setItem">;
export interface SeatRecord {
  room: string;
  secret: string;
  member: string;
  name: string;
  format: string;
  updatedAt: number;
  pending: CommandRequest | null;
}
export class ConnectionError extends Error {
  constructor(
    message: string,
    readonly status = 0,
  ) {
    super(message);
  }
}
const KEY = "space-force.online.seats.v1";
export function freshSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
const commandId = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
export class OnlineClient {
  readonly seats: Record<string, SeatRecord> = {};
  private pendingJoin: {
    room: string | null;
    secret: string;
    name: string;
    settings?: RoomSettings;
  } | null = null;
  constructor(
    readonly storage?: StorageLike,
    readonly fetcher: typeof fetch = fetch.bind(globalThis),
    readonly base = "/api",
  ) {
    try {
      const saved = JSON.parse(storage?.getItem(KEY) ?? "{}");
      if (saved && typeof saved === "object")
        for (const [room, record] of Object.entries(saved)) {
          const item = record as SeatRecord;
          if (
            /^[a-f0-9-]{36}$/.test(room) &&
            /^[A-Za-z0-9_-]{43}$/.test(item.secret ?? "")
          )
            this.seats[room] = item;
        }
    } catch {
      /* A blocked or corrupted browser store does not prevent a session. */
    }
  }
  save() {
    try {
      this.storage?.setItem(KEY, JSON.stringify(this.seats));
    } catch {
      /* Recovery keys remain available to copy. */
    }
  }
  async request(
    path: string,
    method = "GET",
    data?: unknown,
    token?: string,
    etag?: string,
  ): Promise<{
    data: unknown;
    etag: string | null;
    time: number | null;
    unchanged: boolean;
  }> {
    const controller = new AbortController(),
      timer = setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await this.fetcher(`${this.base}${path}`, {
        method,
        headers: {
          ...(data === undefined ? {} : { "Content-Type": "application/json" }),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(etag ? { "If-None-Match": etag } : {}),
        },
        ...(data === undefined ? {} : { body: JSON.stringify(data) }),
        signal: controller.signal,
        cache: "no-store",
        credentials: "same-origin",
        redirect: "error",
      });
      if (response.status === 304)
        return {
          data: null,
          etag: etag ?? null,
          time: Number(response.headers.get("X-Server-Time")) || null,
          unchanged: true,
        };
      let value: unknown;
      try {
        value = await response.json();
      } catch {
        throw new ConnectionError(
          "The game server is not available at this address.",
          response.status >= 400 ? response.status : 503,
        );
      }
      if (!response.ok)
        throw new ConnectionError(
          String(
            (value as { error?: string }).error ??
              "The request could not be completed.",
          ),
          response.status,
        );
      return {
        data: value,
        etag: response.headers.get("ETag"),
        time: Number(response.headers.get("X-Server-Time")) || null,
        unchanged: false,
      };
    } catch (error) {
      if (error instanceof ConnectionError) throw error;
      throw new ConnectionError(
        "Connection lost. Reconnect and retry the last action to check its result.",
      );
    } finally {
      clearTimeout(timer);
    }
  }
  async available() {
    try {
      return Boolean((await this.request("/health")).data);
    } catch {
      return false;
    }
  }
  async rooms(): Promise<RoomSummary[]> {
    return ((await this.request("/rooms")).data as { rooms: RoomSummary[] })
      .rooms;
  }
  async refreshSeats() {
    await Promise.allSettled(
      Object.values(this.seats)
        .slice(-20)
        .map(async (record) => {
          const info = (
            await this.request(
              `/rooms/${record.room}/summary`,
              "GET",
              undefined,
              record.secret,
            )
          ).data as { canAct: boolean; status: string };
          Object.assign(record, { yourTurn: info.canAct, status: info.status });
        }),
    );
    this.save();
  }
  remember(snapshot: OnlineSnapshot, secret: string) {
    const member = snapshot.room.members.find((m) => m.id === snapshot.you)!;
    const old = this.seats[snapshot.room.id];
    this.seats[snapshot.room.id] = {
      room: snapshot.room.id,
      secret,
      member: snapshot.you,
      name: member.name,
      format: snapshot.room.settings.format,
      updatedAt: snapshot.serverTime,
      pending: old?.pending ?? null,
    };
    this.save();
  }
  async create(name: string, settings: RoomSettings): Promise<RoomSession> {
    if (
      !this.pendingJoin ||
      this.pendingJoin.room !== null ||
      this.pendingJoin.name !== name ||
      JSON.stringify(this.pendingJoin.settings) !== JSON.stringify(settings)
    )
      this.pendingJoin = { room: null, name, settings, secret: freshSecret() };
    const join = this.pendingJoin;
    const snapshot = (
      await this.request("/rooms", "POST", {
        name,
        settings,
        secret: join.secret,
      })
    ).data as OnlineSnapshot;
    this.remember(snapshot, join.secret);
    this.pendingJoin = null;
    return new RoomSession(this, snapshot.room.id, snapshot);
  }
  async join(room: string, name: string): Promise<RoomSession> {
    if (this.seats[room]) return this.resume(room);
    if (
      !this.pendingJoin ||
      this.pendingJoin.room !== room ||
      this.pendingJoin.name !== name
    )
      this.pendingJoin = { room, name, secret: freshSecret() };
    const join = this.pendingJoin;
    const snapshot = (
      await this.request(`/rooms/${room}/join`, "POST", {
        name,
        secret: join.secret,
      })
    ).data as OnlineSnapshot;
    this.remember(snapshot, join.secret);
    this.pendingJoin = null;
    return new RoomSession(this, room, snapshot);
  }
  async resume(room: string): Promise<RoomSession> {
    const record = this.seats[room];
    if (!record)
      throw new ConnectionError(
        "Enter your private recovery key to resume this seat.",
        401,
      );
    const snapshot = (
      await this.request(`/rooms/${room}`, "GET", undefined, record.secret)
    ).data as OnlineSnapshot;
    this.remember(snapshot, record.secret);
    return new RoomSession(this, room, snapshot);
  }
  async recover(value: string): Promise<RoomSession> {
    const [room, secret] = value.trim().split(".");
    if (
      !/^[a-f0-9-]{36}$/.test(room ?? "") ||
      !/^[A-Za-z0-9_-]{43}$/.test(secret ?? "")
    )
      throw new ConnectionError(
        "Enter the complete private recovery key.",
        400,
      );
    const snapshot = (
      await this.request(`/rooms/${room}`, "GET", undefined, secret)
    ).data as OnlineSnapshot;
    this.remember(snapshot, secret);
    return new RoomSession(this, room, snapshot);
  }
  forget(room: string) {
    delete this.seats[room];
    this.save();
  }
}
export class RoomSession {
  serverOffset = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private polling = false;
  private stopped = true;
  private etag: string | undefined;
  onUpdate: ((state: OnlineSnapshot) => void) | null = null;
  onConnection: ((online: boolean, message: string) => void) | null = null;
  onClosed: ((message: string) => void) | null = null;
  constructor(
    readonly client: OnlineClient,
    readonly room: string,
    public snapshot: OnlineSnapshot,
  ) {
    this.serverOffset = snapshot.serverTime - Date.now();
  }
  get record() {
    return this.client.seats[this.room];
  }
  get pending() {
    return Boolean(this.record?.pending);
  }
  get recoveryKey() {
    return `${this.room}.${this.record.secret}`;
  }
  async refresh(): Promise<OnlineSnapshot> {
    const result = await this.client.request(
      `/rooms/${this.room}`,
      "GET",
      undefined,
      this.record.secret,
      this.etag,
    );
    if (result.time) this.serverOffset = result.time - Date.now();
    this.etag = result.etag ?? this.etag;
    if (!result.unchanged) {
      const next = result.data as OnlineSnapshot;
      if (next.room.id !== this.room || next.you !== this.record.member)
        throw new ConnectionError(
          "This response does not match your seat.",
          403,
        );
      if (next.room.version >= this.snapshot.room.version) {
        this.snapshot = next;
        this.client.remember(next, this.record.secret);
        this.onUpdate?.(next);
      }
    }
    this.onConnection?.(true, "");
    return this.snapshot;
  }
  start() {
    this.stopped = false;
    void this.poll();
  }
  stop() {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
  private async poll() {
    if (this.stopped || this.polling) return;
    this.polling = true;
    try {
      await this.refresh();
    } catch (error) {
      if (
        error instanceof ConnectionError &&
        error.status === 403 &&
        error.message.includes("seat is no longer")
      ) {
        this.stop();
        this.client.forget(this.room);
        this.onClosed?.(
          "Your waiting seat was removed. You can join another game.",
        );
        return;
      }
      this.onConnection?.(
        false,
        error instanceof Error ? error.message : "Reconnecting…",
      );
    } finally {
      this.polling = false;
      if (!this.stopped && this.snapshot.room.status !== "finished")
        this.timer = setTimeout(
          () => void this.poll(),
          this.snapshot.room.settings.format === "live" ? 2000 : 10_000,
        );
    }
  }
  async action(action: string, data: unknown = {}): Promise<OnlineSnapshot> {
    const snapshot = (
      await this.client.request(
        `/rooms/${this.room}/${action}`,
        "POST",
        data,
        this.record.secret,
      )
    ).data as OnlineSnapshot;
    this.etag = undefined;
    if (snapshot.room.version >= this.snapshot.room.version)
      this.snapshot = snapshot;
    this.client.remember(this.snapshot, this.record.secret);
    this.onUpdate?.(this.snapshot);
    return this.snapshot;
  }
  async leave() {
    await this.client.request(
      `/rooms/${this.room}/leave`,
      "POST",
      {},
      this.record.secret,
    );
    this.stop();
    this.client.forget(this.room);
  }
  async submit(
    command: Command,
    revision: number,
    accepted?: { intent: boolean; reserve: boolean },
  ): Promise<CommandReply> {
    if (this.pending)
      throw new ConnectionError(
        "Retry the last action before making another choice.",
      );
    const request: CommandRequest = {
      id: commandId(),
      revision,
      decisionId: this.snapshot.decisionId ?? "",
      command,
      confirmIntent: accepted?.intent ?? false,
      confirmReserve: accepted?.reserve ?? false,
    };
    this.record.pending = request;
    this.client.save();
    return this.finishRequest(request);
  }
  async retry(): Promise<{ command: Command; reply: CommandReply }> {
    const request = this.record.pending;
    if (!request)
      throw new ConnectionError("There is no pending action to retry.");
    return {
      command: request.command,
      reply: await this.finishRequest(request),
    };
  }
  private async finishRequest(request: CommandRequest): Promise<CommandReply> {
    try {
      const reply = (
        await this.client.request(
          `/rooms/${this.room}/command`,
          "POST",
          request,
          this.record.secret,
        )
      ).data as CommandReply;
      this.record.pending = null;
      this.client.save();
      this.etag = undefined;
      if (reply.snapshot.room.version >= this.snapshot.room.version)
        this.snapshot = reply.snapshot;
      else reply.snapshot = this.snapshot;
      this.client.remember(this.snapshot, this.record.secret);
      return reply;
    } catch (error) {
      if (
        error instanceof ConnectionError &&
        error.status >= 400 &&
        error.status < 500
      ) {
        this.record.pending = null;
        this.client.save();
        void this.refresh().catch(() => {});
      }
      throw error;
    }
  }
}
/** Renderer-only shape: placeholders never enter engine execution or the network. */
export function renderGame(snapshot: OnlineSnapshot): Game {
  const view = snapshot.game!;
  const events = Array<string>(view.eventsRemaining).fill("event.hidden");
  snapshot.peek.forEach((card, i) => (events[i] = card));
  return {
    ...view,
    seed: 0,
    rng: 0,
    events,
    exploreBag: Array(view.exploreRemaining).fill("credit1"),
    commands: [],
    systems: view.systems.map((s) => ({
      ...s,
      template: s.template ?? "system.asimov",
      planets: s.planets.map((p) => ({
        ...p,
        explore: p.explore === "hidden" ? "credit1" : p.explore,
      })),
    })),
    turn:
      view.pending?.kind === "bid" &&
      snapshot.canAct &&
      snapshot.playerId !== null
        ? snapshot.playerId
        : view.turn,
  };
}
