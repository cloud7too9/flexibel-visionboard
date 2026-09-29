// Was die Anzeige im Zimmer zeigt: die Orte der aktiven Welt in der Form, die
// Anzeige.tsx kennt (client/src/lib/typen.ts → Ort). So bleibt die Anzeige
// unabhängig vom Datenmodell der Companion. Biome zeigt sie nicht.
import { FEATURES } from './erkennung.js';
import { regeln } from './regeln.js';

const DIMENSION = { overworld: 'oberwelt', nether: 'nether', end: 'ende' };
// Seed-Map-Typ → Kategorie der Anzeige (Linien-Icon, Sortierung)
const KATEGORIE = new Map(FEATURES.map((f) => [f.typ, f.kategorie]));

export function anzeigeSicht(daten) {
  const welt = daten.aktiveWelt();
  const typen = new Map(daten.inhalt.typen.map((t) => [t.id, t]));
  const orte = [];
  for (const i of welt ? daten.instanzenVon(welt.id) : []) {
    const t = typen.get(i.featureTypeId);
    if (!t || t.kategorie === regeln.BIOMES) continue;
    const eigen = t.kategorie === regeln.EIGENE_ORTE;
    orte.push({
      id: i.id,
      // wie der Titel im Seed-Map-Popup: „Stronghold (Stairway)“, eigene Orte mit ihrem Namen
      name: eigen ? t.variante : t.variante ? `${t.kategorie} (${t.variante})` : t.kategorie,
      x: i.x, y: i.y ?? null, z: i.z,
      dimension: DIMENSION[daten.dimension(i.dimensionId).type],
      kategorie: eigen ? 'basis' : KATEGORIE.get(t.kategorie) ?? 'struktur',
      typ: eigen ? '' : t.kategorie,
      notiz: '', datei: '',
      angeheftet: Boolean(i.angeheftet),
      erstelltVon: i.von ?? '',
      erstelltAm: i.am,
      geaendertAm: i.geaendert ?? i.am,
    });
  }
  const { titel, qrZeigen } = daten.inhalt.einstellungen;
  return { orte, einstellungen: { titel, qrZeigen }, welt: welt && { ...welt }, version: daten.version };
}
