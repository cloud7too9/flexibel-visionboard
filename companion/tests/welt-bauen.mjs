// Baut synthetische Bedrock-Welten (.mcworld) für die Tests des Welt-Imports – nur mit Node-Bordmitteln.
// Das Format schreibt diese Datei selbst: level.dat (NBT, Little Endian), LevelDB-Dateien (.ldb mit
// komprimierten Blöcken, .log mit fragmentierten Records, MANIFEST) und das ZIP drumherum. Echte Welten
// von Max ersetzen das nicht: ob das Format zu Mojangs Dateien passt, zeigt erst tools/welt-pruefen.mjs.
import { deflateRawSync, crc32 } from "node:zlib";

// ---------- Bytes ----------

class Puffer {
  teile = [];
  laenge = 0;
  bytes(b) { const u = b instanceof Uint8Array ? b : Uint8Array.from(b); this.teile.push(u); this.laenge += u.length; return this; }
  u8(v) { return this.bytes([v & 0xff]); }
  u16(v) { const b = new Uint8Array(2); new DataView(b.buffer).setUint16(0, v, true); return this.bytes(b); }
  i16(v) { const b = new Uint8Array(2); new DataView(b.buffer).setInt16(0, v, true); return this.bytes(b); }
  i32(v) { const b = new Uint8Array(4); new DataView(b.buffer).setInt32(0, v, true); return this.bytes(b); }
  u32(v) { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, v >>> 0, true); return this.bytes(b); }
  i64(v) { const b = new Uint8Array(8); new DataView(b.buffer).setBigInt64(0, BigInt(v), true); return this.bytes(b); }
  u64(v) { const b = new Uint8Array(8); new DataView(b.buffer).setBigUint64(0, BigInt(v), true); return this.bytes(b); }
  varint(v) { const b = []; let n = v; do { let x = n & 0x7f; n = Math.floor(n / 128); if (n) x |= 0x80; b.push(x); } while (n); return this.bytes(b); }
  text(s) { return this.bytes(new TextEncoder().encode(s)); }
  fertig() { const out = new Uint8Array(this.laenge); let o = 0; for (const t of this.teile) { out.set(t, o); o += t.length; } return out; }
}
const vergleichen = (a, b) => { for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i] - b[i]; return a.length - b.length; };

// ---------- Chunk-Schlüssel und Data3D ----------

const DIM_NR = { overworld: null, nether: 1, end: 2 };
export function chunkSchluessel(cx, cz, dim = "overworld", tag = 0x2b) {
  const p = new Puffer().i32(cx).i32(cz);
  if (DIM_NR[dim]) p.i32(DIM_NR[dim]);
  return p.u8(tag).fertig();
}

const BITS = [1, 2, 3, 4, 5, 6, 8, 16];   // Breiten, die Bedrock schreibt
/** Eine Biom-Sektion 16×16×16; biom(x, y, z) liefert die ID. Kopf: (bits << 1) | 1 */
function sektionBauen(p, biom) {
  const werte = new Int32Array(4096);
  const palette = [];
  for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) for (let y = 0; y < 16; y++) {
    const id = biom(x, y, z);
    if (!palette.includes(id)) palette.push(id);
    werte[(x << 8) | (z << 4) | y] = palette.indexOf(id);
  }
  if (palette.length === 1) { p.u8(0x01).i32(palette[0]); return; }
  const bits = BITS.find((b) => (1 << b) >= palette.length);
  const proWort = Math.floor(32 / bits), woerter = new Uint32Array(Math.ceil(4096 / proWort));
  for (let i = 0; i < 4096; i++) woerter[Math.floor(i / proWort)] |= werte[i] << ((i % proWort) * bits);
  p.u8((bits << 1) | 1);
  for (const w of woerter) p.u32(w);
  p.i32(palette.length);
  for (const id of palette) p.i32(id);
}

/**
 * Data3D-Wert: hoehe(x, z) = Wert der Höhenkarte (relativ zu −64, erste Luft),
 * biom(x, y, z) mit absolutem y. Gleiche Sektionen hintereinander werden „0xFF“.
 */
