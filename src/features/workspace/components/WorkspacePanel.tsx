import type { PointerEvent as ReactPointerEvent } from "react";
import type { LayoutItem } from "../model/workspace.types";
import type { PixelRect } from "../lib/layout-utils";
import { PanelContentRenderer } from "./PanelContentRenderer";
import { PanelToolbar } from "./PanelToolbar";

interface Props {
  item: LayoutItem;
  rect: PixelRect;
  editMode: boolean;
  /** Verschieben/Skalieren erlaubt (Bearbeitungsmodus im Desktop-Raster). */
  arrangeable: boolean;
  selected: boolean;
  onDragPointerDown: (e: ReactPointerEvent, id: string) => void;
  onResizePointerDown: (e: ReactPointerEvent, id: string) => void;
}

export function WorkspacePanel({
  item,
  rect,
  editMode,
  arrangeable,
  selected,
  onDragPointerDown,
  onResizePointerDown,
}: Props) {
  return (
    <div
      data-panel-id={item.id}
      style={{
        position: "absolute",
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      }}
      className={[
        "flex flex-col overflow-hidden rounded-panel border bg-surface-muted transition-colors",
        editMode
          ? selected
            ? "border-accent shadow-lg shadow-accent/10"
            : "border-border-strong"
          : "border-border",
      ].join(" ")}
    >
      <div
        className={[
          "flex items-center justify-between gap-2 border-b border-border px-2.5 py-1.5 text-sm font-medium sm:px-3 sm:py-2",
          editMode ? "select-none bg-surface-raised" : "",
          arrangeable ? "cursor-move touch-none" : "",
        ].join(" ")}
        onPointerDown={arrangeable ? (e) => onDragPointerDown(e, item.id) : undefined}
      >
        <span className="truncate">{item.titel}</span>
        {editMode && <PanelToolbar panelId={item.id} />}
      </div>
      <div className="flex-1 overflow-auto p-2.5 sm:p-3">
        <PanelContentRenderer typ={item.panelTyp} />
      </div>
      {arrangeable && (
        <div
          role="presentation"
          aria-label="Größe ändern"
          onPointerDown={(e) => onResizePointerDown(e, item.id)}
          className="absolute bottom-1 right-1 h-4 w-4 cursor-nwse-resize touch-none rounded-sm border border-border-strong bg-surface-raised"
        />
      )}
    </div>
  );
}
