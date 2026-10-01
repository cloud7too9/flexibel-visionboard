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
import { instanzRect } from "../features/workspace/model/widget-register";

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
    expect(active().instanzen.length).toBe(DEFAULT_LAYOUT.instanzen.length);
  });
});

describe("layers", () => {
  it("adds an empty layer, activates it and persists", () => {
    const id = store().addLayer();
    expect(store().layers).toHaveLength(2);
    expect(store().activeLayerId).toBe(id);
    expect(active().instanzen).toEqual([]);
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
    store().selectPanel("w-portale");
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
  const inst = (id: string) => active().instanzen.find((i) => i.id === id)!;

  it("adds widgets to the active layer", () => {
    const second = store().addLayer();
    store().addItem("sammelobjekte.status");
    const layers = store().layers;
    expect(layers.find((l) => l.id === second)!.instanzen).toHaveLength(1);
    expect(layers.find((l) => l.id === DEFAULT_LAYOUT.id)!.instanzen.length).toBe(DEFAULT_LAYOUT.instanzen.length);
  });

  it("only widget types go onto the dashboard, never a whole area", () => {
    store().addLayer();
    expect(store().addItem("portale")).toBe(false);
    expect(store().addItem("gibt.es.nicht")).toBe(false);
    expect(store().addItem("portale.verbindungen", "egal")).toBe(true);
    expect(active().instanzen.at(-1)).toEqual(expect.objectContaining({ typ: "portale.verbindungen", stufe: "standard" }));
    expect(active().instanzen.at(-1)).not.toHaveProperty("quelle");   // Typ ohne Quelle
  });

  it("removes within the active layer", () => {
    store().removeItem("w-sammelstatus");
    expect(active().instanzen.some((i) => i.id === "w-sammelstatus")).toBe(false);
  });

  it("a type without source exists once per layer (no add, no duplicate)", () => {
    expect(store().addItem("portale.verbindungen")).toBe(false);
    expect(store().duplicateItem("w-portale")).toBe(false);
    expect(active().instanzen.filter((i) => i.typ === "portale.verbindungen")).toHaveLength(1);
    store().addLayer();
    expect(store().addItem("portale.verbindungen")).toBe(true);   // anderer Layer
    store().removeItem(active().instanzen[0].id);
    expect(store().addItem("portale.verbindungen")).toBe(true);   // wieder frei
  });

  it("types with a source are multiple: each instance with its own source, duplicates keep it", () => {
    store().addLayer();
    expect(store().addItem("banner.banner", "b_1")).toBe(true);
    expect(store().addItem("banner.banner", "b_2")).toBe(true);
    expect(active().instanzen.map((i) => i.quelle)).toEqual(["b_1", "b_2"]);
    expect(store().duplicateItem(active().instanzen[0].id)).toBe(true);
    expect(active().instanzen.at(-1)).toMatchObject({ typ: "banner.banner", quelle: "b_1" });
    expect(active().instanzen.at(-1)!.id).not.toBe(active().instanzen[0].id);
  });

  it("moves a widget cell by cell and rejects collisions", () => {
    expect(store().moveItem("w-sammelstatus", 28, 16)).toBe(true);
    // 3 Reihen hoch: bei 18 Reihen spätestens ab Reihe 15
    expect(inst("w-sammelstatus")).toMatchObject({ x: 28, y: 15 });
    expect(store().moveItem("w-sammelstatus", 0, 0)).toBe(false);
  });

  it("keeps moved widgets inside the visible rows (no scrolling below)", () => {
    store().moveItem("w-sammelstatus", 20, 500);
    const r = instanzRect(inst("w-sammelstatus"))!;
    expect(r.y + r.h).toBeLessThanOrEqual(store().reihen);
  });

  it("uses the rows of the measured area", () => {
    store().setReihen(24);   // 4:3
    expect(store().moveItem("w-sammelstatus", 28, 30)).toBe(true);
    expect(inst("w-sammelstatus")).toMatchObject({ y: 21 });
    store().setReihen(0);    // ungemessen: bleibt
    expect(store().reihen).toBe(24);
  });

  it("size follows the stage; switching keeps the top left corner and rejects collisions", () => {
    expect(instanzRect(inst("w-portale"))).toMatchObject({ w: 10, h: 6 });
    // „groß“ (12×9) würde in den Sammel-Fortschritt bei (22,0) ragen
    expect(store().setStufe("w-portale", "groß")).toBe(false);
    store().moveItem("w-sammelstatus", 28, 15);
    expect(store().setStufe("w-portale", "groß")).toBe(true);
    expect(inst("w-portale")).toMatchObject({ stufe: "groß", x: 12, y: 0 });
    expect(instanzRect(inst("w-portale"))).toMatchObject({ w: 12, h: 9 });
    expect(store().setStufe("w-portale", "riesig")).toBe(false);
    expect(store().setStufe("w-portale", "groß")).toBe(false);
  });

  it("moves inward when the new stage would cross the edge", () => {
    store().moveItem("w-sammelstatus", 12, 15);
    expect(store().moveItem("w-portale", 22, 10)).toBe(true);
    // 12×9 ab (22,10) ragte rechts und unten hinaus → rückt nach (20,9)
    expect(store().setStufe("w-portale", "groß")).toBe(true);
    expect(inst("w-portale")).toMatchObject({ stufe: "groß", x: 20, y: 9 });
  });

  it("the handle cycles through the stages that fit; a single stage stays", () => {
    store().moveItem("w-sammelstatus", 28, 15);
    expect(store().naechsteStufe("w-portale")).toBe(true);
    expect(inst("w-portale").stufe).toBe("groß");
    expect(store().naechsteStufe("w-portale")).toBe(true);
    expect(inst("w-portale").stufe).toBe("standard");
    expect(store().naechsteStufe("w-sammelstatus")).toBe(false);
  });

  it("reports when a layer is full", () => {
    store().addLayer();
    store().setReihen(8);
    // 12×8, 10×6 und 8×8 passen nebeneinander, für 4×3 ist dann kein Platz mehr
    for (const t of ["karte.gesamtkarte", "portale.verbindungen", "sammelobjekte.gesamtauflistung"]) expect(store().addItem(t)).toBe(true);
    expect(store().addItem("sammelobjekte.status")).toBe(false);
    for (const i of active().instanzen) {
      const r = instanzRect(i)!;
      expect(r.x + r.w).toBeLessThanOrEqual(RASTER_SPALTEN);
      expect(r.y + r.h).toBeLessThanOrEqual(store().reihen);
    }
  });

  it("persists widget changes of the active layer", () => {
    const second = store().addLayer();
    store().addItem("sammelobjekte.gesamtauflistung");
    const saved = loadWorkspaceFromStorage()!;
    expect(saved.layers.find((l) => l.id === second)!.instanzen).toHaveLength(1);
  });
});

describe("resetActiveLayer", () => {
  it("restores default widgets on the start layer", () => {
    store().removeItem("w-portale");
    store().resetActiveLayer();
    expect(active().instanzen.length).toBe(DEFAULT_LAYOUT.instanzen.length);
  });

  it("empties a custom layer without touching others", () => {
    store().addLayer();
    store().addItem("sammelobjekte.status");
    store().resetActiveLayer();
    expect(active().instanzen).toEqual([]);
    expect(store().layers[0].instanzen.length).toBe(DEFAULT_LAYOUT.instanzen.length);
  });
});

describe("Layout der Anzeige vom Board (A6)", () => {
  const vomBoard = {
    aktiverLayer: "l2",
    layer: [
      { id: "l1", name: "Start", instanzen: [{ id: "a", typ: "portale.verbindungen", stufe: "groß", x: 30, y: 0 }] },
      { id: "l2", name: "Sammeln", instanzen: [{ id: "b", typ: "banner.banner", stufe: "standard", x: 0, y: 0, quelle: "b_1" }, { id: "c", typ: "gibt.es.nicht", stufe: "x", x: 0, y: 0 }] },
    ],
  };

  it("übernimmt Layer und aktiven Layer, normalisiert wie beim Laden, speichert nichts im Browser", () => {
    store().layoutUebernehmen(vomBoard);
    expect(store().nurAnzeige).toBe(true);
    expect(store().activeLayerId).toBe("l2");
    expect(active().instanzen).toEqual([{ id: "b", typ: "banner.banner", stufe: "standard", x: 0, y: 0, quelle: "b_1" }]);
    expect(store().layers[0].instanzen[0]).toMatchObject({ x: 20 });   // 12 breit → rückt in die 32 Spalten
    expect(loadWorkspaceFromStorage()).toBeNull();
  });

  it("noch kein Layout am Board → Start-Layout", () => {
    store().layoutUebernehmen(null);
    expect(store().nurAnzeige).toBe(true);
    expect(active().id).toBe(DEFAULT_LAYOUT.id);
  });

  it("an der Anzeige gibt es keinen Bearbeiten-Modus, der Browser-Speicher bleibt außen vor", () => {
    store().addLayer("Lokal");
    store().layoutUebernehmen(vomBoard);
    store().setEditMode(true);
    expect(store().editMode).toBe(false);
    store().loadWorkspace();
    expect(store().layers.map((l) => l.id)).toEqual(["l1", "l2"]);
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
