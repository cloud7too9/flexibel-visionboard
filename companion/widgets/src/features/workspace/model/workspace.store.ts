import { create } from "zustand";
import type { Id } from "../../../shared/types/common.types";
import type { LayoutItem, PanelTyp, WorkspaceData, WorkspaceLayout } from "./workspace.types";
import { DEFAULT_LAYOUT } from "./default-layout";
import { PANEL_REGISTRY } from "./panel-registry";
import { clampItemToGrid, findFreePosition } from "../lib/layout-utils";
import { hasCollision } from "../lib/collision-utils";
import { loadWorkspaceFromStorage, saveWorkspaceToStorage } from "../lib/storage";

export const LAYER_NAME_MAX_LENGTH = 40;

interface WorkspaceState {
  layers: WorkspaceLayout[];
  activeLayerId: Id;
  editMode: boolean;
  selectedPanelId: Id | null;
  addPanelOpen: boolean;

  setEditMode: (value: boolean) => void;
  toggleEditMode: () => void;
  selectPanel: (id: Id | null) => void;
  openAddPanel: () => void;
  closeAddPanel: () => void;

  // Widgets – wirken immer auf den aktiven Layer.
  moveItem: (id: Id, x: number, y: number) => boolean;
  resizeItem: (id: Id, w: number, h: number) => boolean;
  /** false, wenn auf dem Layer kein Platz mehr frei ist. */
  addItem: (typ: PanelTyp) => boolean;
  removeItem: (id: Id) => void;
  /** false, wenn auf dem Layer kein Platz mehr frei ist. */
  duplicateItem: (id: Id) => boolean;

  // Layer
  setActiveLayer: (id: Id) => void;
  addLayer: (name?: string) => Id;
  renameLayer: (id: Id, name: string) => boolean;
  removeLayer: (id: Id) => boolean;
  resetActiveLayer: () => void;

  loadWorkspace: () => void;
}

function cloneLayout(layout: WorkspaceLayout): WorkspaceLayout {
  return { ...layout, items: layout.items.map((i) => ({ ...i })) };
}

function nextId(prefix: string): Id {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}

/** Der aktive Layer; fällt auf den ersten zurück, falls die ID ungültig ist. */
export function selectActiveLayer(
  state: Pick<WorkspaceState, "layers" | "activeLayerId">,
): WorkspaceLayout {
  return state.layers.find((l) => l.id === state.activeLayerId) ?? state.layers[0];
}

export function nextLayerName(layers: WorkspaceLayout[]): string {
  const names = new Set(layers.map((l) => l.name));
  let n = layers.length + 1;
  while (names.has(`Layer ${n}`)) n++;
  return `Layer ${n}`;
}

function normalizeLayerName(name: string): string {
  return name.trim().replace(/\s+/g, " ").slice(0, LAYER_NAME_MAX_LENGTH);
}

/**
 * Sucht Platz für ein neues Widget: zuerst in Wunschgröße, dann in
 * Mindestgröße. `null`, wenn die Fläche voll ist.
 */
function findSlot(
  layout: WorkspaceLayout,
  preferred: { w: number; h: number },
  minimum: { w: number; h: number },
): { x: number; y: number; w: number; h: number } | null {
  for (const size of [preferred, minimum]) {
    const w = Math.min(size.w, layout.spalten);
    const h = Math.min(size.h, layout.zeilen);
    const pos = findFreePosition(layout.items, w, h, layout.spalten, layout.zeilen);
    if (pos) return { ...pos, w, h };
  }
  return null;
}

