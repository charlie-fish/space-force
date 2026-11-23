import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { pathToFileURL } from "node:url";
import { sqliteStore } from "./sqlite.mjs";
import { OnlineService } from "../work/compiled/online/service.js";
import { handleApi } from "../work/compiled/online/http.js";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".webp": "image/webp",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};
export const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'";
export function createOnlineServer({
  path = resolve("private-data/space-force.sqlite"),
  staticRoot = resolve("dist"),
  now = Date.now,
  publicOrigin = process.env.PUBLIC_ORIGIN,
} = {}) {
  const storage = sqliteStore(path),
    service = new OnlineService(storage.store, now);
  const server = createServer(async (req, res) => {
    try {
      let length = 0;
      const parts = [];
      for await (const part of req) {
        length += part.length;
        if (length > 20_000) {
          res.writeHead(413);
          res.end("Request too large");
          return;
        }
        parts.push(part);
      }
      const request = new Request(
        new URL(req.url, `http://${req.headers.host ?? "localhost"}`),
        {
          method: req.method,
          headers: Object.entries(req.headers)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, Array.isArray(v) ? v.join(",") : v]),
          ...(length ? { body: Buffer.concat(parts), duplex: "half" } : {}),
        },
      );
      let response = await handleApi(
        request,
        service,
        req.socket.remoteAddress ?? "unknown",
        publicOrigin,
      );
      if (!response) {
        const pathname = decodeURIComponent(new URL(request.url).pathname);
        const file = resolve(
          staticRoot,
          pathname === "/" ? "index.html" : `.${pathname}`,
        );
        if (
          !file.startsWith(`${staticRoot}/`) ||
          !["GET", "HEAD"].includes(req.method)
        )
          response = new Response("Not found", { status: 404 });
        else {
          try {
            const info = await stat(file);
            if (!info.isFile()) throw Error("not a file");
            response = new Response(
              req.method === "HEAD" ? null : await readFile(file),
              {
                headers: {
                  "Content-Type":
                    MIME[extname(file)] ?? "application/octet-stream",
                  "Cache-Control": file.endsWith("index.html")
                    ? "no-cache"
                    : "public,max-age=86400",
                },
              },
            );
          } catch {
            response = new Response("Not found", { status: 404 });
          }
        }
      }
      response.headers.set("Content-Security-Policy", CSP);
      response.headers.set("X-Content-Type-Options", "nosniff");
      response.headers.set("Referrer-Policy", "no-referrer");
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch {
      res.writeHead(503, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      res.end(
        JSON.stringify({
          error:
            "The connection could not confirm this change. Please reconnect.",
        }),
      );
    }
  });
  return {
    server,
    service,
    close: async () => {
      await new Promise((resolveClose) => server.close(resolveClose));
      storage.close();
    },
  };
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const port = Number(process.env.PORT ?? 3000),
    app = createOnlineServer({
      path:
        process.env.SPACE_FORCE_DB ??
        resolve("private-data/space-force.sqlite"),
    });
  app.server.listen(port, "0.0.0.0", () =>
    console.log(`Space Force online server listening on port ${port}`),
  );
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, async () => {
      await app.close();
      process.exit(0);
    });
}
