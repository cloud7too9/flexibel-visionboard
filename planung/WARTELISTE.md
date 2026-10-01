# Warteliste: was auf Max wartet

> Stand 01.10.2026 · gehört zu [`PLAN.md`](PLAN.md)
>
> Max hat gesagt: „Was weitere Eingaben braucht, kommt auf die Warteliste. Alles andere wird erledigt.“ Hier steht deshalb alles, was ohne Max nicht weitergeht: Haltepunkte, Nachfragen, offene Entscheidungen und Inhalte, die noch nicht beschrieben sind. Weitergearbeitet wird an allem anderen.

---

## 1. Haltepunkte (⏸): Ergebnis anschauen, OK geben

Bei jedem Haltepunkt stehen Branch und Screenshots. Die Screenshots erzeugen die Playwright-Tests in `companion/tests/bilder/` (`npm test` in `companion/tests`).

| # | Haltepunkt | Branch | Was Max anschaut |
|---|---|---|---|
| H1 | **Welt-Import (Phase 4 des Biom-Plans, Strang C):** Import-Sheet mit Anleitung, Prüfung, Fortschritt, Ergebnis | `bereich/karte-welt-upload` | `karte-mcworld.test.mjs` → Screenshots des Import-Sheets und der Biom-Ebene |
| H2 | **Biom-Plan Phase 1:** Prüfungen an echten Welten (Reihenfolge der Höhenkarte, neuere Biom-IDs wie Cherry Grove, Pale Garden) | `bereich/karte-welt-upload` | **braucht Dateien von Max:** `tests/daten/fixture-seed.mcworld` und die Realm-Welt. Bis dahin laufen die Tests mit künstlichen Welten (`tests/welt-bauen.mjs`). |
| H3 | **A2 · Raster** mit Platzhalter-Widgets auf 16:9 und 4:3 | `bereich/widgets-groessen` | `w1-raster-16x9.png`, `w1-raster-4x3.png`, `w2-stufen.png` |
| H4 | **A4 · Galerie mit allen 13 Typen** und Karten vom Board | `bereich/widgets-register` | `w4-galerie.png`, `w6-quelle-waehlen.png`, `w7-board-karten.png` (echtes Board), `w5-beispielkarten.png` (ohne Board) |

Später, wenn es so weit ist: A6 (Layout am Handy anordnen), B3 (am echten iPhone im Flugmodus).

**Pull Requests:** Es ist noch keiner offen. Gemergt wird nach Plan durch Max per PR nach `main`, nach jedem Strang bzw. Haltepunkt mit OK. Die Branches bauen aufeinander auf:
`bereich/karte-welt-upload` → `board/anzeige-link` → `bereich/widgets-uebernahme` → `-raster` → `-groessen` → `-struktur` → `-register` → `-themes` (Strang C und der Anzeige-Link sind in die Widgets-Kette gemergt).

---

## 2. Nachfragen aus dem Plan (Kapitel 8)

| Nr. | Frage | blockiert |
|---|---|---|
| N1 | Wo genau wird am Handy abgehakt: im Bereich der Companion oder durch Tippen auf das leere Widget in „Anzeige anordnen“, das dann den Inhalt öffnet? | nichts Gebautes; betrifft A6 |
| N2 | Wie kommt die Steuerung ans Handy? React-Route `/dashboard/anordnen` aus `companion/widgets/` (Vorschlag) oder in der Vanilla-Seite nachgebaut? | **A6: „Anordnen am Handy“** |
| N4 | Bleibt die Board-PIN im QR-Code als Zugang zum Server, oder ersetzen die Account-PINs sie ganz? | **B2: Accounts mit PIN** |

---

## 3. Offene Entscheidungen

| Nr. | Thema | Stand bis zur Entscheidung |
|---|---|---|
| E6 / A7 | **Größenstufen je Widget** und `seitenleistenBreite` (Planungsrunde) | Die neun neuen Typen haben je eine Platzhalter-Stufe. Die größte Rasterstufe (`32 − Seitenleiste`) gibt es noch nicht. Beobachtet: „Sammel-Fortschritt“ (4×3) ist für seine Karte zu klein, „Alle Sammelobjekte“ (8×8) zeigt nur die Oberwelt-Hälfte. |
| E8 | **Themes für Sammelobjekte, Banner, Rüstung** | Oberwelt-Grün als Platzhalter mit eigener Theme-ID (A5) |
| – | **Portal-Regeln am Board:** Die Edition (Bedrock/Java) wählt jedes Handy für sich. | Die Widgets am Board rechnen mit Bedrock (Hauptedition). Soll das Board eine eigene Einstellung bekommen? |

---

## 4. Inhalte, die noch nicht beschrieben sind

Die Typen stehen im Register und in der Galerie, liefern aber nur einen Hinweis statt einer Karte.

| Widget-Typ | Was fehlt |
|---|---|
| **Koordinatensammlung** (Karte, optional) | Was ist eine „Sammlung“? Eine feste Auswahl von Orten, die man in der Companion zusammenstellt, oder z. B. alle Orte einer Kategorie? Ein Datenmodell dafür gibt es noch nicht. |
| **Eigene Liste** (Sammelobjekte) | „Frei zusammengestellt, schließt Listen nach Art ein“: Wo legt man sie an, und was steht drin? Ein Datenmodell fehlt. |
| **Gesamtkarte** | Sie zeigt vorerst einen Überblick (Orte je Dimension, angeheftete Orte). Für eine echte Karte mit Markern, „ausrichtbar auf Punkt oder Koordinate“, braucht das Kartenformat des Boards einen neuen Block (z. B. `karte` mit Ausschnitt und Markern). Das muss besprochen werden. |
| **Handbuch-Eintrag, Materialliste** | Den Bereich Handbuch gibt es noch nicht („Bereich geplant“). |
| **Bauplan** | Den Bereich Baupläne gibt es noch nicht („Bereich geplant“). |
