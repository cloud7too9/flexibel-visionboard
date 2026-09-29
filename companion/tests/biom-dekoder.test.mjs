// Welt-Import (Biome aus .mcworld): Dekoder mit handgebauten Bytes, der Ablauf über ganze
// synthetische Welten (welt-bauen.mjs) und die echte Fixture-Welt von Max (daten/fixture-seed.mcworld).
// Lauf: node --test biom-dekoder.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { openAsBlob } from "node:fs";
import {
  chunkSchluesselLesen, data3dLesen, biomAn, oberflaechenBiom, chunkBiom, levelDatLesen, kachelIndex,
  kachelnBauen, kachelWert, kachelZuBase64, kachelAusBase64, chunksAuswerten, KACHEL_CHUNKS,
  hoehenIndex, oberflaecheY,
} from "../biom-dekoder.js";
import { weltLesen, WeltFehler, FEHLER } from "../biom-welt.js";
import "../biom-ids.js";
import {
  chunkSchluessel, data3dBauen, levelDatBauen, testweltBauen, zipBauen, ID, SEED,
} from "./welt-bauen.mjs";

const blob = (bytes) => new Blob([bytes]);
const BEKANNT = globalThis.BIOM_IDS.map((b) => b.id);

// ---------- Schlüssel ----------

test("Chunk-Schlüssel: 9 Byte Oberwelt, 13 Byte Nether/End, nur Tag 0x2B", () => {
  assert.deepEqual(chunkSchluesselLesen(chunkSchluessel(-1, 7)), { cx: -1, cz: 7, dim: "overworld" });
  assert.deepEqual(chunkSchluesselLesen(chunkSchluessel(3, -120, "nether")), { cx: 3, cz: -120, dim: "nether" });
  assert.deepEqual(chunkSchluesselLesen(chunkSchluessel(-1875000, 1875000, "end")), { cx: -1875000, cz: 1875000, dim: "end" });
  assert.equal(chunkSchluesselLesen(chunkSchluessel(0, 0, "overworld", 0x2c)), null, "anderer Tag");
  assert.equal(chunkSchluesselLesen(chunkSchluessel(1875001, 0)), null, "außerhalb der Welt");
});

test("Chunk-Schlüssel: Textschlüssel mit 9/13 Byte und „+“ am Ende sind kein Chunk", () => {
  assert.equal(chunkSchluesselLesen(new TextEncoder().encode("abcdefgh+")), null);
  assert.equal(chunkSchluesselLesen(new TextEncoder().encode("VILLAGE_x_d+")), null);   // 12 Byte
  assert.equal(chunkSchluesselLesen(new TextEncoder().encode("0123456789ab+")), null);  // 13 Byte, „Dimension“ „89ab“
  const dim5 = new Uint8Array(13); new DataView(dim5.buffer).setInt32(8, 5, true); dim5[12] = 0x2b;
  assert.equal(chunkSchluesselLesen(dim5), null, "Dimension 5");
  // an ungerader Adresse im Puffer
  const versetzt = new Uint8Array(20); versetzt.set(chunkSchluessel(-33, 2), 3);
  assert.deepEqual(chunkSchluesselLesen(versetzt.subarray(3, 12)), { cx: -33, cz: 2, dim: "overworld" });
});

// ---------- Data3D ----------

const VIELE = [0, 1, 2, 3, 4, 5, 6, 7, 12, 14, 21, 24];
test("Sektionen: bits 0, 1, 4, 0xFF und Palette", () => {
  const wert = data3dBauen({
    sektionen: 4,
    biom: (x, y, z) => {
      if (y < -48) return 7;                                   // Sektion 0: ein Biom (bits 0)
      if (y < -32) return (x + z) % 2 ? 1 : 4;                 // Sektion 1: zwei Biome (bits 1)
      return VIELE[(x * 3 + z) % 12];                          // Sektion 2 + 3 gleich (bits 4, dann 0xFF)
    },
  });
  const d = data3dLesen(wert);
  assert.equal(d.sektionen.length, 4);
  assert.deepEqual(d.sektionen.map((s) => s.bits), [0, 1, 4, 4]);
  assert.equal(d.sektionen[2], d.sektionen[3], "0xFF verweist auf dieselbe Sektion");
  assert.equal(biomAn(d.sektionen[0], 5, 5, 5), 7);
  assert.equal(biomAn(d.sektionen[1], 1, 0, 0), 1);
  assert.equal(biomAn(d.sektionen[1], 1, 0, 1), 4);
  for (const [x, y, z] of [[0, 0, 0], [15, 15, 15], [3, 9, 11], [8, 2, 14]]) {
    assert.equal(biomAn(d.sektionen[2], x, y, z), VIELE[(x * 3 + z) % 12], `(${x},${y},${z})`);
  }
  assert.equal(d.sektionen[2].palette.length, 12);
});

