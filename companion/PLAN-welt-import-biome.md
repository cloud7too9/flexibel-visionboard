# Bauplan: Biome aus `.mcworld` – Bereich Karte

> Für Claude Code · Repo `companion-orte` · Datei `companion-prototyp.html` · Stand 29.09.2026

---

## 0. So arbeitest du diesen Plan ab

1. Lies zuerst `UEBERGABE.md`, dann `README.md`, dann diesen Plan vollständig.
2. Arbeite die Phasen in Kapitel 7 der Reihe nach ab. Jede Phase endet mit Test, README-Notiz und Commit.
3. **Haltepunkte:** Nach Phase 1 und nach Phase 4 stoppst du und zeigst Max das Ergebnis (Zahlen, Vorschaubilder, Screenshots). Weiter erst nach seinem OK.
4. Die Konventionen aus `UEBERGABE.md` gelten weiter:
   - Deutsch in Code, UI-Texten, Kommentaren und Commits (`biomImportPruefen`, `kachelnBauen`).
   - Nach jedem Commit eine Zeile an Max: `Commit erstellt: <Nachricht>`. Git-Hinweise (wann pushen, wann mergen) immer mitliefern.
   - Datenmodell minimal halten, nichts auf Vorrat bauen.
   - Jede Regel steckt in einer Regel-Funktion, die Mock und Server identisch prüfen.
   - Löschen immer mit zweitem Tippen („Wirklich löschen?“).
   - Playwright-Screenshots in `tests/bilder/` immer ansehen, nicht nur auf Grün verlassen.
5. Kennzeichnung: **✔** = geprüft, **⚠** = Annahme, die du in Phase 1 an einer echten Welt bestätigst und danach auf ✔ setzt.

---

## 1. Ziel und Entscheidungen

**Ziel:** Max lädt in der Karte eine `.mcworld` hoch. Die App liest daraus zur Laufzeit im Browser die Biome aller erkundeten Chunks und zeigt sie flächig auf der Karte.

Von Max festgelegt:

- Biome kommen **ausschließlich** aus `.mcworld`-Dateien. Keine Screenshots, keine Handeingabe.
- Der Import läuft **zur Laufzeit in der App** (Browser, Web Worker). Kein Rechenschritt auf dem Server, kein Build.
- Unerkundete Fläche bleibt leer.
- Biome sind nicht bearbeitbar.

Nicht Teil dieses Plans:

- Die Feature-Erfassung per Screenshot (Strukturen, Varianten, Eigene Orte) bleibt unverändert.
- Kein Rendern von Blöcken oder Bauten, keine Realms-API, keine Java-Welten.
- Verworfen: Biome per Farberkennung aus Seed-Map-Screenshots.

---

## 2. Geänderte Regeln der Karte

| Nr. | Bisher (`UEBERGABE.md`) | Neu |
|---|---|---|
| 1, 2 | Eigene Orte als Kategorie; neue Varianten nur aus Screenshots | **unverändert** |
| 3 | Biome nur per Screenshot, Biom = Typ | Biome nur per `.mcworld`-Import. Die Kategorie „Biome“ gibt es als FeatureInstance nicht mehr. |
| 4 | Biom-Orte: löschen ja, bearbeiten nein | Nur der ganze Import lässt sich löschen. Einzelne Chunks sind nicht bearbeitbar. |
| 5 | Unbekannte Fläche leer, Kreise um Punkte (`CONFIG.biomRadius`) | Unerkundete Chunks bleiben leer. Darstellung als Chunk-Raster, `biomRadius` entfällt. |
| 6 | – | Der Seed aus `level.dat` muss zum Seed der Welt passen. |
| 7 | – | Ein neuer Import ersetzt den alten vollständig (pro Welt genau ein Import). |
| 8 | – | Unbekannte Biom-IDs werden gespeichert, aber leer dargestellt und in der Prüfliste gemeldet. Sobald die Biom-Liste die ID kennt, erscheinen sie ohne neuen Import. |

---

## 3. Fakten zum Weltformat (nicht neu recherchieren)

### 3.1 Datei

