import type { LayoutItem } from "../model/workspace.types";
import { rectsOverlap } from "./layout-utils";

export function hasCollision(candidate: LayoutItem, others: LayoutItem[]): boolean {
  return others.some((o) => o.id !== candidate.id && rectsOverlap(candidate, o));
}
