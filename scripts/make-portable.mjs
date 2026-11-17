import assert from "node:assert/strict";
import {
  cpSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";

// Keep the regular, cacheable HTTP build intact. This second copy inlines its
// module and CSS so a desktop playtester can also try opening index.html locally.
const output = resolve("work/portable");
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
cpSync("dist/art", resolve(output, "art"), { recursive: true });
let html = readFileSync("dist/index.html", "utf8");
const script = /<script type="module" crossorigin src="([^"]+)"><\/script>/;
const style = /<link rel="stylesheet" crossorigin href="([^"]+)">/;
const scriptFile = html.match(script)?.[1],
  styleFile = html.match(style)?.[1];
assert.ok(
  scriptFile && styleFile,
  "Expected one bundled module and stylesheet.",
);
const code = readFileSync(resolve("dist", scriptFile), "utf8").replace(
  /<\/script/gi,
  "<\\/script",
);
const css = readFileSync(resolve("dist", styleFile), "utf8").replace(
  /<\/style/gi,
  "<\\/style",
);
html = html.replace(script, () => `<script type="module">${code}</script>`);
html = html.replace(style, () => `<style>${css}</style>`);
writeFileSync(resolve(output, "index.html"), html);
writeFileSync(
  resolve(output, "START-HERE.txt"),
  `Space Force local prototype 0.15.0\n\nExtract the entire ZIP, keeping the art folder next to index.html.\nTry opening index.html in a desktop browser. Two to seven people share this device.\nOn iPhone, Files is a document preview and cannot run the game reliably. Open an HTTP(S) address in Safari instead. Phone testing instructions:\nhttps://github.com/charlie-fish/space-force/blob/prototype/normal-turns/docs/PHONE_TESTING.md\n\nIf your desktop browser blocks local files, use the repository's HTTP instructions instead:\nhttps://github.com/charlie-fish/space-force/blob/prototype/normal-turns/README.md\n\nNormal turns and all 30 Tech effects. Select Last ten Techs to test the additions. Its labelled Foresight test keeps that card while Event effects/auctions stay disabled; normal simpler Events exclude it. Printed presets, Random and the R01 starting-Tech scenario are also available. No remote rooms in this build.\nGame state stays on the device. Use Game record to export a match.\nBrowser/device visual checks remain pending; this portable copy has build checks only.\n`,
);
assert.ok(
  !html.includes('src="./assets/'),
  "Portable copy must not fetch a separate script.",
);
console.log("Portable playtest copy: work/portable/index.html");
