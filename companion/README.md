# Companion · Prototyp – Karte, Sammelobjekte, Portale, Banner, Rüstung

Koordinaten-Sammlung für das Modul **Karte** (vormals Live-Karte) der Minecraft Companion PWA, nach dem minimalen Datenmodell (`../referenz/minecraft_tool_datenmodell.md`)
(`World → Dimension → FeatureInstance → FeatureType → FeatureCategory`).
Eine HTML-Datei, Vanilla JS, gleiche Shell und Basis-CSS wie `modul-a-live-karte.html`.

**Neuer Chat / Weitermachen:** zuerst `../UEBERGABE.md` (projektübergreifend), dann `UEBERGABE.md` lesen – Stand, Entscheidungen, offene Punkte.

**Ausprobieren:** `companion-prototyp.html` direkt öffnen (am Handy oder Desktop) – dann läuft der DEMO-Mock mit Beispielwelt. **Live** läuft die Companion, wenn das Koordinaten-Board sie ausliefert: Board starten, `http://<board>:3000/?pin=<PIN>` öffnen oder den QR-Code der Anzeige mit der Kamera-App scannen (siehe „Live-Betrieb“). Mit `?modul=sammelobjekte`, `?modul=portale`, `?modul=banner` oder `?modul=ruestung` startet man direkt im jeweiligen Bereich, `?demo=1` erzwingt den Mock.

Neben der Seite gehören `regeln.js` (Stammdaten und Regeln, die auch der Board-Server lädt), `board-karten.js` (Anzeigeschemas, lädt der Board-Server ebenfalls), `icons/` (Kennblöcke) und `ruestungs-baukasten/` (Bedrock-Texturen für Rüstung und Sammelobjekte) in denselben Ordner.

## Was drin ist

- **Dimensions-Reiter** Oberwelt / Nether / End – färben die ganze Oberfläche (THEMES aus Modul A)
- **Liste** als Akkordion: Kategorie → Variante (FeatureType) → Instanzen, mit Suche und Kategorie-Filter
- **Karte**: Features und eigene Orte als Marker; **Biome aus dem Welt-Import** als Fläche (ein Wert je Chunk), unerkundete Fläche bleibt leer. Antippen zeigt „X · Z · Biom“, ein Knopf blendet die Biome aus
- **Screenshot** (Bottom-Bar): mehrere Seed-Map-Screenshots → Prüfliste → speichern; Duplikat-Hinweis, Dimensionsprüfung. Ein Biom-Popup bleibt ausgegraut stehen („Biome kommen aus dem Welt-Import“)
- **Welt-Import** (Bottom-Bar): Weltordner als `.zip` aus der Dateien-App (oder `.mcworld`) hochladen → Biome der Welt, siehe unten
- **Eintragen** von Hand: alle Kategorien außer Biome; neue Typen nur bei „Eigene Orte“
- **Welt**: Welten per Seed anlegen und wechseln
- **Standort** (nur lokal): Entfernung + Himmelsrichtung, Nether/Oberwelt umgerechnet
- Nether↔Oberwelt-Umrechnung, `/execute in … run tp`-Befehl zum Kopieren
- **Kennblöcke**: Strukturen mit Bild (`icons/struktur_kennbloecke/`, Zuordnung `STRUKTUREN`) zeigen ihren typischen Block statt des Symbols – im Kopf der Listen-Gruppe, als Marker auf der Canvas-Karte, im Kopf des Detail-Sheets und in der Screenshot-Prüfliste. Alle anderen Kategorien (Dorf, eigene Orte, Biome …) behalten ihr Symbol aus `SYMBOL`
- **Sidebar** aus einer Bereichs-Registry (`BEREICHE`) – Vorbereitung für Dashboard-Widgets:
  Karte · Sammelobjekte · Portal-Verwaltung · Handbuch · Baupläne · Banner · Rüstung

## Bereiche (Rahmen)

| Bereich | Stand | Inhalt |
|---|---|---|
| Karte | umgesetzt | Live-Karte + Koordinaten-Sammlung |
| Sammelobjekte | umgesetzt | Rüstungsbesätze abhaken, Fundorte |
| Portal-Verwaltung | umgesetzt | Umrechnen, Verbindungen erfassen und prüfen, Infokarte |
| Handbuch | geplant | – |
| Baupläne | geplant | – |
| Banner | umgesetzt | Baupläne für Banner mit Anleitung |
| Rüstung | umgesetzt | Rüstungs-Sets am Schmiedetisch, 3D-Figur, Besätze der Welt |

Neue Bereiche: Eintrag in `BEREICHE` + Icon in `ICON`. Ohne `mount()` zeigt die Sidebar den Bereich als „geplant“.
Die Details jedes Bereichs werden einzeln festgelegt. Reihenfolge: Banner ✓ → Portal-Verwaltung ✓ → Rüstung ✓ → Handbuch, Baupläne.
`entwuerfe/banner-ruestung.js` ist überholt (Banner und Rüstung sind eingebaut); die Verzauberungs-Pläne daraus stecken jetzt in der Rüstung.

## Dashboard-Ansichten (später)

Jeder Bereich bekommt eigene Ansichten fürs Dashboard. Vorbild ist das iOS-Kontrollzentrum
(`../referenz/dashboard/kontrollzentrum-galerie.png`, `../referenz/dashboard/kontrollzentrum-bearbeiten.png`):

