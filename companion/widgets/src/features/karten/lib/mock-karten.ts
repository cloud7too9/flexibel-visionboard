import type { Karte, QuellenAntwort, WidgetAntwort } from "../karte.types";

/**
 * Feste Beispielkarten, solange kein Board erreichbar ist (z. B. `npm run dev`
 * ohne Board-Server). Sie haben dieselbe Form wie die Karten vom Board und
 * verhalten sich wie dessen Endpunkte: geplante Typen und fehlende Quellen
 * liefern einen Hinweis.
 */
const BEISPIEL_QUELLEN: Record<string, QuellenAntwort> = {
  "karte.einzelkoordinate": { quelle: "ort", quellen: [
    { id: "i_1", name: "Hauptbasis", unter: "Oberwelt · X 260 · Z −420" },
    { id: "i_2", name: "Nether Fortress", unter: "Nether · X −200 · Z 96" },
  ] },
  "sammelobjekte.einzelobjekt": { quelle: "sammel", quellen: [
    { id: "rib", name: "Rippenzier", unter: "Netherfestung · offen" },
    { id: "eye", name: "Augenzier", unter: "Festung · gefunden" },
  ] },
  "banner.banner": { quelle: "banner", quellen: [{ id: "b_1", name: "Wappen" }, { id: "b_2", name: "Portal" }] },
  "ruestung.set": { quelle: "ruestung", quellen: [{ id: "r_1", name: "Amethyst" }] },
};

const BEISPIELE: Record<string, Karte> = {
  "karte.gesamtkarte": {
    titel: "Gesamtkarte", unter: "Welt 68891…0698 · Beispiel", dimension: "oberwelt", bloecke: [
      { art: "zeilen", zeilen: [{ label: "Oberwelt", wert: "9 Orte" }, { label: "Nether", wert: "3 Orte" }, { label: "End", wert: "1 Orte" }] },
      { art: "zeilen", zeilen: [{ label: "Hauptbasis", wert: "Oberwelt · 260 / −420" }] },
    ],
  },
  "karte.einzelkoordinate": {
    titel: "Hauptbasis", unter: "Eigene Orte · Kirschhain", dimension: "oberwelt", bloecke: [
      { art: "koordinaten", x: 260, y: 80, z: -420 },
      { art: "koordinaten", label: "Im Nether", x: 32, y: null, z: -53, dimension: "nether" },
    ],
  },
  "sammelobjekte.gesamtauflistung": {
    titel: "Sammelobjekte", unter: "5 von 18 Rüstungsbesätzen gefunden", bloecke: [
      { art: "zeilen", zeilen: [
        { label: "Wächterzier", wert: "✓ Lena" }, { label: "Wüstenzier", wert: "offen · Wüstentempel" },
        { label: "Küstenzier", wert: "✓ Max" }, { label: "Wildniszier", wert: "offen · Dschungeltempel" },
      ] },
      { art: "zeilen", zeilen: [{ label: "Rippenzier", wert: "offen · Netherfestung" }, { label: "Schnauzenzier", wert: "✓ Max" }] },
    ],
  },
  "sammelobjekte.einzelobjekt": {
    titel: "Rippenzier", unter: "Rib · Rüstungsbesatz", dimension: "nether", bloecke: [
      { art: "zeilen", zeilen: [{ label: "Fundort", wert: "Netherfestung · Nether" }, { label: "Status", wert: "noch offen" }] },
      { art: "koordinaten", label: "Nächster bekannter Fundort", x: -200, y: 70, z: 96, dimension: "nether" },
    ],
  },
  "sammelobjekte.status": {
    titel: "Rüstungsbesätze", unter: "Sammelobjekte der Welt 68891…0698", bloecke: [
      { art: "zeilen", zeilen: [{ label: "Gefunden", wert: "5 von 18" }, { label: "Fortschritt", wert: "28 %" }] },
    ],
  },
  "portale.verbindungen": {
    titel: "Portalverbindungen", unter: "Oberwelt ↔ Nether · Regeln Bedrock", dimension: "nether", bloecke: [
      { art: "zeilen", zeilen: [
        { label: "Hauptbasis", wert: "Verbunden · O 800 / 80 ↔ N 100 / 10" },
        { label: "Eisenfarm", wert: "Einseitig · O 1 200 / −640 ↔ N 150 / −80" },
        { label: "Dorf", wert: "Neues Portal · O −2 400 / 96 ↔ N −300 / 12" },
      ] },
    ],
  },
  "banner.banner": {
    titel: "Wappen", unter: "Banner-Bauplan · 1 Muster · Grundfarbe Weiß", bloecke: [
      { art: "zeilen", zeilen: [{ label: "Weiße Wolle", wert: "6 ×" }, { label: "Stock", wert: "1 ×" }, { label: "Roter Farbstoff", wert: "1 ×" }] },
    ],
  },
  "ruestung.set": {
    titel: "Amethyst", unter: "Rüstungs-Set · 2 Teile", bloecke: [
      { art: "zeilen", zeilen: [
        { label: "Diamantbrustplatte", wert: "Stillezier · Amethyst" },
        { label: "Schildkrötenpanzer", wert: "ohne Besatz" },
      ] },
    ],
  },
};

const HINWEISE: Record<string, string> = {
  "karte.koordinatensammlung": "Koordinatensammlungen sind noch nicht festgelegt",
  "sammelobjekte.eigeneliste": "Eigene Listen sind noch nicht festgelegt",
  "handbuch.eintrag": "Bereich geplant",
  "handbuch.materialliste": "Bereich geplant",
  "bauplaene.bauplan": "Bereich geplant",
};

export function mockKarte(typ: string, quelle?: string): WidgetAntwort {
  if (HINWEISE[typ]) return { karte: null, hinweis: HINWEISE[typ] };
  const quellen = BEISPIEL_QUELLEN[typ];
  if (quellen && !quelle) return { karte: null, hinweis: "Keine Quelle gewählt" };
  if (quellen && !quellen.quellen.some((q) => q.id === quelle)) return { karte: null, hinweis: "Die Quelle gibt es nicht mehr" };
  const karte = BEISPIELE[typ];
  return karte ? { karte } : { karte: null, hinweis: "Unbekanntes Widget" };
}

export const mockQuellen = (typ: string): QuellenAntwort => BEISPIEL_QUELLEN[typ] ?? { quelle: null, quellen: [] };
