import type { WorkspaceData, WorkspaceLayout } from "../model/workspace.types";

export const STORAGE_KEY = "mainhub.workspace.v1";
export const SCHEMA_VERSION = 2;

/** Version 1: ein einzelnes Layout ohne Layer. */
interface PersistedPayloadV1 {
  version: 1;
  layout: WorkspaceLayout;
}

/** Version 2: mehrere Layer und der aktive Layer. */
interface PersistedPayloadV2 {
  version: 2;
  layers: WorkspaceLayout[];
  activeLayerId: string;
}

function isValidLayout(value: unknown): value is WorkspaceLayout {
  if (!value || typeof value !== "object") return false;
  const l = value as Partial<WorkspaceLayout>;
  return typeof l.id === "string" && Array.isArray(l.items);
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
    return { layers: [layout], activeLayerId: layout.id };
  }

  if (payload.version === 2) {
    const { layers, activeLayerId } = raw as PersistedPayloadV2;
    if (!Array.isArray(layers) || layers.length === 0) return null;
    if (!layers.every(isValidLayout)) return null;
    const active = layers.some((l) => l.id === activeLayerId) ? activeLayerId : layers[0].id;
    return { layers, activeLayerId: active };
  }

  return null;
}

export function saveWorkspaceToStorage(data: WorkspaceData): void {
  try {
    const payload: PersistedPayloadV2 = {
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