export function data3dBauen({ hoehe = () => 128, biom, dim = "overworld", sektionen = 25 }) {
  const p = new Puffer();
  for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) p.i16(hoehe(x, z));   // Index z*16+x
  const minY = dim === "overworld" ? -64 : 0;
  let vorher = null;
  for (let s = 0; s < sektionen; s++) {
    const f = (x, y, z) => biom(x, minY + s * 16 + y, z);
    const fingerabdruck = [];
    for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) for (let y = 0; y < 16; y++) fingerabdruck.push(f(x, y, z));
    const text = fingerabdruck.join(",");
    if (text === vorher) { p.u8(0xff); continue; }
    sektionBauen(p, f);
    vorher = text;
  }
  return p.fertig();
}

// ---------- level.dat ----------

/** level.dat mit RandomSeed, LevelName, lastOpenedWithVersion – und Füllstoff aller NBT-Typen zum Überspringen */
export function levelDatBauen({ seed, name = "Testwelt", version = [1, 26, 50, 20, 0] }) {
  const n = new Puffer();
  const kopf = (typ, name) => n.u8(typ).u16(new TextEncoder().encode(name).length).text(name);
  n.u8(10).u16(0);                                                      // Wurzel-Compound, leerer Name
  kopf(1, "Difficulty").u8(2);
  kopf(2, "Kurz").i16(-3);
  kopf(5, "Zufall").u32(0x3f800000);
  kopf(6, "Doppelt").u64(0n);
  kopf(7, "Bytes").i32(3).bytes([1, 2, 3]);
  kopf(9, "Leere Liste").u8(0).i32(0);
  kopf(9, "Liste Compound").u8(10).i32(2).u8(8).u16(1).text("a").u16(2).text("xy").u8(0).u8(0);
  kopf(10, "abilities"); kopf(1, "flying").u8(0); kopf(9, "tief").u8(9).i32(1).u8(3).i32(1).i32(7); n.u8(0);
  kopf(11, "Ints").i32(2).i32(1).i32(2);
  kopf(12, "Longs").i32(1).i64(9);
  kopf(4, "RandomSeed").i64(BigInt(seed));
  kopf(8, "LevelName").u16(new TextEncoder().encode(name).length).text(name);
  kopf(9, "lastOpenedWithVersion").u8(3).i32(version.length);
  for (const v of version) n.i32(v);
  kopf(3, "SpawnX").i32(0);
  n.u8(0);
  const nbt = n.fertig();
  return new Puffer().i32(10).i32(nbt.length).bytes(nbt).fertig();
}

// ---------- LevelDB ----------

const MAGIC = [0x57, 0xfb, 0x80, 0x8b, 0x24, 0x75, 0x47, 0xdb];
/** Block: Einträge ohne gemeinsamen Präfix + Restarts, komprimiert (raw deflate wie Mojang) */
function blockBauen(eintraege) {
  const p = new Puffer();
  for (const [schluessel, wert] of eintraege) p.varint(0).varint(schluessel.length).varint(wert.length).bytes(schluessel).bytes(wert);
  p.u32(0).u32(1);   // ein Restart bei 0
  return deflateRawSync(p.fertig());
}
/** Interner Schlüssel = Benutzerschlüssel + 8 Byte (Sequenz << 8 | Typ) */
const intern = (schluessel, seq, typ) => new Puffer().bytes(schluessel).u64((BigInt(seq) << 8n) | BigInt(typ)).fertig();

/** .ldb aus [[schluessel, wert | null (Löschmarke)]] */
export function ldbBauen(eintraege, { seq = 1, blockGroesse = 4096 } = {}) {
  const sortiert = [...eintraege].sort((a, b) => vergleichen(a[0], b[0]));
  const datei = new Puffer(), index = [];
  let block = [], groesse = 0;
  const schliessen = () => {
    if (!block.length) return;
    const daten = blockBauen(block);
    index.push([block.at(-1)[0], datei.laenge, daten.length]);
    datei.bytes(daten).u8(4).u32(0);   // Kompressionstyp + CRC (wird nicht geprüft)
    block = []; groesse = 0;
  };
  for (const [s, w] of sortiert) {
    block.push([intern(s, seq, w ? 1 : 0), w ?? new Uint8Array(0)]);
    groesse += s.length + (w?.length ?? 0);
    if (groesse >= blockGroesse) schliessen();
  }
  schliessen();
  const meta = blockBauen([]), metaOffset = datei.laenge;
  datei.bytes(meta).u8(4).u32(0);
  const indexBlock = blockBauen(index.map(([s, o, l]) => [s, new Puffer().varint(o).varint(l).fertig()]));
  const indexOffset = datei.laenge;
  datei.bytes(indexBlock).u8(4).u32(0);
  const fuss = new Puffer().varint(metaOffset).varint(meta.length).varint(indexOffset).varint(indexBlock.length).fertig();
  datei.bytes(fuss).bytes(new Uint8Array(40 - fuss.length)).bytes(MAGIC);
  return datei.fertig();
}

