import { create } from "zustand";
import type { Id } from "../../../shared/types/common.types";
import type { LayoutItem, PanelTyp, WorkspaceData, WorkspaceLayout } from "./workspace.types";
import { DEFAULT_LAYOUT } from "./default-layout";
import { PANEL_REGISTRY } from "./panel-registry";
import { clampItemToGrid } from "../lib/layout-utils";
import { passt } from "../lib/collision-utils";
import { stufeVon, type Groessenstufe } from "./widget-vertrag";
import { loadWorkspaceFromStorage, saveWorkspaceToStorage } from "../lib/storage";
import { RASTER_SPALTEN, STANDARD_REIHEN } from "../lib/raster";

export const LAYER_NAME_MAX_LENGTH = 40;

interface WorkspaceState {
  layers: WorkspaceLayout[];
  activeLayerId: Id;
  editMode: boolean;
  selectedPanelId: Id | null;
  addPanelOpen: boolean;
  /** Reihen der sichtbaren Fläche (aus dem Raster); Spalten sind immer RASTER_SPALTEN. */
  reihen: number;

  setReihen: (reihen: number) => void;
  setEditMode: (value: boolean) => void;
  toggleEditMode: () => void;
  selectPanel: (id: Id | null) => void;
  openAddPanel: () => void;
  closeAddPanel: () => void;

  // Widgets – wirken immer auf den aktiven Layer.
  moveItem: (id: Id, x: number, y: number) => boolean;
  /** Andere Größenstufe aus dem Vertrag; die obere linke Ecke bleibt, am Rand rückt das Widget nach innen. */
  setStufe: (id: Id, stufe: string) => boolean;
  /** Griff zum Vergrößern: zur nächsten Stufe, die an dieser Stelle passt (reihum). */
  naechsteStufe: (id: Id) => boolean;
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
 * Sucht Platz für ein neues Widget: die Stufen der Reihe nach (zuerst die
 * gewünschte), je Stufe zeilenweise von oben links. `null`, wenn keine Stufe
 * mehr auf die Fläche passt.
 */
function findSlot(
  layout: WorkspaceLayout,
  reihen: number,
  stufen: Groessenstufe[],
): { x: number; y: number; w: number; h: number; stufe: string } | null {
  for (const s of stufen) {
    for (let y = 0; y + s.hoehe <= reihen; y++) {
      for (let x = 0; x + s.breite <= RASTER_SPALTEN; x++) {
        const kandidat = { x, y, w: s.breite, h: s.hoehe };
        if (passt(kandidat, layout.items, reihen).passt) return { ...kandidat, stufe: s.name };
      }
    }
  }
  return null;
}

/** Stufen ab der gewünschten, danach die übrigen in Vertragsreihenfolge */
const stufenAb = (alle: Groessenstufe[], zuerst: string) =>
  [...alle.filter((s) => s.name === zuerst), ...alle.filter((s) => s.name !== zuerst)];

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
    reihen: STANDARD_REIHEN,

    setReihen: (reihen) => {
      if (reihen > 0 && reihen !== get().reihen) set({ reihen });
    },
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
      const candidate = clampItemToGrid({ ...target, x, y }, RASTER_SPALTEN, get().reihen);
      if (candidate.x === target.x && candidate.y === target.y) return false;
      if (!passt(candidate, layout.items, get().reihen).passt) return false;
      commitActiveItems(layout.items.map((i) => (i.id === id ? candidate : i)));
      return true;
    },

    setStufe: (id, name) => {
      const layout = selectActiveLayer(get());
      const target = layout.items.find((i) => i.id === id);
      if (!target) return false;
      const { vertrag } = PANEL_REGISTRY[target.panelTyp];
      const s = vertrag.stufen.find((x) => x.name === name);
      if (!s || (s.name === target.stufe && s.breite === target.w && s.hoehe === target.h)) return false;
      const reihen = get().reihen;
      // Obere linke Ecke bleibt; ragt die neue Stufe über den Rand, rückt das Widget nach innen.
      const candidate = clampItemToGrid({ ...target, stufe: s.name, w: s.breite, h: s.hoehe }, RASTER_SPALTEN, reihen);
      if (candidate.w !== s.breite || candidate.h !== s.hoehe) return false;   // größer als die Fläche
      if (!passt(candidate, layout.items, reihen, vertrag).passt) return false;
      commitActiveItems(layout.items.map((i) => (i.id === id ? candidate : i)));
      return true;
    },

    naechsteStufe: (id) => {
      const target = selectActiveLayer(get()).items.find((i) => i.id === id);
      if (!target) return false;
      const { stufen } = PANEL_REGISTRY[target.panelTyp].vertrag;
      const start = Math.max(0, stufen.findIndex((s) => s.name === target.stufe));
      for (let n = 1; n < stufen.length; n++) {
        if (get().setStufe(id, stufen[(start + n) % stufen.length].name)) return true;
      }
      return false;
    },

    addItem: (typ) => {
      const layout = selectActiveLayer(get());
      const def = PANEL_REGISTRY[typ];
      const slot = findSlot(layout, get().reihen, def.vertrag.stufen);
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
      const slot = findSlot(layout, get().reihen, stufenAb(def.vertrag.stufen, stufeVon(def.vertrag, target.stufe).name));
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