test("Sektionen: 16 Bit breit und Wert an ungerader Pufferadresse", () => {
  const ids = Array.from({ length: 300 }, (_, i) => i * 3);   // 300 Biome → 16 Bit
  const wert = data3dBauen({ sektionen: 1, biom: (x, y, z) => ids[(x * 256 + z * 16 + (y + 64)) % 300] });
  const versetzt = new Uint8Array(wert.length + 1); versetzt.set(wert, 1);
  const d = data3dLesen(versetzt.subarray(1));
  assert.equal(d.sektionen[0].bits, 16);
  assert.equal(biomAn(d.sektionen[0], 15, 15, 15), ids[(15 * 256 + 15 * 16 + 15) % 300]);
  assert.equal(biomAn(d.sektionen[0], 0, 7, 0), ids[7]);
});

test("Data3D: zu kurz, abgeschnitten, 0xFF ohne Vorgänger", () => {
  assert.equal(data3dLesen(new Uint8Array(0)), null);
  assert.equal(data3dLesen(new Uint8Array(512)), null);
  const ff = new Uint8Array(520); ff[512] = 0xff;
  assert.equal(data3dLesen(ff), null);
  const wert = data3dBauen({ sektionen: 3, biom: (x, y) => (y < -48 ? 1 : y < -32 ? 2 : x % 2 ? 3 : 4) });
  assert.equal(data3dLesen(wert.subarray(0, wert.length - 10)).sektionen.length, 2, "letzte Sektion unvollständig → weglassen");
});

test("Oberfläche: Oberwelt über die Höhenkarte, Nether/End auf fester Höhe", () => {
  // Oberfläche bei Höhe 100 → y 35; darunter Tiefe Dunkelheit, darüber Ebene
  const ow = data3dLesen(data3dBauen({ hoehe: () => 100, biom: (x, y) => (y <= 35 ? ID.tiefeDunkelheit : ID.ebene) }));
  assert.equal(oberflaechenBiom(ow, 0, 0, "overworld"), ID.tiefeDunkelheit, "Block an der Oberfläche (y 35) zählt");
  const hoch = data3dLesen(data3dBauen({ hoehe: () => 101, biom: (x, y) => (y <= 35 ? ID.tiefeDunkelheit : ID.ebene) }));
  assert.equal(oberflaechenBiom(hoch, 0, 0, "overworld"), ID.ebene);
  // Höhenkarte: Index z*16+x (⚠ an echter Welt bestätigen)
  const spalte = data3dLesen(data3dBauen({ hoehe: (x, z) => (x === 3 && z === 12 ? 200 : 64), biom: (x, y) => (y > 100 ? ID.wueste : ID.wald) }));
  assert.equal(oberflaechenBiom(spalte, 3, 12, "overworld"), ID.wueste);
  assert.equal(oberflaechenBiom(spalte, 12, 3, "overworld"), ID.wald);
  const nether = data3dLesen(data3dBauen({ dim: "nether", sektionen: 8, hoehe: () => 0, biom: (x, y) => (y < 64 ? ID.seelensand : ID.nether) }));
  assert.equal(oberflaechenBiom(nether, 0, 0, "nether"), ID.nether);
  assert.equal(oberflaechenBiom(nether, 0, 0, "nether", { netherBiomY: 20, endBiomY: 64 }), ID.seelensand);
  // Oberfläche über der obersten gespeicherten Sektion → oberste Sektion
  const flach = data3dLesen(data3dBauen({ sektionen: 2, hoehe: () => 300, biom: () => ID.ebene }));
  assert.equal(oberflaechenBiom(flach, 0, 0, "overworld"), ID.ebene);
});

