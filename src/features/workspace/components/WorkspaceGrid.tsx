import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useWorkspaceStore } from "../model/workspace.store";
import {
  cellToPixel,
  columnWidth,
  clampItemToGrid,
  gridRowCount,
  snapSize,
  type GridConfig,
  type PixelRect,
} from "../lib/layout-utils";
import { hasCollision } from "../lib/collision-utils";
import { PANEL_REGISTRY } from "../model/panel-registry";
import type { Id } from "../../../shared/types/common.types";
import type { LayoutItem } from "../model/workspace.types";
import { WorkspacePanel } from "./WorkspacePanel";
import { EmptyGridHint } from "./EmptyGridHint";
import { useBreakpoint } from "../../../shared/hooks/useBreakpoint";
import { adaptLayoutToBreakpoint } from "../lib/responsive-layout";

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

export function WorkspaceGrid() {
  const layout = useWorkspaceStore((s) => s.layout);
  const editMode = useWorkspaceStore((s) => s.editMode);
  const selectedPanelId = useWorkspaceStore((s) => s.selectedPanelId);
  const selectPanel = useWorkspaceStore((s) => s.selectPanel);
  const moveItem = useWorkspaceStore((s) => s.moveItem);
  const resizeItem = useWorkspaceStore((s) => s.resizeItem);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [drag, setDrag] = useState<DragState>({ kind: "idle" });

  // Bildschirmgröße: Das gespeicherte Layout ist im Desktop-Raster (12 Spalten)
  // abgelegt. Für Tablet/Mobil wird daraus ein Layout mit weniger Spalten
  // abgeleitet. Verschieben/Skalieren ist nur im kanonischen Raster erlaubt,
  // damit die Bearbeitung 1:1 gespeichert werden kann.
  const breakpoint = useBreakpoint();
  const displayLayout = useMemo(
    () => adaptLayoutToBreakpoint(layout, breakpoint),
    [layout, breakpoint],
  );
  const canArrange = editMode && breakpoint.erlaubtAnordnen;

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const config: GridConfig = useMemo(
    () => ({
      cols: displayLayout.spalten,
      rowHeight: displayLayout.zeilenHoehe,
      gap: displayLayout.abstand,
      containerWidth,
    }),
    [displayLayout.spalten, displayLayout.zeilenHoehe, displayLayout.abstand, containerWidth],
  );

  // Auf kleinen Bildschirmen keine zusätzlichen Leerzeilen unter dem Inhalt.
  const totalRows = gridRowCount(displayLayout.items, breakpoint.erlaubtAnordnen ? 6 : 1);
  const totalHeight =
    totalRows * displayLayout.zeilenHoehe + (totalRows - 1) * displayLayout.abstand;

  const onDragPointerDown = (e: ReactPointerEvent, id: Id) => {
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

    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== drag.pointerId) return;
      const dx = e.clientX - drag.startPointer.x;
      const dy = e.clientY - drag.startPointer.y;

      if (drag.kind === "move") {
        const item = layout.items.find((i) => i.id === drag.id);
        if (!item) return;
        const colGap = columnWidth(config) + config.gap;
        const rowGap = config.rowHeight + config.gap;
        const dxCells = Math.round(dx / colGap);
        const dyCells = Math.round(dy / rowGap);
        const target = clampItemToGrid(
          {
            ...item,
            x: drag.startCell.x + dxCells,
            y: Math.max(0, drag.startCell.y + dyCells),
          },
          layout.spalten,
        );
        const valid = !hasCollision(target, layout.items);
        setDrag({
          ...drag,
          previewCell: { x: target.x, y: target.y },
          valid,
        });
      } else if (drag.kind === "resize") {
        const item = layout.items.find((i) => i.id === drag.id);
        if (!item) return;
        const colGap = columnWidth(config) + config.gap;
        const rowGap = config.rowHeight + config.gap;
        const rawW = drag.startSize.w + dx / colGap;
        const rawH = drag.startSize.h + dy / rowGap;
        const def = PANEL_REGISTRY[item.panelTyp];
        const snapped = snapSize(Math.max(def.minBreite, rawW), Math.max(def.minHoehe, rawH));
        const candidate: LayoutItem = clampItemToGrid(
          { ...item, w: snapped.w, h: snapped.h },
          layout.spalten,
        );
        const valid = !hasCollision(candidate, layout.items);
        setDrag({
          ...drag,
          previewSize: { w: candidate.w, h: candidate.h },
          valid,
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
  }, [drag, config, layout, moveItem, resizeItem]);

  if (displayLayout.items.length === 0) {
    return <EmptyGridHint />;
  }

  const col = columnWidth(config);
  const gridBackground = canArrange
    ? {
        backgroundImage: `repeating-linear-gradient(to right, rgb(var(--color-border) / 0.35) 0, rgb(var(--color-border) / 0.35) 1px, transparent 1px, transparent ${col + config.gap}px), repeating-linear-gradient(to bottom, rgb(var(--color-border) / 0.35) 0, rgb(var(--color-border) / 0.35) 1px, transparent 1px, transparent ${config.rowHeight + config.gap}px)`,
      }
    : {};

  return (
    <div
      ref={containerRef}
      data-breakpoint={breakpoint.name}
      className="relative w-full"
      style={{ height: totalHeight, ...gridBackground }}
    >
      {displayLayout.items.map((item) => {
        const rect = cellToPixel(item.x, item.y, item.w, item.h, config);
        return (
          <WorkspacePanel
            key={item.id}
            item={item}
            rect={rect}
            editMode={editMode}
            arrangeable={canArrange}
            selected={selectedPanelId === item.id}
            onDragPointerDown={onDragPointerDown}
            onResizePointerDown={onResizePointerDown}
          />
        );
      })}
      {drag.kind !== "idle" && (
        <DragPreview drag={drag} config={config} layout={displayLayout.items} />
      )}
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