- ✔ `.mcworld` ist ein ZIP mit `level.dat`, `levelname.txt` und `db/` (LevelDB in Mojangs Variante mit zlib bzw. raw deflate).
- ✔ Auf iOS von Hand gezippte Welten haben einen zusätzlichen Ordner. Dateien deshalb per Basisname suchen, nicht per festem Pfad.
- ✔ Java-Welten erkennt man an `region/*.mca`.

### 3.2 Bibliothek `mcbe-leveldb-reader`

- ✔ Version **5.0.1**, MIT, npm. Abhängigkeiten: `@zip.js/zip.js`, `pako`. Der Code stammt aus Mojangs `minecraft-creator-tools` und läuft im Browser.
- ✔ Relevante Exporte (aus den `.d.ts` im Paket):
  - `getLevelDbFilesFromMcworld(blob)` → `File[]`. Sucht `CURRENT` und nimmt `MANIFEST*`, `*.ldb`, `*.log` aus diesem Ordner.
  - `readMcworld(blob)` → `Map<string, LevelKeyValue>` mit allen Schlüsseln.
  - `openLevelDb(files)` → `LevelDb` mit `init()`, `initLazy()`, `parseLdbContent(bytes, kontext, besuch)`, `parseLogContent(bytes, kontext, besuch)`.
  - `LevelKeyValue`: `keyBytes` (Uint8Array), `value` (Uint8Array, Block bereits entpackt), `key` (String, ein Zeichen je Byte).
- ✔ **Speicherfalle:** `getLevelDbFilesFromMcworld` entpackt *alle* DB-Dateien gleichzeitig in den Speicher, `openLevelDb` hält sie danach nochmals als `Uint8Array`. `initLazy()` ändert daran nichts, weil die Dateien vorher schon geladen sind. Für große Realm-Welten auf dem iPhone deshalb der eigene Streaming-Weg aus 6.2.
- ✔ Browser-Bundle mit esbuild (ESM, minifiziert): ca. 210 KB, gzip ca. 88 KB.
- ✔ zip.js startet eigene Worker. Im Import-Worker deshalb `configure({ useWebWorkers: false })` aufrufen, und zwar aus **demselben** Bundle, damit es dieselbe zip.js-Instanz trifft.

### 3.3 Chunk-Schlüssel ✔

```
x   int32 LE   Chunk-X
z   int32 LE   Chunk-Z
dim int32 LE   1 = Nether, 2 = End   (fehlt in der Oberwelt)
tag 1 Byte     0x2B = Data3D
```

- Data3D-Schlüssel sind 9 Byte (Oberwelt) oder 13 Byte (Nether/End) lang und enden auf `0x2B`.
- Plausibilität prüfen, denn Textschlüssel können zufällig 9 oder 13 Byte lang sein und auf `+` (0x2B) enden: `dim ∈ {1, 2}` und `|x|, |z| ≤ 1 875 000`.
- Immer `keyBytes` auswerten, nicht den String.

### 3.4 Data3D (Tag 43 / 0x2B)

- ✔ Byte 0–511: Höhenkarte, 256 × int16 LE.
- ✔ Reihenfolge `z*16 + x`, Wert = erste Luft relativ zu minY (−64), also oberster Block = `−64 + Wert − 1`. Bestätigt an der Fixture-Welt (1.26.51): bei X 0 / Z 0 steht 138 → y 73, Max stand dort auf y 74; über Chunk-Grenzen springt die Höhe mit `z*16 + x` im Mittel 1,35 Blöcke (innen 1,19), mit `x*16 + z` 9,66.
- ✔ Ab Byte 512: Biom-Sektionen zu je 16 × 16 × 16, von unten nach oben. In der Fixture-Welt (1.26.51, Oberwelt) sind es 24 – genau so viele wie nötig (−64 … 319), nicht 25.
- ✔ Aufbau einer Sektion:
  - Kopfbyte `0xFF` → identisch mit der Sektion darunter.
  - sonst `bits = kopf >> 1`.
  - `bits === 0` → es folgt ein int32 LE: die einzige Biom-ID der Sektion.
  - sonst `proWort = Math.floor(32 / bits)`, `woerter = Math.ceil(4096 / proWort)`, dann `woerter` × uint32 LE, danach die Palettenlänge (int32 LE) und die Paletten-IDs (je int32 LE).
  - Index im Würfel (lokal 0–15): `i = (x << 8) | (z << 4) | y`.
  - Palettenindex: `(wort[Math.floor(i / proWort)] >>> ((i % proWort) * bits)) & ((1 << bits) - 1)`.
  - ✔ Index und Bitpackung gegen `PalettedStorage` aus prismarine-chunk geprüft (bits 1–16, auch bei ungerader Pufferadresse).
