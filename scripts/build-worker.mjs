import { build } from "vite";
import {
  readFileSync,
  readdirSync,
  statSync,
  mkdirSync,
  writeFileSync,
  copyFileSync,
} from "node:fs";
import { resolve, relative, extname } from "node:path";
import { createHash } from "node:crypto";

const root = resolve("dist"),
  assets = {};
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".webp": "image/webp",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};
function collect(directory) {
  for (const name of readdirSync(directory)) {
    const path = resolve(directory, name);
    if (path === resolve(root, "server") || name === ".openai") continue;
    if (statSync(path).isDirectory()) collect(path);
    else {
      const bytes = readFileSync(path);
      assets[`/${relative(root, path).replaceAll("\\", "/")}`] = {
        body: bytes.toString("base64"),
        hash: createHash("sha256").update(bytes).digest("hex"),
        type: mime[extname(path)] ?? "application/octet-stream",
      };
    }
  }
}
collect(root);
await build({
  configFile: false,
  plugins: [
    {
      name: "space-force-assets",
      resolveId(id) {
        if (id === "virtual:space-force-assets") return "\0space-force-assets";
      },
      load(id) {
        if (id === "\0space-force-assets")
          return `export default ${JSON.stringify(assets)};`;
      },
    },
  ],
  ssr: { target: "webworker", noExternal: true },
  build: {
    ssr: true,
    outDir: "dist/server",
    emptyOutDir: true,
    target: "es2022",
    minify: true,
    rollupOptions: {
      input: resolve("src/worker.ts"),
      output: {
        format: "es",
        entryFileNames: "index.js",
        inlineDynamicImports: true,
      },
    },
  },
});
mkdirSync("dist/.openai", { recursive: true });
copyFileSync(".openai/hosting.json", "dist/.openai/hosting.json");
writeFileSync(
  "work/worker-build.json",
  JSON.stringify(
    {
      assets: Object.keys(assets).length,
      workerBytes: statSync("dist/server/index.js").size,
    },
    null,
    2,
  ),
);
console.log(
  `Worker build: ${Object.keys(assets).length} self-hosted files; D1 tables are applied from committed migrations.`,
);
