import type { HTMLAttributes, ReactNode } from "react";
import type { WidgetTyp } from "../model/widget-struktur";
import { themeFuer, type ThemeId, type WidgetZustand } from "../model/widget-themes";

interface Props {
  typ: WidgetTyp | undefined;
  /** Rahmen hervorheben: im Bearbeiten-Modus, ausgewählt */
  zustand?: "normal" | "bearbeiten" | "ausgewaehlt";
  /** Zusätze rechts im Kopf (Bearbeiten: Stufe, Werkzeuge) */
  kopfZusatz?: ReactNode;
  /** Kopfzeile: Ziehen zum Verschieben, langes Drücken … */
  kopfProps?: HTMLAttributes<HTMLDivElement>;
  /** Was ein dynamisches Theme braucht (Karte: angezeigte Dimension) */
  themeZustand?: WidgetZustand;
  /** Der Inhalt. Ohne Inhalt ist es ein leeres Widget (Anordnen am Handy, A6). */
  children?: ReactNode;
}

/** Handbuch: Der Inhalt steht auf den Seiten eines aufgeschlagenen Buchs */
function BuchRahmen({ children }: { children: ReactNode }) {
  return <div className="buch-seiten h-full px-[7%] py-[5%]" data-testid="buch">{children}</div>;
}

/** Themes mit eigener Rahmen-Komponente um den Inhalt */
const RAHMEN: Partial<Record<ThemeId, (p: { children: ReactNode }) => ReactNode>> = { handbuch: BuchRahmen };

/**
 * Gehäuse eines Widgets: Rahmen, Kopf mit dem Namen des Typs und das Theme
 * seines Bereichs (`data-theme`, siehe widget-themes.ts). Es weiß nichts über
 * den Inhalt – den rendert `WidgetInhalt` aus der Karte vom Board.
 */
export function WidgetGehaeuse({ typ, zustand = "normal", kopfZusatz, kopfProps, themeZustand, children }: Props) {
  const { className: kopfKlasse, ...kopfRest } = kopfProps ?? {};
  const theme = themeFuer(typ?.bereich, themeZustand);
  const Rahmen = RAHMEN[theme];
  return (
    <div
      data-bereich={typ?.bereich}
      data-theme={theme}
      data-testid="gehaeuse"
      className={[
        "widget-gehaeuse flex h-full w-full flex-col overflow-hidden rounded-panel border bg-surface-muted text-text transition-colors",
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
      {children !== undefined && (
        <div className="widget-koerper min-h-0 flex-1 overflow-hidden p-2.5 sm:p-3">
          {Rahmen ? <Rahmen>{children}</Rahmen> : children}
        </div>
      )}
    </div>
  );
}
