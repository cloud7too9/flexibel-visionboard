import { IconButton } from "../../../shared/ui/IconButton";
import { useWorkspaceStore } from "../model/workspace.store";
import type { Id } from "../../../shared/types/common.types";

interface Props {
  panelId: Id;
}

export function PanelToolbar({ panelId }: Props) {
  const duplicateItem = useWorkspaceStore((s) => s.duplicateItem);
  const removeItem = useWorkspaceStore((s) => s.removeItem);

  return (
    <div className="flex items-center gap-0.5" onPointerDown={(e) => e.stopPropagation()}>
      <IconButton
        label="Duplizieren"
        onClick={() => duplicateItem(panelId)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <rect x="4" y="4" width="11" height="11" rx="2" />
        </svg>
      </IconButton>
      <IconButton
        label="Entfernen"
        onClick={() => removeItem(panelId)}
        className="hover:bg-danger/20 hover:text-danger"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        </svg>
      </IconButton>
    </div>
  );
}
