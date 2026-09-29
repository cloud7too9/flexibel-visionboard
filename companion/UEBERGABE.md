# Übergabe · Minecraft Companion PWA

Stand: 29.09.2026 · Einstieg für einen neuen Chat

Arbeitsweise, Zusammenspiel mit dem Koordinaten-Board und projektübergreifende Entscheidungen stehen in der [Übergabe im Repo-Wurzelordner](../UEBERGABE.md). **Die zuerst lesen.** Diese Datei fasst zusammen, was in der Companion gebaut ist, was entschieden wurde und was als Nächstes kommt. Technische Einzelheiten (Funktionen, Regeln, API-Tabellen) stehen in `README.md`.

---

## Prototyp

- **Eine Datei**: `companion-prototyp.html`, rund 200 KB, Vanilla JS mit `"use strict"`, ohne Build-Schritt.
- **Direkt öffnen** startet den **DEMO-Mock** (`mockApi`).
  - Mit `?live=1` über http nutzt die Datei die echte API (`fetch`, Bearer-Token aus `?token=`).
  - `?modul=<key>` startet direkt in einem Bereich.
- **Demo-Daten**:
  - 2 Welten; `w_1` hat den Seed `6889192652397090698` aus dem Screenshot.
  - Beispielorte und Biome, 5 abgehakte Sammelobjekte, 4 Banner.
  - 3 Portal-Verbindungen: **Hauptbasis** passt, **Eisenfarm** ist einseitig, beim **Dorf** entsteht ein neues Portal.
  - Angemeldet ist `MOCK.ich = "Max"`.
- **`localStorage`** speichert nur Bequemlichkeiten pro Gerät:
  - `orte.welt`, `orte.dim`, `orte.ansicht`, `orte.standort`
  - `banner.schritte.<id>`
  - `portale.edition`, `portale.info`, `portale.rechner`
  - `board.verbindung`, `board.name`
- **Jeder Bereich endet mit** einem Browser-Test (Playwright), dem Ansehen der Screenshots, einem README-Abschnitt und einem Commit.

---

## Bereiche: Stand

Die Sidebar wird aus der Registry `BEREICHE` gebaut. Bereiche ohne `mount()` zeigen den Hinweis „geplant“.

| # | Bereich | Stand | Theme | Daten gelten für |
|---|---|---|---|---|
| 1 | Karte | ✅ umgesetzt | je Dimension | Welt |
| 2 | Sammelobjekte | ✅ umgesetzt | Oberwelt | Welt |
| 3 | Portal-Verwaltung | ✅ umgesetzt | Nether | Welt |
| 4 | Handbuch | ⬜ offen, nichts festgelegt | – | – |
| 5 | Baupläne | ⬜ offen, nichts festgelegt | – | – |
| 6 | Banner | ✅ umgesetzt | Oberwelt | alle Welten |
| 7 | Rüstung | 🟨 Code-Entwurf, noch nicht besprochen | – | – |

**Reihenfolge laut Max**: Banner ✓ → Portal-Verwaltung ✓ → Rüstung, Handbuch, Baupläne kommen zuletzt.

Die Bereiche **Zugänge, Backups, Erfolge, Orte und Toolbox** sind entfernt, dafür gibt es andere Lösungen. Der alte Bereich „Orte“ ist in der **Karte** aufgegangen, die vormals „Live-Karte“ hieß.

### Karte ✅

Koordinaten-Sammlung nach dem Datenmodell (`../referenz/minecraft_tool_datenmodell.md`). Dazu gehören:
- Dimensions-Reiter und ein Umschalter Karte | Liste
- Liste als Akkordion: Kategorie → Variante → Orte
- Canvas-Karte
- Screenshot-Import mit Prüfliste
- Eintragen von Hand
- Welt per Seed anlegen
- Eigener Standort (nur lokal) mit Entfernung und Richtung
- Umrechnung Nether ↔ Oberwelt und `/execute in … run tp`-Befehl

