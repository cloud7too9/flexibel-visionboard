/**
 * Bildschirmgrößen (Breakpoints) für das Workspace-Grid.
 *
 * Die Grenzen entsprechen den Tailwind-Standards (`sm` = 640px, `lg` = 1024px),
 * damit CSS-Utilities (z. B. `sm:`, `lg:`) und die Grid-Logik dieselben
 * Schwellen verwenden.
 *
 * Das gespeicherte Layout ist immer im kanonischen Desktop-Raster (96 × 48)
 * abgelegt. Für kleinere Bildschirme wird daraus zur Laufzeit ein abgeleitetes
 * Layout mit weniger Spalten berechnet (siehe `responsive-layout.ts`).
 */

import { CANONICAL_SPALTEN, CANONICAL_ZEILEN } from "./default-layout";

export type Breakpoint = "mobile" | "tablet" | "desktop";

export interface BreakpointDefinition {
  name: Breakpoint;
  label: string;
  /** Erste Viewport-Breite (inklusive), ab der dieser Breakpoint gilt. */
  minWidth: number;
  /** Spaltenzahl des Rasters in diesem Breakpoint. */
  spalten: number;
  /** Zeilenzahl des Rasters. Die Fläche füllt den Bildschirm und scrollt nicht. */
  zeilen: number;
  /** Sichtbarer Abstand zwischen Widgets in Pixeln. */
  abstand: number;
  /** Mindestbreite abgeleiteter Widgets in Spalten (Lesbarkeit auf kleinen Bildschirmen). */
  minWidgetSpalten: number;
  /** Ob Panels per Drag & Drop verschoben und skaliert werden dürfen. */
  erlaubtAnordnen: boolean;
}

/** Sortiert nach `minWidth` aufsteigend. */
export const BREAKPOINTS: readonly BreakpointDefinition[] = [
  {
    name: "mobile",
    label: "Mobil",
    minWidth: 0,
    spalten: 24,
    zeilen: 48,
    abstand: 6,
    minWidgetSpalten: 24,
    erlaubtAnordnen: false,
  },
  {
    name: "tablet",
    label: "Tablet",
    minWidth: 640,
    spalten: 48,
    zeilen: 64,
    abstand: 8,
    minWidgetSpalten: 16,
    erlaubtAnordnen: false,
  },
  {
    name: "desktop",
    label: "Desktop",
    minWidth: 1024,
    spalten: CANONICAL_SPALTEN,
    zeilen: CANONICAL_ZEILEN,
    abstand: 8,
    minWidgetSpalten: 1,
    erlaubtAnordnen: true,
  },
] as const;

/** Der Breakpoint, in dem Layouts gespeichert und bearbeitet werden. */
export const CANONICAL_BREAKPOINT: Breakpoint = "desktop";

export function breakpointForWidth(width: number): BreakpointDefinition {
  let match = BREAKPOINTS[0];
  for (const bp of BREAKPOINTS) {
    if (width >= bp.minWidth) match = bp;
  }
  return match;
}

export function getBreakpoint(name: Breakpoint): BreakpointDefinition {
  const found = BREAKPOINTS.find((bp) => bp.name === name);
  if (!found) throw new Error(`Unbekannter Breakpoint: ${name}`);
  return found;
}
