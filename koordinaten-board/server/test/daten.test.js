import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Daten, DatenFehler } from '../src/daten.js';
import { anzeigeSicht } from '../src/sicht.js';

const ordner = () => mkdtempSync(path.join(tmpdir(), 'kb-daten-'));
const wirft = (fn, status, text) => assert.throws(fn, (f) => f instanceof DatenFehler && f.status === status && (!text || f.message === text));

test('Welten, Orte, Typen – wie der DEMO-Mock der Companion', () => {
  const d = new Daten(ordner());
  const w = d.weltAnlegen({ seed: ' 6889192652397090698 ' });
  assert.deepEqual(w, { id: 'w_1', seed: '6889192652397090698' });
  wirft(() => d.weltAnlegen({ seed: '6889192652397090698' }), 409);
  wirft(() => d.weltAnlegen({ seed: 'abc' }), 400, 'Seed muss eine Zahl sein');

  const ort = { dimensionId: 'd_w_1_overworld', kategorie: 'Stronghold', variante: 'Stairway', x: -1884, y: null, z: -524, quelle: 'screenshot' };
  const { instanz, typ } = d.instanzAnlegen(ort, 'Max');
  assert.equal(instanz.von, 'Max');
  assert.equal(typ.variante, 'Stairway');
  // gleicher Typ wird wiederverwendet, auch von Hand
  assert.equal(d.instanzAnlegen({ ...ort, x: 5, quelle: 'manuell' }, 'Lena').typ.id, typ.id);
  wirft(() => d.instanzAnlegen({ ...ort, variante: 'Neu', quelle: 'manuell' }, 'Max'), 422, 'Neue Varianten entstehen nur aus Screenshots');
  wirft(() => d.instanzAnlegen({ ...ort, dimensionId: 'd_w_9_overworld' }, 'Max'), 400, 'Dimension unbekannt');

  const gelesen = d.weltLesen('w_1');
  assert.equal(gelesen.dimensionen.length, 3);
  assert.equal(gelesen.instanzen.length, 2);
  assert.deepEqual(d.weltenListe(), [{ id: 'w_1', seed: '6889192652397090698', anzahl: 2 }]);

  assert.equal(d.instanzAendern(instanz.id, { x: 1, y: 40, z: 2 }).instanz.y, 40);
  const biom = d.instanzAnlegen({ dimensionId: 'd_w_1_nether', kategorie: 'Biomes', variante: 'Soul Sand Valley', x: 0, y: null, z: 0, quelle: 'screenshot' }, 'Max');
  wirft(() => d.instanzAendern(biom.instanz.id, { x: 1, y: null, z: 1 }), 403);
  assert.equal(d.instanzAnheften(instanz.id, { angeheftet: true }).instanz.angeheftet, true);
  wirft(() => d.instanzAnheften(biom.instanz.id, { angeheftet: true }), 403);
  d.instanzLoeschen(biom.instanz.id);
  wirft(() => d.instanzLoeschen(biom.instanz.id), 404);
});

