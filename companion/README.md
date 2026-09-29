# Companion · Prototyp – Karte, Sammelobjekte, Portale, Banner

Koordinaten-Sammlung für das Modul **Karte** (vormals Live-Karte) der Minecraft Companion PWA, nach dem minimalen Datenmodell (`../referenz/minecraft_tool_datenmodell.md`)
(`World → Dimension → FeatureInstance → FeatureType → FeatureCategory`).
Eine HTML-Datei, Vanilla JS, gleiche Shell und Basis-CSS wie `modul-a-live-karte.html`.

**Neuer Chat / Weitermachen:** zuerst `../UEBERGABE.md` (projektübergreifend), dann `UEBERGABE.md` lesen – Stand, Entscheidungen, offene Punkte.

**Ausprobieren:** `companion-prototyp.html` direkt öffnen (am Handy oder Desktop) – dann läuft der DEMO-Mock mit Beispielwelt. **Live** läuft die Companion, wenn das Koordinaten-Board sie ausliefert: Board starten, `http://<board>:3000/?pin=<PIN>` öffnen oder den QR-Code der Anzeige mit der Kamera-App scannen (siehe „Live-Betrieb“). Mit `?modul=sammelobjekte`, `?modul=portale` oder `?modul=banner` startet man direkt im jeweiligen Bereich, `?demo=1` erzwingt den Mock.

Neben der Seite gehören `regeln.js` (Stammdaten und Regeln, die auch der Board-Server lädt) und `icons/` (Kennblöcke) in denselben Ordner.

## Was drin ist

- **Dimensions-Reiter** Oberwelt / Nether / End – färben die ganze Oberfläche (THEMES aus Modul A)
- **Liste** als Akkordion: Kategorie → Variante (FeatureType) → Instanzen, mit Suche und Kategorie-Filter
- **Karte**: Features und eigene Orte als Marker; Biome als Fläche **nur um bekannte Punkte** (`CONFIG.biomRadius`), unbekannte Fläche bleibt leer
- **Screenshot** (Bottom-Bar): mehrere Seed-Map-Screenshots → Prüfliste → speichern; Duplikat-Hinweis, Biom-/Dimensionsprüfung
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
| Rüstung | geplant | Rüstungs-Sets |

Neue Bereiche: Eintrag in `BEREICHE` + Icon in `ICON`. Ohne `mount()` zeigt die Sidebar den Bereich als „geplant“.
Die Details jedes Bereichs werden einzeln festgelegt. Reihenfolge: Banner ✓ → Portal-Verwaltung ✓ → Rüstung, Handbuch, Baupläne.
Für Rüstung liegt ein erster Code-Entwurf in `entwuerfe/banner-ruestung.js` (nicht eingebaut; der Banner-Teil darin ist überholt).

## Dashboard-Ansichten (später)

Jeder Bereich bekommt eigene Ansichten fürs Dashboard. Vorbild ist das iOS-Kontrollzentrum
(`../referenz/dashboard/kontrollzentrum-galerie.png`, `../referenz/dashboard/kontrollzentrum-bearbeiten.png`):

- **Ansichten in festen Rastergrößen**: klein 1×1, breit 2×1, groß 2×2. Das Raster hat 4 Spalten. Ein Bereich kann dieselbe Ansicht in mehreren Größen anbieten.
- **Galerie** „Ansicht hinzufügen“: nach Bereich gruppiert, mit Suche
- **Bearbeiten-Modus**: „−“ entfernt eine Ansicht, der Griff an der Ecke ändert die Größe
- **Seiten**: Das Kontrollzentrum hat mehrere Seiten mit einer Icon-Leiste am Rand. Das würde zu einer Seite pro Bereich passen (noch offen).

Im Code vorbereitet: `ansichten` im Modul-Vertrag der Registry `BEREICHE`. Welche Ansichten ein Bereich bekommt, klären wir, wenn wir den Bereich durchgehen.

## Sammelobjekte

