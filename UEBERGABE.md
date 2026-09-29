# Übergabe · Minecraft Companion & Koordinaten-Board

Stand: 29.09.2026 · Einstieg für einen neuen Chat

Diese Datei enthält, was **für beide Projekte** gilt: Arbeitsweise, Zusammenspiel, gemeinsame Referenz und projektübergreifende Entscheidungen. Alles Projektspezifische steht in der Übergabe des jeweiligen Projekts:

- [`companion/UEBERGABE.md`](companion/UEBERGABE.md): Stand der Bereiche, Aufbau des Prototyps, Checkliste, API, Tests, recherchierte Spielfakten
- [`koordinaten-board/UEBERGABE.md`](koordinaten-board/UEBERGABE.md): Stand, gelöste Probleme bei Max, Anbindung an die Companion

---

## Neuen Chat starten

**Anhängen oder Repo verbinden:**

1. Dieses Repo (enthält Companion, Board, Referenz und den ganzen Git-Verlauf)
2. **`modul-a-live-karte.html`**: die aktuelle Hauptdatei der Companion-PWA (Stilvorlage und Ziel für den späteren Einbau). Sie liegt bewusst nicht im Repo, weil Max sie selbst weiterpflegt.

**Erste Nachricht, zum Beispiel:**

> Lies `UEBERGABE.md`, danach `companion/UEBERGABE.md`. Wir machen mit der Companion-PWA weiter: Bereich **Rüstung**.

Geht es ums Raum-Board, statt der Companion-Übergabe `koordinaten-board/UEBERGABE.md` lesen.

---

## Aufbau des Repos

```
README.md                 ← Überblick
UEBERGABE.md              ← diese Datei (projektübergreifend)
companion/                ← Companion: Seite + regeln.js + icons/, Tests, Entwürfe, eigene Referenzbilder
koordinaten-board/        ← Board: Server der Companion (Fastify) + Anzeige (React)
referenz/                 ← gemeinsame Referenz (Datenmodell, Seed-Map, Dashboard-Vorbild)
```

Was wohin gehört:

- Code, Tests und Doku eines Projekts bleiben in dessen Ordner.
- **Seit der Zusammenführung** gibt es genau zwei gewollte Verbindungen: Der Board-Server liefert `companion/` aus (Seite, `regeln.js`, `icons/`) und lädt `companion/regeln.js`, damit Handy und Server mit denselben Regeln prüfen. Pfad einstellbar über `COMPANION_ORDNER`. Sonst greift kein Projekt in den Ordner des anderen; die Playwright-Tests der Companion starten das Board als eigenen Prozess.
- `referenz/` bekommt nur, was **beide** Projekte betrifft. Referenzbilder für einen einzelnen Companion-Bereich liegen in `companion/referenz/`.

---

## So arbeiten wir

- **Deutsch** in Kommunikation, UI-Texten und Code: Variablen- und Funktionsnamen wie `bannerSpeichern` oder `verbindungPruefen`. Spielbegriffe tragen den deutschen Spielnamen. Wo es beim Nachschlagen hilft, steht der englische Name klein daneben.
- **Git**: Bei jedem Schritt sagen, wann committet und gepusht wird. Nach einem eigenen Commit kurz bestätigen, z. B. „Commit erstellt: …“.
  - Companion: jeder Bereich bekommt einen eigenen Branch `bereich/<name>`.
  - Board: Änderungen auf einem Branch `board/<thema>`.
- **Bereiche geht Max einzeln durch.** Erst steht der Rahmen, dann folgen die Details. Nichts ausbauen, was nicht besprochen ist.
- **Datenmodell minimal halten.** Es wird nur erweitert, wenn ein Bereich es konkret braucht. FeatureTypes werden nicht erfunden.
- **Bedrock ist die Hauptedition.** Die Seed-Map-Screenshots zeigen „Bedrock 26.50“. Java-Unterschiede kommen nur dort vor, wo sie zählen (Portale).
- **Optik 1:1 aus `modul-a-live-karte.html`**:
  - Dimensions-Themes: Oberwelt grün, Nether rot, End violett
  - Header mit Hamburger, darüber die Sidebar
  - Bottom-Bar je Bereich, Bottom-Sheets, Karten und Pills
- **Mobile first**, bedient am Handy.

---

## Die zwei Projekte in Kürze

| | Companion (`companion/`) | Koordinaten-Board (`koordinaten-board/`) |
|---|---|---|
| Zweck | Die App am Handy: Karte, Sammelobjekte, Portale, Banner, später Rüstung, Handbuch, Baupläne | **Server der Companion** (Daten, OCR, Live-Sync) und Anzeige im Zimmer |
| Technik | eine HTML-Seite + `regeln.js`, Vanilla JS, kein Build; live vom Board ausgeliefert, sonst DEMO-Mock | Fastify 5, Vite + React 19 + TypeScript (nur Anzeige), JSON-Speicher, tesseract.js |
| Stand | 4 von 7 Bereichen umgesetzt, Rüstung als Nächstes | zusammengeführt (Branch `board/zusammenfuehrung`) |
| Tests | Playwright: Banner, Portale, Sammelobjekte, Kennblöcke, Board-Verbindung, Live-Betrieb, Anzeigeschema (267 Prüfungen) | `node --test`: Daten, API, Regeln, Erkennung, Banner-Erkennung, Karten, Netzwerk, PIN-Sperre (37 Tests) |

