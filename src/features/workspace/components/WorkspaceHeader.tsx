import { Button } from "../../../shared/ui/Button";
import { useBreakpoint } from "../../../shared/hooks/useBreakpoint";
import { useWorkspaceStore } from "../model/workspace.store";
import { getBreakpoint, CANONICAL_BREAKPOINT } from "../model/breakpoints";

export function WorkspaceHeader() {
  const editMode = useWorkspaceStore((s) => s.editMode);
  const setEditMode = useWorkspaceStore((s) => s.setEditMode);
  const openAddPanel = useWorkspaceStore((s) => s.openAddPanel);
  const resetLayout = useWorkspaceStore((s) => s.resetLayout);
  const layoutName = useWorkspaceStore((s) => s.layout.name);
  const breakpoint = useBreakpoint();
  const canonical = getBreakpoint(CANONICAL_BREAKPOINT);

  // Der Button „Bearbeiten“ ist nur auf Desktop ein Einstieg. Auf kleineren
  // Bildschirmen wird der Bearbeitungszustand ausschließlich durch langes
  // Drücken auf die Kopfzeile eines Widgets betreten, damit die Oberfläche
  // im Normalzustand keinen Platz für Bedienelemente verbraucht.
  const showEditButton = !editMode && breakpoint.name === CANONICAL_BREAKPOINT;

  return (
    <header className="border-b border-border bg-surface-muted">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <h1 className="text-base font-semibold sm:text-lg">MainHub</h1>
          <span className="truncate text-xs text-text-muted sm:text-sm">
            Workspace · {layoutName}
          </span>
          <span
            className="rounded-full border border-border px-2 py-0.5 text-[11px] leading-4 text-text-muted"
            title={`Aktive Bildschirmgröße: ${breakpoint.label} (${breakpoint.spalten} Spalten)`}
            data-testid="breakpoint-badge"
          >
            {breakpoint.label} · {breakpoint.spalten} Sp.
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
                    if (confirm("Layout auf Standard zurücksetzen?")) resetLayout();
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
      {editMode && !breakpoint.erlaubtAnordnen && (
        <p
          role="status"
          className="border-t border-border bg-surface px-3 py-2 text-xs text-text-muted sm:px-4"
        >
          Auf {breakpoint.label}-Größe werden Widgets automatisch angeordnet. Verschieben und
          Skalieren ist ab {canonical.label}-Breite (≥ {canonical.minWidth}px) möglich.
          Hinzufügen, Duplizieren und Entfernen funktionieren hier weiterhin.
        </p>
      )}
    </header>
  );
}
