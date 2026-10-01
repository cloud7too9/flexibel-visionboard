# Bauplan: Widget-Größensystem

Stand: 01.10.2026 · Grundlage: Widget-Groessensystem · Setzt voraus: Bauplan-Raster-32-Spalten

Dieser Bauplan beschreibt die technischen Entscheidungen. Die Anpassung an das konkrete Projekt gehört nicht dazu.

## Ziel

Dashboard und Widgets einigen sich über einen Größen-Vertrag, der nur ganze Zellen kennt. Freie Entwurfsmaße werden beim Übergang ins Dashboard auf Zellen gerundet.

## 1. Größen-Vertrag

| Seite | Legt fest |
| --- | --- |
| Dashboard | Globales Raster (aus dem Raster-Bauplan) |
| Widget | Angebotene Größenstufen, Mindestgröße, optional Maximalgröße |

```ts
interface Groessenstufe {
  name: string;               // z. B. "klein", "mittel", "groß"
  breite: number;             // Zellen, ganzzahlig, ≥ 1
  hoehe: number;              // Zellen, ganzzahlig, ≥ 1
  informationsumfang: string; // was bei dieser Stufe angezeigt wird
}

interface WidgetVertrag {
  stufen: Groessenstufe[];
  mindest: { breite: number; hoehe: number };
  maximal?: { breite: number; hoehe: number };
  vollbild?: boolean;         // offen: Pflicht oder optional
}
```

- Vertrag beim Registrieren validieren: alle Werte ganzzahlig, jede Stufe zwischen Mindest- und Maximalgröße.

## 2. Rundung aus dem Entwurf

```ts
function inZellen(px: number, zellePxEntwurf: number): number {
  return Math.max(1, Math.round(px / zellePxEntwurf));
}
```

- Gerundet wird **bevor** ein Maß in den Vertrag wandert. Im Vertrag stehen nie Pixel.
- Beispiel: 137 × 88 px bei 11 px pro Zelle → 12 × 8 Zellen.

## 3. Passt-Prüfung

Das Dashboard prüft beim Anordnen:

- Stufe liegt zwischen Mindest- und Maximalgröße des Widgets
- `x + breite ≤ 32` und `y + hoehe ≤ reihen`
- keine Überlappung mit belegten Zellen (Belegungsmatrix 32 × reihen)

## 4. Größte Rasterstufe

- Breite: `32 − seitenleistenBreite` Spalten, damit daneben eine Spalte kleiner Widgets Platz hat (geteilter Bildschirm: Haupt-Tool plus Seitenleiste).
- `seitenleistenBreite` als zentrale Konstante, Wert noch offen.

## 5. Vollbild

- Sonderstufe **außerhalb des Rasters**: belegt die gesamte sichtbare Fläche, ein Tool allein mit vollem Informationsumfang.
- Als eigener Anzeigemodus umsetzen (Overlay oder eigene Route), nicht als Eintrag in `stufen`.
- Ein Widget mit `vollbild: true` bekommt eine Aktion „Vollbild“, Rückkehr stellt die vorherige Rasterposition wieder her.

## Nicht Teil dieses Bauplans (offen)

- Wert von `seitenleistenBreite`
- Ob Vollbild für jedes Widget Pflicht ist
- Verhalten der größten Stufe auf dem Handy

## Reihenfolge und Git

1. Typen und Vertrags-Validierung → Commit „Größen-Vertrag: Typen und Validierung“
2. `inZellen` mit Tests → Commit „Größen-Vertrag: Rundung aus dem Entwurf“
3. Belegungsmatrix und Passt-Prüfung mit Tests → Commit „Platzierungsprüfung“, danach pushen
4. Größte Stufe über `seitenleistenBreite` → Commit „Größte Rasterstufe“
5. Vollbild-Modus → Commit „Vollbild-Modus“, danach pushen
