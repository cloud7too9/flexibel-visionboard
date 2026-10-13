PRAGMA foreign_keys = ON;

-- =====================================================================
-- Benutzer
-- =====================================================================
-- Passwort: erste Anmeldung auf einem Gerät und Zurücksetzen der PIN.
-- PIN: nach jeder Offline-Phase von über 30 Minuten und nach einem PIN-Wechsel.
-- Passwort und PIN nur als scrypt-Hash ('scrypt:<salz>:<hash>', wie pinHashen in identitaet.js).
-- PIN-Format (4–8 Ziffern) und Passwortregeln prüft die App vor dem Hashen.
CREATE TABLE benutzer (
  id            TEXT PRIMARY KEY,              -- Nutzer-ID, UUID v4
  echter_name   TEXT NOT NULL CHECK (length(trim(echter_name)) BETWEEN 1 AND 60),
  anzeigename   TEXT NOT NULL COLLATE NOCASE UNIQUE
                CHECK (length(trim(anzeigename)) BETWEEN 1 AND 24),
  passwort_hash TEXT NOT NULL CHECK (passwort_hash GLOB 'scrypt:?*:?*'),
  pin_hash      TEXT NOT NULL CHECK (pin_hash GLOB 'scrypt:?*:?*'),
  pin_geaendert_am TEXT NOT NULL,               -- setzt das Zurücksetzen; ältere Freigaben verfallen
  am            TEXT NOT NULL                   -- angelegt (ISO-Zeit)
);

-- Geräte: entstehen bei der ersten Anmeldung mit Passwort. Zeiten als ISO-Zeit in UTC.
CREATE TABLE geraete (
  id                TEXT PRIMARY KEY,           -- UUID, steckt im Token des Geräts
  benutzer_id       TEXT NOT NULL REFERENCES benutzer(id) ON DELETE CASCADE,
  freigeschaltet_am TEXT NOT NULL,              -- erste Anmeldung mit Passwort
  letzter_kontakt   TEXT NOT NULL,              -- letzte Anfrage beim Server
  pin_bestaetigt_am TEXT NOT NULL               -- letzte richtige PIN (bzw. Passwort)
);
CREATE INDEX idx_geraete_benutzer ON geraete(benutzer_id);

-- PIN nötig, wenn das Gerät über 30 Minuten keinen Kontakt hatte oder die PIN seitdem
-- zurückgesetzt wurde. Der Server fragt das VOR dem Aktualisieren von letzter_kontakt ab.
CREATE VIEW geraete_status AS
SELECT g.id, g.benutzer_id, g.letzter_kontakt,
       (julianday('now') - julianday(g.letzter_kontakt)) * 1440 > 30
         OR g.pin_bestaetigt_am < b.pin_geaendert_am AS pin_noetig
FROM geraete g JOIN benutzer b ON b.id = g.benutzer_id;


-- =====================================================================
-- Banner
-- =====================================================================

-- ---------- Stammdaten ----------
CREATE TABLE farben (
  id      TEXT PRIMARY KEY,           -- Spiel-ID, z. B. 'light_blue'
  name_de TEXT NOT NULL UNIQUE,       -- 'Hellblau'
  hex     TEXT NOT NULL CHECK (hex GLOB '#[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]'),
  sortierung INTEGER NOT NULL UNIQUE
);

CREATE TABLE muster (
  id      TEXT PRIMARY KEY,           -- Spiel-ID, z. B. 'stripe_bottom'
  name_de TEXT NOT NULL UNIQUE,       -- 'Gefärbter Bannerfuß'
  name_en TEXT NOT NULL,
  sortierung INTEGER NOT NULL UNIQUE
);

-- ---------- Banner-Einträge ----------
CREATE TABLE banner (
  id           TEXT PRIMARY KEY,      -- UUID v4 vom Handy
  name         TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 60),
  basis_farbe  TEXT NOT NULL REFERENCES farben(id),            -- Pflicht
  ersteller_id TEXT REFERENCES benutzer(id) ON DELETE SET NULL,  -- NULL = unbekannt
  von          TEXT NOT NULL DEFAULT '',
  am           TEXT NOT NULL CHECK (am GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')
);

