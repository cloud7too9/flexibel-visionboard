import type { LayoutItem } from "../model/workspace.types";
import type { WidgetVertrag } from "../model/widget-vertrag";
import { RASTER_SPALTEN } from "./raster";
import { rectsOverlap, type Rect } from "./layout-utils";

export function hasCollision(candidate: LayoutItem, others: LayoutItem[]): boolean {
  return others.some((o) => o.id !== candidate.id && rectsOverlap(candidate, o));
}

/**
 * Belegungsmatrix spalten × reihen (Index `y * spalten + x`, 1 = belegt).
 * Teile außerhalb der Fläche werden nicht eingetragen.
 */
export function belegungBauen(
  items: (Rect & { id?: string })[],
  reihen: number,
  ohneId?: string,
  spalten = RASTER_SPALTEN,
): Uint8Array {
  const matrix = new Uint8Array(spalten * Math.max(0, reihen));
  for (const it of items) {
    if (it.id !== undefined && it.id === ohneId) continue;
    for (let y = Math.max(0, it.y); y < Math.min(reihen, it.y + it.h); y++) {
      for (let x = Math.max(0, it.x); x < Math.min(spalten, it.x + it.w); x++) matrix[y * spalten + x] = 1;
    }
  }
  return matrix;
}

export type PasstGrund = "stufe" | "rand" | "belegt";
export interface PasstErgebnis {
  passt: boolean;
  grund?: PasstGrund;
}

/**
 * Passt-Prüfung beim Anordnen: Größe innerhalb von Mindest- und Maximalgröße
 * des Widgets, `x + breite ≤ 32` und `y + hoehe ≤ reihen` der jeweiligen
 * Anzeige, keine belegte Zelle.
 */
export function passt(
  kandidat: Rect & { id?: string },
  items: (Rect & { id?: string })[],
  reihen: number,
  vertrag?: WidgetVertrag,
  spalten = RASTER_SPALTEN,
): PasstErgebnis {
  if (vertrag) {
    const { mindest, maximal } = vertrag;
    if (kandidat.w < mindest.breite || kandidat.h < mindest.hoehe) return { passt: false, grund: "stufe" };
    if (maximal && (kandidat.w > maximal.breite || kandidat.h > maximal.hoehe)) return { passt: false, grund: "stufe" };
  }
  if (kandidat.x < 0 || kandidat.y < 0 || kandidat.x + kandidat.w > spalten || kandidat.y + kandidat.h > reihen) {
    return { passt: false, grund: "rand" };
  }
  const matrix = belegungBauen(items, reihen, kandidat.id, spalten);
  for (let y = kandidat.y; y < kandidat.y + kandidat.h; y++) {
    for (let x = kandidat.x; x < kandidat.x + kandidat.w; x++) {
      if (matrix[y * spalten + x]) return { passt: false, grund: "belegt" };
    }
  }
  return { passt: true };
}
