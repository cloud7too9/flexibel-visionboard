/**
 * Kleines Routing ohne Bibliothek. Die App läuft unter /dashboard/ (Vite
 * `base`, später vom Board-Server ausgeliefert):
 *   /dashboard/                        Raster mit den Widgets
 *   /dashboard/vollbild/:instanzId     ein Widget allein, über die ganze Fläche
 *   /dashboard/anordnen?anzeige=:id    am Handy: Layout einer Anzeige anordnen (A6)
 */
import { useEffect, useState } from "react";

export type Route = { seite: "raster" } | { seite: "vollbild"; instanzId: string } | { seite: "anordnen"; anzeigeId: string | null };

const basis = () => import.meta.env.BASE_URL.replace(/\/$/, "");

/** Pfad innerhalb der App (ohne /dashboard) → Route; Unbekanntes zeigt das Raster. */
export function routeAufloesen(pfad: string, suche = ""): Route {
  if (/^\/anordnen\/?$/.test(pfad)) return { seite: "anordnen", anzeigeId: new URLSearchParams(suche).get("anzeige") };
  const m = /^\/vollbild\/([^/]+)\/?$/.exec(pfad);
  return m ? { seite: "vollbild", instanzId: decodeURIComponent(m[1]) } : { seite: "raster" };
}

export const vollbildPfad = (instanzId: string) => `/vollbild/${encodeURIComponent(instanzId)}`;

function pfadLesen(): string {
  const p = window.location.pathname;
  return p.startsWith(basis()) ? p.slice(basis().length) || "/" : p;
}

export function navigieren(pfad: string): void {
  window.history.pushState(null, "", `${basis()}${pfad}`);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

/** Aktuelle Route; folgt Zurück/Vor im Browser. */
export function useRoute(): Route {
  const [route, setRoute] = useState(() => routeAufloesen(pfadLesen(), window.location.search));
  useEffect(() => {
    const folgen = () => setRoute(routeAufloesen(pfadLesen(), window.location.search));
    window.addEventListener("popstate", folgen);
    return () => window.removeEventListener("popstate", folgen);
  }, []);
  return route;
}