- ✔ Erste Sektion der Oberwelt liegt bei Y −64 (Sektion −4). ⚠ Nether und End beginnen bei Y 0, kurz bestätigen.
- `value` kann an einer ungeraden Adresse im Puffer liegen. Deshalb mit `DataView` lesen, kein `Uint32Array` direkt auf den Puffer legen.

### 3.5 `level.dat` ✔

8-Byte-Kopf (int32 LE Version, int32 LE Länge), danach NBT in Little Endian. Gebraucht werden:

- `RandomSeed` (Long, vorzeichenbehaftet) → `BigInt`, als Dezimal-String mit dem Welt-Seed vergleichen. Der zweite Demo-Seed ist negativ.
- `LevelName` (String)
- `lastOpenedWithVersion` (Liste aus 5 Int, z. B. `1 26 50 …`) für die Prüfliste

Dafür einen kleinen eigenen NBT-Leser schreiben (nur lesen; alle 13 Tag-Typen überspringen können). Keine weitere Abhängigkeit.

### 3.6 Biom-IDs

- ✔ `minecraft-data` → `data/bedrock/1.20.0/biomes.json` enthält die echten gespeicherten IDs 0–191, z. B. `ocean 0`, `plains 1`, `river 7`, `ice_plains_spikes 140`, `soulsand_valley 178`, `deep_dark 190`, `mangrove_swamp 191`. Das Feld `displayName` entspricht der Chunkbase-Schreibweise („Ice Spikes“, „Badlands“, „Dark Forest“, „Windswept Hills“), dazu gibt es `color`.
- ✔ **Nicht** `bedrock/1.21.60/biomes.json` verwenden. Dort sind die IDs alphabetisch durchnummeriert (`plains 64`) und passen nicht zu den gespeicherten Daten.
- ⚠ Neuere Biome fehlen in 1.20.0: Cherry Grove (vermutlich 192), Pale Garden (vermutlich 193), Dappled Forest (195 laut BedrockMapper), Sulfur Caves (unbekannt). In Phase 1 an der Testwelt bestätigen.
  - ✔ **195 = Dappled Forest**: Fixture-Welt, 24 von 30 Chunks, Spawn X 0 / Z 0 (Herbstwald mit roten und orangen Blättern); Max hat den Namen in Chunkbase bestätigt. Nachgetragen in `tools/biom-ids-bauen.mjs`.
  - ⚠ Cherry Grove, Pale Garden, Sulfur Caves kommen in der Fixture-Welt nicht vor – bleiben offen, bis eine Welt sie enthält (der Import meldet sie als unbekannt).
- Zuordnung zur bestehenden Biom-Liste in STAMMDATEN über den Anzeigenamen. Farbe aus der Biom-Liste, sonst `color` aus minecraft-data.
- Die Tabelle wird einmal per Skript erzeugt und eingecheckt, nicht zur Laufzeit geladen.

---

## 4. Datenmodell

Zwei neue Objekte, zwei neue Felder, sonst nichts.

**Biom-Liste (STAMMDATEN)**, je Eintrag neu:

- `bedrockId` (Zahl)
- `farbe`, falls noch nicht vorhanden

**`WeltImport`**, genau einer pro Welt:

```js
{
  id, weltId,
  dateiname, weltname,
  seed,                          // String, aus RandomSeed
  spielversion,                  // "1.26.50" aus lastOpenedWithVersion
  importiertAm,                  // ISO-Zeit
  chunks: { overworld, nether, end },
  unbekannt: [{ bedrockId, chunks, beispiel: { dim, x, z } }]
}
```

**`BiomKachel`**:

```js
{ weltId, dim, kx, kz, daten }   // daten: Uint16Array(1024), Transport als Base64
```

