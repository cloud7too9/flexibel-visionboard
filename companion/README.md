# Modul O · Orte – mobiler Prototyp

Koordinaten-Sammlung für die Minecraft Companion PWA nach dem minimalen Datenmodell
(`World → Dimension → FeatureInstance → FeatureType → FeatureCategory`).
Eine HTML-Datei, Vanilla JS, gleiche Shell und Basis-CSS wie `modul-a-live-karte.html`.

**Ausprobieren:** `modul-orte.html` direkt öffnen (am Handy oder Desktop). Ohne `?live=1` läuft der DEMO-Mock mit Beispielwelt.

## Was drin ist

- **Dimensions-Reiter** Oberwelt / Nether / End – färben die ganze Oberfläche (THEMES aus Modul A)
- **Liste** als Akkordion: Kategorie → Variante (FeatureType) → Instanzen, mit Suche und Kategorie-Filter
- **Karte**: Features und eigene Orte als Marker; Biome als Fläche **nur um bekannte Punkte** (`CONFIG.biomRadius`), unbekannte Fläche bleibt leer
- **Screenshot** (Bottom-Bar): mehrere Seed-Map-Screenshots → Prüfliste → speichern; Duplikat-Hinweis, Biom-/Dimensionsprüfung
- **Eintragen** von Hand: alle Kategorien außer Biome; neue Typen nur bei „Eigene Orte“
- **Welt**: Welten per Seed anlegen und wechseln
- **Standort** (nur lokal): Entfernung + Himmelsrichtung, Nether/Oberwelt umgerechnet
- Nether↔Oberwelt-Umrechnung, `/execute in … run tp`-Befehl zum Kopieren
- **Sidebar** aus einer Bereichs-Registry (`BEREICHE`) – Vorbereitung für Dashboard-Widgets

## Regeln (Server muss sie genauso prüfen – siehe `instanzPruefen()`)

1. „Eigene Orte“ ist eine zusätzliche Kategorie; dort legt man Typen (Ortsnamen) selbst an.
2. In allen anderen Kategorien entstehen neue Typen nur aus Screenshots (Variante aus dem Popup, z. B. Stronghold → „Stairway“).
3. Biome nur per Screenshot. Das Biom ist der Typ, es muss in der Biom-Liste stehen, die Dimension ergibt sich aus der Liste.
4. Biom-Instanzen sind fest (nur löschen, nicht bearbeiten).

## API-Vertrag

| Methode | Pfad | Body | Antwort |
|---|---|---|---|
| GET | `/orte/welten` | – | `{ welten:[{ id, seed, anzahl }] }` |
| POST | `/orte/welten` | `{ seed }` | `{ welt }` – legt 3 Dimensionen an |
| GET | `/orte/welten/:id` | – | `{ welt, dimensionen, typen, instanzen }` |
| POST | `/orte/instanzen` | `{ dimensionId, kategorie, variante, x, y, z, quelle }` | `{ instanz, typ }` – Typ wird gefunden oder angelegt |
| PATCH | `/orte/instanzen/:id` | `{ x, y, z }` | `{ instanz }` – 403 bei Biomen |
| DELETE | `/orte/instanzen/:id` | – | `{ ok:true }` |
| POST | `/orte/auslesen` | multipart `datei` | `{ erkannt:{ titel, kategorie, variante, dimension, x, y, z } \| null }` |

`typ = { id, kategorie, variante|null }` · `instanz = { id, dimensionId, featureTypeId, x, y|null, z }` · `quelle = "screenshot" | "manuell"`

Die Texterkennung (`/orte/auslesen`) gibt es schon im Koordinaten-Board (`server/src/erkennung.js`) – sie muss nur auf dieses Antwortformat umgestellt und um die Biom-Liste erweitert werden.

## Einbau in die Hauptdatei

- CSS-Abschnitt „MODUL O · ORTE“ übernehmen (Basis ist identisch)
- `<section class="module" data-module="orte">` in den Module-Stack, Nav-Eintrag in die Sidebar
- JS-Abschnitte 2–9 übernehmen; `api()`, `esc()`, `THEMES` gibt es dort schon
- In `switchModule()` beim Aktivieren `weltenLaden()` aufrufen, beim Verlassen `alleSchliessen()`

## Offen

- Datenhaltung: Companion-Server (Hetzner) oder Board im Heimnetz
- Beispiel-Screenshot vom Biom-Popup, um die Erkennung darauf abzustimmen
- Widget-Ansicht fürs Dashboard (Modul-Vertrag `mount/unmount` ist vorbereitet)
