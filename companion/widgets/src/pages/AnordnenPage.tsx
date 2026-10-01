import { useEffect, useMemo } from "react";
import { WorkspaceGrid } from "../features/workspace/components/WorkspaceGrid";
import { AddPanelModal } from "../features/workspace/components/AddPanelModal";
import { LayerSwitcher } from "../features/workspace/components/LayerSwitcher";
import { selectActiveLayer, useWorkspaceStore } from "../features/workspace/model/workspace.store";
import { widgetTyp } from "../features/workspace/model/widget-register";
import { stufeVon } from "../features/workspace/model/widget-vertrag";
import { PanelToolbar } from "../features/workspace/components/PanelToolbar";
import { RASTER_SPALTEN } from "../features/workspace/lib/raster";
import { useBoardStore } from "../features/karten/model/board.store";
import { verbindungLesen } from "../features/anordnen/anmeldung";
import { useAnordnen } from "../features/anordnen/useAnordnen";
import { Button } from "../shared/ui/Button";

/** Zurück zur Companion, die das Board unter / ausliefert */
const ZUR_COMPANION = "/";

function Hinweis({ titel, text }: { titel: string; text: string }) {
  return (
    <div className="flex h-dvh items-center justify-center bg-surface p-6 text-center text-text" data-testid="anordnen-hinweis">
      <div className="max-w-sm">
        <h1 className="text-lg font-semibold">{titel}</h1>
        <p className="mt-2 text-sm text-text-muted">{text}</p>
        <a href={ZUR_COMPANION} className="mt-4 inline-block rounded-md border border-border px-3 py-1.5 text-sm hover:border-accent">
          Zur Companion
        </a>
      </div>
    </div>
  );
}

/**
 * „Anzeige anordnen“ am Handy (A6, Weg 1 aus N2): die Fläche der gewählten Anzeige im richtigen
 * Seitenverhältnis (32 × ihre Reihen) mit leeren Widgets – Rahmen, Titel, Theme, ohne Inhalt.
 * Hier verschiebt man Widgets, wechselt die Stufe, entfernt sie, fügt über die Galerie hinzu,
 * wechselt den Layer und startet das Vollbild. Jede Änderung geht sofort an die Anzeige.
 * Geöffnet aus der Companion: Board → Anzeigen → „Anordnen“. Abgehakt wird dort, nicht hier (N1).
 */
