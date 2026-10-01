import type { Id } from "../../../shared/types/common.types";

export type PanelTyp =
  | "schnellnotiz"
  | "aufgaben"
  | "dateien"
  | "projektstatus"
  | "toolstart"
  | "letzteInhalte";

export interface LayoutItem {
  id: Id;
  panelTyp: PanelTyp;
  titel: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

/**
 * Ein Layer ist eine eigenständige Widget-Anordnung. Der Workspace besteht
 * aus einem oder mehreren Layern, von denen genau einer aktiv angezeigt wird.
 * Positionen und Größen der Items stehen in Zellen des Rasters (32 Spalten,
 * Reihen je nach Fläche, siehe lib/raster.ts).
 */
export interface WorkspaceLayout {
  id: Id;
  name: string;
  items: LayoutItem[];
}

/** Persistierter Zustand des gesamten Workspace. */
export interface WorkspaceData {
  layers: WorkspaceLayout[];
  activeLayerId: Id;
}

export interface PanelDefinition {
  typ: PanelTyp;
  standardTitel: string;
  standardBreite: number;
  standardHoehe: number;
  minBreite: number;
  minHoehe: number;
  erlaubtResize: boolean;
}

export type EditMode = "normal" | "edit";
