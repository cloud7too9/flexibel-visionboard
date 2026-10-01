# Bauplan: Widget-Inhalte (Register)

Stand: 01.10.2026 · Grundlage: Widget-Inhalte · Setzt voraus: Bauplan-Widget-Struktur

Dieser Bauplan beschreibt die technischen Entscheidungen. Die Anpassung an das konkrete Projekt gehört nicht dazu.

## Ziel

Ein zentrales Register aller Widget-Typen der Companion PWA, Stand vor der Vereinheitlichung. Größen sind noch nicht festgelegt.

## Erweiterung des Widget-Typs

```ts
interface WidgetTyp {
  // … Felder aus dem Struktur-Bauplan
  mehrfach: boolean;   // beliebig viele Instanzen, jede mit eigener Quelle
  optional?: boolean;  // als optionales Extra-Widget markiert
}

interface WidgetInstanz {
  // … Felder aus dem Struktur-Bauplan
  quelle?: string;     // ID der Koordinate, Liste, des Eintrags, Bauplans, Banners, Sets
}
```

## Register

| Bereich | Widget-Typ | mehrfach | Quelle |
| --- | --- | --- | --- |
| Karte | Gesamtkarte: ausrichtbar auf Punkt oder Koordinate, mit Markern | nein | – |
| Karte | Einzelkoordinate (optional) | ja | Koordinate |
| Karte | Koordinatensammlung (optional) | ja | Sammlung |
| Sammelobjekte | Gesamtauflistung | nein | – |
| Sammelobjekte | Eigene Liste (frei zusammengestellt, schließt Listen nach Art ein) | ja | Liste |
| Sammelobjekte | Einzelobjekt „suche ich als Nächstes“ | ja | Objekt |
| Sammelobjekte | Status-Button: Fortschritt als Kennzahl | nein | – |
| Portal-Verwaltung | Auflistung aller Portalverbindungen Oberwelt ↔ Nether mit Koordinaten | nein | – |
| Handbuch | Einzelner Eintrag (Brau-, Crafting-Rezept, Verzauberung …) | ja | Eintrag |
| Handbuch | Materialliste zum Abhaken | ja | Liste |
| Baupläne | Einzelner Bauplan | ja | Bauplan |
| Banner | Einzelnes Banner mit Bauplan: Motiv plus Herstellungsschritte | ja | Banner |
| Rüstung | Einzelnes Rüstungs-Set mit Bauplan | ja | Set |

Festgelegt:

- **Baupläne:** keine Auflistung aller Baupläne als Widget.
- **Portal-Verwaltung:** Tipps (z. B. Mindestabstand zwischen Portalen je Dimension) sind Zusatzinhalt größerer Stufen, kein eigenes Widget.
- **Handbuch:** genau ein nachschlagbarer Eintrag pro Widget.

## Umsetzung

- Register als eine Datei mit allen Einträgen, Stufen zunächst als Platzhalter (eine Stufe je Typ).
- Quelle wird beim Hinzufügen eines mehrfachen Widgets abgefragt.
- Wird die Quelle gelöscht, zeigt die Instanz einen leeren Zustand statt zu verschwinden.
- Typ-IDs stabil halten: Spätere Zusammenlegung (Kandidat „Einzeleintrag“) darf gespeicherte Instanzen nicht brechen.

## Nicht Teil dieses Bauplans (offen)

- Größenstufen je Widget
- Vereinheitlichung zu gemeinsamen Typen
- Inhalt des Handbuchs (erst grob klar)

## Reihenfolge und Git

1. Felder `mehrfach`, `optional`, `quelle` → Commit „Register: Mehrfach-Widgets und Quelle“
2. Register mit allen Typen und Platzhalter-Stufen → Commit „Widget-Register: Sammelstand“, danach pushen
3. Quellen-Auswahl beim Hinzufügen → Commit „Quelle beim Hinzufügen wählen“
