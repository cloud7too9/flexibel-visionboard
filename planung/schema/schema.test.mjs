// Prüft das Referenzschema: Datei aktuell, alle Regeln aus der Besprechung mit Max (13.10.2026).
// Start: node --test planung/schema/schema.test.mjs   (braucht Node 22.5+ wegen node:sqlite)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { schemaBauen, ZIEL } from './schema-bauen.mjs';

const H = 'scrypt:c2Fseg==:aGFzaA==';   // Platzhalter-Hash im richtigen Format
const vor = (min) => new Date(Date.now() - min * 60000).toISOString();

function neueDb() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(ZIEL, 'utf8'));
  return db;
}
const abgelehnt = (f, muster) => assert.throws(f, muster);
const anzahl = (db, sql, ...p) => db.prepare(sql).get(...p).n;

test('companion-schema.sql ist aus Vorlage und regeln.js gebaut', () => {
  assert.equal(readFileSync(ZIEL, 'utf8'), schemaBauen(), 'veraltet – node planung/schema/schema-bauen.mjs');
});

test('Stammdaten aus regeln.js', () => {
  const db = neueDb();
  assert.equal(anzahl(db, 'SELECT count(*) n FROM farben'), 16);
  assert.equal(anzahl(db, 'SELECT count(*) n FROM muster'), 42);
  assert.equal(anzahl(db, 'SELECT count(*) n FROM besaetze'), 18);           // inkl. Turmzier
  assert.equal(anzahl(db, "SELECT count(*) n FROM besaetze WHERE id = 'spire'"), 1);
  assert.equal(anzahl(db, "SELECT count(*) n FROM besaetze WHERE id = 'netherite'"), 0);
  assert.equal(anzahl(db, 'SELECT count(*) n FROM besatz_materialien'), 11);
  assert.equal(anzahl(db, "SELECT count(*) n FROM ruestungs_varianten WHERE art_id = 'turtle'"), 1);
  assert.equal(db.prepare("SELECT kategorie FROM struktur_ids WHERE bedrock_id = 'minecraft:fortress'").get().kategorie, 'Nether Fortress');
  assert.equal(anzahl(db, 'SELECT count(*) n FROM strukturarten'), 10);
  assert.equal(anzahl(db, "SELECT count(*) n FROM struktur_ids WHERE kategorie = 'Camp'"), 5);
  assert.equal(anzahl(db, 'SELECT count(*) n FROM struktur_ids WHERE bestaetigt = 0'), 1);   // nur die Hexenhütte
});

test('Banner: Basisfarbe Pflicht, Ebenen 1–6 lückenlos, Löschen nimmt Ebenen mit', () => {
  const db = neueDb();
  db.exec(`INSERT INTO banner (id, name, basis_farbe, am) VALUES ('b1', 'Test', 'white', '2026-10-13')`);
  db.exec(`INSERT INTO banner_ebenen VALUES ('b1', 1, 'creeper', 'black'), ('b1', 2, 'border', 'red')`);
  abgelehnt(() => db.exec(`INSERT INTO banner (id, name, am) VALUES ('b2', 'X', '2026-10-13')`), /NOT NULL/);
  abgelehnt(() => db.exec(`INSERT INTO banner_ebenen VALUES ('b1', 4, 'globe', 'blue')`), /lückenlos/);
  abgelehnt(() => db.exec(`INSERT INTO banner_ebenen VALUES ('b1', 7, 'globe', 'blue')`));
  abgelehnt(() => db.exec(`INSERT INTO banner_ebenen VALUES ('b1', 3, 'drache', 'blue')`), /FOREIGN KEY/);
  abgelehnt(() => db.exec(`INSERT INTO banner_ebenen VALUES ('b1', 3, 'globe', 'gold')`), /FOREIGN KEY/);
  db.exec(`DELETE FROM banner WHERE id = 'b1'`);
  assert.equal(anzahl(db, 'SELECT count(*) n FROM banner_ebenen'), 0);
});

test('Rüstung: Schildkröte nur als Helm, Besatz nur mit Material', () => {
  const db = neueDb();
  db.exec(`INSERT INTO ruestungs_sets (id, name, am) VALUES ('s1', 'Set', '2026-10-13')`);
  db.exec(`INSERT INTO ruestungs_set_teile (set_id, teil_id, art_id, besatz_id, material_id)
           VALUES ('s1', 'helmet', 'turtle', 'tide', 'lapis'), ('s1', 'boots', 'iron', NULL, NULL)`);
  abgelehnt(() => db.exec(`INSERT INTO ruestungs_set_teile (set_id, teil_id, art_id) VALUES ('s1', 'leggings', 'turtle')`), /FOREIGN KEY/);
  abgelehnt(() => db.exec(`INSERT INTO ruestungs_set_teile (set_id, teil_id, art_id, besatz_id) VALUES ('s1', 'leggings', 'iron', 'eye')`), /CHECK/);
  abgelehnt(() => db.exec(`INSERT INTO ruestungs_set_teile (set_id, teil_id, art_id) VALUES ('s1', 'helmet', 'iron')`), /UNIQUE/);
});

