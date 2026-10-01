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

  it("discards layouts of the old 96 × 48 grid (versions 1–3)", () => {
    for (const version of [1, 2, 3]) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version, layout: DEFAULT_LAYOUT, layers: [DEFAULT_LAYOUT], activeLayerId: DEFAULT_LAYOUT.id }));
      expect(loadWorkspaceFromStorage()).toBeNull();
    }
  });

  it("keeps items inside the 32 columns, rows depend on the screen", () => {
    const breit = { ...DEFAULT_LAYOUT, items: [{ id: "a", panelTyp: "aufgaben", titel: "A", x: 30, y: 40, w: 8, h: 3 }] };
    const parsed = parsePersistedWorkspace({ version: 4, layers: [breit], activeLayerId: breit.id })!;
    expect(parsed.layers[0].items[0]).toMatchObject({ x: 24, w: 8, y: 40, h: 3 });
  });

  it("falls back to the first layer when the active id is unknown", () => {
    const parsed = parsePersistedWorkspace({
      version: 4,
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
    expect(parsePersistedWorkspace({ version: 4, layers: [], activeLayerId: "x" })).toBeNull();
    expect(
      parsePersistedWorkspace({ version: 4, layers: [DEFAULT_LAYOUT, { id: "y" }], activeLayerId: "y" }),
    ).toBeNull();
  });

  it("clears stored data", () => {
    saveWorkspaceToStorage(twoLayers);
    clearWorkspaceStorage();
    expect(loadWorkspaceFromStorage()).toBeNull();
  });
});
