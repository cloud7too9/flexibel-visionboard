# Referenzschema der Companion (SQLite)

> Stand 13.10.2026 · erarbeitet im Chat mit Max · gehört zum Projekt „SQL-Schema-Generator“

Das Schema ist das **Zielbild** für eine spätere Umstellung des Board-Servers von `daten.json` auf SQLite. Heute speichert der Server weiter in `daten.json`. Neue Felder dort bekommen aber schon die Namen aus diesem Schema (siehe [`Bauplan-Anmeldung-und-Dashboard-Zugang`](../bauplaene/Bauplan-Anmeldung-und-Dashboard-Zugang.md)), damit die Umstellung später 1:1 geht.

## Dateien

| Datei | Inhalt |
|---|---|
| `schema-vorlage.sql` | Tabellen, Sichten und Trigger. **Hier wird geändert.** Platzhalter wie `{{farben}}` stehen für Stammdaten |
| `schema-bauen.mjs` | baut daraus `companion-schema.sql`; die Stammdaten kommen aus `companion/regeln.js` |
| `companion-schema.sql` | **erzeugt**, nicht von Hand ändern |
| `schema.test.mjs` | prüft, dass die Datei aktuell ist, und jede Regel unten |

```
node planung/schema/schema-bauen.mjs              # neu bauen
node planung/schema/schema-bauen.mjs --pruefen    # veraltet? → Fehler
node --test planung/schema/schema.test.mjs        # Tests (Node 22.5+, node:sqlite)
```

Ändert sich `regeln.js` (neue Farbe, neuer Besatz …), einfach neu bauen.

## Grundsätze

- **IDs wie im Spiel** (`light_blue`, `stripe_bottom`, `sentry`), angezeigte Namen **wie in Bedrock** (deutsche Sprachdatei), aus `regeln.js`.
- **Stammdaten als eigene Tabellen** mit Fremdschlüsseln, damit unbekannte Werte gar nicht erst hineinkommen.
- Was die Datenbank selbst prüfen kann, prüft sie (CHECK, Fremdschlüssel, Trigger). Regeln über mehrere Tabellen am Ende eines Vorgangs (z. B. „mindestens ein Muster“) bleiben in der App bzw. in `regeln.js`.
- **Ersteller** verweisen auf `benutzer`. Wird ein Benutzer gelöscht, bleiben seine Einträge, der Verweis wird leer (= unbekannt), der Name in `von` bleibt stehen.
- Passwort, PIN und Dashboard-PIN nur als scrypt-Hash (`scrypt:<salz>:<hash>`, wie `pinHashen` in `identitaet.js`).

## Entscheidungen je Bereich

### Banner
- Basisfarbe **Pflicht**, dann **Muster 1 Pflicht, 2–6 optional**, jeweils Muster + Farbe.
- Ebenen als eigene Tabelle `banner_ebenen` (Position 1–6), passend zum `ebenen`-Array der App.
- Die Datenbank verhindert Lücken (Ebene 4 nur mit Ebene 3) und mehr als 6 Ebenen. **Mindestens ein Muster** prüft die App.
- 16 Farben, 42 Muster.

### Rüstung
- Ein Set hat die Slots Helm, Harnisch, Beinschutz, Stiefel, **alle optional**. Je Slot: Rüstungsart + Besatz + Material.
- Besatz und Material **nur zusammen**.
- `ruestungs_varianten` legt fest, welche Art es als welches Teil gibt: **Schildkröte nur als Helm**. Dazu der Item-Name wie im Spiel.
- 18 Besätze **inklusive Turmzier**; die Netheritaufwertung ist kein Besatz. 11 Materialien.
- **Keine Lederfarbe** (Max). Die App speichert sie noch, siehe Offen.

### Welt
- Welt: Weltname, Seed (Text, nur Ziffern und Minus – Bedrock-Seeds sind größer als 2^53), Spawnpunkt (X und Z zusammen, Y darf fehlen: `SpawnY = 32767` heißt „keine feste Höhe“), bekannte Chunks je Dimension. Name, Spawn und Chunks kommen mit dem `.mcworld`-Import.
- Ein neuer Import **ersetzt die Biom-Kacheln**, **ergänzt Dörfer und Strukturen**.
- **Dörfer** beziehen sich auf die Glocke. Die Glocken sind Block-Entities `Bell` (Chunk-Tag 0x31); ein Dorf ist ein `VILLAGE_…_INFO`-Eintrag, seine Glocken sind die im Bereich `X0…X1`, `Z0…Z1`. Mehrere Glocken in einem Dorf ergeben ein großes Dorf; die **Mitte ist der Durchschnitt der Glocken** (Sicht `doerfer_mitte`). Wachsen Dörfer zusammen, werden die Glocken umgehängt; das leere Dorf löscht ein Trigger. Die Dorfart kommt später aus dem Biom an der Mitte.
- **Feste Strukturbereiche** kommen aus **Chunk-Tag 0x77** (AABBVolumes) mit ihrer Bedrock-ID. 10 Arten (Max, 13.10.2026): Netherfestung, Hexenhütte, Ozeanmonument, Plünderer-Außenposten und dazu **Prüfungskammern, Wüstentempel, Dschungeltempel, Pfadruinen, Iglu, Lager** – mehrere davon sind Fundorte von Rüstungsbesätzen.
- `struktur_ids` ordnet jede Bedrock-ID einer Art zu (`minecraft:abandoned_camp_taiga` → Lager); `strukturen` speichert die ID, die Sicht `strukturen_mit_art` liefert Art, deutschen Namen und Dimension.
- Gespeichert wird der zusammengefasste Bereich, die **eine Koordinate** (Mitte) rechnet SQLite selbst. Teile derselben ID, die höchstens 96 Blöcke auseinanderliegen, gehören zu einer Struktur; ein neuer Bereich erweitert eine bestehende Struktur.
- Biom-Kacheln als BLOB (32 × 32 Chunks, 2048 Byte), Base64 nur für den Transport.

