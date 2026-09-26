// Texterkennung für Seed-Map-Screenshots (z. B. Chunkbase), komplett lokal via tesseract.js.
//
// Aufbau des Popups (immer gleich):
//   Stronghold (Stairway)        ← Titel = was angezeigt wird
//   X: -1,884 Z: -524            ← Koordinaten, manchmal mit Y dazwischen
// Die Dimension steht oben im Dropdown „Dimension: Overworld“.
import { createWorker } from 'tesseract.js';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const SPRACHDATEN = path.join(path.dirname(require.resolve('@tesseract.js-data/eng/package.json')), '4.0.0_best_int');

// ---------- Auswertung (reine Funktionen, testbar ohne OCR) ----------

const ZAHL = String.raw`(-?\s?\d[\d,.' ]*)`;
// OCR liest „Z“ gelegentlich als „2“ – dann aber nur mit Doppelpunkt dahinter
const KOORD_ZEILE = new RegExp(
  String.raw`X\s*[:;.]?\s*${ZAHL}?\s*(?:Y\s*[:;.]?\s*${ZAHL}\s*)?(?:Z\s*[:;.]?|2\s*[:;])\s*${ZAHL}`,
  'i',
);

/** "-1,884" / "- 1.884" / "1 884" → -1884 */
function zahlLesen(roh) {
  if (roh == null) return null;
  const ziffern = roh.replace(/\D/g, '');
  if (!ziffern) return null;
  const wert = Number(ziffern);
  return roh.trim().startsWith('-') ? -wert : wert;
}

const normalisieren = (text) => text.replace(/[—–−]/g, '-').replace(/\s+/g, ' ').trim();

/** Entfernt Icon-Reste am Ende des Titels, z. B. „(1)“, „@“, „[%“ vom Teilen-Symbol */
export function titelBereinigen(text) {
  const woerter = normalisieren(text).split(' ');
  while (woerter.length > 1) {
    const letztes = woerter.at(-1);
    const buchstaben = (letztes.match(/[A-Za-zÄÖÜäöüß]/g) ?? []).length;
    if (buchstaben === 0 || (letztes.length <= 2 && !/^[A-Z][a-z]?$/.test(letztes))) woerter.pop();
    else break;
  }
  return woerter.join(' ').replace(/^[^A-Za-zÄÖÜäöü0-9(]+/, '').trim();
}

// Features der Seed Map (Chunkbase). Typ = Button-Name in der Feature-Liste.
// [Typ, Kategorie im Board, feste Dimension, weitere Schreibweisen in Popups]
export const FEATURES = [
  ['Spawn Point', 'sonstiges', null, ['Spawn']],
  ['Slime Chunk', 'farm'],
  ['Village', 'dorf'],
  ['Ancient City', 'struktur'],
  ['Dungeon', 'farm', null, ['Monster Room', 'Spawner']],
  ['Stronghold', 'struktur'],
  ['Mansion', 'struktur', null, ['Woodland Mansion']],
  ['Monument', 'struktur', null, ['Ocean Monument']],
  ['Outpost', 'struktur', null, ['Pillager Outpost']],
  ['Mineshaft', 'struktur'],
  ['Ruined Portal', 'portal'],
  ['Jungle Temple', 'struktur', null, ['Jungle Pyramid']],
  ['Desert Temple', 'struktur', null, ['Desert Pyramid']],
  ['Witch Hut', 'struktur', null, ['Swamp Hut']],
  ['Treasure', 'ressource', null, ['Buried Treasure']],
  ['Shipwreck', 'struktur'],
  ['Igloo', 'struktur'],
  ['Ocean Ruins', 'struktur', null, ['Ocean Ruin']],
  ['Fossil', 'ressource'],
  ['Cave', 'ressource'],
  ['Ravine', 'ressource'],
  ['Lava Pool', 'ressource'],
  ['Geode', 'ressource', null, ['Amethyst Geode']],
  ['Apple', 'ressource'],
  ['Ore Veins', 'ressource', null, ['Ore Vein']],
  ['Desert Well', 'struktur'],
  ['Trail Ruins', 'struktur'],
  ['Trial Chamber', 'struktur', null, ['Trial Chambers']],
  ['Camp', 'struktur'],
  ['Nether Fortress', 'struktur', 'nether', ['Fortress']],
  ['Nether Fossil', 'ressource', 'nether'],
  ['Bastion', 'struktur', 'nether', ['Bastion Remnant']],
  ['End City', 'struktur', 'ende'],
  ['End Gateway', 'portal', 'ende'],
].flatMap(([typ, kategorie, dimension, aliase = []]) =>
  [typ, ...aliase].map((name) => ({ name, typ, kategorie, dimension })));

function abstand(a, b) {
  const d = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let vorher = d[0];
    d[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const tmp = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, vorher + (a[i - 1] === b[j - 1] ? 0 : 1));
      vorher = tmp;
    }
  }
  return d[b.length];
}