test("Chunk-Biom: Mehrheit der 256 Spalten, Gleichstand → kleinere ID", () => {
  const mehrheit = data3dLesen(data3dBauen({ biom: (x) => (x < 9 ? ID.wald : ID.ebene) }));
  assert.equal(chunkBiom(mehrheit, "overworld"), ID.wald);   // 144 : 112
  const gleich = data3dLesen(data3dBauen({ biom: (x) => (x < 8 ? ID.wald : ID.ebene) }));
  assert.equal(chunkBiom(gleich, "overworld"), ID.ebene);    // 128 : 128 → 1 vor 4
});

// ---------- level.dat ----------

test("level.dat: negativer Seed als BigInt, Name, Version; alle NBT-Typen werden übersprungen", () => {
  assert.deepEqual(levelDatLesen(levelDatBauen({ seed: "-4719278516927443210", name: "Realm Ä" })),
    { seed: "-4719278516927443210", weltname: "Realm Ä", spielversion: "1.26.50" });
  assert.equal(levelDatLesen(levelDatBauen({ seed: SEED })).seed, SEED);
  assert.equal(levelDatLesen(levelDatBauen({ seed: "9223372036854775807" })).seed, "9223372036854775807");
  assert.throws(() => levelDatLesen(levelDatBauen({ seed: SEED }).subarray(0, 60)));
});

// ---------- Kacheln ----------

test("Kachel-Index: Floor auch bei negativen Chunks", () => {
  assert.deepEqual(kachelIndex(0, 0), { kx: 0, kz: 0, index: 0 });
  assert.deepEqual(kachelIndex(-1, -1), { kx: -1, kz: -1, index: 31 * 32 + 31 });
  assert.deepEqual(kachelIndex(-32, 5), { kx: -1, kz: 0, index: 5 * 32 });
  assert.deepEqual(kachelIndex(-33, 32), { kx: -2, kz: 1, index: 31 });
  assert.deepEqual(kachelIndex(63, -64), { kx: 1, kz: -2, index: 31 });
});

test("Kacheln: Wert = ID + 1, 0 = unerkundet, Base64 genau 2048 Byte", () => {
  const kacheln = kachelnBauen([
    { dim: "nether", cx: 0, cz: 0, id: 8 }, { dim: "overworld", cx: -1, cz: 0, id: 0 }, { dim: "overworld", cx: 5, cz: 3, id: 400 },
  ]);
  assert.deepEqual(kacheln.map((k) => `${k.dim} ${k.kx} ${k.kz}`), ["overworld -1 0", "overworld 0 0", "nether 0 0"]);
  assert.equal(kachelWert(kacheln[0].daten, kachelIndex(-1, 0).index), 0, "Ozean (ID 0) ist nicht unerkundet");
  assert.equal(kachelWert(kacheln[0].daten, 0), null);
  assert.equal(kacheln[1].daten[3 * KACHEL_CHUNKS + 5], 401, "IDs über 254");
  const text = kachelZuBase64(kacheln[1].daten);
  assert.equal(atob(text).length, 2048);
  assert.deepEqual(kachelAusBase64(text), kacheln[1].daten);
  assert.equal(kachelAusBase64(btoa("zu kurz")), null);
  assert.equal(kachelAusBase64("%%%"), null);
});

test("Unbekannte IDs: gezählt, mit Beispielkoordinate (Blockmitte des Chunks)", () => {
  const { chunks, unbekannt } = chunksAuswerten([
    { dim: "overworld", cx: 2, cz: -1, id: 192 }, { dim: "overworld", cx: 3, cz: -1, id: 192 }, { dim: "end", cx: 0, cz: 0, id: 9 },
  ], BEKANNT);
  assert.deepEqual(chunks, { overworld: 2, nether: 0, end: 1 });
  assert.deepEqual(unbekannt, [{ bedrockId: 192, chunks: 2, beispiel: { dim: "overworld", x: 40, z: -8 } }]);
});

// ---------- Ganze Welten ----------

