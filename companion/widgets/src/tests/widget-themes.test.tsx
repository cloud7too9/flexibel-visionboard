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

  it("Platzhalter (E8) mit eigener Theme-ID je Bereich", () => {
    expect(["sammelobjekte", "banner", "ruestung"].map((b) => themeFuer(b as never))).toEqual(["sammelobjekte", "banner", "ruestung"]);
  });

  it("das Gehäuse setzt das Theme seines Bereichs", () => {
    const { container } = render(<WidgetGehaeuse typ={widgetTyp("banner.banner")} />);
    const g = container.querySelector('[data-testid="gehaeuse"]')!;
    expect(g.getAttribute("data-theme")).toBe("banner");
    expect(g.getAttribute("data-bereich")).toBe("banner");
  });
});
