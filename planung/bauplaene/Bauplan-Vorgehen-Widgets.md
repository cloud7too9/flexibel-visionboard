# Bauplan: Vorgehen Widgets

Stand: 01.10.2026 · Grundlage: Vorgehen-Widgets

Dieser Bauplan beschreibt die technischen Entscheidungen. Die Anpassung an das konkrete Projekt gehört nicht dazu.

## Ziel

Die Widgets der Companion PWA werden in einer festen Reihenfolge umgesetzt. Was noch nicht geplant ist, wird nicht vorweggenommen, aber so vorbereitet, dass es später ohne Umbau dazukommt.

## Planungsstand

| Schritt | Inhalt | Stand |
| --- | --- | --- |
| 1 | Inhalte sammeln über alle Bereiche | erledigt |
| 2 | Theme pro Bereich zuordnen | teilweise |
| 3 | Vereinheitlichen: Inhalte zusammenfassen, die eigentlich ein Widget in verschiedenen Größen sind | offen |
| 4 | Größen festlegen im 32-Spalten-Raster | offen |

## Umsetzungsreihenfolge für Claude Code

1. Bauplan-Raster-32-Spalten
2. Bauplan-Widget-Groessensystem
3. Bauplan-Widget-Struktur
4. Bauplan-Widget-Inhalte (Register mit Platzhalter-Stufen)
5. Bauplan-Bereichs-Themes

Größenstufen der einzelnen Widgets erst nach Planungsschritt 4.

## Vorbereitung auf die Vereinheitlichung

Mehrere Bereiche folgen dem Muster „ein Einzelstück aus einer Sammlung als Widget“:

- Einzelkoordinate / Koordinatensammlung (Karte)
- Einzelobjekt / Listen (Sammelobjekte)
- Einzelner Eintrag (Handbuch)
- Einzelner Bauplan (Baupläne)
- Banner mit Bauplan (Banner)
- Rüstungs-Set mit Bauplan (Rüstung)

Kandidat ist ein gemeinsamer Widget-Typ „Einzeleintrag“, der sich nur in Inhalt und Bereichs-Theme unterscheidet. **Nicht entschieden**, deshalb:

- Diese Typen vorerst getrennt umsetzen.
- Darstellung so schneiden, dass Inhalt (Datenquelle, Renderer) und Rahmen (Gehäuse, Theme) getrennt sind. Dann lässt sich der Rahmen später teilen.
- Typ-IDs stabil halten, damit eine Zusammenlegung über eine Zuordnung alter auf neue IDs möglich ist.

## Nicht Teil dieses Bauplans (offen)

- Themes für Sammelobjekte, Banner, Rüstung
- Vereinheitlichung (Planungsschritt 3)
- Größenstufen je Widget
- Verhalten auf dem Handy
- Vollbild Pflicht oder optional
- Nur Anzeige oder auch Interaktion in kleinen Widgets (z. B. abhaken)

## Git

- Jeder der fünf Baupläne auf einem eigenen Branch, nach Abschluss in den Hauptzweig zusammenführen und pushen.
- Trennung Inhalt/Rahmen als eigener Commit: „Widget-Gehäuse vom Inhalt getrennt“
