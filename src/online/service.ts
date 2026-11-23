import {
  activePlayerIds,
  applyCommand,
  createGame,
  hasTech,
  peekEvents,
} from "../engine.js";
import {
  intentWarnings,
  reserveNotice,
  revealsHiddenInformation,
} from "../intent.js";
import type { Command, Game } from "../types.js";
import { PUBLIC_PRESETS, normalConfig, viewPlayer } from "./protocol.js";
import type {
  CommandRequest,
  OnlineSnapshot,
  RemovalState,
  RoomSettings,
  RoomSummary,
  TurnClock,
  VisibleGame,
} from "./protocol.js";
import { RoomStore } from "./store.js";
import type { Member, Presence, RoomRecord } from "./store.js";

const MINUTE = 60_000,
  HOUR = 60 * MINUTE,
  CONNECTED = 45_000;
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
function requireApi(
  condition: unknown,
  message: string,
  status = 400,
): asserts condition {
  if (!condition) throw new ApiError(status, message);
}
const copy = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const id = () => crypto.randomUUID();
export const digest = async (value: string) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
  )
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
const canonical = (value: unknown): string =>
  JSON.stringify(value, (_key, item) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(
          Object.entries(item).sort(([a], [b]) => a.localeCompare(b)),
        )
      : item,
  );
