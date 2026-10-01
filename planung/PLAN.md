# Plan: Widget-Dashboard, Offline-Sync und Welt-Import

> Für Claude Code · Repo `flexibel-visionboard` · Stand 01.10.2026 · Entscheidungen von Max eingearbeitet
> Grundlage: die Ideen in [`ideen/`](ideen/) und die Baupläne in [`bauplaene/`](bauplaene/) aus der Planungskommission

---

## 0. So arbeitest du diesen Plan ab

1. Lies zuerst `UEBERGABE.md` im Hauptordner, dann `companion/UEBERGABE.md`, dann diesen Plan.
2. Die Baupläne in `bauplaene/` sind bewusst projektneutral. Dieser Plan ordnet sie dem Projekt zu: welcher Ordner, welche Datei, welcher Branch. **Weichen Bauplan und dieser Plan voneinander ab, gilt dieser Plan.** Die Abweichungen gehen auf die Entscheidungen in Kapitel 7 zurück.
3. Arbeite die Stränge (Kapitel 3–5) in der Reihenfolge aus Kapitel 6 ab. Jede Phase endet mit Tests, README-Notiz und Commit. Die Commit-Texte stehen in den Bauplänen, neue Phasen nennen ihre eigenen.
4. **Haltepunkte (⏸):** Hier stoppst du und zeigst Max das Ergebnis. Weiter geht es erst nach seinem OK.
5. Es gelten die Konventionen aus `UEBERGABE.md`:
   - Deutsch in Code, UI-Texten und Commits.
   - Nach jedem Commit schreibst du `Commit erstellt: …`.
   - Du sagst immer an, wann gepusht und wann gemergt wird.
   - Das Datenmodell bleibt minimal, und du baust nur Besprochenes.
6. Was in Kapitel 8 als **offen** steht, baust du nicht vorweg.
7. Was auf Max wartet (Haltepunkte, Nachfragen, nicht beschriebene Inhalte), steht in [`WARTELISTE.md`](WARTELISTE.md). Max hat entschieden: Daran wird nicht gewartet, alles andere geht weiter.

---

## 1. Ziel

Die Companion bekommt eine **Widget-Ansicht** nach dem Vorbild von MainHub und dem iOS-Kontrollzentrum. Jeder Bereich (Karte, Sammelobjekte, Portale, Handbuch, Baupläne, Banner, Rüstung) liefert einzelne Inhalte als Widgets. Sie liegen auf einem 32-Spalten-Raster, und man erkennt sie am Theme ihres Bereichs.

**Rollen (E1, E4):**

- Die Widget-Ansicht läuft am Board unter **`/dashboard`**, neben der bisherigen `/anzeige`. Das Board zeigt nur an.
- **Angeordnet wird am Handy.** Das Handy sieht die Fläche einer Anzeige mit leeren Widgets, also nur Rahmen, Titel und Theme. Dort verschiebt man Widgets, fügt neue hinzu und wechselt die Größe. Am besten geht das im Querformat.
- **Jede Anzeige hat ihr eigenes Layout** am Server (E5).
- **Anzeige auf einem anderen Gerät:** Der Server läuft auf einem Rechner, die Anzeige kann auf einem beliebigen Gerät im Netz laufen (TV-Browser, Tablet, zweiter Laptop). Dafür gibt es pro Anzeige einen **Anzeige-Link**, siehe A6.

Daneben laufen zwei unabhängige Stränge:

- **Offline-Sync und Identität**: Das Handy wird zum persönlichen Werkzeug mit Account und PIN und läuft auch ohne Server.
- **Welt-Import per ZIP**: Das Upload-Feld mit Anleitung für den bereits fertigen Biom-Dekoder.

---

## 2. Ausgangslage im Repo