-- Muster-Ebenen 1–{{MAX_EBENEN}}: Ebene 1 Pflicht (prüft die App), 2–{{MAX_EBENEN}} optional
CREATE TABLE banner_ebenen (
  banner_id TEXT    NOT NULL REFERENCES banner(id) ON DELETE CASCADE,
  position  INTEGER NOT NULL CHECK (position BETWEEN 1 AND {{MAX_EBENEN}}),
  muster_id TEXT    NOT NULL REFERENCES muster(id),
  farbe_id  TEXT    NOT NULL REFERENCES farben(id),
  PRIMARY KEY (banner_id, position)
) WITHOUT ROWID;

CREATE INDEX idx_banner_ebenen_muster ON banner_ebenen(muster_id);

-- Keine Lücken: Ebene n nur, wenn Ebene n-1 existiert
CREATE TRIGGER banner_ebenen_keine_luecke
BEFORE INSERT ON banner_ebenen
WHEN NEW.position > 1 AND NOT EXISTS (
  SELECT 1 FROM banner_ebenen WHERE banner_id = NEW.banner_id AND position = NEW.position - 1)
BEGIN
  SELECT RAISE(ABORT, 'Muster-Ebenen müssen lückenlos ab 1 belegt sein');
END;

-- ---------- Seed-Daten ----------
{{farben}}

{{muster}}


-- =====================================================================
-- Rüstungs-Sets
-- =====================================================================

-- ---------- Stammdaten ----------
CREATE TABLE ruestungs_teile (            -- Helm, Harnisch, Beinschutz, Stiefel
  id         TEXT PRIMARY KEY,           -- 'helmet' …
  name_de    TEXT NOT NULL UNIQUE,
  sortierung INTEGER NOT NULL UNIQUE
);

CREATE TABLE ruestungs_arten (            -- Leder … Schildkröte
  id         TEXT PRIMARY KEY,           -- 'leather' …
  name_de    TEXT NOT NULL UNIQUE,
  sortierung INTEGER NOT NULL UNIQUE
);

-- Welche Art gibt es als welches Teil (Schildkröte nur als Helm) + Item-Name im Spiel
CREATE TABLE ruestungs_varianten (
  art_id   TEXT NOT NULL REFERENCES ruestungs_arten(id),
  teil_id  TEXT NOT NULL REFERENCES ruestungs_teile(id),
  item_de  TEXT NOT NULL UNIQUE,         -- 'Kettenhemd-Helm'
  PRIMARY KEY (art_id, teil_id)
) WITHOUT ROWID;

CREATE TABLE besaetze (                   -- Rüstungsbesätze (Schmiedevorlagen)
  id         TEXT PRIMARY KEY,           -- 'sentry' … – gleiche IDs wie Sammelobjekte
  name_de    TEXT NOT NULL UNIQUE,
  name_en    TEXT NOT NULL,
  sortierung INTEGER NOT NULL UNIQUE
);

CREATE TABLE besatz_materialien (
  id         TEXT PRIMARY KEY,           -- 'amethyst' …
  name_de    TEXT NOT NULL UNIQUE,
  zutat_de   TEXT NOT NULL,              -- Item am Schmiedetisch
  hex        TEXT NOT NULL,
  sortierung INTEGER NOT NULL UNIQUE
);

-- ---------- Einträge ----------
CREATE TABLE ruestungs_sets (
  id           TEXT PRIMARY KEY,         -- UUID v4 vom Handy
  name         TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 60),
  ersteller_id TEXT REFERENCES benutzer(id) ON DELETE SET NULL,  -- NULL = unbekannt
  von          TEXT NOT NULL DEFAULT '',
  am           TEXT NOT NULL CHECK (am GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')
);

-- Ein Teil je Slot, alle Slots optional (mind. 1 Teil prüft die App)
CREATE TABLE ruestungs_set_teile (
  set_id      TEXT NOT NULL REFERENCES ruestungs_sets(id) ON DELETE CASCADE,
  teil_id     TEXT NOT NULL REFERENCES ruestungs_teile(id),
  art_id      TEXT NOT NULL,
  besatz_id   TEXT REFERENCES besaetze(id),
  material_id TEXT REFERENCES besatz_materialien(id),
  PRIMARY KEY (set_id, teil_id),
  FOREIGN KEY (art_id, teil_id) REFERENCES ruestungs_varianten(art_id, teil_id),
  CHECK ((besatz_id IS NULL) = (material_id IS NULL))  -- Besatz und Material nur zusammen
) WITHOUT ROWID;

