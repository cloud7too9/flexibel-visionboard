import { create } from "zustand";
import type { QuellenAntwort, WidgetAntwort } from "../karte.types";
import { mockKarte, mockQuellen } from "../lib/mock-karten";
import { zugangHolen, zugangParameter, type Zugang } from "../lib/zugang";

/**
 * Verbindung des Dashboards zum Board-Server.
 * - „board“: Karten von GET /api/widgets/:typ, nach jedem `geaendert` über /ws lädt alles neu.
 * - „beispiel“: kein Board erreichbar (z. B. `npm run dev` allein) → feste Beispielkarten.
 */
export type BoardModus = "pruefen" | "board" | "beispiel";

interface BoardState {
  modus: BoardModus;
  /** steigt bei jeder Änderung am Board – Widgets laden dann ihre Karte neu */
  version: number;
  zugang: Zugang | null;
  starten: () => () => void;
  karteLaden: (typ: string, quelle?: string) => Promise<WidgetAntwort>;
  quellenLaden: (typ: string) => Promise<QuellenAntwort>;
}

const adresse = (pfad: string, parameter: Record<string, string>) => {
  const q = new URLSearchParams(parameter).toString();
  return `${pfad}${q ? `?${q}` : ""}`;
};

/** Läuft das Dashboard am Board? GET /api/server meldet sich als „koordinaten-board“. */
async function boardDa(): Promise<boolean> {
  try {
    const res = await fetch("/api/server", { headers: { accept: "application/json" } });
    return res.ok && (await res.json())?.name === "koordinaten-board";
  } catch {
    return false;
  }
}

async function jsonLaden<T>(url: string, beiFehler: (status: number) => T): Promise<T> {
  try {
    const res = await fetch(url);
    if (!res.ok) return beiFehler(res.status);
    return (await res.json()) as T;
  } catch {
    return beiFehler(0);
  }
}

const fehlerHinweis = (status: number) =>
  status === 403 ? "Diese Anzeige braucht ihren Anzeige-Link" : status === 404 ? "Unbekanntes Widget" : "Board nicht erreichbar";

export const useBoardStore = create<BoardState>((set, get) => ({
  modus: "pruefen",
  version: 0,
  zugang: null,

  starten: () => {
    let aus = false;
    let socket: WebSocket | null = null;
    let warten: ReturnType<typeof setTimeout> | undefined;
    let neuLaden: ReturnType<typeof setTimeout> | undefined;
    const zugang = zugangHolen();
    set({ zugang });

    // Mehrere Änderungen kurz nacheinander (z. B. Welt-Import) → einmal neu laden
    const geaendert = () => {
      clearTimeout(neuLaden);
      neuLaden = setTimeout(() => set({ version: get().version + 1 }), 150);
    };

    const verbinden = (versuch = 0) => {
      if (aus) return;
      const protokoll = location.protocol === "https:" ? "wss:" : "ws:";
      socket = new WebSocket(adresse(`${protokoll}//${location.host}/ws`, { rolle: "anzeige", ...zugangParameter(zugang) }));
      socket.onopen = () => {
        // Was während der Trennung passiert ist, kam nicht an → neu laden
        if (versuch > 0) geaendert();
        versuch = 0;
      };
      socket.onmessage = (e) => {
        try {
          if (JSON.parse(String(e.data))?.art === "geaendert") geaendert();
        } catch { /* keine JSON-Nachricht */ }
      };
      socket.onclose = () => {
        if (aus) return;
        warten = setTimeout(() => verbinden(versuch + 1), Math.min(10_000, 1000 * 2 ** versuch));
      };
    };

    void boardDa().then((da) => {
      if (aus) return;
      set({ modus: da ? "board" : "beispiel" });
      if (da) verbinden();
    });

    return () => {
      aus = true;
      clearTimeout(warten);
      clearTimeout(neuLaden);
      socket?.close();
    };
  },

  karteLaden: async (typ, quelle) => {
    if (get().modus !== "board") return mockKarte(typ, quelle);
    const parameter = { ...(quelle ? { quelle } : {}), ...zugangParameter(get().zugang) };
    return jsonLaden<WidgetAntwort>(adresse(`/api/widgets/${encodeURIComponent(typ)}`, parameter),
      (status) => ({ karte: null, hinweis: fehlerHinweis(status) }));
  },

  quellenLaden: async (typ) => {
    if (get().modus !== "board") return mockQuellen(typ);
    return jsonLaden<QuellenAntwort>(adresse(`/api/widgets/${encodeURIComponent(typ)}/quellen`, zugangParameter(get().zugang)),
      (status) => ({ quelle: null, quellen: [], fehler: fehlerHinweis(status) }));
  },
}));
