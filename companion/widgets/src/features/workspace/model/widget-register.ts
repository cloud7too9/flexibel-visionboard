/**
 * Register aller Widget-Typen der Companion (planung/bauplaene/Bauplan-Widget-Inhalte.md).
 * Typ-IDs bleiben stabil: Eine spätere Zusammenlegung (Kandidat „Einzeleintrag“)
 * darf gespeicherte Instanzen nicht brechen.
 *
 * Typen mit Quelle sind mehrfach: Jede Instanz zeigt ihre eigene Koordinate,
 * ihr Banner, ihr Set … Die Stufen sind Platzhalter, bis die Planungsrunde A7 die
 * Größen festlegt.
 */
import { vertragRegistrieren, stufeVon, type Groessenstufe } from "./widget-vertrag";
import { BEREICHE, type BereichId, type WidgetInstanz, type WidgetTyp } from "./widget-struktur";
import type { Rect } from "../lib/layout-utils";

const stufe = (name: string, breite: number, hoehe: number, informationsumfang: string): Groessenstufe =>
  ({ name, breite, hoehe, informationsumfang });

type Extra = Pick<WidgetTyp, "zusatzinhalte" | "optional" | "quelle"> & { vollbild?: boolean };

/** Typ registrieren; mit `quelle` ist er mehrfach (jede Instanz mit eigener Quelle) */
function typ(id: string, bereich: BereichId, name: string, stufen: Groessenstufe[], extra: Extra = {}): WidgetTyp {
  const mindest = { breite: Math.min(...stufen.map((s) => s.breite)), hoehe: Math.min(...stufen.map((s) => s.hoehe)) };
  const maximal = { breite: Math.max(...stufen.map((s) => s.breite)), hoehe: Math.max(...stufen.map((s) => s.hoehe)) };
  if (!BEREICHE.some((b) => b.id === bereich)) throw new Error(`Widget „${id}“: unbekannter Bereich ${bereich}`);
  const { vollbild, ...rest } = extra;
  return { id, bereich, name, vertrag: vertragRegistrieren(id, { stufen, mindest, maximal, vollbild }), mehrfach: Boolean(extra.quelle), ...rest };
}

/** Platzhalter-Stufe für Typen, deren Größen A7 noch festlegt */
const platzhalter = (breite: number, hoehe: number, informationsumfang: string) => [stufe("standard", breite, hoehe, informationsumfang)];

/** Alle 13 Typen aus dem Bauplan, je Bereich in der Reihenfolge der Tabelle */
export const WIDGET_TYPEN: readonly WidgetTyp[] = [
  typ("karte.gesamtkarte", "karte", "Gesamtkarte", [stufe("standard", 12, 8, "Karte mit Markern, ausrichtbar auf Punkt oder Koordinate")], { vollbild: true }),
  typ("karte.einzelkoordinate", "karte", "Einzelkoordinate", platzhalter(6, 4, "eine Koordinate mit Umrechnung"),
    { optional: true, quelle: "Koordinate" }),
  typ("karte.koordinatensammlung", "karte", "Koordinatensammlung", platzhalter(8, 6, "mehrere Koordinaten einer Sammlung"),
    { optional: true, quelle: "Sammlung" }),
  typ("sammelobjekte.gesamtauflistung", "sammelobjekte", "Alle Sammelobjekte", [stufe("standard", 8, 8, "alle Sammelobjekte mit Stand")]),
  typ("sammelobjekte.eigeneliste", "sammelobjekte", "Eigene Liste", platzhalter(6, 6, "frei zusammengestellte Sammelobjekte"),
    { quelle: "Liste" }),
  typ("sammelobjekte.einzelobjekt", "sammelobjekte", "Einzelobjekt", platzhalter(6, 4, "„suche ich als Nächstes“ mit nächstem Fundort"),
    { quelle: "Objekt" }),
  typ("sammelobjekte.status", "sammelobjekte", "Sammel-Fortschritt", [stufe("standard", 4, 3, "Fortschritt als Kennzahl")]),
  typ("portale.verbindungen", "portale", "Portalverbindungen",
    [stufe("standard", 10, 6, "alle Verbindungen Oberwelt ↔ Nether mit Koordinaten"), stufe("groß", 12, 9, "Verbindungen und Tipps")],
    { zusatzinhalte: [{ abStufe: "groß", inhalt: "Tipps: Mindestabstand zwischen Portalen je Dimension" }], vollbild: true }),
  typ("handbuch.eintrag", "handbuch", "Handbuch-Eintrag", platzhalter(6, 6, "ein Brau-, Crafting-Rezept, eine Verzauberung …"),
    { quelle: "Eintrag" }),
  typ("handbuch.materialliste", "handbuch", "Materialliste", platzhalter(6, 6, "Materialien zum Abhaken"),
    { quelle: "Liste" }),
  typ("bauplaene.bauplan", "bauplaene", "Bauplan", platzhalter(8, 6, "ein einzelner Bauplan"),
    { quelle: "Bauplan" }),
  typ("banner.banner", "banner", "Banner", platzhalter(8, 6, "Motiv und Herstellungsschritte"),
    { quelle: "Banner" }),
  typ("ruestung.set", "ruestung", "Rüstungs-Set", platzhalter(8, 6, "Set mit Teilen und Besätzen"),
    { quelle: "Set" }),
];

const NACH_ID = new Map(WIDGET_TYPEN.map((t) => [t.id, t]));
if (NACH_ID.size !== WIDGET_TYPEN.length) throw new Error("Widget-Typ-IDs müssen eindeutig sein");

export const widgetTyp = (id: string): WidgetTyp | undefined => NACH_ID.get(id);

/** Liegt auf dem Layer schon eine Instanz dieses Typs, der nicht mehrfach sein darf? */
export const schonDa = (instanzen: WidgetInstanz[], typId: string): boolean =>
  NACH_ID.get(typId)?.mehrfach === false && instanzen.some((i) => i.typ === typId);

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
