import type { ComponentType } from "react";
import type { PanelDefinition, PanelTyp } from "./workspace.types";
import { vertragRegistrieren, type Groessenstufe } from "./widget-vertrag";
import { SchnellnotizPanel } from "../panels/SchnellnotizPanel";
import { AufgabenPanel } from "../panels/AufgabenPanel";
import { DateienPanel } from "../panels/DateienPanel";
import { ProjektstatusPanel } from "../panels/ProjektstatusPanel";
import { ToolStartPanel } from "../panels/ToolStartPanel";
import { LetzteInhaltePanel } from "../panels/LetzteInhaltePanel";

/* Die MainHub-Beispiel-Panels bleiben Platzhalter, bis das Companion-Register
   sie ersetzt (Phase A4). Ihre Stufen sind vorläufig; die echten Größen je
   Widget legt die Planungsrunde A7 fest. */
const stufe = (name: string, breite: number, hoehe: number, informationsumfang: string): Groessenstufe =>
  ({ name, breite, hoehe, informationsumfang });

function eintrag(typ: PanelTyp, standardTitel: string, stufen: Groessenstufe[], vollbild = false): PanelDefinition {
  const mindest = { breite: Math.min(...stufen.map((s) => s.breite)), hoehe: Math.min(...stufen.map((s) => s.hoehe)) };
  const maximal = { breite: Math.max(...stufen.map((s) => s.breite)), hoehe: Math.max(...stufen.map((s) => s.hoehe)) };
  return { typ, standardTitel, vertrag: vertragRegistrieren(typ, { stufen, mindest, maximal, vollbild }) };
}

/** Größen in Rasterzellen (32 Spalten, quadratische Zellen); die erste Stufe ist die Standardstufe. */
export const PANEL_REGISTRY: Record<PanelTyp, PanelDefinition> = {
  schnellnotiz: eintrag("schnellnotiz", "Schnellnotiz", [
    stufe("mittel", 8, 6, "Notiz mit Eingabe"), stufe("klein", 6, 4, "Anfang der Notiz"), stufe("groß", 12, 8, "ganze Notiz")]),
  aufgaben: eintrag("aufgaben", "Aufgaben", [
    stufe("mittel", 8, 6, "offene Aufgaben"), stufe("klein", 6, 4, "nächste Aufgabe"), stufe("groß", 10, 9, "alle Aufgaben")]),
  dateien: eintrag("dateien", "Dateien", [
    stufe("mittel", 10, 6, "letzte Dateien"), stufe("groß", 12, 8, "Dateien mit Größe")]),
  projektstatus: eintrag("projektstatus", "Projektstatus", [
    stufe("mittel", 10, 6, "Zahlen und Fortschritt"), stufe("klein", 6, 4, "Fortschritt")], true),
  toolstart: eintrag("toolstart", "Tool-Start", [
    stufe("mittel", 6, 6, "vier Tools"), stufe("klein", 6, 4, "zwei Tools")]),
  letzteInhalte: eintrag("letzteInhalte", "Letzte Inhalte", [
    stufe("mittel", 10, 6, "letzte Inhalte"), stufe("groß", 12, 9, "mit Zeitangaben")], true),
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
