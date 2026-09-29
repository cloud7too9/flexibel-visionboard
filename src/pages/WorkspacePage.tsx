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
    <div className="flex min-h-screen flex-col bg-surface text-text">
      <WorkspaceHeader />
      <main className="flex-1 px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-5">
        <div className="mx-auto w-full max-w-screen-2xl">
          {/* key: Beim Layer-Wechsel startet das Grid frisch (kein hängender Drag). */}
          <WorkspaceGrid key={activeLayerId} />
        </div>
      </main>
      <AddPanelModal />
    </div>
  );
}