- 32 × 32 Chunks = 512 × 512 Blöcke. Deckt sich mit dem 512er-Gitter der Karte.
- `kx = Math.floor(cx / 32)`, `lx = cx - kx * 32`, Index `lz * 32 + lx`. **Floor, auch bei negativen Chunks.**
- Wert = `bedrockId + 1`, `0` = unerkundet. Uint16, damit IDs über 254 kein Problem werden.
- Ein Wert pro Chunk: das häufigste Oberflächenbiom seiner 256 Spalten.
- Größe: 2 KB pro Kachel. 4 000 × 4 000 erkundete Blöcke ≈ 64 Kacheln ≈ 128 KB.

**`CONFIG`** neu:

- `kachelChunks: 32`
- `netherBiomY: 64` (Nether hat keine Oberfläche)
- `endBiomY: 64`

**Entfällt:**

- Kategorie `BIOMES` bei Typen und FeatureInstances
- Biom-Einträge im `MOCK`
- `CONFIG.biomRadius` und die Kreis-Zeichnung

---

## 5. API-Vertrag

Als Kommentar in **JS 4 · API + MOCK** eintragen und in `mockApi()` umsetzen.

| Methode | Route | Inhalt |
|---|---|---|
| GET | `/welten/:weltId/biome` | `{ import: WeltImport \| null, kacheln: [{ dim, kx, kz, daten }] }` |
| PUT | `/welten/:weltId/biome` | Body `{ import, kacheln }`. Ersetzt Import und alle Kacheln der Welt in einem Schritt. |
| DELETE | `/welten/:weltId/biome` | Löscht Import und Kacheln. |

**Regel-Funktion `biomImportPruefen(body, welt)`** → Fehlertext oder `null`, identisch in Mock und Server:

- Seed im Import = Seed der Welt
- `dim` ∈ `overworld | nether | end`
- `daten` dekodiert genau 2048 Byte
- Kachel-Koordinaten innerhalb von `CONFIG.weltGrenze / 512`
- keine doppelte Kachel (gleiche `dim`, `kx`, `kz`)

**`instanzPruefen()`**: Kategorie Biome immer ablehnen mit „Biome kommen nur aus dem Welt-Import“.

Die Datenablage (Hetzner oder Board) ist noch offen. Der Vertrag funktioniert für beide.

---

## 6. Architektur

### 6.1 Dateien

```
companion-prototyp.html     UI, Regeln, Mock, Kartenebene
biom-dekoder.js             reine Funktionen, genutzt von Worker und Node-Tests
biom-import.worker.js       Web Worker (type: "module")
biom-ids.js                 erzeugte ID-Tabelle (id, name, displayName, color)
vendor/mcbe-leveldb.js      esbuild-Bundle: mcbe-leveldb-reader 5.0.1 + zip.js configure
tools/vendor-bauen.mjs      baut vendor/ neu, Version fest gepinnt
tools/biom-ids-bauen.mjs    erzeugt biom-ids.js aus minecraft-data bedrock/1.20.0
tools/welt-pruefen.mjs      Node-Prüfskript für eine .mcworld
tests/daten/                Test-Welten (siehe Phase 0)
```

**Bewusste Abweichung von „eine Datei“:** Das Bundle ist 210 KB groß, der Dekoder muss in Node testbar sein, und in der echten PWA soll der Service Worker die Dateien einzeln cachen.

Module-Worker laufen nicht unter `file://`. Falls die bestehenden Tests die HTML-Datei per `file://` öffnen, bekommen sie einen kleinen Static-Server (Phase 2).

### 6.2 Importlauf im Worker

```
1  ZIP öffnen (zip.js BlobReader, useWebWorkers: false)
2  level.dat per Basisname finden → Seed, Name, Version        fehlt → Fehler
3  region/*.mca vorhanden → Java-Welt                          → Fehler
4  DB-Dateien auflisten (Ordner von CURRENT, *.ldb, *.log)
5  Jede Datei EINZELN entpacken und parsen, Besucher behält nur Data3D
      .ldb aufsteigend nach Dateinummer, danach .log
      spätere Einträge überschreiben frühere
      Datei-Puffer sofort wieder freigeben
6  Pro Data3D: Oberflächenbiom je Spalte → häufigstes → in Kachel schreiben
7  Unbekannte IDs zählen (gegen die mitgeschickte ID-Liste)
8  Ergebnis mit Transferables zurückschicken
```

