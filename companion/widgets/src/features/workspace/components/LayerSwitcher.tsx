import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { IconButton } from "../../../shared/ui/IconButton";
import type { Id } from "../../../shared/types/common.types";
import { LAYER_NAME_MAX_LENGTH, useWorkspaceStore } from "../model/workspace.store";

const VIEWPORT_MARGIN = 12;

function widgetCountLabel(n: number): string {
  if (n === 0) return "leer";
  return n === 1 ? "1 Widget" : `${n} Widgets`;
}

/**
 * Umschalter für Layer im Header. Wechseln ist immer möglich; Anlegen,
 * Umbenennen und Entfernen nur im Bearbeitungszustand – analog zu Widgets.
 */
export function LayerSwitcher() {
  const layers = useWorkspaceStore((s) => s.layers);
  const activeLayerId = useWorkspaceStore((s) => s.activeLayerId);
  const editMode = useWorkspaceStore((s) => s.editMode);
  const setActiveLayer = useWorkspaceStore((s) => s.setActiveLayer);
  const addLayer = useWorkspaceStore((s) => s.addLayer);
  const renameLayer = useWorkspaceStore((s) => s.renameLayer);
  const removeLayer = useWorkspaceStore((s) => s.removeLayer);

  const [open, setOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<Id | null>(null);
  const [shift, setShift] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const activeIndex = Math.max(
    0,
    layers.findIndex((l) => l.id === activeLayerId),
  );
  const active = layers[activeIndex];

  const close = () => {
    setOpen(false);
    setRenamingId(null);
  };

  // Schließen bei Klick außerhalb oder Escape.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Verlässt die Oberfläche den Bearbeitungszustand, endet das Umbenennen.
  useEffect(() => {
    if (!editMode) setRenamingId(null);
  }, [editMode]);

  // Popover horizontal im Viewport halten (schmale Bildschirme).
  useLayoutEffect(() => {
    if (!open) {
      setShift(0);
      return;
    }
    const el = popoverRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const overflow = rect.right - shift - (window.innerWidth - VIEWPORT_MARGIN);
    setShift(overflow > 0 ? overflow : 0);
    // shift absichtlich nicht in den Abhängigkeiten: einmal pro Öffnen messen.
  }, [open]);

  if (!active) return null;

  const onAddLayer = () => {
    const id = addLayer();
    setRenamingId(id);
  };

  const onRemoveLayer = (id: Id) => {
    const layer = layers.find((l) => l.id === id);
    if (!layer) return;
    if (
      layer.items.length > 0 &&
      !confirm(`Layer „${layer.name}“ mit ${widgetCountLabel(layer.items.length)} entfernen?`)
    ) {
      return;
    }
    removeLayer(id);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Layer wechseln. Aktiv: ${active.name}`}
        data-testid="layer-switcher"
        className="inline-flex max-w-[14rem] items-center gap-1.5 rounded-md border border-border px-2 py-1 text-sm hover:border-border-strong hover:bg-surface-raised"
      >
        <LayersIcon />
        <span className="truncate">{active.name}</span>
        {layers.length > 1 && (
          <span className="shrink-0 text-xs text-text-muted">
            {activeIndex + 1}/{layers.length}
          </span>
        )}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="shrink-0 text-text-muted">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Layer"
          style={{ transform: shift ? `translateX(-${shift}px)` : undefined }}
          className="absolute left-0 top-full z-40 mt-1 w-72 max-w-[calc(100vw-24px)] rounded-panel border border-border bg-surface-raised p-1.5 shadow-xl"
        >
          <ul className="flex max-h-[60vh] flex-col gap-0.5 overflow-y-auto">
            {layers.map((layer) => {
              const isActive = layer.id === active.id;
              if (renamingId === layer.id) {
                return (
                  <li key={layer.id}>
                    <RenameForm
                      initial={layer.name}
                      onSubmit={(name) => {
                        renameLayer(layer.id, name);
                        setRenamingId(null);
                      }}
                      onCancel={() => setRenamingId(null)}
                    />
                  </li>
                );
              }
              return (
                <li key={layer.id} className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveLayer(layer.id);
                      close();
                    }}
                    aria-current={isActive ? "true" : undefined}
                    className={[
                      "flex min-h-[40px] min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
                      isActive ? "bg-accent/15 text-text" : "hover:bg-surface",
                    ].join(" ")}
                  >
                    <span
                      aria-hidden="true"
                      className={[
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        isActive ? "bg-accent" : "bg-transparent",
                      ].join(" ")}
                    />
                    <span className="min-w-0 flex-1 truncate">{layer.name}</span>
                    <span className="shrink-0 text-xs text-text-muted">
                      {widgetCountLabel(layer.items.length)}
                    </span>
                  </button>
                  {editMode && (
                    <>
                      <IconButton label={`„${layer.name}“ umbenennen`} onClick={() => setRenamingId(layer.id)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                      </IconButton>
                      <IconButton
                        label={`„${layer.name}“ entfernen`}
                        onClick={() => onRemoveLayer(layer.id)}
                        disabled={layers.length <= 1}
                        className="hover:bg-danger/20 hover:text-danger disabled:pointer-events-none disabled:opacity-30"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M3 6h18" />
                          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        </svg>
                      </IconButton>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="mt-1 border-t border-border pt-1">
            {editMode ? (
              <button
                type="button"
                onClick={onAddLayer}
                className="flex min-h-[40px] w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-accent hover:bg-surface"
              >
                <span aria-hidden="true">+</span> Neuer Layer
              </button>
            ) : (
              <p className="px-2 py-1.5 text-xs text-text-muted">
                Layer anlegen, umbenennen und entfernen im Bearbeitungszustand.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RenameForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (value.trim()) onSubmit(value);
    else onCancel();
  };

  return (
    <form onSubmit={submit} className="flex items-center gap-1 px-1 py-1">
      <input
        ref={inputRef}
        value={value}
        maxLength={LAYER_NAME_MAX_LENGTH}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => submit()}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            onCancel();
          }
        }}
        aria-label="Layer-Name"
        className="min-h-[36px] min-w-0 flex-1 rounded-md border border-border-strong bg-surface px-2 text-sm text-text outline-none focus:border-accent"
      />
    </form>
  );
}

function LayersIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="shrink-0 text-text-muted">
      <path d="m12 2 10 5-10 5L2 7Z" />
      <path d="m2 17 10 5 10-5" />
      <path d="m2 12 10 5 10-5" />
    </svg>
  );
}
