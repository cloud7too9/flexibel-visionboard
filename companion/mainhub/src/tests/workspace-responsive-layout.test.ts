import { describe, expect, it } from "vitest";
import {
  adaptLayoutToBreakpoint,
  reflowItems,
} from "../features/workspace/lib/responsive-layout";
import { getBreakpoint } from "../features/workspace/model/breakpoints";
import { DEFAULT_LAYOUT } from "../features/workspace/model/default-layout";
import type { LayoutItem } from "../features/workspace/model/workspace.types";
import { rectsOverlap } from "../features/workspace/lib/layout-utils";

const mkItem = (overrides: Partial<LayoutItem>): LayoutItem => ({
  id: "x",
  panelTyp: "schnellnotiz",
  titel: "x",
  x: 0,
  y: 0,
  w: 2,
  h: 2,
  ...overrides,
});

function expectNoOverlaps(items: LayoutItem[]) {
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      expect(rectsOverlap(items[i], items[j])).toBe(false);
    }
  }
}

function expectWithinGrid(items: LayoutItem[], cols: number, rows = Infinity) {
  for (const it of items) {
    expect(it.x).toBeGreaterThanOrEqual(0);
    expect(it.y).toBeGreaterThanOrEqual(0);
    expect(it.w).toBeGreaterThanOrEqual(1);
    expect(it.h).toBeGreaterThanOrEqual(1);
    expect(it.x + it.w).toBeLessThanOrEqual(cols);
    expect(it.y + it.h).toBeLessThanOrEqual(rows);
  }
}

describe("reflowItems", () => {
  it("keeps non-overlapping items in a valid grid", () => {
    const items = [
      mkItem({ id: "a", x: 0, y: 0, w: 2, h: 2 }),
      mkItem({ id: "b", x: 2, y: 0, w: 2, h: 2 }),
    ];
    const out = reflowItems(items, 4);
    expectNoOverlaps(out);
    expectWithinGrid(out, 4);
  });

  it("resolves overlaps created by shrinking the grid", () => {
    const items = [
      mkItem({ id: "a", x: 0, y: 0, w: 2, h: 1 }),
      mkItem({ id: "b", x: 0, y: 0, w: 2, h: 1 }),
      mkItem({ id: "c", x: 0, y: 0, w: 2, h: 1 }),
    ];
    const out = reflowItems(items, 2);
    expectNoOverlaps(out);
    expectWithinGrid(out, 2);
    expect(out.map((i) => i.y)).toEqual([0, 1, 2]);
  });

  it("preserves reading order (row-major)", () => {
    const items = [
      mkItem({ id: "bottom", x: 0, y: 2, w: 2, h: 1 }),
      mkItem({ id: "topRight", x: 4, y: 0, w: 2, h: 1 }),
      mkItem({ id: "topLeft", x: 0, y: 0, w: 2, h: 1 }),
    ];
    const out = reflowItems(items, 2);
    expect(out.map((i) => i.id)).toEqual(["topLeft", "topRight", "bottom"]);
    expect(out.map((i) => i.y)).toEqual([0, 1, 2]);
  });

  it("clamps items wider than the grid to full width", () => {
    const out = reflowItems([mkItem({ id: "a", w: 8 })], 2);
    expect(out[0].w).toBe(2);
    expect(out[0].x).toBe(0);
  });
});

describe("adaptLayoutToBreakpoint", () => {
  it("returns the canonical layout unchanged on desktop (only spacing applied)", () => {
    const desktop = getBreakpoint("desktop");
    const out = adaptLayoutToBreakpoint(DEFAULT_LAYOUT, desktop);
    expect(out.spalten).toBe(DEFAULT_LAYOUT.spalten);
    expect(out.zeilen).toBe(DEFAULT_LAYOUT.zeilen);
    expect(out.items).toEqual(DEFAULT_LAYOUT.items);
    expect(out.abstand).toBe(desktop.abstand);
  });

  it("does not mutate the input layout", () => {
    const snapshot = JSON.stringify(DEFAULT_LAYOUT);
    adaptLayoutToBreakpoint(DEFAULT_LAYOUT, getBreakpoint("mobile"));
    adaptLayoutToBreakpoint(DEFAULT_LAYOUT, getBreakpoint("tablet"));
    expect(JSON.stringify(DEFAULT_LAYOUT)).toBe(snapshot);
  });

  it("produces a valid tablet layout that fits the area", () => {
    const tablet = getBreakpoint("tablet");
    const out = adaptLayoutToBreakpoint(DEFAULT_LAYOUT, tablet);
    expect(out.spalten).toBe(tablet.spalten);
    expect(out.zeilen).toBe(tablet.zeilen);
    expect(out.items.length).toBe(DEFAULT_LAYOUT.items.length);
    expectNoOverlaps(out.items);
    expectWithinGrid(out.items, tablet.spalten, tablet.zeilen);
    for (const it of out.items) expect(it.w).toBeGreaterThanOrEqual(tablet.minWidgetSpalten);
  });

  it("stacks widgets full-width on mobile and fits them into the height", () => {
    const mobile = getBreakpoint("mobile");
    const out = adaptLayoutToBreakpoint(DEFAULT_LAYOUT, mobile);
    expect(out.items.length).toBe(DEFAULT_LAYOUT.items.length);
    expectNoOverlaps(out.items);
    expectWithinGrid(out.items, mobile.spalten, mobile.zeilen);
    for (const it of out.items) {
      expect(it.w).toBe(mobile.spalten);
      expect(it.x).toBe(0);
    }
    expect(out.items.map((i) => i.id)).toEqual([
      "panel-schnellnotiz",
      "panel-aufgaben",
      "panel-projektstatus",
      "panel-toolstart",
      "panel-dateien",
      "panel-letzteInhalte",
    ]);
  });

  it("keeps ids, titles and types intact", () => {
    const out = adaptLayoutToBreakpoint(DEFAULT_LAYOUT, getBreakpoint("tablet"));
    for (const original of DEFAULT_LAYOUT.items) {
      const adapted = out.items.find((i) => i.id === original.id);
      expect(adapted).toBeDefined();
      expect(adapted!.titel).toBe(original.titel);
      expect(adapted!.panelTyp).toBe(original.panelTyp);
    }
  });
});