/** Log-Datei (auch MANIFEST): Records in 32-KB-Blöcken, lange Records in FIRST/MIDDLE/LAST geteilt */
function logRecords(nutzlasten) {
  const p = new Puffer();
  for (const last of nutzlasten) {
    let rest = last, erster = true;
    while (true) {
      let frei = 32768 - (p.laenge % 32768);
      if (frei < 7) { p.bytes(new Uint8Array(frei)); frei = 32768; }
      const teil = rest.subarray(0, frei - 7);
      rest = rest.subarray(teil.length);
      const typ = erster && !rest.length ? 1 : erster ? 2 : rest.length ? 3 : 4;
      p.u32(0).u16(teil.length).u8(typ).bytes(teil);
      erster = false;
      if (!rest.length) break;
    }
  }
  return p.fertig();
}
/** .log aus Batches [{ seq, eintraege:[[schluessel, wert | null]] }] */
export function logBauen(batches) {
  return logRecords(batches.map(({ seq, eintraege }) => {
    const p = new Puffer().u64(seq).u32(eintraege.length);
    for (const [s, w] of eintraege) {
      p.u8(w ? 1 : 0).varint(s.length).bytes(s);
      if (w) p.varint(w.length).bytes(w);
    }
    return p.fertig();
  }));
}
/** MANIFEST: neue Dateien [{ level, nr, groesse }] und gelöschte [{ level, nr }] */
export function manifestBauen({ neu = [], geloescht = [], logNr = 1, naechste = 100, seq = 100 }) {
  const p = new Puffer();
  const cmp = new TextEncoder().encode("leveldb.BytewiseComparator");
  p.varint(1).varint(cmp.length).bytes(cmp).varint(2).varint(logNr).varint(3).varint(naechste).varint(4).varint(seq);
  for (const { level, nr, groesse = 1000 } of neu) p.varint(7).varint(level).varint(nr).varint(groesse).varint(1).bytes([0]).varint(1).bytes([0xff]);
  for (const { level, nr } of geloescht) p.varint(6).varint(level).varint(nr);
  return logRecords([p.fertig()]);
}

// ---------- ZIP ----------

/** ZIP aus [[pfad, bytes]] (deflate, UTF-8-Namen) → Uint8Array */
export function zipBauen(dateien) {
  const daten = new Puffer(), verzeichnis = new Puffer();
  for (const [pfad, inhalt] of dateien) {
    const name = new TextEncoder().encode(pfad), gepackt = deflateRawSync(inhalt), crc = crc32(inhalt), offset = daten.laenge;
    daten.u32(0x04034b50).u16(20).u16(0x0800).u16(8).u16(0).u16(0).u32(crc).u32(gepackt.length).u32(inhalt.length)
      .u16(name.length).u16(0).bytes(name).bytes(gepackt);
    verzeichnis.u32(0x02014b50).u16(20).u16(20).u16(0x0800).u16(8).u16(0).u16(0).u32(crc).u32(gepackt.length).u32(inhalt.length)
      .u16(name.length).u16(0).u16(0).u16(0).u16(0).u32(0).u32(offset).bytes(name);
  }
  const vz = verzeichnis.fertig(), offset = daten.laenge;
  return daten.bytes(vz).u32(0x06054b50).u16(0).u16(0).u16(dateien.length).u16(dateien.length).u32(vz.length).u32(offset).u16(0).fertig();
}

// ---------- Die Testwelt ----------

export const SEED = "6889192652397090698";
export const ID = { ozean: 0, ebene: 1, wueste: 2, wald: 4, fluss: 7, nether: 8, end: 9, pilz: 14, seelensand: 178, tiefeDunkelheit: 190, UNBEKANNT: 192 };

