import { useCallback, useEffect, useRef, useState } from "react";
import { useBoardStore, type AnzeigeLayout } from "../karten/model/board.store";
import { useWorkspaceStore } from "../workspace/model/workspace.store";
import type { WorkspaceData } from "../workspace/model/workspace.types";
import { STANDARD_REIHEN } from "../workspace/lib/raster";

/** Antwort von GET/PUT /api/anzeigen/:id/layout */
interface LayoutAntwort {
  anzeige: { id: string; name: string };
  reihen: number | null;
  layout: AnzeigeLayout | null;
  vollbild: string | null;
}

export type AnordnenStatus =
  | { art: "laedt" }
  | { art: "fehler"; text: string }
  | { art: "bereit"; anzeige: { id: string; name: string }; reihen: number; reihenGemeldet: boolean; vollbild: string | null };

const meldung = (status: number) =>
  status === 401 ? "Anmeldung abgelaufen – in der Companion neu beitreten."
    : status === 404 ? "Diese Anzeige gibt es nicht (mehr)."
      : status === 422 ? "Das Board hat die Änderung abgelehnt."
        : "Board nicht erreichbar.";

/**
 * Anordnen am Handy (A6): lädt das Layout einer Anzeige in den Workspace-Store und schickt jede
 * Änderung zurück (PUT /api/anzeigen/:id/layout). Ändert ein anderes Handy gleichzeitig, kommt
 * „geaendert“ über /ws und das Layout wird neu geladen – außer während eigene Änderungen noch
 * unterwegs sind (dann gewinnt die letzte). Vollbild startet und beendet es an der Anzeige.
 */
export function useAnordnen(anzeigeId: string | null, token: string | null) {
  const modus = useBoardStore((s) => s.modus);
  const layoutVersion = useBoardStore((s) => s.layoutVersion);
  const layoutBearbeiten = useWorkspaceStore((s) => s.layoutBearbeiten);
  const setReihen = useWorkspaceStore((s) => s.setReihen);
  const [status, setStatus] = useState<AnordnenStatus>({ art: "laedt" });
  const [speichern, setSpeichern] = useState<"gespeichert" | "speichert" | { fehler: string }>("gespeichert");

  const warten = useRef<ReturnType<typeof setTimeout>>();
  const offen = useRef<WorkspaceData | null>(null);   // noch nicht gesendet
  const unterwegs = useRef(0);                          // gesendet, Antwort steht aus
  const zuletzt = useRef("");                           // Layout, wie es das Board zuletzt bestätigt hat

  const anfrage = useCallback(async (methode: string, pfad: string, body?: unknown) => {
    const res = await fetch(`/api/anzeigen/${encodeURIComponent(anzeigeId ?? "")}${pfad}`, {
      method: methode,
      headers: { authorization: `Bearer ${token}`, ...(body === undefined ? {} : { "content-type": "application/json" }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) throw Object.assign(new Error(meldung(res.status)), { status: res.status });
    return (await res.json()) as LayoutAntwort;
  }, [anzeigeId, token]);

  const uebernehmen = useCallback((a: LayoutAntwort) => {
    setStatus({ art: "bereit", anzeige: a.anzeige, reihen: a.reihen ?? STANDARD_REIHEN, reihenGemeldet: a.reihen !== null, vollbild: a.vollbild });
    setReihen(a.reihen ?? STANDARD_REIHEN);
  }, [setReihen]);

  /** Wartende Änderung jetzt senden */
  const senden = useCallback(async () => {
    clearTimeout(warten.current);
    const data = offen.current;
    if (!data) return;
    offen.current = null;
    unterwegs.current += 1;
    setSpeichern("speichert");
    try {
      const a = await anfrage("PUT", "/layout", {
        layer: data.layers.map(({ id, name, instanzen }) => ({ id, name, instanzen })),
        aktiverLayer: data.activeLayerId,
      });
      zuletzt.current = JSON.stringify(a.layout);
      uebernehmen(a);
      if (!offen.current) setSpeichern("gespeichert");
    } catch (f) {
      setSpeichern({ fehler: (f as Error).message });
    } finally {
      unterwegs.current -= 1;
    }
  }, [anfrage, uebernehmen]);

  // Verschieben, Stufe, Layer … landen hier; kurz sammeln, dann senden
  const ablage = useCallback((data: WorkspaceData) => {
    offen.current = data;
    setSpeichern("speichert");
    clearTimeout(warten.current);
    warten.current = setTimeout(() => void senden(), 250);
  }, [senden]);

  const vollbildSetzen = useCallback(async (instanzId: string | null) => {
    await senden();   // ein gerade hinzugefügtes Widget muss das Board erst kennen
    try {
      uebernehmen(await anfrage("PUT", "/vollbild", { instanzId }));
    } catch (f) {
      setSpeichern({ fehler: (f as Error).message });
    }
  }, [anfrage, senden, uebernehmen]);

  // Laden, und nach jedem „geaendert“ (anderes Handy, neue Reihen der Anzeige) neu laden
  useEffect(() => {
    if (!anzeigeId || !token || modus !== "board") return;
    let aktuell = true;
    anfrage("GET", "/layout").then((a) => {
      if (!aktuell) return;
      uebernehmen(a);
      const json = JSON.stringify(a.layout);
      // Eigenes Echo oder eigene Änderung noch unterwegs → das lokale Layout bleibt
      if (json === zuletzt.current || offen.current || unterwegs.current > 0) return;
      zuletzt.current = json;
      layoutBearbeiten(a.layout, { ablage, vollbildAktion: (id) => void vollbildSetzen(id) });
    }, (f: Error) => { if (aktuell) setStatus({ art: "fehler", text: f.message }); });
    return () => { aktuell = false; };
  }, [anzeigeId, token, modus, layoutVersion, anfrage, uebernehmen, layoutBearbeiten, ablage, vollbildSetzen]);

  useEffect(() => () => clearTimeout(warten.current), []);

  return { status, speichern, vollbildSetzen };
}
