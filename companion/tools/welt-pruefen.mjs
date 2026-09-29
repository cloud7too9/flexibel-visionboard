// Prüfskript für eine .mcworld – Phase 1 des Bauplans „Biome aus .mcworld“.
//
//   node welt-pruefen.mjs <datei.mcworld> [--weg streaming|komplett|beide] [--massstab 4]
//                         [--punkt x,z[,dimension]] … [--ziel ../tests/bilder]
//
// Gibt Weltname, Seed, Version, Chunks je Dimension, Ausdehnung, die häufigsten Biome,
// unbekannte IDs, Laufzeit und Spitzenspeicher aus und schreibt je Dimension ein PNG
// (1 Pixel = 1 Chunk × massstab; unerkundet durchsichtig, unbekannte IDs rot).
// --weg beide: jeder Weg in einem eigenen Prozess (sauberer Spitzenspeicher), danach Vergleich.
// --punkt: Biom des Chunks, Höhenkarte in beiden Lesarten (z*16+x und x*16+z) und das Biom
//          an der Oberfläche – zum Abgleich mit Chunkbase und mit der Y-Anzeige im Spiel.
import { openAsBlob, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { deflateSync, crc32 } from "node:zlib";
import path from "node:path";
import { weltLesen, WeltFehler } from "../biom-welt.js";
import { data3dLesen, biomAn, oberflaechenBiom, MIN_Y, kachelZuBase64, KACHEL_CHUNKS, DIMENSIONEN, STANDARD_OPTIONEN } from "../biom-dekoder.js";
import "../biom-ids.js";

const HIER = path.dirname(fileURLToPath(import.meta.url));
const BIOME = new Map(globalThis.BIOM_IDS.map((b) => [b.id, b]));
const VERMUTET = { 192: "Cherry Grove", 193: "Pale Garden", 195: "Dappled Forest" };   // aus dem Bauplan, unbestätigt
const DIM_NAME = { overworld: "Oberwelt", nether: "Nether", end: "End" };
const zahl = (n) => n.toLocaleString("de-DE");
const UNBEKANNT_FARBE = "#ff0000";   // kein Biom in biom-ids.js hat diese Farbe (Pilzland ist Magenta)

// ---------- Argumente ----------
const args = process.argv.slice(2);
const wert = (name, standard) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : standard; };
const datei = args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
if (!datei) {
  console.log("Aufruf: node welt-pruefen.mjs <datei.mcworld> [--weg streaming|komplett|beide] [--massstab 4] [--punkt x,z[,dimension]] [--ziel ordner]");
  process.exit(1);
}
const weg = wert("--weg", "streaming");
const massstab = Math.max(1, Number(wert("--massstab", 1)) || 1);
const ziel = path.resolve(wert("--ziel", path.join(HIER, "..", "tests", "bilder")));
const punkte = args.flatMap((a, i) => (a === "--punkt" ? [args[i + 1]] : [])).map((p) => {
  const [x, z, dim = "overworld"] = p.split(",");
  return { x: Number(x), z: Number(z), dim, cx: Math.floor(Number(x) / 16), cz: Math.floor(Number(z) / 16) };
});

// ---------- Einzelner Lauf (auch als Kindprozess mit --roh) ----------
async function lauf(w) {
  const start = performance.now();
  // openAsBlob: dateigestützt wie eine File im Browser – die Welt liegt nicht als Ganzes im Speicher
  const ergebnis = await weltLesen(await openAsBlob(datei), {
    weg: w, biomIds: [...BIOME.keys()], roh: punkte.map((p) => `${p.dim}:${p.cx}:${p.cz}`),
  });
  return { ...ergebnis, sekunden: (performance.now() - start) / 1000, spitzeMB: process.resourceUsage().maxRSS / 1024 };
}

if (args.includes("--roh")) {   // Kindprozess: Ergebnis als JSON
  const e = await lauf(weg);
  process.stdout.write(JSON.stringify({ meta: e.meta, sekunden: e.sekunden, spitzeMB: e.spitzeMB,
    kacheln: e.kacheln.map((k) => [k.dim, k.kx, k.kz, kachelZuBase64(k.daten)]) }));
  process.exit(0);
}

