import { widgetTyp } from "../model/widget-register";
import { BEREICHE, zusatzinhalteFuer, type WidgetInstanz } from "../model/widget-struktur";
import { stufeVon } from "../model/widget-vertrag";

/**
 * Inhalt einer Instanz. Bis die Karten vom Server kommen (Phase A4) ein
 * Platzhalter: was der Typ in dieser Stufe zeigt, und darunter die
 * Zusatzinhalte, die ab dieser Stufe eingeblendet werden.
 */
export function WidgetInhalt({ instanz, vollbild = false }: { instanz: WidgetInstanz; vollbild?: boolean }) {
  const typ = widgetTyp(instanz.typ);
  if (!typ) return <p className="text-sm text-text-muted">Unbekanntes Widget</p>;
  const stufe = stufeVon(typ.vertrag, instanz.stufe);
  // Im Vollbild zeigt das Widget alles, also auch alle Zusatzinhalte
  const zusatz = vollbild ? typ.zusatzinhalte ?? [] : zusatzinhalteFuer(typ, stufe.name);
  const bereich = BEREICHE.find((b) => b.id === typ.bereich)?.name;
  return (
    <div className="flex h-full flex-col gap-2 text-sm" data-testid="widget-inhalt">
      <p className="text-text-muted">{vollbild ? "Vollbild: alles aus diesem Bereich" : stufe.informationsumfang}</p>
      {zusatz.map((z) => (
        <p key={z.inhalt} data-testid="zusatzinhalt" className="rounded-md border border-border bg-surface px-2 py-1.5 text-xs">
          {z.inhalt}
        </p>
      ))}
      <p className="mt-auto text-[11px] uppercase tracking-wide text-text-muted/70">Platzhalter · {bereich}</p>
    </div>
  );
}
