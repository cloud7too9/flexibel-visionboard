import { beforeEach, describe, expect, it } from "vitest";
import {
  STORAGE_KEY,
  clearWorkspaceStorage,
  loadWorkspaceFromStorage,
  parsePersistedWorkspace,
  saveWorkspaceToStorage,
} from "../features/workspace/lib/storage";
import { DEFAULT_LAYOUT } from "../features/workspace/model/default-layout";
import type { WorkspaceData, WorkspaceLayout } from "../features/workspace/model/workspace.types";

const second: WorkspaceLayout = { ...DEFAULT_LAYOUT, id: "layer-2", name: "Arbeit", instanzen: [] };
const twoLayers: WorkspaceData = { layers: [DEFAULT_LAYOUT, second], activeLayerId: "layer-2" };

beforeEach(() => {
  localStorage.clear();
});

describe("workspace storage", () => {
  it("returns null when no data is stored", () => {
    expect(loadWorkspaceFromStorage()).toBeNull();
  });

  it("roundtrips multiple layers and the active layer", () => {
    saveWorkspaceToStorage(twoLayers);
    const loaded = loadWorkspaceFromStorage();
    expect(loaded).not.toBeNull();
    expect(loaded!.layers.map((l) => l.id)).toEqual([DEFAULT_LAYOUT.id, "layer-2"]);
    expect(loaded!.layers[0].instanzen.length).toBe(DEFAULT_LAYOUT.instanzen.length);
    expect(loaded!.activeLayerId).toBe("layer-2");
  });

  it("discards layouts of older versions (MainHub panels, 96 × 48 grid, free sizes)", () => {
    for (const version of [1, 2, 3, 4, 5]) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version, layout: DEFAULT_LAYOUT, layers: [DEFAULT_LAYOUT], activeLayerId: DEFAULT_LAYOUT.id }));
      expect(loadWorkspaceFromStorage()).toBeNull();
    }
  });

  it("unknown types fall away, unknown stages become the standard stage, x stays inside 32 columns", () => {
    const layer = { ...DEFAULT_LAYOUT, instanzen: [
      { id: "a", typ: "portale.verbindungen", stufe: "groß", x: 30, y: 40, extra: 1 },
      { id: "b", typ: "portale.verbindungen", stufe: "riesig", x: 0, y: 0 },
      { id: "c", typ: "gibt.es.nicht", stufe: "standard", x: 0, y: 0 },
    ] };
    const parsed = parsePersistedWorkspace({ version: 6, layers: [layer], activeLayerId: layer.id })!;
    expect(parsed.layers[0].instanzen).toEqual([
      { id: "a", typ: "portale.verbindungen", stufe: "groß", x: 20, y: 40 },
      { id: "b", typ: "portale.verbindungen", stufe: "standard", x: 0, y: 0 },
    ]);
  });

  it("falls back to the first layer when the active id is unknown", () => {
    const parsed = parsePersistedWorkspace({
      version: 6,
      layers: [DEFAULT_LAYOUT, second],
      activeLayerId: "gibt-es-nicht",
    });
    expect(parsed!.activeLayerId).toBe(DEFAULT_LAYOUT.id);
  });

  it("returns null on malformed JSON", () => {
    localStorage.setItem(STORAGE_KEY, "{not valid json");
    expect(loadWorkspaceFromStorage()).toBeNull();
  });

  it("returns null on missing version", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ layout: DEFAULT_LAYOUT }));
    expect(loadWorkspaceFromStorage()).toBeNull();
  });

  it("returns null on unknown version", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 999, layers: [DEFAULT_LAYOUT] }));
    expect(loadWorkspaceFromStorage()).toBeNull();
  });

  it("returns null when there are no layers or a broken layer", () => {
    expect(parsePersistedWorkspace({ version: 6, layers: [], activeLayerId: "x" })).toBeNull();
    expect(
      parsePersistedWorkspace({ version: 6, layers: [DEFAULT_LAYOUT, { id: "y" }], activeLayerId: "y" }),
    ).toBeNull();
  });

  it("clears stored data", () => {
    saveWorkspaceToStorage(twoLayers);
    clearWorkspaceStorage();
    expect(loadWorkspaceFromStorage()).toBeNull();
  });
});
