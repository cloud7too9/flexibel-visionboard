# Companion · Widgets

Widget-Ansicht der Companion für das Board im Zimmer, nach dem Vorbild des
iOS-Kontrollzentrums. Grundlage ist der MainHub-Workspace
(`cloud7too9/mainhub-frontend`, per `git subtree` mit Verlauf übernommen):
Grid, Layer, Bearbeitungsmodus und Galerie.

**Stand:** Phase A0 aus [`planung/PLAN.md`](../../planung/PLAN.md). Der
Ordner läuft unverändert wie MainHub (eigene Beispiel-Panels, Layout im
`localStorage`). Der Umbau folgt den Phasen A1–A6 im Plan: 32 Spalten,
Größenstufen, Companion-Register, Karten vom Server, Layout pro Anzeige,
Anordnen am Handy. Was unten zu Raster und Bildschirmgrößen steht, gilt bis
dahin.

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

Designregeln: feines Raster (96 × 48 Zellen auf Desktop), freie Größen mit
Mindestmaßen, feste Fläche ohne Seiten-Scroll, getrennter Bearbeitungsmodus.
Wie es weitergeht, steht in `planung/PLAN.md`. `docs/ROADMAP.md` ist die
Roadmap aus MainHub und nur noch Hintergrund.

## Raster und Fläche

Die Seite scrollt nie. Die Widget-Fläche füllt den Bildschirm unter dem
Header und ist in ein festes Raster geteilt; die Zellgröße ergibt sich aus
der verfügbaren Breite und Höhe. Widgets bleiben immer vollständig in der
Fläche. Ist kein Platz mehr frei, meldet „Widget hinzufügen“ das, statt die
Seite zu verlängern. Im Bearbeitungszustand zeigt die Fläche feine
Gitterlinien je Zelle und kräftigere alle 8 Zellen. Größen sind frei in
Zellschritten wählbar; es gelten nur die Mindestmaße aus der Registry.

## Bildschirmgrößen

Das Layout wird immer im kanonischen Desktop-Raster (96 × 48) gespeichert.
Für kleinere Bildschirme wird daraus zur Laufzeit ein Layout mit weniger
Spalten abgeleitet (`src/features/workspace/lib/responsive-layout.ts`):
Maße werden proportional skaliert, Widgets in Lesereihenfolge ohne
Überlappung neu angeordnet und danach in die Höhe der Fläche eingepasst.

| Breakpoint | Viewport-Breite | Raster  | Verschieben/Skalieren |
|------------|-----------------|---------|------------------------|
| Mobil      | < 640px         | 24 × 48 | nein (automatisch)     |
| Tablet     | 640–1023px      | 48 × 64 | nein (automatisch)     |
| Desktop    | ≥ 1024px        | 96 × 48 | ja                     |

Die Grenzen entsprechen den Tailwind-Breakpoints `sm` und `lg`. Definiert sind
sie in `src/features/workspace/model/breakpoints.ts`; der aktive Breakpoint
kommt aus dem Hook `useBreakpoint()` (`src/shared/hooks/useBreakpoint.ts`) und
wird im Header als Badge angezeigt. Hinzufügen, Duplizieren und Entfernen von
Panels funktionieren in jeder Größe; Drag & Drop und Resize nur auf Desktop,
damit Änderungen 1:1 im gespeicherten Raster landen.

## Layer

Der Workspace besteht aus einem oder mehreren Layern mit jeweils eigener
Widget-Anordnung. Der Umschalter im Header wechselt jederzeit den Layer;
Anlegen, Umbenennen und Entfernen gehen im Bearbeitungszustand. Gespeichert
wird im `localStorage` (Schema-Version 3). Daten aus Version 1 und 2
(grobes 12-Spalten-Raster) werden beim Laden automatisch ins feine Raster
umgerechnet.
