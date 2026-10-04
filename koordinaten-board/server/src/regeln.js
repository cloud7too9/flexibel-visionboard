// Stammdaten und Regeln der Companion – dieselbe Datei, die auch das Handy lädt
// (regeln.js im Repo Companion, Ordner app/). Sie ist ein klassisches Script ohne Module, damit die
// Companion als Datei läuft; hier wird sie in einem eigenen vm-Kontext ausgeführt.
// So prüfen Handy und Server mit genau denselben Regeln – nichts wird nachgebaut.
// Im selben Kontext läuft board-karten.js der Companion: die Anzeigeschemas (Daten → Karte),
// mit denen der Server die Widgets des Dashboards baut wie die Companion „Aufs Board“.
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = path.dirname(fileURLToPath(import.meta.url));

/**
 * Ordner der Companion-App (Seite, regeln.js, board-karten.js, icons/ …). Die Companion hat ein
 * eigenes Repo; es liegt neben diesem: …/flexibel-visionboard und …/Companion → ../Companion/app.
 */
export const COMPANION_ORDNER = path.resolve(process.env.COMPANION_ORDNER ?? path.join(HIER, '..', '..', '..', '..', 'Companion', 'app'));
if (!existsSync(path.join(COMPANION_ORDNER, 'regeln.js'))) {
  throw new Error(`Companion nicht gefunden: ${COMPANION_ORDNER}\n`
    + 'Das Repo Companion neben flexibel-visionboard auschecken (git clone https://github.com/cloud7too9/Companion.git) '
    + 'oder COMPANION_ORDNER auf dessen Ordner app/ setzen.');
}

const NAMEN = [
  'WELTGRENZE', 'DIM_ORDER', 'dimLabel', 'EIGENE_ORTE', 'BIOMES', 'FEATURE_KATEGORIEN', 'BIOME', 'biomFinden',
  'SAMMELOBJEKTE', 'FARBEN', 'MUSTER', 'MAX_EBENEN', 'RUESTUNGS_TEILE', 'RUESTUNGEN', 'BESATZ_MATERIALIEN',
  'instanzPruefen', 'bannerPruefen', 'bannerSauber', 'verbindungRegelPruefen', 'verbindungSauber',
  'ruestungPruefen', 'ruestungSauber', 'biomImportPruefen', 'biomImportSauber', 'idGueltig',
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
/** Anzeigeschemas aus board-karten.js der Companion (braucht regeln.js im selben Kontext) */
export const karten = scriptsLaden([path.join(COMPANION_ORDNER, 'regeln.js'), path.join(COMPANION_ORDNER, 'board-karten.js')], KARTEN_NAMEN);
