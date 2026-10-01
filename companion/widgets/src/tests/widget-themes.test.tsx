import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BEREICHE } from "@/features/workspace/model/widget-struktur";
import { BEREICH_THEMES, themeFuer } from "@/features/workspace/model/widget-themes";
import { widgetTyp } from "@/features/workspace/model/widget-register";
import { WidgetGehaeuse } from "@/features/workspace/components/WidgetGehaeuse";

describe("Bereichs-Themes", () => {
  it("jeder Bereich hat eine Theme-Quelle, unbekannt → Standard", () => {
    expect(Object.keys(BEREICH_THEMES).sort()).toEqual(BEREICHE.map((b) => b.id).sort());
    expect(themeFuer(undefined)).toBe("standard");
  });

  it("Karte: dynamisch nach angezeigter Dimension, ohne Dimension Oberwelt", () => {
    expect(BEREICH_THEMES.karte.art).toBe("dynamisch");
    expect(themeFuer("karte", { dimension: "nether" })).toBe("karte-nether");
    expect(themeFuer("karte", { dimension: "ende" })).toBe("karte-end");
    expect(themeFuer("karte", { dimension: "oberwelt" })).toBe("karte-oberwelt");
    expect(themeFuer("karte")).toBe("karte-oberwelt");
    expect(themeFuer("portale", { dimension: "nether" })).toBe("portale");   // feste Themes bleiben
  });

  it("Platzhalter (E8) mit eigener Theme-ID je Bereich", () => {
    expect(["sammelobjekte", "banner", "ruestung"].map((b) => themeFuer(b as never))).toEqual(["sammelobjekte", "banner", "ruestung"]);
  });

  it("das Gehäuse setzt das Theme seines Bereichs", () => {
    const { container } = render(<WidgetGehaeuse typ={widgetTyp("banner.banner")} />);
    const g = container.querySelector('[data-testid="gehaeuse"]')!;
    expect(g.getAttribute("data-theme")).toBe("banner");
    expect(g.getAttribute("data-bereich")).toBe("banner");
    const karte = render(<WidgetGehaeuse typ={widgetTyp("karte.einzelkoordinate")} themeZustand={{ dimension: "nether" }} />);
    expect(karte.container.querySelector("[data-theme]")!.getAttribute("data-theme")).toBe("karte-nether");
  });

  it("Handbuch: Inhalt im Buchrahmen, andere Bereiche ohne Rahmen", () => {
    const buch = render(<WidgetGehaeuse typ={widgetTyp("handbuch.eintrag")}><p>Seite</p></WidgetGehaeuse>);
    expect(buch.container.querySelector('[data-testid="buch"]')?.textContent).toBe("Seite");
    expect(buch.container.querySelector('[data-theme]')?.getAttribute("data-theme")).toBe("handbuch");
    const portal = render(<WidgetGehaeuse typ={widgetTyp("portale.verbindungen")}><p>Liste</p></WidgetGehaeuse>);
    expect(portal.container.querySelector('[data-testid="buch"]')).toBeNull();
    expect(themeFuer("bauplaene")).toBe("bauplaene");
  });
});
