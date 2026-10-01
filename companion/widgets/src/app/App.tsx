import { useEffect } from "react";
import { useBoardStore } from "../features/karten/model/board.store";
import { useWorkspaceStore } from "../features/workspace/model/workspace.store";
import { WorkspacePage } from "../pages/WorkspacePage";
import { VollbildPage } from "../pages/VollbildPage";
import { AnordnenPage } from "../pages/AnordnenPage";
import { navigieren, useRoute, vollbildPfad, type Route } from "./navigation";

export function App() {
  const route = useRoute();
  // Am Handy: Layout einer Anzeige anordnen (A6). Sonst ist dieses Gerät eine Anzeige.
  return route.seite === "anordnen" ? <AnordnenPage anzeigeId={route.anzeigeId} /> : <Anzeige route={route} />;
}

function Anzeige({ route }: { route: Exclude<Route, { seite: "anordnen" }> }) {
  const starten = useBoardStore((s) => s.starten);
  const modus = useBoardStore((s) => s.modus);
  const layout = useBoardStore((s) => s.layout);
  const vollbild = useBoardStore((s) => s.vollbild);
  const reihenMelden = useBoardStore((s) => s.reihenMelden);
  const layoutUebernehmen = useWorkspaceStore((s) => s.layoutUebernehmen);
  const nurAnzeige = useWorkspaceStore((s) => s.nurAnzeige);
  const reihen = useWorkspaceStore((s) => s.reihen);
  const reihenGemessen = useWorkspaceStore((s) => s.reihenGemessen);

  // Einmal: Board suchen (sonst Beispielkarten) und Änderungen über /ws hören
  useEffect(() => starten(), [starten]);
  // Am Board zeigt das Dashboard das Layout seiner Anzeige (A6), sonst das lokale aus dem Browser
  useEffect(() => {
    if (modus === "board" && layout !== undefined) layoutUebernehmen(layout);
  }, [modus, layout, layoutUebernehmen]);
  // … meldet, wie viele Reihen auf seinen Bildschirm passen
  useEffect(() => {
    if (modus === "board" && reihenGemessen) reihenMelden(reihen);
  }, [modus, reihen, reihenGemessen, reihenMelden]);
  // … und zeigt das Vollbild, das das Handy startet und beendet
  useEffect(() => {
    if (modus !== "board" || !nurAnzeige) return;
    if (vollbild && !(route.seite === "vollbild" && route.instanzId === vollbild)) navigieren(vollbildPfad(vollbild));
    else if (!vollbild && route.seite === "vollbild") navigieren("/");
  }, [modus, nurAnzeige, vollbild, route]);

  return route.seite === "vollbild" ? <VollbildPage instanzId={route.instanzId} /> : <WorkspacePage />;
}
