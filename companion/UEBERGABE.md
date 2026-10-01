# Übergabe · Minecraft Companion PWA

Stand: 29.09.2026 · Einstieg für einen neuen Chat

Arbeitsweise, Zusammenspiel mit dem Koordinaten-Board und projektübergreifende Entscheidungen stehen in der [Übergabe im Repo-Wurzelordner](../UEBERGABE.md). **Die zuerst lesen.** Diese Datei fasst zusammen, was in der Companion gebaut ist, was entschieden wurde und was als Nächstes kommt. Technische Einzelheiten (Funktionen, Regeln, API-Tabellen) stehen in `README.md`.

---

## Prototyp

- **Eine Seite plus drei Begleiter**: `companion-prototyp.html` (Vanilla JS mit `"use strict"`, ohne Build-Schritt), dazu `regeln.js` (Stammdaten + Regel-Funktionen, klassisches Script), `icons/` (Kennblöcke) und `ruestungs-baukasten/` (Bedrock-Texturen, Baukasten für Rüstung und Sammelobjekte).
- **Direkt öffnen** startet den **DEMO-Mock** (`mockApi`).
  - **Live** läuft die Seite, wenn das Koordinaten-Board sie ausliefert (`http://<board>:3000/`, QR-Code der Anzeige). Erkannt über `GET /api/server`, API unter `/api`, Token aus dem Beitreten. `?demo=1` erzwingt den Mock. Details in `README.md` → Live-Betrieb.
  - `?modul=<key>` startet direkt in einem Bereich.
- **Demo-Daten**:
  - 2 Welten; `w_1` hat den Seed `6889192652397090698` aus dem Screenshot.
  - Beispielorte, erzeugte Biome (`demoBiome()`), 5 abgehakte Sammelobjekte, 4 Banner, 3 Rüstungs-Sets (Amethyst-Netherit, Umbreon, Taucher).
  - 3 Portal-Verbindungen: **Hauptbasis** passt, **Eisenfarm** ist einseitig, beim **Dorf** entsteht ein neues Portal.
  - Angemeldet ist `MOCK.ich = "Max"`.
- **`localStorage`** speichert nur Bequemlichkeiten pro Gerät:
  - `orte.welt`, `orte.dim`, `orte.ansicht`, `orte.standort`, `orte.biome` (Biom-Ebene ein/aus)
  - `banner.schritte.<id>`, `ruestung.schritte.<set>.<teil>` (Amboss-Schritte), `ruestung.buehne` (Dimension + Träger der Figur)
  - `portale.edition`, `portale.info`, `portale.rechner`
  - `board.verbindung` (live zugleich die Anmeldung), `board.name`
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
| 7 | Rüstung | ✅ umgesetzt | Oberwelt | alle Welten (Besätze: Welt) |

**Reihenfolge laut Max**: Banner ✓ → Portal-Verwaltung ✓ → Rüstung ✓ → Handbuch, Baupläne kommen zuletzt.

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
- Kennblöcke (PNG) statt Symbol bei Strukturen mit Bild: Listen-Gruppe, Canvas-Marker, Detail-Kopf, Screenshot-Prüfliste. Siehe Sammelobjekte → Kennblöcke.
- **Welt-Import** (Biom-Plan `PLAN-welt-import-biome.md` Phasen 1–6 und Strang C in `../planung/PLAN.md`, Branch `bereich/karte-welt-upload`): Weltordner als `.zip` aus der Dateien-App (oder `.mcworld`) hochladen, Anleitung nur fürs iPhone, Aufbauprüfung, Bestätigung mit Weltname und Seed, Lesen im Web Worker, Prüfliste, Übernehmen; Biome als Kacheln auf der Karte. Einzelheiten in `README.md` → Welt-Import.
  - **Entscheidungen von Max (01.10.2026)**: ZIP mit zusätzlichem Ordner wird ohne Hinweis angenommen (E12). Anleitung nur iPhone, besuchte Gebiete reichen (E14). Strang C umfasst den ganzen Biom-Import, nicht nur das Upload-Feld.
  - **Offen (Haltepunkt Phase 1 des Biom-Plans)**: Prüfung an echten Welten von Max – Höhenkarte an einer bekannten Stelle, Stichproben gegen Chunkbase, neuere Biom-IDs (Cherry Grove, Pale Garden, Dappled Forest …), Laufzeit und Speicher am iPhone. Es fehlen `tests/daten/fixture-seed.mcworld` und eine Realm-Welt (bleibt lokal in `tests/daten/privat/`).

