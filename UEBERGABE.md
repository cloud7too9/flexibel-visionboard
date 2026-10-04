# Übergabe · Minecraft Companion & Koordinaten-Board

Stand: 04.10.2026 · Einstieg für einen neuen Chat

> **Stand der Umsetzung von `planung/PLAN.md`** (Widget-Dashboard, Welt-Import, Accounts): [`planung/UEBERGABE.md`](planung/UEBERGABE.md) – was gebaut ist, Branches, Starten, Tests, nächste Schritte. Was auf Max wartet: [`planung/WARTELISTE.md`](planung/WARTELISTE.md).

Diese Datei enthält, was **für beide Projekte** gilt: Arbeitsweise, Zusammenspiel, gemeinsame Referenz und projektübergreifende Entscheidungen. Alles Projektspezifische steht in der Übergabe des jeweiligen Projekts:

- [`companion/UEBERGABE.md`](companion/UEBERGABE.md): Stand der Bereiche, Aufbau des Prototyps, Checkliste, API, Tests, recherchierte Spielfakten
- [`koordinaten-board/UEBERGABE.md`](koordinaten-board/UEBERGABE.md): Stand, gelöste Probleme bei Max, Anbindung an die Companion

---

## Neuen Chat starten

**Anhängen oder Repo verbinden:**

1. Dieses Repo (Board, Tests und Doku der Companion, Planung, Referenz)
2. Das Repo **Companion** (früher „MineTool“): die App selbst, neben diesem Repo ausgecheckt (seit 04.10.2026)
3. **`modul-a-live-karte.html`**: die aktuelle Hauptdatei der Companion-PWA (Stilvorlage und Ziel für den späteren Einbau). Sie liegt bewusst nicht im Repo, weil Max sie selbst weiterpflegt.

**Erste Nachricht, zum Beispiel:**

> Lies `UEBERGABE.md`, danach `companion/UEBERGABE.md`. Wir machen mit der Companion-PWA weiter: Bereich **Handbuch**.

Geht es ums Raum-Board, statt der Companion-Übergabe `koordinaten-board/UEBERGABE.md` lesen.

Geht es mit dem Plan weiter (Widget-Dashboard, Offline, Accounts), zum Beispiel:

> Lies `UEBERGABE.md`, danach `planung/UEBERGABE.md` und `planung/WARTELISTE.md`. Schreib den Bauplan „Sitzung“ (E16) und leg ihn mir vor.

oder

> … Mach mit Offline B3 weiter (N5: eigenes Zertifikat).

---

## Aufbau des Repos

```
README.md                 ← Überblick
UEBERGABE.md              ← diese Datei (projektübergreifend)
companion/                ← rund um die Companion: Tests, Werkzeuge, Doku, Entwürfe, eigene Referenzbilder (die App selbst: Repo Companion)
companion/widgets/        ← Widget-Ansicht fürs Board (Vite + React + TS, aus MainHub), Umbau laut planung/PLAN.md
koordinaten-board/        ← Board: Server der Companion (Fastify) + Anzeige (React)
planung/                  ← Gesamtplan (PLAN.md), Ideen und Baupläne der Planungskommission
referenz/                 ← gemeinsame Referenz (Datenmodell, Seed-Map, Dashboard-Vorbild)
```

Was wohin gehört:

- Code, Tests und Doku eines Projekts bleiben in dessen Ordner.
- **Die Companion-App hat ein eigenes Repo** (Companion, früher „MineTool“, seit 04.10.2026). Es liegt neben diesem: `…/flexibel-visionboard` und `…/Companion`. Board, Tests und Werkzeuge finden die App unter `../Companion/app`, anders über `COMPANION_ORDNER`. Die CI checkt beide Repos aus.
- **Seit der Zusammenführung** gibt es genau zwei gewollte Verbindungen: Der Board-Server liefert die Companion-App aus (Seite, `regeln.js`, `board-karten.js`, `icons/`, `ruestungs-baukasten/`, PWA-Dateien) und den Build von `companion/widgets/` unter `/dashboard`, und er lädt `regeln.js` und `board-karten.js` der App, damit Handy und Server mit denselben Regeln prüfen und dieselben Karten bauen. Sonst greift kein Projekt in den Ordner des anderen; die Playwright-Tests der Companion starten das Board als eigenen Prozess.
- `referenz/` bekommt nur, was **beide** Projekte betrifft. Referenzbilder für einen einzelnen Companion-Bereich liegen in `companion/referenz/`.

