// Stammdaten und Regeln der Companion – dieselbe Datei, die auch das Handy lädt
// (companion/regeln.js). Sie ist ein klassisches Script ohne Module, damit die
// Companion als Datei läuft; hier wird sie in einem eigenen vm-Kontext ausgeführt.
// So prüfen Handy und Server mit genau denselben Regeln – nichts wird nachgebaut.
// Im selben Kontext läuft companion/board-karten.js: die Anzeigeschemas (Daten → Karte),
// mit denen der Server die Widgets des Dashboards baut wie die Companion „Aufs Board“.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = path.dirname(fileURLToPath(import.meta.url));

/** Ordner der Companion (Seite, regeln.js, icons/) – im Repo neben dem Board */
export const COMPANION_ORDNER = path.resolve(process.env.COMPANION_ORDNER ?? path.join(HIER, '..', '..', '..', 'companion'));

const NAMEN = [
  'WELTGRENZE', 'DIM_ORDER', 'dimLabel', 'EIGENE_ORTE', 'BIOMES', 'FEATURE_KATEGORIEN', 'BIOME', 'biomFinden',
  'SAMMELOBJEKTE', 'FARBEN', 'MUSTER', 'MAX_EBENEN', 'RUESTUNGS_TEILE', 'RUESTUNGEN', 'BESATZ_MATERIALIEN',
  'instanzPruefen', 'bannerPruefen', 'bannerSauber', 'verbindungRegelPruefen', 'verbindungSauber',
  'ruestungPruefen', 'ruestungSauber', 'biomImportPruefen', 'biomImportSauber',
];

const KARTEN_NAMEN = ['BOARD_KARTEN', 'strukturName', 'zahl'];

/** Führt die Scripts nacheinander in einem Kontext aus (gemeinsame Globals wie im Browser) und holt die Namen heraus */
function scriptsLaden(dateien, namen) {
  const kontext = vm.createContext({});
  for (const datei of dateien) new vm.Script(readFileSync(datei, 'utf8'), { filename: datei }).runInContext(kontext);
  return new vm.Script(`({ ${namen.join(', ')} })`).runInContext(kontext);
}

export function regelnLaden(datei = path.join(COMPANION_ORDNER, 'regeln.js')) {
  return scriptsLaden([datei], NAMEN);
}

export const regeln = regelnLaden();
/** Anzeigeschemas aus companion/board-karten.js (braucht regeln.js im selben Kontext) */
export const karten = scriptsLaden([path.join(COMPANION_ORDNER, 'regeln.js'), path.join(COMPANION_ORDNER, 'board-karten.js')], KARTEN_NAMEN);