CREATE INDEX idx_set_teile_besatz ON ruestungs_set_teile(besatz_id);

-- ---------- Seed-Daten ----------
{{ruestungs_teile}}

{{ruestungs_arten}}

{{ruestungs_varianten}}

{{besaetze}}

{{besatz_materialien}}


-- =====================================================================
-- Welten und Welt-Import (.mcworld)
-- =====================================================================

-- Stammdaten: Biom-IDs wie in Bedrock gespeichert (Seed-Daten aus companion/biom-ids.js folgen)
CREATE TABLE biome (
  bedrock_id INTEGER PRIMARY KEY,
  name_de    TEXT NOT NULL,
  name_en    TEXT NOT NULL,
  farbe      TEXT NOT NULL
);

-- Stammdaten: Dorfarten (später aus dem Biom an der Glocke abgeleitet)
CREATE TABLE dorfarten (
  id         TEXT PRIMARY KEY,
  name_de    TEXT NOT NULL UNIQUE,
  sortierung INTEGER NOT NULL UNIQUE
);

-- Stammdaten: Strukturarten. kategorie = FeatureCategory der Karte (wie in regeln.js / board-karten.js).
CREATE TABLE strukturarten (
  kategorie TEXT PRIMARY KEY,
  name_de   TEXT NOT NULL UNIQUE,
  dimension TEXT NOT NULL CHECK (dimension IN ('overworld','nether','end'))
);

