import { useEffect } from "react";
import { AppRoutes } from "./routes";
import { useBoardStore } from "../features/karten/model/board.store";

export function App() {
  const starten = useBoardStore((s) => s.starten);
  // Einmal: Board suchen (sonst Beispielkarten) und Änderungen über /ws hören
  useEffect(() => starten(), [starten]);
  return <AppRoutes />;
}