**Regeln von Max** (prüfen `instanzPruefen()` und `biomImportPruefen()`, der Server prüft mit derselben Datei):

1. „Eigene Orte“ ist eine zusätzliche Kategorie. Dort legt man die Typen (Ortsnamen) selbst an.
2. In allen anderen Kategorien entstehen neue Typen **nur aus Screenshots**. Die **Variante aus dem Popup ist der FeatureType**, z. B. Stronghold → „Stairway“.
3. **Biome nur per Welt-Import** (`.zip`/`.mcworld`). Als Ort gibt es die Kategorie „Biomes“ nicht mehr; ein Biom-Popup im Screenshot bleibt ausgegraut. Alte Biom-Punkte entfernt das Board beim Start (Sicherung `daten.vor-welt-import.json`).
4. Nur der ganze Import lässt sich löschen; einzelne Chunks sind nicht bearbeitbar. Ein neuer Import ersetzt den alten (pro Welt genau einer).
5. **Unerkundete Chunks bleiben leer.** Darstellung als Chunk-Raster (ein Biom je Chunk: das häufigste Oberflächenbiom der 256 Spalten, Nether und End auf Y 64).
6. Der Seed aus `level.dat` muss zum Seed der Welt passen.
7. Unbekannte Biom-IDs werden gespeichert, aber leer dargestellt und in der Prüfliste gemeldet. Kennt `biom-ids.js` sie später, erscheinen sie ohne neuen Import.

### Sammelobjekte ✅

- Zurzeit nur **Rüstungsbesätze zum Abhaken plus Fundort**: 18 Besätze einschließlich Fluss und Blitz, dazu die Netheritaufwertung. Gruppiert nach Fundort-Struktur.
- **Namen wie in Bedrock** (Entscheidung von Max, 29.09.2026): aus `texts/de_DE.lang`, z. B. „Wächterzier“, „Mündelzier“, „Wilde Zier“; der englische Name steht klein daneben. Vorher standen die Java-Wiki-Namen da („Wachen“, „Warthof“ …).
- **Icon je Besatz** ist die Schmiedevorlage aus `ruestungs-baukasten/vorlagen/` (Liste und Detail-Kopf, offene blass).
- Abhaken gilt **für die ganze Welt** und merkt sich, wer es wann gefunden hat.
- Verknüpfung zur Karte: Zu jedem Fundort erscheinen die bekannten Strukturen, die nächste mit Entfernung. „Karte“ springt direkt dorthin.
- **Kennblöcke als PNG** (von Max, Quelle minecraft.wiki): Jede Fundort-Struktur zeigt ihren typischen Block, z. B. Unheilvolles Banner für den Außenposten, Netherziegel für die Netherfestung. Dazu der deutsche Strukturname aus `icons/manifest.json`, klein darunter der Seed-Map-Name.
  - Die Bilder liegen in `companion/icons/`. Das Board liefert den Ordner seit der Zusammenführung selbst unter `/icons/` aus (auch für die Anzeige); eine eigene Kopie gibt es nicht mehr.
  - **Überall eingebaut**: Sammelobjekte (Gruppen, Detail), Karte (Liste, Canvas-Marker, Detail, Screenshot-Prüfliste), Aufs Board (die Karte schickt `typ` mit) und im Board selbst (Anzeige, Handy-Liste, Ort-Detail). Kategorien ohne Bild behalten ihr Symbol bzw. Linien-Icon.
  - **Pfadruinen haben noch kein Bild** (Seltsamer Kies fehlt, minecraft.wiki ist aus dem Claude-Container gesperrt). Bis dahin steht das Symbol ⌗ da. Kommt die Datei `trail_ruins.png` dazu, in `STRUKTUREN` das `bild:false` entfernen; der Test meldet den Unterschied.
  - Die Einträge darunter (die Besätze selbst) zeigen ihre Schmiedevorlage (`vorlageDatei()`); die Item-IDs im Manifest (`sentry_armor_trim_smithing_template` …) sind zugleich die Dateinamen.

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
- **Banner aus Screenshots** (Wunsch von Max): Anleitungen, die die Schritte als „<Farbe> <Muster>“ mit englischen Namen listen (`../referenz/banner/rezept-beispiel.jpg`: „Black Base“, „Cyan Bordure“, „Light Blue Lozenge“ …), liest das Board aus. Sie landen in derselben Screenshot-Prüfliste wie Orte: Vorschau, Schritte auf Deutsch, vorgeschlagener Name („Banner vom 29.9.“), dann speichern.
  - Einstieg über „Screenshot“ in der Bottom-Bar von Banner **oder** Karte – das Board erkennt, ob es ein Seed-Map-Popup oder eine Banner-Anleitung ist.
  - Schritt 1 „<Farbe> Base“ ist die Grundfarbe; fehlt er, lässt sich nichts speichern. Nicht zugeordnete Zeilen werden gemeldet, derselbe Banner zweimal als „Schon gespeichert“.
  - Der Screenshot aus einem Banner-Editor (`referenz/banner/banner-editor-beispiel.jpg`) geht weiterhin nicht (Schrift zu klein) – dort bleibt der Editor von Hand.