- **Ansichten in festen Rastergrößen**: klein 1×1, breit 2×1, groß 2×2. Das Raster hat 4 Spalten. Ein Bereich kann dieselbe Ansicht in mehreren Größen anbieten.
- **Galerie** „Ansicht hinzufügen“: nach Bereich gruppiert, mit Suche
- **Bearbeiten-Modus**: „−“ entfernt eine Ansicht, der Griff an der Ecke ändert die Größe
- **Seiten**: Das Kontrollzentrum hat mehrere Seiten mit einer Icon-Leiste am Rand. Das würde zu einer Seite pro Bereich passen (noch offen).

Im Code vorbereitet: `ansichten` im Modul-Vertrag der Registry `BEREICHE`. Welche Ansichten ein Bereich bekommt, klären wir, wenn wir den Bereich durchgehen.

## Welt-Import: Biome aus dem Weltordner (`.zip` oder `.mcworld`)

Bauplan: `PLAN-welt-import-biome.md` (von Max) und Strang C in `../planung/PLAN.md`. Biome kommen nur noch aus einer hochgeladenen Bedrock-Welt; die Companion liest sie im Browser (Web Worker) und zeigt sie flächig auf der Karte.

**Anleitung für Max (iPhone):** In der Karte unten **Welt-Import** → die drei Schritte stehen direkt über dem Knopf:
1. Dateien-App: Auf meinem iPhone › Minecraft › games › com.mojang › minecraftWorlds
2. Den richtigen Weltordner finden (Name in `levelname.txt`), den Ordner **öffnen**, alles darin auswählen, „Komprimieren“
3. Die entstandene `Archiv.zip` in der Companion auswählen

Danach: Weltname und Seed bestätigen → **Biome lesen** (Fortschritt, Abbrechen) → Prüfliste → **Übernehmen**. Umbenennen in `.mcworld` ist nicht nötig; eine echte `.mcworld` geht genauso. Für eine Realm-Welt: Realm herunterladen, dann wie oben.

**Ablauf** (Abschnitt 9h, Sheet `weltimport`):
- **Aufbauprüfung** (`biom-welt.js`, schnell, ohne die Weltdaten): Dateien werden per Basisname gesucht – eine ZIP mit zusätzlichem Ordner (Weltordner selbst komprimiert) geht **ohne Hinweis** durch. Meldungen gibt es nur für „Bitte die erzeugte Archiv.zip auswählen.“ (keine ZIP) und „Das sieht nicht nach einem Minecraft-Weltordner aus.“ (`level.dat` oder `db/` fehlt), dazu Java-Welten und kaputte Weltdaten.
- **Bestätigung**: Weltname aus `levelname.txt` (sonst `LevelName`), Seed ✔/✘ gegen die gewählte Welt, Spielversion. Passt der Seed nicht, ist „Biome lesen“ gesperrt; angeboten wird „Zur Welt mit diesem Seed wechseln“ bzw. „Neue Welt mit diesem Seed anlegen“.
- **Prüfliste**: Chunks je Dimension, Vorschau (1 Pixel = 1 erkundeter Chunk, unbekannte IDs rot), häufigste Biome mit Anteil, unbekannte Biom-IDs mit Beispielkoordinate, „Ersetzt den Import vom …“. Übernehmen schickt alles in einem `PUT` ans Board; die anderen Handys bekommen es live (`geaendert` „biome“).
- **Import löschen** im selben Sheet, mit zweitem Tippen.
- **Karte**: je Kachel (32 × 32 Chunks) ein Bild, unscharf vergrößert wird nichts (`imageSmoothingEnabled = false`). Farben: `BIOM_FARBE` (Nether, End), sonst die von minecraft-data wie auf der Seed Map. Legende = die vier häufigsten Biome im Ausschnitt. Ohne Orte passt „Alles zeigen“ auf die Biome. Ein-/Ausblenden merkt sich das Gerät (`orte.biome`).
- **Datei geöffnet** (`file://`): Die Demo-Biome erscheinen, der Import selbst braucht http (Module-Worker) und sagt das.

| Datei | Inhalt |
|---|---|
| `biom-import.worker.js` | Web Worker (`type: "module"`): `pruefen` → Name, Seed, Version; `start` → Fortschritt, dann `{ meta, kacheln }` mit Base64-Kacheln |
| `biom-dekoder.js` | reine Funktionen: Chunk-Schlüssel, Data3D (Höhenkarte + Biom-Sektionen), Oberflächenbiom, `level.dat` (NBT), Kacheln 32 × 32 Chunks, Base64 |
| `biom-welt.js` | `weltPruefen(datei)` (Aufbau, Name, Seed) und `weltLesen(datei)`: ZIP → `level.dat` → LevelDB-Dateien **einzeln** entpacken und mit Besucher parsen (Streaming) oder `readMcworld()` (Vergleich); gemeinsam für Worker und Node |
| `biom-ids.js` | erzeugte ID-Tabelle (minecraft-data `bedrock/1.20.0`, IDs 0–191, dazu bestätigt 195 Dappled Forest), setzt `globalThis.BIOM_IDS`; die Seite bindet sie per `<script>` ein (`BIOM_INFO`) |
| `vendor/mcbe-leveldb.js` | Bundle aus `mcbe-leveldb-reader` 5.0.1 + zip.js (211 KB, gzip 86 KB), Lizenzen in `vendor/LIZENZEN.txt` |
| `tools/` | `npm ci`, dann `npm run vendor` / `npm run biom-ids` (neu erzeugen), `npm test` (Gegenprobe mit prismarine-chunk), `node welt-pruefen.mjs <welt.mcworld> [--weg beide] [--massstab 4] [--punkt x,z]` |