- 18 Rüstungsbesätze + Netheritaufwertung (deutsche Spielnamen, englischer Name daneben), Stand inkl. Fluss/Bolzen aus 1.21
- Gruppiert nach Fundort-Struktur, Karten nach Dimension eingefärbt; Fundort-Hinweis (Truhe, Seltsamer Kies, Tresor, Großer Wächter)
- **Kennblock je Struktur** als Bild (`icons/struktur_kennbloecke/<id>.png`, z. B. Netherziegel für die Netherfestung) im Kopf jeder Gruppe und im Detail. Dazu der deutsche Strukturname, darunter klein der Name aus der Seed Map („Nether Fortress“), über den die Verknüpfung zur Karte läuft
  - `STRUKTUREN` (Abschnitt 2) ordnet jeder FeatureCategory die Struktur-ID und den deutschen Namen aus `icons/manifest.json` zu
  - Ohne Bild (`bild:false`, zurzeit **Pfadruinen**: Seltsamer Kies fehlt noch) oder wenn die Datei nicht lädt, steht das Symbol aus `SYMBOL` im Kasten
- **Abhaken gilt für die ganze Welt** und merkt sich, wer es wann gefunden hat
- Fortschritt: gefunden / 18, Fundorte bekannt / 13, Prozent
- Verknüpfung zur Karte: pro Fundort die bekannten Strukturen aus der Koordinaten-Sammlung, nächste mit Entfernung; „Karte“ springt direkt hin

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
- **Liste** als Raster mit Vorschau; Suche nach Name oder Musternamen
- **Detail**: Material (Wolle, Stock, Farbstoffe gezählt), nötige Bannervorlagen mit Herkunft, **Anleitung Schritt für Schritt** – jeder Schritt zeigt, wie das Banner danach aussieht; abhaken (nur auf diesem Gerät, wird zurückgesetzt, wenn sich das Muster ändert)
- **Editor**: Grundfarbe (16), bis zu 6 Ebenen; pro Ebene Farbe + Muster aus einem Raster mit Vorschaubildern (wie am Webstuhl), Ebenen verschieben/entfernen; Vorschau bleibt oben stehen
- Alle 42 Muster mit **deutschen Spielnamen**, englischer Name klein daneben; 10 davon brauchen eine Bannervorlage (Java seit 1.21.2 wie Bedrock)
- Löschen mit zweitem Tippen („Wirklich löschen?“), weil ein Bauplan für alle weg ist
- Vorschau ist vereinfacht (Pixel-Masken, keine Original-Texturen)

## Live-Betrieb am Koordinaten-Board

Seit der Zusammenführung (Entscheidung von Max, 29.09.2026) ist das **Koordinaten-Board der Server der Companion**: Es liefert die Seite unter `/` aus, speichert alle Daten (`koordinaten-board/server/daten/daten.json`) und hält die Anzeige im Zimmer aktuell.

- **Erkennung**: `init()` fragt `GET /api/server`. Antwortet das Board, läuft die Companion live, sonst (Datei, anderer Server, `?demo=1`) der DEMO-Mock.
- **Anmeldung = Beitreten**: Das Handy scannt den QR-Code mit der Kamera-App und landet auf `/?pin=…`. Das Sheet „Beitreten“ hat die PIN schon, es fehlt nur der Name. Danach nimmt `api()` den Token aus `board.verbindung`; bei 401 oder abgelehntem Token geht es zurück zum Beitreten. Die PIN verschwindet aus der Adresszeile. „Abmelden“ im Board-Sheet.
- **API**: dieselben Pfade wie im API-Vertrag, mit Präfix `/api` (Umsetzung `koordinaten-board/server/src/companion-api.js` + `daten.js`). Der Server prüft mit **derselben Datei `regeln.js`**, die die Seite lädt.
- **Live-Updates**: Nach jeder Änderung meldet das Board `{ art:"geaendert", bereich, weltId }`. `liveAktualisieren()` lädt nur den betroffenen Bereich neu (Orte ohne Ansicht, Filter oder Kartenausschnitt zu verändern).
- **Leeres Board**: Nach dem ersten Beitreten öffnet sich „Welt“, um die erste Welt mit Seed anzulegen.
- **Screenshot**: `/api/orte/auslesen` nutzt die Texterkennung des Boards.
- **Anzeige im Zimmer** (Board-Sheet, nur live): Welt auf der Anzeige (aktive Welt, gilt für das Board – die eigene Welt am Handy bleibt davon unberührt), Titel, QR-Code zeigen. Im Ort-Detail „Auf der Anzeige anheften“ (groß oben auf der Anzeige).

