/**
 * Widget-Struktur (planung/bauplaene/Bauplan-Widget-Struktur.md):
 * Ein Bereich der Companion ist nur eine Überkategorie zum Sortieren – aufs
 * Dashboard kommen einzelne Inhalte, die Widget-Typen. Der Datentyp erzwingt
 * das: `WidgetInstanz.typ` verweist immer auf einen Widget-Typ, nie auf einen
 * Bereich.
 */
import type { Groessenstufe, WidgetVertrag } from "./widget-vertrag";

/** Bereichs-IDs wie in `BEREICHE` der Companion (companion-prototyp.html, Abschnitt 9b) */
export type BereichId = "karte" | "sammelobjekte" | "portale" | "handbuch" | "bauplaene" | "banner" | "ruestung";

export interface Bereich {
  id: BereichId;
  name: string;
}

/** Reihenfolge und Namen wie in der Sidebar der Companion */
export const BEREICHE: readonly Bereich[] = [
  { id: "karte", name: "Karte" },
  { id: "sammelobjekte", name: "Sammelobjekte" },
  { id: "portale", name: "Portal-Verwaltung" },
  { id: "handbuch", name: "Handbuch" },
  { id: "bauplaene", name: "Baupläne" },
  { id: "banner", name: "Banner" },
  { id: "ruestung", name: "Rüstung" },
];

export interface Zusatzinhalt {
  /** Ab dieser Stufe (und in allen größeren) wird der Inhalt eingeblendet. */
  abStufe: string;
  inhalt: string;
}

/** Ein einzelner Inhalt eines Bereichs, z. B. „Portalverbindungen“. */
export interface WidgetTyp {
  /** stabil, z. B. "portale.verbindungen" – gespeicherte Instanzen hängen daran */
  id: string;
  bereich: BereichId;
  name: string;
  vertrag: WidgetVertrag;
  /** nur auf größeren Stufen, keine eigenen Widgets (z. B. Tipps) */
  zusatzinhalte?: Zusatzinhalt[];
  /** beliebig viele Instanzen, jede mit eigener Quelle – sonst höchstens eine je Layer */
  mehrfach: boolean;
  /** als optionales Extra-Widget markiert */
  optional?: boolean;
  /** Art der Quelle, die man beim Hinzufügen wählt (z. B. „Koordinate“, „Banner“); ohne: Inhalt der ganzen Welt */
  quelle?: string;
}

/**
 * Was auf dem Dashboard liegt. Breite und Höhe stehen nicht drin – sie folgen
 * aus der Stufe. Vollbild ist keine Stufe, sondern eine eigene Route.
 */
export interface WidgetInstanz {
  id: string;
  /** WidgetTyp.id, nie Bereich.id */
  typ: string;
  /** Name der Größenstufe aus dem Vertrag des Typs */
  stufe: string;
  x: number;
  y: number;
  /** ID der Quelle (Koordinate, Liste, Eintrag, Bauplan, Banner, Set) bei Typen mit `quelle` */
  quelle?: string;
}

const flaeche = (s: Pick<Groessenstufe, "breite" | "hoehe">) => s.breite * s.hoehe;

/**
 * Zusatzinhalte, die in dieser Stufe sichtbar sind: alle, deren `abStufe`
 * nicht größer ist als die aktuelle (verglichen über die Fläche in Zellen).
 */
export function zusatzinhalteFuer(typ: WidgetTyp, stufe: string): Zusatzinhalt[] {
  const aktuell = typ.vertrag.stufen.find((s) => s.name === stufe);
  if (!aktuell) return [];
  return (typ.zusatzinhalte ?? []).filter((z) => {
    const ab = typ.vertrag.stufen.find((s) => s.name === z.abStufe);
    return ab !== undefined && flaeche(ab) <= flaeche(aktuell);
  });
}