---

## So arbeiten wir

- **Deutsch** in Kommunikation, UI-Texten und Code: Variablen- und Funktionsnamen wie `bannerSpeichern` oder `verbindungPruefen`. Spielbegriffe tragen den deutschen Spielnamen. Wo es beim Nachschlagen hilft, steht der englische Name klein daneben.
- **Git**: Bei jedem Schritt sagen, wann committet und gepusht wird. Nach einem eigenen Commit kurz bestätigen, z. B. „Commit erstellt: …“.
  - Companion: jeder Bereich bekommt einen eigenen Branch `bereich/<name>`.
  - Board: Änderungen auf einem Branch `board/<thema>`.
  - **Gemergt wird nur nach Rückfrage bei Max**, auch wenn Claude den Merge ausführt (Wunsch von Max, 04.10.2026).
- **Bereiche geht Max einzeln durch.** Erst steht der Rahmen, dann folgen die Details. Nichts ausbauen, was nicht besprochen ist.
- **Datenmodell minimal halten.** Es wird nur erweitert, wenn ein Bereich es konkret braucht. FeatureTypes werden nicht erfunden.
- **Bedrock ist die einzige Edition** (Entscheidung von Max, 04.10.2026). Die Seed-Map-Screenshots zeigen „Bedrock 26.50“. Java gibt es nirgendwo, auch nicht bei den Portalen.
- **Optik 1:1 aus `modul-a-live-karte.html`**:
  - Dimensions-Themes: Oberwelt grün, Nether rot, End violett
  - Header mit Hamburger, darüber die Sidebar
  - Bottom-Bar je Bereich, Bottom-Sheets, Karten und Pills
- **Mobile first**, bedient am Handy.

---

## Die zwei Projekte in Kürze

| | Companion (`companion/`) | Koordinaten-Board (`koordinaten-board/`) |
|---|---|---|
| Zweck | Die App am Handy: Karte, Sammelobjekte, Portale, Banner, Rüstung, später Handbuch, Baupläne | **Server der Companion** (Daten, OCR, Live-Sync) und Anzeige im Zimmer |
| Technik | eine HTML-Seite + `regeln.js`, Vanilla JS, kein Build; live vom Board ausgeliefert, sonst DEMO-Mock | Fastify 5, Vite + React 19 + TypeScript (nur Anzeige), JSON-Speicher, tesseract.js |
| Stand | 5 von 7 Bereichen umgesetzt, Handbuch und Baupläne offen; Welt-Import; nur Bedrock | Server der Companion; Widget-Dashboard unter `/dashboard` (A0–A6); Accounts mit PIN (B1, B2) |
| Tests | Playwright: 14 Dateien mit 492 Prüfungen, dazu 20 Dekoder-Tests (`companion/tests`); Widgets: 108 Unit-Tests | `node --test`: 57 Tests (Daten, API, Regeln, Erkennung, Karten, Identität …) |
| CI | alle Tests bei jedem PR und Push auf `main` (`.github/workflows/tests.yml`) | ← dieselbe CI |

---

## Zusammenspiel: ein System (seit 29.09.2026)

**Entscheidung von Max:** Companion und Board sind **ein System**. Der Board-Server macht alles; er läuft im Heimnetz, der Code bleibt Hetzner-fähig (`OEFFENTLICHE_URL`). Die Companion ersetzt die frühere Handy-Oberfläche des Boards. Alte Board-Orte wurden nicht übernommen (neu anfangen). Die Anzeige zeigt **eine aktive Welt**.