- **Daten**: pro Welt genau ein Import (`WeltImport` + Kacheln, siehe API). Kachel = 32 × 32 Chunks, Wert = Bedrock-ID + 1, 0 = unerkundet, Uint16 → 2048 Byte, im Transport Base64. Regel `biomImportPruefen()` in `regeln.js`: Seed = Seed der Welt, Dimension, genau 2048 Byte, Kachel innerhalb der Weltgrenze, keine doppelte Kachel, höchstens 20 000 Kacheln.
- **Mock**: Die Demo-Welt `w_1` bekommt erzeugte Biome (`demoBiome()`: Rauschen, ein Fluss, erkundet rund um Spawn und Orte). Die echte Fixture-Welt von Max (`tests/daten/fixture-seed.mcworld`) prüft den Dekoder in `biom-dekoder.test.mjs`.
- **Prüfskript** `tools/welt-pruefen.mjs`: Weltname, Seed, Version, Chunks je Dimension, Ausdehnung, häufigste Biome, unbekannte IDs mit Beispielkoordinate, Laufzeit und Spitzenspeicher je Weg, PNG je Dimension nach `tests/bilder/` (1 Pixel = 1 Chunk, unbekannt rot). `--punkt x,z` zeigt die Höhenkarte in beiden Lesarten – zum Abgleich mit der Y-Anzeige im Spiel.
- **Tests**: `node --test biom-dekoder.test.mjs` (Dekoder, Aufbauprüfung, synthetische Welten aus `tests/welt-bauen.mjs`, Fixture-Welt von Max) und `node karte-mcworld.test.mjs` (Playwright: DEMO über http, als Datei, live am echten Board).
- **Phase 1 abgeschlossen** (29.09.2026, an der Fixture-Welt von Max `tests/daten/fixture-seed.mcworld`, Bedrock 1.26.51): Höhenkarte `z*16 + x` an seiner Stelle bestätigt, 8 von 8 Chunkbase-Stichproben passen, ID 195 = Dappled Forest.
- **Noch offen**: die Realm-Welt am iPhone (Laufzeit und Speicher; nur nach `tests/daten/privat/`, steht in `.gitignore`) und die IDs von Cherry Grove, Pale Garden und Sulfur Caves, bis eine Welt sie enthält.

## Sammelobjekte

- 18 Rüstungsbesätze + Netheritaufwertung mit den **Namen aus Bedrock** (`texts/de_DE.lang`, z. B. „Wächterzier“, „Mündelzier“), englischer Name klein daneben, Stand inkl. Fluss/Blitz aus 1.21
- **Icon je Besatz**: die Schmiedevorlage aus `ruestungs-baukasten/vorlagen/` (`vorlageDatei()`), in der Liste und im Kopf des Details; offene blass
- Gruppiert nach Fundort-Struktur, Karten nach Dimension eingefärbt; Fundort-Hinweis (Truhe, Seltsamer Kies, Tresor, Großer Wächter)
- **Kennblock je Struktur** als Bild (`icons/struktur_kennbloecke/<id>.png`, z. B. Netherziegel für die Netherfestung) im Kopf jeder Gruppe und im Detail. Dazu der deutsche Strukturname, darunter klein der Name aus der Seed Map („Nether Fortress“), über den die Verknüpfung zur Karte läuft
  - `STRUKTUREN` (Abschnitt 2) ordnet jeder FeatureCategory die Struktur-ID und den deutschen Namen aus `icons/manifest.json` zu
  - Ohne Bild (`bild:false`, zurzeit **Pfadruinen**: Seltsamer Kies fehlt noch) oder wenn die Datei nicht lädt, steht das Symbol aus `SYMBOL` im Kasten
- **Abhaken gilt für die ganze Welt** und merkt sich, wer es wann gefunden hat
- Fortschritt: gefunden / 18, Fundorte bekannt / 13, Prozent
- Verknüpfung zur Karte: pro Fundort die bekannten Strukturen aus der Koordinaten-Sammlung, nächste mit Entfernung; „Karte“ springt direkt hin

## Rüstung

Rüstungs-Sets wie in den Vorlagen (`referenz/ruestung/`): je Teil **Vorlage + Rüstung + Material** am Schmiedetisch. Grundlage ist der **Rüstungs-Baukasten** (`ruestungs-baukasten/`, Bedrock-Texturen aus Mojangs `bedrock-samples`, Regeln in dessen `LIESMICH.md`).