## Board-Verbindung

Verbindet die Companion mit dem Koordinaten-Board im Zimmer. Das ist kein Bereich, sondern gilt für das ganze Gerät: Eintrag **Board** unten in der Sidebar, der Status-Punkt zeigt den Zustand (grau nicht verbunden, gelb verbindet, grün verbunden, rot getrennt).

- **Scannen**: Das Sheet „Mit Board verbinden“ startet die Kamera und sucht den QR-Code der Anzeige (`http://<ip>:<port>/?pin=1234`). Erkennung per `BarcodeDetector`, wo es ihn gibt (Android-Chrome), sonst per **jsQR** (wird erst beim Scannen vom CDN geladen, `CONFIG.qrBibliothek`).
- **Ausweichwege**: „Foto vom QR-Code“ und Adresse + PIN von Hand. Die ganze Beitritts-Adresse lässt sich auch einfügen, sie wird in Adresse und PIN aufgeteilt; ohne Port gilt `:3000`.
- **Beitreten**: Ist der Name schon bekannt, tritt die Companion nach dem Erkennen sofort bei (`POST /api/beitreten`). Danach hält sie `/ws?token=…` offen, verbindet bei Abbruch neu und nach dem Standby sofort. Lehnt das Board das Token ab, vergisst sie die Verbindung.
- **Verbunden**: Das Sheet zeigt Adresse, „Angemeldet als“, wer im Raum ist und wie viele Orte das Board hat. Die Anzeige des Boards führt die Companion wie ein Handy unter „online“. „Trennen“ vergisst die Verbindung.
- Gilt pro Gerät (`localStorage` `board.verbindung`, `board.name`) und ist auch im DEMO-Modus echt, weil das Board ein eigenes Gerät ist.

### Aufs Board · Anzeigeschema

Inhalte groß auf die Anzeige im Zimmer werfen, wie bei Chromecast. Die Karte liegt dort, bis die nächste kommt oder jemand sie wegnimmt. Das Board speichert sie nicht; nach einem Neustart ist die Anzeige frei.

**Jeder Inhalt hat ein Anzeigeschema** (Wunsch von Max): `BOARD_KARTEN` ist das Verzeichnis, je Inhaltsart `{ titel, karte(id) }`. Die Funktion übersetzt den Inhalt in das allgemeine Kartenformat des Boards; das Board kennt keine Bereiche.

| Schema | Quelle | Knopf | Inhalt der Karte |
|---|---|---|---|
| Ort | `ort:<id>` | Ort-Detail | Name, Kategorie, Koordinaten groß, umgerechnete Position, Kennblock (`typ`) |
| Sammelobjekt | `sammel:<id>` | Sammelobjekt-Detail | Besatz, Fundort-Struktur mit Kennblock, gefunden von/am oder offen, nächster bekannter Fundort, Hinweis zur Truhe |
| Sammel-Fortschritt | `sammelstand` | Bottom-Bar der Sammelobjekte | gefunden, Fortschritt, Fundorte auf der Karte, was noch offen ist |
| Portal-Verbindung | `portal:<id>` | Portal-Detail | beide Portale mit Dimension, Status, Abstand zum Idealpunkt, Vorschlag |
| Banner-Bauplan | `banner:<id>` | Banner-Detail | Vorschau als Bild (pixelgenau), Material, Bannervorlagen |

- Liegt der eigene Inhalt auf dem Board, wird der Knopf zu „Liegt auf dem Board · Wegnehmen“. Das Board-Sheet zeigt unter „Auf der Anzeige“, was gerade dort liegt und von wem, mit „Wegnehmen“.
- Die Knöpfe erscheinen nur, wenn das Gerät mit einem Board verbunden ist.
- **Neuer Bereich**: Schema in `BOARD_KARTEN` eintragen und im Detail `boardZeigenKnopf("<art>:<id>")` einbauen, danach `boardZeigenKnoepfe()` aufrufen. Das Board bleibt unverändert.

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