```
Handy ──http──▶ Board-Server :3000
                ├─ /                 Companion (Companion/app/index.html, live)
                ├─ /regeln.js, /icons/…, /ruestungs-baukasten/…  aus companion/
                ├─ /biom-*.js, /vendor/…  Welt-Import (Worker im Browser des Handys)
                ├─ /api/…            Companion-API (daten.js) + Beitreten + OCR (/api/orte/auslesen)
                ├─ /ws               Live: geaendert, zustand, gezeigt, teilnehmer
                └─ /anzeige          React-Anzeige (localhost oder mit Anzeige-Link): Orte der aktiven Welt
Daten: koordinaten-board/server/daten/daten.json
```

- **Beitreten**: Das Handy scannt den QR-Code der Anzeige mit der Kamera-App und landet auf `/?pin=…`. Die Companion erkennt den Live-Betrieb (`/api/server`), fragt nach dem Account (Name + eigene PIN, Strang B) und lädt danach die Daten des Boards. Eine eigene Kamera in der Seite braucht es dafür nicht.
- **Gemeinsame Regeln**: `Companion/app/regeln.js` enthält Stammdaten und Regel-Funktionen. Die Seite bindet sie ein, der Server lädt sie per `node:vm` – nichts wird doppelt gepflegt.
- **Live**: Jede Änderung meldet der Server als `{ art:"geaendert", bereich, weltId }`; die Handys laden den Bereich neu, die Anzeige bekommt die Orte der aktiven Welt (`sicht.js`).
- **Texterkennung**: Die OCR des Boards bedient `/api/orte/auslesen` im Format der Companion (`fuerCompanion()`). Ist kein Seed-Map-Popup drauf, sucht sie eine **Banner-Anleitung** („Black Base“, „Cyan Bordure“ …); die Companion speichert daraus einen Bauplan.
- **Welt-Import**: Biome kommen nur noch aus dem Weltordner (`.zip` aus der Dateien-App oder `.mcworld`). Die Companion liest ihn am Handy im Web Worker und schickt die Biome als Kacheln ans Board (`/api/welten/:id/biome`), je Welt ein Import. Einzelheiten in `companion/README.md` → Welt-Import.
- **Anzeige steuern** (Board-Sheet der Companion): Welt auf der Anzeige, Titel, QR-Code; Orte anheften.
- **Anzeige-Link**: Die Anzeige kann auf jedem Gerät im WLAN laufen (TV-Browser, Tablet). Jede Anzeige hat einen Link mit eigenem Schlüssel; die Companion zeigt ihn unter Board → Anzeigen (kopieren, QR-Code, umbenennen, neuer Schlüssel), die Konsole beim Start.
- **Aufs Board**: Die Companion wirft Inhalte groß auf die Anzeige (Variante B, wie Chromecast). **Jeder Inhalt hat ein Anzeigeschema** (Wunsch von Max): `BOARD_KARTEN` übersetzt Ort, Sammelobjekt, Sammel-Fortschritt, Portal-Verbindung, Banner und Rüstungs-Set in allgemeine Karten (Titel + Blöcke `koordinaten`/`zeilen`/`text`/`bild`, optional `typ` für den Kennblock), geprüft in `koordinaten-board/server/src/zeigen.js`. Das Board kennt keine Bereiche; neue Bereiche tragen ihr Schema ein.
- **Kennblöcke**: liegen nur noch in `Companion/app/icons/`; die Anzeige lädt sie über den Server unter `/icons/`.
- **Dashboard**: Das Board ist das Raum-Dashboard. Jeder Companion-Bereich bekommt eigene Dashboard-Ansichten (Widgets), die dort laufen sollen.
  - Vorbild ist das **iOS-Kontrollzentrum**, siehe `referenz/dashboard/`: Ansichten in festen Rastergrößen 1×1, 2×1 und 2×2 auf 4 Spalten, Galerie „Ansicht hinzufügen“ nach Bereich gruppiert mit Suche, Bearbeiten-Modus mit „−“ und Griff zum Vergrößern.
  - Im Companion-Code vorbereitet: Der Modul-Vertrag in `BEREICHE` sieht `ansichten: [{ key, titel, groessen, render(el, groesse) }]` vor. Bisher nur dokumentiert. Die Anzeigeschemas sind ein möglicher Baustein dafür.