**Regeln von Max** (prüft `instanzPruefen()`, der Server muss sie genauso prüfen):

1. „Eigene Orte“ ist eine zusätzliche Kategorie. Dort legt man die Typen (Ortsnamen) selbst an.
2. In allen anderen Kategorien entstehen neue Typen **nur aus Screenshots**. Die **Variante aus dem Popup ist der FeatureType**, z. B. Stronghold → „Stairway“.
3. **Biome nur per Screenshot.** Das Biom ist der Typ und muss in der Biom-Liste stehen; daraus ergibt sich auch die Dimension.
4. Biom-Orte sind fest: löschen ja, bearbeiten nein.
5. **Fläche ohne bekanntes Biom bleibt auf der Karte leer.** Biome werden nur als Kreis um bekannte Punkte gezeichnet (`CONFIG.biomRadius` = 48).

### Sammelobjekte ✅

- Zurzeit nur **Rüstungsbesätze zum Abhaken plus Fundort**: 18 Besätze einschließlich Fluss und Bolzen, dazu die Netheritaufwertung. Alle mit deutschen Namen, gruppiert nach Fundort-Struktur.
- Abhaken gilt **für die ganze Welt** und merkt sich, wer es wann gefunden hat.
- Verknüpfung zur Karte: Zu jedem Fundort erscheinen die bekannten Strukturen, die nächste mit Entfernung. „Karte“ springt direkt dorthin.

### Portal-Verwaltung ✅

Die Wünsche von Max waren: Koordinaten umrechnen, Verbindungen mit den Koordinaten beider Portale erfassen und eine einblendbare Infokarte mit Tipps.

- **Umrechner**: Er zeigt das Gegenportal und, **wo man mit den erfassten Portalen ankommen würde**. Dazu gibt es Kopieren, einen TP-Befehl und „Als Verbindung anlegen“.
- **Verbindungen** gelten je Welt. Jede zeigt einen Status: Verbunden, Einseitig, Falsch verknüpft oder Neues Portal.
  - Das Detail enthält einen durchgerechneten Vorschlag, z. B. „Nether-Portal genau bei X 37 · Y 80 · Z −53 bauen“.
  - Der Editor rechnet die Gegenseite mit ÷ 8 bzw. × 8 und prüft live.
- **Infokarte** mit 8 Tipps, umschaltbar zwischen Bedrock und Java. Der Schalter bestimmt auch die Regeln der Prüfung. Er ist eine Einstellung auf dem Gerät, Standard ist Bedrock.

### Banner ✅

- Baupläne gelten **für alle Welten**.
- **Liste** mit Vorschau und Suche.
- **Detail** mit Material, nötigen Bannervorlagen samt Herkunft und einer **Anleitung Schritt für Schritt**. Jeder Schritt zeigt den Zwischenstand und lässt sich abhaken.
- **Editor**: Grundfarbe, bis zu 6 Ebenen, Muster-Raster mit Vorschaubildern wie am Webstuhl.
- Ein Banner aus dem Editor-Screenshot per OCR auszulesen hat nicht funktioniert (die weiße Schrift ist zu klein). Deshalb gibt es nur den Editor von Hand.

### Rüstung 🟨 (als Nächstes)

Max hat Bilder geschickt, sie liegen in `referenz/ruestung/`:
- 3 Netherit-Sets mit Besätzen: „Giratina“, „Umbreon“ und ein Amethyst-Set
- 4 Grafiken „beste Verzauberung mit wenigsten XP“ als Amboss-Reihenfolge für Helm, Brustpanzer, Hose und Stiefel

