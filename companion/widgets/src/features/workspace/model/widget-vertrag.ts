/**
 * Größen-Vertrag zwischen Dashboard und Widget
 * (planung/bauplaene/Bauplan-Widget-Groessensystem.md).
 *
 * Das Dashboard legt das Raster fest (32 Spalten, Reihen je Fläche), das
 * Widget seine Größenstufen. Im Vertrag stehen nur ganze Zellen – freies
 * Skalieren gibt es nicht. Der Griff zum Vergrößern schaltet zur nächsten
 * angebotenen Stufe, wie im iOS-Kontrollzentrum.
 */
import { RASTER_SPALTEN } from "../lib/raster";

export interface Groessenstufe {
  /** z. B. "klein", "mittel", "groß" – eindeutig je Widget */
  name: string;
  /** Zellen, ganzzahlig, ≥ 1 */
  breite: number;
  /** Zellen, ganzzahlig, ≥ 1 */
  hoehe: number;
  /** Was das Widget in dieser Stufe zeigt */
  informationsumfang: string;
}

export interface WidgetVertrag {
  /** Angebotene Stufen; die erste ist die Standardstufe beim Hinzufügen. */
  stufen: Groessenstufe[];
  mindest: { breite: number; hoehe: number };
  maximal?: { breite: number; hoehe: number };
  /** Vollbild ist je Widget-Typ optional (E7): eigene Route an der Anzeige. */
  vollbild?: boolean;
}

/**
 * Breite der Seitenleiste neben der größten Rasterstufe
 * (`32 − seitenleistenBreite`). Offen bis zur Planung der Größenstufen
 * (E6, Phase A7) – bis dahin gibt es die größte Rasterstufe nicht.
 */
export const SEITENLEISTEN_BREITE: number | null = null;

const ganzzahlig = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 1;

/** Fehler eines Vertrags; leer, wenn er gültig ist. */
export function vertragPruefen(v: WidgetVertrag): string[] {
  const fehler: string[] = [];
  if (!ganzzahlig(v.mindest?.breite) || !ganzzahlig(v.mindest?.hoehe)) fehler.push("Mindestgröße muss aus ganzen Zellen ≥ 1 bestehen");
  if (v.maximal && (!ganzzahlig(v.maximal.breite) || !ganzzahlig(v.maximal.hoehe))) fehler.push("Maximalgröße muss aus ganzen Zellen ≥ 1 bestehen");
  if (!Array.isArray(v.stufen) || v.stufen.length === 0) fehler.push("Mindestens eine Größenstufe angeben");
  const namen = new Set<string>();
  for (const s of v.stufen ?? []) {
    if (!s.name?.trim()) fehler.push("Jede Stufe braucht einen Namen");
    else if (namen.has(s.name)) fehler.push(`Stufe „${s.name}“ doppelt`);
    namen.add(s.name);
    if (!ganzzahlig(s.breite) || !ganzzahlig(s.hoehe)) {
      fehler.push(`Stufe „${s.name}“: Breite und Höhe in ganzen Zellen ≥ 1`);
      continue;
    }
    if (s.breite > RASTER_SPALTEN) fehler.push(`Stufe „${s.name}“ ist breiter als ${RASTER_SPALTEN} Spalten`);
    if (v.mindest && (s.breite < v.mindest.breite || s.hoehe < v.mindest.hoehe)) fehler.push(`Stufe „${s.name}“ ist kleiner als die Mindestgröße`);
    if (v.maximal && (s.breite > v.maximal.breite || s.hoehe > v.maximal.hoehe)) fehler.push(`Stufe „${s.name}“ ist größer als die Maximalgröße`);
  }
  return fehler;
}

/** Prüft beim Registrieren; ein ungültiger Vertrag ist ein Programmierfehler. */
export function vertragRegistrieren<T extends WidgetVertrag>(typ: string, v: T): T {
  const fehler = vertragPruefen(v);
  if (fehler.length) throw new Error(`Widget „${typ}“: ${fehler.join("; ")}`);
  return v;
}

/** Stufe nach Name; ohne Treffer die Standardstufe (die erste). */
export function stufeVon(v: WidgetVertrag, name: string | undefined): Groessenstufe {
  return v.stufen.find((s) => s.name === name) ?? v.stufen[0];
}

/**
 * Rundung aus dem Entwurf: freie Pixelmaße auf ganze Zellen, bevor sie in den
 * Vertrag wandern. 137 × 88 px bei 11 px pro Zelle → 12 × 8 Zellen.
 */
export function inZellen(px: number, zellePxEntwurf: number): number {
  return Math.max(1, Math.round(px / zellePxEntwurf));
}
