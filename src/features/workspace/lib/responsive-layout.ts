import type { LayoutItem, WorkspaceLayout } from "../model/workspace.types";
import { clamp, fitItemsToRows, rectsOverlap } from "./layout-utils";
import type { BreakpointDefinition } from "../model/breakpoints";

/**
 * Ordnet Items ohne Überlappung in einem Raster mit `cols` Spalten an.
 *
 * Die Items werden in Lesereihenfolge (erst nach `y`, dann nach `x`) verarbeitet
 * und jeweils an die erste freie Position gesetzt. Dadurch bleibt die
 * ursprüngliche Reihenfolge erhalten, und es entstehen keine Lücken nach oben.
 * Die Höhe ist hier unbegrenzt; eingepasst wird danach mit `fitItemsToRows`.
 */
export function reflowItems(items: LayoutItem[], cols: number): LayoutItem[] {
  const ordered = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const placed: LayoutItem[] = [];

  for (const item of ordered) {
    const w = Math.min(item.w, cols);
    const h = item.h;
    let position: { x: number; y: number } | null = null;

    // Obergrenze: Alle Items untereinander gestapelt passen immer.
    const maxY = placed.reduce((acc, p) => acc + p.h, 0) + 1;
    outer: for (let y = 0; y <= maxY; y++) {
      for (let x = 0; x + w <= cols; x++) {
        const candidate = { x, y, w, h };
        if (!placed.some((p) => rectsOverlap(candidate, p))) {
          position = { x, y };
          break outer;
        }
      }
    }

    placed.push({ ...item, w, x: position?.x ?? 0, y: position?.y ?? maxY });
  }

  return placed;
}

/**
 * Leitet aus dem kanonischen Layout (Desktop-Raster) ein Layout für einen
 * anderen Breakpoint ab: Maße proportional skalieren, Mindestbreite für
 * Lesbarkeit erzwingen, ohne Überlappung neu anordnen und zum Schluss in die
 * Höhe der Fläche einpassen, weil die Seite nicht scrollt.
 */
export function adaptLayoutToBreakpoint(
  layout: WorkspaceLayout,
  breakpoint: BreakpointDefinition,
): WorkspaceLayout {
  const fromCols = layout.spalten;
  const fromRows = layout.zeilen;
  const toCols = breakpoint.spalten;
  const toRows = breakpoint.zeilen;

  if (fromCols === toCols && fromRows === toRows) {
    return { ...layout, abstand: breakpoint.abstand };
  }

  const minW = Math.min(breakpoint.minWidgetSpalten, toCols);
  const scaled = layout.items.map((item) => ({
    ...item,
    w: clamp(Math.round((item.w * toCols) / fromCols), minW, toCols),
    x: Math.round((item.x * toCols) / fromCols),
    h: Math.max(1, Math.round((item.h * toRows) / fromRows)),
    y: Math.round((item.y * toRows) / fromRows),
  }));

  return {
    ...layout,
    spalten: toCols,
    zeilen: toRows,
    abstand: breakpoint.abstand,
    items: fitItemsToRows(reflowItems(scaled, toCols), toRows),
  };
}
