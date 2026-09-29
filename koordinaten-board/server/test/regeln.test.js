import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

test('Rüstungs-Sets: dieselben Regeln wie in der Companion', () => {
  const helm = { ruestung: 'netherite', muster: 'eye', material: 'amethyst', farbe: null, verzaubert: true };
  const set = { name: 'Amethyst', teile: { helmet: helm, boots: { ruestung: 'leather', farbe: 'red', muster: null, material: 'gold' } } };
  assert.equal(regeln.ruestungPruefen(set), null);
  assert.equal(regeln.ruestungPruefen({ ...set, name: ' ' }), 'Bitte einen Namen eingeben');
  assert.equal(regeln.ruestungPruefen({ name: 'x', teile: {} }), 'Mindestens ein Rüstungsteil auswählen');
  assert.equal(regeln.ruestungPruefen({ name: 'x', teile: { boots: { ruestung: 'turtle' } } }), 'Schildkröte gibt es nur als Schildkrötenpanzer');
  assert.equal(regeln.ruestungPruefen({ name: 'x', teile: { helmet: { ...helm, material: null } } }), 'Helm: Material für den Besatz fehlt');
  assert.equal(regeln.ruestungPruefen({ name: 'x', teile: { helmet: { ...helm, muster: 'netherite' } } }), 'Helm: Unbekannter Rüstungsbesatz');
  assert.equal(regeln.ruestungPruefen({ name: 'x', teile: { helmet: { ruestung: 'leather', farbe: 'lila' } } }), 'Helm: Unbekannte Farbe');
  // Material ohne Besatz und Farbe bei Netherit fallen weg, fehlende Teile werden null
  assert.deepEqual(JSON.parse(JSON.stringify(regeln.ruestungSauber({ ...set, name: ' Amethyst ', extra: 1 }))), {
    name: 'Amethyst',
    teile: {
      helmet: { ruestung: 'netherite', muster: 'eye', material: 'amethyst', farbe: null, verzaubert: true },
      chestplate: null,
      leggings: null,
      boots: { ruestung: 'leather', muster: null, material: null, farbe: 'red', verzaubert: false },
    },
  });
});

test('Rüstung: Namen und IDs passen zum Rüstungs-Baukasten', () => {
  const j = (x) => JSON.parse(JSON.stringify(x));   // Objekte aus dem vm-Kontext haben einen anderen Prototyp
  const manifest = JSON.parse(readFileSync(new URL('../../../companion/ruestungs-baukasten/manifest.json', import.meta.url), 'utf8'));
  assert.deepEqual(j(regeln.RUESTUNGS_TEILE).map((t) => [t.id, t.name]), manifest.teile.map((t) => [t.id, t.name]));
  assert.deepEqual(j(regeln.RUESTUNGEN).map((r) => r.id).sort(), manifest.ruestungen.map((r) => r.id).sort());
  for (const r of manifest.ruestungen) {
    const eigen = regeln.RUESTUNGEN.find((x) => x.id === r.id);
    assert.equal(eigen.name, r.name);
    assert.equal(Boolean(eigen.faerbbar), r.faerbbar);
    assert.deepEqual(j(eigen.teile), Object.fromEntries(Object.entries(r.teile).map(([id, t]) => [id, t.name])));
  }
  assert.deepEqual(j(regeln.BESATZ_MATERIALIEN).map((m) => [m.id, m.name, m.icon]), manifest.materialien.map((m) => [m.id, m.name, m.zutat]));
  // Besatz-Muster = Sammelobjekte (ohne Netheritaufwertung), mit den Bedrock-Namen
  const besaetze = j(regeln.SAMMELOBJEKTE).filter((o) => !o.aufwertung);
  assert.deepEqual(besaetze.map((o) => [o.id, o.name]).sort(), manifest.muster.map((m) => [m.id, m.name]).sort());
  assert.deepEqual(manifest.farbstoffe.map((f) => f.id).sort(), j(regeln.FARBEN).map((f) => f.id).sort());
});
