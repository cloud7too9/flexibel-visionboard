import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { selectActiveLayer, useWorkspaceStore } from "../model/workspace.store";
import {
  cellSize,
  cellToPixel,
  clamp,
  clampItemToGrid,
  type GridConfig,
  type PixelRect,
} from "../lib/layout-utils";
import { hasCollision } from "../lib/collision-utils";
import { PANEL_REGISTRY } from "../model/panel-registry";
import type { Id } from "../../../shared/types/common.types";
import type { LayoutItem } from "../model/workspace.types";
import { WorkspacePanel } from "./WorkspacePanel";
import { EmptyGridHint } from "./EmptyGridHint";
import { RASTER_SPALTEN, abstandPx, useRaster } from "../lib/raster";
import { useLongPress } from "../hooks/useLongPress";

/** Alle so viele Zellen wird eine kräftigere Hilfslinie gezeichnet. */
export const MAJOR_GRID_EVERY = 8;

type DragState =
  | { kind: "idle" }
  | {
      kind: "move";
      id: Id;
      pointerId: number;
      startPointer: { x: number; y: number };
      startCell: { x: number; y: number };
      previewCell: { x: number; y: number };
      valid: boolean;
    }
  | {
      kind: "resize";
      id: Id;
      pointerId: number;
      startPointer: { x: number; y: number };
      startSize: { w: number; h: number };
      previewSize: { w: number; h: number };
      valid: boolean;
    };

/** Gitterlinien als Hintergrund: feine Linien je Zelle, kräftige alle 8 Zellen. */
function gridLinesStyle(cell: { w: number; h: number }): CSSProperties {
  if (cell.w <= 0 || cell.h <= 0) return {};
  const minor = "rgb(var(--color-border) / 0.45)";
  const major = "rgb(var(--color-border-strong) / 0.55)";
  const mw = cell.w * MAJOR_GRID_EVERY;
  const mh = cell.h * MAJOR_GRID_EVERY;
  return {
    backgroundImage: [
      `linear-gradient(to right, ${major} 1px, transparent 1px)`,
      `linear-gradient(to bottom, ${major} 1px, transparent 1px)`,
      `linear-gradient(to right, ${minor} 1px, transparent 1px)`,
      `linear-gradient(to bottom, ${minor} 1px, transparent 1px)`,
    ].join(", "),
    backgroundSize: `${mw}px ${mh}px, ${mw}px ${mh}px, ${cell.w}px ${cell.h}px, ${cell.w}px ${cell.h}px`,
    // Rechter und unterer Rand der Fläche.
    boxShadow: `inset -1px -1px 0 ${major}`,
  };
}

