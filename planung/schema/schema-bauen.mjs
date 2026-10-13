// Baut planung/schema/companion-schema.sql aus schema-vorlage.sql.
// Die Stammdaten (Farben, Muster, Rüstung, Besätze, Materialien) kommen aus companion/regeln.js –
// dieselbe Datei, mit der Handy und Board-Server prüfen. Nichts davon wird von Hand gepflegt.
//
//   node planung/schema/schema-bauen.mjs            → schreibt companion-schema.sql
//   node planung/schema/schema-bauen.mjs --pruefen  → Fehler, wenn die Datei veraltet ist
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { regeln } from '../../koordinaten-board/server/src/regeln.js';

const HIER = path.dirname(fileURLToPath(import.meta.url));
export const ZIEL = path.join(HIER, 'companion-schema.sql');

const KOPF = `-- Referenzschema der Companion (SQLite)
-- ERZEUGT von planung/schema/schema-bauen.mjs aus schema-vorlage.sql und companion/regeln.js.
-- Nicht von Hand ändern: Vorlage anpassen und neu bauen. Entscheidungen: planung/schema/README.md
-- Heute speichert der Board-Server weiter in daten.json; die Feldnamen dort folgen diesem Schema.

`;

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const einfuegen = (tabelle, spalten, zeilen) =>
  `INSERT INTO ${tabelle} (${spalten.join(', ')}) VALUES\n${zeilen.map((z) => `  (${z.join(', ')})`).join(',\n')};`;

export function schemaBauen() {
  const { FARBEN, MUSTER, MAX_EBENEN, RUESTUNGS_TEILE, RUESTUNGEN, BESATZ_MATERIALIEN, SAMMELOBJEKTE } = regeln;
  const besaetze = SAMMELOBJEKTE.filter((o) => !o.aufwertung);   // Netheritaufwertung ist kein Besatz
  const teile = {
    MAX_EBENEN: String(MAX_EBENEN),
    farben: einfuegen('farben', ['id', 'name_de', 'hex', 'sortierung'],
      FARBEN.map((f, i) => [q(f.id), q(f.de), q(f.hex), i + 1])),
    muster: einfuegen('muster', ['id', 'name_de', 'name_en', 'sortierung'],
      MUSTER.map((m, i) => [q(m.id), q(m.de), q(m.en), i + 1])),
    ruestungs_teile: einfuegen('ruestungs_teile', ['id', 'name_de', 'sortierung'],
      RUESTUNGS_TEILE.map((t, i) => [q(t.id), q(t.name), i + 1])),
    ruestungs_arten: einfuegen('ruestungs_arten', ['id', 'name_de', 'sortierung'],
      RUESTUNGEN.map((r, i) => [q(r.id), q(r.name), i + 1])),
    ruestungs_varianten: einfuegen('ruestungs_varianten', ['art_id', 'teil_id', 'item_de'],
      RUESTUNGEN.flatMap((r) => RUESTUNGS_TEILE.filter((t) => r.teile[t.id]).map((t) => [q(r.id), q(t.id), q(r.teile[t.id])]))),
    besaetze: einfuegen('besaetze', ['id', 'name_de', 'name_en', 'sortierung'],
      besaetze.map((b, i) => [q(b.id), q(b.name), q(b.en), i + 1])),
    besatz_materialien: einfuegen('besatz_materialien', ['id', 'name_de', 'zutat_de', 'hex', 'sortierung'],
      BESATZ_MATERIALIEN.map((m, i) => [q(m.id), q(m.name), q(m.zutat), q(m.hex), i + 1])),
  };
  const vorlage = readFileSync(path.join(HIER, 'schema-vorlage.sql'), 'utf8');
  const sql = vorlage.replace(/\{\{(\w+)\}\}/g, (_, name) => {
    if (!(name in teile)) throw new Error(`Unbekannter Platzhalter {{${name}}}`);
    return teile[name];
  });
  return KOPF + sql;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const sql = schemaBauen();
  if (process.argv.includes('--pruefen')) {
    if (readFileSync(ZIEL, 'utf8') !== sql) {
      console.error('companion-schema.sql ist veraltet – bitte `node planung/schema/schema-bauen.mjs` ausführen');
      process.exit(1);
    }
    console.log('companion-schema.sql ist aktuell');
  } else {
    writeFileSync(ZIEL, sql);
    console.log('companion-schema.sql geschrieben');
  }
}