### Rüstung ✅

Max hat einen **Rüstungs-Baukasten** geschickt (Zip „ruestung“, jetzt `ruestungs-baukasten/`): Bedrock-Texturen aus Mojangs `bedrock-samples`, Namen aus `de_DE.lang`, ein Manifest, `baukasten.js` (Umfärben, Item-Icons, 2D-Figur), `figur3d.js` (3D mit three.js) und 1116 fertige Item-Icons. Die Showcase-HTML fehlte im Zip, deshalb ist der Bereich im Stil der Companion **neu gebaut** (Entscheidung von Max).

**Entscheidungen von Max (29.09.2026):**
- **Sets für alle Welten**, wie Banner, auf dem Board gespeichert. Je Teil: Rüstung, Besatz, Besatz-Material, Lederfarbe, verzaubert ja/nein.
- **Welche Besätze in der aktuellen Welt schon gefunden sind**, zeigt der Bereich überall (aus den Sammelobjekten).
- **Bedrock-Namen** in Rüstung und Sammelobjekten, englisch klein daneben.
- Ein **eigenes Anzeigeschema** fürs Board.

**Gebaut:**
- Liste (vier Icons, nötige Vorlagen, „2/3 gefunden“), Detail (Figur, Schmiedetisch je Teil, „Du brauchst“, Verzaubern am Amboss, Aufs Board), Editor als **Schmiedetisch** mit den Slots Vorlage + Rüstung + Material wie in den Vorlagen von Max (`referenz/ruestung/`).
- **Figur**: 3D über http mit three.js r128 vom CDN (drehbar, Ständer oder Steve, Sockel und Hintergrund je Dimension); ohne three.js 2D; als Datei nur die Icons, weil `file://` Canvas-Pixel und ES-Module sperrt. Icons immer aus `fertig/items/` (gehen auch als Datei).
- **Anpassung am Baukasten**: `figur3d.js` hat eine Option `abstand` (Kamera-Abstand, Standard wie vorher 104), damit der Helm nicht am Rand klebt. Sonst ist der Baukasten unverändert.
- **Amboss-Pläne** aus dem alten Entwurf (Helm 27, Harnisch 13, Beinschutz 28, Stiefel 49 XP-Level) – **Java-Werte, Bedrock noch nicht geprüft**.
- `entwuerfe/banner-ruestung.js` ist damit überholt.

**Noch offen:**
- Die Showcase-Ansicht (`ruestungs-showcase.html`) fehlte im Zip. Schickt Max sie nach, lässt sich vergleichen, ob etwas fehlt.
- Bedrock-XP-Werte für die Amboss-Pläne prüfen; deutsche Bedrock-Namen der Verzauberungen („Huschen“ …) gegen `de_DE.lang` prüfen.
- Name der Netheritaufwertung in Bedrock nicht aus dem Manifest bestätigt (steht nicht drin).
- three.js kommt vom CDN: Ohne Internet im Heimnetz gibt es die 2D-Figur. Falls das stört, könnte das Board three.js selbst ausliefern.

### Board-Verbindung und Live-Betrieb ✅

Wunsch von Max: einen Scanner einbauen, mit dem man sich mit dem Board verbindet, **danach** überlegen, wie einzelne Inhalte ans Board gehen. Seit der **Zusammenführung** (Branch `board/zusammenfuehrung`) ist das Board zugleich der Server der Companion.