test('Welt: Seed nur Ziffern, Spawn X/Z nur zusammen, Y darf fehlen', () => {
  const db = neueDb();
  db.exec(`INSERT INTO welten (id, seed) VALUES ('w1', '6889192652397090698')`);   // größer als 2^53 → Text
  assert.equal(db.prepare(`SELECT seed FROM welten`).get().seed, '6889192652397090698');
  abgelehnt(() => db.exec(`INSERT INTO welten (id, seed) VALUES ('w2', '1abc')`), /CHECK/);
  abgelehnt(() => db.exec(`UPDATE welten SET spawn_x = 0 WHERE id = 'w1'`), /CHECK/);
  abgelehnt(() => db.exec(`UPDATE welten SET spawn_y = 70 WHERE id = 'w1'`), /CHECK/);
  db.exec(`UPDATE welten SET spawn_x = 0, spawn_z = 0 WHERE id = 'w1'`);           // SpawnY 32767 → ohne Y
});

test('Dörfer: Mitte = Durchschnitt der Glocken, leeres Dorf verschwindet', () => {
  const db = neueDb();
  db.exec(`INSERT INTO welten (id, seed) VALUES ('w1', '1')`);
  db.exec(`INSERT INTO doerfer (id, welt_id, erstmals_am) VALUES (1, 'w1', '2026-10-01'), (2, 'w1', '2026-10-02')`);
  db.exec(`INSERT INTO dorf_glocken VALUES (1, 'w1', 100, 70, 100), (1, 'w1', 140, 72, 120), (2, 'w1', 300, 64, 100)`);
  assert.deepEqual({ ...db.prepare('SELECT glocken, x, y, z FROM doerfer_mitte WHERE id = 1').get() }, { glocken: 2, x: 120, y: 71, z: 110 });
  db.exec(`UPDATE dorf_glocken SET dorf_id = 1 WHERE dorf_id = 2`);           // zusammengewachsen
  assert.equal(anzahl(db, 'SELECT count(*) n FROM doerfer'), 1);
  abgelehnt(() => db.exec(`INSERT INTO dorf_glocken VALUES (1, 'w1', 100, 70, 100)`), /UNIQUE/);
});

test('Strukturen: Mitte aus dem Bereich, Art über die Bedrock-ID', () => {
  const db = neueDb();
  db.exec(`INSERT INTO welten (id, seed) VALUES ('w1', '1')`);
  db.exec(`INSERT INTO strukturen (welt_id, bedrock_id, min_x, min_y, min_z, max_x, max_y, max_z, erstmals_am)
           VALUES ('w1', 'minecraft:fortress', 100, 48, 100, 220, 75, 200, '2026-10-01'),
                  ('w1', 'minecraft:abandoned_camp_taiga', 805, 70, 900, 817, 75, 912, '2026-10-01')`);
  assert.deepEqual({ ...db.prepare('SELECT x, y, z FROM strukturen WHERE id = 1').get() }, { x: 160, y: 61, z: 150 });
  assert.deepEqual(db.prepare('SELECT name_de, dimension FROM strukturen_mit_art ORDER BY id').all().map((r) => `${r.name_de}/${r.dimension}`),
    ['Netherfestung/nether', 'Lager/overworld']);
  abgelehnt(() => db.exec(`INSERT INTO strukturen (welt_id, bedrock_id, min_x, min_y, min_z, max_x, max_y, max_z, erstmals_am)
           VALUES ('w1', 'minecraft:mansion', 0, 0, 0, 1, 1, 1, 'x')`), /FOREIGN KEY/);
});