Besuch-Objekt für `parseLdbContent` / `parseLogContent` (keine offiziell dokumentierte API; ✔ trägt in 5.0.1 – Streaming und `readMcworld()` liefern an den synthetischen Welten und an der Fixture-Welt identische Kacheln):

```js
const besuch = {
  ordinal: 0,
  visitor: (eintrag) => { /* eintrag.keyBytes, eintrag.value, eintrag.isDeleted */ },
  options: { includeValues: true, includeDeleted: true },   // Löschmarken im .log entfernen den Chunk
  sourceKind: "ldb"            // bei .log-Dateien "log"
};
```

✔ Umgesetzt in `biom-welt.js`. Abweichungen, in Phase 1 gefunden:
- Reihenfolge wie `LevelDb.init()`: `.ldb` nach Level absteigend, dann nach Nummer, laut MANIFEST gelöschte Dateien überspringen; danach `.log` nach Namen.
- Das MANIFEST kommt aus `CURRENT`. Die Bibliothek liest alle MANIFEST-Dateien, und jede setzt den Stand zurück – bei mehreren gewinnt dort die letzte in ZIP-Reihenfolge.
- Eine frisch betretene Welt (Fixture) hat noch keine `.ldb`: alles steht in `000003.log`.

Fallback, falls das nicht trägt: `readMcworld()`. Einfacher, aber speicherhungrig. Beide Wege müssen im Node-Test dasselbe Raster liefern.

**Nachrichten:**

```
→ { typ: "start", datei: File, biomIds: number[] }
← { typ: "fortschritt", phase: "oeffnen" | "lesen" | "berechnen", aktuell, gesamt }
← { typ: "fertig", meta: { weltname, seed, spielversion, chunks, unbekannt },
                   kacheln: [{ dim, kx, kz, daten: ArrayBuffer }] }      // Transferables
← { typ: "fehler", text }
Abbrechen: worker.terminate()
```

### 6.3 `biom-dekoder.js`

| Funktion | Ergebnis |
|---|---|
| `chunkSchluesselLesen(keyBytes)` | `{ cx, cz, dim } \| null` |
| `data3dLesen(value)` | `{ hoehen, sektionen }`, `0xFF`-Sektionen bereits aufgelöst |
| `biomAn(sektion, x, y, z)` | Bedrock-ID |
| `oberflaechenBiom(data3d, x, z, dim)` | Bedrock-ID |
| `chunkBiom(data3d, dim)` | häufigste Bedrock-ID der 256 Spalten |
| `levelDatLesen(bytes)` | `{ seed, weltname, spielversion }` |
| `kachelnBauen(chunks)` | `Map` → Liste von `BiomKachel` |
| `kachelZuBase64` / `kachelAusBase64` | Transport |

Oberflächenbiom als Skizze:

```js
const MIN_Y = { overworld: -64, nether: 0, end: 0 };

function oberflaechenBiom(d, x, z, dim) {
  const y = dim === "overworld"
    ? MIN_Y.overworld + d.hoehen[z * 16 + x] - 1   // ⚠ Reihenfolge und Offset in Phase 1 festlegen
    : dim === "nether" ? CONFIG.netherBiomY : CONFIG.endBiomY;
  const rel = Math.max(0, y - MIN_Y[dim]);
  const sek = d.sektionen[Math.min(rel >> 4, d.sektionen.length - 1)];
  return biomAn(sek, x, rel & 15, z);
}
```

---

## 7. Phasen

### Phase 0 – Vorbereitung (kein Commit)

- `git switch main`, `git pull` (falls ein Remote eingerichtet ist), dann `git switch -c bereich/karte-mcworld`.
- In `companion-prototyp.html` alle betroffenen Stellen sammeln und Max kurz auflisten:
  - `BIOMES`, `biomFinden`, `CONFIG.biomRadius`
  - Biom-Zweige im Screenshot-Import (Prüfliste, `importSpeichern`)
  - Biom-Zweige in `detailOeffnen` (Hinweis „Biome stammen aus Screenshots …“, fehlender Bearbeiten-Knopf)
  - Kreis-Zeichnung in der Canvas-Karte (JS 8)
  - Biom-Einträge im `MOCK`
