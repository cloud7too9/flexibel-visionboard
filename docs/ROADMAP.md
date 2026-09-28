# Roadmap

Arbeitsweise: Pro Session ein Punkt aus „Als Nächstes“, ein Branch, ein Commit.
Neue Ideen landen sofort unter „Später“, ohne Diskussion. Sortiert wird erst,
wenn „Als Nächstes“ leer wird. Erledigte Punkte wandern nach „Erledigt“ mit
Datum und Commit.

Punkte beschreiben das Ziel, nicht die Lösung. Offene Fragen stehen direkt
beim Punkt und werden vor der Umsetzung geklärt.

## Als Nächstes

### 1. Voraussetzungs-Schema für Verträge zwischen Tools und Oberfläche

Ein Schema, in dem ein Tool (Widget/Panel) deklariert, was es von der
Oberfläche braucht, und die Oberfläche deklariert, was sie garantiert.
Aus beiden entsteht ein Vertrag, der bei der Registrierung geprüft wird.

Lesart (bitte korrigieren):
- Das Tool deklariert Voraussetzungen wie Mindestgröße, unterstützte
  Bildschirmgrößen, benötigte Datenquellen, Berechtigungen, Netzwerkzugang,
  ob es Resize verträgt.
- Die Oberfläche deklariert, was sie in der aktuellen Umgebung bereitstellt.
- Ein Tool, dessen Voraussetzungen nicht erfüllt sind, wird nicht angeboten
  oder mit Hinweis angezeigt, statt kaputt zu rendern.
- Die heutige `PanelDefinition` (minBreite, minHoehe, erlaubtResize) ist ein
  erster Vorläufer davon und würde in das Schema aufgehen.

Entschieden: Die konkreten Voraussetzungen ergeben sich beim weiteren Bauen.
Das Schema startet deshalb mit dem, was heute schon existiert (Größe,
Resize, Bildschirmgrößen), und wächst pro Tool, das es braucht.

Offene Fragen:
- Wird das Schema nur zur Entwicklungszeit geprüft (Typen) oder auch zur
  Laufzeit (z. B. Berechtigung vom Nutzer verweigert)?
- Wer ist Vertragspartner: nur die Oberfläche, oder auch Tools untereinander?

### 2. Panel-Inhalte an echte Datenquellen anbinden

Alle Panels zeigen fest verdrahtete Beispieldaten. Ziel ist eine Schicht,
über die Panels Daten beziehen, damit Inhalte austauschbar werden. Hängt
von Punkt 1 ab, weil Datenquellen dort als Voraussetzung deklariert werden.

### 3. Einstellungsbereich

Ein eigener Einstellungsbereich, getrennt von der Workspace-Oberfläche. Auf
der eigentlichen Oberfläche gibt es nur den nötigen Zugangspunkt und sonst
nichts, das Platz verbraucht.

Erste Optionen:
- Rückfrage beim Entfernen eines Widgets (Standard: aus; der
  Bearbeitungszustand ist der Schutz).
- Layout auf Standard zurücksetzen. Der Button „Zurücksetzen“ verlässt dann
  den Bearbeitungszustand und zieht in die Einstellungen um.

Hängt vom Routing (Punkt 5) ab, wenn der Bereich eine eigene Seite wird.

### 4. Tests für den Workspace-Store

Der Store (`workspace.store.ts`) hat keine Tests. Verschieben, Skalieren,
Hinzufügen, Entfernen, Duplizieren und Reset sollten abgedeckt sein, bevor
weitere Zustände (Einstellungen) dazukommen.

### 5. Routing

`routes.tsx` rendert nur die Workspace-Seite. Sobald eine zweite Seite
kommt (Einstellungsbereich, Punkt 3, oder ein Tool im Vollbild), braucht es
echtes Routing.

## Später

- Eigene Layouts pro Bildschirmgröße speichern, statt sie aus dem
  Desktop-Raster abzuleiten.
- Panel-Titel umbenennen.
- Mehrere Workspaces (Layouts) anlegen und wechseln.
- Tastaturbedienung für Verschieben und Skalieren.
- Undo für Layout-Änderungen.

## Erledigt

- 2026-09-28 · Bearbeitungszustand per langem Drücken auf die Kopfzeile
  eines Widgets. Gilt für die gesamte Oberfläche und alle Bildschirmgrößen.
  „Bearbeiten“ im Header nur auf Desktop; im Bearbeitungszustand „Widget
  hinzufügen“ und „Bearbeitung beenden“. Entfernen/Duplizieren nur dort.
- 2026-09-27 · Responsive Bildschirmgrößen (Mobil / Tablet / Desktop) mit
  abgeleitetem Layout · `062691d`
