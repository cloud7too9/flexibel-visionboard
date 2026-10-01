import { describe, expect, it } from "vitest";
import {
  cellSize,
  cellToPixel,
  clampItemToGrid,
  findFreePosition,
  pixelToCell,
  rectsOverlap,
} from "../features/workspace/lib/layout-utils";
import { hasCollision } from "../features/workspace/lib/collision-utils";
import type { LayoutItem } from "../features/workspace/model/workspace.types";

// 1440 px breit → Zelle 45 px, 18 Reihen sichtbar
const config = { cols: 32, rows: 18, zellePx: 45, gap: 8 };

const mkItem = (overrides: Partial<LayoutItem>): LayoutItem => ({
  id: "x",
  panelTyp: "schnellnotiz",
  titel: "x",
  stufe: "mittel",
  x: 0,
  y: 0,
  w: 12,
  h: 6,
  ...overrides,
});

describe("cellSize", () => {
  it("is a square cell", () => {
    expect(cellSize(config)).toEqual({ w: 45, h: 45 });
  });

  it("is zero for an unmeasured container", () => {
    expect(cellSize({ ...config, zellePx: 0 })).toEqual({ w: 0, h: 0 });
  });
});

describe("cellToPixel", () => {
  it("insets by half the gap so widget edges sit on grid lines", () => {
    expect(cellToPixel(0, 0, 1, 1, config)).toEqual({ left: 4, top: 4, width: 37, height: 37 });
  });

  it("spans multiple cells", () => {
    const rect = cellToPixel(10, 4, 8, 6, config);
    expect(rect).toEqual({ left: 454, top: 184, width: 352, height: 262 });
  });

  it("fills the whole area for a full-size item", () => {
    const rect = cellToPixel(0, 0, 32, 18, config);
    expect(rect.left + rect.width + 4).toBe(1440);
    expect(rect.top + rect.height + 4).toBe(810);
  });
});

describe("pixelToCell", () => {
  it("rounds to the nearest cell", () => {
    expect(pixelToCell(452, 182, config)).toEqual({ x: 10, y: 4 });
  });

  it("clamps into the area", () => {
    expect(pixelToCell(999999, 999999, config)).toEqual({ x: 31, y: 17 });
    expect(pixelToCell(-50, -50, config)).toEqual({ x: 0, y: 0 });
  });
});

describe("clampItemToGrid", () => {
  it("keeps items inside horizontally and vertically", () => {
    const clamped = clampItemToGrid(mkItem({ x: 30, y: 16, w: 4, h: 3 }), 32, 18);
    expect(clamped).toMatchObject({ x: 28, y: 15, w: 4, h: 3 });
  });

  it("truncates items larger than the area", () => {
    const clamped = clampItemToGrid(mkItem({ w: 200, h: 100 }), 32, 18);
    expect(clamped).toMatchObject({ x: 0, y: 0, w: 32, h: 18 });
  });
});

describe("rectsOverlap / hasCollision", () => {
  it("detects overlap", () => {
    expect(rectsOverlap({ x: 0, y: 0, w: 2, h: 2 }, { x: 1, y: 1, w: 2, h: 2 })).toBe(true);
  });

  it("ignores adjacent rects", () => {
    expect(rectsOverlap({ x: 0, y: 0, w: 2, h: 2 }, { x: 2, y: 0, w: 2, h: 2 })).toBe(false);
  });

  it("ignores the same item (by id)", () => {
    const a = mkItem({ id: "a" });
    const b = mkItem({ id: "b", x: 50 });
    expect(hasCollision(a, [a, b])).toBe(false);
  });
});

describe("findFreePosition", () => {
  it("places the first item at the origin", () => {
    expect(findFreePosition([], 4, 3, 32, 18)).toEqual({ x: 0, y: 0 });
  });

  it("finds a spot right next to an existing item", () => {
    expect(findFreePosition([mkItem({ w: 4 })], 4, 3, 32, 18)).toEqual({ x: 4, y: 0 });
  });

  it("returns null when the area is full", () => {
    const full = [mkItem({ w: 32, h: 18 })];
    expect(findFreePosition(full, 1, 1, 32, 18)).toBeNull();
  });

  it("returns null when the item is larger than the area", () => {
    expect(findFreePosition([], 33, 1, 32, 18)).toBeNull();
  });
});
