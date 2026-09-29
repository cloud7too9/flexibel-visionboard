# Minecraft Companion & Koordinaten-Board

Zwei Projekte für eine gemeinsame Minecraft-Welt im Raum. Sie hängen zusammen, laufen aber getrennt und haben je eigene Technik, Tests und Doku.

| Ordner | Projekt | Stand |
|---|---|---|
| [`companion/`](companion/) | **Companion-PWA**: Prototyp der Bereiche Karte, Sammelobjekte, Portal-Verwaltung, Banner (eine HTML-Datei, Vanilla JS) | aktuelle Arbeit |
| [`koordinaten-board/`](koordinaten-board/) | **Koordinaten-Board**: Raum-Anzeige plus Handy-Steuerung, liest Seed-Map-Screenshots per OCR aus (Fastify + React) | fertig, läuft eigenständig |
| [`referenz/`](referenz/) | **Gemeinsame Referenz**: Datenmodell, Seed-Map-Screenshots, Dashboard-Vorbild | – |

**Neuer Chat / Weitermachen:** zuerst [`UEBERGABE.md`](UEBERGABE.md) lesen (Arbeitsweise, Zusammenspiel, offene Entscheidungen), danach die Übergabe des Projekts, um das es geht.

## Wie die Projekte zusammenhängen

- Das **Board** ist das Raum-Dashboard. Die Bereiche der **Companion** sollen später als Widgets (Dashboard-Ansichten) darauf laufen.
- Die Texterkennung des Boards (`koordinaten-board/server/src/erkennung.js`) soll den Endpunkt `/orte/auslesen` der Companion bedienen.
- Beide nutzen dieselbe Optik (Dimensions-Themes aus `modul-a-live-karte.html`) und dieselben Seed-Map-Screenshots als Grundlage.
- `modul-a-live-karte.html`, die Hauptdatei der Companion-PWA, liegt **nicht** in diesem Repo. Max pflegt sie selbst.

## Schnellstart

```bash
# Companion: Prototyp direkt im Browser öffnen (DEMO-Mock)
open companion/companion-prototyp.html
cd companion/tests && npm install && npm test          # Playwright

# Koordinaten-Board: Windows start.bat, Linux ./start.sh
cd koordinaten-board && npm run installieren && npm run build && npm start
cd koordinaten-board && npm test                        # Erkennung + Netzwerk
```

Details stehen jeweils in `companion/README.md` und `koordinaten-board/README.md`.
