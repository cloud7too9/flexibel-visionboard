import { useEffect } from "react";
import { AppRoutes } from "./routes";
import { useBoardStore } from "../features/karten/model/board.store";
import { useWorkspaceStore } from "../features/workspace/model/workspace.store";

export function App() {
  const starten = useBoardStore((s) => s.starten);
  const modus = useBoardStore((s) => s.modus);
  const layout = useBoardStore((s) => s.layout);
  const reihenMelden = useBoardStore((s) => s.reihenMelden);
  const layoutUebernehmen = useWorkspaceStore((s) => s.layoutUebernehmen);
  const reihen = useWorkspaceStore((s) => s.reihen);
  const reihenGemessen = useWorkspaceStore((s) => s.reihenGemessen);

  // Einmal: Board suchen (sonst Beispielkarten) und Änderungen über /ws hören
  useEffect(() => starten(), [starten]);
  // Am Board zeigt das Dashboard das Layout seiner Anzeige (A6), sonst das lokale aus dem Browser
  useEffect(() => {
    if (modus === "board" && layout !== undefined) layoutUebernehmen(layout);
  }, [modus, layout, layoutUebernehmen]);
  // … und meldet, wie viele Reihen auf seinen Bildschirm passen
  useEffect(() => {
    if (modus === "board" && reihenGemessen) reihenMelden(reihen);
  }, [modus, reihen, reihenGemessen, reihenMelden]);

  return <AppRoutes />;
}
