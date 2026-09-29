import type { LayoutItem, WorkspaceLayout } from "../model/workspace.types";
import { PANEL_REGISTRY } from "../model/panel-registry";
import { clamp, rectsOverlap } from "./layout-utils";
import type { BreakpointDefinition } from "../model/breakpoints";

/**
 * Skaliert die Breite eines Items proportional von `fromCols` auf `toCols`
 * Spalten. Die Mindestbreite aus der Panel-Registry bleibt erhalten, wird
 * aber nie größer als das Zielraster.
 */
export function scaleItemWidth(item: LayoutItem, fromCols: number, toCols: number): number {
  const def = PANEL_REGISTRY[item.panelTyp];
  const minW = Math.min(item.minW ?? def?.minBreite ?? 1, toCols);
  const scaled = Math.round((item.w * toCols) / fromCols);
  return clamp(scaled, minW, toCols);
}

/**
 * Ordnet Items ohne Überlappung in einem Raster mit `cols` Spalten an.
 *
 * Die Items werden in Lesereihenfolge (erst nach `y`, dann nach `x`) verarbeitet
 * und jeweils an die erste freie Position gesetzt. Dadurch bleibt die
 * ursprüngliche Reihenfolge erhalten, und es entstehen keine Lücken nach oben.
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
 * Leitet aus dem kanonischen Layout (z. B. 12 Spalten) ein Layout für einen
 * anderen Breakpoint ab. Bei gleicher Spaltenzahl wird das Layout nur um die
 * Breakpoint-Parameter (Abstand, Zeilenhöhe) ergänzt und unverändert
 * zurückgegeben.
 */
export function adaptLayoutToBreakpoint(
  layout: WorkspaceLayout,
  breakpoint: BreakpointDefinition,
): WorkspaceLayout {
  const fromCols = layout.spalten;
  const toCols = breakpoint.spalten;

  if (fromCols === toCols) {
    return { ...layout, abstand: breakpoint.abstand, zeilenHoehe: breakpoint.zeilenHoehe };
  }

  const scaled = layout.items.map((item) => ({
    ...item,
    w: scaleItemWidth(item, fromCols, toCols),
    // x proportional skalieren, damit die Lesereihenfolge beim Reflow stimmt.
    x: Math.round((item.x * toCols) / fromCols),
  }));

  return {
    ...layout,
    spalten: toCols,
    abstand: breakpoint.abstand,
    zeilenHoehe: breakpoint.zeilenHoehe,
    items: reflowItems(scaled, toCols),
  };
}