- Kein Bereich, sondern ein Eintrag **Board** unten in der Sidebar mit Status-Punkt. Details in `README.md` → Live-Betrieb und Board-Verbindung.
- **Live** (vom Board ausgeliefert): Beitreten mit PIN aus dem QR-Code + Name ist die Anmeldung für alle Daten; Änderungen anderer Handys kommen live an (`liveAktualisieren`). Im Board-Sheet: Welt auf der Anzeige, Titel, QR-Code, „Abmelden“. Im Ort-Detail: „Auf der Anzeige anheften“.
- **Woanders geöffnet** (Datei, anderer Server): Kamera-Scanner (BarcodeDetector oder jsQR vom CDN), Foto vom QR-Code, Adresse + PIN von Hand; die Daten bleiben dann im DEMO-Mock, nur „Aufs Board“ geht ans echte Board. Dafür sind `/api/beitreten` und `/api/ich` per CORS offen, mit einer Sperre nach 5 falschen PINs.
- **Aufs Board** (Variante B, von Max gewählt): Inhalte groß auf die Anzeige werfen, wie Chromecast. Das Board speichert nichts; die Karte liegt dort, bis die nächste kommt oder jemand sie wegnimmt.
  - **Jeder Inhalt hat ein Anzeigeschema** (Wunsch von Max): Verzeichnis `BOARD_KARTEN`, je Inhaltsart `{ titel, karte(id) }` → allgemeines Kartenformat (Titel, Blöcke `koordinaten`/`zeilen`/`text`/`bild`, optional `typ` für den Kennblock).
  - Schemas: Ort, Sammelobjekt, Sammel-Fortschritt, Portal-Verbindung, Banner-Bauplan, Rüstungs-Set. Tabelle in `README.md` → Aufs Board · Anzeigeschema.

### Handbuch, Baupläne ⬜

Noch nichts festgelegt. Zuerst mit Max klären, was hinein soll.

---

## Aufbau von `companion-prototyp.html`

| Abschnitt | Inhalt |
|---|---|
| CSS oben | Basis 1:1 aus Modul A, danach ein eigener Block je Bereich: Karte, Sammelobjekte, Banner, Rüstung, Portal-Verwaltung |
| HTML | Header, `main.module-stack` mit je einer `<section class="module" data-module="…">` pro Bereich, Sidebar, ein gemeinsames Sheet `#orteSheet`, Toast |
| JS 0 · KONFIG | `CONFIG` (Weltgrenze, Kachelgröße, Biom-Höhe in Nether/End, Zoom …) |
| JS 1 · THEMES | UI-Tokens der drei Dimensionen |
| `regeln.js` (eigene Datei) | Dimensionen, Kategorien, Biome, `SAMMELOBJEKTE`, Banner-Farben/-Muster, `RUESTUNGS_TEILE`/`RUESTUNGEN`/`BESATZ_MATERIALIEN`, `instanzPruefen`, `bannerPruefen`, `ruestungPruefen`, `verbindungRegelPruefen`, `biomImportPruefen`/`biomImportSauber` – lädt auch der Board-Server |
| `biom-ids.js` (eigene Datei) | Biom je Bedrock-ID (`BIOM_IDS`), erzeugt aus minecraft-data |
| JS 2 · STAMMDATEN | Kartenfarben, `BIOM_INFO` (Bedrock-ID → Name, Biom der Liste, Farbe), Symbole, `STRUKTUREN` + `kennblockHtml`/`kennblockBild` (Kategorie → Kennblock), `BAUKASTEN`, `vorlageDatei`, `itemBild` |
| JS 3 · KOORDINATEN | `zahl`, `umrechnen`, `entfernung`, `tpBefehl`, `koordinatenErkennen` |
| JS 4 · API + MOCK | API-Vertrag als Kommentar, `betriebErkennen` (live oder DEMO), `MOCK` (mit `demoBiome()`), `mockApi`, `api()`, `kachelAusText`/`kachelZuText` |
| JS 5–8 | State (`st`, Biome `bm` mit `biomeSetzen`, `biomAnStelle`, `kachelBild`), Theme (`applyTheme`), Liste, Canvas-Karte (Biom-Kacheln, Legende, Tippen → Biom) |
| JS 9 · SHEETS | `sheetOeffnen(art, html, dim)`, `kopfHtml`, `koordFelder`/`koordLesen`, Karte-Sheets |
| JS 9b · BEREICHE | `ICON`, `BEREICHE`, `modulWechseln`, `sidebarBauen` |
| JS 9c–9e | Sammelobjekte, Banner, Portal-Verwaltung |
| JS 9f · BOARD-VERBINDUNG | `bd`, `boardQrLesen`, `qrLeser`, `boardScanStarten`, `boardBeitreten`, `boardVerbinden`, `boardSheetRendern`; live: `anmeldungAbgelaufen`, `liveAktualisieren`, `boardEinstellungen…`; Aufs Board: `boardSenden`, `BOARD_KARTEN` (Anzeigeschemas `ortKarte`, `sammelKarte`, `sammelStandKarte`, `portalKarte`, `bannerKarte`, `ruestungKarte`), `boardZeigen`, `boardWegnehmen`, `boardZeigenKnopf` |
| JS 9g · RÜSTUNG | `rs`, `teilIcon`/`teilIconDatei`, `besatzStand`, `ruestungLaden`, `renderRuestung`, `ruestungDetailOeffnen` (`rezeptHtml`, `bedarfHtml`, `verzauberungHtml`), Editor `ruestungEditorOeffnen`/`…Rendern`/`…Klick`, `ruestungSpeichern`; Figur `fig`, `figurModus` (3d/2d/icons), `buehneZeigen`, `glanzStarten`, `drehenEinrichten`; Board `ruestungFoto`, `ruestungKarte` |
| JS 9h · WELT-IMPORT | `WELT_ANLEITUNGEN`, `wi` (Schritt, Datei, Worker, Ergebnis), `weltImportDatei`/`…Lesen`/`…Nachricht`, `wiAuswertung` (Vorschau, häufigste Biome), `weltImportRendern`, `weltImportUebernehmen`/`…Loeschen`, `biomeLaden`, `biomKnopfZeigen` |
| JS 10 | Weltdaten laden, Events, `$sheet`-Klick-Switch (`data-aktion`), `datenStarten()`, `init()` |