---

## Zusammenspiel: ein System (seit 29.09.2026)

**Entscheidung von Max:** Companion und Board sind **ein System**. Der Board-Server macht alles; er läuft im Heimnetz, der Code bleibt Hetzner-fähig (`OEFFENTLICHE_URL`). Die Companion ersetzt die frühere Handy-Oberfläche des Boards. Alte Board-Orte wurden nicht übernommen (neu anfangen). Die Anzeige zeigt **eine aktive Welt**.

```
Handy ──http──▶ Board-Server :3000
                ├─ /                 Companion (companion/companion-prototyp.html, live)
                ├─ /regeln.js, /icons/…  aus companion/
                ├─ /api/…            Companion-API (daten.js) + Beitreten + OCR (/api/orte/auslesen)
                ├─ /ws               Live: geaendert, zustand, gezeigt, teilnehmer
                └─ /anzeige          React-Anzeige (nur lokal): Orte der aktiven Welt
Daten: koordinaten-board/server/daten/daten.json
```

- **Beitreten**: Das Handy scannt den QR-Code der Anzeige mit der Kamera-App und landet auf `/?pin=…`. Die Companion erkennt den Live-Betrieb (`/api/server`), fragt nach dem Namen und lädt danach die Daten des Boards. Eine eigene Kamera in der Seite braucht es dafür nicht.
- **Gemeinsame Regeln**: `companion/regeln.js` enthält Stammdaten und Regel-Funktionen. Die Seite bindet sie ein, der Server lädt sie per `node:vm` – nichts wird doppelt gepflegt.
- **Live**: Jede Änderung meldet der Server als `{ art:"geaendert", bereich, weltId }`; die Handys laden den Bereich neu, die Anzeige bekommt die Orte der aktiven Welt (`sicht.js`).
- **Texterkennung**: Die OCR des Boards bedient `/api/orte/auslesen` im Format der Companion (`fuerCompanion()`). Biome werden über die Biom-Liste zugeordnet – an einem echten Biom-Popup noch nicht geprüft. Ist kein Seed-Map-Popup drauf, sucht sie eine **Banner-Anleitung** („Black Base“, „Cyan Bordure“ …); die Companion speichert daraus einen Bauplan.
- **Anzeige steuern** (Board-Sheet der Companion): Welt auf der Anzeige, Titel, QR-Code; Orte anheften.
- **Aufs Board**: Die Companion wirft Inhalte groß auf die Anzeige (Variante B, wie Chromecast). **Jeder Inhalt hat ein Anzeigeschema** (Wunsch von Max): `BOARD_KARTEN` übersetzt Ort, Sammelobjekt, Sammel-Fortschritt, Portal-Verbindung und Banner in allgemeine Karten (Titel + Blöcke `koordinaten`/`zeilen`/`text`/`bild`, optional `typ` für den Kennblock), geprüft in `koordinaten-board/server/src/zeigen.js`. Das Board kennt keine Bereiche; neue Bereiche tragen ihr Schema ein.
- **Kennblöcke**: liegen nur noch in `companion/icons/`; die Anzeige lädt sie über den Server unter `/icons/`.
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

1. **Biom-Erkennung**: Es fehlt ein **Biom-Popup-Screenshot**, um die Erkennung daran zu prüfen (die Zuordnung über die Biom-Liste ist schon drin).
2. **Dashboard**:
   - Eine Seite pro Bereich (wie die Kontrollzentrum-Seiten)?
   - Wird am Handy oder an der Anzeige im Zimmer bearbeitet?
   - Welche Ansichten bekommt jeder Bereich? (wird beim jeweiligen Bereich geklärt)
3. **Aufs Board**: Bleibt eine Karte liegen, bis jemand sie wegnimmt (so ist es jetzt), oder verschwindet sie nach einiger Zeit?
4. **Aus der früheren Board-Steuerung** noch nicht übernommen: Notiz zu einem Ort, Kartenausschnitt als Bild, Export als JSON. Erweitert das Datenmodell.
5. **Hetzner später**: Soll die Companion auch von unterwegs erreichbar sein (https, PWA installierbar)? Dann läuft derselbe Server dort, oder das Board verbindet sich nach außen.
6. **Edition als Eigenschaft der Welt** statt Einstellung auf dem Gerät, weil sich auch die Seeds je Edition unterscheiden. Ändert das Datenmodell, braucht die Zustimmung von Max. Details in `companion/UEBERGABE.md`.
