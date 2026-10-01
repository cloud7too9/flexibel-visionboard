import { create } from "zustand";
import type { Id } from "../../../shared/types/common.types";
import type { WorkspaceData, WorkspaceLayout } from "./workspace.types";
import type { WidgetInstanz } from "./widget-struktur";
import { DEFAULT_LAYOUT } from "./default-layout";
import { instanzRect, instanzRects, widgetTyp } from "./widget-register";
import { clampItemToGrid } from "../lib/layout-utils";
import { passt } from "../lib/collision-utils";
import { loadWorkspaceFromStorage, saveWorkspaceToStorage } from "../lib/storage";
import { RASTER_SPALTEN, STANDARD_REIHEN } from "../lib/raster";
import { stufeVon, type Groessenstufe } from "./widget-vertrag";

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
  /** Neue Instanz eines Widget-Typs; false, wenn auf dem Layer kein Platz mehr frei ist. */
  addItem: (typ: string) => boolean;
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
  return { ...layout, instanzen: layout.instanzen.map((i) => ({ ...i })) };
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
 * Sucht Platz für eine neue Instanz: die Stufen der Reihe nach (zuerst die
 * gewünschte), je Stufe zeilenweise von oben links. `null`, wenn keine Stufe
 * mehr auf die Fläche passt.
 */
function findSlot(
  layout: WorkspaceLayout,
  reihen: number,
  stufen: Groessenstufe[],
): { x: number; y: number; stufe: string } | null {
  const belegt = instanzRects(layout.instanzen);
  for (const s of stufen) {
    for (let y = 0; y + s.hoehe <= reihen; y++) {
      for (let x = 0; x + s.breite <= RASTER_SPALTEN; x++) {
        if (passt({ x, y, w: s.breite, h: s.hoehe }, belegt, reihen).passt) return { x, y, stufe: s.name };
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

  /** Ersetzt die Instanzen des aktiven Layers. */
  const commitActiveItems = (instanzen: WidgetInstanz[], extra: Partial<WorkspaceState> = {}) => {
    const { layers, activeLayerId } = get();
    const active = selectActiveLayer(get());
    const next = layers.map((l) => (l.id === active.id ? { ...l, instanzen } : l));
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
      const target = layout.instanzen.find((i) => i.id === id);
      const rect = target && instanzRect(target);
      if (!target || !rect) return false;
      const candidate = clampItemToGrid({ ...rect, x, y }, RASTER_SPALTEN, get().reihen);
      if (candidate.x === target.x && candidate.y === target.y) return false;
      if (!passt(candidate, instanzRects(layout.instanzen), get().reihen).passt) return false;
      commitActiveItems(layout.instanzen.map((i) => (i.id === id ? { ...i, x: candidate.x, y: candidate.y } : i)));
      return true;
    },

    setStufe: (id, name) => {
      const layout = selectActiveLayer(get());
      const target = layout.instanzen.find((i) => i.id === id);
      const t = target && widgetTyp(target.typ);
      if (!target || !t) return false;
      const s = t.vertrag.stufen.find((x) => x.name === name);
      if (!s || s.name === target.stufe) return false;
      const reihen = get().reihen;
      // Obere linke Ecke bleibt; ragt die neue Stufe über den Rand, rückt das Widget nach innen.
      const candidate = clampItemToGrid({ id, x: target.x, y: target.y, w: s.breite, h: s.hoehe }, RASTER_SPALTEN, reihen);
      if (candidate.w !== s.breite || candidate.h !== s.hoehe) return false;   // größer als die Fläche
      if (!passt(candidate, instanzRects(layout.instanzen), reihen, t.vertrag).passt) return false;
      commitActiveItems(layout.instanzen.map((i) => (i.id === id ? { ...i, stufe: s.name, x: candidate.x, y: candidate.y } : i)));
      return true;
    },

    naechsteStufe: (id) => {
      const target = selectActiveLayer(get()).instanzen.find((i) => i.id === id);
      const t = target && widgetTyp(target.typ);
      if (!target || !t) return false;
      const { stufen } = t.vertrag;
      const start = Math.max(0, stufen.findIndex((s) => s.name === target.stufe));
      for (let n = 1; n < stufen.length; n++) {
        if (get().setStufe(id, stufen[(start + n) % stufen.length].name)) return true;
      }
      return false;
    },

    addItem: (typId) => {
      const layout = selectActiveLayer(get());
      const t = widgetTyp(typId);
      if (!t) return false;
      const slot = findSlot(layout, get().reihen, t.vertrag.stufen);
      if (!slot) return false;
      const instanz: WidgetInstanz = { id: nextId("w"), typ: t.id, ...slot };
      commitActiveItems([...layout.instanzen, instanz], { addPanelOpen: false });
      return true;
    },

    removeItem: (id) => {
      const layout = selectActiveLayer(get());
      const { selectedPanelId } = get();
      commitActiveItems(
        layout.instanzen.filter((i) => i.id !== id),
        { selectedPanelId: selectedPanelId === id ? null : selectedPanelId },
      );
    },

    duplicateItem: (id) => {
      const layout = selectActiveLayer(get());
      const target = layout.instanzen.find((i) => i.id === id);
      const t = target && widgetTyp(target.typ);
      if (!target || !t) return false;
      const slot = findSlot(layout, get().reihen, stufenAb(t.vertrag.stufen, stufeVon(t.vertrag, target.stufe).name));
      if (!slot) return false;
      commitActiveItems([...layout.instanzen, { ...target, id: nextId("w"), ...slot }]);
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
        instanzen: [],
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
      const instanzen =
        active.id === DEFAULT_LAYOUT.id ? cloneLayout(DEFAULT_LAYOUT).instanzen : [];
      commitActiveItems(instanzen, { selectedPanelId: null });
    },

    loadWorkspace: () => {
      const loaded = loadWorkspaceFromStorage();
      if (loaded) set({ ...loaded, selectedPanelId: null });
    },
  };
});
