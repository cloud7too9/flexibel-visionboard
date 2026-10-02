import { Button } from "../../../shared/ui/Button";
import { selectActiveLayer, useWorkspaceStore } from "../model/workspace.store";
import { RASTER_SPALTEN } from "../lib/raster";
import { LayerSwitcher } from "./LayerSwitcher";

export function WorkspaceHeader() {
  const editMode = useWorkspaceStore((s) => s.editMode);
  const setEditMode = useWorkspaceStore((s) => s.setEditMode);
  const openAddPanel = useWorkspaceStore((s) => s.openAddPanel);
  const resetActiveLayer = useWorkspaceStore((s) => s.resetActiveLayer);
  const activeLayerName = useWorkspaceStore((s) => selectActiveLayer(s).name);
  const reihen = useWorkspaceStore((s) => s.reihen);

  // Jede Bildschirmgröße zeigt dasselbe Raster mit 32 Spalten – Bearbeiten
  // geht überall, per Knopf oder langem Drücken auf die Kopfzeile.
  const showEditButton = !editMode;

  return (
    <header className="border-b border-border bg-surface-muted">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-base font-semibold sm:text-lg">MainHub</h1>
          <LayerSwitcher />
          <span
            className="rounded-full border border-border px-2 py-0.5 text-[11px] leading-4 text-text-muted"
            title={`Raster: ${RASTER_SPALTEN} Spalten × ${reihen} Reihen, quadratische Zellen`}
            data-testid="raster-badge"
          >
            {RASTER_SPALTEN}×{reihen}
          </span>
        </div>
        {(editMode || showEditButton) && (
          <div className="flex flex-wrap items-center gap-2">
            {editMode ? (
              <>
                <Button variant="ghost" onClick={openAddPanel}>
                  <span aria-hidden="true">+</span>
                  <span className="hidden sm:inline">Widget hinzufügen</span>
                  <span className="sm:hidden">Widget</span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (confirm(`Layer „${activeLayerName}“ zurücksetzen?`)) resetActiveLayer();
                  }}
                >
                  Zurücksetzen
                </Button>
                <Button variant="primary" onClick={() => setEditMode(false)}>
                  <span className="hidden sm:inline">Bearbeitung beenden</span>
                  <span className="sm:hidden">Fertig</span>
                </Button>
              </>
            ) : (
              <Button variant="ghost" onClick={() => setEditMode(true)}>
                Bearbeiten
              </Button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
