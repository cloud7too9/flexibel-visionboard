import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seedMapAuswerten, titelBereinigen, kategorieRaten } from '../src/erkennung.js';

const zeilen = (...texte) => texte.map((text) => ({ text }));

test('Chunkbase-Popup ohne Y (echter OCR-Text)', () => {
  const e = seedMapAuswerten(zeilen(
    'Dimension: | Overworld cs',
    'Features',
    'Stronghold (Stairway) (1)',
    'X:-1,884 Z: -524',
    '[OJ Completed',
  ));
  assert.equal(e.name, 'Stronghold (Stairway)');
  assert.deepEqual([e.x, e.y, e.z], [-1884, null, -524]);
  assert.equal(e.dimension, 'oberwelt');
  assert.equal(e.kategorie, 'struktur');
});

test('Popup mit Y dazwischen, Nether', () => {
  const e = seedMapAuswerten(zeilen('Dimension: Nether', 'Bastion Remnant @', 'X: 312 Y: 64 Z: -1,040'));
  assert.equal(e.name, 'Bastion Remnant');
  assert.deepEqual([e.x, e.y, e.z], [312, 64, -1040]);
  assert.equal(e.dimension, 'nether');
});

test('OCR-Fehler: Z als 2 gelesen, Gedankenstrich statt Minus', () => {
  const e = seedMapAuswerten(zeilen('Village', 'X: —2,304 2: 768'));
  assert.deepEqual([e.x, e.z], [-2304, 768]);
  assert.equal(e.kategorie, 'dorf');
});

test('Achsenbeschriftung der Karte wird nicht als Koordinate erkannt', () => {
  assert.equal(seedMapAuswerten(zeilen('-2,304 X→ -1,792', 'Z↓', '-768')), null);
});

test('Titel-Bereinigung und Kategorien', () => {
  assert.equal(titelBereinigen('Ruined Portal [%'), 'Ruined Portal');
  assert.equal(kategorieRaten('Ruined Portal'), 'portal');
  assert.equal(kategorieRaten('Buried Treasure'), 'ressource');
  assert.equal(kategorieRaten('Treasure'), 'ressource');
  assert.equal(kategorieRaten('Dungeon'), 'farm');
  assert.equal(kategorieRaten('Mineshaft'), 'struktur');
  assert.equal(kategorieRaten('Slime Chunk'), 'farm');
});

test('OCR-Tippfehler im Feature-Namen werden korrigiert, Typ gesetzt', () => {
  const e = seedMapAuswerten(zeilen('Dimension: Overworld', 'Strongho1d (Stairway) (1)', 'X: 10 Z: 20'));
  assert.equal(e.name, 'Stronghold (Stairway)');
  assert.equal(e.typ, 'Stronghold');
  const d = seedMapAuswerten(zeilen('Trial Chamber5', 'X: 1 Z: 2'));
  assert.equal(d.typ, 'Trial Chamber');
  const o = seedMapAuswerten(zeilen('Ocean Ruins', 'X: 1 Z: 2'));
  assert.equal(o.typ, 'Ocean Ruins');
});

test('Nether-Features setzen die Dimension auch ohne Dropdown', () => {
  const e = seedMapAuswerten(zeilen('Nether Fortress', 'X: 100 Z: -50'));
  assert.equal(e.dimension, 'nether');
  assert.equal(e.kategorie, 'struktur');
});

test('Unbekannte Titel bleiben erhalten', () => {
  const e = seedMapAuswerten(zeilen('Savanna', 'X: 5 Z: 6'));
  assert.equal(e.name, 'Savanna');
  assert.equal(e.typ, '');
  assert.equal(e.kategorie, 'sonstiges');
});

test('Aliase landen auf dem Typ aus der Feature-Liste', () => {
  assert.equal(seedMapAuswerten(zeilen('Bastion Remnant', 'X: 1 Z: 2')).typ, 'Bastion');
  assert.equal(seedMapAuswerten(zeilen('Buried Treasure', 'X: 1 Z: 2')).typ, 'Treasure');
  assert.equal(seedMapAuswerten(zeilen('Woodland Mansion', 'X: 1 Z: 2')).name, 'Woodland Mansion');
});
