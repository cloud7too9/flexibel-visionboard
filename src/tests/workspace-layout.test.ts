import { describe, expect, it } from "vitest";
import {
  cellSize,
  cellToPixel,
  clampItemToGrid,
  findFreePosition,
  fitItemsToRows,
  pixelToCell,
  rectsOverlap,
} from "../features/workspace/lib/layout-utils";
import { hasCollision } from "../features/workspace/lib/collision-utils";
import type { LayoutItem } from "../features/workspace/model/workspace.types";

const config = { cols: 96, rows: 48, gap: 8, containerWidth: 1440, containerHeight: 720 };

const mkItem = (overrides: Partial<LayoutItem>): LayoutItem => ({
  id: "x",
  panelTyp: "schnellnotiz",
  titel: "x",
  x: 0,
  y: 0,
  w: 12,
  h: 6,
  ...overrides,
});

describe("cellSize", () => {
  it("divides the container evenly into cols × rows", () => {
    expect(cellSize(config)).toEqual({ w: 15, h: 15 });
  });

  it("is zero for an unmeasured container", () => {
    expect(cellSize({ ...config, containerWidth: 0, containerHeight: 0 })).toEqual({ w: 0, h: 0 });
  });
});

describe("cellToPixel", () => {
  it("insets by half the gap so widget edges sit on grid lines", () => {
    expect(cellToPixel(0, 0, 1, 1, config)).toEqual({ left: 4, top: 4, width: 7, height: 7 });
  });

  it("spans multiple cells", () => {
    const rect = cellToPixel(10, 4, 24, 16, config);
    expect(rect).toEqual({ left: 154, top: 64, width: 352, height: 232 });
  });

  it("fills the whole area for a full-size item", () => {
    const rect = cellToPixel(0, 0, 96, 48, config);
    expect(rect.left + rect.width + 4).toBe(1440);
    expect(rect.top + rect.height + 4).toBe(720);
  });
});

describe("pixelToCell", () => {
  it("rounds to the nearest cell", () => {
    expect(pixelToCell(152, 68, config)).toEqual({ x: 10, y: 5 });
  });

  it("clamps into the area", () => {
    expect(pixelToCell(999999, 999999, config)).toEqual({ x: 95, y: 47 });
    expect(pixelToCell(-50, -50, config)).toEqual({ x: 0, y: 0 });
  });
});

describe("clampItemToGrid", () => {
  it("keeps items inside horizontally and vertically", () => {
    const clamped = clampItemToGrid(mkItem({ x: 90, y: 45, w: 12, h: 6 }), 96, 48);
    expect(clamped).toMatchObject({ x: 84, y: 42, w: 12, h: 6 });
  });

  it("truncates items larger than the area", () => {
    const clamped = clampItemToGrid(mkItem({ w: 200, h: 100 }), 96, 48);
    expect(clamped).toMatchObject({ x: 0, y: 0, w: 96, h: 48 });
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
    expect(findFreePosition([], 12, 6, 96, 48)).toEqual({ x: 0, y: 0 });
  });

  it("finds a spot right next to an existing item", () => {
    expect(findFreePosition([mkItem({ w: 12 })], 12, 6, 96, 48)).toEqual({ x: 12, y: 0 });
  });

  it("returns null when the area is full", () => {
    const full = [mkItem({ w: 96, h: 48 })];
    expect(findFreePosition(full, 1, 1, 96, 48)).toBeNull();
  });

  it("returns null when the item is larger than the area", () => {
    expect(findFreePosition([], 97, 1, 96, 48)).toBeNull();
  });
});

describe("fitItemsToRows", () => {
  it("leaves items untouched when they fit", () => {
    const items = [mkItem({ y: 0, h: 20 }), mkItem({ id: "b", y: 20, h: 20 })];
    expect(fitItemsToRows(items, 48)).toBe(items);
  });

  it("compresses stacked items into the available rows without overlap", () => {
    const items = Array.from({ length: 6 }, (_, i) => mkItem({ id: `i${i}`, y: i * 16, h: 16 }));
    const fitted = fitItemsToRows(items, 48);
    expect(Math.max(...fitted.map((i) => i.y + i.h))).toBeLessThanOrEqual(48);
    for (let i = 0; i < fitted.length; i++) {
      for (let j = i + 1; j < fitted.length; j++) {
        expect(rectsOverlap(fitted[i], fitted[j])).toBe(false);
      }
    }
    expect(fitted.map((i) => i.h)).toEqual([8, 8, 8, 8, 8, 8]);
  });
});