**Der Entwurf** `entwuerfe/banner-ruestung.js` ist **nicht eingebaut**, und sein Banner-Teil ist überholt. Er enthält:
- ein Set aus 4 Teilen, je mit Material, Rüstungsbesatz, Besatzmaterial und „verzaubern ja/nein“
- Amboss-Pläne nach den Bildern: Helm 27, Brust 13, Hose 28, Stiefel 49 XP-Level. **Diese Werte gelten für Java; die Bedrock-Werte müssen noch geprüft werden.**
- eine Vorschau als Rüstungsständer-SVG
- `besatzStand()`: Es zeigt, welche Besätze in der Welt laut Sammelobjekten schon gefunden sind.

**Noch mit Max klären:**
- Was genau soll der Bereich? Sets planen, eigene Sets festhalten, Abhaken beim Verzaubern?
- Gelten Sets pro Welt oder für alle?
- Gibt es Kupferrüstung und Harzziegel als Besatzmaterial in Bedrock? Beides steht im Entwurf und ist nicht geprüft.

### Board-Verbindung ✅ (Rahmen)

Wunsch von Max: einen Scanner einbauen, mit dem man sich mit dem Board verbindet, **danach** überlegen, wie einzelne Inhalte ans Board gehen.

- Kein Bereich, sondern ein Eintrag **Board** unten in der Sidebar mit Status-Punkt. Details in `README.md` → Board-Verbindung.
- Kamera-Scanner (BarcodeDetector oder jsQR vom CDN), Foto vom QR-Code, Adresse + PIN von Hand. Danach Beitritt mit Name und PIN und eine offene Live-Verbindung (WebSocket).
- Auf dem Board sind dafür `/api/beitreten` und `/api/ich` für andere Ursprünge freigegeben (CORS), mit einer Sperre nach 5 falschen PINs.
- **Noch nichts gesendet.** Welche Inhalte ans Board gehen, ist der nächste Schritt (siehe Offene Aufgaben).

### Handbuch, Baupläne ⬜

Noch nichts festgelegt. Zuerst mit Max klären, was hinein soll.

---

## Aufbau von `companion-prototyp.html`

| Abschnitt | Inhalt |
|---|---|
| CSS oben | Basis 1:1 aus Modul A, danach ein eigener Block je Bereich: Karte, Sammelobjekte, Banner, Portal-Verwaltung |
| HTML | Header, `main.module-stack` mit je einer `<section class="module" data-module="…">` pro Bereich, Sidebar, ein gemeinsames Sheet `#orteSheet`, Toast |
| JS 0 · KONFIG | `CONFIG` (Weltgrenze, Biom-Radius, Zoom …) |
| JS 1 · THEMES | UI-Tokens der drei Dimensionen |
| JS 2 · STAMMDATEN | Kategorien, Biome, Symbole, `SAMMELOBJEKTE` |
| JS 3 · KOORDINATEN | `zahl`, `umrechnen`, `entfernung`, `tpBefehl`, `koordinatenErkennen` |
| JS 4 · API + MOCK | API-Vertrag als Kommentar, `instanzPruefen`, `MOCK`, `mockApi`, `api()` |
| JS 5–8 | State, Theme (`applyTheme`), Liste, Canvas-Karte |
| JS 9 · SHEETS | `sheetOeffnen(art, html, dim)`, `kopfHtml`, `koordFelder`/`koordLesen`, Karte-Sheets |
| JS 9b · BEREICHE | `ICON`, `BEREICHE`, `modulWechseln`, `sidebarBauen` |
| JS 9c–9e | Sammelobjekte, Banner, Portal-Verwaltung |
| JS 9f · BOARD-VERBINDUNG | `bd`, `boardQrLesen`, `qrLeser`, `boardScanStarten`, `boardBeitreten`, `boardVerbinden`, `boardSheetRendern` |
| JS 10 | Weltdaten laden, Events, `$sheet`-Klick-Switch (`data-aktion`), `init()` |

### Checkliste: neuen Bereich einbauen

