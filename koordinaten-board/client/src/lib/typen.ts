export type Dimension = 'oberwelt' | 'nether' | 'ende';
export type Kategorie = 'basis' | 'farm' | 'portal' | 'dorf' | 'struktur' | 'ressource' | 'sonstiges';

export interface Ort {
  id: string;
  name: string;
  x: number;
  y: number | null;
  z: number;
  dimension: Dimension;
  kategorie: Kategorie;
  /** Feature-Typ der Seed Map, z. B. „Stronghold“ (leer = eigener Ort) */
  typ: string;
  notiz: string;
  datei: string;
  angeheftet: boolean;
  erstelltVon: string;
  erstelltAm: string;
  geaendertAm: string;
}

export interface Einstellungen {
  titel: string;
  qrZeigen: boolean;
}

export interface BoardZustand {
  /** Orte der aktiven Welt (der Server rechnet sie aus den Daten der Companion um) */
  orte: Ort[];
  einstellungen: Einstellungen;
  /** Welt, deren Orte die Anzeige zeigt – null, solange es keine gibt */
  welt?: { id: string; seed: string } | null;
  version: number;
}

/** Block einer gezeigten Karte (Aufbau und Grenzen: server/src/zeigen.js) */
export type KartenBlock =
  | { art: 'koordinaten'; label?: string; x: number; y: number | null; z: number; dimension: Dimension | null }
  | { art: 'zeilen'; zeilen: { label: string; wert: string }[] }
  | { art: 'text'; text: string };

/** Karte, die ein Handy groß auf die Anzeige geworfen hat */
export interface GezeigteKarte {
  id: string;
  titel: string;
  unter?: string;
  bereich?: string;
  quelle?: string;
  /** Feature-Typ der Seed Map – die Anzeige zeigt dazu den Kennblock, falls sie einen hat */
  typ?: string;
  dimension: Dimension | null;
  bloecke: KartenBlock[];
  von: string;
  farbe: string;
  am: string;
}

export type OrtEingabe = Pick<Ort, 'name' | 'x' | 'y' | 'z' | 'dimension' | 'kategorie' | 'typ' | 'notiz' | 'datei' | 'angeheftet'>;

export type Operation =
  | { art: 'hinzufuegen'; ort: OrtEingabe }
  | { art: 'aendern'; id: string; felder: Partial<OrtEingabe> }
  | { art: 'entfernen'; id: string }
  | { art: 'einstellungen'; felder: Partial<Einstellungen> };

export const DIMENSIONEN: { wert: Dimension; label: string }[] = [
  { wert: 'oberwelt', label: 'Oberwelt' },
  { wert: 'nether', label: 'Nether' },
  { wert: 'ende', label: 'End' },
];

export const KATEGORIEN: { wert: Kategorie; label: string }[] = [
  { wert: 'basis', label: 'Basis' },
  { wert: 'farm', label: 'Farm' },
  { wert: 'portal', label: 'Portal' },
  { wert: 'dorf', label: 'Dorf' },
  { wert: 'struktur', label: 'Struktur' },
  { wert: 'ressource', label: 'Ressource' },
  { wert: 'sonstiges', label: 'Sonstiges' },
];

export const dimensionLabel = (d: Dimension) => DIMENSIONEN.find((x) => x.wert === d)?.label ?? d;
export const kategorieLabel = (k: Kategorie) => KATEGORIEN.find((x) => x.wert === k)?.label ?? k;

export interface FeatureTyp {
  typ: string;
  kategorie: Kategorie;
  dimension: Dimension | null;
}

/** Ergebnis der Screenshot-Erkennung vom Server */
export interface Erkannt {
  name: string;
  typ: string;
  x: number;
  y: number | null;
  z: number;
  dimension: Dimension;
  kategorie: Kategorie;
  box: { x0: number; y0: number; x1: number; y1: number } | null;
}

/** CSS-Klasse, die die komplette Oberfläche in die Farben der Dimension taucht */
export const thema = (d: Dimension) => `thema-${d}`;

/** „in der Oberwelt“ / „im Nether“ / „im End“ */
export const inDimension = (d: Dimension) => (d === 'oberwelt' ? 'in der Oberwelt' : `im ${dimensionLabel(d)}`);
