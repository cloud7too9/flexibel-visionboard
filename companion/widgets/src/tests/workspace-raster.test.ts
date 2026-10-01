import { describe, expect, it } from "vitest";
import { RASTER_SPALTEN, abstandPx, rasterBerechnen } from "@/features/workspace/lib/raster";

describe("Raster: 32 Spalten, quadratische Zellen", () => {
  it.each([
    ["16:9 Fernseher, Laptop", 1920, 1080, 18, 60],
    ["16:10 Laptop", 1440, 900, 20, 45],
    ["16:11 iPad 11 Zoll", 1180, 820, 22, 36.875],
    ["4:3 iPad 13 Zoll", 1024, 768, 24, 32],
  ])("%s: %i × %i → %i Reihen", (_name, breite, hoehe, reihen, zellePx) => {
    expect(rasterBerechnen(breite, hoehe)).toEqual({ spalten: 32, reihen, zellePx });
  });

  it("Spaltenzahl ist auf jedem Gerät gleich, nur die Reihen ändern sich", () => {
    expect(RASTER_SPALTEN).toBe(32);
    const handyQuer = rasterBerechnen(844, 390);
    expect(handyQuer.spalten).toBe(32);
    expect(handyQuer.reihen).toBe(14);
    expect(rasterBerechnen(390, 844).reihen).toBe(69);
  });

  it("Restfläche unter der letzten vollen Reihe bleibt leer (floor)", () => {
    expect(rasterBerechnen(1920, 1139).reihen).toBe(18);
    expect(rasterBerechnen(1920, 1140).reihen).toBe(19);
  });

  it("ohne gemessene Fläche: keine Reihen", () => {
    expect(rasterBerechnen(0, 0)).toEqual({ spalten: 32, reihen: 0, zellePx: 0 });
    expect(rasterBerechnen(1920, 0).reihen).toBe(0);
  });

  it("Abstand wächst mit der Zelle, bleibt aber zwischen 2 und 10 px", () => {
    expect(abstandPx(60)).toBe(9);
    expect(abstandPx(12)).toBe(2);
    expect(abstandPx(200)).toBe(10);
  });
});
