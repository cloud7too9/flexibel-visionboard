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
 */
export interface WorkspaceLayout {
  id: Id;
  name: string;
  spalten: number;
  zeilenHoehe: number;
  abstand: number;
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

export interface AllowedSize {
  w: number;
  h: number;
}

export const ALLOWED_SIZES: AllowedSize[] = [
  { w: 1, h: 1 },
  { w: 2, h: 1 },
  { w: 2, h: 2 },
  { w: 3, h: 2 },
  { w: 4, h: 2 },
  { w: 4, h: 3 },
  { w: 6, h: 3 },
];

export type EditMode = "normal" | "edit";
