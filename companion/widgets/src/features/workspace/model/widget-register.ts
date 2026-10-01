/**
 * Register aller Widget-Typen der Companion (planung/bauplaene/Bauplan-Widget-Inhalte.md).
 * Typ-IDs bleiben stabil: Eine spätere Zusammenlegung (Kandidat „Einzeleintrag“)
 * darf gespeicherte Instanzen nicht brechen.
 *
 * Phase A3: die Typen ohne Quelle. Die Typen mit Quelle (mehrfach, z. B. einzelne
 * Koordinate, Banner, Rüstungs-Set) kommen mit Phase A4 dazu. Die Stufen sind
 * Platzhalter, bis die Planungsrunde A7 die Größen festlegt.
 */
import { vertragRegistrieren, stufeVon, type Groessenstufe } from "./widget-vertrag";
import { BEREICHE, type BereichId, type WidgetInstanz, type WidgetTyp } from "./widget-struktur";
import type { Rect } from "../lib/layout-utils";

const stufe = (name: string, breite: number, hoehe: number, informationsumfang: string): Groessenstufe =>
  ({ name, breite, hoehe, informationsumfang });

function typ(id: string, bereich: BereichId, name: string, stufen: Groessenstufe[],
  extra: Pick<WidgetTyp, "zusatzinhalte"> & { vollbild?: boolean } = {}): WidgetTyp {
  const mindest = { breite: Math.min(...stufen.map((s) => s.breite)), hoehe: Math.min(...stufen.map((s) => s.hoehe)) };
  const maximal = { breite: Math.max(...stufen.map((s) => s.breite)), hoehe: Math.max(...stufen.map((s) => s.hoehe)) };
  if (!BEREICHE.some((b) => b.id === bereich)) throw new Error(`Widget „${id}“: unbekannter Bereich ${bereich}`);
  return { id, bereich, name, vertrag: vertragRegistrieren(id, { stufen, mindest, maximal, vollbild: extra.vollbild }), zusatzinhalte: extra.zusatzinhalte };
}

export const WIDGET_TYPEN: readonly WidgetTyp[] = [
  typ("karte.gesamtkarte", "karte", "Gesamtkarte", [stufe("standard", 12, 8, "Karte mit Markern, ausrichtbar auf Punkt oder Koordinate")], { vollbild: true }),
  typ("sammelobjekte.gesamtauflistung", "sammelobjekte", "Alle Sammelobjekte", [stufe("standard", 8, 8, "alle Sammelobjekte mit Stand")]),
  typ("sammelobjekte.status", "sammelobjekte", "Sammel-Fortschritt", [stufe("standard", 4, 3, "Fortschritt als Kennzahl")]),
  typ("portale.verbindungen", "portale", "Portalverbindungen",
    [stufe("standard", 10, 6, "alle Verbindungen Oberwelt ↔ Nether mit Koordinaten"), stufe("groß", 12, 9, "Verbindungen und Tipps")],
    { zusatzinhalte: [{ abStufe: "groß", inhalt: "Tipps: Mindestabstand zwischen Portalen je Dimension" }], vollbild: true }),
];

const NACH_ID = new Map(WIDGET_TYPEN.map((t) => [t.id, t]));
if (NACH_ID.size !== WIDGET_TYPEN.length) throw new Error("Widget-Typ-IDs müssen eindeutig sein");

export const widgetTyp = (id: string): WidgetTyp | undefined => NACH_ID.get(id);

/** Größe einer Instanz aus ihrer Stufe → Rechteck in Zellen (unbekannter Typ: null) */
export function instanzRect(i: WidgetInstanz): (Rect & { id: string }) | null {
  const t = NACH_ID.get(i.typ);
  if (!t) return null;
  const s = stufeVon(t.vertrag, i.stufe);
  return { id: i.id, x: i.x, y: i.y, w: s.breite, h: s.hoehe };
}

/** Rechtecke aller Instanzen mit bekanntem Typ */
export const instanzRects = (instanzen: WidgetInstanz[]) =>
  instanzen.map(instanzRect).filter((r): r is Rect & { id: string } => r !== null);
