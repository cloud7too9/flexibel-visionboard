# Companion · Prototyp – Karte, Sammelobjekte, Banner

Koordinaten-Sammlung für das Modul **Karte** (vormals Live-Karte) der Minecraft Companion PWA, nach dem minimalen Datenmodell
(`World → Dimension → FeatureInstance → FeatureType → FeatureCategory`).
Eine HTML-Datei, Vanilla JS, gleiche Shell und Basis-CSS wie `modul-a-live-karte.html`.

**Ausprobieren:** `companion-prototyp.html` direkt öffnen (am Handy oder Desktop). Ohne `?live=1` läuft der DEMO-Mock mit Beispielwelt. Mit `?modul=sammelobjekte` oder `?modul=banner` startet man direkt im jeweiligen Bereich.

## Was drin ist

- **Dimensions-Reiter** Oberwelt / Nether / End – färben die ganze Oberfläche (THEMES aus Modul A)
- **Liste** als Akkordion: Kategorie → Variante (FeatureType) → Instanzen, mit Suche und Kategorie-Filter
- **Karte**: Features und eigene Orte als Marker; Biome als Fläche **nur um bekannte Punkte** (`CONFIG.biomRadius`), unbekannte Fläche bleibt leer
- **Screenshot** (Bottom-Bar): mehrere Seed-Map-Screenshots → Prüfliste → speichern; Duplikat-Hinweis, Biom-/Dimensionsprüfung
- **Eintragen** von Hand: alle Kategorien außer Biome; neue Typen nur bei „Eigene Orte“
- **Welt**: Welten per Seed anlegen und wechseln
- **Standort** (nur lokal): Entfernung + Himmelsrichtung, Nether/Oberwelt umgerechnet
- Nether↔Oberwelt-Umrechnung, `/execute in … run tp`-Befehl zum Kopieren
- **Sidebar** aus einer Bereichs-Registry (`BEREICHE`) – Vorbereitung für Dashboard-Widgets:
  Karte · Sammelobjekte · Portal-Verwaltung · Handbuch · Baupläne · Banner · Rüstung

## Bereiche (Rahmen)

| Bereich | Stand | Inhalt |
|---|---|---|
| Karte | umgesetzt | Live-Karte + Koordinaten-Sammlung |
| Sammelobjekte | umgesetzt | Rüstungsbesätze abhaken, Fundorte |
| Portal-Verwaltung | geplant | – |
| Handbuch | geplant | – |
| Baupläne | geplant | – |
| Banner | umgesetzt | Baupläne für Banner mit Anleitung |
| Rüstung | geplant | Rüstungs-Sets |

Neue Bereiche: Eintrag in `BEREICHE` + Icon in `ICON`. Ohne `mount()` zeigt die Sidebar den Bereich als „geplant“.
Die Details jedes Bereichs werden einzeln festgelegt. Reihenfolge: Banner ✓ → Portal-Verwaltung → Rüstung, Handbuch, Baupläne.
Für Rüstung liegt ein erster Code-Entwurf in `entwuerfe/banner-ruestung.js` (nicht eingebaut; der Banner-Teil darin ist überholt).

## Dashboard-Ansichten (später)

Jeder Bereich bekommt eigene Ansichten fürs Dashboard. Vorbild ist das iOS-Kontrollzentrum
(`referenz/kontrollzentrum-galerie.png`, `referenz/kontrollzentrum-bearbeiten.png`):

- **Ansichten in festen Rastergrößen**: klein 1×1, breit 2×1, groß 2×2. Das Raster hat 4 Spalten. Ein Bereich kann dieselbe Ansicht in mehreren Größen anbieten.
- **Galerie** „Ansicht hinzufügen“: nach Bereich gruppiert, mit Suche
- **Bearbeiten-Modus**: „−“ entfernt eine Ansicht, der Griff an der Ecke ändert die Größe
- **Seiten**: Das Kontrollzentrum hat mehrere Seiten mit einer Icon-Leiste am Rand. Das würde zu einer Seite pro Bereich passen (noch offen).

Im Code vorbereitet: `ansichten` im Modul-Vertrag der Registry `BEREICHE`. Welche Ansichten ein Bereich bekommt, klären wir, wenn wir den Bereich durchgehen.

## Sammelobjekte

- 18 Rüstungsbesätze + Netheritaufwertung (deutsche Spielnamen, englischer Name daneben), Stand inkl. Fluss/Bolzen aus 1.21
- Gruppiert nach Fundort-Struktur, Karten nach Dimension eingefärbt; Fundort-Hinweis (Truhe, Seltsamer Kies, Tresor, Großer Wächter)
- **Abhaken gilt für die ganze Welt** und merkt sich, wer es wann gefunden hat
- Fortschritt: gefunden / 18, Fundorte bekannt / 13, Prozent
- Verknüpfung zur Karte: pro Fundort die bekannten Strukturen aus der Koordinaten-Sammlung, nächste mit Entfernung; „Karte“ springt direkt hin

