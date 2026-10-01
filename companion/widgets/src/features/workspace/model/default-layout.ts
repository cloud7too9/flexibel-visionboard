import type { WorkspaceLayout } from "./workspace.types";

/**
 * Start-Layer im Raster mit 32 Spalten, alle Widgets in ihrer Standardstufe
 * „mittel“. Er passt in 18 Reihen, also auch auf einen 16:9-Bildschirm.
 */
export const DEFAULT_LAYOUT: WorkspaceLayout = {
  id: "workspace-default",
  name: "Start",
  items: [
    { id: "panel-schnellnotiz", panelTyp: "schnellnotiz", stufe: "mittel", titel: "Schnellnotiz", x: 0, y: 0, w: 8, h: 6 },
    { id: "panel-aufgaben", panelTyp: "aufgaben", stufe: "mittel", titel: "Aufgaben", x: 8, y: 0, w: 8, h: 6 },
    { id: "panel-projektstatus", panelTyp: "projektstatus", stufe: "mittel", titel: "Projektstatus", x: 16, y: 0, w: 10, h: 6 },
    { id: "panel-toolstart", panelTyp: "toolstart", stufe: "mittel", titel: "Tool-Start", x: 26, y: 0, w: 6, h: 6 },
    { id: "panel-dateien", panelTyp: "dateien", stufe: "mittel", titel: "Dateien", x: 0, y: 6, w: 10, h: 6 },
    { id: "panel-letzteInhalte", panelTyp: "letzteInhalte", stufe: "mittel", titel: "Letzte Inhalte", x: 10, y: 6, w: 10, h: 6 },
  ],
};
