# Minecraft Companion & Koordinaten-Board

Zwei Projekte für eine gemeinsame Minecraft-Welt im Raum – seit dem 29.09.2026 **ein System**: Das Koordinaten-Board ist der Server der Companion und zeigt die Orte groß im Zimmer an. Jedes Projekt behält seine Technik, Tests und Doku.

| Ordner | Projekt | Stand |
|---|---|---|
| [`companion/`](companion/) | **Companion**: die App am Handy – Karte, Sammelobjekte, Portal-Verwaltung, Banner, Rüstung (eine HTML-Seite + `regeln.js`, Vanilla JS) | aktuelle Arbeit |
| [`companion/widgets/`](companion/widgets/) | **Widgets**: Widget-Dashboard fürs Board unter `/dashboard` (Vite + React + TypeScript, aus MainHub): 13 Widget-Typen, Karten vom Board, Bereichs-Themes, Layout je Anzeige | A1–A6 ohne „Anordnen am Handy“ |
| [`koordinaten-board/`](koordinaten-board/) | **Koordinaten-Board**: Server der Companion (Daten, OCR, Live-Sync) und Anzeige im Zimmer (Fastify + React) | zusammengeführt |
| [`planung/`](planung/) | **Planung**: Gesamtplan Widget-Dashboard, Offline-Sync, Welt-Import ([`PLAN.md`](planung/PLAN.md)) plus Ideen und Baupläne der Planungskommission | 01.10.2026 |
| [`referenz/`](referenz/) | **Gemeinsame Referenz**: Datenmodell, Seed-Map-Screenshots, Dashboard-Vorbild | – |

**Neuer Chat / Weitermachen:** zuerst [`UEBERGABE.md`](UEBERGABE.md) lesen (Arbeitsweise, Zusammenspiel, offene Entscheidungen), danach die Übergabe des Projekts, um das es geht. Was auf Max wartet, steht in [`planung/WARTELISTE.md`](planung/WARTELISTE.md).

## Wie die Projekte zusammenhängen

- Das **Board** liefert die Companion unter `/` aus und hält alle Daten (`koordinaten-board/server/daten/daten.json`). Handys scannen den QR-Code der Anzeige und treten mit Name + PIN bei; Änderungen kommen bei allen live an.
- Handy und Server prüfen mit **derselben Datei** `companion/regeln.js` und bauen Karten mit derselben Datei `companion/board-karten.js`.
- Die **Anzeige** (`/anzeige`) zeigt die Orte der aktiven Welt; jeder Inhalt der Companion lässt sich per „Aufs Board“ groß darauf werfen (Anzeigeschema in `BOARD_KARTEN`).
- Das **Widget-Dashboard** (`/dashboard`, in Arbeit) zeigt je Anzeige ihr Layout aus Widgets; die Inhalte sind Karten, die das Board mit denselben Anzeigeschemas baut.
- Die Texterkennung des Boards liest Seed-Map-Screenshots und Banner-Anleitungen für die Companion aus (`/api/orte/auslesen`).
- Beide nutzen dieselbe Optik (Dimensions-Themes aus `modul-a-live-karte.html`) und dieselben Seed-Map-Screenshots als Grundlage.
- `modul-a-live-karte.html`, die Hauptdatei der Companion-PWA, liegt **nicht** in diesem Repo. Max pflegt sie selbst; das Board kann sie später statt des Prototyps ausliefern (`COMPANION_DATEI`).

## Schnellstart

```bash
# Alles zusammen: Board starten, dann am Handy den QR-Code der Anzeige scannen
cd koordinaten-board && npm run installieren && npm run build && npm start   # Windows: start.bat, Linux: ./start.sh
#   Companion: http://<ip>:3000/?pin=<PIN>   Anzeige: http://localhost:3000/anzeige
#   Anzeige auf einem anderen Gerät (TV, Tablet): Anzeige-Link aus der Konsole oder Companion → Board → Anzeigen
#   Widget-Dashboard (in Arbeit): npm run dashboard:installieren && npm run dashboard:build, dann http://localhost:3000/dashboard

# Companion ohne Board (DEMO-Mock mit Beispielwelt)
open companion/companion-prototyp.html

# Tests
cd koordinaten-board && npm test                        # Server: Daten, API, Regeln, Erkennung …
cd companion/tests && npm install && npm test           # Playwright, auch gegen ein echtes Board (vorher: Board bauen)
cd companion/widgets && npm install && npm test         # Widgets: Vitest
```

Details stehen jeweils in `companion/README.md` und `koordinaten-board/README.md`.
