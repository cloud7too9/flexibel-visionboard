import type { PanelTyp } from "../model/workspace.types";
import { PANEL_COMPONENTS } from "../model/panel-registry";

interface Props {
  typ: PanelTyp;
}

export function PanelContentRenderer({ typ }: Props) {
  const Component = PANEL_COMPONENTS[typ];
  return <Component />;
}