- Prüfen, wie die bestehenden Tests die HTML-Datei laden (`file://` oder Server).
- Von Max anfordern:
  1. **Fixture-Welt** (darf ins Repo): neue Bedrock-Welt mit Seed `6889192652397090698`, einmal betreten, sofort als `.mcworld` exportieren. Klein und ohne private Bauten. Ablage: `tests/daten/fixture-seed.mcworld`.
  2. **Echte Welt** (bleibt lokal): die Realm-Welt als `.mcworld`. Ablage: `tests/daten/privat/`, Ordner in `.gitignore`.
  3. Eine Stelle, an der Max im Spiel auf dem Boden steht: X/Y/Z aus der Koordinatenanzeige. Dient zur Prüfung der Höhenkarte.
- Unit-Tests mit handgebauten Bytes (Phase 1) können schon vor den Welten beginnen.

### Phase 1 – Dekoder in Node ⏸ Haltepunkt

Aufgaben:

- `tools/vendor-bauen.mjs`: esbuild, `mcbe-leveldb-reader@5.0.1` exakt, Ausgabe `vendor/mcbe-leveldb.js`. Exportiert zusätzlich `configure`, `ZipReader`, `BlobReader` und `Uint8ArrayWriter` aus zip.js (für `level.dat` und das Entpacken einzelner Dateien). ✔ So gebaut lädt das Bundle als ES-Modul, ca. 215 KB.
- `tools/biom-ids-bauen.mjs` → `biom-ids.js` nach 3.6.
- `biom-dekoder.js` nach 3.3–3.5 und 6.3.
- `tools/welt-pruefen.mjs <datei.mcworld>`:
  - gibt Weltname, Seed, Version, Anzahl Data3D je Dimension, die 15 häufigsten Biome und unbekannte IDs aus
  - schreibt je Dimension ein PNG nach `tests/bilder/` (1 Pixel = 1 Chunk)
- Unit-Tests (`node --test`) mit handgebauten Bytes:
  - Schlüssel mit 9 und 13 Byte, Fehlalarme durch Textschlüssel
  - Sektionen mit `bits` 0, 1, 4 und `0xFF`, Palette, ungerade Pufferadresse
  - NBT mit negativem Long-Seed
  - Kachel-Index bei negativen Chunk-Koordinaten
- Vergleichstest: Streaming-Weg und `readMcworld()` liefern identische Kacheln.

Prüfungen an echten Daten:

1. **Höhenkarte:** Am Standort von Max muss die Höhenkarte zur Formel passen. Reihenfolge und Offset festlegen, in 3.4 ⚠ durch ✔ ersetzen.
2. **Stichproben gegen Chunkbase** (Seed `6889192652397090698`, Bedrock 26.50, Biome Height „Surface“): 8 Punkte im erkundeten Gebiet, nicht an Biomgrenzen. Mindestens 7 müssen passen.
3. **Neuere Biom-IDs** bestätigen und in `biom-ids.js` nachtragen.
4. **Laufzeit und Spitzenspeicher** (`process.memoryUsage().rss`) für beide Wege und beide Welten notieren.

An Max: Zahlen, PNGs, Liste der unbekannten IDs.

**Ergebnis Phase 1 (29.09.2026):**
1. ✔ Höhenkarte: `z*16 + x`, erste Luft über −64 (siehe 3.4).
2. ✔ Chunkbase: alle 8 Stichproben passen (Dappled Forest, Stony Shore, Snowy Slopes, Plains, Cold Ocean).
3. ✔ ID 195 = Dappled Forest nachgetragen; Cherry Grove, Pale Garden, Sulfur Caves weiter offen.
4. Laufzeit/Speicher: Fixture-Welt 0,1 s und ~70 MB (beide Wege). Synthetische Welt mit 152 MB: Streaming 134 MB Spitzenspeicher, `readMcworld()` 529 MB, je ~4,5 s. Die Realm-Welt testet Max in Phase 2 am iPhone.