- **Optik**: Das Board wurde bereits an die Live-Karte der Companion angeglichen.

---

## Gemeinsame Referenz (`referenz/`)

- `minecraft_tool_datenmodell.md`: das minimale Datenmodell
  - DATABASE: World (id, seed) → Dimension (overworld/nether/end) → FeatureInstance (x, y?, z)
  - STATIC: Biome, Group, FeatureCategory, FeatureType
  - Der Board-Server speichert danach (`daten.js`), mit den Erweiterungen am Ende der Datei. Die Anzeige bekommt davon ihre einfache `Ort`-Form (`sicht.js` → `client/src/lib/typen.ts`).
- `seedmap/`: Chunkbase-Screenshots (Oberwelt, Nether, End, Feature-Liste, Stronghold-Popup). Grundlage für die OCR des Boards und den Screenshot-Import der Companion.
- `banner/rezept-beispiel.jpg`: Banner-Anleitung von Max (Schritte „Black Base“ … „Black Base Sinister Canton“). Grundlage und Testbild für die Banner-Erkennung.
- `dashboard/`: iOS-Kontrollzentrum als Vorbild für die Dashboard-Ansichten.

**Seed-Map-Screenshot** (Chunkbase), nicht neu recherchieren:
- Das Popup zeigt den Titel „Stronghold (Stairway)“, darunter X / (Y) / Z. Die Variante in Klammern ist der FeatureType.
- Die Dimension steht im Dropdown oben.
- Werbung kann das Popup verdecken. Die OCR meldet dann „kein Popup“, statt zu raten.

---

## Offene Entscheidungen (projektübergreifend)

**Entschieden am 29.09.2026** (Zusammenführung): Datenhaltung → Board im Heimnetz; OCR-Anbindung → umgesetzt; https ↔ http → im Heimnetz gelöst, weil Companion und API vom selben Server kommen; Board-Steuerung → durch die Companion ersetzt.

1. **Welt-Import an echten Welten prüfen**: Biome kommen jetzt aus dem Weltordner (entschieden, Biom-Popups braucht es nicht mehr). An der Fixture-Welt von Max bestätigt: Höhenkarte, Stichproben gegen Chunkbase, ID 195 = Dappled Forest. Offen sind die Realm-Welt am iPhone (Laufzeit) und die IDs von Cherry Grove, Pale Garden und Sulfur Caves (siehe `companion/PLAN-welt-import-biome.md`, Phase 1).
2. **Dashboard**:
   - Eine Seite pro Bereich (wie die Kontrollzentrum-Seiten)?
   - Wird am Handy oder an der Anzeige im Zimmer bearbeitet?
   - Welche Ansichten bekommt jeder Bereich? (wird beim jeweiligen Bereich geklärt)
3. ~~Aufs Board~~ – **entschieden (04.10.2026):** Das Board bekommt eine Sitzung, die lebt, solange das Board läuft. „Aufs Board“ fügt den Inhalt als Widget an der ersten freien Stelle ein, am Handy verschieb- und entfernbar. Noch nicht gebaut (`planung/WARTELISTE.md`, E16).
4. **Aus der früheren Board-Steuerung** noch nicht übernommen: Notiz zu einem Ort, Kartenausschnitt als Bild, Export als JSON. Erweitert das Datenmodell.
5. **Hetzner später**: Soll die Companion auch von unterwegs erreichbar sein (https, PWA installierbar)? Dann läuft derselbe Server dort, oder das Board verbindet sich nach außen.
6. ~~Edition als Eigenschaft der Welt~~ – **entschieden (04.10.2026):** Es gibt nur Bedrock. Die Umschaltung Bedrock/Java in der Portal-Verwaltung ist entfernt.
