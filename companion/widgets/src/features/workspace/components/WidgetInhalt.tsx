import { widgetTyp } from "../model/widget-register";
import { zusatzinhalteFuer, type WidgetInstanz } from "../model/widget-struktur";
import { stufeVon } from "../model/widget-vertrag";
import { KarteAnsicht } from "../../karten/components/KarteAnsicht";
import type { WidgetAntwort } from "../../karten/karte.types";

/**
 * Inhalt einer Instanz: die Karte vom Board (Typ + Quelle, geladen mit
 * `useKarte` vom Aufrufer, der sie auch fürs Theme braucht), ohne Karte der
 * Hinweis des Boards als leerer Zustand (Bereich geplant, Quelle gelöscht …).
 * Darunter die Zusatzinhalte, die ab dieser Stufe eingeblendet werden – im
 * Vollbild alle. `antwort` null: lädt noch.
 */
export function WidgetInhalt({ instanz, antwort, vollbild = false }: {
  instanz: WidgetInstanz;
  antwort: WidgetAntwort | null;
  vollbild?: boolean;
}) {
  const typ = widgetTyp(instanz.typ);
  if (!typ) return <p className="text-sm text-text-muted">Unbekanntes Widget</p>;
  const stufe = stufeVon(typ.vertrag, instanz.stufe);
  const zusatz = vollbild ? typ.zusatzinhalte ?? [] : zusatzinhalteFuer(typ, stufe.name);
  return (
    <div className="flex h-full min-h-0 flex-col gap-2" data-testid="widget-inhalt">
      {antwort?.karte ? (
        <div className="min-h-0 flex-1"><KarteAnsicht karte={antwort.karte} gross={vollbild} ohneTitel={antwort.karte.titel === typ.name} /></div>
      ) : (
        <p
          className="flex min-h-0 flex-1 items-center justify-center text-center text-sm text-text-muted"
          data-testid={antwort ? "widget-leer" : "widget-laedt"}
        >
          {antwort ? antwort.hinweis ?? "Kein Inhalt" : "Lädt …"}
        </p>
      )}
      {zusatz.map((z) => (
        <p key={z.inhalt} data-testid="zusatzinhalt" className="rounded-md border border-border bg-surface px-2 py-1.5 text-xs">
          {z.inhalt}
        </p>
      ))}
    </div>
  );
}
