import { IconButton } from "../../../shared/ui/IconButton";
import { useWorkspaceStore } from "../model/workspace.store";
import { widgetTyp } from "../model/widget-register";
import { navigieren, vollbildPfad } from "../../../app/navigation";
import type { Id } from "../../../shared/types/common.types";

interface Props {
  panelId: Id;
  /** WidgetTyp.id */
  typ: string;
}

export function PanelToolbar({ panelId, typ }: Props) {
  const duplicateItem = useWorkspaceStore((s) => s.duplicateItem);
  const removeItem = useWorkspaceStore((s) => s.removeItem);

  return (
    <div className="flex items-center gap-0.5" onPointerDown={(e) => e.stopPropagation()}>
      {widgetTyp(typ)?.vertrag.vollbild && (
        <IconButton label="Vollbild" onClick={() => navigieren(vollbildPfad(panelId))}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
          </svg>
        </IconButton>
      )}
      {widgetTyp(typ)?.mehrfach && (
        <IconButton
          label="Duplizieren"
          onClick={() => duplicateItem(panelId)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <rect x="4" y="4" width="11" height="11" rx="2" />
          </svg>
        </IconButton>
      )}
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
