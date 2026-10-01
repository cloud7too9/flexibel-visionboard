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

const second: WorkspaceLayout = { ...DEFAULT_LAYOUT, id: "layer-2", name: "Arbeit", items: [] };
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
    expect(loaded!.layers[0].items.length).toBe(DEFAULT_LAYOUT.items.length);
    expect(loaded!.activeLayerId).toBe("layer-2");
  });

  it("discards layouts of older versions (96 × 48 grid, free sizes)", () => {
    for (const version of [1, 2, 3, 4]) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version, layout: DEFAULT_LAYOUT, layers: [DEFAULT_LAYOUT], activeLayerId: DEFAULT_LAYOUT.id }));
      expect(loadWorkspaceFromStorage()).toBeNull();
    }
  });

  it("size follows the stage, items stay inside the 32 columns, rows depend on the screen", () => {
    const breit = { ...DEFAULT_LAYOUT, items: [
      { id: "a", panelTyp: "aufgaben", titel: "A", stufe: "mittel", x: 30, y: 40, w: 3, h: 3 },
      { id: "b", panelTyp: "aufgaben", titel: "B", stufe: "riesig", x: 0, y: 0, w: 1, h: 1 },
      { id: "c", panelTyp: "gibt-es-nicht", titel: "C", stufe: "mittel", x: 0, y: 0, w: 1, h: 1 },
    ] };
    const parsed = parsePersistedWorkspace({ version: 5, layers: [breit], activeLayerId: breit.id })!;
    expect(parsed.layers[0].items).toMatchObject([
      { id: "a", stufe: "mittel", x: 24, w: 8, y: 40, h: 6 },
      { id: "b", stufe: "mittel", w: 8, h: 6 },
    ]);
  });

  it("falls back to the first layer when the active id is unknown", () => {
    const parsed = parsePersistedWorkspace({
      version: 5,
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
    expect(parsePersistedWorkspace({ version: 5, layers: [], activeLayerId: "x" })).toBeNull();
    expect(
      parsePersistedWorkspace({ version: 5, layers: [DEFAULT_LAYOUT, { id: "y" }], activeLayerId: "y" }),
    ).toBeNull();
  });

  it("clears stored data", () => {
    saveWorkspaceToStorage(twoLayers);
    clearWorkspaceStorage();
    expect(loadWorkspaceFromStorage()).toBeNull();
  });
});