### Checkliste: neuen Bereich einbauen

1. HTML: `<section class="module" data-module="<key>">` mit Bühne (`.orte-stage`) und `.bottombar`.
2. CSS-Block „---- <Bereich> ----“ vor `/* Toast */`.
3. JS-Abschnitt `9x` mit:
   - State-Objekt
   - `…Laden()` und `render…()`
   - Detail und Editor über `sheetOeffnen("<art>", html, dim)`
   - eine **Regel-Funktion** `…Pruefen()` **in `regeln.js`** (mit den Stammdaten, die sie braucht) – der Board-Server lädt sie mit
4. API-Vertrag im Kommentar von Abschnitt 4 ergänzen und die Mock-Routen in `mockApi()` anlegen. Die Mock-Routen nutzen dieselbe Regel-Funktion. Auf dem Board: Ablauf in `server/src/daten.js`, Route in `server/src/companion-api.js` mit `geaendert("<bereich>", weltId)`, Neuladen in `liveAktualisieren()`.
5. `ICON` und `BEREICHE` bekommen einen Eintrag mit `mount`/`unmount`. Dazu je ein Zweig in `render()` und in `renderKopf()`.
6. Sheet-Aktionen im `$sheet`-Klick-Switch ergänzen. Löschen immer mit zweitem Tippen („Wirklich löschen?“).
7. Hängen die Daten an einer Welt, `…Laden()` in `weltLaden()` aufrufen.
8. **Anzeigeschema**: Eintrag in `BOARD_KARTEN` und `boardZeigenKnopf("<art>:<id>")` im Detail (danach `boardZeigenKnoepfe()`). `tests/anzeigeschema.test.mjs` prüft die neuen Karten gegen `zeigen.js` des Boards.
9. `tests/<bereich>.test.mjs` schreiben, den README-Abschnitt ergänzen und committen.
10. Dashboard-Ansichten des Bereichs mit Max klären (siehe `../UEBERGABE.md` → Zusammenspiel).

---

## Datenmodell und API

**Kern**: siehe `../referenz/minecraft_tool_datenmodell.md` (gemeinsame Referenz).

**Erweiterungen durch die Bereiche** (je ein konkreter Anwendungsfall):

