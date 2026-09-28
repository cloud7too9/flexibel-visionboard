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

## Architektur

- `src/app/` – App-Einstieg und Routing
- `src/pages/WorkspacePage.tsx` – Haupt-Workspace
- `src/features/workspace/` – Grid, Panels, Layout-Logik, Store
- `src/shared/` – Wiederverwendbare UI und Tokens
- `src/tests/` – Unit-Tests

Designregeln: 12-Spalten-Grid, feste Größenstufen, getrennter Bearbeitungsmodus.
Nächste Schritte und offene Ideen stehen in `docs/ROADMAP.md`.

## Bildschirmgrößen

Das Layout wird immer im kanonischen Desktop-Raster (12 Spalten) gespeichert.
Für kleinere Bildschirme wird daraus zur Laufzeit ein Layout mit weniger
Spalten abgeleitet (`src/features/workspace/lib/responsive-layout.ts`):
Breiten werden proportional skaliert, Panels in Lesereihenfolge ohne
Überlappung neu angeordnet.

| Breakpoint | Viewport-Breite | Spalten | Abstand | Zeilenhöhe | Verschieben/Skalieren |
|------------|-----------------|---------|---------|------------|------------------------|
| Mobil      | < 640px         | 2       | 8px     | 72px       | nein (automatisch)     |
| Tablet     | 640–1023px      | 6       | 10px    | 80px       | nein (automatisch)     |
| Desktop    | ≥ 1024px        | 12      | 12px    | 80px       | ja                     |

Die Grenzen entsprechen den Tailwind-Breakpoints `sm` und `lg`. Definiert sind
sie in `src/features/workspace/model/breakpoints.ts`; der aktive Breakpoint
kommt aus dem Hook `useBreakpoint()` (`src/shared/hooks/useBreakpoint.ts`) und
wird im Header als Badge angezeigt. Hinzufügen, Duplizieren und Entfernen von
Panels funktionieren in jeder Größe; Drag & Drop und Resize nur auf Desktop,
damit Änderungen 1:1 im gespeicherten Raster landen.