### Portale
- Aus der Welt kommen die Portale über den Schlüssel `portals` (`data.PortalRecords`: `DimId` 0/1, `TpX/TpY/TpZ`, `Span`, `Xa/Za`).
- **Portal und Verbindung getrennt**: `portale` (Oberwelt oder Nether, Quelle `manuell` oder `welt-import`) und `portal_verbindungen` (Name + ein Oberwelt- + ein Nether-Portal derselben Welt).
- **Wird eines der beiden Portale gelöscht, wird die Verbindung gelöscht.** Wird die Verbindung gelöscht, bleiben die Portale stehen.
- Grenzen wie `verbindungRegelPruefen` (Weltgrenze, Nether ÷ 8, Bauhöhe).

### Benutzer und Geräte
- Benutzer: Nutzer-ID, echter Name, Anzeigename (eindeutig ohne Groß-/Kleinschreibung), Passwort, PIN.
- Passwort für die erste Anmeldung auf einem Gerät und zum Zurücksetzen der PIN.
- PIN nach **über 30 Minuten ohne Kontakt** oder nach einem PIN-Wechsel (Sicht `geraete_status`; der Server fragt sie **vor** dem Aktualisieren von `letzter_kontakt`).

### Dashboard-Zugänge
- Zugangs-Code (5 Zeichen, **ohne `0 O 1 l I`**) + eigene Dashboard-PIN, Gültigkeit Minuten oder dauerhaft (Sicht `zugaenge_status`).
- Anzeige-Geräte merken sich ihr Layout; Dashboard-PIN nach **über 15 Minuten** ohne Kontakt (Sicht `anzeige_geraete_status`). Widerrufen meldet alle Anzeigen des Zugangs ab.

## Geprüft an einer echten Welt

Welt „letztes mal – Kopie“ von Max (Bedrock 1.26.52, Archiv.zip aus der Dateien-App, 13.10.2026), ausgelesen mit [`companion/tools/welt-inhalte.mjs`](../../companion/tools/welt-inhalte.mjs):

| Prüfpunkt | Ergebnis |
|---|---|
| Seed | `6889192652397090698` – größer als 2^53, als Text speichern ✔ |
| Spawn | X 0, Z 0, **Y 32767** = keine feste Höhe → Y darf fehlen |
| Chunks | Oberwelt 13 833, Nether 5 669, End 830 (Data3D) |
| Dörfer | 9 `VILLAGE`-Einträge, 13 Glocken: 7 Dörfer mit 1, **2 Dörfer mit 2 Glocken** ✔, 2 Glocken ohne Dorf-Eintrag. In `…_POI` stehen keine Glocken, nur Betten und Arbeitsplätze |
| Strukturen | **0x39 gibt es nicht mehr**, dafür 0x77: 4 Netherfestungen, 7 Ozeanmonumente, 4 Außenposten, dazu 52 Prüfkammern, 4 Wüsten-, 4 Dschungeltempel, 3 Pfadruinen, 1 Iglu, 8 Lager. Teile derselben Struktur liegen bis zu ~100 Blöcke auseinander → beim Zusammenfassen Abstand bis 96 Blöcke zulassen |
| Portale | 20 Einträge in `portals` (12 Oberwelt, 8 Nether) ✔ |
| Handel | 84 Dorfbewohner, 33 mit `Offers`, 294 Angebote |

## Offen

- **Noch nicht im Schema:** Orte (Typen und Instanzen), Sammel-Status je Welt, Profile, Anzeigen mit ihren Layouts (`anzeige_geraete.anzeige_id` verweist noch auf nichts).
- **Biom-Stammdaten** aus `companion/biom-ids.js` erzeugen (Tabelle `biome` ist leer).
- **Import-Infos**: Spielversion, Importzeitpunkt und unbekannte Biom-IDs (Regel 8 im Biom-Plan) sind im Schema weggefallen. Zurück an die Welt oder bewusst weglassen?
- **Hexenhütte**: Die ID `minecraft:swamp_hut` ist angenommen (`bestaetigt = 0`), Max hat noch keine Welt mit Hexenhütte. Bestätigen, sobald eine da ist.
- **Weitere Lager-Varianten** (z. B. Savanne, Kirschhain) und Strukturen, die in der Welt nicht vorkamen (Festung, Waldanwesen, Antike Stätte, Bastion, Endsiedlung …): IDs ergänzen, wenn eine Welt sie enthält. `welt-inhalte.mjs` listet jede gefundene ID.
- **Portale**: Ausrichtung (`Xa/Za`) und Breite (`Span`) stehen in der Welt, das Schema speichert sie noch nicht.
- **Handelsangebote** haben nur Dorfbewohner, mit denen schon gehandelt wurde (33 von 84 in der Welt). Für die Seed-Listen im Handbuch heißt das: Die Welt liefert nur das, was man im Spiel schon angeschaut hat.
- **App angleichen** (`companion/regeln.js`):
  - `bannerPruefen` lässt heute **0 Ebenen** durch; es fehlt „mindestens ein Muster“.
  - `ruestungPruefen`/`ruestungSauber` speichern noch eine **Lederfarbe**, die es laut Max nicht braucht.
- `rolle` der Benutzer steht im Bauplan Offline-Sync, aber nicht im Schema.
