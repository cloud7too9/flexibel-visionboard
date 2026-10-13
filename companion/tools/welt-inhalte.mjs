// Liest aus einer Bedrock-Welt (.zip aus der Dateien-App oder .mcworld), was das Datenbankschema
// (planung/schema/) aus dem Import erwartet: Weltname, Seed, Spawn, Chunks je Dimension, Dörfer mit
// Glocken, feste Strukturbereiche, Portale und Handelsangebote. Nur zum Prüfen, schreibt nichts in die App.
//
//   node welt-inhalte.mjs <welt.zip|welt.mcworld> [--json ergebnis.json]
//
// Gefunden an Max' Welt „letztes mal – Kopie“ (Bedrock 1.26.52, 13.10.2026):
//   · Strukturen stehen in Chunk-Tag 0x77 (AABBVolumes), nicht in 0x39 (gibt es nicht mehr)
//   · Glocken sind Block-Entities „Bell“ (Tag 0x31), nicht in VILLAGE_…_POI
//   · Portale im Schlüssel „portals“ → data.PortalRecords
//   · Handelsangebote („Offers“) haben nur Dorfbewohner, mit denen schon gehandelt wurde
import { openAsBlob, writeFileSync } from "node:fs";
import { readMcworld, configure } from "../vendor/mcbe-leveldb.js";

const datei = process.argv[2];
if (!datei) { console.log("Aufruf: node welt-inhalte.mjs <welt.zip|welt.mcworld> [--json ergebnis.json]"); process.exit(1); }
const jsonZiel = process.argv.includes("--json") ? process.argv[process.argv.indexOf("--json") + 1] : null;

const DIM = { 0: "overworld", 1: "nether", 2: "end" };
const LUECKE = 96;          // Teile derselben Struktur liegen höchstens so weit auseinander (Blöcke, X/Z)
const SPAWN_Y_OFFEN = 32767;

// ---------- NBT (Little Endian) ----------
function nbtLesen(bytes, start = 0) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const td = new TextDecoder();
  let p = start;
  const str = () => { const n = dv.getUint16(p, true); p += 2; const s = td.decode(bytes.subarray(p, p + n)); p += n; return s; };
  const wert = (t) => {
    switch (t) {
      case 1: return dv.getInt8(p++);
      case 2: { const v = dv.getInt16(p, true); p += 2; return v; }
      case 3: { const v = dv.getInt32(p, true); p += 4; return v; }
      case 4: { const v = dv.getBigInt64(p, true); p += 8; return v; }
      case 5: { const v = dv.getFloat32(p, true); p += 4; return v; }
      case 6: { const v = dv.getFloat64(p, true); p += 8; return v; }
      case 7: { const n = dv.getInt32(p, true); p += 4 + n; return n; }
      case 8: return str();
      case 9: { const tt = dv.getUint8(p++); const n = dv.getInt32(p, true); p += 4; return Array.from({ length: n }, () => wert(tt)); }
      case 10: { const o = {}; for (;;) { const tt = dv.getUint8(p++); if (!tt) return o; const k = str(); o[k] = wert(tt); } }
      case 11: { const n = dv.getInt32(p, true); p += 4; const a = []; for (let i = 0; i < n; i++, p += 4) a.push(dv.getInt32(p, true)); return a; }
      case 12: { const n = dv.getInt32(p, true); p += 4 + 8 * n; return n; }
      default: throw new Error(`NBT-Typ ${t}`);
    }
  };
  const wurzeln = [];
  while (p < bytes.length) { const t = dv.getUint8(p++); if (!t) continue; str(); wurzeln.push(wert(t)); }
  return wurzeln;
}

// ---------- Welt lesen ----------
configure({ useWebWorkers: false });
const leise = console.log; console.log = () => {};
const eintraege = await readMcworld(await openAsBlob(datei));
console.log = leise;

const ergebnis = { welt: {}, chunks: { overworld: 0, nether: 0, end: 0 }, doerfer: [], glockenOhneDorf: [], strukturen: [], portale: [], handel: {} };
const istText = (k) => /^[\x20-\x7e]+$/.test(k);
const glocken = [], teile = [], dorfBereiche = [];
let dorfbewohner = 0, mitAngeboten = 0, rezepte = 0;

