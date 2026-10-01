# Roadmap

> **Abgelöst** seit der Übernahme in die Companion (01.10.2026). Was als
> Nächstes kommt, steht in [`planung/PLAN.md`](../../../planung/PLAN.md).
> Diese Roadmap aus MainHub bleibt als Hintergrund stehen. Das Docker-Image
> gibt es nicht mehr: Ausgeliefert wird vom Board-Server.

Arbeitsweise: Pro Session ein Punkt aus „Als Nächstes“, ein Branch, ein Commit.
Neue Ideen landen sofort unter „Später“, ohne Diskussion. Sortiert wird erst,
wenn „Als Nächstes“ leer wird. Erledigte Punkte wandern nach „Erledigt“ mit
Datum und Commit.

Punkte beschreiben das Ziel, nicht die Lösung. Offene Fragen stehen direkt
beim Punkt und werden vor der Umsetzung geklärt.

## Als Nächstes

### 1. Widget-Inhalte an echte Datenquellen anbinden

Alle Widgets zeigen fest verdrahtete Beispieldaten. Ziel ist eine Schicht,
über die Widgets Daten beziehen, damit Inhalte austauschbar werden. Aus den
Anforderungen, die dabei entstehen, wächst später das Voraussetzungs-Schema.

### 2. Einstellungsbereich

Ein eigener Einstellungsbereich, getrennt von der Workspace-Oberfläche. Auf
der eigentlichen Oberfläche gibt es nur den nötigen Zugangspunkt und sonst
nichts, das Platz verbraucht.

Erste Optionen:
- Rückfrage beim Entfernen eines Widgets (Standard: aus; der
  Bearbeitungszustand ist der Schutz).
- Rückfrage beim Entfernen eines Layers mit Widgets (heute immer an).
- Layer zurücksetzen. Der Button „Zurücksetzen“ verlässt dann den
  Bearbeitungszustand und zieht in die Einstellungen um.

Hängt vom Routing (Punkt 3) ab, wenn der Bereich eine eigene Seite wird.

### 3. Routing

`routes.tsx` rendert nur die Workspace-Seite. Sobald eine zweite Seite
kommt (Einstellungsbereich, Punkt 2, oder ein Tool im Vollbild), braucht es
echtes Routing. nginx im Docker-Image liefert unbekannte Pfade bereits an
die App aus.

## Später

- Voraussetzungs-Schema für Verträge zwischen Tools und Oberfläche.
  Verschoben, weil es noch keinen Inhalt gibt, auf den es sich beziehen
  kann. Ein Tool deklariert, was es braucht; die Oberfläche, was sie
  garantiert; nicht erfüllbare Tools werden nicht angeboten oder mit
  Hinweis gezeigt. Die heutige `PanelDefinition` ist ein Vorläufer. Die
  konkreten Voraussetzungen ergeben sich beim weiteren Bauen.
- Docker-Widget: Container-Status anzeigen, starten und stoppen. Braucht
  ein Backend oder einen abgesicherten Proxy zur Docker-API, weil der
  Browser nicht direkt auf den Docker-Socket zugreifen kann.
- Widgets zwischen Layern verschieben.
- Reihenfolge der Layer ändern.
- Auf Mobil per Wischgeste zwischen Layern wechseln.
- Eigene Layouts pro Bildschirmgröße speichern, statt sie aus dem
  Desktop-Raster abzuleiten. Mit fester Fläche ohne Scrollen dringlicher:
  Auf dem Handy werden viele Widgets eines Layers sehr flach. Damit wäre
  auch Verschieben und Skalieren auf Touch-Geräten möglich, weil die Seite
  nicht mehr scrollt.
- Widget-Titel umbenennen.
- Tastaturbedienung für Verschieben und Skalieren.
- Undo für Layout-Änderungen.

## Erledigt

- 2026-09-30 · Feste Fläche ohne Seiten-Scroll, feines Raster (96 × 48 auf
  Desktop) mit freien Größen statt fester Stufen, Gitterlinien im
  Bearbeitungszustand auf allen Bildschirmgrößen, Umrechnung gespeicherter
  Layouts (Schema-Version 3).
- 2026-09-29 · Docker: mehrstufiges Image mit nginx, Compose mit
  Produktions- und Entwicklungsprofil (Hot Reload), Health-Check.
- 2026-09-29 · Tests für den Workspace-Store (Widgets und Layer).
- 2026-09-29 · Mehrere Layer mit eigener Widget-Anordnung, Umschalter im
  Header, Migration gespeicherter Daten · `f5aae60`
- 2026-09-28 · Bearbeitungszustand per langem Drücken auf die Kopfzeile
  eines Widgets. Gilt für die gesamte Oberfläche und alle Bildschirmgrößen.
  „Bearbeiten“ im Header nur auf Desktop; im Bearbeitungszustand „Widget
  hinzufügen“ und „Bearbeitung beenden“. Entfernen/Duplizieren nur dort ·
  `71ab23b`
- 2026-09-27 · Responsive Bildschirmgrößen (Mobil / Tablet / Desktop) mit
  abgeleitetem Layout · `062691d`