function name(value: unknown): string {
  requireApi(typeof value === "string", "Enter a player name.");
  const result = value
    .trim()
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .slice(0, 24);
  requireApi(result.length > 0, "Enter a player name.");
  return result;
}
function settings(value: unknown): RoomSettings {
  const v = value as Partial<RoomSettings>;
  requireApi(v && typeof v === "object", "Choose room settings.");
  requireApi(
    Number.isInteger(v.capacity) && v.capacity! >= 2 && v.capacity! <= 7,
    "Choose 2–7 seats.",
  );
  requireApi(
    v.visibility === "public" || v.visibility === "private",
    "Choose public or private.",
  );
  requireApi(
    v.format === "live" || v.format === "async",
    "Choose live or asynchronous play.",
  );
  requireApi(
    PUBLIC_PRESETS.includes(v.techPreset!),
    "Choose Random or a rulebook Tech preset.",
  );
  requireApi(
    v.events === "full" || v.events === "simpler",
    "Choose Random Events or No Events.",
  );
  requireApi(
    Number.isInteger(v.responseHours) &&
      v.responseHours! >= 1 &&
      v.responseHours! <= 168,
    "Response windows must be 1–168 hours.",
  );
  requireApi(
    Number.isInteger(v.graceHours) && v.graceHours! >= 1 && v.graceHours! <= 72,
    "Grace periods must be 1–72 hours.",
  );
  return {
    capacity: v.capacity!,
    visibility: v.visibility,
    format: v.format,
    techPreset: v.techPreset!,
    events: v.events,
    responseHours: v.responseHours!,
    graceHours: v.graceHours!,
  };
}
function secret(value: unknown): string {
  requireApi(
    typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value),
    "A valid private seat credential is required.",
    401,
  );
  return value;
}
function pauseTotal(room: RoomRecord, now: number) {
  return (
    room.pause.total +
    (room.pause.since === null ? 0 : Math.max(0, now - room.pause.since))
  );
}
export function decisionOwners(g: Game): number[] {
  if (g.phase === "finished") return [];
  if (g.pending?.kind === "bid")
    return activePlayerIds(g).filter(
      (owner) => g.auction!.bids[owner] === null,
    );
  return [g.turn];
}
export function decisionActor(g: Game, owner: number): number {
  if (!g.players[owner].forfeited) return owner;
  for (let n = 1; n <= g.players.length; n++) {
    const candidate = (owner + n) % g.players.length;
    if (!g.players[candidate].forfeited) return candidate;
  }
  throw Error("No delegate is available.");
}
function decisionKey(g: Game, owner: number) {
  return g.pending?.kind === "bid"
    ? `bid:${g.round}:${g.eventHistory.length}`
    : `${g.revision}:${g.phase}:${g.pending?.kind ?? "turn"}:${owner}`;
}
function syncClocks(room: RoomRecord, now: number) {
  const next: RoomRecord["clocks"] = {};
  if (room.game)
    for (const owner of decisionOwners(room.game)) {
      const actor = decisionActor(room.game, owner),
        member = room.members.find((m) => m.playerId === actor)!;
      const key = decisionKey(room.game, owner);
      next[member.id] =
        room.clocks[member.id]?.key === key
          ? room.clocks[member.id]
          : { key, since: now, pauseBaseline: pauseTotal(room, now) };
    }
  room.clocks = next;
}
function optionalForfeit(g: Game): Command | null {
  const p = g.pending;
  if (!p) return null;
  if (p.kind === "ack") return { type: "acknowledge" };
  if (p.kind === "reserve") return { type: "finishReserve" };
  if (p.kind === "rapid") return { type: "rapid", skip: true };
  if (p.kind === "feature" && p.optional)
    return { type: "feature", skip: true };
  if (p.kind === "filibuster") return { type: "filibuster", skip: true };
  if (p.kind === "scrambler") return { type: "scramble", skip: true };
  if (p.kind === "eminent") return { type: "eminent", use: false };
  if (p.kind === "mercenaries") return { type: "mercenaries", count: 0 };
  if (p.kind === "settle") return { type: "finishSettle" };
  if (p.kind === "redistribute")
    return { type: "redistribute", ships: p.amount, settlements: {} };
  if (p.kind === "eventChoice") {
    if (p.event === "event.prophecy")
      return { type: "eventChoice", planets: [] };
    if (!["event.famine", "event.politics", "event.alliance"].includes(p.event))
      return { type: "eventChoice", skip: true };
  }
  return null;
}
export function stabilize(g: Game): Game {
  for (let n = 0; n < 200; n++) {
    if (g.phase === "finished") return g;
    let command: Command | null = null;
    if (g.phase === "event" && !g.pending) command = { type: "continueEvent" };
    else if (g.phase === "pass") command = { type: "nextRound" };
    else if (g.players[g.turn].forfeited) command = optionalForfeit(g);
    if (!command) return g;
    g = applyCommand(g, g.turn, command);
  }
  throw Error("Automatic resolution did not finish.");
}
function project(g: Game): VisibleGame {
  const {
    seed: _seed,
    rng: _rng,
    events,
    exploreBag,
    commands: _commands,
    systems,
    auction,
    ...rest
  } = g;
  // Explicitly strip all engine secrets before adapting the existing renderer.
  return {
    ...copy(rest),
    players: g.players.map(viewPlayer),
    systems: systems.map((s) => ({
      id: s.id,
      template: s.revealed ? s.template : null,
      q: s.q,
      r: s.r,
      role: s.role,
      revealed: s.revealed,
      rotation: s.revealed ? s.rotation : 0,
      ships: s.ships.slice(),
      tokens: s.tokens.slice(),
      extraHoles: s.revealed ? s.extraHoles : 0,
      extraWarp: s.revealed ? s.extraWarp : false,
      extraEdges: s.extraEdges.slice(),
      planets: s.revealed
        ? s.planets.map((p) => ({
            ...copy(p),
            explore: p.explore
              ? p.exploreFaceUp
                ? p.explore
                : "hidden"
              : null,
          }))
        : [],
    })),
    eventsRemaining: events.length,
    exploreRemaining: exploreBag.length,
    auction: auction
      ? {
          ...copy(auction),
          bids: auction.bids.map((n) =>
            g.pending?.kind === "bid" ? (n === null ? null : 0) : n,
          ),
        }
      : null,
  };
}
function memberOf(room: RoomRecord, memberId: string): Member {
  const member = room.members.find((m) => m.id === memberId);
  requireApi(member, "This seat is no longer in the room.", 403);
  return member;
}
function isForfeited(room: RoomRecord, member: Member) {
  return (
    member.playerId !== null &&
    Boolean(room.game?.players[member.playerId].forfeited)
  );
}
function summary(
  room: RoomRecord,
  presences: Record<string, Presence>,
  now: number,
): RoomSummary {
  return {
    id: room.id,
    host: room.host,
    status: room.status,
    settings: { ...room.settings },
    members: room.members.map((m) => ({
      id: m.id,
      name: m.name,
      style: m.style,
      ready: m.ready,
      playerId: m.playerId,
      forfeited: isForfeited(room, m),
      connected: now - (presences[m.id]?.seenAt ?? 0) < CONNECTED,
    })),
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
    version: room.version,
  };
}
function clocks(
  room: RoomRecord,
  presences: Record<string, Presence>,
  now: number,
): TurnClock[] {
  const total = pauseTotal(room, now);
  return Object.entries(room.clocks).map(([memberId, clock]) => {
    const member = memberOf(room, memberId),
      p = presences[memberId];
    const live = room.settings.format === "live";
    const since = live
      ? Math.max(clock.since, p?.respondedAt ?? clock.since)
      : clock.since;
    const pauseBase =
      live && p && p.respondedAt > clock.since
        ? p.responsePauseBaseline
        : clock.pauseBaseline;
    const duration = live ? 5 * MINUTE : room.settings.responseHours * HOUR;
    const dueAt = since + duration + total - pauseBase;
    return {
      memberId,
      playerId: member.playerId!,
      decisionId: clock.key,
      dueAt,
      eligibleAt: dueAt + (live ? 0 : room.settings.graceHours * HOUR),
      warning: live ? now >= dueAt - MINUTE : now >= dueAt,
    };
  });
}
function removalStates(
  room: RoomRecord,
  presences: Record<string, Presence>,
  now: number,
): RemovalState[] {
  const turnClocks = clocks(room, presences, now),
    total = pauseTotal(room, now);
  const active = room.members.filter((m) => !isForfeited(room, m));
  const qualifies = (m: Member) => {
    if (room.status !== "playing" || room.pause.since !== null) return false;
    const clock = turnClocks.find((c) => c.memberId === m.id);
    if (clock && now >= clock.eligibleAt) return true;
    if (room.settings.format !== "live") return false;
    const p = presences[m.id];
    return (
      p && now >= p.seenAt + CONNECTED + 5 * MINUTE + total - p.pauseBaseline
    );
  };
  return active.map((m) => {
    const voters = active
      .filter((other) => other.id !== m.id && !qualifies(other))
      .map((other) => other.id);
    return {
      memberId: m.id,
      eligible: qualifies(m),
      voters,
      needed: Math.floor(voters.length / 2) + 1,
      yes: (room.votes[m.id] ?? []).filter((v) => voters.includes(v)),
    };
  });
}