/** Kacheln → Map "dim:cx:cz" → id */
function ausKacheln(kacheln) {
  const m = new Map();
  for (const { dim, kx, kz, daten } of kacheln) {
    for (let i = 0; i < daten.length; i++) {
      if (daten[i]) m.set(`${dim}:${kx * 32 + (i % 32)}:${kz * 32 + Math.floor(i / 32)}`, daten[i] - 1);
    }
  }
  return m;
}

test("Testwelt: Streaming liefert genau die erwarteten Biome", async () => {
  const { zip, erwartet } = testweltBauen();
  const fortschritt = [];
  const r = await weltLesen(blob(zip), { biomIds: BEKANNT, fortschritt: (f) => fortschritt.push(f.phase) });
  assert.deepEqual({ ...r.meta, unbekannt: undefined },
    { seed: SEED, weltname: "Testwelt", spielversion: "1.26.50", chunks: { overworld: 1279, nether: 24, end: 2 }, unbekannt: undefined });
  assert.deepEqual(r.meta.unbekannt, [{ bedrockId: 192, chunks: 3, beispiel: { dim: "overworld", x: 488, z: 8 } }]);
  const gelesen = ausKacheln(r.kacheln);
  assert.equal(gelesen.size, erwartet.size);
  for (const [k, id] of erwartet) assert.equal(gelesen.get(k), id, k);
  assert.equal(gelesen.get("overworld:1:1"), ID.pilz, "Level 0 (neuer) schlägt Level 1, obwohl die Dateinummer kleiner ist");
  assert.equal(gelesen.get("overworld:0:0"), ID.wald, "laut MANIFEST gelöschte .ldb wird nicht gelesen");
  assert.equal(gelesen.get("overworld:2:2"), ID.fluss, ".log überschreibt .ldb");
  assert.equal(gelesen.has("overworld:3:3"), false, "Löschmarke im .log entfernt den Chunk");
  assert.equal(gelesen.get("overworld:5:5"), ID.ebene, "Mehrheit der Spalten");
  assert.deepEqual([...new Set(fortschritt)], ["oeffnen", "lesen", "berechnen"]);
});

test("Testwelt: Streaming und readMcworld liefern identische Kacheln", async () => {
  const { zip } = testweltBauen();
  const a = await weltLesen(blob(zip), { weg: "streaming", biomIds: BEKANNT });
  const b = await weltLesen(blob(zip), { weg: "komplett", biomIds: BEKANNT });
  assert.deepEqual(a.meta, b.meta);
  assert.deepEqual(a.kacheln.map((k) => [k.dim, k.kx, k.kz, kachelZuBase64(k.daten)]), b.kacheln.map((k) => [k.dim, k.kx, k.kz, kachelZuBase64(k.daten)]));
});

test("Von Hand gezippt (iOS): alles eine Ordnerebene tiefer", async () => {
  const { zip, erwartet } = testweltBauen({ ordner: "Meine Welt/" });
  const r = await weltLesen(blob(zip), { biomIds: BEKANNT });
  assert.equal(r.meta.weltname, "Testwelt");
  assert.equal(ausKacheln(r.kacheln).size, erwartet.size);
});

test("Mehrere MANIFEST: gilt das aus CURRENT, nicht das letzte im ZIP", async () => {
  const { zip, erwartet } = testweltBauen({ altesManifest: true });
  const r = await weltLesen(blob(zip), { biomIds: BEKANNT });
  const gelesen = ausKacheln(r.kacheln);
  for (const [k, id] of erwartet) assert.equal(gelesen.get(k), id, k);
  // Die Bibliothek allein (readMcworld) nimmt hier das veraltete MANIFEST – deshalb der eigene Weg
  const komplett = ausKacheln((await weltLesen(blob(zip), { weg: "komplett" })).kacheln);
  assert.notEqual(komplett.get("overworld:1:1"), ID.pilz);
});

