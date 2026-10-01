export interface GridConfig {
  cols: number;
  rows: number;
  /** Kantenlänge einer quadratischen Zelle in Pixeln (lib/raster.ts). */
  zellePx: number;
  /** Sichtbarer Abstand zwischen Widgets in Pixeln (je Hälfte als Einzug). */
  gap: number;
}

export interface PixelRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Breite und Höhe einer Rasterzelle in Pixeln – die Zelle ist quadratisch. */
export function cellSize(config: GridConfig): { w: number; h: number } {
  const z = Math.max(0, config.zellePx);
  return { w: z, h: z };
}

/**
 * Rechnet Rasterkoordinaten in Pixel um. Zellen liegen lückenlos
 * aneinander; der Abstand zwischen Widgets entsteht durch einen Einzug von
 * `gap / 2` auf jeder Seite. So fallen Widget-Kanten auf die Gitterlinien.
 */
export function cellToPixel(
  x: number,
  y: number,
  w: number,
  h: number,
  config: GridConfig,
): PixelRect {
  const cell = cellSize(config);
  const inset = config.gap / 2;
  return {
    left: x * cell.w + inset,
    top: y * cell.h + inset,
    width: Math.max(0, w * cell.w - config.gap),
    height: Math.max(0, h * cell.h - config.gap),
  };
}

export function pixelToCell(px: number, py: number, config: GridConfig): { x: number; y: number } {
  const cell = cellSize(config);
  const x = cell.w > 0 ? Math.round(px / cell.w) : 0;
  const y = cell.h > 0 ? Math.round(py / cell.h) : 0;
  return {
    x: clamp(x, 0, config.cols - 1),
    y: clamp(y, 0, config.rows - 1),
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Hält ein Item vollständig innerhalb der Fläche (cols × rows). */
export function clampItemToGrid<T extends Rect>(item: T, cols: number, rows: number): T {
  const w = clamp(item.w, 1, cols);
  const h = clamp(item.h, 1, rows);
  const x = clamp(item.x, 0, cols - w);
  const y = clamp(item.y, 0, rows - h);
  return { ...item, x, y, w, h };
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/**
 * Erste freie Position für ein w × h großes Item, zeilenweise von oben links.
 * Gibt `null` zurück, wenn die Fläche keinen Platz mehr hat.
 */
export function findFreePosition(
  items: Rect[],
  w: number,
  h: number,
  cols: number,
  rows: number,
): { x: number; y: number } | null {
  if (w > cols || h > rows) return null;
  for (let y = 0; y + h <= rows; y++) {
    for (let x = 0; x + w <= cols; x++) {
      const candidate = { x, y, w, h };
      if (!items.some((it) => rectsOverlap(candidate, it))) return { x, y };
    }
  }
  return null;
}
