// Baut vendor/mcbe-leveldb.js: mcbe-leveldb-reader (exakt gepinnt) plus die Teile von zip.js,
// die der Welt-Import selbst braucht (configure, ZipReader, BlobReader, Uint8ArrayWriter),
// als ein ES-Modul für Browser, Web Worker und Node. Aufruf: cd companion/tools && npm run vendor
import { build } from "esbuild";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { gzipSync } from "node:zlib";

const HIER = path.dirname(fileURLToPath(import.meta.url));
const ZIEL = path.join(HIER, "..", "vendor", "mcbe-leveldb.js");
const version = (paket) => JSON.parse(readFileSync(path.join(HIER, "node_modules", paket, "package.json"), "utf8")).version;

const LEVELDB = "5.0.1";   // nur diese Version ist geprüft (Besucher-API von parseLdbContent/parseLogContent)
if (version("mcbe-leveldb-reader") !== LEVELDB) {
  console.error(`mcbe-leveldb-reader ${version("mcbe-leveldb-reader")} installiert, erwartet ${LEVELDB} – npm ci ausführen`);
  process.exit(1);
}

const kopf = `/*! vendor/mcbe-leveldb.js – erzeugt von companion/tools/vendor-bauen.mjs, nicht von Hand ändern.
 * mcbe-leveldb-reader ${LEVELDB} · MIT · Copyright (c) 2025 SuperLlama88888 (Code aus Mojangs minecraft-creator-tools)
 * @zip.js/zip.js ${version("@zip.js/zip.js")} · BSD-3-Clause · Copyright (c) 2023, Gildas Lormeau
 * pako ${version("pako")} · MIT und Zlib · Copyright (C) 2014-2017 by Vitaly Puzrin and Andrei Tuputcyn
 * Lizenztexte: vendor/LIZENZEN.txt */`;

await build({
  stdin: {
    contents: `
      export { LevelDb, readMcworld, getLevelDbFilesFromMcworld, openLevelDb, isInternalLevelDbFile,
               zipEntryBasename, zipEntryDirname } from "mcbe-leveldb-reader";
      export { configure, ZipReader, BlobReader, Uint8ArrayWriter } from "@zip.js/zip.js";`,
    resolveDir: HIER,
    loader: "js",
  },
  bundle: true,
  format: "esm",
  platform: "browser",   // #nativeZlib → Browser-Variante, entpackt wird mit pako
  target: "es2022",
  minify: true,
  legalComments: "none",
  banner: { js: kopf },
  outfile: ZIEL,
  logLevel: "warning",
});

// Lizenztexte der gebündelten Pakete neben das Bundle
writeFileSync(path.join(path.dirname(ZIEL), "LIZENZEN.txt"), ["mcbe-leveldb-reader", "@zip.js/zip.js", "pako"].map((paket) =>
  `==== ${paket} ${version(paket)} ====\n\n${readFileSync(path.join(HIER, "node_modules", paket, "LICENSE"), "utf8").trim()}\n`).join("\n"));

const groesse = statSync(ZIEL).size;
console.log(`${path.relative(process.cwd(), ZIEL)}: ${Math.round(groesse / 1024)} KB, gzip ${Math.round(gzipSync(readFileSync(ZIEL)).length / 1024)} KB`);