Commit: `Biom-Dekoder für .mcworld mit Prüfskript und Tests`

### Phase 2 – Worker im Browser

- `biom-import.worker.js` nach 6.2 mit dem Nachrichtenprotokoll von dort.
- Fehlertexte, kurz und deutsch:
  - „Keine Bedrock-Welt gefunden“ (kein `CURRENT`)
  - „level.dat fehlt“
  - „Java-Welten werden nicht unterstützt“
  - „Die Datei konnte nicht gelesen werden“ (Details in die Konsole)
- Datei-Auswahl: `<input type="file">` ohne strenges `accept` oder mit `.mcworld,.zip,application/zip,application/octet-stream`. iOS graut unbekannte Endungen sonst aus.
- Falls nötig: Static-Server für die Tests (siehe 6.1).
- Playwright: Worker mit der Fixture-Welt starten, Ergebnis gegen das Node-Ergebnis aus Phase 1 prüfen, Dauer notieren.
- Max testet auf dem iPhone mit der echten Welt: Dauer, Absturz ja oder nein.

Commit: `Welt-Import im Web Worker`

### Phase 3 – Datenmodell, Regeln, Mock

- STAMMDATEN: `bedrockId` und `farbe` je Biom.
- `biomImportPruefen` neu, `instanzPruefen` anpassen (Kapitel 5).
- API-Vertrag in JS 4, Routen in `mockApi()`.
- `MOCK`: Biom-Instanzen entfernen. Demo-Welt `w_1` bekommt Kacheln aus der Fixture-Welt als kleine Base64-Konstante.
- Screenshot-Import: Ein erkannter Biom-Titel wird in der Prüfliste ausgegraut, mit Banner „Biome kommen aus dem Welt-Import“. Biom-Zweige in `detailOeffnen` und beim Bearbeiten entfernen.
- `biomeLaden()` in `weltLaden()` aufrufen.

Commit: `Biom-Raster: Datenmodell, Regeln und Mock`

### Phase 4 – Import-Sheet und Prüfliste ⏸ Haltepunkt

Mobile first, mit den bestehenden Mustern (`sheetOeffnen("weltimport", html, dim)`, `kopfHtml`, `.banner`, `.btn-primary`, `.tool-segment`):

1. **Einstieg:** in der Karte über die Bottombar „Welt importieren“.
2. **Fortschritt:** Phase und Zähler, Knopf „Abbrechen“.
3. **Prüfliste:**
   - Weltname, Spielversion, Seed mit ✔ oder ✘
   - Chunks je Dimension, die fünf häufigsten Biome
   - Vorschaubild je Dimension, umschaltbar wie beim Screenshot-Import
   - unbekannte IDs mit Anzahl und Beispielkoordinate
   - „Ersetzt den Import vom <Datum>“, falls schon einer existiert
   - „Übernehmen“ und „Verwerfen“
4. **Seed passt nicht:** Banner „Diese Welt hat einen anderen Seed“, „Übernehmen“ gesperrt. Angebot „Neue Welt mit diesem Seed anlegen“ über den bestehenden Ablauf „Welt per Seed anlegen“, danach Import in die neue Welt.
5. **Import-Info** in der Karte: „Biome: Stand <Datum> · <n> Chunks“, darunter „Import löschen“ mit zweitem Tippen.

Test `tests/karte-mcworld.test.mjs`:

- Fixture-Welt per `setInputFiles` laden
- Prüfliste prüfen, übernehmen, löschen
- Seed-Fehler: Fixture-Welt in Demo-Welt `w_2` importieren

Commit: `Import-Sheet mit Prüfliste`

### Phase 5 – Biom-Ebene auf der Karte

- Pro Kachel ein Offscreen-Canvas 32 × 32 (`ImageData`, 1 Pixel = 1 Chunk). Farbe aus der Biom-Liste; `0` und unbekannte IDs transparent. Cache neu bauen bei Import und Löschen.
- Zeichnen mit `imageSmoothingEnabled = false`, skaliert auf 512 Blöcke, unter Gitter und Features. Nur sichtbare Kacheln zeichnen.
- Ebene ein- und ausblendbar, Standard an.
- Tippen auf eine Fläche zeigt unten „X · Z · Biomname“, bei leerer Fläche „unerkundet“.
- Die Dimensions-Reiter schalten die Ebene mit.
- Kreis-Zeichnung und `CONFIG.biomRadius` entfernen.