let ergebnis;
try {
  if (weg === "beide") {
    const kinder = ["streaming", "komplett"].map((w) => {
      const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), datei, "--weg", w, "--roh"], { maxBuffer: 1 << 30, encoding: "utf8" });
      if (r.status !== 0) throw new Error(`${w}: ${r.stderr || r.stdout}`);
      return [w, JSON.parse(r.stdout)];
    });
    for (const [w, e] of kinder) console.log(`${w.padEnd(10)} ${e.sekunden.toFixed(2)} s · Spitzenspeicher ${Math.round(e.spitzeMB)} MB`);
    const [a, b] = kinder.map(([, e]) => JSON.stringify(e.kacheln));
    console.log(a === b ? "Vergleich: beide Wege liefern identische Kacheln ✔" : "Vergleich: UNTERSCHIED zwischen den Wegen ✘");
    console.log("");
  }
  ergebnis = await lauf(weg === "beide" ? "streaming" : weg);
} catch (f) {
  console.error(f instanceof WeltFehler ? `Fehler: ${f.message}` : f);
  if (f.cause) console.error(f.cause);
  process.exit(1);
}

// ---------- Bericht ----------
const { meta, kacheln } = ergebnis;
console.log(`Welt:        ${meta.weltname}`);
console.log(`Seed:        ${meta.seed}`);
console.log(`Version:     ${meta.spielversion}`);
console.log(`Weg:         ${weg === "beide" ? "streaming" : weg} · ${ergebnis.sekunden.toFixed(2)} s · Spitzenspeicher ${Math.round(ergebnis.spitzeMB)} MB (ganzer Prozess)`);
console.log(`Data3D:      ${DIMENSIONEN.map((d) => `${DIM_NAME[d]} ${zahl(meta.chunks[d])}`).join(" · ")}`);
console.log(`Kacheln:     ${kacheln.length} (${zahl(kacheln.length * 2)} KB)`);

/** Chunks einer Dimension aus den Kacheln */
function chunksVon(dim) {
  const liste = [];
  for (const k of kacheln.filter((x) => x.dim === dim)) {
    for (let i = 0; i < k.daten.length; i += 1) {
      if (k.daten[i]) liste.push({ cx: k.kx * KACHEL_CHUNKS + (i % KACHEL_CHUNKS), cz: k.kz * KACHEL_CHUNKS + Math.floor(i / KACHEL_CHUNKS), id: k.daten[i] - 1 });
    }
  }
  return liste;
}

mkdirSync(ziel, { recursive: true });
const dateiname = String(meta.weltname || path.basename(datei, path.extname(datei))).replace(/[^\p{L}\p{N}_-]+/gu, "-").toLowerCase();
for (const dim of DIMENSIONEN) {
  const liste = chunksVon(dim);
  if (!liste.length) continue;
  const minX = Math.min(...liste.map((c) => c.cx)), maxX = Math.max(...liste.map((c) => c.cx));
  const minZ = Math.min(...liste.map((c) => c.cz)), maxZ = Math.max(...liste.map((c) => c.cz));
  console.log(`\n${DIM_NAME[dim]}: Chunks X ${minX}…${maxX}, Z ${minZ}…${maxZ} (≈ ${zahl((maxX - minX + 1) * 16)} × ${zahl((maxZ - minZ + 1) * 16)} Blöcke)`);
  const zaehler = new Map();
  for (const c of liste) zaehler.set(c.id, (zaehler.get(c.id) || 0) + 1);
  [...zaehler].sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([id, n], i) => {
    const name = BIOME.get(id)?.displayName ?? `unbekannt${VERMUTET[id] ? ` (vermutlich ${VERMUTET[id]})` : ""}`;
    console.log(`  ${String(i + 1).padStart(2)}. ${`${name} (${id})`.padEnd(34)} ${zahl(n).padStart(7)} Chunks ${String(Math.round(n / liste.length * 100)).padStart(3)} %`);
  });
  // PNG, 1 Pixel = 1 Chunk
  const s = (maxX - minX + 1) * massstab > 16384 ? 1 : massstab;
  const b = (maxX - minX + 1) * s, h = (maxZ - minZ + 1) * s;
  const pixel = new Uint8Array(b * h * 4);
  for (const c of liste) {
    const farbe = BIOME.get(c.id)?.color ?? UNBEKANNT_FARBE;
    const [r, g, bl] = [1, 3, 5].map((o) => parseInt(farbe.slice(o, o + 2), 16));
    for (let dy = 0; dy < s; dy += 1) for (let dx = 0; dx < s; dx += 1) {
      const i = (((c.cz - minZ) * s + dy) * b + (c.cx - minX) * s + dx) * 4;
      pixel[i] = r; pixel[i + 1] = g; pixel[i + 2] = bl; pixel[i + 3] = 255;
    }
  }
  const pfad = path.join(ziel, `welt-${dateiname}-${dim}.png`);
  writeFileSync(pfad, pngBauen(b, h, pixel));
  console.log(`  Bild: ${path.relative(process.cwd(), pfad)} (${b} × ${h}, Norden oben, X nach rechts)`);
}

