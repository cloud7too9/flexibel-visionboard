// Stammdaten und Regeln der Companion – dieselbe Datei, die auch das Handy lädt
// (companion/regeln.js). Sie ist ein klassisches Script ohne Module, damit die
// Companion als Datei läuft; hier wird sie in einem eigenen vm-Kontext ausgeführt.
// So prüfen Handy und Server mit genau denselben Regeln – nichts wird nachgebaut.
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

export function regelnLaden(datei = path.join(COMPANION_ORDNER, 'regeln.js')) {
  const code = readFileSync(datei, 'utf8');
  return new vm.Script(`${code}\n;({ ${NAMEN.join(', ')} })`, { filename: datei }).runInNewContext({});
}

export const regeln = regelnLaden();