Test: Screenshot mit Demo-Daten, Tipp-Info, Umschalter, Dimensionswechsel.

Commit: `Biom-Ebene auf der Karte`

### Phase 6 – Doku und Übergabe

- **README:** Abschnitt „Welt-Import (Biome)“ mit Anleitung für Max: Realm-Welt herunterladen → lokale Kopie als `.mcworld` exportieren → in der App „Welt importieren“.
- **UEBERGABE.md:**
  - Regeln der Karte nach Kapitel 2 aktualisieren
  - Fakten aus Kapitel 3 übernehmen, nur noch ✔
  - Aufbau-Tabelle um die neuen Dateien ergänzen
- **Integrationsnotiz für `modul-a-live-karte.html`** (pflegt Max selbst):
  - welche Dateien mitkommen
  - Service-Worker-Precache um `biom-dekoder.js`, `biom-ids.js`, `biom-import.worker.js`, `vendor/mcbe-leveldb.js` erweitern
  - API-Routen für den Server, `biomImportPruefen` serverseitig nachbauen

Commit: `Doku und Übergabe für den Welt-Import`

---

## 8. Git-Fahrplan

| Zeitpunkt | Aktion |
|---|---|
| Start | `git switch -c bereich/karte-mcworld` |
| Ende jeder Phase | Commit, danach `git push -u origin bereich/karte-mcworld` als Sicherung (falls Remote vorhanden) |
| Haltepunkte (Phase 1, 4) | nichts mergen, erst Max' OK abwarten |
| Nach Phase 6 und OK | `git switch main && git merge bereich/karte-mcworld && git push`, danach `git branch -d bereich/karte-mcworld` |
| Nie | Dateien aus `tests/daten/privat/` committen |

---

## 9. Risiken

| Risiko | Gegenmaßnahme |
|---|---|
| iPhone-Speicher bei großer Welt | Streaming-Weg, Dateien einzeln. Notfalls Import am Laptop; die Daten landen trotzdem über die API bei allen. |
| `parseLdbContent` mit Besuch ist keine dokumentierte API | Version pinnen, Vergleichstest gegen `readMcworld()` |
| Neue Biom-IDs unbekannt | Rohwert speichern, Prüfliste meldet, Nachtrag ohne neuen Import |
| Höhenkarte falsch gedeutet | Prüfung in Phase 1 an einer echten Stelle |
| iOS graut `.mcworld` im Datei-Dialog aus | lockeres `accept`, am Gerät testen |
| Import veraltet (Realm-Download ist ein Schnappschuss) | Datum überall sichtbar |
| Spielupdate ändert das Format | Spielversion in der Prüfliste; Dekoder-Tests mit Fixture-Welt nach jedem Update laufen lassen |

---

## 10. Nicht bauen ohne Freigabe von Max

- „Nächstes Biom X“ suchen (aus dem Raster)
- Biome hervorheben oder filtern
- Feinere Auflösung als ein Wert pro Chunk
- Nether-Höhe in der UI wählbar
- Automatischer Realm-Download

---

## Quellen

- Minecraft Wiki: „Bedrock Edition level format“ (Schlüssel, Data3D, level.dat)
- `mcbe-leveldb-reader` 5.0.1: github.com/HoloPrint-MC/MCBE-LevelDB-reader und Typdefinitionen im npm-Paket
- `prismarine-chunk` 1.41.0: `src/bedrock/1.18/BiomeSection.js`, `ChunkColumn.js` (`loadBiomes`), `common/PalettedStorage.js` (Sektionsformat, Index, `0xFF`)
- `bedrock-provider` 3.1.0: `js/disk/WorldProvider.js` (Data3D = 512 Byte Höhenkarte + Biome)
- `minecraft-data`: `data/bedrock/1.20.0/biomes.json`
- BedrockMapper PR #10 (Dappled Forest = 195)
