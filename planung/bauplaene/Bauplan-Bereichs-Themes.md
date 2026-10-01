# Bauplan: Bereichs-Themes

Stand: 01.10.2026 · Grundlage: Bereichs-Themes · Setzt voraus: Bauplan-Widget-Struktur

Dieser Bauplan beschreibt die technischen Entscheidungen. Die Anpassung an das konkrete Projekt gehört nicht dazu.

## Ziel

Auf dem Dashboard erkennt man an der Gestaltung sofort, aus welchem Bereich ein Widget stammt. Jedes Widget übernimmt das Theme seines Bereichs.

## Mechanik

- Ein Theme ist ein Satz CSS-Variablen (Hintergrund, Vordergrund, Rahmen, Akzent) plus optionale Rahmen-Komponente.
- Das Widget-Gehäuse setzt das Theme anhand von `WidgetTyp.bereich`. Widget-Inhalte verwenden nur die Variablen, nie feste Farben.
- Themes sind statisch, mit einer Ausnahme:

```ts
type ThemeQuelle =
  | { art: "fest"; theme: ThemeId }
  | { art: "dynamisch"; waehle: (zustand: WidgetZustand) => ThemeId };
```

## Festgelegte Themes

| Bereich | Art | Gestaltung |
| --- | --- | --- |
| Karte | dynamisch | Die angezeigte Dimension bestimmt das Theme: Oberwelt, Nether oder End. Wechselt die Dimension, wechselt das Theme. |
| Handbuch | fest | Rahmen wie ein aufgeschlagenes Buch, der Inhalt steht auf der Seite |
| Baupläne | fest | Blauer Bauplan-Hintergrund mit weißem Gitternetz |
| Portal-Verwaltung | fest | Schwarz-lila, weder Rot noch Grün |

Umsetzungshinweise:

- **Karte:** drei Themes `karte-oberwelt`, `karte-nether`, `karte-end`; `waehle` liest die angezeigte Dimension.
- **Handbuch:** Rahmen-Komponente mit zwei Seiten und Buchrücken; der Widget-Inhalt wird auf die Seite gesetzt.
- **Baupläne:** Gitternetz als CSS-Hintergrund (zwei lineare Verläufe), keine Bilddatei.
- **Portal-Verwaltung:** Rot und Grün sind ausgeschlossen, auch für Status-Hinweise innerhalb des Widgets.

## Platzhalter

Sammelobjekte, Banner und Rüstung haben noch kein Theme. Sie bekommen ein neutrales Standard-Theme, das später ersetzt wird, ohne Widget-Code anzufassen.

## Nicht Teil dieses Bauplans (offen)

- Themes für Sammelobjekte, Banner und Rüstung
- Konkrete Farbwerte

## Reihenfolge und Git

1. Theme-Mechanik mit Variablen und Standard-Theme → Commit „Themes: Mechanik und Standard“
2. Feste Themes Handbuch, Baupläne, Portal → Commit „Themes: Handbuch, Baupläne, Portale“
3. Dynamisches Karten-Theme nach Dimension → Commit „Themes: Karte nach Dimension“, danach pushen
