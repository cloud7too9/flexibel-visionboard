import { Button } from "../../../shared/ui/Button";
import { useWorkspaceStore } from "../model/workspace.store";

export function EmptyGridHint() {
  const openAddPanel = useWorkspaceStore((s) => s.openAddPanel);
  const editMode = useWorkspaceStore((s) => s.editMode);
  const setEditMode = useWorkspaceStore((s) => s.setEditMode);

  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center rounded-panel border border-dashed border-border px-4 py-10 text-center sm:min-h-[240px] sm:py-16">
      <div className="text-lg font-medium">Dein Workspace ist leer</div>
      <p className="mt-1 max-w-sm text-sm text-text-muted">
        Füge Widgets hinzu, um deinen Arbeitsbereich zu gestalten.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Button
          variant="primary"
          onClick={() => {
            if (!editMode) setEditMode(true);
            openAddPanel();
          }}
        >
          Widget hinzufügen
        </Button>
      </div>
    </div>
  );
}
