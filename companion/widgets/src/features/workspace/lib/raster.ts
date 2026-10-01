/**
 * Raster des Dashboards (planung/bauplaene/Bauplan-Raster-32-Spalten.md):
 * 32 Spalten auf jedem Gerät, quadratische Zellen, die Zahl der Reihen ergibt
 * sich aus der Höhe der Fläche. Kein Widget kennt die Zahl 32 hart – alles
 * liest `RASTER_SPALTEN`. Positionen und Größen stehen immer in Zellen,
 * Pixel entstehen erst beim Zeichnen.
 */
import { useLayoutEffect, useState } from "react";

export const RASTER_SPALTEN = 32;

/** Reihen, bis die Fläche gemessen ist (16:9 wie ein Fernseher). */
export const STANDARD_REIHEN = 18;

export interface Raster {
  spalten: typeof RASTER_SPALTEN;
  reihen: number;
  /** Kantenlänge einer quadratischen Zelle in Pixeln. */
  zellePx: number;
}

/**
 * `zellePx = breite / 32`, `reihen = floor(hoehe / zellePx)`. Was unter der
 * letzten vollen Reihe übrig bleibt, bleibt leer.
 */
export function rasterBerechnen(breite: number, hoehe: number): Raster {
  const zellePx = breite > 0 ? breite / RASTER_SPALTEN : 0;
  // kleine Toleranz gegen Rundungsfehler (1080 / 60 darf nicht 17,999… werden)
  const reihen = zellePx > 0 && hoehe > 0 ? Math.floor(hoehe / zellePx + 1e-9) : 0;
  return { spalten: RASTER_SPALTEN, reihen, zellePx };
}

/**
 * Feste Reihen, z. B. beim Anordnen am Handy: Die Fläche ist die einer anderen
 * Anzeige (32 × `reihen`), die Zelle wird so groß, dass sie in Breite und Höhe passt.
 */
export function rasterMitReihen(breite: number, hoehe: number, reihen: number): Raster {
  const zellePx = breite > 0 && hoehe > 0 && reihen > 0 ? Math.min(breite / RASTER_SPALTEN, hoehe / reihen) : 0;
  return { spalten: RASTER_SPALTEN, reihen: zellePx > 0 ? reihen : 0, zellePx };
}

/**
 * Abstand zwischen Widgets: wächst mit der Zelle (am Handy ist eine Zelle
 * nur gut 12 px breit, am Fernseher 60 px). Er wird innerhalb der Zelle
 * abgezogen, damit die Zelle selbst quadratisch bleibt.
 */
export function abstandPx(zellePx: number): number {
  return Math.min(10, Math.max(2, Math.round(zellePx * 0.15)));
}

/**
 * Raster einer Fläche, neu berechnet bei jeder Größenänderung (ResizeObserver).
 * Mit `festeReihen` zeigt die Fläche die Reihen einer anderen Anzeige (`rasterMitReihen`).
 */
export function useRaster(element: HTMLElement | null, festeReihen?: number): Raster {
  const [raster, setRaster] = useState<Raster>(() => rasterBerechnen(0, 0));
  useLayoutEffect(() => {
    if (!element) return;
    const messen = () => {
      const neu = festeReihen
        ? rasterMitReihen(element.clientWidth, element.clientHeight, festeReihen)
        : rasterBerechnen(element.clientWidth, element.clientHeight);
      setRaster((alt) => (alt.reihen === neu.reihen && alt.zellePx === neu.zellePx ? alt : neu));
    };
    messen();
    const beobachter = new ResizeObserver(messen);
    beobachter.observe(element);
    return () => beobachter.disconnect();
  }, [element, festeReihen]);
  return raster;
}
