/* ============================================================================
   biom-welt.js  ·  .mcworld lesen → Biom je Chunk → Kacheln
   ----------------------------------------------------------------------------
   Gemeinsamer Ablauf für den Web Worker (biom-import.worker.js) und Node
   (tools/welt-pruefen.mjs, Tests). ES-Modul, nutzt das Bundle aus vendor/.

   Zwei Wege, die dasselbe Raster liefern müssen (Test):
   · "streaming" (Standard): jede LevelDB-Datei EINZELN entpacken und mit einem
     Besucher parsen, der nur Data3D behält – für große Welten am iPhone.
   · "komplett": readMcworld() der Bibliothek – einfach, aber hält alle Dateien
     und alle Schlüssel gleichzeitig im Speicher.
   Reihenfolge wie LevelDb.init() der Bibliothek: .ldb nach Level absteigend, dann
   nach Dateinummer, danach die .log; spätere Einträge überschreiben frühere.
   Abweichung: Das MANIFEST kommt aus CURRENT. Die Bibliothek liest alle
   MANIFEST-Dateien nacheinander, und jede setzt den Stand zurück – bei mehreren
   gewinnt dort die letzte in ZIP-Reihenfolge.
   ========================================================================== */
import { configure, ZipReader, BlobReader, Uint8ArrayWriter, LevelDb, readMcworld } from "./vendor/mcbe-leveldb.js";
import {
  chunkSchluesselLesen, chunkId, data3dBiom, levelDatLesen, kachelnBauen, chunksAuswerten, STANDARD_OPTIONEN,
} from "./biom-dekoder.js";

// zip.js startet sonst eigene Worker – im Import-Worker (und in Node) unnötig. Dasselbe Bundle
// wie ZipReader/readMcworld, damit es dieselbe zip.js-Instanz trifft.
configure({ useWebWorkers: false });

export const FEHLER = Object.freeze({
  KEINE_BEDROCK: "Keine Bedrock-Welt gefunden",
  LEVEL_DAT: "level.dat fehlt",
  JAVA: "Java-Welten werden nicht unterstützt",
  LESEN: "Die Datei konnte nicht gelesen werden",
});
export class WeltFehler extends Error {}

const leise = {};   // Logger der Bibliothek: nichts ausgeben
const basisname = (e) => e.filename.slice(e.filename.lastIndexOf("/") + 1);
const ordner = (e) => (e.filename.includes("/") ? e.filename.slice(0, e.filename.lastIndexOf("/") + 1) : "");
const istDbDatei = (name) => name.startsWith("MANIFEST") || name.endsWith(".ldb") || name.endsWith(".log");
const kuerzester = (a, b) => a.filename.length - b.filename.length;   // bei mehreren: der oberste Ordner
const entpacken = (eintrag) => eintrag.getData(new Uint8ArrayWriter());

/**
 * .mcworld (Blob/File) → { meta: { weltname, seed, spielversion, chunks, unbekannt }, kacheln }
 * optionen: weg "streaming" | "komplett", biomIds (bekannte IDs, für „unbekannt“),
 *           hoehen { netherBiomY, endBiomY }, fortschritt({ phase, aktuell, gesamt }),
 *           roh: Chunk-IDs ("dim:cx:cz"), deren Data3D-Wert zusätzlich zurückkommt (Prüfskript)
 * Wirft WeltFehler mit einem Text aus FEHLER.
 */
