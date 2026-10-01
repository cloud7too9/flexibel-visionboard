import { beforeEach, describe, expect, it } from "vitest";
import {
  createInitialWorkspace,
  nextLayerName,
  selectActiveLayer,
  useWorkspaceStore,
} from "../features/workspace/model/workspace.store";
import { DEFAULT_LAYOUT } from "../features/workspace/model/default-layout";
import { loadWorkspaceFromStorage } from "../features/workspace/lib/storage";
import { RASTER_SPALTEN } from "../features/workspace/lib/raster";

const initialState = useWorkspaceStore.getState();
const store = () => useWorkspaceStore.getState();
const active = () => selectActiveLayer(store());

beforeEach(() => {
  localStorage.clear();
  useWorkspaceStore.setState(
    { ...initialState, ...createInitialWorkspace(), editMode: false, selectedPanelId: null, reihen: 18 },
    true,
  );
});

describe("initial state", () => {
  it("starts with a single default layer", () => {
    expect(store().layers).toHaveLength(1);
    expect(active().id).toBe(DEFAULT_LAYOUT.id);
    expect(active().items.length).toBe(DEFAULT_LAYOUT.items.length);
  });
});

describe("layers", () => {
  it("adds an empty layer, activates it and persists", () => {
    const id = store().addLayer();
    expect(store().layers).toHaveLength(2);
    expect(store().activeLayerId).toBe(id);
    expect(active().items).toEqual([]);
    expect(active().name).toBe("Layer 2");
    expect(loadWorkspaceFromStorage()!.activeLayerId).toBe(id);
  });

  it("uses a given name, trimmed", () => {
    store().addLayer("  Arbeit  ");
    expect(active().name).toBe("Arbeit");
  });

  it("generates unique default names", () => {
    const layers = [
      { ...DEFAULT_LAYOUT, id: "a", name: "Start" },
      { ...DEFAULT_LAYOUT, id: "b", name: "Layer 3" },
    ];
    expect(nextLayerName(layers)).toBe("Layer 4");
  });

  it("switches the active layer and clears the selection", () => {
    const second = store().addLayer();
    store().setActiveLayer(DEFAULT_LAYOUT.id);
    store().selectPanel("panel-aufgaben");
    store().setActiveLayer(second);
    expect(store().activeLayerId).toBe(second);
    expect(store().selectedPanelId).toBeNull();
  });

  it("ignores switching to an unknown layer", () => {
    store().setActiveLayer("gibt-es-nicht");
    expect(store().activeLayerId).toBe(DEFAULT_LAYOUT.id);
  });

  it("renames a layer and rejects empty names", () => {
    expect(store().renameLayer(DEFAULT_LAYOUT.id, "Privat")).toBe(true);
    expect(active().name).toBe("Privat");
    expect(store().renameLayer(DEFAULT_LAYOUT.id, "   ")).toBe(false);
    expect(active().name).toBe("Privat");
  });

  it("never removes the last layer", () => {
    expect(store().removeLayer(DEFAULT_LAYOUT.id)).toBe(false);
    expect(store().layers).toHaveLength(1);
  });

  it("activates the previous layer when the active one is removed", () => {
    const second = store().addLayer();
    const third = store().addLayer();
    store().setActiveLayer(second);
    expect(store().removeLayer(second)).toBe(true);
    expect(store().layers.map((l) => l.id)).toEqual([DEFAULT_LAYOUT.id, third]);
    expect(store().activeLayerId).toBe(DEFAULT_LAYOUT.id);
  });

  it("keeps the active layer when another one is removed", () => {
    const second = store().addLayer();
    store().removeLayer(DEFAULT_LAYOUT.id);
    expect(store().activeLayerId).toBe(second);
  });
});

