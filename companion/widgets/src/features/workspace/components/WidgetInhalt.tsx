import { widgetTyp } from "../model/widget-register";
import { zusatzinhalteFuer, type WidgetInstanz } from "../model/widget-struktur";
import { stufeVon } from "../model/widget-vertrag";
import { useKarte } from "../../karten/hooks/useKarte";
import { KarteAnsicht } from "../../karten/components/KarteAnsicht";

/**
 * Inhalt einer Instanz: die Karte vom Board (Typ + Quelle), ohne Karte der
 * Hinweis des Boards als leerer Zustand (Bereich geplant, Quelle gelöscht …).
 * Darunter die Zusatzinhalte, die ab dieser Stufe eingeblendet werden – im
 * Vollbild alle.
 */
export function WidgetInhalt({ instanz, vollbild = false }: { instanz: WidgetInstanz; vollbild?: boolean }) {
  const typ = widgetTyp(instanz.typ);
  const antwort = useKarte(instanz.typ, instanz.quelle);
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
