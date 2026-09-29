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
companion/                ← Companion-Prototyp: eine HTML-Datei, Tests, Entwürfe, eigene Referenzbilder
koordinaten-board/        ← Raum-Board: Fastify-Server + React-Client
referenz/                 ← gemeinsame Referenz (Datenmodell, Seed-Map, Dashboard-Vorbild)
```

Was wohin gehört:

- Code, Tests und Doku eines Projekts bleiben in dessen Ordner. Kein Projekt greift per Pfad in den Ordner des anderen.
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
| Zweck | PWA am Handy: Karte, Sammelobjekte, Portale, Banner, später Rüstung, Handbuch, Baupläne | Gerät im Zimmer zeigt Koordinaten groß an, Handys tragen per QR/PIN ein |
| Technik | eine HTML-Datei, Vanilla JS, kein Build, DEMO-Mock | Fastify 5, Vite + React 19 + TypeScript, JSON-Speicher, tesseract.js |
| Stand | 4 von 7 Bereichen umgesetzt, Rüstung als Nächstes | fertig |
| Tests | Playwright: Banner, Portale, Board-Verbindung (104 Prüfungen) | `node --test`: Erkennung, Netzwerk, PIN-Sperre, Karten (19 Tests) |

---

## Zusammenspiel

- **Texterkennung**: Das Board liest Seed-Map-Screenshots bereits lokal aus (`koordinaten-board/server/src/erkennung.js`). Diese OCR soll `/orte/auslesen` der Companion bedienen. Dafür muss sie
  - auf das Antwortformat der Companion umgestellt werden: `{ erkannt:{ titel, kategorie, variante, dimension, x, y, z } | null }`, siehe `companion/README.md` → API-Vertrag,
  - um die Biom-Liste erweitert werden.
- **Dashboard**: Das Board ist das Raum-Dashboard. Jeder Companion-Bereich bekommt eigene Dashboard-Ansichten (Widgets), die dort laufen sollen.
  - Vorbild ist das **iOS-Kontrollzentrum**, siehe `referenz/dashboard/`: Ansichten in festen Rastergrößen 1×1, 2×1 und 2×2 auf 4 Spalten, Galerie „Ansicht hinzufügen“ nach Bereich gruppiert mit Suche, Bearbeiten-Modus mit „−“ und Griff zum Vergrößern.
  - Im Companion-Code vorbereitet: Der Modul-Vertrag in `BEREICHE` sieht `ansichten: [{ key, titel, groessen, render(el, groesse) }]` vor. Bisher nur dokumentiert.
- **Verbindung**: Die Companion scannt den QR-Code der Anzeige und tritt dem Board bei wie ein Handy (Name + PIN → Token, danach WebSocket). Das Board gibt dafür `/api/beitreten` und `/api/ich` per CORS frei und sperrt nach 5 falschen PINs für 60 s. Details: `companion/README.md` → Board-Verbindung.
- **Aufs Board**: Die Companion wirft Inhalte groß auf die Anzeige (Variante B, wie Chromecast). Das Board kennt keine Companion-Bereiche, es zeigt allgemeine Karten (Titel + Blöcke `koordinaten`/`zeilen`/`text`, geprüft in `koordinaten-board/server/src/zeigen.js`) und speichert sie nicht. Bisher schickt die Companion Orte.
- **Optik**: Das Board wurde bereits an die Live-Karte der Companion angeglichen.

---

## Gemeinsame Referenz (`referenz/`)

- `minecraft_tool_datenmodell.md`: das minimale Datenmodell
  - DATABASE: World (id, seed) → Dimension (overworld/nether/end) → FeatureInstance (x, y?, z)
  - STATIC: Biome, Group, FeatureCategory, FeatureType
  - Die Companion setzt es um. Das Board hat noch ein eigenes, einfacheres Modell (`client/src/lib/typen.ts`).
- `seedmap/`: Chunkbase-Screenshots (Oberwelt, Nether, End, Feature-Liste, Stronghold-Popup). Grundlage für die OCR des Boards und den Screenshot-Import der Companion.
- `dashboard/`: iOS-Kontrollzentrum als Vorbild für die Dashboard-Ansichten.

**Seed-Map-Screenshot** (Chunkbase), nicht neu recherchieren:
- Das Popup zeigt den Titel „Stronghold (Stairway)“, darunter X / (Y) / Z. Die Variante in Klammern ist der FeatureType.
- Die Dimension steht im Dropdown oben.
- Werbung kann das Popup verdecken. Die OCR meldet dann „kein Popup“, statt zu raten.

---

## Offene Entscheidungen (projektübergreifend)

1. **Datenhaltung**: Companion-Server (Hetzner) oder das Board im Heimnetz?
2. **OCR-Anbindung**: `/orte/auslesen` auf das neue Antwortformat umstellen und um Biome erweitern. Es fehlt noch ein **Biom-Popup-Screenshot**, um die Erkennung darauf abzustimmen.
3. **Dashboard**:
   - Eine Seite pro Bereich (wie die Kontrollzentrum-Seiten)?
   - Wird am Handy oder an der Anzeige im Zimmer bearbeitet?
   - Welche Ansichten bekommt jeder Bereich? (wird beim jeweiligen Bereich geklärt)
4. **Aufs Board**: Welche Inhalte nach dem Ort kommen, und ob eine Karte nach einiger Zeit von selbst verschwindet. Zurzeit bleibt sie liegen, bis die nächste kommt oder jemand sie in der Companion wegnimmt; die Handy-Oberfläche des Boards hat dafür noch keinen Knopf.
5. **Companion über https ↔ Board über http**: Die Companion soll später als PWA über **https** laufen (z. B. Hetzner), das Board liefert nur **http** im Heimnetz. Browser blockieren Anfragen von einer https-Seite an eine http-Adresse (Mixed Content), Safari auf dem iPhone ausnahmslos. Die Kamera wiederum gibt es nur in einem sicheren Kontext (https oder localhost). Heute funktioniert die Verbindung deshalb, wenn die Companion über http oder als Datei geöffnet wird; die Kamera dann nur am Rechner, am Handy bleiben Foto und Eingabe von Hand. Die Companion meldet den Fall ausdrücklich („Der Browser blockiert die Verbindung …“). Mögliche Wege:
   - Board bekommt https mit echtem Zertifikat (eigene Domain, die auf die Heimnetz-Adresse zeigt)
   - Hetzner als Vermittler: Das Board verbindet sich nach außen, die Companion spricht nur mit Hetzner (hängt an der Entscheidung zur Datenhaltung)
   - Companion wird im Heimnetz vom Board ausgeliefert (dann aber ohne Kamera am Handy)
6. **Edition als Eigenschaft der Welt** statt Einstellung auf dem Gerät, weil sich auch die Seeds je Edition unterscheiden. Ändert das Datenmodell, braucht die Zustimmung von Max. Details in `companion/UEBERGABE.md`.