- **Sets gelten für alle Welten** (wie Banner), alle im Raum sehen und bearbeiten dieselben. Ein Set hat bis zu vier Teile (Helm, Harnisch, Beinschutz, Stiefel); je Teil Rüstung (Leder, Kette, Kupfer, Eisen, Gold, Diamant, Netherit, Schildkröte nur als Helm), Rüstungsbesatz + Material (11 Materialien), Lederfarbe (16 Farbstoffe oder ungefärbt) und verzaubert ja/nein
- **Besätze der Welt**: Was das Set braucht, wird mit den Sammelobjekten der aktuellen Welt abgeglichen – in der Liste „2/3 gefunden“, im Detail je Teil „✓ In dieser Welt gefunden · Lena“ oder „Fehlt noch · Pfadruinen ›“ (springt zum Sammelobjekt)
- **Liste**: vier Item-Icons je Set (verzauberte schimmern), die nötigen Vorlagen, Stand in dieser Welt
- **Detail**: Figur auf dem Rüstungsständer, darunter je Teil der Schmiedetisch (Vorlage + Rüstung + Material → Ergebnis), „Du brauchst“ (Vorlagen gezählt mit Stand, Netheritaufwertungen, Materialien, Hinweis zum Vervielfältigen), Verzaubern am Amboss (Pläne mit wenig XP, Schritte abhaken nur auf dem Gerät), Aufs Board, Bearbeiten, Löschen (zweimal tippen)
- **Editor = Schmiedetisch**: oben die Figur (bleibt stehen), Reiter für die vier Teile, darunter die drei Slots. Ein Slot öffnet sein Raster: Vorlagen (✓ = in dieser Welt gefunden), Rüstungen, Materialien. Nach der Vorlage geht es gleich zum Material. Bei Leder die Farben, dazu der Schalter „Verzaubert“
- **Figur**, je nachdem, was geht:
  - **3D** (über http, three.js r128 vom CDN): `figur3d.js` – drehbar per Ziehen, Rüstungsständer oder Steve, Sockel und Hintergrund der Dimension (Oberwelt, Nether, End; auf dem Gerät gemerkt), verzauberte Teile schimmern
  - **2D** (über http ohne three.js, z. B. ohne Internet): flache Figur aus `baukasten.js`, antippen dreht sie um
  - **Nur Icons** (als Datei geöffnet): Canvas-Pixel und ES-Module sind bei `file://` gesperrt, deshalb zeigt die Bühne die vier Icons
- **Icons** kommen immer aus `fertig/items/` (1116 vorgerenderte Kombinationen, `<ruestung>_<teil>[_<farbe|standard>][__<material>].png`) – das geht auch als Datei. Das Inventar-Icon zeigt wie im Spiel nur die Besatz-Farbe, das Muster sieht man an der Figur
- IDs wie im Baukasten-Manifest (`helmet`, `netherite`, `amethyst` …), Namen wie in Bedrock. `RUESTUNGS_TEILE`, `RUESTUNGEN`, `BESATZ_MATERIALIEN` stehen in `regeln.js`; ein Server-Test prüft, dass sie zum Manifest passen

## Portal-Verwaltung

- **Umrechnen**: Oberwelt → Nether oder zurück, X/Y/Z mit ±-Taste, „Mein Standort“ übernehmen. Zeigt das Gegenportal (Oberwelt ÷ 8 abgerundet, Nether × 8 mit dem Bereich, den ein Nether-Block abdeckt) und **wo man mit den erfassten Portalen ankommen würde**. Kopieren, TP-Befehl, direkt „Als Verbindung anlegen“
- **Verbindungen** je Welt (für alle gemeinsam): Name + Oberwelt-Portal + Nether-Portal. Jede Karte zeigt den Status:
  - **Verbunden**: beide Richtungen landen am eigenen Gegenportal
  - **Einseitig** / **Falsch verknüpft**: eine oder beide Richtungen landen bei einem anderen Portal
  - **Neues Portal**: im Suchbereich liegt kein Portal, das Spiel würde ein neues bauen
- **Detail**: beide Portale mit Kopieren/TP-Befehl, Prüfung beider Richtungen, Abstand zum Idealpunkt und ein konkreter Vorschlag (z. B. „Nether-Portal genau bei X 37 · Y 80 · Z −53 bauen“). Der Vorschlag wird vorher durchgerechnet
- **Editor**: „Aus Oberwelt berechnen (÷ 8)“ / „Aus Nether berechnen (× 8)“, **Live-Prüfung** beim Tippen
- **Infokarte** (über „Info“ in der Bottom-Bar ein-/ausblendbar): 8 Punkte zum gezielten Verknüpfen, umschaltbar **Bedrock / Java**. Der Schalter legt auch die Regeln der Prüfung fest (Einstellung auf dem Gerät, Standard Bedrock)

**Prüf-Logik** (nach minecraft.wiki, „Portal search“): Position umrechnen → im quadratischen Suchbereich um den Zielpunkt nach Portalen suchen (**Bedrock ±128 in beiden Dimensionen**, **Java ±16 im Nether / ±128 in der Oberwelt**) → das nächste nach 3D-Abstand gewinnt (Y zählt mit), keins gefunden → neues Portal. Geprüft wird nur mit den erfassten Portalen; nicht erfasste (vom Spiel erzeugte, alte) können trotzdem stören.

> Hinweis zu `modul-a-live-karte.html`: Der Text im alten Portal-Linker („Bedrock sucht im Nether … ±16 Blöcken“) stimmt nur für Java. Bedrock sucht auch im Nether ±128.

## Banner

- **Baupläne gelten für alle Welten** (ein Banner hängt nicht am Seed), alle im Raum sehen und bearbeiten dieselben
- **Screenshot** (Bottom-Bar, live): Anleitungen mit Schritten wie „Black Base“, „Cyan Bordure“, „Light Blue Lozenge“ liest das Board aus. Die Prüfliste zeigt Vorschau und Schritte auf Deutsch und schlägt einen Namen vor; „Banner speichern“ legt den Bauplan an. Schritt 1 („<Farbe> Base“) ist die Grundfarbe; derselbe Banner wird kein zweites Mal gespeichert. Geht auch über „Screenshot“ in der Karte
- **Liste** als Raster mit Vorschau; Suche nach Name oder Musternamen
- **Detail**: Material (Wolle, Stock, Farbstoffe gezählt), nötige Bannervorlagen mit Herkunft, **Anleitung Schritt für Schritt** – jeder Schritt zeigt, wie das Banner danach aussieht; abhaken (nur auf diesem Gerät, wird zurückgesetzt, wenn sich das Muster ändert)
- **Editor**: Grundfarbe (16), bis zu 6 Ebenen; pro Ebene Farbe + Muster aus einem Raster mit Vorschaubildern (wie am Webstuhl), Ebenen verschieben/entfernen; Vorschau bleibt oben stehen
- Alle 42 Muster mit **deutschen Spielnamen**, englischer Name klein daneben; 10 davon brauchen eine Bannervorlage (Java seit 1.21.2 wie Bedrock)
- Löschen mit zweitem Tippen („Wirklich löschen?“), weil ein Bauplan für alle weg ist
- Vorschau ist vereinfacht (Pixel-Masken, keine Original-Texturen)