/**
 * Sucht das Feature am Anfang des Titels (tolerant gegenüber OCR-Fehlern)
 * und ersetzt den Anfang durch die korrekte Schreibweise.
 * „Strongho1d (Stairway)“ → { feature: Stronghold, name: „Stronghold (Stairway)“ }
 */
export function featureErkennen(titel) {
  const woerter = titel.split(' ');
  let bestes = null;
  for (const feature of FEATURES) {
    const anzahl = feature.name.split(' ').length;
    if (woerter.length < anzahl) continue;
    const anfang = woerter.slice(0, anzahl).join(' ');
    const erlaubt = feature.name.length <= 5 ? 0 : feature.name.length <= 8 ? 1 : 2;
    const d = abstand(anfang.toLowerCase(), feature.name.toLowerCase());
    // Bei Gleichstand gewinnt das längere Feature („Ocean Ruins“ vor „Ocean Ruin“)
    if (d <= erlaubt && (!bestes || d < bestes.d || (d === bestes.d && anzahl > bestes.anzahl))) {
      bestes = { feature, d, anzahl };
    }
  }
  if (!bestes) return { feature: null, name: titel };
  return {
    feature: bestes.feature,
    name: [bestes.feature.name, ...woerter.slice(bestes.anzahl)].join(' '),
  };
}

export function kategorieRaten(name) {
  return featureErkennen(name).feature?.kategorie ?? 'sonstiges';
}

export function dimensionFinden(zeilen, feature) {
  if (feature?.dimension) return feature.dimension;
  for (const z of zeilen) {
    const treffer = normalisieren(z.text).match(/Dimension\W*(?:The\s+)?(Overworld|Nether|End)\b/i);
    if (treffer) return { overworld: 'oberwelt', nether: 'nether', end: 'ende' }[treffer[1].toLowerCase()];
  }
  return 'oberwelt';
}

/**
 * @param {{ text: string, bbox?: { x0: number, y0: number, x1: number, y1: number } }[]} zeilen OCR-Zeilen von oben nach unten
 */
export function seedMapAuswerten(zeilen) {
  for (let i = 0; i < zeilen.length; i += 1) {
    const treffer = normalisieren(zeilen[i].text).match(KOORD_ZEILE);
    if (!treffer) continue;
    const x = zahlLesen(treffer[1]);
    const z = zahlLesen(treffer[3]);
    if (x === null || z === null) continue;
    const y = zahlLesen(treffer[2]);

    // Titel = nächste Zeile darüber mit echtem Text
    let name = '';
    let titelZeile = null;
    for (let j = i - 1; j >= Math.max(0, i - 2) && !name; j -= 1) {
      const kandidat = titelBereinigen(zeilen[j].text);
      if ((kandidat.match(/[A-Za-z]/g) ?? []).length >= 3) {
        name = kandidat;
        titelZeile = zeilen[j];
      }
    }

    const boxen = [titelZeile?.bbox, zeilen[i].bbox].filter(Boolean);
    const box = boxen.length
      ? {
          x0: Math.min(...boxen.map((b) => b.x0)),
          y0: Math.min(...boxen.map((b) => b.y0)),
          x1: Math.max(...boxen.map((b) => b.x1)),
          y1: Math.max(...boxen.map((b) => b.y1)),
        }
      : null;

    const { feature, name: korrigiert } = featureErkennen(name);
    return {
      name: korrigiert || 'Unbenannter Ort',
      typ: feature?.typ ?? '',
      x,
      y,
      z,
      dimension: dimensionFinden(zeilen, feature),
      kategorie: feature?.kategorie ?? 'sonstiges',
      box,
    };
  }
  return null;
}

// ---------- OCR-Worker (einmal starten, dann wiederverwenden) ----------

let workerPromise = null;
let warteschlange = Promise.resolve();

function worker() {
  workerPromise ??= createWorker('eng', 1, { langPath: SPRACHDATEN, cacheMethod: 'none' });
  return workerPromise;
}

/** Liest einen Screenshot (Buffer) aus. Aufträge laufen nacheinander. */
export function screenshotAuslesen(bild) {
  const auftrag = warteschlange.then(async () => {
    const w = await worker();
    const { data } = await w.recognize(bild, {}, { blocks: true, text: true });
    const zeilen = (data.blocks ?? []).flatMap((b) => b.paragraphs.flatMap((p) => p.lines))
      .map((l) => ({ text: l.text, bbox: l.bbox }));
    return { erkannt: seedMapAuswerten(zeilen), text: data.text };
  });
  warteschlange = auftrag.catch(() => {});
  return auftrag;
}

export async function erkennungBeenden() {
  if (workerPromise) await (await workerPromise).terminate();
}
