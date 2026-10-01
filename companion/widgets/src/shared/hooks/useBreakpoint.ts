import { useEffect, useState } from "react";
import {
  BREAKPOINTS,
  breakpointForWidth,
  type BreakpointDefinition,
} from "../../features/workspace/model/breakpoints";

function currentWidth(): number {
  if (typeof window === "undefined") return BREAKPOINTS[BREAKPOINTS.length - 1].minWidth;
  return window.innerWidth;
}

/**
 * Liefert den aktiven Breakpoint anhand der Viewport-Breite und aktualisiert
 * sich, sobald eine Breakpoint-Grenze überschritten wird.
 *
 * Verwendet `matchMedia`, sodass nur bei tatsächlichen Wechseln neu gerendert
 * wird und nicht bei jedem Resize-Pixel.
 */
export function useBreakpoint(): BreakpointDefinition {
  const [breakpoint, setBreakpoint] = useState<BreakpointDefinition>(() =>
    breakpointForWidth(currentWidth()),
  );

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const update = () => setBreakpoint(breakpointForWidth(window.innerWidth));

    const queries = BREAKPOINTS.filter((bp) => bp.minWidth > 0).map((bp) =>
      window.matchMedia(`(min-width: ${bp.minWidth}px)`),
    );
    queries.forEach((q) => q.addEventListener("change", update));
    update();

    return () => queries.forEach((q) => q.removeEventListener("change", update));
  }, []);

  return breakpoint;
}