**https ↔ http:** Im Live-Betrieb stellt sich die Frage nicht mehr: Companion und Board kommen vom selben Server (http im Heimnetz), das Handy braucht keine Kamera in der Seite. Sie gilt nur noch, wenn die Companion woanders über **https** läuft (z. B. später Hetzner) und sich mit dem Board im Heimnetz verbinden soll. Browser blockieren Anfragen von einer https-Seite an eine http-Adresse (Mixed Content), Safari auf dem iPhone ausnahmslos. Die Kamera wiederum gibt es nur in einem sicheren Kontext (https oder localhost). Heute funktioniert die Verbindung deshalb, wenn die Companion über http oder als Datei geöffnet wird; die Kamera dann nur am Rechner, am Handy bleiben Foto und Eingabe von Hand. Die Companion meldet den Fall ausdrücklich („Der Browser blockiert die Verbindung …“).

## Regeln (`regeln.js` – Handy und Board-Server prüfen mit derselben Datei)

1. „Eigene Orte“ ist eine zusätzliche Kategorie; dort legt man Typen (Ortsnamen) selbst an.
2. In allen anderen Kategorien entstehen neue Typen nur aus Screenshots (Variante aus dem Popup, z. B. Stronghold → „Stairway“).
3. Biome nur per Screenshot. Das Biom ist der Typ, es muss in der Biom-Liste stehen, die Dimension ergibt sich aus der Liste.
4. Biom-Instanzen sind fest (nur löschen, nicht bearbeiten).
5. Portal-Verbindungen (`verbindungRegelPruefen()`): Name 1–60 Zeichen, X/Z ganze Zahlen innerhalb der Welt (Nether: Weltgrenze ÷ 8), Y leer oder Oberwelt −64…320 / Nether 0…256.
6. Banner (`bannerPruefen()`): Name 1–60 Zeichen, Grundfarbe und Farben aus den 16 Farbstoffen, Muster aus der Musterliste, höchstens 6 Ebenen.

## API-Vertrag

| Methode | Pfad | Body | Antwort |
|---|---|---|---|
| GET | `/orte/welten` | – | `{ welten:[{ id, seed, anzahl }] }` |
| POST | `/orte/welten` | `{ seed }` | `{ welt }` – legt 3 Dimensionen an |
| GET | `/orte/welten/:id` | – | `{ welt, dimensionen, typen, instanzen }` |
| POST | `/orte/instanzen` | `{ dimensionId, kategorie, variante, x, y, z, quelle }` | `{ instanz, typ }` – Typ wird gefunden oder angelegt |
| PATCH | `/orte/instanzen/:id` | `{ x, y, z }` | `{ instanz }` – 403 bei Biomen |
| PUT | `/orte/instanzen/:id/angeheftet` | `{ angeheftet }` | `{ instanz }` – groß auf der Anzeige, 403 bei Biomen |
| DELETE | `/orte/instanzen/:id` | – | `{ ok:true }` |
| POST | `/orte/auslesen` | multipart `datei` | `{ erkannt:{ titel, kategorie, variante, dimension, x, y, z } \| null }` |
| GET | `/sammelobjekte/welten/:id` | – | `{ status:{ [objektId]:{ von, am } } }` |
| PUT | `/sammelobjekte/welten/:id/:objektId` | `{ gefunden }` | `{ status }` |
| GET | `/portale/welten/:id` | – | `{ verbindungen:[verbindung] }` |
| POST | `/portale/welten/:id` | `{ name, oberwelt, nether }` | `{ verbindung }` – `von`/`am` setzt der Server |
| PUT | `/portale/:id` | `{ name, oberwelt, nether }` | `{ verbindung }` |
| DELETE | `/portale/:id` | – | `{ ok:true }` |
| GET | `/banner` | – | `{ liste:[banner] }` |
| POST | `/banner` | `{ name, basis, ebenen }` | `{ banner }` – `von`/`am` setzt der Server |
| PUT | `/banner/:id` | `{ name, basis, ebenen }` | `{ banner }` |
| DELETE | `/banner/:id` | – | `{ ok:true }` |
| GET | `/board/einstellungen` | – | `{ titel, qrZeigen, aktiveWelt, aktiv }` – nur Board |
| PUT | `/board/einstellungen` | `{ titel?, qrZeigen?, aktiveWelt? }` | wie GET |

