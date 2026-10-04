# Companion · Widgets

Widget-Ansicht der Companion für das Board im Zimmer, nach dem Vorbild des
iOS-Kontrollzentrums. Grundlage ist der MainHub-Workspace
(`cloud7too9/mainhub-frontend`, per `git subtree` mit Verlauf übernommen):
Grid, Layer, Bearbeitungsmodus und Galerie.

**Stand:** Phasen A1–A6 aus [`planung/PLAN.md`](../../planung/PLAN.md):
Raster mit 32 Spalten, Größenstufen statt freier Größen, Vollbild als eigene
Route, Widget-Struktur (Bereich → Widget-Typ → Instanz) mit Galerie, das
Register mit allen 13 Typen, Inhalte als **Karten vom Board**, die
**Bereichs-Themes**, **ein Layout pro Anzeige** am Server und **Anordnen am
Handy** (`/dashboard/anordnen`). Der Board-Server liefert das Dashboard unter
`/dashboard` aus. Offen sind die echten Größenstufen (A7, Planung mit Max).

## Starten

```bash
npm install
npm run dev          # http://localhost:5173/dashboard/
npm run build        # Produktions-Build nach dist/
npm test             # Unit-Tests (Vitest)
npm run typecheck    # TS-Check
```

Die App läuft unter `/dashboard/` (Vite `base`). Ausgeliefert wird sie vom
Board-Server: `npm run build`, dann `http://localhost:3000/dashboard` (im
Board-Ordner geht auch `npm run dashboard:build`). Ein eigenes Docker-Image gibt
es nicht. Im Dev-Betrieb leitet Vite `/api` und `/ws` an ein Board auf Port 3000
weiter; läuft keins, zeigen die Widgets **Beispielkarten** (Hinweis im Kopf).
Playwright-Tests mit Screenshots (vorher `npm run build`):
`cd ../tests && node widgets.test.mjs` (ohne Board, Beispielkarten) und
`node widgets-board.test.mjs` (am echten Board).

## Architektur

- `src/app/` – App-Einstieg und Routing
- `src/pages/WorkspacePage.tsx` – Haupt-Workspace
- `src/features/workspace/` – Grid, Widgets, Layer, Layout-Logik, Store
- `src/shared/` – Wiederverwendbare UI und Tokens
- `src/tests/` – Unit-Tests

Designregeln: Raster mit 32 Spalten und quadratischen Zellen, feste Fläche
ohne Seiten-Scroll, getrennter Bearbeitungsmodus. Wie es weitergeht, steht in
`planung/PLAN.md`. `docs/ROADMAP.md` ist die Roadmap aus MainHub und nur noch
Hintergrund.

## Raster (`src/features/workspace/lib/raster.ts`)

Bauplan: `planung/bauplaene/Bauplan-Raster-32-Spalten.md`.

- **32 Spalten** auf jedem Gerät (`RASTER_SPALTEN`), die Zelle ist
  quadratisch: `zellePx = Breite / 32`.
- **Reihen variabel**: `reihen = floor(Höhe / zellePx)` – 16:9 → 18,
  16:10 → 20, 16:11 → 22, 4:3 → 24. Was unter der letzten vollen Reihe übrig
  bleibt, bleibt leer.
- `useRaster()` rechnet bei jeder Größenänderung neu (ResizeObserver), der
  Store kennt die aktuellen Reihen (`reihen`, `setReihen`) und prüft
  Verschieben, Skalieren und Hinzufügen damit.
- Der Abstand zwischen Widgets wächst mit der Zelle (2–10 px) und wird
  innerhalb der Zelle abgezogen, damit sie quadratisch bleibt.
- Kein abgeleitetes Handy-Layout mehr: Jedes Gerät zeigt dieselbe Fläche,
  nur kleiner; bearbeiten geht überall. Liegt ein Widget unter den sichtbaren
  Reihen, wird es abgeschnitten – das löst A6 (ein Layout pro Anzeige).
