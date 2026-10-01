# Raster: 32 Spalten, quadratische Zelle

Stand: 01.10.2026

## Ausgangslage

Für das Zellen-Raster des Dashboards war die Spaltenzahl offen (12 war nur ein Beispiel). Die Zahl sollte sich sauber teilen lassen und zum Bildschirm-Seitenverhältnis passen.

## Überlegungen

| Raster | Verhältnis | Bewertung |
| --- | --- | --- |
| 16 × 9 | 16:9 | Quadratische Zelle, aber 9 Reihen nur durch 3 teilbar, zu grob |
| 32 × 18 | 16:9 | Doppelt so fein, gut teilbar in beide Richtungen |
| 36 × 20 | 9:5 | Gut teilbar, aber kein 16:9, Zelle wäre nicht mehr randlos quadratisch |
| 64 × 36 | 16:9 | 2304 Zellen, feiner als nötig, unhandliche Zahlen |

Die Zielgeräte haben unterschiedliche Seitenverhältnisse:

| Gerät | Seitenverhältnis |
| --- | --- |
| Fernseher | 16:9 |
| Laptop | 16:9 oder 16:10 |
| iPad | 4:3 (13 Zoll) bzw. 16:11 (11 Zoll) |
| Handy | ca. 19,5:9 im Hochformat |

Kein festes Raster passt randlos auf alle Geräte; das iPad ist der größte Ausreißer.

## Lösung

- **Spaltenzahl fest: 32**, unabhängig vom Gerät. Teilbar durch 2, 4, 8, 16.
- **Zelle quadratisch (1:1).** Damit ist der offene Punkt „Seitenverhältnis einer Zelle“ erledigt.
- **Reihenzahl variabel** je nach Bildschirm-Seitenverhältnis:

| Gerät | Sichtbare Reihen bei 32 Spalten |
| --- | --- |
| 16:9 (Fernseher, Laptop) | 18 |
| 16:10 (Laptop) | 20 |
| 16:11 (iPad 11 Zoll) | 22 |
| 4:3 (iPad 13 Zoll) | 24 |
| Handy Hochformat | offen |

## Offen

- [ ] Verhalten auf dem Handy: reduzierte Spaltenzahl und Folgen für die größte Rasterstufe