export function createInitialWorkspace(): WorkspaceData {
  const first = cloneLayout(DEFAULT_LAYOUT);
  return { layers: [first], activeLayerId: first.id };
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => {
  /** Setzt Layer-Daten und speichert sie. */
  const commit = (data: WorkspaceData, extra: Partial<WorkspaceState> = {}) => {
    set({ ...data, ...extra });
    saveWorkspaceToStorage(data);
  };

  /** Ersetzt die Widgets des aktiven Layers. */
  const commitActiveItems = (items: LayoutItem[], extra: Partial<WorkspaceState> = {}) => {
    const { layers, activeLayerId } = get();
    const active = selectActiveLayer(get());
    const next = layers.map((l) => (l.id === active.id ? { ...l, items } : l));
    commit({ layers: next, activeLayerId }, extra);
  };

  return {
    ...createInitialWorkspace(),
    editMode: false,
    selectedPanelId: null,
    addPanelOpen: false,

    setEditMode: (value) => {
      set({ editMode: value, selectedPanelId: value ? get().selectedPanelId : null });
    },
    toggleEditMode: () => get().setEditMode(!get().editMode),
    selectPanel: (id) => set({ selectedPanelId: id }),
    openAddPanel: () => set({ addPanelOpen: true }),
    closeAddPanel: () => set({ addPanelOpen: false }),

    moveItem: (id, x, y) => {
      const layout = selectActiveLayer(get());
      const target = layout.items.find((i) => i.id === id);
      if (!target) return false;
      const candidate = clampItemToGrid({ ...target, x, y }, layout.spalten, layout.zeilen);
      if (candidate.x === target.x && candidate.y === target.y) return false;
      if (hasCollision(candidate, layout.items)) return false;
      commitActiveItems(layout.items.map((i) => (i.id === id ? candidate : i)));
      return true;
    },

    resizeItem: (id, w, h) => {
      const layout = selectActiveLayer(get());
      const target = layout.items.find((i) => i.id === id);
      if (!target) return false;
      const def = PANEL_REGISTRY[target.panelTyp];
      if (!def.erlaubtResize) return false;
      const minW = Math.min(target.minW ?? def.minBreite, layout.spalten);
      const minH = Math.min(target.minH ?? def.minHoehe, layout.zeilen);
      // Skalieren verschiebt das Widget nicht: Die obere linke Ecke bleibt,
      // die Größe endet am Rand der Fläche.
      const clampedW = Math.max(minW, Math.min(Math.round(w), layout.spalten - target.x));
      const clampedH = Math.max(minH, Math.min(Math.round(h), layout.zeilen - target.y));
      const candidate = clampItemToGrid(
        { ...target, w: clampedW, h: clampedH },
        layout.spalten,
        layout.zeilen,
      );
      if (candidate.w === target.w && candidate.h === target.h) return false;
      if (hasCollision(candidate, layout.items)) return false;
      commitActiveItems(layout.items.map((i) => (i.id === id ? candidate : i)));
      return true;
    },

    addItem: (typ) => {
      const layout = selectActiveLayer(get());
      const def = PANEL_REGISTRY[typ];
      const slot = findSlot(
        layout,
        { w: def.standardBreite, h: def.standardHoehe },
        { w: def.minBreite, h: def.minHoehe },
      );
      if (!slot) return false;
      const item: LayoutItem = {
        id: nextId(`panel-${typ}`),
        panelTyp: typ,
        titel: def.standardTitel,
        ...slot,
      };
      commitActiveItems([...layout.items, item], { addPanelOpen: false });
      return true;
    },

    removeItem: (id) => {
      const layout = selectActiveLayer(get());
      const { selectedPanelId } = get();
      commitActiveItems(
        layout.items.filter((i) => i.id !== id),
        { selectedPanelId: selectedPanelId === id ? null : selectedPanelId },
      );
    },

    duplicateItem: (id) => {
      const layout = selectActiveLayer(get());
      const target = layout.items.find((i) => i.id === id);
      if (!target) return false;
      const def = PANEL_REGISTRY[target.panelTyp];
      const slot = findSlot(
        layout,
        { w: target.w, h: target.h },
        { w: target.minW ?? def.minBreite, h: target.minH ?? def.minHoehe },
      );
      if (!slot) return false;
      const copy: LayoutItem = { ...target, id: nextId(`panel-${target.panelTyp}`), ...slot };
      commitActiveItems([...layout.items, copy]);
      return true;
    },

    setActiveLayer: (id) => {
      const { layers, activeLayerId } = get();
      if (id === activeLayerId || !layers.some((l) => l.id === id)) return;
      commit({ layers, activeLayerId: id }, { selectedPanelId: null });
    },

    addLayer: (name) => {
      const { layers } = get();
      const normalized = name ? normalizeLayerName(name) : "";
      const layer: WorkspaceLayout = {
        id: nextId("layer"),
        name: normalized || nextLayerName(layers),
        spalten: DEFAULT_LAYOUT.spalten,
        zeilen: DEFAULT_LAYOUT.zeilen,
        abstand: DEFAULT_LAYOUT.abstand,
        items: [],
      };
      commit({ layers: [...layers, layer], activeLayerId: layer.id }, { selectedPanelId: null });
      return layer.id;
    },

    renameLayer: (id, name) => {
      const { layers, activeLayerId } = get();
      const normalized = normalizeLayerName(name);
      const target = layers.find((l) => l.id === id);
      if (!target || !normalized || normalized === target.name) return false;
      commit({
        layers: layers.map((l) => (l.id === id ? { ...l, name: normalized } : l)),
        activeLayerId,
      });
      return true;
    },

    removeLayer: (id) => {
      const { layers, activeLayerId } = get();
      if (layers.length <= 1) return false;
      const index = layers.findIndex((l) => l.id === id);
      if (index === -1) return false;
      const next = layers.filter((l) => l.id !== id);
      // Wird der aktive Layer entfernt, rückt der vorherige (oder der erste) nach.
      const nextActive =
        activeLayerId === id ? next[Math.max(0, index - 1)].id : activeLayerId;
      commit({ layers: next, activeLayerId: nextActive }, { selectedPanelId: null });
      return true;
    },

    resetActiveLayer: () => {
      const active = selectActiveLayer(get());
      // Der Start-Layer kehrt zu den Standard-Widgets zurück, eigene Layer
      // werden geleert (ihr Ausgangszustand).
      const items =
        active.id === DEFAULT_LAYOUT.id ? cloneLayout(DEFAULT_LAYOUT).items : [];
      commitActiveItems(items, { selectedPanelId: null });
    },

    loadWorkspace: () => {
      const loaded = loadWorkspaceFromStorage();
      if (loaded) set({ ...loaded, selectedPanelId: null });
    },
  };
});