for (const [k, e] of eintraege) {
  const kb = e.keyBytes, v = e.value;
  if (!v) continue;
  if (!istText(k) && (kb.length === 9 || kb.length === 13)) {
    const dv = new DataView(kb.buffer, kb.byteOffset, kb.byteLength);
    const dim = DIM[kb.length === 13 ? dv.getInt32(8, true) : 0];
    const tag = kb[kb.length - 1];
    if (tag === 0x2b) ergebnis.chunks[dim]++;
    if (tag === 0x31) for (const be of nbtLesen(v)) if (be.id === "Bell") glocken.push({ dim, x: be.x, y: be.y, z: be.z });
    if (tag === 0x77 && v.length) teile.push(...aabbLesen(v, dim));
  } else if (k === "portals") {
    for (const r of nbtLesen(v)[0].data.PortalRecords)
      ergebnis.portale.push({ dimension: DIM[r.DimId], x: r.TpX, y: r.TpY, z: r.TpZ, achse: r.Xa ? "x" : "z", breite: r.Span });
  } else if (/^VILLAGE_\w+_[0-9a-f-]{36}_INFO$/.test(k)) {
    const i = nbtLesen(v)[0];
    dorfBereiche.push({ id: k.split("_")[2], x0: i.X0, z0: i.Z0, x1: i.X1, z1: i.Z1 });
  } else if (k.startsWith("actorprefix")) {
    try {
      const a = nbtLesen(v)[0];
      if (/villager/.test(a.identifier)) { dorfbewohner++; if (a.Offers) { mitAngeboten++; rezepte += a.Offers.Recipes?.length ?? 0; } }
    } catch { /* einzelne Actors haben Formate, die dieser Leser nicht braucht */ }
  }
}

/** 0x77: u32 Version, u32 Anzahl, je Struktur u32, Name (u16 + Text), u32 Teile, je Teil u32 + 6 × i32 */
function aabbLesen(v, dim) {
  const b = Buffer.from(v.buffer, v.byteOffset, v.byteLength);
  try {
    let p = 8 + 4;
    const len = b.readUInt16LE(p); p += 2;
    const name = b.toString("latin1", p, p + len); p += len;
    const n = b.readUInt32LE(p); p += 4;
    const liste = [];
    for (let i = 0; i < n && p + 28 <= b.length; i++) {
      p += 4;
      const box = Array.from({ length: 6 }, (_, j) => b.readInt32LE(p + 4 * j)); p += 24;
      const gueltig = box[0] <= box[3] && box[1] <= box[4] && box[2] <= box[5] && box[1] >= -64 && box[4] <= 320 && box[3] - box[0] < 512 && box[5] - box[2] < 512;
      if (gueltig) liste.push({ name, dim, box });   // Einträge mit mehreren Strukturen lesen wir nur bis zur ersten sauber
    }
    return liste;
  } catch { return []; }
}

// ---------- Strukturen: Teile derselben Art zu einer Struktur zusammenfassen ----------
const strukturen = [];
for (const t of teile) {
  const nah = strukturen.filter((s) => s.name === t.name && s.dim === t.dim &&
    s.box[0] <= t.box[3] + LUECKE && s.box[3] >= t.box[0] - LUECKE && s.box[2] <= t.box[5] + LUECKE && s.box[5] >= t.box[2] - LUECKE);
  const neu = { name: t.name, dim: t.dim, box: [...t.box] };
  for (const s of nah) { for (let i = 0; i < 3; i++) { neu.box[i] = Math.min(neu.box[i], s.box[i]); neu.box[i + 3] = Math.max(neu.box[i + 3], s.box[i + 3]); } strukturen.splice(strukturen.indexOf(s), 1); }
  strukturen.push(neu);
}
ergebnis.strukturen = strukturen.map((s) => ({
  art: s.name, dimension: s.dim, min: s.box.slice(0, 3), max: s.box.slice(3),
  mitte: [0, 1, 2].map((i) => Math.floor((s.box[i] + s.box[i + 3]) / 2)),
})).sort((a, b) => a.art.localeCompare(b.art));

