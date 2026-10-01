import type { HTMLAttributes, ReactNode } from "react";
import type { WidgetTyp } from "../model/widget-struktur";

interface Props {
  typ: WidgetTyp | undefined;
  /** Rahmen hervorheben: im Bearbeiten-Modus, ausgewählt */
  zustand?: "normal" | "bearbeiten" | "ausgewaehlt";
  /** Zusätze rechts im Kopf (Bearbeiten: Stufe, Werkzeuge) */
  kopfZusatz?: ReactNode;
  /** Kopfzeile: Ziehen zum Verschieben, langes Drücken … */
  kopfProps?: HTMLAttributes<HTMLDivElement>;
  /** Der Inhalt. Ohne Inhalt ist es ein leeres Widget (Anordnen am Handy, A6). */
  children?: ReactNode;
}

/**
 * Gehäuse eines Widgets: Rahmen, Kopf mit dem Namen des Typs und das Theme
 * seines Bereichs (`data-bereich`, A5). Es weiß nichts über den Inhalt – den
 * rendert `WidgetInhalt` aus der Karte vom Board.
 */
export function WidgetGehaeuse({ typ, zustand = "normal", kopfZusatz, kopfProps, children }: Props) {
  const { className: kopfKlasse, ...kopfRest } = kopfProps ?? {};
  return (
    <div
      data-bereich={typ?.bereich}
      data-testid="gehaeuse"
      className={[
        "flex h-full w-full flex-col overflow-hidden rounded-panel border bg-surface-muted transition-colors",
        zustand === "ausgewaehlt" ? "border-accent shadow-lg shadow-accent/10" : zustand === "bearbeiten" ? "border-border-strong" : "border-border",
      ].join(" ")}
    >
      <div
        {...kopfRest}
        className={[
          "flex items-center justify-between gap-2 border-b border-border px-2.5 py-1.5 text-sm font-medium sm:px-3 sm:py-2",
          zustand !== "normal" ? "bg-surface-raised" : "",
          kopfKlasse ?? "",
        ].join(" ")}
      >
        <span className="truncate">{typ?.name ?? "Unbekanntes Widget"}</span>
        {kopfZusatz}
      </div>
      {children !== undefined && <div className="min-h-0 flex-1 overflow-hidden p-2.5 sm:p-3">{children}</div>}
    </div>
  );
}