test('Sammelobjekte, Portale, Banner', () => {
  const d = new Daten(ordner());
  d.weltAnlegen({ seed: '1' });
  assert.deepEqual(Object.keys(d.sammelSetzen('w_1', 'rib', { gefunden: true }, 'Lena').status), ['rib']);
  assert.equal(d.sammelLesen('w_1').status.rib.von, 'Lena');
  assert.deepEqual(d.sammelSetzen('w_1', 'rib', { gefunden: false }, 'Lena').status, {});
  wirft(() => d.sammelSetzen('w_1', 'gibtsnicht', { gefunden: true }, 'Max'), 404);

  const v = d.portalAnlegen('w_1', { name: ' Basis ', oberwelt: { x: 212, y: 71, z: -388 }, nether: { x: 26, y: 71, z: -49 } }, 'Max');
  assert.equal(v.name, 'Basis');
  assert.equal('weltId' in v, false);
  wirft(() => d.portalAnlegen('w_1', { name: 'x', oberwelt: { x: 1, z: 1 }, nether: { x: 0, y: 300, z: 0 } }, 'Max'), 422);
  assert.equal(d.portaleListe('w_1').length, 1);

  const b = d.bannerAnlegen({ name: 'Wappen', basis: 'white', ebenen: [{ muster: 'cross', farbe: 'red', extra: 1 }] }, 'Max');
  assert.deepEqual(b.ebenen, [{ muster: 'cross', farbe: 'red' }]);
  wirft(() => d.bannerAendern(b.id, { name: 'x', basis: 'lila', ebenen: [] }), 422, 'Unbekannte Grundfarbe');

  const r = d.ruestungAnlegen({ name: 'Amethyst', teile: { helmet: { ruestung: 'iron', muster: 'eye', material: 'amethyst', verzaubert: true } } }, 'Lena');
  assert.deepEqual([r.id.startsWith('r_'), r.von, r.teile.helmet.material, r.teile.boots], [true, 'Lena', 'amethyst', null]);
  wirft(() => d.ruestungAendern(r.id, { name: 'x', teile: { boots: { ruestung: 'turtle' } } }), 422, 'Schildkröte gibt es nur als Schildkrötenpanzer');
  assert.equal(d.ruestungAendern(r.id, { name: 'Neu', teile: { boots: { ruestung: 'gold' } } }).teile.helmet, null);
  assert.equal(d.ruestungListe()[0].name, 'Neu');
  d.ruestungLoeschen(r.id);
  wirft(() => d.ruestungLoeschen(r.id), 404);
});

test('Speichern und Laden', async () => {
  const o = ordner();
  const d = new Daten(o);
  d.weltAnlegen({ seed: '42' });
  d.einstellungenAendern({ titel: 'Server-Welt', aktiveWelt: 'w_1' });
  await d.speichern();
  const neu = new Daten(o);
  await neu.laden();
  assert.equal(neu.inhalt.welten[0].seed, '42');
  assert.equal(neu.einstellungenLesen().titel, 'Server-Welt');
  assert.equal(neu.neueId('x'), 'x_2');   // Zähler läuft weiter
  rmSync(o, { recursive: true, force: true });
});

test('Anzeige zeigt die aktive Welt ohne Biome', () => {
  const d = new Daten(ordner());
  d.weltAnlegen({ seed: '1' });
  d.weltAnlegen({ seed: '2' });
  d.instanzAnlegen({ dimensionId: 'd_w_1_nether', kategorie: 'Nether Fortress', variante: null, x: 180, y: 70, z: -95, quelle: 'manuell' }, 'Tim');
  d.instanzAnlegen({ dimensionId: 'd_w_1_overworld', kategorie: 'Eigene Orte', variante: 'Hauptbasis', x: 212, y: 71, z: -388, quelle: 'manuell' }, 'Max');
  d.instanzAnlegen({ dimensionId: 'd_w_1_overworld', kategorie: 'Biomes', variante: 'Cherry Grove', x: 0, y: null, z: 0, quelle: 'screenshot' }, 'Max');
  d.instanzAnlegen({ dimensionId: 'd_w_2_end', kategorie: 'End City', variante: null, x: 1300, y: 60, z: -820, quelle: 'manuell' }, 'Lena');

  let sicht = anzeigeSicht(d);
  assert.equal(sicht.welt.id, 'w_1');   // ohne Einstellung die erste Welt
  assert.deepEqual(sicht.orte.map((o) => [o.name, o.dimension, o.kategorie, o.typ, o.erstelltVon]), [
    ['Nether Fortress', 'nether', 'struktur', 'Nether Fortress', 'Tim'],
    ['Hauptbasis', 'oberwelt', 'basis', '', 'Max'],
  ]);
  d.einstellungenAendern({ aktiveWelt: 'w_2' });
  sicht = anzeigeSicht(d);
  assert.deepEqual(sicht.orte.map((o) => [o.name, o.dimension]), [['End City', 'ende']]);
  assert.throws(() => d.einstellungenAendern({ aktiveWelt: 'w_9' }), DatenFehler);
});