test("Fehler: Java-Welt, keine Bedrock-Welt, level.dat fehlt, kein ZIP", async () => {
  const fehler = async (bytes) => {
    try { await weltLesen(blob(bytes)); } catch (f) { assert.ok(f instanceof WeltFehler, String(f)); return f.message; }
    return "kein Fehler";
  };
  const text = (s) => new TextEncoder().encode(s);
  assert.equal(await fehler(zipBauen([["Welt/level.dat", text("gzip")], ["Welt/region/r.0.0.mca", text("x")]])), FEHLER.JAVA);
  assert.equal(await fehler(zipBauen([["bild.png", text("x")]])), FEHLER.KEINE_BEDROCK);
  assert.equal(await fehler(zipBauen([["db/CURRENT", text("MANIFEST-000001\n")]])), FEHLER.LEVEL_DAT);
  assert.equal(await fehler(zipBauen([["db/CURRENT", text("MANIFEST-000001\n")], ["level.dat", text("kaputt")]])), FEHLER.LESEN);
  assert.equal(await fehler(text("das ist kein zip")), FEHLER.LESEN);
});

// ---------- Fixture-Welt von Max: Bedrock 1.26.51, Seed 6889…698, einmal betreten ----------
// Aus dem Weltordner zusammengesetzt (level.dat, levelname.txt, db/CURRENT, MANIFEST-000002, 000003.log).
// Frisch betreten: noch keine .ldb, alle Chunks stehen im Log.

const FIXTURE = new URL("./daten/fixture-seed.mcworld", import.meta.url);

test("Fixture-Welt: level.dat, 30 Chunks, Biome, beide Wege gleich", async () => {
  const welt = await openAsBlob(FIXTURE);
  const a = await weltLesen(welt, { biomIds: BEKANNT });
  assert.deepEqual([a.meta.seed, a.meta.weltname, a.meta.spielversion], [SEED, "Meine Welt (1)", "1.26.51"]);
  assert.deepEqual(a.meta.chunks, { overworld: 30, nether: 0, end: 0 });
  const zaehler = {};
  for (const id of ausKacheln(a.kacheln).values()) zaehler[id] = (zaehler[id] || 0) + 1;
  // 195 Dappled Forest (Spawn, von Max mit Chunkbase bestätigt), 25 Stony Shore, 184 Snowy Slopes, 1 Plains
  assert.deepEqual(zaehler, { 1: 1, 25: 4, 184: 1, 195: 24 });
  assert.deepEqual(a.meta.unbekannt, [], "alle IDs der Fixture-Welt stehen in biom-ids.js");
  assert.equal(globalThis.BIOM_IDS.find((b) => b.id === 195)?.displayName, "Dappled Forest");
  const b = await weltLesen(welt, { weg: "komplett", biomIds: BEKANNT });
  assert.deepEqual(a.kacheln.map((k) => kachelZuBase64(k.daten)), b.kacheln.map((k) => kachelZuBase64(k.daten)));
});

test("Fixture-Welt: Höhenkarte an der Stelle von Max, Reihenfolge z*16+x", async () => {
  const welt = await openAsBlob(FIXTURE);
  const { kacheln } = await weltLesen(welt);
  const ids = [...ausKacheln(kacheln).keys()];
  const { roh } = await weltLesen(welt, { roh: ids });
  const hoehen = new Map(ids.map((k) => [k.replace("overworld:", ""), data3dLesen(roh[k]).hoehen]));

  // Max stand bei X 0 / Z 0 mit den Füßen auf y 74 → oberster Block y 73 → Wert 138 (erste Luft über −64)
  const spawn = hoehen.get("0:0")[hoehenIndex(0, 0)];
  assert.equal(spawn, 138);
  assert.equal(oberflaecheY(spawn), 73);

  // Die richtige Lesart ist über Chunk-Grenzen hinweg so glatt wie innerhalb eines Chunks
  const sprung = (index) => {
    let summe = 0, n = 0;
    for (const [k, h] of hoehen) {
      const [cx, cz] = k.split(":").map(Number);
      const ost = hoehen.get(`${cx + 1}:${cz}`), sued = hoehen.get(`${cx}:${cz + 1}`);
      for (let i = 0; i < 16; i++) {
        if (ost) { summe += Math.abs(h[index(15, i)] - ost[index(0, i)]); n++; }
        if (sued) { summe += Math.abs(h[index(i, 15)] - sued[index(i, 0)]); n++; }
      }
    }
    return summe / n;
  };
  const richtig = sprung(hoehenIndex), falsch = sprung((x, z) => x * 16 + z);
  assert.ok(richtig < 2 && falsch > 5, `Sprung z*16+x ${richtig.toFixed(2)}, x*16+z ${falsch.toFixed(2)}`);
});
