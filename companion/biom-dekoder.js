/* ============================================================================
   biom-dekoder.js  ·  Biome aus Bedrock-Weltdaten lesen (reine Funktionen)
   ----------------------------------------------------------------------------
   Genutzt vom Welt-Import (biom-welt.js → Web Worker) und von den Node-Tests.
   Kein DOM, keine Abhängigkeiten. Formate: Minecraft Wiki „Bedrock Edition
   level format“, gegengeprüft mit prismarine-chunk (bedrock/1.18) und
   bedrock-provider (Data3D = 512 Byte Höhenkarte + Biome).

   Chunk-Schlüssel:  x int32 LE · z int32 LE · [dim int32 LE, 1 = Nether, 2 = End] · Tag
   Data3D (Tag 43):  256 × int16 LE Höhenkarte, danach Biom-Sektionen 16×16×16 von unten
   Kachel:           32 × 32 Chunks (512 × 512 Blöcke), Wert = Bedrock-ID + 1, 0 = unerkundet
   ========================================================================== */

export const DATA3D = 0x2b;
export const KACHEL_CHUNKS = 32;
export const KACHEL_WERTE = KACHEL_CHUNKS * KACHEL_CHUNKS;
export const CHUNK_GRENZE = 1_875_000;   // Weltgrenze 30 Mio. Blöcke ÷ 16
export const DIMENSIONEN = Object.freeze(["overworld", "nether", "end"]);
export const MIN_Y = Object.freeze({ overworld: -64, nether: 0, end: 0 });
/** Nether und End haben keine Oberfläche – dort gilt eine feste Höhe (CONFIG der Seite) */
export const STANDARD_OPTIONEN = Object.freeze({ netherBiomY: 64, endBiomY: 64 });

/* ⚠ Reihenfolge der Höhenkarte (z*16+x oder x*16+z) und Bezug der Werte (relativ zu minY,
   erste Luft) stehen noch nicht an einer echten Welt fest – Phase 1 des Bauplans. Beide
   Annahmen stecken nur hier. Auf den Wert pro Chunk wirken sie sich kaum aus, weil die
   Mehrheit der 256 Spalten zählt. */
export const hoehenIndex = (x, z) => z * 16 + x;
export const oberflaecheY = (hoehe) => MIN_Y.overworld + hoehe - 1;

const DIM_NUMMER = Object.freeze({ 1: "nether", 2: "end" });

/** Chunk-Schlüssel eines Data3D-Eintrags → { cx, cz, dim } oder null (auch für Textschlüssel,
    die zufällig 9 oder 13 Byte lang sind und auf „+“ enden) */
export function chunkSchluesselLesen(keyBytes) {
  const n = keyBytes?.length;
  if ((n !== 9 && n !== 13) || keyBytes[n - 1] !== DATA3D) return null;
  const dv = new DataView(keyBytes.buffer, keyBytes.byteOffset, n);
  const cx = dv.getInt32(0, true), cz = dv.getInt32(4, true);
  const dim = n === 9 ? "overworld" : DIM_NUMMER[dv.getInt32(8, true)];
  if (!dim || Math.abs(cx) > CHUNK_GRENZE || Math.abs(cz) > CHUNK_GRENZE) return null;
  return { cx, cz, dim };
}

/** Schlüssel für die Zwischenablage je Chunk */
export const chunkId = (dim, cx, cz) => `${dim}:${cx}:${cz}`;

/**
 * Data3D-Wert → { hoehen: Int16Array(256), sektionen: [{ bits, proWort, woerter, palette }] }
 * oder null, wenn der Wert zu kurz ist. „0xFF“-Sektionen sind aufgelöst (verweisen auf die
 * Sektion darunter). Liest mit DataView, weil der Wert an ungerader Adresse liegen kann.
 * Eine abgeschnittene letzte Sektion wird weggelassen.
 */