export function AnordnenPage({ anzeigeId }: { anzeigeId: string | null }) {
  const verbindung = useMemo(verbindungLesen, []);
  const starten = useBoardStore((s) => s.starten);
  const modus = useBoardStore((s) => s.modus);
  const { status, speichern, vollbildSetzen } = useAnordnen(anzeigeId, verbindung?.token ?? null);
  const openAddPanel = useWorkspaceStore((s) => s.openAddPanel);
  const instanzen = useWorkspaceStore((s) => selectActiveLayer(s).instanzen);
  const selectedPanelId = useWorkspaceStore((s) => s.selectedPanelId);

  // Als Steuerung mit dem Token der Companion: Quellen in der Galerie, „geaendert“ über /ws
  useEffect(() => (verbindung ? starten({ token: verbindung.token }) : undefined), [verbindung, starten]);

  if (!verbindung) return <Hinweis titel="Erst beitreten" text="Zum Anordnen erst in der Companion am Board beitreten." />;
  if (!anzeigeId) return <Hinweis titel="Keine Anzeige gewählt" text="Öffne „Anordnen“ in der Companion unter Board → Anzeigen." />;
  if (modus === "beispiel") return <Hinweis titel="Kein Board erreichbar" text="Anordnen geht nur, wenn das Dashboard vom Board kommt." />;
  if (status.art === "fehler") return <Hinweis titel="Anordnen geht gerade nicht" text={status.text} />;

  const bereit = status.art === "bereit" ? status : null;
  const vollbildWidget = bereit?.vollbild ? instanzen.find((i) => i.id === bereit.vollbild) : undefined;
  const gewaehlt = instanzen.find((i) => i.id === selectedPanelId);
  const gewaehltTyp = gewaehlt && widgetTyp(gewaehlt.typ);
  const gewaehltStufe = gewaehltTyp && stufeVon(gewaehltTyp.vertrag, gewaehlt.stufe);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-surface text-text" data-testid="anordnen">
      <header className="border-b border-border bg-surface-muted">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 px-2.5 py-2 sm:px-4">
          <a href={ZUR_COMPANION} className="rounded-md border border-border px-2.5 py-1 text-sm font-medium hover:border-accent">
            Fertig
          </a>
          <h1 className="min-w-0 truncate text-sm font-semibold sm:text-base" data-testid="anordnen-titel">
            Anordnen · {bereit?.anzeige.name ?? "…"}
          </h1>
          <LayerSwitcher />
          {bereit && (
            <span className="rounded-full border border-border px-2 py-0.5 text-[11px] leading-4 text-text-muted" data-testid="raster-badge"
              title={bereit.reihenGemeldet ? "Fläche der Anzeige" : "Die Anzeige hat ihre Größe noch nicht gemeldet – angenommen 16:9"}>
              {RASTER_SPALTEN}×{bereit.reihen}{bereit.reihenGemeldet ? "" : " ?"}
            </span>
          )}
          <span className="text-[11px] text-text-muted" role={typeof speichern === "object" ? "alert" : "status"} data-testid="speichern">
            {speichern === "gespeichert" ? "Liegt auf der Anzeige" : speichern === "speichert" ? "Speichert …" : `Nicht gespeichert: ${speichern.fehler}`}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="primary" onClick={openAddPanel} disabled={!bereit}>+ Widget</Button>
          </div>
        </div>
        {vollbildWidget && (
          <div className="flex items-center gap-2 border-t border-border px-2.5 py-1.5 text-sm sm:px-4" data-testid="vollbild-aktiv">
            <span className="min-w-0 truncate">Vollbild an der Anzeige: <b>{widgetTyp(vollbildWidget.typ)?.name}</b></span>
            <Button className="ml-auto" onClick={() => void vollbildSetzen(null)}>Vollbild beenden</Button>
          </div>
        )}
        {/* Werkzeuge des gewählten Widgets – in den Widgets selbst ist am Handy kein Platz dafür */}
        <div className="flex min-h-[40px] items-center gap-2 border-t border-border px-2.5 py-1 text-sm sm:px-4" data-testid="auswahl">
          {gewaehlt && gewaehltTyp ? (
            <>
              <span className="min-w-0 truncate font-medium">{gewaehltTyp.name}</span>
              <span className="shrink-0 rounded-full border border-border px-1.5 text-[10px] leading-4 text-text-muted" data-testid="stufe">
                {gewaehlt.stufe} · {gewaehltStufe?.breite}×{gewaehltStufe?.hoehe}
              </span>
              <div className="ml-auto"><PanelToolbar panelId={gewaehlt.id} typ={gewaehlt.typ} /></div>
            </>
          ) : (
            <span className="text-xs text-text-muted">Widget antippen zum Auswählen · ziehen zum Verschieben · Ecke unten rechts: Größe</span>
          )}
        </div>
        {/* Im Hochformat wird die Fläche winzig */}
        <p className="hidden border-t border-border px-2.5 py-1.5 text-center text-xs text-text-muted portrait:block" data-testid="querformat-hinweis">
          Querformat empfohlen – dreh das Handy
        </p>
      </header>
      <main className="min-h-0 flex-1 p-1.5 sm:p-3">
        {bereit ? <WorkspaceGrid festeReihen={bereit.reihen} leer /> : <p className="p-4 text-sm text-text-muted">Lädt …</p>}
      </main>
      <AddPanelModal />
    </div>
  );
}
