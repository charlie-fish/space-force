import assets from "virtual:space-force-assets";
import { handleApi } from "./online/http.js";
import { OnlineService } from "./online/service.js";
import { RoomStore } from "./online/store.js";
import type { SqlDriver, SqlQuery, SqlResult } from "./online/store.js";

interface D1Result {
  results?: Record<string, unknown>[];
  meta?: { changes?: number };
}
interface Statement {
  bind(...values: unknown[]): Statement;
  all(): Promise<D1Result>;
}
interface Database {
  prepare(sql: string): Statement;
  batch(statements: Statement[]): Promise<D1Result[]>;
}
interface Environment {
  DB: Database;
  PUBLIC_ORIGIN?: string;
}
const services = new WeakMap<Database, OnlineService>();
const normalize = (result: D1Result): SqlResult => ({
  results: result.results ?? [],
  changes: result.meta?.changes ?? 0,
});
function serviceFor(db: Database) {
  let service = services.get(db);
  if (!service) {
    const driver: SqlDriver = {
      async query(sql: string, params: unknown[] = []) {
        return normalize(
          await db
            .prepare(sql)
            .bind(...params)
            .all(),
        );
      },
      async batch(queries: SqlQuery[]) {
        return (
          await db.batch(
            queries.map((q) => db.prepare(q.sql).bind(...q.params)),
          )
        ).map(normalize);
      },
    };
    service = new OnlineService(new RoomStore(driver));
    services.set(db, service);
  }
  return service;
}
const security = {
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};
export default {
  async fetch(request: Request, env: Environment): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      if (!env.DB)
        return Response.json(
          { error: "The online database is unavailable." },
          {
            status: 503,
            headers: { ...security, "Cache-Control": "no-store" },
          },
        );
      const response = await handleApi(
        request,
        serviceFor(env.DB),
        request.headers.get("cf-connecting-ip") ?? "unknown",
        env.PUBLIC_ORIGIN,
      );
      for (const [key, value] of Object.entries(security))
        response!.headers.set(key, value);
      return response!;
    }
    if (!["GET", "HEAD"].includes(request.method))
      return new Response("Not found", { status: 404, headers: security });
    const path = url.pathname === "/" ? "/index.html" : url.pathname;
    const asset = assets[path];
    if (!asset)
      return new Response("Not found", { status: 404, headers: security });
    const headers = {
      ...security,
      "Content-Type": asset.type,
      ETag: `"${asset.hash}"`,
      "Cache-Control":
        path === "/index.html"
          ? "no-cache"
          : path.startsWith("/assets/")
            ? "public,max-age=31536000,immutable"
            : "public,max-age=3600",
    };
    if (request.headers.get("if-none-match") === headers.ETag)
      return new Response(null, { status: 304, headers });
    return new Response(
      request.method === "HEAD"
        ? null
        : Uint8Array.from(atob(asset.body), (c) => c.charCodeAt(0)),
      { headers },
    );
  },
};