export function data3dLesen(value) {
  if (!value || value.length < 512 + 5) return null;
  const dv = new DataView(value.buffer, value.byteOffset, value.byteLength);
  const hoehen = new Int16Array(256);
  for (let i = 0; i < 256; i += 1) hoehen[i] = dv.getInt16(i * 2, true);
  const sektionen = [];
  let o = 512;
  while (o < value.length && sektionen.length < 32) {
    const kopf = dv.getUint8(o);
    o += 1;
    if (kopf === 0xff) {
      if (!sektionen.length) return null;   // Verweis ohne Sektion darunter
      sektionen.push(sektionen.at(-1));
      continue;
    }
    const bits = kopf >> 1;
    if (bits === 0) {
      if (o + 4 > value.length) break;
      sektionen.push({ bits: 0, proWort: 0, woerter: null, palette: [dv.getInt32(o, true)] });
      o += 4;
      continue;
    }
    if (bits > 16) break;   // kein gültiges Format mehr
    const proWort = Math.floor(32 / bits);
    const anzahl = Math.ceil(4096 / proWort);
    if (o + anzahl * 4 + 4 > value.length) break;
    const woerter = new Uint32Array(anzahl);
    for (let i = 0; i < anzahl; i += 1) woerter[i] = dv.getUint32(o + i * 4, true);
    o += anzahl * 4;
    const laenge = dv.getInt32(o, true);
    o += 4;
    if (laenge < 1 || laenge > 4096 || o + laenge * 4 > value.length) break;
    const palette = new Array(laenge);
    for (let i = 0; i < laenge; i += 1) palette[i] = dv.getInt32(o + i * 4, true);
    o += laenge * 4;
    sektionen.push({ bits, proWort, woerter, palette });
  }
  return sektionen.length ? { hoehen, sektionen } : null;
}

/** Biom-ID an einer Stelle der Sektion (lokal 0–15) – undefined bei kaputtem Palettenindex */
export function biomAn(sektion, x, y, z) {
  if (sektion.bits === 0) return sektion.palette[0];
  const i = (x << 8) | (z << 4) | y;
  const wort = sektion.woerter[Math.floor(i / sektion.proWort)];
  const index = (wort >>> ((i % sektion.proWort) * sektion.bits)) & ((1 << sektion.bits) - 1);
  return sektion.palette[index];
}

/** Biom an der Oberfläche einer Spalte (Oberwelt: Höhenkarte, Nether/End: feste Höhe) */
export function oberflaechenBiom(d, x, z, dim, optionen = STANDARD_OPTIONEN) {
  const y = dim === "overworld" ? oberflaecheY(d.hoehen[hoehenIndex(x, z)])
    : dim === "nether" ? optionen.netherBiomY : optionen.endBiomY;
  const rel = Math.max(0, y - MIN_Y[dim]);
  const nr = rel >> 4;
  if (nr >= d.sektionen.length) return biomAn(d.sektionen.at(-1), x, 15, z);   // über der obersten Sektion
  return biomAn(d.sektionen[nr], x, rel & 15, z);
}

/** Häufigstes Oberflächenbiom der 256 Spalten; bei Gleichstand die kleinere ID. undefined, wenn keine Spalte lesbar ist. */
export function chunkBiom(d, dim, optionen = STANDARD_OPTIONEN) {
  const zaehler = new Map();
  for (let x = 0; x < 16; x += 1) {
    for (let z = 0; z < 16; z += 1) {
      const id = oberflaechenBiom(d, x, z, dim, optionen);
      if (id !== undefined) zaehler.set(id, (zaehler.get(id) || 0) + 1);
    }
  }
  let beste, anzahl = 0;
  for (const [id, n] of zaehler) if (n > anzahl || (n === anzahl && id < beste)) { beste = id; anzahl = n; }
  return beste;
}

/** Data3D-Wert direkt → Biom des Chunks (undefined, wenn nicht lesbar) */
export function data3dBiom(value, dim, optionen = STANDARD_OPTIONEN) {
  const d = data3dLesen(value);
  return d ? chunkBiom(d, dim, optionen) : undefined;
}

