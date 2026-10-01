# Plan: Widget-Dashboard, Offline-Sync und Welt-Import

> Für Claude Code · Repo `flexibel-visionboard` · Stand 01.10.2026
> Grundlage: die Ideen in [`ideen/`](ideen/) und die Baupläne in [`bauplaene/`](bauplaene/) aus der Planungskommission

---

## 0. So arbeitest du diesen Plan ab

1. Lies zuerst `UEBERGABE.md` im Hauptordner, dann `companion/UEBERGABE.md`, dann diesen Plan.
2. Die Baupläne in `bauplaene/` sind bewusst projektneutral. Dieser Plan ordnet sie dem Projekt zu: welcher Ordner, welche Datei, welcher Branch. **Weichen Bauplan und dieser Plan voneinander ab, gilt dieser Plan.**
3. Arbeite die Stränge (Kapitel 3–5) in der Reihenfolge aus Kapitel 6 ab. Jede Phase endet mit Tests, README-Notiz und Commit. Die Commit-Texte stehen in den Bauplänen.
4. **Haltepunkte (⏸):** Hier stoppst du und zeigst Max das Ergebnis. Weiter geht es erst nach seinem OK.
5. Es gelten die Konventionen aus `UEBERGABE.md`:
   - Deutsch in Code, UI-Texten und Commits.
   - Nach jedem Commit schreibst du `Commit erstellt: …`.
   - Du sagst immer an, wann gepusht und wann gemergt wird.
   - Das Datenmodell bleibt minimal, und du baust nur Besprochenes.
6. Mit **⚖** markierte Punkte sind Entscheidungen, die Max treffen muss (Kapitel 7). Bis dahin gilt der jeweils genannte Vorschlag, und zwar nur dort, wo er nichts verbaut.

---

## 1. Ziel

Die Companion bekommt eine **Widget-Ansicht** nach dem Vorbild von MainHub und dem iOS-Kontrollzentrum. Jeder Bereich (Karte, Sammelobjekte, Portale, Handbuch, Baupläne, Banner, Rüstung) liefert einzelne Inhalte als Widgets. Sie lassen sich auf einem 32-Spalten-Raster anordnen, und man erkennt sie am Theme ihres Bereichs.

Daneben laufen zwei unabhängige Stränge:

- **Offline-Sync und Identität**: Das Handy wird zum persönlichen Werkzeug, das auch ohne Server läuft. Das Board wird reine Anzeige.
- **Welt-Import per ZIP**: Das Upload-Feld mit Anleitung für den bereits fertigen Biom-Dekoder.

---

## 2. Ausgangslage im Repo

