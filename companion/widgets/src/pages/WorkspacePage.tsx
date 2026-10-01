import { useEffect } from "react";
import { WorkspaceHeader } from "../features/workspace/components/WorkspaceHeader";
import { WorkspaceGrid } from "../features/workspace/components/WorkspaceGrid";
import { AddPanelModal } from "../features/workspace/components/AddPanelModal";
import { useWorkspaceStore } from "../features/workspace/model/workspace.store";

export function WorkspacePage() {
  const loadWorkspace = useWorkspaceStore((s) => s.loadWorkspace);
  const activeLayerId = useWorkspaceStore((s) => s.activeLayerId);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  return (
    // Feste Bildschirmhöhe ohne Seiten-Scroll: Header oben, die Fläche füllt
    // den Rest. So kollidiert Ziehen und Skalieren auf Touch nie mit Scrollen.
    <div className="flex h-dvh flex-col overflow-hidden bg-surface text-text">
      <WorkspaceHeader />
      <main className="flex min-h-0 flex-1 flex-col p-2 sm:p-3 lg:px-5 lg:py-4">
        <div className="mx-auto min-h-0 w-full max-w-screen-2xl flex-1">
          {/* key: Beim Layer-Wechsel startet das Grid frisch (kein hängender Drag). */}
          <WorkspaceGrid key={activeLayerId} />
        </div>
      </main>
      <AddPanelModal />
    </div>
  );
}
