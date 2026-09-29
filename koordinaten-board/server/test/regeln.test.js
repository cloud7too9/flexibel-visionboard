import { test } from 'node:test';
import assert from 'node:assert/strict';
import { regeln } from '../src/regeln.js';

test('Regeln der Companion werden geladen', () => {
  assert.equal(regeln.WELTGRENZE, 30_000_000);
  assert.deepEqual([...regeln.DIM_ORDER], ['overworld', 'nether', 'end']);
  assert.equal(regeln.SAMMELOBJEKTE.length, 19);
  assert.ok(regeln.FEATURE_KATEGORIEN.nether.includes('Bastion'));
});

test('Karte: dieselben Regeln wie in der Companion', () => {
  const ort = { x: 1, y: null, z: 2, kategorie: 'Stronghold', variante: 'Stairway', quelle: 'screenshot' };
  assert.equal(regeln.instanzPruefen(ort, 'overworld', false), null);
  assert.equal(regeln.instanzPruefen({ ...ort, quelle: 'manuell' }, 'overworld', false), 'Neue Varianten entstehen nur aus Screenshots');
  assert.equal(regeln.instanzPruefen({ ...ort, x: 1.5 }, 'overworld', true), 'Ungültige Koordinaten');
  assert.equal(regeln.instanzPruefen({ ...ort, kategorie: 'Bastion' }, 'overworld', true), '„Bastion“ gibt es in der Oberwelt nicht');
  const biom = { x: 0, y: null, z: 0, kategorie: 'Biomes', variante: 'Soul Sand Valley', quelle: 'screenshot' };
  assert.equal(regeln.instanzPruefen(biom, 'overworld', false), 'Soul Sand Valley liegt im Nether');
  assert.equal(regeln.instanzPruefen({ ...biom, quelle: 'manuell' }, 'nether', false), 'Biome können nur per Screenshot hinzugefügt werden');
  assert.equal(regeln.instanzPruefen({ x: 0, y: 64, z: 0, kategorie: 'Eigene Orte', variante: ' ', quelle: 'manuell' }, 'overworld', false), 'Eigene Orte brauchen einen Namen');
});

test('Banner und Portale: dieselben Regeln wie in der Companion', () => {
  assert.equal(regeln.bannerPruefen({ name: 'Wappen', basis: 'white', ebenen: [{ muster: 'cross', farbe: 'red' }] }), null);
  assert.equal(regeln.bannerPruefen({ name: 'x', basis: 'lila', ebenen: [] }), 'Unbekannte Grundfarbe');
  assert.match(regeln.bannerPruefen({ name: 'x', basis: 'white', ebenen: Array(7).fill({ muster: 'cross', farbe: 'red' }) }), /höchstens 6/);
  const v = { name: 'Basis', oberwelt: { x: 212, y: 71, z: -388 }, nether: { x: 26, y: 71, z: -49 } };
  assert.equal(regeln.verbindungRegelPruefen(v), null);
  assert.equal(regeln.verbindungRegelPruefen({ ...v, nether: { x: 0, y: 300, z: 0 } }), 'Nether: Y muss zwischen 0 und 256 liegen');
  assert.deepEqual(JSON.parse(JSON.stringify(regeln.verbindungSauber({ ...v, name: ' Basis ', extra: 1 }))), v);
});