| Bereich | Daten | Pfade |
|---|---|---|
| Sammelobjekte | Status je Welt: `{ [objektId]: { von, am } }` | `GET/PUT /sammelobjekte/welten/:id[/:objektId]` |
| Banner | `{ id, name, basis, ebenen:[{ muster, farbe }], von, am }` | `GET/POST /banner`, `PUT/DELETE /banner/:id` |
| Rüstung | `{ id, name, teile:{ helmet…boots: { ruestung, muster, material, farbe, verzaubert } \| null }, von, am }` für alle Welten | `GET/POST /ruestung`, `PUT/DELETE /ruestung/:id` |
| Portale | `{ id, name, oberwelt:{x,y,z}, nether:{x,y,z}, von, am }` je Welt | `GET/POST /portale/welten/:id`, `PUT/DELETE /portale/:id` |
| Karte (Board) | Instanz zusätzlich `quelle`, `von`, `am`, `angeheftet` | `PUT /orte/instanzen/:id/angeheftet` |
| Karte · Welt-Import | `WeltImport { id, weltId, dateiname, weltname, seed, spielversion, chunks, unbekannt, von, importiertAm }` + Kacheln `{ dim, kx, kz, daten }` je Welt | `GET/PUT/DELETE /welten/:id/biome` |
| Anzeige (Board) | Einstellungen `{ titel, qrZeigen, aktiveWelt }` | `GET/PUT /board/einstellungen` |

Die vollständigen Tabellen stehen in `README.md`.

**Regel-Funktionen** stehen in `regeln.js`; der Board-Server lädt genau diese Datei (`koordinaten-board/server/src/regeln.js`):
- `instanzPruefen()` für die Karte
- `biomImportPruefen()` für den Welt-Import
- `bannerPruefen()` für Banner
- `ruestungPruefen()` für Rüstungs-Sets
- `verbindungRegelPruefen()` für Portale

---

## Offene Aufgaben (Companion)

1. **Einbau in `modul-a-live-karte.html`**:
   - Die Karte-Liste wird ein zweiter Bereich neben dem Canvas.
   - Marker und Biome zeichnet der bestehende Renderer.
   - Die Sidebar wird auf `BEREICHE` umgestellt.
   - `regeln.js` und `icons/` kommen neben die Hauptdatei; das Board liefert dann sie aus (`COMPANION_DATEI`).
   - **Der alte Portal-Linker dort sagt „Bedrock sucht im Nether ±16“. Das ist falsch**, Bedrock sucht ±128. Er wird durch die Portal-Verwaltung ersetzt oder korrigiert.
2. **Edition**: In der Portal-Verwaltung ist Bedrock/Java zurzeit eine Einstellung auf dem Gerät. Vorschlag: später eine Eigenschaft der Welt, denn auch die Seeds unterscheiden sich je Edition. Dafür braucht es die Zustimmung von Max, weil es das Datenmodell ändert.
3. **Handbuch, Baupläne**: Inhalte mit Max klären. Rüstung: offene Punkte siehe oben.
4. **Idee, nicht besprochen**: Portal-Verbindungen auch auf der Karte zeigen.
5. **Aufs Board**: Bleibt eine Karte liegen, bis sie jemand wegnimmt (so ist es jetzt), oder verschwindet sie nach einiger Zeit? Neue Bereiche bekommen ihr Anzeigeschema (Checkliste Punkt 8).
6. **Aus der früheren Board-Steuerung noch nicht übernommen**: Notiz zu einem Ort, Kartenausschnitt als Bild, Export als JSON. Erweitert das Datenmodell – Details geht Max einzeln durch.

Projektübergreifend offen (Dashboard, Biom-Erkennung, Hetzner): siehe `../UEBERGABE.md`.

---

## Git

Der Companion-Verlauf ist mit allen Commits im Repo erhalten (Ordner `companion/`). Die früheren Branches `bereich/banner` und `bereich/portale` sind in `main` aufgegangen.

Der Bereich Rüstung liegt auf `bereich/ruestung` (zweigt von `bereich/banner-screenshot` ab). Nächster Bereich: `bereich/<name>` von `main`, sobald die offenen Branches gemergt sind.

---

## Tests

```bash
cd companion/tests
npm install                       # Playwright
npx playwright install chromium   # einmalig, falls kein Chromium da ist (three.js für die 3D-Tests kommt mit npm install)
npm test                          # biom-dekoder (18, node --test) + banner (23) + portale (29) + sammelobjekte (64) + kennbloecke (14) + board (57) + live (65) + anzeigeschema (28) + ruestung (52) + karte-mcworld (52) = 384 Prüfungen + 18 Tests
```

