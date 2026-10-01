# MainHub Frontend

Modulares Workspace-Layout-System für MainHub. Grid-basierte Panels, verschiebbar, skalierbar, lokal persistiert.

## Getting Started

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # Produktions-Build
npm run test         # Unit-Tests
npm run typecheck    # TS-Check
```

## Docker

```bash
docker compose up --build              # Produktions-Build über nginx → http://localhost:8080
docker compose --profile dev up dev    # Vite mit Hot Reload       → http://localhost:5173
```

Die Ports lassen sich über `MAINHUB_PORT` und `MAINHUB_DEV_PORT` ändern.
Das Image baut die App in einer Node-Stufe und liefert `dist/` über nginx aus
(`docker/nginx.conf`): Assets mit Hash werden ein Jahr gecacht, `index.html`
nie, unbekannte Pfade fallen auf die App zurück, und `/healthz` dient dem
Health-Check. Ohne Compose:

```bash
docker build -t mainhub-frontend .
docker run --rm -p 8080:80 mainhub-frontend
```

## Architektur

- `src/app/` – App-Einstieg und Routing
- `src/pages/WorkspacePage.tsx` – Haupt-Workspace
- `src/features/workspace/` – Grid, Widgets, Layer, Layout-Logik, Store
- `src/shared/` – Wiederverwendbare UI und Tokens
- `src/tests/` – Unit-Tests

Designregeln: feines Raster (96 × 48 Zellen auf Desktop), freie Größen mit
Mindestmaßen, feste Fläche ohne Seiten-Scroll, getrennter Bearbeitungsmodus.
Nächste Schritte und offene Ideen stehen in `docs/ROADMAP.md`.

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