export function WorkspaceGrid() {
  const layout = useWorkspaceStore(selectActiveLayer);
  const editMode = useWorkspaceStore((s) => s.editMode);
  const selectedPanelId = useWorkspaceStore((s) => s.selectedPanelId);
  const selectPanel = useWorkspaceStore((s) => s.selectPanel);
  const setEditMode = useWorkspaceStore((s) => s.setEditMode);
  const moveItem = useWorkspaceStore((s) => s.moveItem);
  const resizeItem = useWorkspaceStore((s) => s.resizeItem);

  const setReihen = useWorkspaceStore((s) => s.setReihen);

  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<DragState>({ kind: "idle" });

  // 32 Spalten auf jedem Gerät, quadratische Zellen: Die Breite bestimmt die
  // Zellgröße, die Höhe die Zahl der Reihen. Die Seite selbst scrollt nie.
  const raster = useRaster(containerEl);
  const reihen = raster.reihen;
  useEffect(() => {
    if (reihen > 0) setReihen(reihen);
  }, [reihen, setReihen]);
  const canArrange = editMode;

  // Langes Drücken auf die Kopfzeile eines Widgets (ohne Verschieben) schaltet
  // die gesamte Oberfläche in den Bearbeitungszustand.
  const longPress = useLongPress<Id>((id) => {
    selectPanel(id);
    setEditMode(true);
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(10);
    }
  });

  const config: GridConfig = useMemo(
    () => ({ cols: RASTER_SPALTEN, rows: reihen, zellePx: raster.zellePx, gap: abstandPx(raster.zellePx) }),
    [reihen, raster.zellePx],
  );
  const cell = cellSize(config);

  const onHeaderPointerDown = (e: ReactPointerEvent, id: Id) => {
    if (!editMode) {
      longPress.start(e, id);
      return;
    }
    if (!canArrange) return;
    e.preventDefault();
    const item = layout.items.find((i) => i.id === id);
    if (!item) return;
    selectPanel(id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({
      kind: "move",
      id,
      pointerId: e.pointerId,
      startPointer: { x: e.clientX, y: e.clientY },
      startCell: { x: item.x, y: item.y },
      previewCell: { x: item.x, y: item.y },
      valid: true,
    });
  };

  const onResizePointerDown = (e: ReactPointerEvent, id: Id) => {
    if (!canArrange) return;
    e.preventDefault();
    e.stopPropagation();
    const item = layout.items.find((i) => i.id === id);
    if (!item) return;
    selectPanel(id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({
      kind: "resize",
      id,
      pointerId: e.pointerId,
      startPointer: { x: e.clientX, y: e.clientY },
      startSize: { w: item.w, h: item.h },
      previewSize: { w: item.w, h: item.h },
      valid: true,
    });
  };

  useEffect(() => {
    if (!canArrange && drag.kind !== "idle") setDrag({ kind: "idle" });
  }, [canArrange, drag.kind]);

  useEffect(() => {
    if (drag.kind === "idle") return;
    if (cell.w <= 0 || cell.h <= 0) return;

    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== drag.pointerId) return;
      const item = layout.items.find((i) => i.id === drag.id);
      if (!item) return;
      const dx = (e.clientX - drag.startPointer.x) / cell.w;
      const dy = (e.clientY - drag.startPointer.y) / cell.h;

      if (drag.kind === "move") {
        const target = clampItemToGrid(
          {
            ...item,
            x: drag.startCell.x + Math.round(dx),
            y: drag.startCell.y + Math.round(dy),
          },
          RASTER_SPALTEN,
          reihen,
        );
        setDrag({
          ...drag,
          previewCell: { x: target.x, y: target.y },
          valid: !hasCollision(target, layout.items),
        });
      } else {
        const def = PANEL_REGISTRY[item.panelTyp];
        const minW = Math.min(item.minW ?? def.minBreite, RASTER_SPALTEN);
        const minH = Math.min(item.minH ?? def.minHoehe, reihen);
        const w = clamp(Math.round(drag.startSize.w + dx), minW, RASTER_SPALTEN - item.x);
        const h = clamp(Math.round(drag.startSize.h + dy), minH, reihen - item.y);
        const candidate: LayoutItem = { ...item, w, h };
        setDrag({
          ...drag,
          previewSize: { w, h },
          valid: !hasCollision(candidate, layout.items),
        });
      }
    };

    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== drag.pointerId) return;
      if (drag.kind === "move" && drag.valid) {
        moveItem(drag.id, drag.previewCell.x, drag.previewCell.y);
      }
      if (drag.kind === "resize" && drag.valid) {
        resizeItem(drag.id, drag.previewSize.w, drag.previewSize.h);
      }
      setDrag({ kind: "idle" });
    };

    const onCancel = () => setDrag({ kind: "idle" });

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    };
  }, [drag, cell.w, cell.h, layout, moveItem, resizeItem, reihen]);

  const hasSize = raster.zellePx > 0 && reihen > 0;

  return (
    <div ref={setContainerEl} className="relative h-full w-full overflow-hidden">
      {/* Die Fläche ist genau 32 × reihen Zellen groß; was darunter übrig bleibt, bleibt leer. */}
      <div
        data-testid="raster-flaeche"
        data-grid={`${RASTER_SPALTEN}x${reihen}`}
        className="absolute left-0 top-0 w-full"
        style={{ height: reihen * raster.zellePx, ...(editMode ? gridLinesStyle(cell) : {}) }}
      >
      {layout.items.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <EmptyGridHint />
        </div>
      ) : (
        hasSize &&
        layout.items.map((item) => (
          <WorkspacePanel
            key={item.id}
            item={item}
            rect={cellToPixel(item.x, item.y, item.w, item.h, config)}
            editMode={editMode}
            arrangeable={canArrange}
            selected={selectedPanelId === item.id}
            onHeaderPointerDown={onHeaderPointerDown}
            onResizePointerDown={onResizePointerDown}
          />
        ))
      )}
      {drag.kind !== "idle" && (
        <DragPreview drag={drag} config={config} layout={layout.items} />
      )}
      </div>
    </div>
  );
}

function DragPreview({
  drag,
  config,
  layout,
}: {
  drag: Exclude<DragState, { kind: "idle" }>;
  config: GridConfig;
  layout: LayoutItem[];
}) {
  const item = layout.find((i) => i.id === drag.id);
  if (!item) return null;
  let rect: PixelRect;
  if (drag.kind === "move") {
    rect = cellToPixel(drag.previewCell.x, drag.previewCell.y, item.w, item.h, config);
  } else {
    rect = cellToPixel(item.x, item.y, drag.previewSize.w, drag.previewSize.h, config);
  }
  return (
    <div
      style={{
        position: "absolute",
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        pointerEvents: "none",
      }}
      className={[
        "rounded-panel border-2 border-dashed",
        drag.valid ? "border-accent bg-accent/10" : "border-danger bg-danger/10",
      ].join(" ")}
    />
  );
}
