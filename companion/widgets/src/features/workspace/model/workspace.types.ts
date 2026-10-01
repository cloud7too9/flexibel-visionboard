import type { Id } from "../../../shared/types/common.types";
import type { WidgetVertrag } from "./widget-vertrag";

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
  /** Name der Größenstufe aus dem Vertrag des Widgets; w und h folgen daraus. */
  stufe: string;
  x: number;
  y: number;
  w: number;
  h: number;
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

/** Eintrag im Register: Titel und Größen-Vertrag (ersetzt die freien Maße von MainHub). */
export interface PanelDefinition {
  typ: PanelTyp;
  standardTitel: string;
  vertrag: WidgetVertrag;
}

export type EditMode = "normal" | "edit";
