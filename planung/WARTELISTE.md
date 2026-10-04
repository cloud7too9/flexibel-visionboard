# Warteliste: was auf Max wartet

> Stand 05.10.2026 · gehört zu [`PLAN.md`](PLAN.md) und [`Integration-drei-Konzepte.md`](Integration-drei-Konzepte.md)
>
> Max hat gesagt: „Was weitere Eingaben braucht, kommt auf die Warteliste. Alles andere wird erledigt.“ Hier steht deshalb alles, was ohne Max nicht weitergeht: Haltepunkte, Nachfragen, offene Entscheidungen und Inhalte, die noch nicht beschrieben sind. Weitergearbeitet wird an allem anderen.

---

## 1. Haltepunkte (⏸): Ergebnis anschauen, OK geben

> **04.10.2026:** H1 und H3–H6 hat Max abgenommen. Die Screenshots hängen jetzt auch an jedem CI-Lauf (Download „bilder“).

Bei jedem Haltepunkt stehen Branch und Screenshots. Die Screenshots erzeugen die Playwright-Tests in `companion/tests/bilder/` (`npm test` in `companion/tests`).

| # | Haltepunkt | Branch | Was Max anschaut |
|---|---|---|---|
| ~~H1~~ | **OK (04.10.2026).** **Welt-Import (Phase 4 des Biom-Plans, Strang C):** Import-Sheet mit Anleitung, Prüfung, Fortschritt, Ergebnis | `bereich/karte-welt-upload` | `karte-mcworld.test.mjs` → Screenshots des Import-Sheets und der Biom-Ebene |
| ~~H2~~ | **Erledigt: Biom-Plan Phase 1** an der Fixture-Welt von Max (`tests/daten/fixture-seed.mcworld`): Höhenkarte `z*16 + x`, Chunkbase 8 von 8, ID 195 = Dappled Forest. Lag nur auf `bereich/karte-mcworld`, kam mit #19 nach `main`. | `main` | Offen bleiben die Realm-Welt am iPhone (Laufzeit, Speicher) und die IDs von Cherry Grove, Pale Garden und Sulfur Caves. |
| ~~H3~~ | **OK (04.10.2026).** **A2 · Raster** mit Platzhalter-Widgets auf 16:9 und 4:3 | `bereich/widgets-groessen` | `w1-raster-16x9.png`, `w1-raster-4x3.png`, `w2-stufen.png` |
| ~~H4~~ | **OK (04.10.2026).** **A4 · Galerie mit allen 13 Typen** und Karten vom Board | `bereich/widgets-register` | `w4-galerie.png`, `w6-quelle-waehlen.png`, `w5-beispielkarten.png` (ohne Board). Live ausprobieren: `npm run dev` in `companion/widgets` (ohne Board, Galerie im Bearbeiten-Modus) |
| ~~H5~~ | **OK (04.10.2026).** **A5 · Bereichs-Themes** (nicht als Haltepunkt im Plan, aber zum Anschauen) | `bereich/widgets-themes` | `w8-themes.png` (Handbuch als Buch, Baupläne blau, Portale lila), `w7-board-karten.png` (Karte: Oberwelt grün, Nether rot) |
| ~~H6~~ | **OK (04.10.2026).** **A6 · Anzeige am Handy anordnen** (Haltepunkt laut Plan): im Querformat ein Layout für die Anzeige im Zimmer anordnen | `bereich/widgets-anzeigen` | `w9-companion-anordnen-knopf.png`, `w9-anordnen-handy.png`, `w9-anordnen-auswahl.png`, `w10-anzeige-nach-anordnen.png`, `w11-anzeige-vollbild.png`. Live: Board starten, `npm run dashboard:installieren && npm run dashboard:build`, am Handy beitreten → Board → Anzeigen → „Anzeige anordnen“ |

Später, wenn es so weit ist: B3 (am echten iPhone im Flugmodus).

**Pull Requests:** Seit dem 04.10.2026 ist alles in `main`: #7, #9–#11 und #19 einzeln, die Kette A2–A6 mit B1/B2 und dem Anzeige-Link in einem Merge über #17. #12–#16 sind darin enthalten und geschlossen (Kapitel 3 in [`UEBERGABE.md`](UEBERGABE.md)). **Gemergt wird nur nach Rückfrage bei Max.**

---

## 2. Nachfragen aus dem Plan (Kapitel 8)