// ---------- Dörfer: Glocken im Bereich des VILLAGE-Eintrags, Mitte = Durchschnitt ----------
for (const d of dorfBereiche) {
  const g = glocken.filter((x) => x.dim === "overworld" && x.x >= d.x0 - 16 && x.x <= d.x1 + 16 && x.z >= d.z0 - 16 && x.z <= d.z1 + 16);
  const mitte = g.length ? ["x", "y", "z"].map((a) => Math.round(g.reduce((s, x) => s + x[a], 0) / g.length)) : null;
  ergebnis.doerfer.push({ id: d.id, glocken: g.map((x) => [x.x, x.y, x.z]), mitte });
}
ergebnis.glockenOhneDorf = glocken.filter((x) => !ergebnis.doerfer.some((d) => d.glocken.some((g) => g[0] === x.x && g[1] === x.y && g[2] === x.z)));
ergebnis.handel = { dorfbewohner, mitAngeboten, rezepte };

// ---------- level.dat (liegt neben db/, readMcworld liest nur die Datenbank) ----------
{
  const { ZipReader, BlobReader, Uint8ArrayWriter } = await import("../vendor/mcbe-leveldb.js");
  const zip = new ZipReader(new BlobReader(await openAsBlob(datei)));
  const kandidaten = (await zip.getEntries()).filter((z) => z.filename.split("/").pop() === "level.dat");
  const ld = await kandidaten.sort((a, b) => a.filename.length - b.filename.length)[0].getData(new Uint8ArrayWriter());
  const L = nbtLesen(ld, 8)[0];
  ergebnis.welt = {
    name: L.LevelName, seed: String(L.RandomSeed),
    spawn: { x: L.SpawnX, y: L.SpawnY === SPAWN_Y_OFFEN ? null : L.SpawnY, z: L.SpawnZ },
    version: L.lastOpenedWithVersion?.join("."),
  };
  await zip.close();
}

// ---------- Ausgabe ----------
const w = ergebnis.welt;
console.log(`Welt: ${w.name} · Seed ${w.seed} · Spawn ${w.spawn.x} / ${w.spawn.y ?? "–"} / ${w.spawn.z} · Version ${w.version}`);
console.log(`Chunks: Oberwelt ${ergebnis.chunks.overworld}, Nether ${ergebnis.chunks.nether}, End ${ergebnis.chunks.end}`);
console.log(`Dörfer: ${ergebnis.doerfer.length}`);
for (const d of ergebnis.doerfer) console.log(`  ${d.glocken.length} Glocke(n), Mitte ${d.mitte?.join(" / ") ?? "–"}`);
if (ergebnis.glockenOhneDorf.length) console.log(`  Glocken ohne Dorf-Eintrag: ${ergebnis.glockenOhneDorf.map((g) => `${g.x}/${g.y}/${g.z}`).join(", ")}`);
const arten = {};
for (const s of ergebnis.strukturen) arten[`${s.art} (${s.dimension})`] = (arten[`${s.art} (${s.dimension})`] ?? 0) + 1;
console.log("Strukturen:");
for (const [a, n] of Object.entries(arten)) console.log(`  ${String(n).padStart(3)} × ${a}`);
console.log(`Portale: ${ergebnis.portale.length} (Oberwelt ${ergebnis.portale.filter((p) => p.dimension === "overworld").length}, Nether ${ergebnis.portale.filter((p) => p.dimension === "nether").length})`);
console.log(`Handel: ${ergebnis.handel.dorfbewohner} Dorfbewohner, ${ergebnis.handel.mitAngeboten} mit Angeboten, ${ergebnis.handel.rezepte} Angebote`);
if (jsonZiel) { writeFileSync(jsonZiel, JSON.stringify(ergebnis, null, 1)); console.log(`→ ${jsonZiel}`); }