/** Biom je Chunk, wie es die Testwelt am Ende enthalten soll (vor Überschreiben und Löschen: alt) */
function oberweltBiom(cx) { return cx < -20 ? ID.ozean : cx < 0 ? ID.ebene : cx < 20 ? ID.wald : ID.wueste; }
/** Oberwelt-Chunk: Oberfläche bei y 63 (Höhe 128), darunter bis y 40 Tiefe Dunkelheit (darf nicht zählen) */
const data3dSpeicher = new Map();
function oberweltData3d(id, { mischung = null } = {}) {
  if (!mischung && data3dSpeicher.has(id)) return data3dSpeicher.get(id);
  const wert = data3dBauen({
    hoehe: (x, z) => (x === 15 && z === 15 ? 150 : 128),   // eine Spalte höher – ändert nichts am Ergebnis
    biom: (x, y, z) => (y < 40 ? ID.tiefeDunkelheit : mischung ? mischung(x, z) : id),
  });
  if (!mischung) data3dSpeicher.set(id, wert);
  return wert;
}

/**
 * Baut die Standard-Testwelt. Aufbau:
 *   000013.ldb  Level 1, ältere Daten: alle Oberwelt-Chunks cx −40…39, cz −8…7
 *   000011.ldb  Level 0, neuere Daten: (1,1) → Pilzland, Nether und End, unbekanntes Biom 192 bei cx 30, cz 0…2
 *   000008.ldb  laut MANIFEST gelöscht: (0,0) → Wüste (darf nicht ankommen)
 *   000014.log  am neuesten: (2,2) → Fluss, (3,3) gelöscht, Textschlüssel als Fehlalarme
 * optionen: ordner (Präfix im ZIP, z. B. „Meine Welt/“ wie von Hand gezippt am iPhone),
 *           altesManifest (zweites, veraltetes MANIFEST nach dem gültigen im ZIP)
 * → { zip, erwartet: Map<"dim:cx:cz", id> }
 */
export function testweltBauen({ ordner = "", altesManifest = false, seed = SEED } = {}) {
  const erwartet = new Map();
  const alt = [];
  for (let cx = -40; cx < 40; cx++) for (let cz = -8; cz < 8; cz++) {
    const id = oberweltBiom(cx);
    // (5,5): Mehrheit entscheidet – 160 Spalten Ebene, 96 Wald → Ebene
    const d3 = cx === 5 && cz === 5 ? oberweltData3d(id, { mischung: (x) => (x < 10 ? ID.ebene : ID.wald) }) : oberweltData3d(id);
    alt.push([chunkSchluessel(cx, cz), d3]);
    erwartet.set(`overworld:${cx}:${cz}`, cx === 5 && cz === 5 ? ID.ebene : id);
  }
  // Andere Chunk-Tags derselben Chunks (Version, SubChunk) – müssen übergangen werden
  alt.push([chunkSchluessel(0, 0, "overworld", 0x2c), Uint8Array.of(40)]);
  alt.push([new Puffer().bytes(chunkSchluessel(0, 0, "overworld", 0x2f)).u8(4).fertig(), new Uint8Array(20)]);

  const neu = [[chunkSchluessel(1, 1), oberweltData3d(ID.pilz)]];
  erwartet.set("overworld:1:1", ID.pilz);
  for (let cz = 0; cz < 3; cz++) { neu.push([chunkSchluessel(30, cz), oberweltData3d(ID.UNBEKANNT)]); erwartet.set(`overworld:30:${cz}`, ID.UNBEKANNT); }
  for (let cx = -3; cx < 3; cx++) for (let cz = -2; cz < 2; cz++) {
    // Nether: bei y 64 Netherödnis, darunter Seelensandtal (die feste Höhe entscheidet)
    neu.push([chunkSchluessel(cx, cz, "nether"), data3dBauen({ dim: "nether", sektionen: 8, hoehe: () => 0, biom: (x, y) => (y < 48 ? ID.seelensand : ID.nether) })]);
    erwartet.set(`nether:${cx}:${cz}`, ID.nether);
  }
  for (let cx = 100; cx < 102; cx++) {
    neu.push([chunkSchluessel(cx, -1, "end"), data3dBauen({ dim: "end", sektionen: 16, hoehe: () => 0, biom: () => ID.end })]);
    erwartet.set(`end:${cx}:-1`, ID.end);
  }

  const log = logBauen([
    { seq: 500, eintraege: [[chunkSchluessel(2, 2), oberweltData3d(ID.fluss)], [chunkSchluessel(3, 3), null]] },
    { seq: 501, eintraege: [
      [new TextEncoder().encode("~local_player"), new Uint8Array(30)],
      [new TextEncoder().encode("abcdefgh+"), new Uint8Array(600)],              // 9 Byte, endet auf „+“
      [new Puffer().i32(1).i32(2).i32(5).u8(0x2b).fertig(), new Uint8Array(600)], // 13 Byte, Dimension 5
    ] },
  ]);
  erwartet.set("overworld:2:2", ID.fluss);
  erwartet.delete("overworld:3:3");

  const ldb13 = ldbBauen(alt, { seq: 10 });
  const ldb11 = ldbBauen(neu, { seq: 200 });
  const ldb8 = ldbBauen([[chunkSchluessel(0, 0), oberweltData3d(ID.wueste)]], { seq: 5 });
  const manifest = manifestBauen({ neu: [{ level: 1, nr: 13 }, { level: 0, nr: 11 }], geloescht: [{ level: 0, nr: 8 }], logNr: 14 });
  const dateien = [
    ["level.dat", levelDatBauen({ seed })],
    ["levelname.txt", new TextEncoder().encode("Testwelt")],
    ["db/CURRENT", new TextEncoder().encode("MANIFEST-000015\n")],
    ["db/MANIFEST-000015", manifest],
    ["db/000008.ldb", ldb8],
    ["db/000011.ldb", ldb11],
    ["db/000013.ldb", ldb13],
    ["db/000014.log", log],
  ];
  // Veraltetes MANIFEST dahinter: kennt 000008 noch als gültig und 000011 gar nicht
  if (altesManifest) dateien.push(["db/MANIFEST-000004", manifestBauen({ neu: [{ level: 0, nr: 8 }, { level: 0, nr: 13 }], logNr: 3 })]);
  return { zip: zipBauen(dateien.map(([p, b]) => [ordner + p, b])), erwartet };
}

