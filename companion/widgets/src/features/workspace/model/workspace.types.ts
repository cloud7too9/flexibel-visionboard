import type { Id } from "../../../shared/types/common.types";
import type { WidgetInstanz } from "./widget-struktur";

/**
 * Ein Layer ist eine eigenständige Widget-Anordnung. Der Workspace besteht
 * aus einem oder mehreren Layern, von denen genau einer aktiv angezeigt wird.
 * Positionen stehen in Zellen des Rasters (32 Spalten, Reihen je nach Fläche,
 * siehe lib/raster.ts), die Größe folgt aus der Stufe der Instanz.
 */
export interface WorkspaceLayout {
  id: Id;
  name: string;
  instanzen: WidgetInstanz[];
}

/** Persistierter Zustand des gesamten Workspace. */
export interface WorkspaceData {
  layers: WorkspaceLayout[];
  activeLayerId: Id;
}

export type EditMode = "normal" | "edit";
