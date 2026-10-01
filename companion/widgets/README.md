# Companion · Widgets

Widget-Ansicht der Companion für das Board im Zimmer, nach dem Vorbild des
iOS-Kontrollzentrums. Grundlage ist der MainHub-Workspace
(`cloud7too9/mainhub-frontend`, per `git subtree` mit Verlauf übernommen):
Grid, Layer, Bearbeitungsmodus und Galerie.

**Stand:** Phase A1 aus [`planung/PLAN.md`](../../planung/PLAN.md): Raster
mit 32 Spalten. Noch mit den MainHub-Beispiel-Panels und dem Layout im
`localStorage`. Es folgen Größenstufen, Companion-Register, Karten vom
Server, Layout pro Anzeige und Anordnen am Handy (A2–A6).

## Starten

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # Produktions-Build nach dist/
npm test             # Unit-Tests (Vitest)
npm run typecheck    # TS-Check
```

Ausgeliefert wird später vom Board-Server unter `/dashboard` (Phase A6),
wie heute `/anzeige`. Ein eigenes Docker-Image gibt es deshalb nicht mehr.

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
- Gespeichert wird in Zellen (`localStorage`, Schema-Version 4). Layouts aus
  dem alten 96 × 48-Raster werden verworfen.

## Layer

Der Workspace besteht aus einem oder mehreren Layern mit jeweils eigener
Widget-Anordnung. Der Umschalter im Header wechselt jederzeit den Layer;
Anlegen, Umbenennen und Entfernen gehen im Bearbeitungszustand. Gespeichert
wird im `localStorage` (Schema-Version 4).
