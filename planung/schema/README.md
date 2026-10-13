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
- Welt: Weltname, Seed (Text, nur Ziffern und Minus), Spawnpunkt (ganz oder gar nicht), bekannte Chunks je Dimension. Name, Spawn und Chunks kommen mit dem `.mcworld`-Import.
- Ein neuer Import **ersetzt die Biom-Kacheln**, **ergänzt Dörfer und Strukturen**.
- **Dörfer** beziehen sich auf die Glocke. Mehrere Glocken in einem Dorf ergeben ein großes Dorf; die **Mitte ist der Durchschnitt der Glocken** (Sicht `doerfer_mitte`). Wachsen Dörfer zusammen, werden die Glocken umgehängt; das leere Dorf löscht ein Trigger. Die Dorfart kommt später aus dem Biom an der Mitte.
- **Feste Strukturbereiche** (Netherfestung, Hexenhütte, Ozeanmonument, Plünderer-Außenposten): gespeichert wird der zusammengefasste Bereich, die **eine Koordinate** (Mitte) rechnet SQLite selbst. Ein neuer Bereich derselben Art, der einen bestehenden berührt, erweitert ihn.
- Biom-Kacheln als BLOB (32 × 32 Chunks, 2048 Byte), Base64 nur für den Transport.

### Portale
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

## Offen

- **Noch nicht im Schema:** Orte (Typen und Instanzen), Sammel-Status je Welt, Profile, Anzeigen mit ihren Layouts (`anzeige_geraete.anzeige_id` verweist noch auf nichts).
- **Biom-Stammdaten** aus `companion/biom-ids.js` erzeugen (Tabelle `biome` ist leer).
- **Import-Infos**: Spielversion, Importzeitpunkt und unbekannte Biom-IDs (Regel 8 im Biom-Plan) sind im Schema weggefallen. Zurück an die Welt oder bewusst weglassen?
- **An der Fixture-Welt bestätigen:** Inhalt des Schlüssels `portals`, Typnummern in Chunk-Tag 0x39 (`strukturarten.bedrock_typ`: 1, 2, 3, 5), Glocken in den `VILLAGE_…_POI`-Einträgen.
- **App angleichen** (`companion/regeln.js`):
  - `bannerPruefen` lässt heute **0 Ebenen** durch; es fehlt „mindestens ein Muster“.
  - `ruestungPruefen`/`ruestungSauber` speichern noch eine **Lederfarbe**, die es laut Max nicht braucht.
- `rolle` der Benutzer steht im Bauplan Offline-Sync, aber nicht im Schema.
