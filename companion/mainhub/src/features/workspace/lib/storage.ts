import type { LayoutItem, WorkspaceData, WorkspaceLayout } from "../model/workspace.types";
import { CANONICAL_SPALTEN, CANONICAL_ZEILEN, DEFAULT_LAYOUT } from "../model/default-layout";
import { clampItemToGrid, fitItemsToRows } from "./layout-utils";

export const STORAGE_KEY = "mainhub.workspace.v1";
export const SCHEMA_VERSION = 3;

/**
 * Bis Version 2 war eine Zeile 80 px hoch plus 12 px Abstand. Im feinen
 * Raster ist eine Zeile auf Desktop etwa 17 px hoch; Faktor 5 erhält die
 * Optik ungefähr.
 */
const LEGACY_ROW_FACTOR = 5;

/** Version 1: ein einzelnes Layout ohne Layer. */
interface PersistedPayloadV1 {
  version: 1;
  layout: WorkspaceLayout;
}

/** Version 2: mehrere Layer im groben 12-Spalten-Raster. */
interface PersistedPayloadV2 {
  version: 2;
  layers: WorkspaceLayout[];
  activeLayerId: string;
}

/** Version 3: mehrere Layer im feinen Raster mit fester Fläche. */
interface PersistedPayloadV3 {
  version: 3;
  layers: WorkspaceLayout[];
  activeLayerId: string;
}

function isValidLayout(value: unknown): value is WorkspaceLayout {
  if (!value || typeof value !== "object") return false;
  const l = value as Partial<WorkspaceLayout>;
  return typeof l.id === "string" && Array.isArray(l.items);
}

/**
 * Rechnet ein Layout aus dem groben Raster (Version 1 und 2) ins feine
 * Raster um und passt es in die feste Fläche ein. Item-eigene Mindestmaße
 * stammen aus dem alten Raster und werden verworfen; es gelten die der
 * Registry.
 */
export function migrateLegacyLayout(layout: WorkspaceLayout): WorkspaceLayout {
  const legacyCols = layout.spalten > 0 ? layout.spalten : 12;
  const fx = CANONICAL_SPALTEN / legacyCols;
  const scaled: LayoutItem[] = layout.items.map(
    ({ minW: _minW, minH: _minH, maxW: _maxW, maxH: _maxH, ...item }) => ({
      ...item,
      x: Math.round(item.x * fx),
      w: Math.max(1, Math.round(item.w * fx)),
      y: item.y * LEGACY_ROW_FACTOR,
      h: Math.max(1, item.h * LEGACY_ROW_FACTOR),
    }),
  );
  const items = fitItemsToRows(scaled, CANONICAL_ZEILEN).map((it) =>
    clampItemToGrid(it, CANONICAL_SPALTEN, CANONICAL_ZEILEN),
  );
  return {
    id: layout.id,
    name: layout.name,
    spalten: CANONICAL_SPALTEN,
    zeilen: CANONICAL_ZEILEN,
    abstand: DEFAULT_LAYOUT.abstand,
    items,
  };
}

/** Stellt sicher, dass ein Layout im aktuellen Raster liegt. */
function normalizeLayout(layout: WorkspaceLayout): WorkspaceLayout {
  return {
    ...layout,
    spalten: CANONICAL_SPALTEN,
    zeilen: CANONICAL_ZEILEN,
    abstand: typeof layout.abstand === "number" ? layout.abstand : DEFAULT_LAYOUT.abstand,
    items: layout.items.map((it) => clampItemToGrid(it, CANONICAL_SPALTEN, CANONICAL_ZEILEN)),
  };
}

function withActive(layers: WorkspaceLayout[], activeLayerId: unknown): WorkspaceData {
  const active = layers.some((l) => l.id === activeLayerId)
    ? (activeLayerId as string)
    : layers[0].id;
  return { layers, activeLayerId: active };
}

/**
 * Prüft und normalisiert einen geladenen Payload. Ältere Versionen werden
 * migriert. Gibt `null` zurück, wenn die Daten unbrauchbar sind.
 */
export function parsePersistedWorkspace(raw: unknown): WorkspaceData | null {
  if (!raw || typeof raw !== "object") return null;
  const payload = raw as { version?: unknown };

  if (payload.version === 1) {
    const { layout } = raw as PersistedPayloadV1;
    if (!isValidLayout(layout)) return null;
    const migrated = migrateLegacyLayout(layout);
    return { layers: [migrated], activeLayerId: migrated.id };
  }

  if (payload.version === 2 || payload.version === 3) {
    const { layers, activeLayerId } = raw as PersistedPayloadV2 | PersistedPayloadV3;
    if (!Array.isArray(layers) || layers.length === 0) return null;
    if (!layers.every(isValidLayout)) return null;
    const convert = payload.version === 2 ? migrateLegacyLayout : normalizeLayout;
    return withActive(layers.map(convert), activeLayerId);
  }

  return null;
}

export function saveWorkspaceToStorage(data: WorkspaceData): void {
  try {
    const payload: PersistedPayloadV3 = {
      version: SCHEMA_VERSION,
      layers: data.layers,
      activeLayerId: data.activeLayerId,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore write errors (quota, private mode)
  }
}

export function loadWorkspaceFromStorage(): WorkspaceData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return parsePersistedWorkspace(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function clearWorkspaceStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
