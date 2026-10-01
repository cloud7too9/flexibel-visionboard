import type { ComponentType } from "react";
import type { PanelDefinition, PanelTyp } from "./workspace.types";
import { SchnellnotizPanel } from "../panels/SchnellnotizPanel";
import { AufgabenPanel } from "../panels/AufgabenPanel";
import { DateienPanel } from "../panels/DateienPanel";
import { ProjektstatusPanel } from "../panels/ProjektstatusPanel";
import { ToolStartPanel } from "../panels/ToolStartPanel";
import { LetzteInhaltePanel } from "../panels/LetzteInhaltePanel";

/** Größen in Rasterzellen des Desktop-Rasters (96 × 48). */
export const PANEL_REGISTRY: Record<PanelTyp, PanelDefinition> = {
  schnellnotiz: {
    typ: "schnellnotiz",
    standardTitel: "Schnellnotiz",
    standardBreite: 24,
    standardHoehe: 16,
    minBreite: 12,
    minHoehe: 6,
    erlaubtResize: true,
  },
  aufgaben: {
    typ: "aufgaben",
    standardTitel: "Aufgaben",
    standardBreite: 24,
    standardHoehe: 16,
    minBreite: 12,
    minHoehe: 8,
    erlaubtResize: true,
  },
  dateien: {
    typ: "dateien",
    standardTitel: "Dateien",
    standardBreite: 32,
    standardHoehe: 16,
    minBreite: 12,
    minHoehe: 6,
    erlaubtResize: true,
  },
  projektstatus: {
    typ: "projektstatus",
    standardTitel: "Projektstatus",
    standardBreite: 32,
    standardHoehe: 16,
    minBreite: 12,
    minHoehe: 6,
    erlaubtResize: true,
  },
  toolstart: {
    typ: "toolstart",
    standardTitel: "Tool-Start",
    standardBreite: 16,
    standardHoehe: 16,
    minBreite: 12,
    minHoehe: 6,
    erlaubtResize: true,
  },
  letzteInhalte: {
    typ: "letzteInhalte",
    standardTitel: "Letzte Inhalte",
    standardBreite: 32,
    standardHoehe: 16,
    minBreite: 12,
    minHoehe: 6,
    erlaubtResize: true,
  },
};

export const PANEL_COMPONENTS: Record<PanelTyp, ComponentType> = {
  schnellnotiz: SchnellnotizPanel,
  aufgaben: AufgabenPanel,
  dateien: DateienPanel,
  projektstatus: ProjektstatusPanel,
  toolstart: ToolStartPanel,
  letzteInhalte: LetzteInhaltePanel,
};

export const PANEL_TYPEN: PanelTyp[] = Object.keys(PANEL_REGISTRY) as PanelTyp[];
