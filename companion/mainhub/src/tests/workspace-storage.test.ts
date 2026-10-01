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

  it("migrates a version 1 payload into a single layer", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, layout: DEFAULT_LAYOUT }));
    const loaded = loadWorkspaceFromStorage();
    expect(loaded).not.toBeNull();
    expect(loaded!.layers).toHaveLength(1);
    expect(loaded!.layers[0].id).toBe(DEFAULT_LAYOUT.id);
    expect(loaded!.layers[0].items.length).toBe(DEFAULT_LAYOUT.items.length);
    expect(loaded!.activeLayerId).toBe(DEFAULT_LAYOUT.id);
  });

  it("converts version 1 and 2 coordinates into the fine grid", () => {
    const legacy = {
      ...DEFAULT_LAYOUT,
      spalten: 12,
      items: [
        { id: "a", panelTyp: "aufgaben", titel: "A", x: 3, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
      ],
    };
    const v2 = parsePersistedWorkspace({ version: 2, layers: [legacy], activeLayerId: legacy.id })!;
    const item = v2.layers[0].items[0];
    expect(v2.layers[0].spalten).toBe(96);
    expect(v2.layers[0].zeilen).toBe(48);
    expect(item).toMatchObject({ x: 24, w: 24, y: 10, h: 10 });
    expect(item.minW).toBeUndefined();
  });

  it("fits legacy layouts that were taller than the area", () => {
    const tall = {
      ...DEFAULT_LAYOUT,
      spalten: 12,
      items: [{ id: "a", panelTyp: "aufgaben", titel: "A", x: 0, y: 20, w: 3, h: 2 }],
    };
    const parsed = parsePersistedWorkspace({ version: 1, layout: tall })!;
    const it0 = parsed.layers[0].items[0];
    expect(it0.y + it0.h).toBeLessThanOrEqual(48);
  });

  it("falls back to the first layer when the active id is unknown", () => {
    const parsed = parsePersistedWorkspace({
      version: 2,
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

  it("returns null when a version 1 layout shape is broken", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, layout: { id: "x" } }));
    expect(loadWorkspaceFromStorage()).toBeNull();
  });

  it("returns null when version 2 has no layers or a broken layer", () => {
    expect(parsePersistedWorkspace({ version: 2, layers: [], activeLayerId: "x" })).toBeNull();
    expect(
      parsePersistedWorkspace({ version: 2, layers: [DEFAULT_LAYOUT, { id: "y" }], activeLayerId: "y" }),
    ).toBeNull();
  });

  it("clears stored data", () => {
    saveWorkspaceToStorage(twoLayers);
    clearWorkspaceStorage();
    expect(loadWorkspaceFromStorage()).toBeNull();
  });
});
