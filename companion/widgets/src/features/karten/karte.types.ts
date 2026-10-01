/**
 * Karte im allgemeinen Format des Boards (koordinaten-board/server/src/zeigen.js):
 * Titel und höchstens 6 Blöcke. Das Dashboard rendert nur diese Blöcke und hat
 * kein Fachwissen über die Bereiche – die Karten baut der Board-Server mit
 * denselben Anzeigeschemas wie „Aufs Board“ in der Companion.
 */
export type Dimension = "oberwelt" | "nether" | "ende";

export type Block =
  | { art: "koordinaten"; label?: string; x: number; y: number | null; z: number; dimension?: Dimension | null }
  | { art: "zeilen"; zeilen: { label: string; wert: string }[] }
  | { art: "text"; text: string }
  | { art: "bild"; daten: string; label?: string; pixelig?: boolean };

export interface Karte {
  titel: string;
  unter?: string;
  bereich?: string;
  quelle?: string;
  typ?: string;
  dimension?: Dimension | null;
  bloecke: Block[];
}

/** Antwort von GET /api/widgets/:typ – Karte oder ein Hinweis (geplant, keine Welt, Quelle gelöscht) */
export interface WidgetAntwort {
  karte: Karte | null;
  hinweis?: string;
}

/** Was man beim Hinzufügen als Quelle wählen kann (GET /api/widgets/:typ/quellen) */
export interface Quelle {
  id: string;
  name: string;
  unter?: string;
}

export interface QuellenAntwort {
  /** Art der Quelle; null: Der Typ braucht (noch) keine Quelle */
  quelle: string | null;
  quellen: Quelle[];
  /** Board nicht erreichbar, kein Zugang … */
  fehler?: string;
}