- `board.test.mjs`, `live.test.mjs` und `anzeigeschema.test.mjs` starten je ein **echtes Koordinaten-Board** (Ports 3198, 3195, 3194, eigener Datenordner); Anzeigeschema und Rüstung liefern die Companion zusätzlich selbst über http aus (3193, 3192). Board-Test: Companion über einen eigenen `http://localhost`-Server (DEMO) mit Kamera, Foto, Hand-Eingabe und „Aufs Board“. Vorher einmal `npm --prefix ../../koordinaten-board run installieren && npm --prefix ../../koordinaten-board run build` (die Anzeige braucht den gebauten Client).
  - Kamera: Chromiums Fake-Kamera zeigt einen erzeugten QR-Code (Y4M). `BarcodeDetector` wird entfernt, damit der jsQR-Weg wie am iPhone läuft; jsQR kommt aus `node_modules` statt vom CDN.
  - Außerdem geprüft: Foto, Eingabe von Hand, falsche PIN, Board nicht erreichbar, Neuladen, Board-Neustart, Trennen, Kamera aus beim Schließen.
  - Aufs Board: Ort auf die echte Anzeige (`/anzeige`, 1600×900) werfen, Layout, Neuladen der Anzeige, ein zweiter Spieler ersetzt die Karte (Zeilen, Text, Nether), ungültige Karte wird abgelehnt, Wegnehmen, Stronghold mit Kennblock.
  - Kennblöcke in den Spalten der Anzeige (Tim legt seine Orte über die Companion-API des Boards an).

- `live.test.mjs`: Das Board liefert die Companion aus. Max und Lena treten per `/?pin=…` bei, erste Welt anlegen, Ort von Hand, **echter Screenshot** (`referenz/seedmap/stronghold-popup.png`) über die OCR des Boards, **Banner aus der Anleitung** `referenz/banner/rezept-beispiel.jpg` (Knopf im Banner-Bereich, Name, speichern, Duplikat beim zweiten Mal), Änderungen kommen live beim anderen Handy an (Orte, Sammelobjekt, Banner, Portal, Rüstungs-Set – mit 3D-Figur vom Board und Auffrischen, wenn ein Besatz gefunden wird), Server prüft mit `regeln.js`, Anzeige zeigt die aktive Welt mit Kennblock, Anheften, Umschalten der Welt, Titel, QR-Code, Neuladen und Server-Neustart, falsche PIN, ungültiges Token, Abmelden. Prüft auch, dass nur die erwarteten HTTP-Fehler vorkommen.
- `anzeigeschema.test.mjs`: Für alle DEMO-Inhalte (Orte, Sammelobjekte, Fortschritt, Portale, Banner, Rüstungs-Sets) die Karte bauen und mit `kartePruefen` aus `koordinaten-board/server/src/zeigen.js` prüfen; je Schema über den Knopf „Aufs Board“ eine Karte auf die echte Anzeige werfen (Screenshots `a1`–`a5`). Läuft über http (DEMO), damit das Rüstungs-Set seine 3D-Figur mitschickt.
- `ruestung.test.mjs`: Sammelobjekte mit Bedrock-Namen und Vorlagen-Icons; Rüstung über http (DEMO): Liste, Icons nach Schema, 3D-Figur (deckende Pixel gezählt), Drehen, Nether + Steve, Schmiedetisch, Bedarf, Amboss-Schritt, Sprung zum fehlenden Sammelobjekt, Editor (Vorlage → Material, Leder rot, Teil entfernen, Name fehlt), Speichern, Abbrechen, Löschen, Board-Karte mit 3D-Aufnahme; als Datei: nur Icons, three.js wird nicht geladen, keine Konsolenfehler.
- **3D im Test**: `hilfen.mjs` liefert den Ordner über http aus, beantwortet die CDN-Adresse von three.js mit `node_modules/three` (das CDN ist im Claude-Container gesperrt) und startet Chromium mit Software-WebGL (`--use-angle=swiftshader --enable-unsafe-swiftshader`).
- `kennbloecke.test.mjs` prüft die Kennblöcke der Karte: Canvas-Marker je Dimension (zählt `drawImage`), Listen-Köpfe, Detail-Kopf, Screenshot-Prüfliste (DEMO-Texterkennung) und dass Kategorien ohne Bild ihr Symbol behalten.
- `sammelobjekte.test.mjs` prüft `STRUKTUREN` und `SAMMELOBJEKTE` gegen `icons/manifest.json` (Namen, Besätze, vorhandene Bilder), die Kennblöcke in Liste und Detail, Abhaken, den Sprung zur Karte und den Ersatz durch Symbole, wenn `icons/` fehlt.
- `biom-dekoder.test.mjs` (`node --test`): Dekoder mit handgebauten Bytes, ganze synthetische Welten aus `welt-bauen.mjs` (Level, gelöschte Datei, Log mit Löschmarke, iOS-Ordner), Weltname aus `levelname.txt`, schnelle Prüfung, Aufbaufehler (keine ZIP, kein Weltordner, Java, kaputte `level.dat`).
- `karte-mcworld.test.mjs`: Welt-Import mit je einer Test-ZIP pro Fall (korrekt, mit Unterordner, ohne `db/`, keine ZIP, `.mcworld`, anderer Seed, leere Welt). DEMO über http (Port 3191): Demo-Biome, Tippen, Ein-/Ausblenden, Nether, Anleitung, Fehler, Bestätigung, Prüfliste, Übernehmen, Seed passt nicht (Welt wechseln, neue Welt anlegen), Verwerfen, Löschen, Biom-Screenshot ausgegraut. Als Datei: Hinweis auf http. Live gegen ein echtes Board (Port 3190): Worker vom Board, Import kommt bei Lena an, Löschen bei Max.

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
- **Sammelobjekte**: 18 Rüstungsbesätze (einschließlich Fluss und Blitz aus 1.21) plus die Netheritaufwertung. Bedrock-Namen und Fundorte stehen in `SAMMELOBJEKTE`.
- **Rüstung** (aus dem Baukasten, `LIESMICH.md`): Besatz umfärben über 8 Grauwerte → Material-Palette; gleiches Material wie die Rüstung → `_darker`-Palette; Leder = Graustufen × Farbe + Overlay, ungefärbt `#A06540`, Bedrock-Weiß `#F0F0F0`; Reihenfolge Grundtextur → Besatz → Glanz; das Inventar-Icon zeigt nur die Besatz-Farbe; Schildkröte gibt es nur als Helm. Kupferrüstung und Harz als Material sind im Baukasten enthalten.
- **Verzauberungen**, deutsche Namen: Schutz, Haltbarkeit, Reparatur, Atmung, Wasseraffinität, Huschen (nur Hose), Wasserläufer, Seelenläufer, Federfall.
- **Seed-Map-Screenshot**: siehe `../UEBERGABE.md` → Gemeinsame Referenz.