export async function weltLesen(datei, { weg = "streaming", biomIds = null, hoehen = STANDARD_OPTIONEN, fortschritt = () => {}, roh = [] } = {}) {
  fortschritt({ phase: "oeffnen", aktuell: 0, gesamt: 1 });
  let zip, eintraege;
  try {
    zip = new ZipReader(new BlobReader(datei));
    eintraege = (await zip.getEntries()).filter((e) => !e.directory);
  } catch (f) {
    throw new WeltFehler(FEHLER.LESEN, { cause: f });
  }
  try {
    // Dateien per Basisname suchen: von Hand gezippte Welten (iOS) haben einen Ordner mehr
    if (eintraege.some((e) => /(^|\/)region\/[^/]+\.mca$/.test(e.filename))) throw new WeltFehler(FEHLER.JAVA);
    const current = eintraege.filter((e) => basisname(e) === "CURRENT").sort(kuerzester)[0];
    if (!current) throw new WeltFehler(FEHLER.KEINE_BEDROCK);
    const levelDat = eintraege.filter((e) => basisname(e) === "level.dat").sort(kuerzester)[0];
    if (!levelDat) throw new WeltFehler(FEHLER.LEVEL_DAT);

    let welt;
    try {
      welt = levelDatLesen(await entpacken(levelDat));
    } catch (f) {
      throw new WeltFehler(FEHLER.LESEN, { cause: f });
    }

    // Biom je Chunk; ein späterer Eintrag ersetzt einen früheren, gelöschte fallen raus
    const chunks = new Map();
    const rohGesucht = new Set(roh), rohWerte = {};
    const aufnehmen = (keyBytes, value, geloescht) => {
      const k = chunkSchluesselLesen(keyBytes);
      if (!k) return;
      const s = chunkId(k.dim, k.cx, k.cz);
      const id = geloescht ? undefined : data3dBiom(value, k.dim, hoehen);
      if (id === undefined) chunks.delete(s);
      else chunks.set(s, { ...k, id });
      if (rohGesucht.has(s)) rohWerte[s] = geloescht ? undefined : value;
    };
    try {
      if (weg === "komplett") await komplettLesen(datei, aufnehmen, fortschritt);
      else await streamingLesen(eintraege, current, aufnehmen, fortschritt);
    } catch (f) {
      throw new WeltFehler(FEHLER.LESEN, { cause: f });
    }

    fortschritt({ phase: "berechnen", aktuell: 0, gesamt: chunks.size });
    const liste = [...chunks.values()];
    const { chunks: anzahl, unbekannt } = chunksAuswerten(liste, biomIds);
    const kacheln = kachelnBauen(liste);
    fortschritt({ phase: "berechnen", aktuell: chunks.size, gesamt: chunks.size });
    return { meta: { ...welt, chunks: anzahl, unbekannt }, kacheln, ...(roh.length ? { roh: rohWerte } : {}) };
  } finally {
    await zip.close();
  }
}

/** Datei für Datei: entpacken, parsen, Puffer sofort wieder freigeben */
async function streamingLesen(eintraege, current, aufnehmen, fortschritt) {
  const wurzel = ordner(current);
  const db = eintraege.filter((e) => e.filename.startsWith(wurzel) && istDbDatei(basisname(e)));
  const leveldb = new LevelDb([], [], [], "Welt-Import", leise);

  // MANIFEST aus CURRENT (sonst alle, wie die Bibliothek): gelöschte Dateien und Level
  const name = new TextDecoder().decode(await entpacken(current)).trim();
  const manifeste = db.filter((e) => basisname(e).startsWith("MANIFEST"));
  const gueltig = manifeste.filter((e) => basisname(e) === name);
  for (const m of gueltig.length ? gueltig : manifeste) leveldb.parseManifestContent(await entpacken(m), m.filename);
  const geloescht = new Set(leveldb.deletedFileNumber ?? []);
  const level = new Map();
  (leveldb.newFileNumber ?? []).forEach((nr, i) => level.set(nr, leveldb.newFileLevel[i]));

  const ldb = db.filter((e) => basisname(e).endsWith(".ldb"))
    .map((e) => ({ e, nr: parseInt(basisname(e), 10) }))
    .filter(({ nr }) => !geloescht.has(nr))
    .map((x) => ({ ...x, level: level.get(x.nr) ?? 0 }))
    .sort((a, b) => b.level - a.level || a.nr - b.nr)
    .map(({ e }) => e);
  const logs = db.filter((e) => basisname(e).endsWith(".log")).sort((a, b) => basisname(a).localeCompare(basisname(b)));
  const reihe = [...ldb.map((e) => [e, "ldb"]), ...logs.map((e) => [e, "log"])];

  for (let i = 0; i < reihe.length; i += 1) {
    const [eintrag, art] = reihe[i];
    fortschritt({ phase: "lesen", aktuell: i, gesamt: reihe.length });
    let inhalt = await entpacken(eintrag);
    if (inhalt.length) {
      const besuch = {
        ordinal: 0,
        visitor: (r) => aufnehmen(r.keyBytes, r.value, r.isDeleted),
        options: { includeValues: true, includeDeleted: true },
        sourceKind: art,
        sourcePath: eintrag.filename,
      };
      if (art === "ldb") leveldb.parseLdbContent(inhalt, eintrag.filename, besuch);
      else leveldb.parseLogContent(inhalt, eintrag.filename, besuch);
    }
    inhalt = null;   // Puffer freigeben, bevor die nächste Datei entpackt wird
  }
  fortschritt({ phase: "lesen", aktuell: reihe.length, gesamt: reihe.length });
}

/** Alles auf einmal über die Bibliothek (Vergleich und Rückfallweg) */
async function komplettLesen(datei, aufnehmen, fortschritt) {
  fortschritt({ phase: "lesen", aktuell: 0, gesamt: 1 });
  const schluessel = await readMcworld(datei, leise);
  for (const kv of schluessel.values()) aufnehmen(kv.keyBytes, kv.value, false);
  fortschritt({ phase: "lesen", aktuell: 1, gesamt: 1 });
}
