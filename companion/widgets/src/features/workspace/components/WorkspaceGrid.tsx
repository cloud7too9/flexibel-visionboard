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
  clampItemToGrid,
  type GridConfig,
  type PixelRect,
  type Rect,
} from "../lib/layout-utils";
import { passt } from "../lib/collision-utils";
import { instanzRect, instanzRects, widgetTyp } from "../model/widget-register";
import type { Id } from "../../../shared/types/common.types";
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
      // Griff zum Vergrößern: Ziehen wählt die Stufe, die der gezogenen Größe am
      // nächsten kommt und an der Stelle passt; Tippen schaltet zur nächsten Stufe.
      kind: "resize";
      id: Id;
      pointerId: number;
      startPointer: { x: number; y: number };
      startSize: { w: number; h: number };
      previewStufe: string;
      previewRect: Rect;
      bewegt: boolean;
      valid: boolean;
    };

/** Bewegung in Pixeln, ab der aus Tippen ein Ziehen wird */
const ZIEH_SCHWELLE = 6;

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

interface Props {
  /** Reihen einer anderen Anzeige (Anordnen am Handy); ohne: aus der eigenen Fläche gemessen */
  festeReihen?: number;
  /** Leere Widgets: nur Gehäuse mit Titel und Theme, ohne Inhalt (Anordnen am Handy) */
  leer?: boolean;
}

export function WorkspaceGrid({ festeReihen, leer = false }: Props = {}) {
  const layout = useWorkspaceStore(selectActiveLayer);
  const editMode = useWorkspaceStore((s) => s.editMode);
  const selectedPanelId = useWorkspaceStore((s) => s.selectedPanelId);
  const selectPanel = useWorkspaceStore((s) => s.selectPanel);
  const setEditMode = useWorkspaceStore((s) => s.setEditMode);
  const moveItem = useWorkspaceStore((s) => s.moveItem);
  const setStufe = useWorkspaceStore((s) => s.setStufe);
  const naechsteStufe = useWorkspaceStore((s) => s.naechsteStufe);

  const setReihen = useWorkspaceStore((s) => s.setReihen);

  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<DragState>({ kind: "idle" });

  // 32 Spalten auf jedem Gerät, quadratische Zellen: Die Breite bestimmt die
  // Zellgröße, die Höhe die Zahl der Reihen. Die Seite selbst scrollt nie.
  const raster = useRaster(containerEl, festeReihen);
  const reihen = raster.reihen;
  useEffect(() => {
    if (reihen > 0) setReihen(reihen);
  }, [reihen, setReihen]);
  const canArrange = editMode;
  // Rechtecke der Instanzen: Größe aus der Stufe
  const rects = useMemo(() => instanzRects(layout.instanzen), [layout.instanzen]);

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
    const item = rects.find((i) => i.id === id);
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
    const item = rects.find((i) => i.id === id);
    const instanz = layout.instanzen.find((i) => i.id === id);
    if (!item || !instanz) return;
    selectPanel(id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({
      kind: "resize",
      id,
      pointerId: e.pointerId,
      startPointer: { x: e.clientX, y: e.clientY },
      startSize: { w: item.w, h: item.h },
      previewStufe: instanz.stufe,
      previewRect: { x: item.x, y: item.y, w: item.w, h: item.h },
      bewegt: false,
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
      const item = rects.find((i) => i.id === drag.id);
      const instanz = layout.instanzen.find((i) => i.id === drag.id);
      const typ = instanz && widgetTyp(instanz.typ);
      if (!item || !instanz || !typ) return;
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
          valid: passt(target, rects, reihen).passt,
        });
      } else {
        const bewegt = drag.bewegt || Math.hypot(e.clientX - drag.startPointer.x, e.clientY - drag.startPointer.y) > ZIEH_SCHWELLE;
        if (!bewegt) return;
        // Gewünschte Größe in Zellen → nächstgelegene Stufe, die hier passt
        const wunsch = { w: drag.startSize.w + dx, h: drag.startSize.h + dy };
        const { vertrag } = typ;
        let beste: { stufe: string; rect: Rect; abstand: number } | null = null;
        for (const s of vertrag.stufen) {
          const rect = clampItemToGrid({ ...item, w: s.breite, h: s.hoehe }, RASTER_SPALTEN, reihen);
          if (rect.w !== s.breite || rect.h !== s.hoehe || !passt(rect, rects, reihen, vertrag).passt) continue;
          const abstand = Math.abs(s.breite - wunsch.w) + Math.abs(s.hoehe - wunsch.h);
          if (!beste || abstand < beste.abstand) beste = { stufe: s.name, rect: { x: rect.x, y: rect.y, w: rect.w, h: rect.h }, abstand };
        }
        setDrag({
          ...drag,
          bewegt,
          previewStufe: beste?.stufe ?? instanz.stufe,
          previewRect: beste?.rect ?? { x: item.x, y: item.y, w: item.w, h: item.h },
          valid: Boolean(beste),
        });
      }
    };

    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== drag.pointerId) return;
      if (drag.kind === "move" && drag.valid) {
        moveItem(drag.id, drag.previewCell.x, drag.previewCell.y);
      }
      if (drag.kind === "resize") {
        if (!drag.bewegt) naechsteStufe(drag.id);
        else if (drag.valid) setStufe(drag.id, drag.previewStufe);
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
  }, [drag, cell.w, cell.h, layout, rects, moveItem, setStufe, naechsteStufe, reihen]);

  const hasSize = raster.zellePx > 0 && reihen > 0;

  return (
    <div ref={setContainerEl} className="relative h-full w-full overflow-hidden">
      {/* Die Fläche ist genau 32 × reihen Zellen groß; was darunter übrig bleibt, bleibt leer. */}
      <div
        data-testid="raster-flaeche"
        data-grid={`${RASTER_SPALTEN}x${reihen}`}
        className={["absolute top-0", festeReihen ? "left-1/2 -translate-x-1/2" : "left-0 w-full"].join(" ")}
        style={{
          height: reihen * raster.zellePx, ...(festeReihen ? { width: RASTER_SPALTEN * raster.zellePx } : {}),
          "--zelle": `${raster.zellePx}px`, ...(editMode ? gridLinesStyle(cell) : {}),
        } as CSSProperties}
      >
      {layout.instanzen.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <EmptyGridHint />
        </div>
      ) : (
        hasSize &&
        layout.instanzen.map((instanz) => {
          const r = instanzRect(instanz);
          return r && (
          <WorkspacePanel
            key={instanz.id}
            instanz={instanz}
            rect={cellToPixel(r.x, r.y, r.w, r.h, config)}
            editMode={editMode}
            arrangeable={canArrange}
            selected={selectedPanelId === instanz.id}
            leer={leer}
            onHeaderPointerDown={onHeaderPointerDown}
            onResizePointerDown={onResizePointerDown}
          />
          );
        })
      )}
      {drag.kind !== "idle" && (
        <DragPreview drag={drag} config={config} layout={rects} />
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
  layout: (Rect & { id: string })[];
}) {
  const item = layout.find((i) => i.id === drag.id);
  if (!item) return null;
  if (drag.kind === "resize" && !drag.bewegt) return null;
  let rect: PixelRect;
  if (drag.kind === "move") {
    rect = cellToPixel(drag.previewCell.x, drag.previewCell.y, item.w, item.h, config);
  } else {
    const r = drag.previewRect;
    rect = cellToPixel(r.x, r.y, r.w, r.h, config);
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
