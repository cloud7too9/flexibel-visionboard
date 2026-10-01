import { describe, expect, it } from "vitest";
import {
  SEITENLEISTEN_BREITE,
  inZellen,
  stufeVon,
  vertragPruefen,
  vertragRegistrieren,
  type WidgetVertrag,
} from "@/features/workspace/model/widget-vertrag";
import { belegungBauen, passt } from "@/features/workspace/lib/collision-utils";

const vertrag: WidgetVertrag = {
  stufen: [
    { name: "klein", breite: 4, hoehe: 4, informationsumfang: "Zahl" },
    { name: "mittel", breite: 8, hoehe: 4, informationsumfang: "Zahl und Liste" },
    { name: "groß", breite: 8, hoehe: 8, informationsumfang: "alles" },
  ],
  mindest: { breite: 4, hoehe: 4 },
  maximal: { breite: 8, hoehe: 8 },
};

describe("Größen-Vertrag: Validierung beim Registrieren", () => {
  it("nimmt einen gültigen Vertrag an", () => {
    expect(vertragPruefen(vertrag)).toEqual([]);
    expect(vertragRegistrieren("test", vertrag)).toBe(vertrag);
  });

  it("lehnt Bruchteile, Nullen, zu breite und doppelte Stufen ab", () => {
    const fehler = vertragPruefen({
      stufen: [
        { name: "a", breite: 2.5, hoehe: 1, informationsumfang: "" },
        { name: "b", breite: 0, hoehe: 1, informationsumfang: "" },
        { name: "c", breite: 33, hoehe: 1, informationsumfang: "" },
        { name: "c", breite: 1, hoehe: 1, informationsumfang: "" },
      ],
      mindest: { breite: 1, hoehe: 1 },
    });
    expect(fehler).toEqual([
      "Stufe „a“: Breite und Höhe in ganzen Zellen ≥ 1",
      "Stufe „b“: Breite und Höhe in ganzen Zellen ≥ 1",
      "Stufe „c“ ist breiter als 32 Spalten",
      "Stufe „c“ doppelt",
    ]);
  });

  it("jede Stufe liegt zwischen Mindest- und Maximalgröße", () => {
    const fehler = vertragPruefen({ ...vertrag, mindest: { breite: 5, hoehe: 4 }, maximal: { breite: 8, hoehe: 6 } });
    expect(fehler).toEqual(["Stufe „klein“ ist kleiner als die Mindestgröße", "Stufe „groß“ ist größer als die Maximalgröße"]);
    expect(() => vertragRegistrieren("kaputt", { ...vertrag, stufen: [] })).toThrow("Widget „kaputt“: Mindestens eine Größenstufe angeben");
  });

  it("Stufe nach Namen, sonst die Standardstufe", () => {
    expect(stufeVon(vertrag, "groß").breite).toBe(8);
    expect(stufeVon(vertrag, "gibt es nicht").name).toBe("klein");
  });

  it("Seitenleiste bleibt offen bis zur Planung der Größenstufen (E6)", () => {
    expect(SEITENLEISTEN_BREITE).toBeNull();
  });
});

describe("inZellen: Rundung aus dem Entwurf", () => {
  it("137 × 88 px bei 11 px pro Zelle → 12 × 8 Zellen", () => {
    expect([inZellen(137, 11), inZellen(88, 11)]).toEqual([12, 8]);
  });
  it("mindestens eine Zelle", () => {
    expect(inZellen(3, 11)).toBe(1);
    expect(inZellen(0, 11)).toBe(1);
  });
});

describe("Belegungsmatrix und Passt-Prüfung", () => {
  const items = [{ id: "a", x: 0, y: 0, w: 4, h: 4 }, { id: "b", x: 28, y: 14, w: 4, h: 4 }];

  it("Belegungsmatrix 32 × reihen", () => {
    const m = belegungBauen(items, 18);
    expect(m.length).toBe(32 * 18);
    expect(m.reduce((n, v) => n + v, 0)).toBe(32);
    expect(m[0]).toBe(1);
    expect(m[3 * 32 + 3]).toBe(1);
    expect(m[4 * 32 + 4]).toBe(0);
    expect(m[17 * 32 + 31]).toBe(1);
    expect(belegungBauen(items, 18, "a").reduce((n, v) => n + v, 0)).toBe(16);
  });

  it("freie Stelle passt", () => {
    expect(passt({ x: 4, y: 0, w: 8, h: 4 }, items, 18, vertrag)).toEqual({ passt: true });
  });

  it("Überlappung → belegt, das Widget selbst zählt nicht", () => {
    expect(passt({ x: 2, y: 2, w: 4, h: 4 }, items, 18, vertrag)).toEqual({ passt: false, grund: "belegt" });
    expect(passt({ id: "a", x: 2, y: 2, w: 4, h: 4 }, items, 18, vertrag)).toEqual({ passt: true });
  });

  it("rechnet mit den Reihen der jeweiligen Anzeige", () => {
    const unten = { x: 0, y: 16, w: 4, h: 4 };
    expect(passt(unten, items, 18, vertrag)).toEqual({ passt: false, grund: "rand" });
    expect(passt(unten, items, 24, vertrag)).toEqual({ passt: true });
    expect(passt({ x: 29, y: 4, w: 4, h: 4 }, items, 24, vertrag)).toEqual({ passt: false, grund: "rand" });
  });

  it("Größe außerhalb von Mindest- und Maximalgröße → stufe", () => {
    expect(passt({ x: 4, y: 4, w: 2, h: 4 }, items, 18, vertrag)).toEqual({ passt: false, grund: "stufe" });
    expect(passt({ x: 4, y: 4, w: 10, h: 4 }, items, 18, vertrag)).toEqual({ passt: false, grund: "stufe" });
  });
});