-- Bedrock-IDs der Strukturen → Strukturart. Quelle ist Chunk-Tag 0x77 (AABBVolumes): je Chunk die
-- ID und die Bereiche ihrer Teile. 0x39 (HardcodedSpawners) schreibt Bedrock 1.26 nicht mehr
-- (geprüft an Max' Welt, 13.10.2026). Mehrere IDs können zu einer Art gehören (Lager).
CREATE TABLE struktur_ids (
  bedrock_id TEXT PRIMARY KEY CHECK (bedrock_id GLOB 'minecraft:?*'),
  kategorie  TEXT NOT NULL REFERENCES strukturarten(kategorie),
  bestaetigt INTEGER NOT NULL DEFAULT 1 CHECK (bestaetigt IN (0, 1))   -- 0 = in keiner Welt gesehen
);

-- ---------- Welt ----------
-- Angelegt per Seed; Name, Spawn und Chunk-Zahlen kommen mit dem .mcworld-Import.
-- Ein neuer Import ersetzt die Biom-Kacheln; Dörfer und Strukturen werden ergänzt.
CREATE TABLE welten (
  id              TEXT PRIMARY KEY,
  weltname        TEXT,
  seed            TEXT NOT NULL CHECK (seed <> '' AND seed NOT GLOB '*[^0-9-]*'),
  spawn_x         INTEGER,
  spawn_y         INTEGER,
  spawn_z         INTEGER,
  chunks_oberwelt INTEGER NOT NULL DEFAULT 0 CHECK (chunks_oberwelt >= 0),
  chunks_nether   INTEGER NOT NULL DEFAULT 0 CHECK (chunks_nether >= 0),
  chunks_end      INTEGER NOT NULL DEFAULT 0 CHECK (chunks_end >= 0),
  -- X und Z nur zusammen. Y darf fehlen: SpawnY = 32767 in level.dat heißt „keine feste Höhe“
  CHECK ((spawn_x IS NULL) = (spawn_z IS NULL) AND (spawn_y IS NULL OR spawn_x IS NOT NULL))
);

-- Bekannte Dörfer: werden bei jedem Import ERGÄNZT. Ein Dorf hat eine oder mehrere Glocken,
-- seine Mitte ist der Durchschnitt der Glocken (Sicht doerfer_mitte).
CREATE TABLE doerfer (
  id          INTEGER PRIMARY KEY,
  welt_id     TEXT NOT NULL REFERENCES welten(id) ON DELETE CASCADE,
  dorfart     TEXT REFERENCES dorfarten(id),  -- erst später befüllt (Biom an der Mitte)
  erstmals_am TEXT NOT NULL,                  -- Import, der das Dorf zuerst gefunden hat
  UNIQUE (id, welt_id)
);

CREATE TABLE dorf_glocken (
  dorf_id INTEGER NOT NULL,
  welt_id TEXT    NOT NULL,
  x INTEGER NOT NULL, y INTEGER NOT NULL, z INTEGER NOT NULL,
  PRIMARY KEY (welt_id, x, y, z),             -- jede Glocke gehört zu genau einem Dorf
  FOREIGN KEY (dorf_id, welt_id) REFERENCES doerfer(id, welt_id) ON DELETE CASCADE
) WITHOUT ROWID;
CREATE INDEX idx_dorf_glocken_dorf ON dorf_glocken(dorf_id);

-- Ein Dorf ohne Glocke verschwindet (z. B. nach dem Zusammenlegen zweier Dörfer)
CREATE TRIGGER dorf_ohne_glocke_loeschen_d AFTER DELETE ON dorf_glocken
BEGIN
  DELETE FROM doerfer WHERE id = OLD.dorf_id
    AND NOT EXISTS (SELECT 1 FROM dorf_glocken WHERE dorf_id = OLD.dorf_id);
END;
CREATE TRIGGER dorf_ohne_glocke_loeschen_u AFTER UPDATE OF dorf_id ON dorf_glocken
BEGIN
  DELETE FROM doerfer WHERE id = OLD.dorf_id
    AND NOT EXISTS (SELECT 1 FROM dorf_glocken WHERE dorf_id = OLD.dorf_id);
END;

CREATE VIEW doerfer_mitte AS
SELECT d.id, d.welt_id, d.dorfart, d.erstmals_am,
       count(*)                     AS glocken,
       CAST(round(avg(g.x)) AS INTEGER) AS x,
       CAST(round(avg(g.y)) AS INTEGER) AS y,
       CAST(round(avg(g.z)) AS INTEGER) AS z
FROM doerfer d JOIN dorf_glocken g ON g.dorf_id = d.id
GROUP BY d.id;

-- Feste Strukturbereiche: werden bei jedem Import ERGÄNZT, nie ersetzt.
-- Gespeichert wird der zusammengefasste Bereich; die eine Koordinate (Mitte) rechnet SQLite selbst.
-- Ein neuer Bereich derselben Art, der einen bestehenden berührt oder überlappt, erweitert diesen.
CREATE TABLE strukturen (
  id        INTEGER PRIMARY KEY,
  welt_id   TEXT    NOT NULL REFERENCES welten(id) ON DELETE CASCADE,
  bedrock_id TEXT   NOT NULL REFERENCES struktur_ids(bedrock_id),
  min_x INTEGER NOT NULL, min_y INTEGER NOT NULL, min_z INTEGER NOT NULL,
  max_x INTEGER NOT NULL, max_y INTEGER NOT NULL, max_z INTEGER NOT NULL,
  x INTEGER GENERATED ALWAYS AS ((min_x + max_x) / 2) STORED,
  y INTEGER GENERATED ALWAYS AS ((min_y + max_y) / 2) STORED,
  z INTEGER GENERATED ALWAYS AS ((min_z + max_z) / 2) STORED,
  erstmals_am TEXT NOT NULL,            -- Import, der die Struktur zuerst gefunden hat
  CHECK (min_x <= max_x AND min_y <= max_y AND min_z <= max_z)
);
CREATE INDEX idx_strukturen_welt ON strukturen(welt_id, bedrock_id);

-- Strukturen mit Art, deutschem Namen und Dimension (für Karte und Sammelobjekte)
CREATE VIEW strukturen_mit_art AS
SELECT s.id, s.welt_id, s.bedrock_id, i.kategorie, a.name_de, a.dimension, s.x, s.y, s.z, s.erstmals_am
FROM strukturen s
JOIN struktur_ids i ON i.bedrock_id = s.bedrock_id
JOIN strukturarten a ON a.kategorie = i.kategorie;

-- Biome: 32×32 Chunks je Kachel, Wert = bedrockId + 1 (0 = unerkundet), Uint16 LE als BLOB
CREATE TABLE biom_kacheln (
  welt_id   TEXT    NOT NULL REFERENCES welten(id) ON DELETE CASCADE,
  dimension TEXT    NOT NULL CHECK (dimension IN ('overworld','nether','end')),
  kx        INTEGER NOT NULL,
  kz        INTEGER NOT NULL,
  daten     BLOB    NOT NULL CHECK (length(daten) = 2048),
  PRIMARY KEY (welt_id, dimension, kx, kz)
) WITHOUT ROWID;

-- ---------- Seed-Daten ----------
INSERT INTO dorfarten (id, name_de, sortierung) VALUES
  ('plains', 'Ebene', 1),
  ('desert', 'Wüste', 2),
  ('savanna', 'Savanne', 3),
  ('taiga', 'Taiga', 4),
  ('snowy', 'Verschneit', 5);

INSERT INTO strukturarten (kategorie, name_de, dimension) VALUES
  ('Nether Fortress', 'Netherfestung',         'nether'),
  ('Witch Hut',       'Hexenhütte',            'overworld'),
  ('Monument',        'Ozeanmonument',         'overworld'),
  ('Outpost',         'Plünderer-Außenposten', 'overworld'),
  ('Trial Chamber',   'Prüfungskammern',       'overworld'),
  ('Desert Temple',   'Wüstentempel',          'overworld'),
  ('Jungle Temple',   'Dschungeltempel',       'overworld'),
  ('Trail Ruins',     'Pfadruinen',            'overworld'),
  ('Igloo',           'Iglu',                  'overworld'),
  ('Camp',            'Lager',                 'overworld');

INSERT INTO struktur_ids (bedrock_id, kategorie, bestaetigt) VALUES
  ('minecraft:fortress',                     'Nether Fortress', 1),
  ('minecraft:swamp_hut',                    'Witch Hut',       0),
  ('minecraft:monument',                     'Monument',        1),
  ('minecraft:pillager_outpost',             'Outpost',         1),
  ('minecraft:trial_chambers',               'Trial Chamber',   1),
  ('minecraft:desert_pyramid',               'Desert Temple',   1),
  ('minecraft:jungle_pyramid',               'Jungle Temple',   1),
  ('minecraft:trail_ruins',                  'Trail Ruins',     1),
  ('minecraft:igloo',                        'Igloo',           1),
  ('minecraft:abandoned_camp_bamboo_jungle', 'Camp',            1),
  ('minecraft:abandoned_camp_birch_forest',  'Camp',            1),
  ('minecraft:abandoned_camp_forest',        'Camp',            1),
  ('minecraft:abandoned_camp_jungle_edge',   'Camp',            1),
  ('minecraft:abandoned_camp_taiga',         'Camp',            1);


-- =====================================================================
-- Portale und Portal-Verbindungen
-- =====================================================================

-- Einzelne Portale je Dimension. Quelle: von Hand (Portal-Verwaltung) oder aus dem .mcworld-Import
-- (Schlüssel `portals`, wird ergänzt). Die Prüf-Logik (±128, nächstes in 3D) bleibt in der App.
CREATE TABLE portale (
  id           INTEGER PRIMARY KEY,
  welt_id      TEXT    NOT NULL REFERENCES welten(id) ON DELETE CASCADE,
  dimension    TEXT    NOT NULL CHECK (dimension IN ('overworld', 'nether')),
  x            INTEGER NOT NULL,
  y            INTEGER,                         -- ohne Y prüft die App nur grob
  z            INTEGER NOT NULL,
  quelle       TEXT    NOT NULL CHECK (quelle IN ('manuell', 'welt-import')),
  ersteller_id TEXT    REFERENCES benutzer(id) ON DELETE SET NULL,  -- NULL = unbekannt
  von          TEXT    NOT NULL DEFAULT '',
  am           TEXT    NOT NULL,
  UNIQUE (welt_id, dimension, x, y, z),
  -- Weltgrenze ±30 Mio. (Nether ÷ 8) und Bauhöhe wie in verbindungRegelPruefen
  CHECK (CASE dimension
    WHEN 'overworld' THEN abs(x) <= 30000000 AND abs(z) <= 30000000 AND (y IS NULL OR y BETWEEN -64 AND 320)
    ELSE                  abs(x) <= 3750000  AND abs(z) <= 3750000  AND (y IS NULL OR y BETWEEN 0 AND 256)
  END)
);
CREATE INDEX idx_portale_suche ON portale(welt_id, dimension, x, z);   -- Suchbereich ±128

-- Verbindung = ein Oberwelt-Portal + ein Nether-Portal mit Namen
CREATE TABLE portal_verbindungen (
  id                 INTEGER PRIMARY KEY,
  welt_id            TEXT    NOT NULL REFERENCES welten(id) ON DELETE CASCADE,
  name               TEXT    NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 60),
  oberwelt_portal_id INTEGER NOT NULL REFERENCES portale(id) ON DELETE CASCADE,
  nether_portal_id   INTEGER NOT NULL REFERENCES portale(id) ON DELETE CASCADE,
  ersteller_id       TEXT    REFERENCES benutzer(id) ON DELETE SET NULL,  -- NULL = unbekannt
  von                TEXT    NOT NULL DEFAULT '',
  am                 TEXT    NOT NULL,
  UNIQUE (oberwelt_portal_id, nether_portal_id)
);

