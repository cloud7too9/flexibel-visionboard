import { describe, expect, it } from "vitest";
import {
  BREAKPOINTS,
  breakpointForWidth,
  getBreakpoint,
  CANONICAL_BREAKPOINT,
} from "../features/workspace/model/breakpoints";
import { DEFAULT_LAYOUT } from "../features/workspace/model/default-layout";

describe("breakpointForWidth", () => {
  it("maps typical device widths to the expected breakpoint", () => {
    expect(breakpointForWidth(320).name).toBe("mobile");
    expect(breakpointForWidth(375).name).toBe("mobile");
    expect(breakpointForWidth(639).name).toBe("mobile");
    expect(breakpointForWidth(640).name).toBe("tablet");
    expect(breakpointForWidth(768).name).toBe("tablet");
    expect(breakpointForWidth(1023).name).toBe("tablet");
    expect(breakpointForWidth(1024).name).toBe("desktop");
    expect(breakpointForWidth(1920).name).toBe("desktop");
  });

  it("falls back to the smallest breakpoint for degenerate widths", () => {
    expect(breakpointForWidth(0).name).toBe("mobile");
    expect(breakpointForWidth(-10).name).toBe("mobile");
  });
});

describe("BREAKPOINTS", () => {
  it("is sorted by minWidth ascending with strictly increasing column counts", () => {
    for (let i = 1; i < BREAKPOINTS.length; i++) {
      expect(BREAKPOINTS[i].minWidth).toBeGreaterThan(BREAKPOINTS[i - 1].minWidth);
      expect(BREAKPOINTS[i].spalten).toBeGreaterThan(BREAKPOINTS[i - 1].spalten);
    }
  });

  it("uses the default layout's column count as the canonical grid", () => {
    const canonical = getBreakpoint(CANONICAL_BREAKPOINT);
    expect(canonical.spalten).toBe(DEFAULT_LAYOUT.spalten);
    expect(canonical.erlaubtAnordnen).toBe(true);
  });
});