1. HTML: `<section class="module" data-module="<key>">` mit Bühne (`.orte-stage`) und `.bottombar`.
2. CSS-Block „---- <Bereich> ----“ vor `/* Toast */`.
3. JS-Abschnitt `9x` mit:
   - State-Objekt
   - `…Laden()` und `render…()`
   - Detail und Editor über `sheetOeffnen("<art>", html, dim)`
   - eine **Regel-Funktion** `…Pruefen()`, die der Server genauso prüfen muss
4. API-Vertrag im Kommentar von Abschnitt 4 ergänzen und die Mock-Routen in `mockApi()` anlegen. Die Mock-Routen nutzen dieselbe Regel-Funktion.
5. `ICON` und `BEREICHE` bekommen einen Eintrag mit `mount`/`unmount`. Dazu je ein Zweig in `render()` und in `renderKopf()`.
6. Sheet-Aktionen im `$sheet`-Klick-Switch ergänzen. Löschen immer mit zweitem Tippen („Wirklich löschen?“).
7. Hängen die Daten an einer Welt, `…Laden()` in `weltLaden()` aufrufen.
8. `tests/<bereich>.test.mjs` schreiben, den README-Abschnitt ergänzen und committen.
9. Dashboard-Ansichten des Bereichs mit Max klären (siehe `../UEBERGABE.md` → Zusammenspiel).

---

## Datenmodell und API

**Kern**: siehe `../referenz/minecraft_tool_datenmodell.md` (gemeinsame Referenz).

**Erweiterungen durch die Bereiche** (je ein konkreter Anwendungsfall):

| Bereich | Daten | Pfade |
|---|---|---|
| Sammelobjekte | Status je Welt: `{ [objektId]: { von, am } }` | `GET/PUT /sammelobjekte/welten/:id[/:objektId]` |
| Banner | `{ id, name, basis, ebenen:[{ muster, farbe }], von, am }` | `GET/POST /banner`, `PUT/DELETE /banner/:id` |
| Portale | `{ id, name, oberwelt:{x,y,z}, nether:{x,y,z}, von, am }` je Welt | `GET/POST /portale/welten/:id`, `PUT/DELETE /portale/:id` |

Die vollständigen Tabellen stehen in `README.md`.

**Regel-Funktionen, die der Server übernehmen muss**:
- `instanzPruefen()` für die Karte
- `bannerPruefen()` für Banner
- `verbindungRegelPruefen()` für Portale

---

## Offene Aufgaben (Companion)

1. **Einbau in `modul-a-live-karte.html`**:
   - Die Karte-Liste wird ein zweiter Bereich neben dem Canvas.
   - Marker und Biome zeichnet der bestehende Renderer.
   - Die Sidebar wird auf `BEREICHE` umgestellt.
   - **Der alte Portal-Linker dort sagt „Bedrock sucht im Nether ±16“. Das ist falsch**, Bedrock sucht ±128. Er wird durch die Portal-Verwaltung ersetzt oder korrigiert.
2. **Edition**: In der Portal-Verwaltung ist Bedrock/Java zurzeit eine Einstellung auf dem Gerät. Vorschlag: später eine Eigenschaft der Welt, denn auch die Seeds unterscheiden sich je Edition. Dafür braucht es die Zustimmung von Max, weil es das Datenmodell ändert.
3. **Rüstung, Handbuch, Baupläne**: Inhalte mit Max klären.
4. **Idee, nicht besprochen**: Portal-Verbindungen auch auf der Karte zeigen.
5. **Board-Verbindung**:
   - Welche Inhalte die Companion ans Board sendet, mit Max klären.
   - https-Companion ↔ http-Board: siehe `../UEBERGABE.md` → Offene Entscheidungen.

Projektübergreifend offen (Datenhaltung, OCR-Anbindung, Dashboard): siehe `../UEBERGABE.md`.

---

## Git

Der Companion-Verlauf ist mit allen Commits im Repo erhalten (Ordner `companion/`). Die früheren Branches `bereich/banner` und `bereich/portale` sind in `main` aufgegangen.

**Nächster Git-Schritt** für den Bereich Rüstung:

```bash
git switch main && git pull
git switch -c bereich/ruestung
```

---

## Tests

```bash
cd companion/tests
npm install                       # Playwright
npx playwright install chromium   # einmalig, falls kein Chromium da ist
npm test                          # banner (23) + portale (29) + board (30 Prüfungen)
```

- `board.test.mjs` startet ein **echtes Koordinaten-Board** (Port 3198, eigener Datenordner) und liefert die Companion über `http://localhost` aus. Vorher einmal `npm --prefix ../../koordinaten-board/server install`.
  - Kamera: Chromiums Fake-Kamera zeigt einen erzeugten QR-Code (Y4M). `BarcodeDetector` wird entfernt, damit der jsQR-Weg wie am iPhone läuft; jsQR kommt aus `node_modules` statt vom CDN.
  - Außerdem geprüft: Foto, Eingabe von Hand, falsche PIN, Board nicht erreichbar, Neuladen, Board-Neustart, Trennen, Kamera aus beim Schließen.

- Mit `CHROMIUM=/pfad/zu/chromium` lässt sich ein vorhandenes Chromium nutzen. Im Claude-Container ist das `/opt/pw-browsers/chromium`.
- Screenshots landen in `tests/bilder/`. **Immer ansehen**, nicht nur auf Grün verlassen.
- Stolperfalle: Texte mit CSS `text-transform:uppercase` mit `textContent` prüfen, nicht mit `innerText`.

---

## Recherchierte Fakten: nicht neu suchen

- **Portal-Suche** (minecraft.wiki, „Nether portal → Portal search“):
  - Umrechnung: Oberwelt → Nether ÷ 8, abgerundet (`Math.floor`, auch bei negativen Werten); zurück × 8; Y bleibt.
  - Suchbereich ist ein Quadrat um den Zielpunkt: **Bedrock ±128 in beiden Dimensionen**, **Java ±16 im Nether und ±128 in der Oberwelt** (seit Java 1.16.2, MC-197538).
  - Es gewinnt das nächste Portal nach **3D-Abstand, Y zählt mit**. Wird keins gefunden, baut das Spiel ein neues. Nur entzündete Portale zählen.
- **Banner** (de.minecraft.wiki „Banner/Muster“):
  - 16 Farben, höchstens 6 Muster im Webstuhl
  - 42 Muster-IDs mit deutschen Namen, davon 10 mit Bannervorlage
  - **Mauerung** und **Spickelbord** brauchen seit Java 1.21.2 auch eine Vorlage, wie in Bedrock.
- **Sammelobjekte**: 18 Rüstungsbesätze (einschließlich Fluss und Bolzen aus 1.21) plus die Netheritaufwertung. Deutsche Namen und Fundorte stehen in `SAMMELOBJEKTE`.
- **Verzauberungen**, deutsche Namen: Schutz, Haltbarkeit, Reparatur, Atmung, Wasseraffinität, Huschen (nur Hose), Wasserläufer, Seelenläufer, Federfall.
- **Seed-Map-Screenshot**: siehe `../UEBERGABE.md` → Gemeinsame Referenz.

---

## Inhalt des Ordners

```
companion/
├── UEBERGABE.md               ← diese Datei
├── README.md                  ← Technik: Funktionen, Regeln, API-Tabellen, Einbau
├── companion-prototyp.html    ← der Prototyp
├── entwuerfe/banner-ruestung.js   ← Rüstung-Entwurf (Banner-Teil überholt)
├── referenz/
│   ├── sammelobjekte/  Trails-&-Tales-Übersicht der Fundorte
│   ├── banner/         Beispiel aus einem Banner-Editor
│   └── ruestung/       3 Sets + 4 Verzauberungs-Reihenfolgen
└── tests/              Playwright-Tests für Banner und Portale
```

Datenmodell, Seed-Map-Screenshots und das Dashboard-Vorbild liegen in `../referenz/`.
