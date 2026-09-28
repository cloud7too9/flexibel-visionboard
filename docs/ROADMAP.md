# Roadmap

Arbeitsweise: Pro Session ein Punkt aus „Als Nächstes“, ein Branch, ein Commit.
Neue Ideen landen sofort unter „Später“, ohne Diskussion. Sortiert wird erst,
wenn „Als Nächstes“ leer wird. Erledigte Punkte wandern nach „Erledigt“ mit
Datum und Commit.

Punkte beschreiben das Ziel, nicht die Lösung. Offene Fragen stehen direkt
beim Punkt und werden vor der Umsetzung geklärt.

## Als Nächstes

### 1. Bearbeitungszustand per langem Drücken

Widgets sind nicht mehr jederzeit löschbar, sondern nur in einem expliziten
Bearbeitungszustand. Der Zustand wird nicht pro Widget, sondern für die
gesamte Oberfläche mit allen aktiven Widgets ein- und ausgeschaltet.

- Einstieg: Die Verschiebe-Fläche eines Widgets (Kopfzeile) wird lange
  gedrückt gehalten, ohne zu verschieben. Danach wechselt die ganze
  Oberfläche in den Bearbeitungszustand.
- Im Bearbeitungszustand zeigt die Oberfläche einen Button „Widget
  hinzufügen“ und einen Button „Bearbeitung beenden“.
- Entfernen und Duplizieren sind nur im Bearbeitungszustand sichtbar.
- Funktioniert auf allen Bildschirmgrößen. Auf Touch-Geräten ist langes
  Drücken der natürliche Einstieg, weil dort Drag & Drop deaktiviert ist.

Offene Fragen:
- Bleibt der Button „Bearbeiten“ im Header als zweiter Einstieg, oder ist
  langes Drücken der einzige Weg?
- Schwelle für „lange gedrückt“: 500 ms ist üblich. Bewegung über wenige
  Pixel bricht ab und startet stattdessen das Verschieben (nur Desktop).
- Soll das Entfernen eine Rückfrage bekommen, oder reicht der
  Bearbeitungszustand als Schutz?

### 2. Voraussetzungs-Schema für Verträge zwischen Tools und Oberfläche

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

Offene Fragen:
- Welche Voraussetzungen gibt es konkret zum Start? Drei bis fünf reichen.
- Wird das Schema nur zur Entwicklungszeit geprüft (Typen) oder auch zur
  Laufzeit (z. B. Berechtigung vom Nutzer verweigert)?
- Wer ist Vertragspartner: nur die Oberfläche, oder auch Tools untereinander?

### 3. Panel-Inhalte an echte Datenquellen anbinden

Alle Panels zeigen fest verdrahtete Beispieldaten. Ziel ist eine Schicht,
über die Panels Daten beziehen, damit Inhalte austauschbar werden. Hängt
von Punkt 2 ab, weil Datenquellen dort als Voraussetzung deklariert werden.

### 4. Tests für den Workspace-Store

Der Store (`workspace.store.ts`) hat keine Tests. Verschieben, Skalieren,
Hinzufügen, Entfernen, Duplizieren und Reset sollten abgedeckt sein, bevor
der Bearbeitungszustand (Punkt 1) den Store umbaut.

### 5. Routing

`routes.tsx` rendert nur die Workspace-Seite. Sobald eine zweite Seite
kommt (z. B. Einstellungen oder ein Tool im Vollbild), braucht es echtes
Routing.

## Später

- Eigene Layouts pro Bildschirmgröße speichern, statt sie aus dem
  Desktop-Raster abzuleiten.
- Panel-Titel umbenennen.
- Mehrere Workspaces (Layouts) anlegen und wechseln.
- Tastaturbedienung für Verschieben und Skalieren.
- Undo für Layout-Änderungen.

## Erledigt

- 2026-09-27 · Responsive Bildschirmgrößen (Mobil / Tablet / Desktop) mit
  abgeleitetem Layout · `062691d`