## Live-Betrieb am Koordinaten-Board

Seit der Zusammenführung (Entscheidung von Max, 29.09.2026) ist das **Koordinaten-Board der Server der Companion**: Es liefert die Seite unter `/` aus, speichert alle Daten (`koordinaten-board/server/daten/daten.json`) und hält die Anzeige im Zimmer aktuell.

- **Erkennung**: `init()` fragt `GET /api/server`. Antwortet das Board, läuft die Companion live, sonst (Datei, anderer Server, `?demo=1`) der DEMO-Mock.
- **Anmeldung = Beitreten mit Account** (Strang B, B2): Das Handy scannt den QR-Code mit der Kamera-App und landet auf `/?pin=…`. Das Sheet „Beitreten“ hat die Board-PIN schon und zeigt die Accounts des Boards zum Antippen (`POST /api/beitreten/konten`). Man wählt seinen Account oder tippt einen neuen Namen, dazu die **eigene PIN** (4–8 Ziffern): Gibt es den Namen, meldet die PIN dort an (auch auf einem neuen Handy), sonst entsteht ein neuer Account. Das Token ist danach der Geräteschlüssel; `IDENTITAET.werBistDu()` (`GET /api/ich`) fragt beim Start, ob es noch gilt – Tokens von vor den Accounts gelten nicht mehr, dann heißt es einmal neu anmelden. Danach nimmt `api()` den Token aus `board.verbindung`; bei 401 oder abgelehntem Token geht es zurück zum Beitreten. Die PIN verschwindet aus der Adresszeile. „Abmelden“ im Board-Sheet.
- **API**: dieselben Pfade wie im API-Vertrag, mit Präfix `/api` (Umsetzung `koordinaten-board/server/src/companion-api.js` + `daten.js`). Der Server prüft mit **derselben Datei `regeln.js`**, die die Seite lädt.
- **Live-Updates**: Nach jeder Änderung meldet das Board `{ art:"geaendert", bereich, weltId }`. `liveAktualisieren()` lädt nur den betroffenen Bereich neu (Orte ohne Ansicht, Filter oder Kartenausschnitt zu verändern).
- **Leeres Board**: Nach dem ersten Beitreten öffnet sich „Welt“, um die erste Welt mit Seed anzulegen.
- **Screenshot**: `/api/orte/auslesen` nutzt die Texterkennung des Boards.
- **Anzeige im Zimmer** (Board-Sheet, nur live): Welt auf der Anzeige (aktive Welt, gilt für das Board – die eigene Welt am Handy bleibt davon unberührt), Titel, QR-Code zeigen. Im Ort-Detail „Auf der Anzeige anheften“ (groß oben auf der Anzeige).

## Board-Verbindung

Verbindet die Companion mit dem Koordinaten-Board im Zimmer. Das ist kein Bereich, sondern gilt für das ganze Gerät: Eintrag **Board** unten in der Sidebar, der Status-Punkt zeigt den Zustand (grau nicht verbunden, gelb verbindet, grün verbunden, rot getrennt).

- **Scannen**: Das Sheet „Mit Board verbinden“ startet die Kamera und sucht den QR-Code der Anzeige (`http://<ip>:<port>/?pin=1234`). Erkennung per `BarcodeDetector`, wo es ihn gibt (Android-Chrome), sonst per **jsQR** (wird erst beim Scannen vom CDN geladen, `CONFIG.qrBibliothek`).
- **Ausweichwege**: „Foto vom QR-Code“ und Adresse + PIN von Hand. Die ganze Beitritts-Adresse lässt sich auch einfügen, sie wird in Adresse und PIN aufgeteilt; ohne Port gilt `:3000`.
- **Beitreten**: Sind Name und eigene PIN schon eingetragen, tritt die Companion nach dem Erkennen sofort bei (`POST /api/beitreten`), sonst springt sie ins fehlende Feld. Danach hält sie `/ws?token=…` offen, verbindet bei Abbruch neu und nach dem Standby sofort. Lehnt das Board das Token ab, vergisst sie die Verbindung.
- **Verbunden**: Das Sheet zeigt Adresse, „Angemeldet als“, wer im Raum ist und wie viele Orte das Board hat. Die Anzeige des Boards führt die Companion wie ein Handy unter „online“. „Trennen“ vergisst die Verbindung.
- Gilt pro Gerät (`localStorage` `board.verbindung`, `board.name`) und ist auch im DEMO-Modus echt, weil das Board ein eigenes Gerät ist.

### Aufs Board · Anzeigeschema

Inhalte groß auf die Anzeige im Zimmer werfen, wie bei Chromecast. Die Karte liegt dort, bis die nächste kommt oder jemand sie wegnimmt. Das Board speichert sie nicht; nach einem Neustart ist die Anzeige frei.

