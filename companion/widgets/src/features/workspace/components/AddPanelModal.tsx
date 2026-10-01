import { useEffect, useState } from "react";
import { Modal } from "../../../shared/ui/Modal";
import { PANEL_REGISTRY, PANEL_TYPEN } from "../model/panel-registry";
import { useWorkspaceStore } from "../model/workspace.store";

export function AddPanelModal() {
  const open = useWorkspaceStore((s) => s.addPanelOpen);
  const closeAddPanel = useWorkspaceStore((s) => s.closeAddPanel);
  const addItem = useWorkspaceStore((s) => s.addItem);
  const [noSpace, setNoSpace] = useState(false);

  useEffect(() => {
    if (open) setNoSpace(false);
  }, [open]);

  return (
    <Modal open={open} title="Widget hinzufügen" onClose={closeAddPanel}>
      {noSpace && (
        <p role="alert" className="mb-3 rounded-md border border-danger/50 bg-danger/10 px-3 py-2 text-sm">
          Auf diesem Layer ist kein Platz mehr frei. Verkleinere oder entferne ein Widget, oder
          lege einen neuen Layer an.
        </p>
      )}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
        {PANEL_TYPEN.map((typ) => {
          const def = PANEL_REGISTRY[typ];
          return (
            <button
              key={typ}
              type="button"
              onClick={() => setNoSpace(!addItem(typ))}
              className="flex min-h-[44px] items-center rounded-md border border-border bg-surface px-3 py-2.5 text-left text-sm font-medium transition-colors hover:border-accent hover:bg-surface-raised sm:py-3"
            >
              {def.standardTitel}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
