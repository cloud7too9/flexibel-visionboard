# Bauplan: Widget-Struktur

Stand: 01.10.2026 · Grundlage: Widget-Struktur · Setzt voraus: Bauplan-Widget-Groessensystem

Dieser Bauplan beschreibt die technischen Entscheidungen. Die Anpassung an das konkrete Projekt gehört nicht dazu.

## Ziel

Die Bereiche der Minecraft Companion PWA liefern Widgets fürs Dashboard. Ein Bereich ist nur eine Überkategorie zum Sortieren, aufs Dashboard kommen einzelne Inhalte.

Vorbild ist die Steuerelemente-Galerie des iOS-Kontrollzentrums. Übernommen wird nur, was passt.

## Modell

```ts
interface Bereich {           // Überkategorie, nur zum Sortieren
  id: BereichId;              // "karte" | "sammelobjekte" | "portale" | "handbuch" | "bauplaene" | "banner" | "ruestung"
  name: string;
}

interface WidgetTyp {         // ein einzelner Inhalt
  id: string;
  bereich: BereichId;
  name: string;
  vertrag: WidgetVertrag;     // aus dem Größensystem, Stufen optional
  zusatzinhalte?: {           // nur auf größeren Stufen, keine eigenen Widgets
    abStufe: string;
    inhalt: string;
  }[];
}

interface WidgetInstanz {     // was auf dem Dashboard liegt
  id: string;
  typ: string;                // WidgetTyp.id, nie Bereich.id
  stufe: string;              // Name der Größenstufe oder "vollbild"
  x: number; y: number;       // Zellen
}
```

## Regeln

- **Aufs Dashboard kommen nur Widget-Typen**, nie ein Bereich als Ganzes. Der Datentyp erzwingt das: `WidgetInstanz.typ` verweist auf einen Widget-Typ.
- **Größenstufen sind optional.** Ein Widget-Typ bietet nur die Stufen an, die für seinen Inhalt sinnvoll sind; eine einzige Stufe ist erlaubt.
- **Zusatzinhalte** (z. B. Tipps) hängen an einer Stufe und werden nur ab dieser Stufe eingeblendet.

## Galerie

- Auswahl neuer Widgets in einer Galerie, gruppiert nach Bereich.
- Pro Widget-Typ eine Vorschau in seiner kleinsten angebotenen Stufe.
- Hinzufügen legt eine `WidgetInstanz` an der ersten freien passenden Position an (Passt-Prüfung aus dem Größensystem).

## Nicht Teil dieses Bauplans (offen)

- Konkrete Größenstufen der einzelnen Widgets

## Reihenfolge und Git

1. Typen Bereich, Widget-Typ, Instanz → Commit „Widget-Struktur: Typen“
2. Einblenden von Zusatzinhalten je Stufe → Commit „Zusatzinhalte je Stufe“
3. Galerie gruppiert nach Bereich → Commit „Widget-Galerie“, danach pushen
