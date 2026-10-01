# Companion · Widgets

Widget-Ansicht der Companion für das Board im Zimmer, nach dem Vorbild des
iOS-Kontrollzentrums. Grundlage ist der MainHub-Workspace
(`cloud7too9/mainhub-frontend`, per `git subtree` mit Verlauf übernommen):
Grid, Layer, Bearbeitungsmodus und Galerie.

**Stand:** Phasen A1 und A2 aus [`planung/PLAN.md`](../../planung/PLAN.md):
Raster mit 32 Spalten, Größenstufen statt freier Größen, Vollbild als eigene
Route. Noch mit den MainHub-Beispiel-Panels (vorläufige Stufen) und dem Layout
im `localStorage`. Es folgen Companion-Register, Karten vom Server, Themes,
Layout pro Anzeige und Anordnen am Handy (A3–A6).

## Starten

```bash
npm install
npm run dev          # http://localhost:5173/dashboard/
npm run build        # Produktions-Build nach dist/
npm test             # Unit-Tests (Vitest)
npm run typecheck    # TS-Check
```

Die App läuft unter `/dashboard/` (Vite `base`). Ausgeliefert wird sie später
vom Board-Server (Phase A6), wie heute `/anzeige`. Ein eigenes Docker-Image
gibt es deshalb nicht mehr. Playwright-Test mit Screenshots:
`cd ../tests && node widgets.test.mjs` (vorher `npm run build`).

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

## Layer

Der Workspace besteht aus einem oder mehreren Layern mit jeweils eigener
Widget-Anordnung. Der Umschalter im Header wechselt jederzeit den Layer;
Anlegen, Umbenennen und Entfernen gehen im Bearbeitungszustand. Gespeichert
wird im `localStorage` (Schema-Version 5; ältere Stände werden verworfen).
