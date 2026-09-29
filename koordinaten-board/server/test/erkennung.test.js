import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seedMapAuswerten, titelBereinigen, kategorieRaten, fuerCompanion } from '../src/erkennung.js';

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

test('Dropdown „The Nether“ / „The End“ setzt die Dimension', () => {
  assert.equal(seedMapAuswerten(zeilen('Dimension: | The Nether ¢', 'Ruined Portal', 'X: -40 Z: 12')).dimension, 'nether');
  assert.equal(seedMapAuswerten(zeilen('Dimension: The End', 'Ruined Portal', 'X: 1 Z: 2')).dimension, 'ende');
  assert.equal(seedMapAuswerten(zeilen('Dimension: Overworld', 'Ruined Portal', 'X: 1 Z: 2')).dimension, 'oberwelt');
});

test('Nether-Features aus der Feature-Liste', () => {
  const f = seedMapAuswerten(zeilen('Nether Fossil', 'X: 1 Z: 2'));
  assert.deepEqual([f.typ, f.kategorie, f.dimension], ['Nether Fossil', 'ressource', 'nether']);
  assert.equal(seedMapAuswerten(zeilen('Fortress', 'X: 1 Z: 2')).typ, 'Nether Fortress');
  const e = seedMapAuswerten(zeilen('End Gateway', 'X: 1 Z: 2'));
  assert.deepEqual([e.typ, e.kategorie, e.dimension], ['End Gateway', 'portal', 'ende']);
});

test('Für die Companion: Kategorie, Variante aus der Klammer, Dimension', () => {
  const alsCompanion = (...texte) => fuerCompanion(seedMapAuswerten(zeilen(...texte)));
  assert.deepEqual(alsCompanion('Dimension: | Overworld cs', 'Stronghold (Stairway) (1)', 'X:-1,884 Z: -524'), {
    titel: 'Stronghold (Stairway)', kategorie: 'Stronghold', variante: 'Stairway', dimension: 'overworld', x: -1884, y: null, z: -524,
  });
  assert.deepEqual(alsCompanion('Dimension: Nether', 'Bastion Remnant @', 'X: 312 Y: 64 Z: -1,040'), {
    titel: 'Bastion Remnant', kategorie: 'Bastion', variante: null, dimension: 'nether', x: 312, y: 64, z: -1040,
  });
  assert.equal(alsCompanion('The End', 'End City', 'X: 1,300 Z: -820').dimension, 'end');
  assert.equal(alsCompanion('Kein Popup', '-2,304 X→ -1,792'), null);
  // Unbekannter Titel bleibt stehen – die Regeln der Companion lehnen ihn dann mit Namen ab
  assert.equal(alsCompanion('Mystery Tower (Blue)', 'X: 1 Z: 2').kategorie, 'Mystery Tower');
});

test('Für die Companion: Biom-Namen werden Biom-Orte', () => {
  const e = fuerCompanion(seedMapAuswerten(zeilen('Soul Sand Valley', 'X: -40 Z: 210')));
  assert.deepEqual(e, { titel: 'Soul Sand Valley', kategorie: 'Biomes', variante: 'Soul Sand Valley', dimension: 'nether', x: -40, y: null, z: 210 });
});