- Gespeichert wird in Zellen (`localStorage`). Layouts aus dem alten
  96 × 48-Raster werden verworfen.

## Größenstufen (`src/features/workspace/model/widget-vertrag.ts`)

Bauplan: `planung/bauplaene/Bauplan-Widget-Groessensystem.md`.

- **Größen-Vertrag** je Widget-Typ (`WidgetVertrag`): Stufen mit Name, Breite,
  Höhe und Informationsumfang, dazu Mindest- und Maximalgröße. Geprüft beim
  Registrieren (`vertragRegistrieren`): ganze Zellen, höchstens 32 Spalten,
  jede Stufe zwischen Mindest- und Maximalgröße, eindeutige Namen. Die erste
  Stufe ist die Standardstufe.
- **Kein freies Skalieren**: Jedes Widget liegt in einer Stufe
  (`LayoutItem.stufe`), Breite und Höhe folgen daraus. Der Griff unten rechts
  schaltet beim Antippen zur nächsten Stufe, die an der Stelle passt; Ziehen
  wählt die Stufe, die der gezogenen Größe am nächsten kommt. Die obere linke
  Ecke bleibt, am Rand rückt das Widget nach innen.
- **Passt-Prüfung** (`lib/collision-utils.ts`): Belegungsmatrix 32 × reihen,
  Stufe innerhalb von Mindest-/Maximalgröße, Rand mit den Reihen der jeweiligen
  Anzeige, keine belegte Zelle. Hinzufügen nimmt die Standardstufe, sonst die
  nächste, die noch passt.
- `inZellen(px, zellePxEntwurf)` rundet Entwurfsmaße auf ganze Zellen.
- **Vollbild** ist optional je Typ (`vollbild: true`, E7): eigene Route
  `/dashboard/vollbild/:instanzId`, ein Widget allein über die ganze Fläche,
  „Zurück“ zeigt das Raster mit unveränderter Position. Bis A6 startet es der
  Vollbild-Knopf im Bearbeiten-Modus, danach das Handy.
- **Offen** (E6, Planungsrunde A7): `SEITENLEISTEN_BREITE` hat noch keinen Wert,
  deshalb gibt es die größte Rasterstufe (`32 − Seitenleiste`) noch nicht. Die
  Stufen der Beispiel-Panels sind vorläufig.

## Widget-Struktur (`src/features/workspace/model/widget-struktur.ts`)

Bauplan: `planung/bauplaene/Bauplan-Widget-Struktur.md`.

- **Bereich** (`BEREICHE`, IDs wie in der Companion: `karte`, `sammelobjekte`,
  `portale`, `handbuch`, `bauplaene`, `banner`, `ruestung`) ist nur eine
  Überkategorie zum Sortieren.
- **WidgetTyp** (`model/widget-register.ts`): ein einzelner Inhalt mit stabiler
  ID (`portale.verbindungen`), Bereich, Name, Größen-Vertrag, optionalen
  Zusatzinhalten und `mehrfach`, `optional`, `quelle`. Das Register enthält alle
  13 Typen aus `Bauplan-Widget-Inhalte`; die neun neuen haben je eine
  Platzhalter-Stufe, bis A7 die Größen festlegt.
- **Typen mit Quelle** (`quelle`: Koordinate, Sammlung, Liste, Objekt, Eintrag,
  Bauplan, Banner, Set) sind **mehrfach**: Jede Instanz zeigt ihre eigene Quelle,
  Duplizieren behält sie. Alle anderen liegen höchstens einmal je Layer; die
  Galerie sperrt sie dann („liegt schon auf diesem Layer“).
- **WidgetInstanz** (`{ id, typ, stufe, x, y, quelle? }`): was auf dem Dashboard liegt.
  `typ` verweist immer auf einen Widget-Typ, nie auf einen Bereich; Breite und
  Höhe folgen aus der Stufe (`instanzRect`). Vollbild ist keine Stufe, sondern
  die eigene Route.