**Jeder Inhalt hat ein Anzeigeschema** (Wunsch von Max): `BOARD_KARTEN` in `board-karten.js` ist das Verzeichnis, je Inhaltsart `{ titel, karte(ctx, id) }`. Die Funktion übersetzt den Inhalt in das allgemeine Kartenformat des Boards; das Board kennt keine Bereiche. Die Daten kommen über den Kontext `ctx` (in der Seite `boardKontext()`), deshalb baut der Board-Server mit genau diesen Funktionen auch die Widgets des Dashboards (`GET /api/widgets/:typ`).

| Schema | Quelle | Knopf | Inhalt der Karte |
|---|---|---|---|
| Ort | `ort:<id>` | Ort-Detail | Name, Kategorie, Koordinaten groß, umgerechnete Position, Kennblock (`typ`) |
| Sammelobjekt | `sammel:<id>` | Sammelobjekt-Detail | Besatz, Fundort-Struktur mit Kennblock, gefunden von/am oder offen, nächster bekannter Fundort, Hinweis zur Truhe |
| Sammel-Fortschritt | `sammelstand` | Bottom-Bar der Sammelobjekte | gefunden, Fortschritt, Fundorte auf der Karte, was noch offen ist |
| Portal-Verbindung | `portal:<id>` | Portal-Detail | beide Portale mit Dimension, Status, Abstand zum Idealpunkt, Vorschlag |
| Banner-Bauplan | `banner:<id>` | Banner-Detail | Vorschau als Bild (pixelgenau), Material, Bannervorlagen |
| Rüstungs-Set | `ruestung:<id>` | Rüstungs-Detail | Figur als Bild (3D-Aufnahme, sonst 2D; als Datei ohne Bild), je Teil Besatz · Material · Farbe · verzaubert, welche Besätze in der Welt noch fehlen |
| Alle Sammelobjekte | `sammelliste` | – (Widget) | alle Besätze mit gefunden von oder Fundort, je Dimension ein Block |
| Portalverbindungen | `portalliste` | – (Widget) | jede Verbindung mit Status und beiden Koordinaten |
| Gesamtkarte | `welt` | – (Widget) | Orte je Dimension und angeheftete Orte, bis die Karte einen eigenen Block hat |

- Liegt der eigene Inhalt auf dem Board, wird der Knopf zu „Liegt auf dem Board · Wegnehmen“. Das Board-Sheet zeigt unter „Auf der Anzeige“, was gerade dort liegt und von wem, mit „Wegnehmen“.
- Die Knöpfe erscheinen nur, wenn das Gerät mit einem Board verbunden ist.
- **Neuer Bereich**: Schema in `BOARD_KARTEN` eintragen und im Detail `boardZeigenKnopf("<art>:<id>")` einbauen, danach `boardZeigenKnoepfe()` aufrufen. Das Board bleibt unverändert. `karte(ctx, id)` darf async sein (die Rüstung rendert erst die Figur).

Nachrichten über die bestehende Live-Verbindung: `{ art:"zeigen", karte }` und `{ art:"verbergen", id }`, Antwort `ok`/`fehler`, an alle geht `{ art:"gezeigt", karte|null }`. Das Board prüft die Karte (`koordinaten-board/server/src/zeigen.js`):

```
karte = { titel, unter?, bereich?, quelle?, typ?, dimension: "oberwelt"|"nether"|"ende"|null,
          bloecke: [ { art:"koordinaten", label?, x, y|null, z, dimension? }
                   | { art:"zeilen", zeilen:[{ label, wert }] }            // höchstens 8 Zeilen
                   | { art:"text", text }
                   | { art:"bild", daten:"data:image/png;base64,…", label?, pixelig? } ] }   // höchstens 6 Blöcke
// typ: Feature-Typ der Seed Map („Nether Fortress“), höchstens 40 Zeichen → Kennblock auf der Anzeige
// bild: PNG, JPEG oder WebP als Data-URL, höchstens 200 KB, kein SVG; pixelig = Pixelkunst scharf vergrößern
```

**Anzeigen** (Board-Sheet, live): Jede Anzeige des Boards hat einen Anzeige-Link mit eigenem Schlüssel, damit ein anderes Gerät im WLAN (TV-Browser, Tablet) Anzeige sein darf. Je Anzeige: Link kopieren, QR-Code (SVG vom Board), Umbenennen, Neuer Schlüssel (zweimal tippen, alte Links gehen danach nicht mehr). Darunter „Neue Anzeige“. Live über `geaendert` „anzeigen“.

**https ↔ http:** Im Live-Betrieb stellt sich die Frage nicht mehr: Companion und Board kommen vom selben Server (http im Heimnetz), das Handy braucht keine Kamera in der Seite. Sie gilt nur noch, wenn die Companion woanders über **https** läuft (z. B. später Hetzner) und sich mit dem Board im Heimnetz verbinden soll. Browser blockieren Anfragen von einer https-Seite an eine http-Adresse (Mixed Content), Safari auf dem iPhone ausnahmslos. Die Kamera wiederum gibt es nur in einem sicheren Kontext (https oder localhost). Heute funktioniert die Verbindung deshalb, wenn die Companion über http oder als Datei geöffnet wird; die Kamera dann nur am Rechner, am Handy bleiben Foto und Eingabe von Hand. Die Companion meldet den Fall ausdrücklich („Der Browser blockiert die Verbindung …“).

## Regeln (`regeln.js` – Handy und Board-Server prüfen mit derselben Datei)