/**
 * Größere Welt für Laufzeit und Abbrechen: breite × breite Oberwelt-Chunks, je Chunk Data3D
 * plus `ballast` SubChunks mit Zufallsdaten (wie Blockdaten, nicht komprimierbar), in .ldb-Dateien
 * zu je etwa 2 MB wie bei Mojang. Standard: 60 × 60 Chunks, ≈ 55 MB.
 */
export function ballastWeltBauen({ breite = 60, ballast = 5, groesse = 3000, zufall = (n) => crypto.getRandomValues(new Uint8Array(n)) } = {}) {
  const biomVon = (cx, cz) => [ID.ebene, ID.wald, ID.wueste, ID.ozean, 5, 21, 35][Math.abs(Math.floor(cx / 7) * 3 + Math.floor(cz / 9)) % 7];
  const d3 = new Map();
  const wert = (id) => d3.get(id) ?? d3.set(id, data3dBauen({ biom: (x, y) => (y < 20 ? ID.tiefeDunkelheit : id) })).get(id);
  const dateien = [], neu = [];
  let nr = 10, eintraege = [], summe = 0;
  const schliessen = () => {
    if (!eintraege.length) return;
    dateien.push([`db/${String(nr).padStart(6, "0")}.ldb`, ldbBauen(eintraege)]);
    neu.push({ level: 1, nr });
    nr += 1; eintraege = []; summe = 0;
  };
  const halb = Math.floor(breite / 2);
  for (let cx = -halb; cx < breite - halb; cx++) for (let cz = -halb; cz < breite - halb; cz++) {
    eintraege.push([chunkSchluessel(cx, cz), wert(biomVon(cx, cz))]);
    for (let y = 0; y < ballast; y++) {
      const k = new Uint8Array(10); k.set(chunkSchluessel(cx, cz, "overworld", 0x2f)); k[9] = y;
      eintraege.push([k, zufall(groesse)]);
    }
    summe += ballast * groesse;
    if (summe > 2_000_000) schliessen();
  }
  schliessen();
  return zipBauen([
    ["level.dat", levelDatBauen({ seed: SEED, name: "Große Testwelt" })],
    ["db/CURRENT", new TextEncoder().encode("MANIFEST-001000\n")],
    ["db/MANIFEST-001000", manifestBauen({ neu })],
    ...dateien,
  ]);
}