// ---------- level.dat (8 Byte Kopf, danach NBT in Little Endian) ----------

const NBT = { ENDE: 0, BYTE: 1, SHORT: 2, INT: 3, LONG: 4, FLOAT: 5, DOUBLE: 6, BYTES: 7, STRING: 8, LISTE: 9, COMPOUND: 10, INTS: 11, LONGS: 12 };
const FEST = { [NBT.BYTE]: 1, [NBT.SHORT]: 2, [NBT.INT]: 4, [NBT.LONG]: 8, [NBT.FLOAT]: 4, [NBT.DOUBLE]: 8 };

/** level.dat → { seed: "…" (Dezimal, mit Vorzeichen), weltname, spielversion: "1.26.50" }; wirft bei kaputtem NBT */
export function levelDatLesen(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const text = new TextDecoder();
  let o = 8;   // int32 Version, int32 Länge
  const pruefen = (n) => { if (o + n > bytes.length) throw new Error("level.dat ist abgeschnitten"); };
  const name = () => { pruefen(2); const n = dv.getUint16(o, true); o += 2; pruefen(n); const s = text.decode(bytes.subarray(o, o + n)); o += n; return s; };
  const int = () => { pruefen(4); const v = dv.getInt32(o, true); o += 4; return v; };

  /** Wert lesen (lesen = true) oder überspringen */
  function wert(typ, lesen) {
    if (FEST[typ]) {
      pruefen(FEST[typ]);
      const v = !lesen ? undefined : typ === NBT.LONG ? dv.getBigInt64(o, true) : typ === NBT.INT ? dv.getInt32(o, true)
        : typ === NBT.BYTE ? dv.getInt8(o) : typ === NBT.SHORT ? dv.getInt16(o, true) : undefined;
      o += FEST[typ];
      return v;
    }
    switch (typ) {
      case NBT.STRING: { const s = name(); return lesen ? s : undefined; }
      case NBT.BYTES: { const n = int(); pruefen(n); o += n; return undefined; }
      case NBT.INTS: { const n = int(); pruefen(n * 4); o += n * 4; return undefined; }
      case NBT.LONGS: { const n = int(); pruefen(n * 8); o += n * 8; return undefined; }
      case NBT.LISTE: {
        pruefen(1); const elem = dv.getUint8(o); o += 1;
        const n = int(); const liste = [];
        for (let i = 0; i < n; i += 1) { const v = wert(elem, lesen && elem === NBT.INT); if (lesen) liste.push(v); }
        return lesen ? liste : undefined;
      }
      case NBT.COMPOUND: { compound(null); return undefined; }
      default: throw new Error(`Unbekannter NBT-Typ ${typ}`);
    }
  }
  /** Einträge eines Compounds; ziel: welche Namen gelesen werden sollen */
  function compound(ziel) {
    const gefunden = {};
    for (;;) {
      pruefen(1);
      const typ = dv.getUint8(o); o += 1;
      if (typ === NBT.ENDE) return gefunden;
      const n = name();
      const lesen = Boolean(ziel && ziel.includes(n));
      const v = wert(typ, lesen);
      if (lesen) gefunden[n] = v;
    }
  }

  pruefen(1);
  if (dv.getUint8(o) !== NBT.COMPOUND) throw new Error("level.dat beginnt nicht mit einem Compound");
  o += 1;
  name();
  const w = compound(["RandomSeed", "LevelName", "lastOpenedWithVersion"]);
  if (typeof w.RandomSeed !== "bigint") throw new Error("RandomSeed fehlt in level.dat");
  const version = Array.isArray(w.lastOpenedWithVersion) ? w.lastOpenedWithVersion.slice(0, 3).join(".") : null;
  return { seed: w.RandomSeed.toString(), weltname: typeof w.LevelName === "string" ? w.LevelName : null, spielversion: version };
}

