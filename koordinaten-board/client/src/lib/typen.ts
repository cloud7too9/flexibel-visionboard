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
  orte: Ort[];
  einstellungen: Einstellungen;
  version: number;
}

export type OrtEingabe = Pick<Ort, 'name' | 'x' | 'y' | 'z' | 'dimension' | 'kategorie' | 'notiz' | 'datei' | 'angeheftet'>;

export type Operation =
  | { art: 'hinzufuegen'; ort: OrtEingabe }
  | { art: 'aendern'; id: string; felder: Partial<OrtEingabe> }
  | { art: 'entfernen'; id: string }
  | { art: 'einstellungen'; felder: Partial<Einstellungen> };

export const DIMENSIONEN: { wert: Dimension; label: string }[] = [
  { wert: 'oberwelt', label: 'Oberwelt' },
  { wert: 'nether', label: 'Nether' },
  { wert: 'ende', label: 'Ende' },
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