1. „Eigene Orte“ ist eine zusätzliche Kategorie; dort legt man Typen (Ortsnamen) selbst an.
2. In allen anderen Kategorien entstehen neue Typen nur aus Screenshots (Variante aus dem Popup, z. B. Stronghold → „Stairway“).
3. Biome kommen nur aus dem Welt-Import (`biomImportPruefen()`): Der Seed der hochgeladenen Welt muss zum Seed der gewählten Welt passen; pro Welt genau ein Import, ein neuer ersetzt den alten. Als Ort lehnt `instanzPruefen()` die Kategorie „Biomes“ ab.
4. Unerkundete Chunks bleiben leer. Unbekannte Biom-IDs werden gespeichert, aber leer gezeigt und in der Prüfliste gemeldet; kennt `biom-ids.js` sie später, erscheinen sie ohne neuen Import.
5. Portal-Verbindungen (`verbindungRegelPruefen()`): Name 1–60 Zeichen, X/Z ganze Zahlen innerhalb der Welt (Nether: Weltgrenze ÷ 8), Y leer oder Oberwelt −64…320 / Nether 0…256.
6. Banner (`bannerPruefen()`): Name 1–60 Zeichen, Grundfarbe und Farben aus den 16 Farbstoffen, Muster aus der Musterliste, höchstens 6 Ebenen.
7. Rüstungs-Sets (`ruestungPruefen()`): Name 1–60 Zeichen, mindestens ein Teil. Die Rüstung muss es als dieses Teil geben (Schildkröte nur als Helm). Ein Besatz ist einer der 18 Rüstungsbesätze und braucht ein Material. Farbe nur bei Leder, aus den 16 Farbstoffen. `ruestungSauber()` lässt Material ohne Besatz und Farbe bei anderer Rüstung weg.

## API-Vertrag

| Methode | Pfad | Body | Antwort |
|---|---|---|---|
| GET | `/orte/welten` | – | `{ welten:[{ id, seed, anzahl }] }` |
| POST | `/orte/welten` | `{ seed }` | `{ welt }` – legt 3 Dimensionen an |
| GET | `/orte/welten/:id` | – | `{ welt, dimensionen, typen, instanzen }` |
| POST | `/orte/instanzen` | `{ id?, dimensionId, kategorie, variante, x, y, z, quelle }` | `{ instanz, typ }` – Typ wird gefunden oder angelegt |
| PATCH | `/orte/instanzen/:id` | `{ x, y, z }` | `{ instanz }` |
| PUT | `/orte/instanzen/:id/angeheftet` | `{ angeheftet }` | `{ instanz }` – groß auf der Anzeige |
| DELETE | `/orte/instanzen/:id` | – | `{ ok:true }` |
| POST | `/orte/auslesen` | multipart `datei` | `{ erkannt:{ titel, kategorie, variante, dimension, x, y, z } \| null, banner:{ basis, ebenen, unklar } \| null }` – erst Seed-Map-Popup, sonst Banner-Anleitung |
| GET | `/welten/:id/biome` | – | `{ import:WeltImport \| null, kacheln:[{ dim, kx, kz, daten }] }` |
| PUT | `/welten/:id/biome` | `{ import:{ dateiname, weltname, seed, spielversion, chunks, unbekannt }, kacheln }` | `{ import }` – ersetzt Import und alle Kacheln; `id`, `weltId`, `von`, `importiertAm` setzt der Server |
| DELETE | `/welten/:id/biome` | – | `{ ok:true }` |
| GET | `/sammelobjekte/welten/:id` | – | `{ status:{ [objektId]:{ von, am } } }` |
| PUT | `/sammelobjekte/welten/:id/:objektId` | `{ gefunden }` | `{ status }` |
| GET | `/portale/welten/:id` | – | `{ verbindungen:[verbindung] }` |
| POST | `/portale/welten/:id` | `{ id?, name, oberwelt, nether }` | `{ verbindung }` – `von`/`am` setzt der Server |
| PUT | `/portale/:id` | `{ name, oberwelt, nether }` | `{ verbindung }` |
| DELETE | `/portale/:id` | – | `{ ok:true }` |
| GET | `/banner` | – | `{ liste:[banner] }` |
| POST | `/banner` | `{ id?, name, basis, ebenen }` | `{ banner }` – `von`/`am` setzt der Server |
| PUT | `/banner/:id` | `{ name, basis, ebenen }` | `{ banner }` |
| DELETE | `/banner/:id` | – | `{ ok:true }` |
| GET | `/ruestung` | – | `{ sets:[set] }` |
| POST | `/ruestung` | `{ id?, name, teile }` | `{ set }` – `von`/`am` setzt der Server |
| PUT | `/ruestung/:id` | `{ name, teile }` | `{ set }` |
| DELETE | `/ruestung/:id` | – | `{ ok:true }` |
| GET | `/board/einstellungen` | – | `{ titel, qrZeigen, aktiveWelt, aktiv }` – nur Board |
| PUT | `/board/einstellungen` | `{ titel?, qrZeigen?, aktiveWelt? }` | wie GET |

**IDs vom Handy (Strang B):** Beim Anlegen von Orten, Portal-Verbindungen, Bannern und Rüstungs-Sets schickt die Companion die ID mit (`id`, UUID v4 aus `neueEintragId()` in `regeln.js`, auch über http ohne sicheren Kontext), damit sie später offline anlegen kann. Der Server prüft das Format (`idGueltig()`, sonst 400) und lehnt doppelte IDs ab (409); ohne `id` vergibt er eine wie bisher. Jeder Eintrag trägt außerdem `erstellerId` (stabile Benutzer-ID; bis zu den Accounts in B2 „unbekannt“), `von` bleibt nur zur Anzeige.

