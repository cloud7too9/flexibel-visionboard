# Bauplan: Raster mit 32 Spalten

Stand: 01.10.2026 · Grundlage: Raster-32-Spalten

Dieser Bauplan beschreibt die technischen Entscheidungen. Die Anpassung an das konkrete Projekt gehört nicht dazu.

## Ziel

Das Dashboard rastert in abstrakten, quadratischen Zellen. Die Spaltenzahl ist auf jedem Gerät gleich, nur die Pixelgröße und die Zahl der sichtbaren Reihen ändern sich.

## Festlegungen

| Eigenschaft | Wert |
| --- | --- |
| Spaltenzahl | **32**, fest, unabhängig vom Gerät |
| Zellform | **quadratisch (1:1)** |
| Zellgröße | `zellePx = sichtbareBreite / 32` |
| Reihenzahl | variabel: `reihen = floor(sichtbareHoehe / zellePx)` |

Erwartete Reihen:

| Seitenverhältnis | Geräte | Reihen |
| --- | --- | --- |
| 16:9 | Fernseher, Laptop | 18 |
| 16:10 | Laptop | 20 |
| 16:11 | iPad 11 Zoll | 22 |
| 4:3 | iPad 13 Zoll | 24 |

## Umsetzung

- Eine zentrale Konstante `RASTER_SPALTEN = 32`. Kein Widget kennt die Zahl hart.
- Ein Raster-Modul berechnet `zellePx` und `reihen` aus der sichtbaren Fläche und stellt beide bereit:

```ts
interface Raster {
  spalten: 32;
  reihen: number;
  zellePx: number;
}
```

- Neuberechnung bei jeder Größenänderung (ResizeObserver o. ä.).
- Darstellung z. B. per CSS-Grid: `grid-template-columns: repeat(32, 1fr)`, Reihenhöhe = `zellePx`, damit die Zelle quadratisch bleibt.
- Positionen und Größen werden immer in Zellen gespeichert. Pixel entstehen erst beim Rendern.
- Restfläche unter der letzten vollen Reihe bleibt leer (Folge von `floor`).

## Tests

- Für 1920 × 1080, 1440 × 900, 1180 × 820 (16:11) und 1024 × 768 die Reihenzahlen 18, 20, 22, 24 prüfen.

## Nicht Teil dieses Bauplans (offen)

- Handy im Hochformat: reduzierte Spaltenzahl und Folgen für die größte Stufe

## Reihenfolge und Git

1. Konstante und Raster-Modul mit Berechnung → Commit „Raster: 32 Spalten, quadratische Zellen“
2. Tests für die Reihenzahlen → Commit „Raster: Tests für Seitenverhältnisse“, danach pushen
3. Grid-Darstellung mit Live-Neuberechnung → Commit „Raster: Darstellung und Resize“
