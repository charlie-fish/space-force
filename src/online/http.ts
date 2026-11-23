import { RELEASE_VERSION } from "../version.js";
import { ApiError, OnlineService, digest } from "./service.js";
import type { CommandRequest } from "./protocol.js";

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers });
async function body(request: Request): Promise<Record<string, unknown>> {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  )
    throw new ApiError(415, "Send JSON data.");
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "Missing request data.");
  const parts: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    total += part.value.length;
    if (total > 16_384) {
      await reader.cancel();
      throw new ApiError(413, "This request is too large.");
    }
    parts.push(part.value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new ApiError(400, "Request data is not valid JSON.");
  }
  const validate = (item: unknown, depth = 0) => {
    if (depth > 14) throw new ApiError(400, "Request nesting is too deep.");
    if (item && typeof item === "object")
      for (const [key, child] of Object.entries(item)) {
        if (["__proto__", "prototype", "constructor"].includes(key))
          throw new ApiError(400, "Invalid request key.");
        validate(child, depth + 1);
      }
  };
  validate(value);
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ApiError(400, "Send an object.");
  return value as Record<string, unknown>;
}
export async function handleApi(
  request: Request,
  service: OnlineService,
  peer = "unknown",
  publicOrigin?: string,
): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/")) return null;
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== url.origin && origin !== publicOrigin)
      throw new ApiError(403, "Cross-origin game requests are not allowed.");
    if (request.method === "GET" && url.pathname === "/api/health") {
      await service.store.db.query("SELECT id FROM sf_rooms LIMIT 0");
      return json({ ok: true, version: RELEASE_VERSION });
    }
    if (request.method === "GET" && url.pathname === "/api/rooms") {
      if (
        !(await service.store.limit(
          `directory:${await digest(peer)}`,
          service.now(),
          120,
          60_000,
        ))
      )
        throw new ApiError(
          429,
          "Please wait before refreshing the directory again.",
        );
      return json({ rooms: await service.list(), serverTime: service.now() });
    }
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[1] !== "rooms") throw new ApiError(404, "Not found.");
    if (request.method === "POST" && parts.length === 2) {
      if (
        !(await service.store.limit(
          `create:${await digest(peer)}`,
          service.now(),
          10,
          600_000,
        ))
      )
        throw new ApiError(
          429,
          "Too many room creations. Please wait a little.",
        );
      const data = await body(request);
      return json(
        await service.create({
          name: data.name,
          secret: data.secret,
          settings: data.settings,
        }),
        201,
      );
    }
    const roomId = parts[2];
    if (!roomId || !/^[a-f0-9-]{36}$/.test(roomId))
      throw new ApiError(404, "Room not found.");
    if (request.method === "POST" && parts[3] === "join") {
      if (
        !(await service.store.limit(
          `join:${await digest(peer)}`,
          service.now(),
          20,
          60_000,
        ))
      )
        throw new ApiError(
          429,
          "Too many join attempts. Please wait a minute.",
        );
      const data = await body(request);
      return json(
        await service.join(roomId, { name: data.name, secret: data.secret }),
        201,
      );
    }
    const bearer = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(
      request.headers.get("authorization") ?? "",
    )?.[1];
    if (!bearer) throw new ApiError(401, "Your private seat key is required.");
    const member = await service.authenticate(roomId, bearer);
    if (
      request.method === "GET" &&
      !(await service.store.limit(
        `read:${await digest(bearer)}`,
        service.now(),
        180,
        60_000,
      ))
    )
      throw new ApiError(429, "Please wait before refreshing again.");
    if (request.method === "GET" && parts[3] === "summary") {
      const room = await service.store.get(roomId);
      if (!room) throw new ApiError(404, "Room not found.");
      const state = await service.state(room, member);
      return json({
        room: state.room.id,
        status: state.room.status,
        format: state.room.settings.format,
        canAct: state.canAct,
        round: state.game?.round ?? 0,
      });
    }
    if (request.method === "GET" && parts.length === 3) {
      const snapshot = await service.get(roomId, member);
      const etag = `"${snapshot.room.version}:${snapshot.room.members.map((m) => Number(m.connected)).join("")}:${snapshot.clocks.map((c) => Number(c.warning)).join("")}:${snapshot.removals.map((r) => Number(r.eligible)).join("")}"`;
      const response =
        request.headers.get("if-none-match") === etag
          ? new Response(null, { status: 304, headers })
          : json(snapshot);
      response.headers.set("ETag", etag);
      response.headers.set("X-Server-Time", String(snapshot.serverTime));
      return response;
    }
    if (request.method !== "POST" || parts.length !== 4)
      throw new ApiError(404, "Not found.");
    if (
      !(await service.store.limit(
        `write:${await digest(bearer)}`,
        service.now(),
        300,
        60_000,
      ))
    )
      throw new ApiError(429, "Too many actions. Please wait a moment.");
    const data = await body(request),
      action = parts[3];
    if (action === "command")
      return json(
        await service.command(
          roomId,
          member,
          data as unknown as CommandRequest,
        ),
      );
    if (
      ["ready", "settings", "leave", "remove-waiting", "start"].includes(action)
    )
      return json(await service.lobbyAction(roomId, member, action, data));
    if (["ack-presence", "pause", "resign", "vote-remove"].includes(action))
      return json(await service.playAction(roomId, member, action, data));
    throw new ApiError(404, "Not found.");
  } catch (error) {
    if (error instanceof ApiError)
      return json({ error: error.message }, error.status);
    return json(
      {
        error:
          "The server could not confirm this change. Retry the same request to check its result.",
      },
      503,
    );
  }
}