describe("widgets act on the active layer only", () => {
  it("adds widgets to the active layer", () => {
    const second = store().addLayer();
    store().addItem("aufgaben");
    const layers = store().layers;
    expect(layers.find((l) => l.id === second)!.items).toHaveLength(1);
    expect(layers.find((l) => l.id === DEFAULT_LAYOUT.id)!.items.length).toBe(
      DEFAULT_LAYOUT.items.length,
    );
  });

  it("removes and duplicates within the active layer", () => {
    store().removeItem("panel-aufgaben");
    expect(active().items.some((i) => i.id === "panel-aufgaben")).toBe(false);
    store().duplicateItem("panel-dateien");
    expect(active().items.filter((i) => i.panelTyp === "dateien")).toHaveLength(2);
  });

  it("moves a widget cell by cell and rejects collisions", () => {
    // Bei 18 Reihen endet ein 6 Reihen hohes Widget spätestens in Reihe 12.
    expect(store().moveItem("panel-toolstart", 25, 13)).toBe(true);
    expect(active().items.find((i) => i.id === "panel-toolstart")).toMatchObject({ x: 25, y: 12 });
    // Schnellnotiz liegt bei (0,0) – Kollision.
    expect(store().moveItem("panel-toolstart", 0, 0)).toBe(false);
  });

  it("keeps moved widgets inside the visible rows (no scrolling below)", () => {
    store().moveItem("panel-toolstart", 20, 500);
    const t = active().items.find((i) => i.id === "panel-toolstart")!;
    expect(t.y + t.h).toBeLessThanOrEqual(store().reihen);
  });

  it("uses the rows of the measured area", () => {
    store().setReihen(24);   // 4:3
    expect(store().moveItem("panel-toolstart", 26, 30)).toBe(true);
    expect(active().items.find((i) => i.id === "panel-toolstart")).toMatchObject({ y: 18 });
    store().setReihen(0);    // ungemessen: bleibt
    expect(store().reihen).toBe(24);
  });

  it("switches to an offered stage, keeps the top left corner and rejects collisions", () => {
    // Aufgaben liegt bei (8,0) in „mittel“ 8×6.
    expect(store().setStufe("panel-aufgaben", "klein")).toBe(true);
    expect(active().items.find((i) => i.id === "panel-aufgaben")).toMatchObject({ stufe: "klein", x: 8, y: 0, w: 6, h: 4 });
    // „groß“ (10×9) würde in Projektstatus hineinragen.
    expect(store().setStufe("panel-aufgaben", "groß")).toBe(false);
    // Unbekannte Stufe, gleiche Stufe: nichts passiert.
    expect(store().setStufe("panel-aufgaben", "riesig")).toBe(false);
    expect(store().setStufe("panel-aufgaben", "klein")).toBe(false);
  });

  it("moves inward when the new stage would cross the edge", () => {
    expect(store().moveItem("panel-letzteInhalte", 22, 12)).toBe(true);
    expect(store().setStufe("panel-letzteInhalte", "groß")).toBe(true);
    expect(active().items.find((i) => i.id === "panel-letzteInhalte")).toMatchObject({ stufe: "groß", x: 20, y: 9, w: 12, h: 9 });
  });

  it("the handle cycles through the stages that fit (no free scaling)", () => {
    // Tool-Start: „mittel“ 6×6 → „klein“ 6×4 → wieder „mittel“
    expect(store().naechsteStufe("panel-toolstart")).toBe(true);
    expect(active().items.find((i) => i.id === "panel-toolstart")).toMatchObject({ stufe: "klein", w: 6, h: 4 });
    expect(store().naechsteStufe("panel-toolstart")).toBe(true);
    expect(active().items.find((i) => i.id === "panel-toolstart")).toMatchObject({ stufe: "mittel", w: 6, h: 6 });
    // Aufgaben: „klein“ passt, „groß“ nicht → mittel → klein → mittel
    store().naechsteStufe("panel-aufgaben");
    expect(active().items.find((i) => i.id === "panel-aufgaben")!.stufe).toBe("klein");
    store().naechsteStufe("panel-aufgaben");
    expect(active().items.find((i) => i.id === "panel-aufgaben")!.stufe).toBe("mittel");
  });

  it("adds in the standard stage, falls back to a smaller stage when space runs out", () => {
    store().addLayer();
    expect(store().addItem("schnellnotiz")).toBe(true);
    expect(active().items[0]).toMatchObject({ stufe: "mittel", w: 8, h: 6, x: 0, y: 0 });
    store().setReihen(4);   // nur noch 4 Reihen: „mittel“ (6 hoch) passt nicht, „klein“ (6×4) schon
    expect(store().addItem("schnellnotiz")).toBe(true);
    expect(active().items[1]).toMatchObject({ stufe: "klein", w: 6, h: 4, x: 8, y: 0 });
    store().setReihen(3);   // 3 Reihen: keine Stufe passt mehr
    expect(store().addItem("schnellnotiz")).toBe(false);
  });

  it("reports when a layer is full", () => {
    store().addLayer();
    let added = 0;
    while (store().addItem("toolstart")) added++;
    expect(added).toBeGreaterThan(0);
    expect(store().addItem("toolstart")).toBe(false);
    expect(store().duplicateItem(active().items[0].id)).toBe(false);
    for (const it of active().items) {
      expect(it.x + it.w).toBeLessThanOrEqual(RASTER_SPALTEN);
      expect(it.y + it.h).toBeLessThanOrEqual(store().reihen);
    }
  });

  it("persists widget changes of the active layer", () => {
    const second = store().addLayer();
    store().addItem("dateien");
    const saved = loadWorkspaceFromStorage()!;
    expect(saved.layers.find((l) => l.id === second)!.items).toHaveLength(1);
  });
});

describe("resetActiveLayer", () => {
  it("restores default widgets on the start layer", () => {
    store().removeItem("panel-aufgaben");
    store().resetActiveLayer();
    expect(active().items.length).toBe(DEFAULT_LAYOUT.items.length);
  });

  it("empties a custom layer without touching others", () => {
    store().addLayer();
    store().addItem("aufgaben");
    store().resetActiveLayer();
    expect(active().items).toEqual([]);
    expect(store().layers[0].items.length).toBe(DEFAULT_LAYOUT.items.length);
  });
});

describe("loadWorkspace", () => {
  it("restores layers and the active layer from storage", () => {
    const second = store().addLayer("Arbeit");
    useWorkspaceStore.setState({ ...createInitialWorkspace() });
    store().loadWorkspace();
    expect(store().layers).toHaveLength(2);
    expect(store().activeLayerId).toBe(second);
    expect(active().name).toBe("Arbeit");
  });
});
