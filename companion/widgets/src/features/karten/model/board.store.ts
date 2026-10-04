import { create } from "zustand";
import type { QuellenAntwort, WidgetAntwort } from "../karte.types";
import { mockKarte, mockQuellen } from "../lib/mock-karten";
import { zugangHolen, zugangParameter, type Zugang } from "../lib/zugang";

/**
 * Verbindung des Dashboards zum Board-Server.
 * - „board“: Karten von GET /api/widgets/:typ, nach jedem `geaendert` über /ws lädt alles neu.
 * - „beispiel“: kein Board erreichbar (z. B. `npm run dev` allein) → feste Beispielkarten.
 * Zwei Rollen: die **Anzeige** (Anzeige-Link oder localhost; liest ihr Layout, meldet ihre Reihen)
 * und die **Steuerung** am Handy („Anzeige anordnen“, angemeldet mit dem Token der Companion).
 */
export type BoardModus = "pruefen" | "board" | "beispiel";

/** Layout der Anzeige, wie es der Server speichert (koordinaten-board/server/src/layout.js) */
export interface AnzeigeLayout {
  layer: { id: string; name: string; instanzen: unknown[] }[];
  aktiverLayer: string;
}

interface BoardState {
  modus: BoardModus;
  /** steigt bei jeder Änderung am Board – Widgets laden dann ihre Karte neu */
  version: number;
  zugang: Zugang | null;
  /** Welche Anzeige dieses Gerät ist (Anzeige-Link, localhost: „Board“); null ohne Zugang */
  anzeige: { id: string; name: string } | null;
  /** Layout der Anzeige vom Board: undefined noch nicht geladen, null noch keins gespeichert */
  layout: AnzeigeLayout | null | undefined;
  /** Widget, das die Anzeige gerade allein zeigt (vom Handy gestartet) */
  vollbild: string | null;
  /** Steuerung: Token aus der Companion (Bearer) */
  token: string | null;
  /** Steuerung: steigt, wenn sich ein Layout oder eine Anzeige ändert – „Anordnen“ lädt dann neu */
  layoutVersion: number;
  /** Ohne Token als Anzeige, mit Token als Steuerung */
  starten: (optionen?: { token?: string }) => () => void;
  /** Reihen der eigenen Fläche ans Board melden (nur am Board) */
  reihenMelden: (reihen: number) => void;
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

const anmeldung = (token: string | null): Record<string, string> => (token ? { authorization: `Bearer ${token}` } : {});

async function jsonLaden<T>(url: string, beiFehler: (status: number) => T, token: string | null = null): Promise<T> {
  try {
    const res = await fetch(url, { headers: anmeldung(token) });
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
  anzeige: null,
  layout: undefined,
  vollbild: null,
  token: null,
  layoutVersion: 0,

  starten: (optionen = {}) => {
    let aus = false;
    let socket: WebSocket | null = null;
    let warten: ReturnType<typeof setTimeout> | undefined;
    let neuLaden: ReturnType<typeof setTimeout> | undefined;
    const token = optionen.token ?? null;
    const zugang = token ? null : zugangHolen();
    set({ zugang, token });

    // Mehrere Änderungen kurz nacheinander (z. B. Welt-Import) → einmal neu laden
    const geaendert = () => {
      clearTimeout(neuLaden);
      neuLaden = setTimeout(() => set({ version: get().version + 1 }), 150);
    };

    // Anzeige: eigenes Layout laden. Steuerung: „Anordnen“ lädt das Layout der gewählten Anzeige selbst.
    const layoutLaden = async () => {
      if (token) { set({ layoutVersion: get().layoutVersion + 1 }); return; }
      const antwort = await jsonLaden<{ anzeige: BoardState["anzeige"]; layout: AnzeigeLayout | null; vollbild?: string | null } | null>(
        adresse("/api/anzeige/layout", zugangParameter(zugang)), () => null);
      if (aus) return;
      set({ anzeige: antwort?.anzeige ?? null, layout: antwort?.layout ?? null, vollbild: antwort?.vollbild ?? null });
    };

    const verbinden = (versuch = 0) => {
      if (aus) return;
      const protokoll = location.protocol === "https:" ? "wss:" : "ws:";
      const parameter: Record<string, string> = token ? { token } : { rolle: "anzeige", ...zugangParameter(zugang) };
      socket = new WebSocket(adresse(`${protokoll}//${location.host}/ws`, parameter));
      socket.onopen = () => {
        // Was während der Trennung passiert ist, kam nicht an → neu laden
        if (versuch > 0) { geaendert(); void layoutLaden(); }
        versuch = 0;
      };
      socket.onmessage = (e) => {
        try {
          const n = JSON.parse(String(e.data));
          if (n?.art !== "geaendert") return;
          // Layout und Anzeigen betreffen keine Karte
          if (n.bereich === "layout" || n.bereich === "anzeigen") void layoutLaden();
          else geaendert();
        } catch { /* keine JSON-Nachricht */ }
      };
      socket.onclose = (e) => {
        if (aus) return;
        // 4003: kein oder ein alter Anzeige-Link, 4001: Anmeldung abgelaufen – neu verbinden hilft nicht
        if (e.code === 4003 || e.code === 4001) return geaendert();
        warten = setTimeout(() => verbinden(versuch + 1), Math.min(10_000, 1000 * 2 ** versuch));
      };
    };

    void boardDa().then(async (da) => {
      if (aus) return;
      if (da && !token) await layoutLaden();   // erst das Layout, dann den Modus – kein Aufblitzen des lokalen Layouts
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

  reihenMelden: (() => {
    let warten: ReturnType<typeof setTimeout> | undefined;
    let gemeldet = 0;
    return (reihen: number) => {
      if (get().modus !== "board" || get().token || reihen === gemeldet) return;
      clearTimeout(warten);
      // Beim Größerziehen des Fensters nicht jede Zwischengröße melden
      warten = setTimeout(() => {
        gemeldet = reihen;
        void fetch(adresse("/api/anzeige/reihen", zugangParameter(get().zugang)), {
          method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ reihen }),
        }).catch(() => { gemeldet = 0; });
      }, 400);
    };
  })(),

  karteLaden: async (typ, quelle) => {
    if (get().modus !== "board") return mockKarte(typ, quelle);
    const parameter = { ...(quelle ? { quelle } : {}), ...zugangParameter(get().zugang) };
    return jsonLaden<WidgetAntwort>(adresse(`/api/widgets/${encodeURIComponent(typ)}`, parameter),
      (status) => ({ karte: null, hinweis: fehlerHinweis(status) }), get().token);
  },

  quellenLaden: async (typ) => {
    if (get().modus !== "board") return mockQuellen(typ);
    return jsonLaden<QuellenAntwort>(adresse(`/api/widgets/${encodeURIComponent(typ)}/quellen`, zugangParameter(get().zugang)),
      (status) => ({ quelle: null, quellen: [], fehler: fehlerHinweis(status) }), get().token);
  },
}));
