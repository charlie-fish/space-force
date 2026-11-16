import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";

const dist = resolve("dist");
const assets = readdirSync(resolve(dist, "assets"));
const jsBytes = assets
  .filter((f) => f.endsWith(".js"))
  .reduce(
    (n, f) => n + gzipSync(readFileSync(resolve(dist, "assets", f))).length,
    0,
  );
const cssBytes = assets
  .filter((f) => f.endsWith(".css"))
  .reduce(
    (n, f) => n + gzipSync(readFileSync(resolve(dist, "assets", f))).length,
    0,
  );
assert.ok(
  jsBytes <= 200_000,
  `Compressed JavaScript exceeds the 200 KB budget: ${jsBytes}`,
);
const manifest = JSON.parse(readFileSync("src/art-data.json", "utf8"));
for (const section of [
  manifest.systems,
  manifest.cards,
  manifest.aids,
  manifest.backs,
  manifest.features,
  { firstPlayer: manifest.firstPlayer },
  { cover: manifest.cover },
]) {
  for (const asset of Object.values(section))
    assert.ok(statSync(resolve(dist, `.${asset.image}`)).isFile(), asset.image);
}
const html = readFileSync(resolve(dist, "index.html"), "utf8");
assert.ok(
  !html.includes('src="/assets/'),
  "Build must support repository subpaths.",
);
console.log(
  JSON.stringify(
    {
      compressedJavaScriptBytes: jsBytes,
      compressedCssBytes: cssBytes,
      coverBytes: manifest.cover.bytes,
      initialBytesWithoutHttpHeaders:
        jsBytes + cssBytes + manifest.cover.bytes + gzipSync(html).length,
    },
    null,
    2,
  ),
);