- **Zusatzinhalte** hängen an einer Stufe und erscheinen ab dieser Stufe (z. B.
  die Tipps der Portalverbindungen ab „groß“), im Vollbild immer.
- **Galerie** („Widget hinzufügen“): gruppiert nach Bereich in der Reihenfolge
  der Companion, mit Suche nach Widget- und Bereichsnamen, je Typ eine
  maßstäbliche Vorschau in der kleinsten Stufe, optionale Typen mit Hinweis.
  Hinzufügen legt die Instanz an der ersten freien passenden Stelle an. Typen mit
  Quelle fragen vorher danach („Banner wählen“, mit Suche); die Liste kommt vom
  Board (`GET /api/widgets/:typ/quellen`). Kennt das Board für einen Typ noch
  keine Quelle (Bereich geplant), kommt das Widget gleich dazu.

## Inhalte: Karten vom Board (`src/features/karten/`)

Bauplan: `planung/bauplaene/Bauplan-Widget-Inhalte.md`, Entscheidung E3.

- **Gehäuse und Inhalt sind getrennt:** `WidgetGehaeuse` zeichnet Rahmen, Kopf
  mit dem Namen des Typs und markiert den Bereich (`data-bereich`, für die Themes
  in A5); ohne Inhalt ist es ein leeres Widget. `WidgetInhalt` zeigt die Karte.
- Die Karte baut der **Board-Server** (`GET /api/widgets/:typ?quelle=…`) mit den
  Anzeigeschemas aus `Companion/app/board-karten.js` – denselben wie „Aufs Board“.
  Das Dashboard rendert nur die Blöcke (`KarteAnsicht`): Koordinaten mit
  Dimension, Zeilen, Text, Bild (pixelgenau). Fachwissen über Bereiche hat es nicht.
- Ohne Karte zeigt das Widget den **Hinweis des Boards** als leeren Zustand:
  „Bereich geplant“ (Handbuch, Baupläne), noch nicht festgelegt
  (Koordinatensammlung, Eigene Liste), „Die Quelle gibt es nicht mehr“,
  „Noch keine Welt auf dem Board“.
- **Live:** Das Dashboard hört auf `/ws` (Rolle Anzeige); nach jedem
  `geaendert` laden alle Widgets ihre Karte neu.
- **Anzeige-Link:** `?anzeige=…&schluessel=…` wie bei `/anzeige`; der Browser
  merkt sich den Schlüssel (`anzeige.zugang`). Ohne gültigen Link von einem
  anderen Gerät zeigen die Widgets „Diese Anzeige braucht ihren Anzeige-Link“.
- **Ohne Board** (`GET /api/server` antwortet nicht): feste Beispielkarten aus
  `lib/mock-karten.ts`, im Kopf steht „Beispielkarten“.
- Die Schrift der Karten wächst mit der Zelle (`--zelle`); was nicht passt, wird
  abgeschnitten, bis A7 die Größen festlegt.

## Bereichs-Themes (`src/features/workspace/model/widget-themes.ts`)

Bauplan: `planung/bauplaene/Bauplan-Bereichs-Themes.md`.

- Am Gehäuse erkennt man den Bereich: Es setzt `data-theme` nach
  `WidgetTyp.bereich` (`BEREICH_THEMES`, fest oder dynamisch), dazu eine Leiste
  oben in der Farbe des Bereichs.
- Ein Theme überschreibt die Farb-Tokens aus `tokens.css` innerhalb des
  Gehäuses (`shared/styles/themes.css`). Inhalte nutzen nur diese Tokens, nie
  feste Farben – so bekommen auch die Karten das Theme.
- **Karte:** dynamisch, die Dimension der angezeigten Karte wählt
  `karte-oberwelt`, `karte-nether` oder `karte-end` (Farben wie `THEMES` der
  Companion).