| Baustein | Ort | Stand | Bezug zum Plan |
|---|---|---|---|
| MainHub-Workspace | `companion/mainhub/` → wird **`companion/widgets/`** | übernommen per `git subtree`, unverändert | Grundgerüst: Grid, Layer, Bearbeiten-Modus, Galerie (`AddPanelModal`) |
| Raster von MainHub | `src/features/workspace/` | 96 × 48 feste Zellen, freie Größen, Handy-Layout abgeleitet | wird zu **32 Spalten, quadratische Zelle, variable Reihen** |
| Persistenz von MainHub | `lib/storage.ts` | `localStorage` je Browser | wird **Layout pro Anzeige am Server**, live über `/ws` |
| Widget-Registry von MainHub | `model/panel-registry.ts` | 6 Beispiel-Panels | wird durch das Companion-Register ersetzt |
| Modul-Vertrag `BEREICHE` | `companion/companion-prototyp.html` (Abschnitt 9b) | `ansichten` nur dokumentiert: 1×1/2×1/2×2 auf 4 Spalten | **wird abgelöst** durch Register und Größen-Vertrag. Den Kommentar dort nachziehen. |
| Anzeigeschemas `BOARD_KARTEN` | `companion-prototyp.html`, geprüft in `koordinaten-board/server/src/zeigen.js` | Ort, Sammelobjekt, Portal, Banner und Rüstung als allgemeine Karten | **wandern in den Server** (E3). Das Dashboard bekommt fertige Karten. |
| Board-Anzeige | `koordinaten-board/client/` (React) unter `/anzeige` | Orte der aktiven Welt und „Aufs Board“. **Nur auf `localhost`** (`istLokal` in `server.js`), sonst nur mit `ANZEIGE_OFFEN=1`, dann aber für jedes Gerät im Netz und ohne Schutz | bleibt vorerst. Geht später in `/dashboard` auf. Bekommt vorher schon den Anzeige-Link (A6). |
| Daten | `koordinaten-board/server/src/daten.js` | IDs vom Server (`neueId`), Urheber als Name im Feld `von` | stabile Benutzer-ID, Client-IDs |
| Beitreten | QR-Code → `/?pin=…`, Name frei, `sperre.js` | Board-PIN + freier Name | wird **Account mit PIN**, die Anmeldung erreicht man über den QR-Code (E9) |
| Offline | `localStorage` für Verbindung und Name | kein Service Worker, keine IndexedDB | neu |
| Welt-Import | `biom-dekoder.js`, `biom-welt.js`, `vendor/` | Dekoder fertig (PR #6), **noch kein Upload-Feld** | Strang C |

---

## 3. Strang A · Widget-Dashboard

Branch je Phase: `bereich/widgets-<thema>`. Die Branches gehen von `bereich/mainhub-visionboard` ab, solange dieser nicht in `main` ist.

### Phase A0 · Übernahme lauffähig machen

- Den Ordner per `git mv companion/mainhub companion/widgets` umbenennen (E2).
- `npm install`, `npm run typecheck`, `npm test` und `npm run build` laufen grün.
- README im Ordner und im Hauptordner nachziehen. In `UEBERGABE.md` den Ordner im Aufbau des Repos ergänzen.
- Docker-Dateien (`Dockerfile`, `compose.yaml`, `docker/`) entfernen. Ausgeliefert wird übers Board (A6).
- Commit: „Widgets: MainHub als companion/widgets lauffähig“

### Phase A1 · Raster mit 32 Spalten → `Bauplan-Raster-32-Spalten`

- `RASTER_SPALTEN = 32` zentral in `lib/raster.ts`. `model/breakpoints.ts` geht darin auf.
- `zellePx = breite / 32` und `reihen = floor(hoehe / zellePx)`, neu berechnet per ResizeObserver.
- Den Abstand zwischen Widgets ziehst du innerhalb der Zelle ab, damit die Zelle quadratisch bleibt.
- `responsive-layout.ts` entfällt. Es gibt kein abgeleitetes Handy-Layout mehr: Das Handy zeigt dieselbe Fläche wie die Anzeige, verkleinert (E4, siehe A6).
- Die alten 96×48-Layouts werden verworfen, nicht migriert. Es gibt noch keine echten Nutzerdaten.
- Tests: 1920×1080 → 18, 1440×900 → 20, 1180×820 → 22, 1024×768 → 24 Reihen.

### Phase A2 · Größen-Vertrag → `Bauplan-Widget-Groessensystem`

- Typen `Groessenstufe` und `WidgetVertrag` mit Validierung beim Registrieren. Sie ersetzen `PanelDefinition`.
- **Freies Skalieren entfällt.** Der Griff zum Vergrößern schaltet zur nächsten angebotenen Stufe (wie im Kontrollzentrum).
- `inZellen()` mit Tests.
- Belegungsmatrix und Passt-Prüfung: `collision-utils.ts` ausbauen. Die Prüfung rechnet mit den **Reihen der jeweiligen Anzeige**.
- `seitenleistenBreite` bleibt eine Konstante **ohne festen Wert**, bis die Größenstufen festgelegt sind (E6, A7). Die größte Rasterstufe baust du erst dann.
- **Vollbild ist optional je Widget-Typ** (`vollbild: true` im Vertrag, E7). Es läuft als eigene Route `/dashboard/vollbild/:instanzId` an der Anzeige. Ausgelöst wird es vom Handy aus.
- ⏸ **Haltepunkt:** Max ein Raster mit Platzhalter-Widgets zeigen (Screenshots aus Playwright, 16:9 und 4:3).

### Phase A3 · Widget-Struktur → `Bauplan-Widget-Struktur`

- Typen `Bereich`, `WidgetTyp` und `WidgetInstanz`. `LayoutItem.panelTyp` wird zu `WidgetInstanz.typ`, Breite und Höhe ergeben sich aus `stufe`.
- Die Bereichs-IDs übernimmst du aus `BEREICHE` der Companion: `karte`, `sammelobjekte`, `portale`, `handbuch`, `bauplaene`, `banner`, `ruestung`.
- Zusatzinhalte je Stufe einblenden.
- Galerie: `AddPanelModal.tsx` gruppiert nach Bereich und bekommt eine Suche. Pro Typ zeigt sie eine Vorschau in der kleinsten Stufe. Die Galerie öffnet man am Handy (A6).

### Phase A4 · Register und Karten vom Server → `Bauplan-Widget-Inhalte`

- `model/widget-register.ts` mit den 13 Typen aus dem Bauplan. Jeder Typ hat **eine Platzhalter-Stufe** und stabile IDs, zum Beispiel `karte.einzelkoordinate`.
- Felder `mehrfach`, `optional` und `quelle`. Die Quelle wählt man beim Hinzufügen. Ist die Quelle gelöscht, zeigt das Widget einen leeren Zustand.
- **Trennung Gehäuse ↔ Inhalt**: `WidgetGehaeuse` (Rahmen, Theme) und `WidgetInhalt` (Karte rendern) als getrennte Komponenten. Dafür ein eigener Commit: „Widget-Gehäuse vom Inhalt getrennt“.
- **Karten kommen vom Server (E3):**
  - Die Übersetzung `BOARD_KARTEN` (Daten → Karte aus Titel und Blöcken) zieht aus der Companion-Seite in die Datei `companion/board-karten.js`. Der Server lädt sie per `node:vm` wie `regeln.js`. „Aufs Board“ in der Companion nutzt dieselbe Datei weiter.
  - Neuer Endpunkt `GET /api/widgets/:typ?quelle=…` liefert die fertige Karte, geprüft mit `zeigen.js`. Bei Änderungen kommt `geaendert` über `/ws`, und das Widget lädt neu.
  - Das Dashboard rendert nur Karten (`koordinaten`, `zeilen`, `text`, `bild`). Fachwissen über Bereiche hat es nicht.
  - Ohne Board liefert ein kleiner Mock feste Beispielkarten.
- Handbuch und Baupläne haben noch keinen Bereich in der Companion. Ihre Typen stehen im Register, liefern aber nur „Bereich geplant“.
- **Bedienung (E13):** Die Widgets am Board haben keine Bedienelemente. Abhaken passiert am Handy, siehe Nachfrage N1.
- Commits: „Register: Mehrfach-Widgets und Quelle“, „Widget-Register: Sammelstand“, „Board-Karten im Server“, „Widget-Gehäuse vom Inhalt getrennt“
- ⏸ **Haltepunkt:** Max die Galerie mit allen 13 Typen zeigen.

### Phase A5 · Bereichs-Themes → `Bauplan-Bereichs-Themes`

- Die Themes sind CSS-Variablen in `shared/styles/tokens.css`. Ein Theme je Bereich, gesetzt im Gehäuse über `WidgetTyp.bereich`.
- Die Farben stammen aus den Dimensions-Themes der Companion (`applyTheme()`) und werden nicht neu erfunden.

| Bereich | Theme |
|---|---|
| Karte | dynamisch nach angezeigter Dimension: Oberwelt, Nether, End |
| Handbuch | Buchrahmen, Inhalt auf der Seite |
| Baupläne | blauer Hintergrund, weißes Gitter aus CSS |
| Portale | Schwarz-Lila, auch Status-Hinweise ohne Rot und Grün |
| Sammelobjekte, Banner, Rüstung | **noch nicht festgelegt** (E8). Bis dahin Oberwelt-Grün wie heute in der Companion, als **Platzhalter** mit eigenen Theme-IDs, damit jedes später ohne Widget-Code ersetzt werden kann |

### Phase A6 · Layout pro Anzeige und Steuerung am Handy (neu)

Grund: E4 und E5. Ein Bauplan dafür gibt es nicht.

- **Server:** neue Sammlung `anzeigen: [{ id, name, reihen, layer: [{ id, name, instanzen: WidgetInstanz[] }] }]` in `daten.js`.
  - Jede Anzeige meldet beim Start ihre `reihen` aus der eigenen Bildschirmgröße.
  - Änderungen am Layout gehen per API an den Server und kommen live über `/ws` bei Anzeige und Handys an.
  - Das Layout lässt sich **nur online** ändern. Es ist nicht Teil der Offline-Warteschlange (Strang B).
- **Anzeige (`/dashboard`):** zeigt das Layout ihrer Anzeige mit Inhalten. Es gibt keinen Bearbeiten-Modus. MainHubs `EditMode` und die Toolbar entfallen dort.
- **Handy (Steuerung):** In der Companion gibt es einen neuen Eintrag „Anzeige anordnen“ im Board-Sheet.
  - Er zeigt die Fläche der gewählten Anzeige im richtigen Seitenverhältnis (32 × `reihen`), mit leeren Widgets: Rahmen, Titel und Theme, ohne Inhalt.
  - Hier verschiebt man Widgets, wechselt die Stufe, entfernt sie, fügt über die Galerie hinzu, wechselt den Layer und startet das Vollbild.
  - Im Hochformat erscheint ein Hinweis „Querformat empfohlen“.
  - ⚖ Wie die React-Steuerung in die Vanilla-Companion kommt, klärt Nachfrage N2.
- **Ausliefern:** Der Board-Server liefert den Build von `companion/widgets/` unter `/dashboard` aus, so wie `/anzeige`. *(Vorgezogen in A4, Commit „Dashboard unter /dashboard“, damit die Widgets am echten Board getestet werden.)*
- **Anzeige-Link (Anzeige auf einem anderen Gerät als dem Server):**
  - Jede Anzeige bekommt am Server einen eigenen, zufälligen **Anzeige-Schlüssel**. Der Link lautet `http://<adresse>:3000/dashboard?anzeige=<id>&schluessel=<schluessel>`. Die Adresse ist dieselbe wie im QR-Code der Handys (`netzwerk.js`, `adresse.txt`, `OEFFENTLICHE_URL`).
  - Wer den Link öffnet, wird zu genau dieser Anzeige. Der Browser merkt sich den Schlüssel, damit ein Neustart des TVs ohne Link geht.
  - Der Server lässt die Anzeige-Verbindung (`/ws` mit Rolle `anzeige`, `/api/anzeige`) zu, wenn sie von `localhost` kommt **oder** einen gültigen Schlüssel trägt. `ANZEIGE_OFFEN=1` bleibt als Notschalter.
  - **Wo der Link steht:**
    - in der Companion im Board-Sheet unter „Anzeigen“: anlegen, umbenennen, Link kopieren, als QR-Code zeigen (zum Abscannen mit dem Tablet), Schlüssel neu erzeugen (macht alte Links ungültig)
    - in der Konsole beim Start, neben der Handy-Adresse: `Anzeige auf anderem Gerät: http://…`
    - in `koordinaten-board/README.md` unter Start, mit dem Hinweis auf die Firewall (Private Netzwerke erlauben)
  - Wer Anzeigen anlegt: jedes beigetretene Handy, nach B2 jeder Account. Beim ersten Start legt der Server eine Anzeige „Board“ für `localhost` an.
  - **Gilt auch für `/anzeige`**, solange es sie noch gibt. Dieser Teil hängt nicht am Widget-Dashboard und kann deshalb schon vor A1 als kleiner Schritt kommen (Branch `board/anzeige-link`).
  - Tests: Zugriff ohne Schlüssel von außen → 403; mit gültigem Schlüssel → erlaubt; nach dem Neu-Erzeugen ist der alte Schlüssel → 403.
- Commits: „Anzeige-Link für andere Geräte“, „Anzeigen-Layout am Server“, „Dashboard unter /dashboard“, „Anordnen am Handy“
- ⏸ **Haltepunkt:** Max am Handy im Querformat ein Layout am Board anordnen lassen.

### Phase A7 · Größenstufen je Widget ⏸ (Planung)

Planungsschritte 3 (Vereinheitlichung, Kandidat „Einzeleintrag“) und 4 (Größen) aus `ideen/Vorgehen-Widgets.md`. Das ist eine Planungsrunde mit Max, kein Code. Dabei wird auch `seitenleistenBreite` festgelegt. Danach ersetzen echte Stufen die Platzhalter im Register, und die größte Rasterstufe wird gebaut.

---

## 4. Strang B · Offline-Sync und Identität → `Bauplan-Offline-Sync-und-Identitaet`

Betrifft `companion/companion-prototyp.html`, `companion/regeln.js` und `koordinaten-board/server/`. Branch: `board/identitaet` für B1–B2, `bereich/offline` für B3–B5. Der Bauplan verlangt für den Service Worker einen eigenen Branch.

### Phase B1 · Datenmodell

- Alle Einträge in `daten.js` bekommen `erstellerId`. Das Feld `von` (Name) bleibt nur zur Anzeige.
- IDs erzeugt künftig der Client (UUID). Der Server prüft das Format und lehnt doppelte IDs ab. `neueId` bleibt für Einträge, die der Server selbst anlegt.
- Bestehende `daten.json` werden beim Laden migriert: `erstellerId = "unbekannt"`.
- Neue Sammlungen: `benutzer` (id, anzeigename, PIN-Hash, `rolle: "Besitzer"`), `profile` und `geraete`.
- Regeln (Formatprüfung) in `regeln.js`, damit Handy und Server dasselbe prüfen.

### Phase B2 · Accounts mit PIN (E9, E10)

- **Ablauf:**
  - Der QR-Code an der Anzeige führt zur **Anmeldung**.
  - Dort wählt man seinen Account oder legt einen neuen an: Name plus **eigene PIN**.
  - Mit der richtigen PIN ist das Gerät freigeschaltet. Eine weitere Bestätigung gibt es nicht („PIN reicht“).
  - Das Gerät merkt sich danach einen Geräteschlüssel und fragt nicht erneut.
- Gekapselt hinter `IdentitaetsAnbieter.werBistDu()`, damit später ein richtiges Login dahinter stehen kann.
- PINs speichert der Server nur gehasht (`node:crypto`, scrypt). Die bestehende Sperre gegen Durchprobieren (`sperre.js`) gilt auch für Account-PINs.
- Was aus der heutigen Board-PIN im QR-Code wird, klärt Nachfrage N4.
- Persönliche und geteilte Geräte (`typ`) gibt es im Modell. Ein geteiltes Gerät bekommt ein Profil mit `geteilt = true`.
- Commits: „Datenmodell: stabile Benutzer-ID und Sync-Status“, „Accounts mit PIN“, „Identität gekapselt“

### Phase B3 · Service Worker und IndexedDB ⏸

- `companion/sw.js`, ausgeliefert vom Board unter `/sw.js` (Scope `/`). Er cacht die App-Shell: Seite, `regeln.js`, `board-karten.js`, `icons/`, `vendor/`.
- **Cache-Falle:** Die Seite kommt heute bewusst ohne Cache (`OHNE_CACHE`). Der Service Worker braucht deshalb eine Versionsnummer im Cache-Namen und „neue Version verfügbar → neu laden“.
- IndexedDB ersetzt `localStorage` für die Daten. Der Geräteschlüssel bleibt im `localStorage`.
- Playwright-Test mit `context.setOffline(true)`.
- ⏸ **Haltepunkt:** Max am echten iPhone testen lassen (Home-Bildschirm-App, Flugmodus).

### Phase B4 · Offline-Regel und Warteschlange

- `syncStatus` je Eintrag. Synchronisierte Einträge sind offline gesperrt, mit einem Hinweis in der Oberfläche.
- Die Warteschlange je Account liegt in IndexedDB. Die Klasse leitet sich aus `art` ab. Nur `automatisch` ist aktiv, `pruefpflichtig` gibt es lediglich im Modell.
- Senden beim Wiederverbinden, in der Reihenfolge des Anlegens.

### Phase B5 · Zustandswechsel

- Wird als Zielzustand gesetzt (`{ eintragId, zustand }`), damit er idempotent ist.
- Vorerst gibt es nur `offen` → `erledigt` (E11). Die Aufzählung bleibt erweiterbar, weitere Zustände kommen mit den Bereichen, die sie brauchen.
- Erster Anwender sind die Sammelobjekte (abhaken).

Nicht jetzt: Postfach, Bestätigungs-Oberfläche, Rechte, Protokoll. Das Modell sieht sie schon vor.

---

## 5. Strang C · Welt-Import per ZIP → `Bauplan-Welt-Import`

Betrifft die Karte in `companion-prototyp.html` und `biom-welt.js`. Branch: `bereich/karte-welt-upload`. Gehört zu Phase 5 von `companion/PLAN-welt-import-biome.md`.

> **Umfang (Max, 01.10.2026):** der ganze Biom-Import, also die Phasen 2–5 des Biom-Plans zusammen mit diesem Strang. Gebaut; der Haltepunkt nach dem Import-Sheet und die Prüfungen an echten Welten stehen in der Warteliste. Die Test-ZIPs entstehen aus künstlichen Welten (`tests/welt-bauen.mjs`), bis `fixture-seed.mcworld` da ist.

- **Upload-Feld** in der Karte: `accept=".zip,.mcworld"`, Verarbeitung im Worker wie im bestehenden Plan.
- **Aufbauprüfung:**
  - Eine ZIP mit zusätzlichem Unterordner wird **angenommen, ohne Fehler und ohne Hinweis** (E12). Das ist eine Abweichung vom Bauplan. Der Dekoder sucht die Dateien ohnehin nach Basisnamen.
  - Fehlermeldungen gibt es nur für „sieht nicht nach einem Minecraft-Weltordner aus“ (keine `level.dat` oder kein `db/`) und „bitte die erzeugte Archiv.zip auswählen“ (keine ZIP).
- Vor dem Import zeigt die Seite den Weltnamen aus `levelname.txt` und den Seed aus `level.dat` zur Bestätigung. Die Seed-Prüfung folgt Regel 6 des Biom-Plans.
- **Anleitung** „Weltordner aus der Dateien-App hochladen“:
  - drei Schritte, direkt neben dem Upload
  - **nur iPhone** (E14), die Struktur lässt weitere Plattformen zu
  - Die Karte zeigt Biome nur in besuchten Gebieten.
- Tests: je eine Test-ZIP pro Fall, gebaut aus `tests/daten/fixture-seed.mcworld` (korrekt, mit Unterordner, ohne `db/`, keine ZIP).

---

## 6. Reihenfolge

```
A0 ─ C ─ Anzeige-Link ─ A1 ─ A2⏸ ─ A3 ─ A4⏸ ─ A5 ─ A6⏸ ─ (Planung A7⏸)
B1 ─ B2 ─ B3⏸ ─ B4 ─ B5      nach A6
```

- A0 zuerst, dann C: ein kleiner Strang, der den Biom-Import abschließt.
- Danach der Anzeige-Link aus A6, weil er schon für die heutige `/anzeige` hilft.
- Danach A1 bis A6.
- Strang B kommt nach A6. Er ändert das Datenmodell des Servers, und A4 bzw. A6 legen dort Karten und Anzeigen an. So wird jede Stelle nur einmal angepasst.
- Ob „Anzeige anordnen“ (A6) einen Account braucht, ist erst nach B2 möglich. Bis dahin genügt der heutige Beitritt.

Git: Nach jeder Phase pushen. Nach jedem Strang (bzw. nach jedem Haltepunkt mit OK) mergt Max per PR nach `main`.

---

## 7. Entscheidungen (Max, 01.10.2026)

| Nr. | Frage | Entscheidung |
|---|---|---|
| E1 | Wo läuft das Widget-Dashboard? | Eigene Route **`/dashboard`** am Board, neben `/anzeige` |
| E2 | Ordnername | **`companion/widgets/`** |
| E3 | Wie kommen die Anzeigeschemas ins Dashboard? | **Über den Server**: Er liefert fertige Karten, das Dashboard rendert nur |
| E4 | Raster am Handy | Das Handy sieht die **Fläche der Anzeige mit leeren Widgets** und steuert damit die Anordnung. Querformat ideal. |
| E5 | Widgets außerhalb der sichtbaren Reihen | **Pro Anzeige ein Layout**, das Problem tritt nicht auf |
| E6 | `seitenleistenBreite` | **offen bis zur Planung der Größenstufen** (A7) |
| E7 | Vollbild Pflicht? | **optional je Widget-Typ** |
| E8 | Themes Sammelobjekte, Banner, Rüstung | **offen.** Bis zur Entscheidung Oberwelt-Grün als Platzhalter |
| E9 | Anmeldeverfahren | **Accounts mit PIN**, die Anmeldung erreicht man über den QR-Code |
| E10 | Freischaltung neuer Geräte | **PIN reicht** |
| E11 | Weitere Zustandswechsel | **sammeln, wenn nötig** |
| E12 | ZIP mit Unterordner | **annehmen** |
| E13 | Kleine Widgets bedienbar? | **Abhaken am Handy erlaubt**, das Board bleibt reine Anzeige |
| E14 | Anleitung und Abdeckung | **nur iPhone, besuchte Gebiete reichen** |

---

## 8. Offen

**Nachfragen, die aus den Entscheidungen folgen** (vor der jeweiligen Phase klären):

| Nr. | Frage | Phase |
|---|---|---|
| N1 | ~~Wo genau wird am Handy abgehakt: im Bereich der Companion oder durch Tippen auf das leere Widget in „Anzeige anordnen“, das dann den Inhalt öffnet?~~ **Entschieden (Max, 01.10.2026):** im Bereich der Companion. „Anzeige anordnen“ ordnet nur an. | A4 |
| N2 | Wie kommt die Steuerung ans Handy? Als Teil von `companion/widgets/` (React, eigene Route `/dashboard/anordnen`, aus der Companion verlinkt) oder in der Vanilla-Seite nachgebaut? Vorschlag: React-Route, weil sie dieselben Komponenten nutzt. | A6 |
| N3 | ~~Woher weiß eine Anzeige, welche sie ist, und reicht der Schlüssel als Schutz?~~ **Entschieden:** über den Anzeige-Link (A6), der Schlüssel im Link reicht, keine zusätzliche Bestätigung am Handy. | A6 |
| N4 | ~~Bleibt die Board-PIN im QR-Code als Zugang zum Server, oder ersetzen die Account-PINs sie ganz?~~ **Entschieden (Max, 01.10.2026, „Ja“):** Die Board-PIN im QR-Code bleibt als Zugang zum Server; die Account-PIN kommt dazu. | B2 |

**Weiter offen aus den Ideen:**
- Design-Themes für Sammelobjekte, Banner und Rüstung (E8)
- Vereinheitlichung zum Typ „Einzeleintrag“ und Größenstufen je Widget (A7)
- Entscheidung über prüfpflichtige Anfragen bei geteilten Profilen (erst nötig, wenn gelöscht wird)
