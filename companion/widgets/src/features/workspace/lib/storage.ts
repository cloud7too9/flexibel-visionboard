import type { WorkspaceData, WorkspaceLayout } from "../model/workspace.types";
import { RASTER_SPALTEN } from "./raster";
import { clamp } from "./layout-utils";
import { widgetTyp } from "../model/widget-register";
import { stufeVon } from "../model/widget-vertrag";

export const STORAGE_KEY = "mainhub.workspace.v1";
/**
 * Version 6: Widget-Instanzen (Typ aus dem Companion-Register, Stufe, Position).
 * Layouts älterer Versionen (MainHub-Panels, 96 × 48-Raster, freie Größen)
 * werden verworfen, nicht umgerechnet – es gibt noch keine echten Nutzerdaten.
 */
export const SCHEMA_VERSION = 6;

interface PersistedPayload {
  version: 6;
  layers: WorkspaceLayout[];
  activeLayerId: string;
}

function isValidLayout(value: unknown): value is WorkspaceLayout {
  if (!value || typeof value !== "object") return false;
  const l = value as Partial<WorkspaceLayout>;
  return typeof l.id === "string" && typeof l.name === "string" && Array.isArray(l.instanzen);
}

/**
 * Instanzen unbekannter Widget-Typen fallen weg, eine unbekannte Stufe wird
 * zur Standardstufe, und alles bleibt in den 32 Spalten. Die Quelle bleibt nur
 * bei Typen mit Quelle. Die Reihen hängen
 * von der Fläche ab und werden hier nicht begrenzt.
 */
function normalizeLayout(layout: WorkspaceLayout): WorkspaceLayout {
  return {
    id: layout.id,
    name: layout.name,
    instanzen: layout.instanzen.flatMap((i) => {
      const t = i && typeof i.id === "string" ? widgetTyp(i.typ) : undefined;
      if (!t) return [];
      const s = stufeVon(t.vertrag, i.stufe);
      return [{
        id: i.id,
        typ: t.id,
        stufe: s.name,
        x: clamp(Math.round(i.x), 0, RASTER_SPALTEN - s.breite),
        y: Math.max(0, Math.round(i.y)),
        ...(t.quelle && typeof i.quelle === "string" && i.quelle ? { quelle: i.quelle.slice(0, 80) } : {}),
      }];
    }),
  };
}

/**
 * Prüft und normalisiert einen geladenen Payload; `null` bei alten Versionen und unbrauchbaren Daten.
 * Dient auch für das Layout einer Anzeige vom Board (`layoutUebernehmen` im Store).
 */
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
