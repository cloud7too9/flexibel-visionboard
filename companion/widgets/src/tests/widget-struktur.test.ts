import { describe, expect, it } from "vitest";
import { BEREICHE, zusatzinhalteFuer } from "@/features/workspace/model/widget-struktur";
import { WIDGET_TYPEN, instanzRect, widgetTyp } from "@/features/workspace/model/widget-register";
import { galerieGruppen } from "@/features/workspace/components/AddPanelModal";

describe("Widget-Struktur", () => {
  it("Bereichs-IDs wie in BEREICHE der Companion", () => {
    expect(BEREICHE.map((b) => b.id)).toEqual(["karte", "sammelobjekte", "portale", "handbuch", "bauplaene", "banner", "ruestung"]);
  });

  it("jeder Typ gehört zu einem Bereich, IDs sind stabil und eindeutig", () => {
    for (const t of WIDGET_TYPEN) {
      expect(BEREICHE.some((b) => b.id === t.bereich)).toBe(true);
      expect(t.id.startsWith(`${t.bereich}.`)).toBe(true);
    }
    expect(new Set(WIDGET_TYPEN.map((t) => t.id)).size).toBe(WIDGET_TYPEN.length);
  });

  it("Größe einer Instanz folgt aus der Stufe", () => {
    expect(instanzRect({ id: "i", typ: "portale.verbindungen", stufe: "groß", x: 1, y: 2 })).toEqual({ id: "i", x: 1, y: 2, w: 12, h: 9 });
    expect(instanzRect({ id: "i", typ: "portale.verbindungen", stufe: "gibt es nicht", x: 0, y: 0 })).toMatchObject({ w: 10, h: 6 });
    expect(instanzRect({ id: "i", typ: "portale", stufe: "standard", x: 0, y: 0 })).toBeNull();
  });

  it("Zusatzinhalte erst ab ihrer Stufe (Tipps der Portal-Verwaltung ab „groß“)", () => {
    const portale = widgetTyp("portale.verbindungen")!;
    expect(zusatzinhalteFuer(portale, "standard")).toEqual([]);
    expect(zusatzinhalteFuer(portale, "groß").map((z) => z.inhalt)).toEqual(["Tipps: Mindestabstand zwischen Portalen je Dimension"]);
    expect(zusatzinhalteFuer(portale, "gibt es nicht")).toEqual([]);
    expect(zusatzinhalteFuer(widgetTyp("sammelobjekte.status")!, "standard")).toEqual([]);
  });
});

describe("Galerie", () => {
  it("gruppiert nach Bereich in der Reihenfolge der Companion", () => {
    const g = galerieGruppen("");
    expect(g.map((x) => x.bereich.id)).toEqual(["karte", "sammelobjekte", "portale"]);
    expect(g[1].typen.map((t) => t.id)).toEqual(["sammelobjekte.gesamtauflistung", "sammelobjekte.status"]);
  });

  it("Suche nach Widget- und Bereichsnamen", () => {
    expect(galerieGruppen("fortschritt").flatMap((g) => g.typen.map((t) => t.id))).toEqual(["sammelobjekte.status"]);
    expect(galerieGruppen("portal-verwaltung").map((g) => g.bereich.id)).toEqual(["portale"]);
    expect(galerieGruppen("xyz")).toEqual([]);
  });
});