// ---------- Kacheln: 32 × 32 Chunks, ein Wert je Chunk ----------

/** Chunk → Kachel und Index darin. Floor, auch bei negativen Chunks (−1 → Kachel −1, Spalte 31). */
export function kachelIndex(cx, cz) {
  const kx = Math.floor(cx / KACHEL_CHUNKS), kz = Math.floor(cz / KACHEL_CHUNKS);
  return { kx, kz, index: (cz - kz * KACHEL_CHUNKS) * KACHEL_CHUNKS + (cx - kx * KACHEL_CHUNKS) };
}

/** Chunks [{ dim, cx, cz, id }] → Kacheln [{ dim, kx, kz, daten: Uint16Array(1024) }], sortiert nach Dimension, kz, kx */
export function kachelnBauen(chunks) {
  const kacheln = new Map();
  for (const { dim, cx, cz, id } of chunks) {
    const { kx, kz, index } = kachelIndex(cx, cz);
    const schluessel = `${dim}:${kx}:${kz}`;
    let k = kacheln.get(schluessel);
    if (!k) kacheln.set(schluessel, (k = { dim, kx, kz, daten: new Uint16Array(KACHEL_WERTE) }));
    k.daten[index] = id + 1;
  }
  return [...kacheln.values()].sort((a, b) =>
    DIMENSIONEN.indexOf(a.dim) - DIMENSIONEN.indexOf(b.dim) || a.kz - b.kz || a.kx - b.kx);
}

/** Wert einer Kachel an einem Chunk → Bedrock-ID oder null (unerkundet) */
export const kachelWert = (daten, index) => (daten[index] ? daten[index] - 1 : null);

/** Uint16Array(1024) → Base64 (2048 Byte, Little Endian unabhängig von der Plattform) */
export function kachelZuBase64(daten) {
  const bytes = new Uint8Array(KACHEL_WERTE * 2);
  const dv = new DataView(bytes.buffer);
  for (let i = 0; i < KACHEL_WERTE; i += 1) dv.setUint16(i * 2, daten[i], true);
  let binaer = "";
  for (let i = 0; i < bytes.length; i += 0x2000) binaer += String.fromCharCode(...bytes.subarray(i, i + 0x2000));
  return btoa(binaer);
}

/** Base64 → Uint16Array(1024) oder null, wenn es nicht genau 2048 Byte sind */
export function kachelAusBase64(text) {
  let binaer;
  try { binaer = atob(String(text)); } catch { return null; }
  if (binaer.length !== KACHEL_WERTE * 2) return null;
  const daten = new Uint16Array(KACHEL_WERTE);
  for (let i = 0; i < KACHEL_WERTE; i += 1) daten[i] = binaer.charCodeAt(i * 2) | (binaer.charCodeAt(i * 2 + 1) << 8);
  return daten;
}

/** Chunks je Dimension zählen und IDs sammeln, die nicht in bekannteIds stehen
    → { chunks: { overworld, nether, end }, unbekannt: [{ bedrockId, chunks, beispiel: { dim, x, z } }] } */
export function chunksAuswerten(chunks, bekannteIds = null) {
  const anzahl = { overworld: 0, nether: 0, end: 0 };
  const bekannt = bekannteIds ? new Set(bekannteIds) : null;
  const unbekannt = new Map();
  for (const { dim, cx, cz, id } of chunks) {
    anzahl[dim] += 1;
    if (!bekannt || bekannt.has(id)) continue;
    const u = unbekannt.get(id);
    if (u) u.chunks += 1;
    else unbekannt.set(id, { bedrockId: id, chunks: 1, beispiel: { dim, x: cx * 16 + 8, z: cz * 16 + 8 } });
  }
  return { chunks: anzahl, unbekannt: [...unbekannt.values()].sort((a, b) => b.chunks - a.chunks || a.bedrockId - b.bedrockId) };
}