- **Handbuch:** Leder-Einband, der Inhalt steht auf zwei Buchseiten
  (Rahmen-Komponente `BuchRahmen`).
- **Baupläne:** Bauplan-Blau mit weißem Gitter aus zwei linearen Verläufen.
- **Portal-Verwaltung:** Schwarz-Lila, ohne Rot und Grün – auch Dimensionen in
  Koordinaten-Blöcken und das Entfernen im Kopf.
- **Sammelobjekte, Banner, Rüstung:** noch nicht festgelegt (E8). Bis dahin
  Oberwelt-Grün mit eigener Theme-ID je Bereich, austauschbar nur in
  `themes.css`.

## Layout pro Anzeige (A6)

- **Am Board** (`GET /api/server` meldet das Board) ist das Dashboard reine
  Anzeige (`nurAnzeige` im Store): Es lädt das Layout seiner Anzeige
  (`GET /api/anzeige/layout`; welche Anzeige, sagt der Anzeige-Link, localhost
  ohne Link ist „Board“), zeigt den aktiven Layer ohne Bearbeiten-Modus und
  Layer-Umschalter, im Kopf „Anzeige <Name>“. Gespeichert wird nichts im
  Browser. Hat die Anzeige noch kein Layout, gilt das Start-Layout.
- Ein neues Layout oder ein anderer aktiver Layer kommt **live** an
  (`geaendert` „layout“ über `/ws`).
- Die Anzeige **meldet ihre Reihen** (`PUT /api/anzeige/reihen`), sobald das
  Raster die Fläche gemessen hat – damit das Handy die Fläche im richtigen
  Seitenverhältnis zeigen kann.
- **Anordnen am Handy** (`/dashboard/anordnen?anzeige=:id`, Weg 1 aus N2):
  In der Companion unter Board → Anzeigen → „Anzeige anordnen“. Die Seite nutzt
  die Anmeldung der Companion (`board.verbindung` im Browser-Speicher, gleiches
  Board) und zeigt die Fläche der Anzeige im richtigen Seitenverhältnis
  (32 × ihre gemeldeten Reihen, `WorkspaceGrid festeReihen`) mit **leeren
  Widgets**: Rahmen, Theme und Name, ohne Inhalt. Das ganze Widget ist Griff:
  antippen wählt aus, ziehen verschiebt, die Ecke unten rechts wechselt die
  Stufe. Die Leiste unter dem Kopf zeigt Name, Stufe und Werkzeuge des gewählten
  Widgets (Vollbild, Duplizieren, Entfernen). „+ Widget“ öffnet die Galerie mit
  den Quellen vom Board, der Layer-Umschalter wechselt den Layer der Anzeige.
  Im Hochformat erscheint „Querformat empfohlen“.
- Jede Änderung geht kurz gesammelt an das Board (`PUT /api/anzeigen/:id/layout`,
  `useAnordnen`) und kommt live an der Anzeige an. Ändert ein anderes Handy
  gleichzeitig, lädt die Seite neu – außer während eigene Änderungen unterwegs
  sind (dann gewinnt die letzte).
- **Vollbild** startet das Handy (`PUT /api/anzeigen/:id/vollbild`); die Anzeige
  folgt (`/dashboard/vollbild/:id`, ohne „Zurück“), „Vollbild beenden“ holt sie
  zurück. Abgehakt wird nicht hier, sondern in der Companion (N1).
- Ohne Board (`npm run dev`) bearbeitet man das lokale Layout im Browser wie bisher.

## Layer

Der Workspace besteht aus einem oder mehreren Layern mit jeweils eigener
Widget-Anordnung. Der Umschalter im Header wechselt jederzeit den Layer;
Anlegen, Umbenennen und Entfernen gehen im Bearbeitungszustand. Ohne Board
wird im `localStorage` gespeichert (Schema-Version 6; ältere Stände werden
verworfen), am Board kommt das Layout vom Server (siehe oben).