`verbindung = { id, name, oberwelt:{ x, y|null, z }, nether:{ x, y|null, z }, von, am }`

`banner = { id, name, basis, ebenen:[{ muster, farbe }], von, am }` (Farb- und Muster-IDs wie im Spiel, z. B. `light_blue`, `stripe_bottom`)

`set = { id, name, teile:{ helmet|chestplate|leggings|boots: { ruestung, muster|null, material|null, farbe|null, verzaubert } | null }, von, am }` (IDs wie im Rüstungs-Baukasten, `muster` = ID des Sammelobjekts)

`typ = { id, kategorie, variante|null }` · `instanz = { id, dimensionId, featureTypeId, x, y|null, z, quelle, angeheftet, von, am }` · `quelle = "screenshot" | "manuell"`

`WeltImport = { id, weltId, dateiname, weltname, seed, spielversion, chunks:{ overworld, nether, end }, unbekannt:[{ bedrockId, chunks, beispiel:{ dim, x, z } }], von, importiertAm }` · Kachel `daten` = Base64 von 1024 × Uint16 LE (Bedrock-ID + 1, 0 = unerkundet)

Live gelten alle Pfade mit Präfix `/api` und Bearer-Token. Die Texterkennung (`/orte/auslesen`) läuft im Board (`../koordinaten-board/server/src/erkennung.js`, `fuerCompanion()`); ein Biom-Popup erkennt sie weiter als Biom – die Companion zeigt es dann ausgegraut, weil Biome nur aus dem Welt-Import kommen.

## Einbau ins Modul Karte (modul-a-live-karte.html)

- CSS-Abschnitt „KARTE · KOORDINATEN-SAMMLUNG“ übernehmen (Basis ist identisch)
- Die Liste wird ein zweiter Bereich neben dem Karten-Canvas (Umschalter Karte | Liste)
- Marker und Biom-Kacheln werden in den bestehenden Renderer der Live-Karte gezeichnet,
  statt im eigenen Canvas – Spieler-Positionen und Sammlung auf einer Karte. Biome: je sichtbarer Kachel `kachelBild(k)` (32 × 32-Canvas) mit `imageSmoothingEnabled = false` unter Raster und Markern
- **Welt-Import**: `biom-ids.js` vor dem Haupt-Script einbinden; `biom-import.worker.js`, `biom-welt.js`, `biom-dekoder.js` und `vendor/` neben die Hauptdatei legen (der Worker lädt sie als ES-Module, nur über http). Der Service Worker der PWA muss sie im Precache haben. Abschnitt 9h und `<input id="weltDatei">` übernehmen, auf dem Board liefern sie die Routen in `server.js` aus
- JS-Abschnitte 2–9 übernehmen; `api()`, `esc()`, `THEMES` gibt es dort schon
- Sidebar der Hauptdatei auf `BEREICHE` umstellen (Karte, Sammelobjekte, Portal-Verwaltung, Handbuch, Baupläne, Banner, Rüstung)
- `regeln.js` und `board-karten.js` neben die Hauptdatei legen und in dieser Reihenfolge vor dem Haupt-Script einbinden (`<script src="regeln.js">`, `<script src="board-karten.js">`); das Board liefert dann statt der Prototyp-Datei die Hauptdatei aus (`COMPANION_DATEI`)
- Ordner `icons/` neben die Hauptdatei legen (Kennblöcke für Karte und Sammelobjekte, Pfad `KENNBLOCK_PFAD`). Fehlt er, stehen überall die Symbole
- Ordner `ruestungs-baukasten/` neben die Hauptdatei legen (Pfad `BAUKASTEN`); das Board liefert ihn unter `/ruestungs-baukasten/` aus
- Die Canvas-Marker zeichnet dort der bestehende Renderer: Kennblock über `kennblockBild(kategorie)` holen (liefert das geladene Bild oder `null`, dann das Symbol)

## Tests

`tests/` enthält Node-Tests für den Biom-Dekoder und Playwright-Tests für Banner, Portal-Verwaltung, Sammelobjekte, Kennblöcke in der Karte, Board-Verbindung, den Live-Betrieb am echten Board, die Anzeigeschemas, die Rüstung und den Welt-Import (`cd tests && npm install && npm test`, Details in `UEBERGABE.md`). Screenshots landen in `tests/bilder/`. Rüstung, Anzeigeschema, Welt-Import und Live laufen über http (`hilfen.mjs`: kleiner Server für den Ordner, three.js aus `node_modules` statt vom CDN, Chromium mit Software-WebGL).

## Referenz

`referenz/` enthält die Bilder, auf denen einzelne Bereiche beruhen (Fundorte, Banner-Editor, Rüstungs-Sets und Verzauberungen).
Was auch das Koordinaten-Board betrifft, liegt in `../referenz/`: Datenmodell, Seed-Map-Screenshots und das Kontrollzentrum als Dashboard-Vorbild.

## Offen

- Welt-Import an echten Welten von Max prüfen (siehe Welt-Import → Noch offen)
- Aus der früheren Board-Steuerung noch nicht übernommen: Notiz, Kartenausschnitt als Bild, Export als JSON
- Dashboard-Ansichten pro Bereich (siehe oben): Seiten pro Bereich? Wo bearbeitet man – Handy oder Anzeige?
- Inhalte der geplanten Bereiche (werden einzeln durchgegangen)
- Aufs Board: bleibt eine Karte liegen, bis jemand sie wegnimmt, oder verschwindet sie nach einiger Zeit?