-- Beide Portale müssen zur Welt der Verbindung und zur richtigen Dimension gehören
CREATE TRIGGER portal_verbindung_pruefen_i BEFORE INSERT ON portal_verbindungen
WHEN NOT EXISTS (SELECT 1 FROM portale WHERE id = NEW.oberwelt_portal_id AND welt_id = NEW.welt_id AND dimension = 'overworld')
  OR NOT EXISTS (SELECT 1 FROM portale WHERE id = NEW.nether_portal_id   AND welt_id = NEW.welt_id AND dimension = 'nether')
BEGIN
  SELECT RAISE(ABORT, 'Verbindung braucht ein Oberwelt- und ein Nether-Portal derselben Welt');
END;
CREATE TRIGGER portal_verbindung_pruefen_u BEFORE UPDATE OF welt_id, oberwelt_portal_id, nether_portal_id ON portal_verbindungen
WHEN NOT EXISTS (SELECT 1 FROM portale WHERE id = NEW.oberwelt_portal_id AND welt_id = NEW.welt_id AND dimension = 'overworld')
  OR NOT EXISTS (SELECT 1 FROM portale WHERE id = NEW.nether_portal_id   AND welt_id = NEW.welt_id AND dimension = 'nether')
BEGIN
  SELECT RAISE(ABORT, 'Verbindung braucht ein Oberwelt- und ein Nether-Portal derselben Welt');