---

## Inhalt des Ordners

```
companion/
├── UEBERGABE.md               ← diese Datei
├── README.md                  ← Technik: Funktionen, Regeln, API-Tabellen, Einbau
├── companion-prototyp.html    ← der Prototyp (live vom Board ausgeliefert, sonst DEMO)
├── regeln.js                  ← Stammdaten + Regeln, lädt auch der Board-Server
├── entwuerfe/banner-ruestung.js   ← alter Entwurf, überholt (Banner + Rüstung sind eingebaut)
├── ruestungs-baukasten/       ← von Max: Bedrock-Texturen, manifest.json, baukasten.js, figur3d.js, LIESMICH.md
│   ├── vorlagen/, zutaten/   Icons der Schmiedevorlagen und Besatz-Materialien
│   └── fertig/items/         1116 fertige Rüstungs-Icons
├── icons/
│   ├── manifest.json         Fundort-Strukturen: ID, deutscher Name, Kennblock, Besätze
│   └── struktur_kennbloecke/ Kennblock-PNGs der Fundorte (Pfadruinen fehlt noch)
├── referenz/
│   ├── sammelobjekte/  Trails-&-Tales-Übersicht der Fundorte
│   ├── banner/         Beispiel aus einem Banner-Editor
│   └── ruestung/       3 Sets + 4 Verzauberungs-Reihenfolgen
├── tests/              Playwright-Tests: Banner, Portale, Sammelobjekte, Kennblöcke, Board, Live-Betrieb, Anzeigeschema, Rüstung
└── widgets/            Widget-Ansicht fürs Board (Vite + React + TS, aus MainHub), Umbau laut ../planung/PLAN.md
```

Datenmodell, Seed-Map-Screenshots und das Dashboard-Vorbild liegen in `../referenz/`.