if (meta.unbekannt.length) {
  console.log("\nUnbekannte Biom-IDs (in biom-ids.js nachtragen, sobald bestätigt):");
  for (const u of meta.unbekannt) {
    console.log(`  ${String(u.bedrockId).padStart(4)} · ${zahl(u.chunks).padStart(6)} Chunks · z. B. ${DIM_NAME[u.beispiel.dim]} X ${u.beispiel.x} Z ${u.beispiel.z}${VERMUTET[u.bedrockId] ? ` · vermutlich ${VERMUTET[u.bedrockId]}` : ""}`);
  }
} else console.log("\nKeine unbekannten Biom-IDs.");

// ---------- Punkte: Höhenkarte und Biom an einer Stelle ----------
for (const p of punkte) {
  const w = ergebnis.roh?.[`${p.dim}:${p.cx}:${p.cz}`];
  console.log(`\nPunkt X ${p.x} Z ${p.z} (${DIM_NAME[p.dim]}, Chunk ${p.cx} / ${p.cz}):`);
  const d = w && data3dLesen(w);
  if (!d) { console.log("  nicht erkundet"); continue; }
  const lx = p.x - p.cx * 16, lz = p.z - p.cz * 16;
  const chunk = chunksVon(p.dim).find((c) => c.cx === p.cx && c.cz === p.cz);
  console.log(`  Chunk-Biom: ${BIOME.get(chunk?.id)?.displayName ?? chunk?.id}`);
  if (p.dim !== "overworld") {
    const y = p.dim === "nether" ? STANDARD_OPTIONEN.netherBiomY : STANDARD_OPTIONEN.endBiomY;
    console.log(`  feste Höhe y ${y} (keine Oberfläche) → ${BIOME.get(oberflaechenBiom(d, lx, lz, p.dim))?.displayName}`);
  }
  for (const [name, index] of p.dim === "overworld" ? [["z*16+x", lz * 16 + lx], ["x*16+z", lx * 16 + lz]] : []) {
    const hoehe = d.hoehen[index], y = MIN_Y[p.dim] + hoehe - 1, rel = Math.max(0, y - MIN_Y[p.dim]);
    const sek = d.sektionen[Math.min(rel >> 4, d.sektionen.length - 1)];
    const id = biomAn(sek, lx, rel >> 4 < d.sektionen.length ? rel & 15 : 15, lz);
    console.log(`  Höhenkarte ${name}: Wert ${hoehe} → Oberfläche y ${y} → ${BIOME.get(id)?.displayName ?? id}`);
  }
  console.log(`  Sektionen: ${d.sektionen.length} · Biome in der Spalte von unten: ${[...new Set(d.sektionen.map((s, n) => biomAn(s, lx, 0, lz)))].map((id) => BIOME.get(id)?.displayName ?? id).join(" → ")}`);
}

/** RGBA → PNG (Filter 0, zlib) */
function pngBauen(breite, hoehe, rgba) {
  const zeilen = Buffer.alloc((breite * 4 + 1) * hoehe);
  for (let y = 0; y < hoehe; y += 1) Buffer.from(rgba.buffer, y * breite * 4, breite * 4).copy(zeilen, y * (breite * 4 + 1) + 1);
  const block = (typ, daten) => {
    const kopf = Buffer.alloc(8); kopf.writeUInt32BE(daten.length, 0); kopf.write(typ, 4, "ascii");
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([kopf.subarray(4), daten])), 0);
    return Buffer.concat([kopf, daten, crc]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(breite, 0); ihdr.writeUInt32BE(hoehe, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), block("IHDR", ihdr), block("IDAT", deflateSync(zeilen)), block("IEND", Buffer.alloc(0))]);
}