END;


-- =====================================================================
-- Dashboard-Zugänge und Anzeige-Geräte (Bauplan Anmeldung und Dashboard-Zugang)
-- =====================================================================

-- Zugang = Zugangs-Code + eigene Dashboard-PIN, erzeugt in der Companion (Dashboard-Bereich).
-- Code: 5 Zeichen ohne die verwechselbaren 0 O 1 l I. Im Klartext, weil die Companion ihn anzeigt.
-- Ein abgelaufener Code schaltet keine neuen Geräte frei; angemeldete Anzeigen laufen weiter.
CREATE TABLE zugaenge (
  id           TEXT PRIMARY KEY,
  code         TEXT NOT NULL UNIQUE
               CHECK (length(code) = 5 AND code NOT GLOB '*[^2-9A-HJ-NP-Za-km-z]*'),
  pin_hash     TEXT NOT NULL CHECK (pin_hash GLOB 'scrypt:?*:?*'),
  erstellt_von TEXT REFERENCES benutzer(id) ON DELETE SET NULL,
  erstellt_am  TEXT NOT NULL,
  gueltig_bis  TEXT,                    -- NULL = dauerhaft
  CHECK (gueltig_bis IS NULL OR gueltig_bis > erstellt_am)
);

-- Anzeige-Geräte (TV, Tablet …): angemeldet mit Code + Dashboard-PIN, merken sich das Layout.
-- Widerrufen des Zugangs meldet alle seine Anzeigen ab.
CREATE TABLE anzeige_geraete (
  id              TEXT PRIMARY KEY,
  zugang_id       TEXT NOT NULL REFERENCES zugaenge(id) ON DELETE CASCADE,
  anzeige_id      TEXT,                 -- gewähltes Layout (Anzeigen/Layouts folgen im Schema)
  letzter_kontakt TEXT NOT NULL
);
CREATE INDEX idx_anzeige_geraete_zugang ON anzeige_geraete(zugang_id);

-- Code noch gültig?
CREATE VIEW zugaenge_status AS
SELECT z.*, (z.gueltig_bis IS NULL OR julianday(z.gueltig_bis) > julianday('now')) AS gueltig
FROM zugaenge z;

-- Dashboard-PIN nötig nach über 15 Minuten ohne Kontakt (vor dem Aktualisieren fragen)
CREATE VIEW anzeige_geraete_status AS
SELECT a.id, a.zugang_id, a.letzter_kontakt,
       (julianday('now') - julianday(a.letzter_kontakt)) * 1440 > 15 AS pin_noetig
FROM anzeige_geraete a;