| Nr. | Frage | blockiert |
|---|---|---|
| ~~N1~~ | **Entschieden:** Abgehakt wird im Bereich der Companion (wie heute). „Anzeige anordnen“ ordnet nur an. | – |
| ~~N2~~ | **Entschieden: Weg 1** – React-Route `/dashboard/anordnen` aus `companion/widgets/`, geöffnet aus der Companion (Board → Anzeigen → „Anzeige anordnen“). Gebaut auf `bereich/widgets-anzeigen`. | – |
| ~~N4~~ | **Entschieden („Ja“):** Die Board-PIN im QR-Code bleibt als Zugang zum Server, die Account-PIN kommt dazu. **B2 ist gebaut** (Branch `board/identitaet`): Accounts mit eigener PIN, Auswahl beim Beitreten, Geräteschlüssel, `werBistDu()`. Wer schon beigetreten war, meldet sich einmal neu an (Name + eigene PIN). | – |
| ~~N5~~ | **Entschieden (04.10.2026): HTTPS am Board mit eigenem Zertifikat.** Das Board erzeugt sein Zertifikat selbst, jedes iPhone installiert es einmal als Profil und vertraut ihm. Bleibt im Heimnetz, kostenlos. | – (B3–B5 sind frei) |

---

## 3. Offene Entscheidungen

| Nr. | Thema | Stand bis zur Entscheidung |
|---|---|---|
| E6 / A7 | **Größenstufen je Widget** und `seitenleistenBreite` (Planungsrunde) | Die neun neuen Typen haben je eine Platzhalter-Stufe. Die größte Rasterstufe (`32 − Seitenleiste`) gibt es noch nicht. Beobachtet: „Sammel-Fortschritt“ (4×3) ist für seine Karte zu klein, „Alle Sammelobjekte“ (8×8) zeigt nur die Oberwelt-Hälfte. |
| E8 | **Themes für Sammelobjekte, Banner, Rüstung:** vertagt, wird an anderer Stelle geklärt (Max, 04.10.2026) | Oberwelt-Grün als Platzhalter mit eigener Theme-ID (A5) bleibt |
| ~~E15~~ | **Entschieden (04.10.2026): Java gibt es nirgendwo.** Bedrock ist die einzige Edition. Die Umschaltung Bedrock/Java in der Portal-Verwaltung ist entfernt, Handy und Board rechnen mit ±128. | – |
| ~~E16~~ | **Entschieden (04.10.2026): Das Board bekommt eine Sitzung.** Sie lebt, solange das Board läuft (Neustart = leere Sitzung, das gespeicherte Layout der Anzeige bleibt). Inhalte lassen sich während der Laufzeit live ändern. **„Aufs Board“** zeigt nicht mehr nur kurz groß, sondern fügt den Inhalt als **Widget an der ersten freien Stelle** ein; am Handy lässt er sich verschieben oder entfernen. | Noch nicht gebaut. Zuerst ein Bauplan „Sitzung“ zum Abnicken. Offen darin: ob `/anzeige` damit ganz wegfällt und wie QR-Code und Orte mit Kennblöcken ins Dashboard kommen. |

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

---

## 5. Integration der drei Konzepte (05.10.2026)

Plan: [`Integration-drei-Konzepte.md`](Integration-drei-Konzepte.md). Entschieden: zuerst mit `daten.json`, PostgreSQL später.

| Was | Wofür |
|---|---|
| **Merge** von `claude/integration-drei-konzepte-eucftl` nach `main` abnicken | „Auf den Pi“ startet nur aus `main`: GitHub kennt einen Workflow erst, wenn er dort liegt. |
| **Pi einrichten** nach [`koordinaten-board/pi/ANLEITUNG.md`](../koordinaten-board/pi/ANLEITUNG.md): System, `einrichten.sh`, Runner mit Label `pi`, Freigabe für Fork-Workflows, Variable `PI_AKTIV = ja` | Stufe 1 am echten Gerät. Geprüft ist bisher nur in der Cloud: Paket bauen, prüfen, verteilen, Start und SIGTERM wie unter systemd. |
| Die **drei Baupläne** (Pi-Server-und-Datenbanken, Live-Update, Server-Pause-und-Neustart) nach `planung/bauplaene/` legen | Stufen 3 und 4 brauchen die Einzelheiten: Aufbau der Release-Ordner, Format von `/version`, Befehle des Skripts `tool`, Autostart. Später PostgreSQL mit Eingang/Bestand und Verarbeiter. |
| **Merge** von `board/pwa` (hier) und `bereich/pwa` (Repo MineTool) abnicken | Stufe 2 baut auf der Companion als eigener PWA auf. Danach holt `paket-bauen.sh` die Companion aus dem anderen Repo. |
| **Anzeigegerät** für das Board festlegen (offener Punkt im Plan) | Stufe 5 (Cache und Hinweis am Board) |
| Ab wann lohnt sich der Ausbau der **prüfpflichtigen Klasse**? (offener Punkt im Plan) | bis dahin nur Struktur |