| Baustein | Ort | Stand | Bezug zum Plan |
|---|---|---|---|
| MainHub-Workspace | `companion/mainhub/` | übernommen per `git subtree` (Branch `bereich/mainhub-visionboard`), unverändert | Grundgerüst der Widget-Ansicht: Grid, Layer, Bearbeiten-Modus, Galerie (`AddPanelModal`), Persistenz |
| Raster von MainHub | `mainhub/src/features/workspace/` | 96 × 48 feste Zellen, freie Größen mit Mindestmaßen, Handy-Layout abgeleitet | wird auf **32 Spalten, quadratische Zelle, variable Reihen** umgebaut |
| Widget-Registry von MainHub | `model/panel-registry.ts` | 6 Beispiel-Panels (Notiz, Aufgaben …) | wird durch das Companion-Register ersetzt |
| Modul-Vertrag `BEREICHE` | `companion/companion-prototyp.html` (Abschnitt 9b) | `ansichten` nur dokumentiert: 1×1/2×1/2×2 auf 4 Spalten | **wird abgelöst** durch Register und Größen-Vertrag. Den Kommentar dort nachziehen. |
| Anzeigeschemas `BOARD_KARTEN` | `companion-prototyp.html`, geprüft in `koordinaten-board/server/src/zeigen.js` | Ort, Sammelobjekt, Portal, Banner und Rüstung als allgemeine Karten | Baustein für die Renderer der Einzeleintrag-Widgets |
| Board-Anzeige | `koordinaten-board/client/` (React) unter `/anzeige` | zeigt die Orte der aktiven Welt und „Aufs Board“ | ⚖ Verhältnis zur neuen Widget-Ansicht (E1) |
| Daten | `koordinaten-board/server/src/daten.js` | IDs vom Server (`neueId`), Urheber als Name im Feld `von` | Grundlage für stabile Benutzer-ID und Client-IDs |
| Beitreten | Name + PIN über QR-Code, `sperre.js` | freier Name | wird zum gekapselten `IdentitaetsAnbieter` |
| Offline | `localStorage` für Verbindung und Name | kein Service Worker, keine IndexedDB | neu |
| Welt-Import | `biom-dekoder.js`, `biom-welt.js`, `vendor/` | Dekoder fertig (PR #6), **noch kein Upload-Feld** in der Seite | Strang C ergänzt Upload, Prüfung und Anleitung |

---

## 3. Strang A · Widget-Dashboard

Branch je Phase: `bereich/widgets-<thema>`. Die Branches gehen von `bereich/mainhub-visionboard` ab, sobald dieser in `main` gemergt ist. Bis dahin gehen sie direkt von ihm ab.

Ort: `companion/mainhub/`. Den Ordner benennst du in Phase A0 um (⚖ E2, Vorschlag `companion/dashboard/`).

### Phase A0 · Übernahme lauffähig machen

- `npm install`, `npm run typecheck`, `npm test` und `npm run build` laufen im neuen Ordner grün.
- Ordner umbenennen, falls Max zustimmt (E2). README im Ordner und im Hauptordner nachziehen.
- Docker-Dateien (`Dockerfile`, `compose.yaml`, `docker/`) bleiben vorerst liegen. Das Board liefert später aus (A7).
- Commit: „Dashboard: MainHub in der Companion lauffähig“

### Phase A1 · Raster mit 32 Spalten → `Bauplan-Raster-32-Spalten`

- `RASTER_SPALTEN = 32` zentral in `model/breakpoints.ts` bzw. in einem neuen Modul `lib/raster.ts`.
- `zellePx = breite / 32` und `reihen = floor(hoehe / zellePx)`, neu berechnet per ResizeObserver.
- Die feste Größe `zeilen` in `WorkspaceLayout` entfällt bzw. wird pro Gerät berechnet. Den Abstand (`abstand`) rechnest du aus der Zelle heraus, sonst bleibt die Zelle nicht quadratisch.
- `responsive-layout.ts`: Die Ableitung aus 96 × 48 entfällt. Das Handy-Hochformat bleibt offen (⚖ E4). Bis dahin gilt dort das alte Verhalten.
- Tests: 1920×1080 → 18, 1440×900 → 20, 1180×820 → 22, 1024×768 → 24 Reihen.
- **Gespeicherte Layouts:** Die alten 96×48-Layouts in `localStorage` werden verworfen, nicht migriert. Es gibt noch keine echten Nutzerdaten. Dafür die Speicherversion in `lib/storage.ts` erhöhen.
- **Widgets unterhalb der sichtbaren Reihen** (auf 4:3 angelegt, auf 16:9 angezeigt): ⚖ E5. Vorschlag: Die Position bleibt gespeichert, und ein Hinweis „N Widgets außerhalb“ erscheint im Bearbeiten-Modus.

### Phase A2 · Größen-Vertrag → `Bauplan-Widget-Groessensystem`

- Typen `Groessenstufe` und `WidgetVertrag` mit Validierung beim Registrieren. Sie ersetzen `PanelDefinition`.
- **Freies Skalieren entfällt.** Der Griff zum Vergrößern schaltet stattdessen zur nächsten angebotenen Stufe (wie im Kontrollzentrum).
- `inZellen()` mit Tests.
- Belegungsmatrix und Passt-Prüfung: `collision-utils.ts` ausbauen.
- `seitenleistenBreite` als Konstante. Den Wert legt Max fest (⚖ E6), Vorschlag: 8 Spalten.
- Vollbild als eigene Route (`/dashboard/vollbild/:instanzId`). Das liefert gleich das Routing aus der MainHub-Roadmap mit (Punkt 3). Ob Vollbild Pflicht ist: ⚖ E7.
- ⏸ **Haltepunkt:** Max ein Raster mit Platzhalter-Widgets auf drei Geräten zeigen (Screenshots aus Playwright, 16:9, 4:3, Handy).

### Phase A3 · Widget-Struktur → `Bauplan-Widget-Struktur`

- Typen `Bereich`, `WidgetTyp` und `WidgetInstanz`. `LayoutItem.panelTyp` wird zu `WidgetInstanz.typ`, die Breite und Höhe ergeben sich aus `stufe`.
- Die Bereichs-IDs übernimmst du aus `BEREICHE` der Companion: `karte`, `sammelobjekte`, `portale`, `handbuch`, `bauplaene`, `banner`, `ruestung`. Das ist eine Abweichung vom Bauplan, der `portale` als „Portal-Verwaltung“ nennt. Maßgeblich ist die bestehende ID.
- Zusatzinhalte je Stufe einblenden.
- Galerie: `AddPanelModal.tsx` gruppiert nach Bereich und bekommt eine Suche. Pro Typ zeigt sie eine Vorschau in der kleinsten Stufe.
- Die MainHub-Beispielpanels entfernst du erst in A4, wenn das Register sie ersetzt.

### Phase A4 · Register → `Bauplan-Widget-Inhalte`

- `model/widget-register.ts` mit den 13 Typen aus dem Bauplan. Jeder Typ hat **eine Platzhalter-Stufe** und stabile IDs, zum Beispiel `karte.einzelkoordinate`.
- Felder `mehrfach`, `optional` und `quelle`. Die Quelle wählt man beim Hinzufügen. Ist die Quelle gelöscht, zeigt das Widget einen leeren Zustand.
- **Trennung Gehäuse ↔ Inhalt** (aus `Bauplan-Vorgehen-Widgets`): `WidgetGehaeuse` (Rahmen, Theme, Toolbar) und `WidgetInhalt` (Datenquelle, Renderer) als getrennte Komponenten. Dafür ein eigener Commit: „Widget-Gehäuse vom Inhalt getrennt“.
- **Datenquelle:** Die Widgets lesen über die bestehende Board-API (`/api/…`) und hören auf `/ws` (`geaendert`). Dafür eine Datenschicht `lib/companion-daten.ts`, die der MainHub-Roadmap-Punkt 1 schon vorsieht. Ohne Board liefert sie den DEMO-Mock wie die Companion.
- Renderer für Banner, Rüstung, Ort, Sammelobjekt und Portal setzen auf den Anzeigeschemas `BOARD_KARTEN` auf, statt neu zu zeichnen. ⚖ E3, wie die Schemas ins React-Dashboard kommen.
- Handbuch und Baupläne haben noch keinen Bereich in der Companion. Ihre Typen stehen im Register, liefern aber nur einen leeren Zustand „Bereich geplant“.
- ⏸ **Haltepunkt:** Max die Galerie mit allen 13 Typen zeigen.

### Phase A5 · Bereichs-Themes → `Bauplan-Bereichs-Themes`

- Die Themes sind CSS-Variablen in `shared/styles/tokens.css`. Ein Theme je Bereich, gesetzt im Gehäuse über `WidgetTyp.bereich`.
- Die Karte wählt ihr Theme nach Dimension. Die Farben stammen aus den Dimensions-Themes von `modul-a-live-karte.html` bzw. `applyTheme()` in der Companion und werden nicht neu erfunden.
- Handbuch bekommt einen Buchrahmen, Baupläne einen blauen Hintergrund mit Gitter aus CSS, Portale Schwarz-Lila (auch Status-Hinweise ohne Rot und Grün).
- Sammelobjekte, Banner und Rüstung bekommen ein neutrales Standard-Theme (⚖ E8).

### Phase A6 · Größenstufen je Widget ⏸

Erst nach Planungsschritt 3 (Vereinheitlichung) und 4 (Größen), siehe `ideen/Vorgehen-Widgets.md`. Das ist eine Planungsrunde mit Max, kein Code. Danach ersetzen echte Stufen die Platzhalter im Register.

### Phase A7 · Ausliefern über das Board

- Der Board-Server liefert den Build unter `/dashboard` aus, so wie `/anzeige`.
- Das Verhältnis zu `/anzeige` und zu „Aufs Board“ klärt ⚖ E1.

---

## 4. Strang B · Offline-Sync und Identität → `Bauplan-Offline-Sync-und-Identitaet`

Betrifft `companion/companion-prototyp.html`, `companion/regeln.js` und `koordinaten-board/server/`. Branch: `board/identitaet` für B1–B2, `bereich/offline` für B3–B5. Der Bauplan verlangt für den Service Worker einen eigenen Branch.

### Phase B1 · Datenmodell

- Alle Einträge in `daten.js` bekommen `erstellerId`. Das Feld `von` (Name) bleibt nur zur Anzeige.
- IDs erzeugt künftig der Client (UUID). Der Server akzeptiert sie, prüft das Format und lehnt doppelte IDs ab. `neueId` bleibt für Einträge, die der Server selbst anlegt.
- Bestehende `daten.json` werden beim Laden migriert: `erstellerId = "unbekannt"`.
- Benutzer, Profil und Gerät als neue Sammlungen, mit Rollenfeld, vorerst immer „Besitzer“.
- Regeln (Formatprüfung) in `regeln.js`, damit Handy und Server dasselbe prüfen.

### Phase B2 · Identität gekapselt

- `IdentitaetsAnbieter.werBistDu()` in der Companion. Die erste Umsetzung ist ein Gerätecode, der ⚖ E9 folgt.
- Das heutige Beitreten (Name + PIN) wird zur ersten Freischaltung eines Geräts. Danach fragt die Seite nicht mehr nach dem Namen.
- Persönliche oder geteilte Geräte (`typ`). Die Freischaltung am Board klärt ⚖ E10.

### Phase B3 · Service Worker und IndexedDB ⏸

- `companion/sw.js`, ausgeliefert vom Board unter `/sw.js` (Scope `/`). Er cacht die App-Shell: Seite, `regeln.js`, `icons/`, `vendor/`.
- **Cache-Falle:** Der Server liefert die Seite heute bewusst ohne Cache (`OHNE_CACHE`). Der Service Worker braucht deshalb eine Versionsnummer im Cache-Namen und „neue Version verfügbar → neu laden“.
- IndexedDB ersetzt `localStorage` für die Daten. Verbindung und Name dürfen im `localStorage` bleiben.
- Playwright-Test mit `context.setOffline(true)`.
- ⏸ **Haltepunkt:** Max am echten iPhone testen lassen (Home-Bildschirm-App, Flugmodus).

### Phase B4 · Offline-Regel und Warteschlange

- `syncStatus` je Eintrag. Synchronisierte Einträge sind offline gesperrt, mit einem Hinweis in der Oberfläche.
- Die Warteschlange je Identität liegt in IndexedDB. Die Klasse leitet sich aus `art` ab. Nur `automatisch` ist aktiv, `pruefpflichtig` gibt es lediglich im Modell.
- Senden beim Wiederverbinden, in der Reihenfolge des Anlegens.

### Phase B5 · Zustandswechsel

- Wird als Zielzustand gesetzt (`{ eintragId, zustand }`), damit er idempotent ist.
- Erster Anwender sind die Sammelobjekte (abhaken). Weitere Zustände klärt ⚖ E11.

Nicht jetzt: Postfach, Bestätigungs-Oberfläche, Rechte, Protokoll. Das Modell sieht sie schon vor.

---

## 5. Strang C · Welt-Import per ZIP → `Bauplan-Welt-Import`

Betrifft die Karte in `companion-prototyp.html` und `biom-welt.js`. Branch: `bereich/karte-welt-upload`. Strang C gehört zu Phase 5 des bestehenden `companion/PLAN-welt-import-biome.md` und wird dort eingehängt.

- **Upload-Feld** in der Karte: `accept=".zip,.mcworld"`, Verarbeitung im Worker wie im bestehenden Plan.
- **Aufbauprüfung**, mit einer Abweichung vom Bauplan: Der Bauplan nennt einen zusätzlichen Unterordner einen Fehler. `PLAN-welt-import-biome.md` (3.1 ✔) und der fertige Dekoder suchen die Dateien jedoch nach Basisnamen und kommen mit dem Unterordner klar. **Vorschlag:** Die Datei wird angenommen, und es erscheint kein Fehler (⚖ E12). Die Meldungen „keine Weltdatei“ und „keine ZIP“ bleiben wie im Bauplan.
- Vor dem Import zeigt die Seite den Weltnamen aus `levelname.txt` und den Seed aus `level.dat` zur Bestätigung. Die Seed-Prüfung kommt aus dem bestehenden Plan (Regel 6).
- **Anleitung** „Weltordner aus der Dateien-App hochladen“ (drei Schritte, nur iPhone) steht direkt neben dem Upload. Die Struktur ist so angelegt, dass weitere Plattformen dazukommen können.
- Tests: je eine Test-ZIP pro Fall. Sie wird aus `tests/daten/fixture-seed.mcworld` gebaut (einmal korrekt, einmal mit Unterordner, einmal ohne `db/`, einmal keine ZIP).

---

## 6. Reihenfolge

```
A0 ─ A1 ─ A2⏸ ─ A3 ─ A4⏸ ─ A5 ─ (Planung A6⏸) ─ A7
C  (unabhängig, klein – kann jederzeit dazwischen)
B1 ─ B2 ─ B3⏸ ─ B4 ─ B5   (nach A4: Widgets brauchen die Datenschicht, B ändert sie)
```

**Empfehlung:** A0, dann C (kleiner Strang, schließt den Biom-Import ab), dann A1 bis A5, danach B. Strang B ändert das Datenmodell des Servers. Er sollte erst kommen, wenn die Datenschicht der Widgets steht, damit beides nur einmal angepasst werden muss.

Git: Nach jeder Phase pushen. Nach jedem Strang (bzw. nach jedem Haltepunkt mit OK) mergt Max per PR nach `main`.

---

## 7. Offene Entscheidungen für Max

| Nr. | Frage | Vorschlag |
|---|---|---|
| E1 | Wo läuft das Widget-Dashboard? Ersetzt es `/anzeige` am Board, läuft es daneben, oder ist es (auch) die Startansicht am Handy? Die neue Rollentrennung sagt „Board = nur Anzeige“, das Größensystem nennt aber auch Handy und iPad als Zielgeräte. | Eigene Route `/dashboard` neben `/anzeige`. `/anzeige` geht darin auf, sobald „Aufs Board“ als Widget läuft. |
| E2 | Ordnername für die übernommene Widget-Ansicht | `companion/dashboard/` statt `companion/mainhub/` |
| E3 | Wie kommen `BOARD_KARTEN` ins React-Dashboard? | In eine eigene Datei `companion/board-karten.js` auslagern (wie `regeln.js`), die Seite und Dashboard laden |
| E4 | Raster am Handy im Hochformat (weniger Spalten? was wird aus der größten Stufe?) | offen, bis A2 sichtbar ist |
| E5 | Widgets außerhalb der sichtbaren Reihen auf kleineren Seitenverhältnissen | Position behalten, Hinweis im Bearbeiten-Modus |
| E6 | `seitenleistenBreite` | 8 Spalten (= ein Viertel) |
| E7 | Vollbild Pflicht oder optional | optional, je Widget-Typ |
| E8 | Themes für Sammelobjekte, Banner, Rüstung | neutral, bis Max entscheidet |
| E9 | Konkretes Anmeldeverfahren (Gerätecode) | Code am Board anzeigen und am Handy einmal eingeben, aufbauend auf dem QR-Code-Beitritt |
| E10 | Ablauf der Gerätefreischaltung am Board, ohne dass das Board entscheidet | Das erste freigeschaltete Gerät ist Besitzer. Weitere Geräte bestätigt ein freigeschaltetes Handy. |
| E11 | Weitere Zustandswechsel neben offen → erledigt | sammeln, sobald Bereiche sie brauchen |
| E12 | ZIP mit zusätzlichem Unterordner: annehmen oder Fehler? | annehmen (der Dekoder kann es schon) |
| E13 | Kleine Widgets nur Anzeige oder auch Bedienung (abhaken)? | Abhaken erlauben, weil Zustandswechsel konfliktfrei sind (B5) |
| E14 | Welt-Anleitung auch für Android und PC? Reicht eine Karte nur der besuchten Gebiete? | vorerst nur iPhone, besuchte Gebiete reichen (so schon im Biom-Plan) |

Aus den Ideen übernommen und weiter offen: die Vereinheitlichung zum Typ „Einzeleintrag“ und die Größenstufen je Widget (A6).