export class OnlineService {
  constructor(
    readonly store: RoomStore,
    readonly now: () => number = Date.now,
  ) {}
  async state(room: RoomRecord, viewer: string): Promise<OnlineSnapshot> {
    const now = this.now(),
      presence = await this.store.presences(room.id),
      member = memberOf(room, viewer),
      game = room.game;
    const owners = game ? decisionOwners(game) : [],
      owner = game
        ? owners.find((o) => decisionActor(game, o) === member.playerId)
        : undefined;
    const canAct =
      owner !== undefined &&
      room.pause.since === null &&
      !isForfeited(room, member);
    const visible = game ? project(game) : null;
    if (
      visible?.auction &&
      game?.pending?.kind === "bid" &&
      member.playerId !== null
    )
      visible.auction.bids[member.playerId] =
        game.auction!.bids[member.playerId];
    return {
      room: summary(room, presence, now),
      serverTime: now,
      you: viewer,
      historyFrom: member.historyFrom ?? 0,
      playerId: member.playerId,
      canAct,
      actingFor:
        owner !== undefined && owner !== member.playerId ? owner : null,
      decisionId:
        owner === undefined || !game ? null : decisionKey(game, owner),
      clocks: clocks(room, presence, now),
      removals: removalStates(room, presence, now),
      paused: room.pause.since !== null,
      pauseVotes: room.pause.votes.slice(),
      game: visible,
      peek:
        canAct &&
        game &&
        owner === member.playerId &&
        hasTech(game, owner, "foresight")
          ? peekEvents(game, owner)
          : [],
    };
  }
  async touch(
    room: RoomRecord,
    member: string,
    ack = false,
  ): Promise<RoomRecord> {
    for (let attempt = 0; attempt < 12; attempt++) {
      const now = this.now(),
        all = await this.store.presences(room.id),
        old = all[member];
      const reconnect = !old || now - old.seenAt >= CONNECTED;
      if (!ack && !reconnect && now - old.seenAt < 15_000) return room;
      const value: Presence = {
        seenAt: now,
        respondedAt: ack || reconnect ? now : old.respondedAt,
        pauseBaseline: pauseTotal(room, now),
        responsePauseBaseline:
          ack || reconnect ? pauseTotal(room, now) : old.responsePauseBaseline,
      };
      if (
        (ack || reconnect) &&
        room.status === "playing" &&
        room.settings.format === "live"
      ) {
        const previous = room.version;
        delete room.votes[member];
        room.audit.push({
          at: now,
          member,
          action: ack ? "Presence acknowledged" : "Seat reconnected",
        });
        if (
          await this.store.save(room, previous, id(), undefined, undefined, {
            member,
            value,
          })
        )
          return room;
        const current = await this.store.get(room.id);
        requireApi(current, "Room not found.", 404);
        room = current;
      } else {
        await this.store.presence(room.id, member, value);
        return room;
      }
    }
    throw new ApiError(
      409,
      "The room changed while reconnecting. Please retry.",
    );
  }
  async authenticate(roomId: string, raw: string) {
    const auth = await this.store.authenticate(
      await digest(secret(raw)),
      roomId,
    );
    requireApi(auth, "This private seat key is invalid.", 401);
    return auth.memberId;
  }
  async get(roomId: string, memberId: string) {
    const room = await this.store.get(roomId);
    requireApi(room, "Room not found.", 404);
    memberOf(room, memberId);
    return this.state(await this.touch(room, memberId), memberId);
  }
  async list() {
    const rooms = await Promise.all(
      (await this.store.publicRooms())
        .filter((room) => room.members.length < room.settings.capacity)
        .map(async (room) =>
          summary(room, await this.store.presences(room.id), this.now()),
        ),
    );
    return rooms.filter((room) =>
      room.members.some((member) => member.connected),
    );
  }
  async create(body: { name: unknown; secret: unknown; settings: unknown }) {
    const hash = await digest(secret(body.secret)),
      existing = await this.store.authenticate(hash);
    if (existing) {
      const room = await this.store.get(existing.roomId);
      requireApi(room, "Room not found.", 404);
      return this.state(room, existing.memberId);
    }
    const now = this.now(),
      member: Member = {
        id: id(),
        name: name(body.name),
        style: 0,
        ready: false,
        playerId: null,
      };
    const room: RoomRecord = {
      id: id(),
      host: member.id,
      status: "waiting",
      settings: settings(body.settings),
      members: [member],
      game: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      clocks: {},
      votes: {},
      pause: { since: null, total: 0, votes: [] },
      audit: [{ at: now, member: member.id, action: "Room created" }],
    };
    try {
      await this.store.insert(room, hash, member.id);
    } catch (error) {
      const recovered = await this.store.authenticate(hash);
      if (!recovered) throw error;
      return this.get(recovered.roomId, recovered.memberId);
    }
    await this.touch(room, member.id);
    return this.state(room, member.id);
  }
  async join(roomId: string, body: { name: unknown; secret: unknown }) {
    const hash = await digest(secret(body.secret)),
      existing = await this.store.authenticate(hash);
    if (existing) {
      requireApi(
        existing.roomId === roomId,
        "Use a separate private key for this room.",
        409,
      );
      return this.get(roomId, existing.memberId);
    }
    const newMember = id();
    for (let attempt = 0; attempt < 12; attempt++) {
      const recovered = await this.store.authenticate(hash);
      if (recovered) {
        requireApi(
          recovered.roomId === roomId,
          "Use a separate private key for this room.",
          409,
        );
        return this.get(roomId, recovered.memberId);
      }
      const room = await this.store.get(roomId);
      requireApi(room, "Room not found.", 404);
      requireApi(
        room.status === "waiting",
        "This game has already started.",
        409,
      );
      requireApi(
        room.members.length < room.settings.capacity,
        "This room is full.",
        409,
      );
      const previous = room.version;
      room.members.forEach((member) => (member.ready = false));
      room.members.push({
        id: newMember,
        name: name(body.name),
        style: room.members.length,
        ready: false,
        playerId: null,
      });
      room.updatedAt = this.now();
      if (
        await this.store.save(room, previous, id(), undefined, {
          hash,
          member: newMember,
        })
      ) {
        await this.touch(room, newMember);
        return this.state(room, newMember);
      }
    }
    throw new ApiError(409, "The room changed. Please try joining again.");
  }
  async lobbyAction(
    roomId: string,
    who: string,
    action: string,
    body: Record<string, unknown>,
  ) {
    for (let attempt = 0; attempt < 12; attempt++) {
      const room = await this.store.get(roomId);
      requireApi(room, "Room not found.", 404);
      const member = memberOf(room, who),
        previous = room.version,
        now = this.now();
      requireApi(
        room.status === "waiting",
        "Lobby changes are closed after the game starts.",
        409,
      );
      if (action === "ready") {
        requireApi(
          canonical(body.settings) === canonical(room.settings),
          "Settings changed. Review them before getting ready.",
          409,
        );
        member.ready = body.ready === true;
      } else if (action === "settings") {
        requireApi(
          room.host === who,
          "Only the room host can change settings.",
          403,
        );
        const next = settings(body.settings);
        requireApi(
          next.capacity >= room.members.length,
          "There are more players than seats.",
        );
        room.settings = next;
        room.members.forEach((m) => (m.ready = false));
      } else if (action === "leave" || action === "remove-waiting") {
        const target = action === "leave" ? who : String(body.member);
        requireApi(
          action === "leave" || room.host === who,
          "Only the host can remove a waiting seat.",
          403,
        );
        memberOf(room, target);
        room.members = room.members.filter((m) => m.id !== target);
        room.members.forEach((m, i) => {
          m.style = i;
          m.ready = false;
        });
        if (room.host === target && room.members.length)
          room.host = room.members[0].id;
        if (!room.members.length) room.status = "finished";
        room.audit.push({
          at: now,
          member: who,
          action: `Waiting seat closed: ${target}`,
        });
      } else if (action === "start") {
        requireApi(room.host === who, "Only the host can start the game.", 403);
        requireApi(
          body.version === room.version,
          "The roster changed. Review the room before starting.",
          409,
        );
        requireApi(
          room.members.length >= 2 && room.members.every((m) => m.ready),
          "Everyone must be ready; at least two players are needed.",
          409,
        );
        if (room.settings.format === "live") {
          const presences = await this.store.presences(room.id);
          requireApi(
            room.members.every(
              (m) => now - (presences[m.id]?.seenAt ?? 0) < CONNECTED,
            ),
            "Everyone must be connected to start a live game.",
            409,
          );
        }
        const random = new Uint32Array(1);
        crypto.getRandomValues(random);
        room.members.forEach((m, i) => (m.playerId = i));
        room.game = createGame(
          room.members.length,
          random[0],
          room.members.map((m) => m.name),
          normalConfig(room.settings),
        );
        room.status = "playing";
        syncClocks(room, now);
        room.audit.push({
          at: now,
          member: who,
          action: "Game started with the reviewed roster/settings",
        });
      } else throw new ApiError(404, "Unknown lobby action.");
      room.updatedAt = now;
      if (await this.store.save(room, previous, id()))
        return action === "leave" ? { left: true } : this.state(room, who);
    }
    throw new ApiError(409, "The room changed. Please try again.");
  }
  async command(roomId: string, who: string, request: CommandRequest) {
    requireApi(
      typeof request.id === "string" &&
        /^[a-zA-Z0-9_-]{8,80}$/.test(request.id),
      "A command ID is required.",
    );
    requireApi(
      request.command &&
        typeof request.command === "object" &&
        request.command.type !== "forfeit",
      "This command is not available.",
      403,
    );
    const fingerprint = await digest(canonical(request.command));
    for (let attempt = 0; attempt < 12; attempt++) {
      const room = await this.store.get(roomId);
      requireApi(room, "Room not found.", 404);
      const member = memberOf(room, who),
        previous = room.version,
        g = room.game,
        now = this.now();
      requireApi(
        g && room.status !== "waiting",
        "The game has not started.",
        409,
      );
      const prior = await this.store.receipt(roomId, who, request.id);
      if (prior) {
        requireApi(
          prior.digest === fingerprint,
          "This command ID was already used for a different choice.",
          409,
        );
        return { snapshot: await this.state(room, who), accepted: request.id };
      }
      requireApi(room.pause.since === null, "The game is paused.", 409);
      requireApi(
        member.playerId !== null && !g.players[member.playerId].forfeited,
        "This seat has forfeited.",
        403,
      );
      const owner = decisionOwners(g).find(
        (o) => decisionActor(g, o) === member.playerId,
      );
      requireApi(owner !== undefined, "It is not your decision.", 403);
      requireApi(
        request.decisionId === decisionKey(g, owner),
        "The decision changed. Refresh your choices.",
        409,
      );
      requireApi(
        request.revision === g.revision || request.command.type === "bid",
        "The game changed. Refresh your choices.",
        409,
      );
      let next: Game;
      try {
        next = applyCommand(g, owner, request.command);
      } catch (error) {
        throw new ApiError(
          422,
          error instanceof Error ? error.message : "This choice is not legal.",
        );
      }
      const recovery = next.pending?.kind === "reserve" ? next.pending : null;
      const notice =
        reserveNotice(next) ??
        (recovery
          ? {
              title: "Reserve shortfall",
              messages: [
                ...recovery.messages,
                ...(hasTech(next, recovery.owner, "flexible-economy")
                  ? [
                      "Flexible economy can return Credits to Reserve before applying this effect.",
                    ]
                  : []),
              ],
            }
          : null);
      const predictable =
        notice &&
        request.command.type !== "completeReserve" &&
        (!recovery || recovery.owner === owner) &&
        next.turn === g.turn &&
        !revealsHiddenInformation(g, next);
      const warnings = request.confirmIntent
        ? []
        : intentWarnings(g, request.command);
      if (predictable && !request.confirmReserve)
        warnings.push(...notice.messages);
      if (
        request.command.type === "completeReserve" &&
        g.pending?.kind === "reserve" &&
        !request.confirmReserve
      ) {
        const available = Math.min(
          g.players[g.pending.owner].reserve,
          g.pending.remaining,
        );
        const applied =
          g.pending.effect.kind === "reinforce"
            ? Object.values(request.command.ships ?? {}).reduce(
                (a, b) => a + b,
                0,
              )
            : available;
        if (applied < g.pending.remaining)
          warnings.push(
            `${g.pending.label} needs ${g.pending.remaining} more rockets; only ${applied} will be applied. Flexible economy can return Credits to Reserve before applying this effect.`,
          );
      }
      if (warnings.length)
        return {
          confirmation: {
            title: predictable ? notice.title : "Check this decision",
            messages: warnings,
            reserve:
              Boolean(predictable) ||
              request.command.type === "completeReserve",
          },
          snapshot: await this.state(room, who),
        };
      if (predictable && request.confirmReserve)
        next = applyCommand(next, next.turn, {
          type:
            next.pending?.kind === "reserve" ? "finishReserve" : "acknowledge",
        });
      member.historyFrom = g.revision;
      room.game = stabilize(next);
      room.status = room.game.phase === "finished" ? "finished" : "playing";
      room.updatedAt = now;
      room.votes = {};
      syncClocks(room, now);
      room.audit.push({
        at: now,
        member: who,
        action: `Accepted ${request.command.type}${owner !== member.playerId ? ` on behalf of player ${owner}` : ""}`,
      });
      if (
        await this.store.save(room, previous, id(), {
          member: who,
          id: request.id,
          digest: fingerprint,
        })
      ) {
        return {
          snapshot: await this.state(await this.touch(room, who, true), who),
          accepted: request.id,
        };
      }
    }
    throw new ApiError(
      409,
      "Another decision arrived at the same time. Refresh and try again.",
    );
  }
  async playAction(
    roomId: string,
    who: string,
    action: string,
    body: Record<string, unknown>,
  ) {
    for (let attempt = 0; attempt < 12; attempt++) {
      const room = await this.store.get(roomId);
      requireApi(room, "Room not found.", 404);
      const member = memberOf(room, who),
        previous = room.version,
        now = this.now();
      requireApi(
        room.game && room.status === "playing",
        "This game is not active.",
        409,
      );
      requireApi(
        member.playerId !== null && !isForfeited(room, member),
        "This seat has forfeited.",
        403,
      );
      if (action === "ack-presence") {
        return this.state(await this.touch(room, who, true), who);
      }
      if (action === "pause") {
        if (body.resume === true) {
          if (room.pause.since !== null)
            room.pause.total += now - room.pause.since;
          room.pause.since = null;
          room.pause.votes = [];
        } else {
          room.pause.votes = [...new Set([...room.pause.votes, who])];
          if (
            room.members
              .filter((m) => !isForfeited(room, m))
              .every((m) => room.pause.votes.includes(m.id))
          )
            room.pause.since = now;
        }
        room.audit.push({
          at: now,
          member: who,
          action:
            body.resume === true ? "Table resumed" : "Table pause requested",
          details: {
            paused: room.pause.since !== null,
            approvals: room.pause.votes.slice(),
          },
        });
      } else if (action === "resign" || action === "vote-remove") {
        requireApi(
          room.pause.since === null,
          "Resume the table before removing a player.",
          409,
        );
        let target = member;
        if (action === "vote-remove") {
          target = memberOf(room, String(body.member));
          const state = removalStates(
            room,
            await this.store.presences(room.id),
            now,
          ).find((v) => v.memberId === target.id);
          requireApi(
            state?.eligible && state.voters.includes(who),
            "This removal vote is not currently available.",
            409,
          );
          state.yes = [...new Set([...state.yes, who])];
          room.votes[target.id] = state.yes;
          room.audit.push({
            at: now,
            member: who,
            action: "Idle removal vote",
            details: {
              target: target.id,
              electorate: state.voters,
              approvals: state.yes,
              needed: state.needed,
              format: room.settings.format,
              decision: room.clocks[target.id] ?? null,
              settings: room.settings,
            },
          });
          if (state.yes.length < state.needed) {
            room.updatedAt = now;
            if (await this.store.save(room, previous, id()))
              return this.state(room, who);
            continue;
          }
        }
        requireApi(
          target.playerId !== null && !isForfeited(room, target),
          "This player has already forfeited.",
          409,
        );
        room.game = stabilize(
          applyCommand(room.game, room.game.turn, {
            type: "forfeit",
            player: target.playerId,
          }),
        );
        room.status = room.game.phase === "finished" ? "finished" : "playing";
        if (room.host === target.id) {
          const nextHost = decisionActor(room.game, target.playerId);
          room.host = room.members.find((m) => m.playerId === nextHost)!.id;
        }
        room.votes = {};
        room.pause.votes = [];
        syncClocks(room, now);
        room.audit.push({
          at: now,
          member: who,
          action: `${action === "resign" ? "Voluntary resignation" : "Approved idle removal"}: ${target.name}`,
        });
      } else throw new ApiError(404, "Unknown game action.");
      room.updatedAt = now;
      if (await this.store.save(room, previous, id()))
        return this.state(room, who);
    }
    throw new ApiError(409, "The room changed. Please try again.");
  }
}