## Banner

- **Baupläne gelten für alle Welten** (ein Banner hängt nicht am Seed), alle im Raum sehen und bearbeiten dieselben
- **Liste** als Raster mit Vorschau; Suche nach Name oder Musternamen
- **Detail**: Material (Wolle, Stock, Farbstoffe gezählt), nötige Bannervorlagen mit Herkunft, **Anleitung Schritt für Schritt** – jeder Schritt zeigt, wie das Banner danach aussieht; abhaken (nur auf diesem Gerät, wird zurückgesetzt, wenn sich das Muster ändert)
- **Editor**: Grundfarbe (16), bis zu 6 Ebenen; pro Ebene Farbe + Muster aus einem Raster mit Vorschaubildern (wie am Webstuhl), Ebenen verschieben/entfernen; Vorschau bleibt oben stehen
- Alle 42 Muster mit **deutschen Spielnamen**, englischer Name klein daneben; 10 davon brauchen eine Bannervorlage (Java seit 1.21.2 wie Bedrock)
- Löschen mit zweitem Tippen („Wirklich löschen?“), weil ein Bauplan für alle weg ist
- Vorschau ist vereinfacht (Pixel-Masken, keine Original-Texturen)

## Regeln (Server muss sie genauso prüfen – siehe `instanzPruefen()`)

1. „Eigene Orte“ ist eine zusätzliche Kategorie; dort legt man Typen (Ortsnamen) selbst an.
2. In allen anderen Kategorien entstehen neue Typen nur aus Screenshots (Variante aus dem Popup, z. B. Stronghold → „Stairway“).
3. Biome nur per Screenshot. Das Biom ist der Typ, es muss in der Biom-Liste stehen, die Dimension ergibt sich aus der Liste.
4. Biom-Instanzen sind fest (nur löschen, nicht bearbeiten).
5. Banner (`bannerPruefen()`): Name 1–60 Zeichen, Grundfarbe und Farben aus den 16 Farbstoffen, Muster aus der Musterliste, höchstens 6 Ebenen.

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
| GET | `/sammelobjekte/welten/:id` | – | `{ status:{ [objektId]:{ von, am } } }` |
| PUT | `/sammelobjekte/welten/:id/:objektId` | `{ gefunden }` | `{ status }` |
| GET | `/banner` | – | `{ liste:[banner] }` |
| POST | `/banner` | `{ name, basis, ebenen }` | `{ banner }` – `von`/`am` setzt der Server |
| PUT | `/banner/:id` | `{ name, basis, ebenen }` | `{ banner }` |
| DELETE | `/banner/:id` | – | `{ ok:true }` |

`banner = { id, name, basis, ebenen:[{ muster, farbe }], von, am }` (Farb- und Muster-IDs wie im Spiel, z. B. `light_blue`, `stripe_bottom`)

`typ = { id, kategorie, variante|null }` · `instanz = { id, dimensionId, featureTypeId, x, y|null, z }` · `quelle = "screenshot" | "manuell"`

Die Texterkennung (`/orte/auslesen`) gibt es schon im Koordinaten-Board (`server/src/erkennung.js`) – sie muss nur auf dieses Antwortformat umgestellt und um die Biom-Liste erweitert werden.

## Einbau ins Modul Karte (modul-a-live-karte.html)

- CSS-Abschnitt „KARTE · KOORDINATEN-SAMMLUNG“ übernehmen (Basis ist identisch)
- Die Liste wird ein zweiter Bereich neben dem Karten-Canvas (Umschalter Karte | Liste)
- Marker und Biom-Flächen werden in den bestehenden Renderer der Live-Karte gezeichnet,
  statt im eigenen Canvas – Spieler-Positionen und Sammlung auf einer Karte
- JS-Abschnitte 2–9 übernehmen; `api()`, `esc()`, `THEMES` gibt es dort schon
- Sidebar der Hauptdatei auf `BEREICHE` umstellen (Karte, Sammelobjekte, Portal-Verwaltung, Handbuch, Baupläne, Banner, Rüstung)

## Offen

- Datenhaltung: Companion-Server (Hetzner) oder Board im Heimnetz
- Beispiel-Screenshot vom Biom-Popup, um die Erkennung darauf abzustimmen
- Dashboard-Ansichten pro Bereich (siehe oben): Seiten pro Bereich? Wo bearbeitet man – Handy oder Anzeige?
- Inhalte der geplanten Bereiche (werden einzeln durchgegangen)
