import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { zahl } from "@/features/karten/lib/zahl";
import { mockKarte, mockQuellen } from "@/features/karten/lib/mock-karten";
import { zugangHolen, zugangParameter } from "@/features/karten/lib/zugang";
import { KarteAnsicht } from "@/features/karten/components/KarteAnsicht";
import { WIDGET_TYPEN } from "@/features/workspace/model/widget-register";

describe("Zahlen wie in der Companion", () => {
  it("schmales Leerzeichen als Trennung, echtes Minus", () => {
    expect(zahl(-1884)).toBe("−1 884");
    expect(zahl(260)).toBe("260");
    expect(zahl(30000000)).toBe("30 000 000");
  });
});

describe("Beispielkarten ohne Board", () => {
  it("jeder Typ im Register liefert eine Karte oder einen Hinweis", () => {
    for (const t of WIDGET_TYPEN) {
      const quelle = mockQuellen(t.id).quellen[0]?.id;
      const a = mockKarte(t.id, quelle);
      expect(a.karte !== null || Boolean(a.hinweis), t.id).toBe(true);
      expect(a.karte?.bloecke.length ?? 1).toBeLessThanOrEqual(6);
    }
  });

  it("verhält sich wie das Board: geplant, Quelle fehlt, Quelle gelöscht", () => {
    expect(mockKarte("handbuch.eintrag")).toEqual({ karte: null, hinweis: "Bereich geplant" });
    expect(mockKarte("banner.banner").hinweis).toBe("Keine Quelle gewählt");
    expect(mockKarte("banner.banner", "b_99").hinweis).toBe("Die Quelle gibt es nicht mehr");
    expect(mockKarte("banner.banner", "b_1").karte?.titel).toBe("Wappen");
    expect(mockQuellen("portale.verbindungen")).toEqual({ quelle: null, quellen: [] });
  });
});

describe("Anzeige-Link", () => {
  beforeEach(() => localStorage.clear());

  it("Schlüssel aus dem Link wird gemerkt, ohne Link aus dem Speicher", () => {
    expect(zugangHolen("")).toBeNull();
    expect(zugangHolen("?anzeige=a_1&schluessel=abc")).toEqual({ anzeige: "a_1", schluessel: "abc" });
    expect(zugangHolen("")).toEqual({ anzeige: "a_1", schluessel: "abc" });
    expect(zugangParameter(zugangHolen(""))).toEqual({ anzeige: "a_1", schluessel: "abc" });
    expect(zugangParameter(null)).toEqual({});
  });
});

describe("KarteAnsicht", () => {
  it("rendert Titel, Koordinaten mit Dimension, Zeilen, Text und Bild", () => {
    render(
      <KarteAnsicht karte={{
        titel: "Hauptbasis", unter: "Eigene Orte", dimension: "oberwelt", bloecke: [
          { art: "koordinaten", x: 260, y: 80, z: -420 },
          { art: "koordinaten", label: "Im Nether", x: 32, y: null, z: -53, dimension: "nether" },
          { art: "zeilen", zeilen: [{ label: "Status", wert: "noch offen" }] },
          { art: "text", text: "Truhe in der Netherfestung" },
          { art: "bild", daten: "data:image/png;base64,AAAA", label: "Vorschau", pixelig: true },
        ],
      }} />,
    );
    expect(screen.getByRole("heading").textContent).toBe("Hauptbasis");
    expect(screen.getByText("X 260 · Y 80 · Z −420")).toBeTruthy();
    const nether = screen.getByText("Im Nether").closest("[data-dimension]")!;
    expect(nether.getAttribute("data-dimension")).toBe("nether");
    expect(nether.textContent).toContain("X 32 · Z −53");
    expect(screen.getByText("noch offen")).toBeTruthy();
    expect(screen.getByText("Truhe in der Netherfestung")).toBeTruthy();
    expect((screen.getByAltText("Vorschau") as HTMLImageElement).style.imageRendering).toBe("pixelated");
  });
});
