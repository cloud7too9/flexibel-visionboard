import { useEffect } from "react";
import { WorkspaceHeader } from "../features/workspace/components/WorkspaceHeader";
import { WorkspaceGrid } from "../features/workspace/components/WorkspaceGrid";
import { AddPanelModal } from "../features/workspace/components/AddPanelModal";
import { useWorkspaceStore } from "../features/workspace/model/workspace.store";

export function WorkspacePage() {
  const loadLayout = useWorkspaceStore((s) => s.loadLayout);

  useEffect(() => {
    loadLayout();
  }, [loadLayout]);

  return (
    <div className="flex min-h-screen flex-col bg-surface text-text">
      <WorkspaceHeader />
      <main className="flex-1 px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-5">
        <div className="mx-auto w-full max-w-screen-2xl">
          <WorkspaceGrid />
        </div>
      </main>
      <AddPanelModal />
    </div>
  );
}
