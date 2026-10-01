import { describe, expect, it } from "vitest";
import { routeAufloesen, vollbildPfad } from "@/app/navigation";

describe("Routing", () => {
  it("Raster ist die Startseite, Unbekanntes führt dorthin", () => {
    expect(routeAufloesen("/")).toEqual({ seite: "raster" });
    expect(routeAufloesen("/irgendwas")).toEqual({ seite: "raster" });
  });

  it("Vollbild: /vollbild/:instanzId", () => {
    expect(routeAufloesen("/vollbild/panel-projektstatus")).toEqual({ seite: "vollbild", instanzId: "panel-projektstatus" });
    expect(routeAufloesen("/vollbild/panel-a/")).toEqual({ seite: "vollbild", instanzId: "panel-a" });
    expect(routeAufloesen(vollbildPfad("panel x/y"))).toEqual({ seite: "vollbild", instanzId: "panel x/y" });
  });
});