`verbindung = { id, name, oberwelt:{ x, y|null, z }, nether:{ x, y|null, z }, von, am }`

`banner = { id, name, basis, ebenen:[{ muster, farbe }], von, am }` (Farb- und Muster-IDs wie im Spiel, z. B. `light_blue`, `stripe_bottom`)

`typ = { id, kategorie, variante|null }` · `instanz = { id, dimensionId, featureTypeId, x, y|null, z, quelle, angeheftet, von, am }` · `quelle = "screenshot" | "manuell"`

Live gelten alle Pfade mit Präfix `/api` und Bearer-Token. Die Texterkennung (`/orte/auslesen`) läuft im Board (`../koordinaten-board/server/src/erkennung.js`, `fuerCompanion()`); Biome ordnet sie über die Biom-Liste zu, an einem echten Biom-Popup ist das noch nicht geprüft.

## Einbau ins Modul Karte (modul-a-live-karte.html)

- CSS-Abschnitt „KARTE · KOORDINATEN-SAMMLUNG“ übernehmen (Basis ist identisch)
- Die Liste wird ein zweiter Bereich neben dem Karten-Canvas (Umschalter Karte | Liste)
- Marker und Biom-Flächen werden in den bestehenden Renderer der Live-Karte gezeichnet,
  statt im eigenen Canvas – Spieler-Positionen und Sammlung auf einer Karte
- JS-Abschnitte 2–9 übernehmen; `api()`, `esc()`, `THEMES` gibt es dort schon
- Sidebar der Hauptdatei auf `BEREICHE` umstellen (Karte, Sammelobjekte, Portal-Verwaltung, Handbuch, Baupläne, Banner, Rüstung)
- `regeln.js` neben die Hauptdatei legen und vor dem Haupt-Script einbinden (`<script src="regeln.js">`); das Board liefert dann statt der Prototyp-Datei die Hauptdatei aus (`COMPANION_DATEI`)
- Ordner `icons/` neben die Hauptdatei legen (Kennblöcke für Karte und Sammelobjekte, Pfad `KENNBLOCK_PFAD`). Fehlt er, stehen überall die Symbole
- Die Canvas-Marker zeichnet dort der bestehende Renderer: Kennblock über `kennblockBild(kategorie)` holen (liefert das geladene Bild oder `null`, dann das Symbol)

## Tests

`tests/` enthält Playwright-Tests für Banner, Portal-Verwaltung, Sammelobjekte, Kennblöcke in der Karte, Board-Verbindung, den Live-Betrieb am echten Board und die Anzeigeschemas (`cd tests && npm install && npm test`, Details in `UEBERGABE.md`). Screenshots landen in `tests/bilder/`.

## Referenz

`referenz/` enthält die Bilder, auf denen einzelne Bereiche beruhen (Fundorte, Banner-Editor, Rüstungs-Sets und Verzauberungen).
Was auch das Koordinaten-Board betrifft, liegt in `../referenz/`: Datenmodell, Seed-Map-Screenshots und das Kontrollzentrum als Dashboard-Vorbild.

## Offen

- Beispiel-Screenshot vom Biom-Popup, um die Erkennung darauf abzustimmen
- Aus der früheren Board-Steuerung noch nicht übernommen: Notiz, Kartenausschnitt als Bild, Export als JSON
- Dashboard-Ansichten pro Bereich (siehe oben): Seiten pro Bereich? Wo bearbeitet man – Handy oder Anzeige?
- Inhalte der geplanten Bereiche (werden einzeln durchgegangen)
- Aufs Board: bleibt eine Karte liegen, bis jemand sie wegnimmt, oder verschwindet sie nach einiger Zeit?