test('Portale: Verbindung braucht Oberwelt + Nether derselben Welt, fällt mit dem Portal', () => {
  const db = neueDb();
  db.exec(`INSERT INTO welten (id, seed) VALUES ('w1', '1'), ('w2', '2')`);
  const p = db.prepare(`INSERT INTO portale (welt_id, dimension, x, y, z, quelle, am) VALUES (?, ?, ?, ?, ?, 'manuell', '2026-10-13')`);
  const o = p.run('w1', 'overworld', 296, 70, -424).lastInsertRowid;
  const n = p.run('w1', 'nether', 37, 80, -53).lastInsertRowid;
  const fremd = p.run('w2', 'overworld', 0, 64, 0).lastInsertRowid;
  const v = db.prepare(`INSERT INTO portal_verbindungen (welt_id, name, oberwelt_portal_id, nether_portal_id, am) VALUES ('w1', 'Basis', ?, ?, '2026-10-13')`);
  v.run(o, n);
  abgelehnt(() => v.run(fremd, n), /derselben Welt/);
  abgelehnt(() => p.run('w1', 'nether', 4000000, 70, 0), /CHECK/);
  db.prepare('DELETE FROM portale WHERE id = ?').run(n);
  assert.equal(anzahl(db, 'SELECT count(*) n FROM portal_verbindungen'), 0);
});

test('Benutzer und Geräte: Hashes, eindeutiger Anzeigename, PIN nach 30 Min. oder PIN-Wechsel', () => {
  const db = neueDb();
  const b = db.prepare(`INSERT INTO benutzer (id, echter_name, anzeigename, passwort_hash, pin_hash, pin_geaendert_am, am) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  b.run('u1', 'Max', 'Max', H, H, vor(10000), vor(10000));
  abgelehnt(() => b.run('u2', 'X', 'MAX', H, H, vor(1), vor(1)), /UNIQUE/);
  abgelehnt(() => b.run('u3', 'Y', 'Y', H, '1234', vor(1), vor(1)), /CHECK/);
  const g = db.prepare(`INSERT INTO geraete VALUES (?, 'u1', ?, ?, ?)`);
  g.run('handy', vor(5000), vor(10), vor(10));
  g.run('tablet', vor(5000), vor(45), vor(45));
  const status = () => Object.fromEntries(db.prepare('SELECT id, pin_noetig FROM geraete_status').all().map((r) => [r.id, r.pin_noetig]));
  assert.deepEqual(status(), { handy: 0, tablet: 1 });
  db.prepare(`UPDATE benutzer SET pin_geaendert_am = ?`).run(vor(0));
  assert.deepEqual(status(), { handy: 1, tablet: 1 });
  db.exec(`INSERT INTO banner (id, name, basis_farbe, ersteller_id, am) VALUES ('b1', 'T', 'white', 'u1', '2026-10-13')`);
  db.exec(`DELETE FROM benutzer WHERE id = 'u1'`);
  assert.equal(db.prepare(`SELECT ersteller_id FROM banner`).get().ersteller_id, null);   // Eintrag bleibt
  assert.equal(anzahl(db, 'SELECT count(*) n FROM geraete'), 0);
});

test('Dashboard-Zugänge: Code ohne 0 O 1 l I, Ablauf, Widerruf, 15 Min. offline', () => {
  const db = neueDb();
  const z = db.prepare(`INSERT INTO zugaenge (id, code, pin_hash, erstellt_am, gueltig_bis) VALUES (?, ?, ?, ?, ?)`);
  z.run('z1', 'Kx7Pq', H, vor(30), vor(10));          // 20 Minuten, abgelaufen
  z.run('z2', 'aB3dE', H, vor(30), null);             // dauerhaft
  for (const falsch of ['K0abc', 'KOabc', 'K1abc', 'Klabc', 'KIabc', 'Kx7P', 'Kx7P!']) {
    abgelehnt(() => z.run(`f-${falsch}`, falsch, H, vor(1), null), /CHECK/, falsch);
  }
  abgelehnt(() => z.run('z3', 'Kx7Pq', H, vor(1), null), /UNIQUE/);
  const gueltig = Object.fromEntries(db.prepare('SELECT id, gueltig FROM zugaenge_status').all().map((r) => [r.id, r.gueltig]));
  assert.deepEqual(gueltig, { z1: 0, z2: 1 });
  const a = db.prepare(`INSERT INTO anzeige_geraete (id, zugang_id, letzter_kontakt) VALUES (?, ?, ?)`);
  a.run('tv', 'z2', vor(5));
  a.run('tablet', 'z2', vor(20));
  const pin = Object.fromEntries(db.prepare('SELECT id, pin_noetig FROM anzeige_geraete_status').all().map((r) => [r.id, r.pin_noetig]));
  assert.deepEqual(pin, { tv: 0, tablet: 1 });
  db.exec(`DELETE FROM zugaenge WHERE id = 'z2'`);      // widerrufen
  assert.equal(anzahl(db, 'SELECT count(*) n FROM anzeige_geraete'), 0);
});
