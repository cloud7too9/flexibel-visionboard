import type { PointerEvent as ReactPointerEvent } from "react";
import type { WidgetInstanz } from "../model/widget-struktur";
import type { PixelRect } from "../lib/layout-utils";
import { widgetTyp } from "../model/widget-register";
import { stufeVon } from "../model/widget-vertrag";
import { WidgetInhalt } from "./WidgetInhalt";
import { PanelToolbar } from "./PanelToolbar";
import { WidgetGehaeuse } from "./WidgetGehaeuse";

interface Props {
  instanz: WidgetInstanz;
  rect: PixelRect;
  editMode: boolean;
  /** Verschieben/Skalieren erlaubt (Bearbeitungsmodus im Desktop-Raster). */
  arrangeable: boolean;
  selected: boolean;
  /** Kopfzeile: startet Verschieben (Bearbeitungszustand, Desktop) oder langes Drücken. */
  onHeaderPointerDown: (e: ReactPointerEvent, id: string) => void;
  onResizePointerDown: (e: ReactPointerEvent, id: string) => void;
}

/**
 * Ein Widget an seiner Stelle im Raster: das Gehäuse mit dem Inhalt, im
 * Bearbeiten-Modus dazu Stufe, Werkzeuge und der Griff für die Größenstufe.
 */
export function WorkspacePanel({
  instanz: item,
  rect,
  editMode,
  arrangeable,
  selected,
  onHeaderPointerDown,
  onResizePointerDown,
}: Props) {
  const typ = widgetTyp(item.typ);
  const stufe = typ && stufeVon(typ.vertrag, item.stufe);
  return (
    <div
      data-panel-id={item.id}
      data-typ={item.typ}
      style={{
        position: "absolute",
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      }}
    >
      <WidgetGehaeuse
        typ={typ}
        zustand={editMode ? (selected ? "ausgewaehlt" : "bearbeiten") : "normal"}
        kopfProps={{
          className: ["long-press-target", arrangeable ? "cursor-move touch-none" : ""].join(" "),
          onPointerDown: (e) => onHeaderPointerDown(e, item.id),
          onContextMenu: (e) => e.preventDefault(),
        }}
        kopfZusatz={editMode && (
          <>
            <span
              className="ml-auto shrink-0 rounded-full border border-border px-1.5 text-[10px] leading-4 text-text-muted"
              data-testid="stufe"
              title="Größenstufe · Breite × Höhe in Zellen"
            >
              {item.stufe} · {stufe?.breite}×{stufe?.hoehe}
            </span>
            <PanelToolbar panelId={item.id} typ={item.typ} />
          </>
        )}
      >
        <WidgetInhalt instanz={item} />
      </WidgetGehaeuse>
      {arrangeable && (
        <div
          role="button"
          aria-label="Größe ändern (nächste Stufe)"
          title="Tippen: nächste Größenstufe · Ziehen: Stufe wählen"
          onPointerDown={(e) => onResizePointerDown(e, item.id)}
          className="absolute bottom-1 right-1 h-4 w-4 cursor-nwse-resize touch-none rounded-sm border border-border-strong bg-surface-raised"
        />
      )}
    </div>
  );
}
