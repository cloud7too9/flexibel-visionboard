import { useEffect } from "react";
import { useWorkspaceStore } from "../features/workspace/model/workspace.store";
import { widgetTyp } from "../features/workspace/model/widget-register";
import { WidgetInhalt } from "../features/workspace/components/WidgetInhalt";
import { Button } from "../shared/ui/Button";
import { navigieren } from "../app/navigation";

/**
 * Vollbild (Bauplan Größensystem, Kapitel 5): eine Sonderstufe außerhalb des
 * Rasters – ein Widget allein über die ganze Fläche, mit vollem Inhalt. Nur
 * für Typen mit `vollbild: true` im Vertrag (E7). „Zurück“ zeigt wieder das
 * Raster; das Layout ändert sich dabei nicht, die Rasterposition bleibt also.
 * Später löst das Handy das Vollbild an der Anzeige aus (Phase A6).
 */
export function VollbildPage({ instanzId }: { instanzId: string }) {
  const loadWorkspace = useWorkspaceStore((s) => s.loadWorkspace);
  const item = useWorkspaceStore((s) => s.layers.flatMap((l) => l.instanzen).find((i) => i.id === instanzId));
  const typ = item && widgetTyp(item.typ);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const erlaubt = typ?.vertrag.vollbild;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-surface text-text" data-testid="vollbild">
      <header className="flex items-center justify-between gap-3 border-b border-border bg-surface-muted px-3 py-2.5 sm:px-4">
        <h1 className="truncate text-base font-semibold sm:text-lg">{typ?.name ?? "Widget"}</h1>
        <Button variant="ghost" onClick={() => navigieren("/")}>
          Zurück
        </Button>
      </header>
      <main className="min-h-0 flex-1 overflow-auto p-3 sm:p-5">
        {erlaubt && item ? (
          <WidgetInhalt instanz={item} vollbild />
        ) : (
          <p role="status" className="text-sm text-text-muted">
            {item ? "Dieses Widget hat kein Vollbild." : "Dieses Widget gibt es nicht (mehr)."}
          </p>
        )}
      </main>
    </div>
  );
}
