import { WorkspacePage } from "../pages/WorkspacePage";
import { VollbildPage } from "../pages/VollbildPage";
import { useRoute } from "./navigation";

export function AppRoutes() {
  const route = useRoute();
  return route.seite === "vollbild" ? <VollbildPage instanzId={route.instanzId} /> : <WorkspacePage />;
}
