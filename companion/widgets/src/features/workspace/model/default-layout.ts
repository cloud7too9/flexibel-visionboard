import type { WorkspaceLayout } from "./workspace.types";

/** Start-Layer im Raster mit 32 Spalten; passt in 18 Reihen (16:9). */
export const DEFAULT_LAYOUT: WorkspaceLayout = {
  id: "workspace-default",
  name: "Start",
  instanzen: [
    { id: "w-gesamtkarte", typ: "karte.gesamtkarte", stufe: "standard", x: 0, y: 0 },
    { id: "w-portale", typ: "portale.verbindungen", stufe: "standard", x: 12, y: 0 },
    { id: "w-sammelstatus", typ: "sammelobjekte.status", stufe: "standard", x: 22, y: 0 },
    { id: "w-sammelobjekte", typ: "sammelobjekte.gesamtauflistung", stufe: "standard", x: 0, y: 8 },
  ],
};
