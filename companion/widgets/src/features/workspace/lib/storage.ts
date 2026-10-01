import type { WorkspaceData, WorkspaceLayout } from "../model/workspace.types";
import { RASTER_SPALTEN } from "./raster";
import { clamp } from "./layout-utils";

export const STORAGE_KEY = "mainhub.workspace.v1";
/**
 * Version 4: Raster mit 32 Spalten und quadratischen Zellen. Layouts aus
 * Version 1–3 (grobes bzw. feines 96 × 48-Raster) werden verworfen, nicht
 * umgerechnet – es gibt noch keine echten Nutzerdaten (planung/PLAN.md, A1).
 */
export const SCHEMA_VERSION = 4;

interface PersistedPayload {
  version: 4;
  layers: WorkspaceLayout[];
  activeLayerId: string;
}

function isValidLayout(value: unknown): value is WorkspaceLayout {
  if (!value || typeof value !== "object") return false;
  const l = value as Partial<WorkspaceLayout>;
  return typeof l.id === "string" && typeof l.name === "string" && Array.isArray(l.items);
}

/**
 * Hält Items in den 32 Spalten. Die Reihen hängen von der Fläche ab und
 * werden hier nicht begrenzt.
 */
function normalizeLayout(layout: WorkspaceLayout): WorkspaceLayout {
  return {
    id: layout.id,
    name: layout.name,
    items: layout.items.map((it) => {
      const w = clamp(Math.round(it.w), 1, RASTER_SPALTEN);
      return {
        ...it,
        w,
        x: clamp(Math.round(it.x), 0, RASTER_SPALTEN - w),
        y: Math.max(0, Math.round(it.y)),
        h: Math.max(1, Math.round(it.h)),
      };
    }),
  };
}

/** Prüft und normalisiert einen geladenen Payload; `null` bei alten Versionen und unbrauchbaren Daten. */
export function parsePersistedWorkspace(raw: unknown): WorkspaceData | null {
  if (!raw || typeof raw !== "object") return null;
  const payload = raw as Partial<PersistedPayload> & { version?: unknown };
  if (payload.version !== SCHEMA_VERSION) return null;
  const { layers, activeLayerId } = payload;
  if (!Array.isArray(layers) || layers.length === 0 || !layers.every(isValidLayout)) return null;
  const normalized = layers.map(normalizeLayout);
  const active = normalized.some((l) => l.id === activeLayerId) ? (activeLayerId as string) : normalized[0].id;
  return { layers: normalized, activeLayerId: active };
}

export function saveWorkspaceToStorage(data: WorkspaceData): void {
  try {
    const payload: PersistedPayload = {
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
