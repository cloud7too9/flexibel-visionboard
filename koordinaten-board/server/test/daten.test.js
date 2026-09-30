import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
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
  assert.equal(d.instanzAnheften(instanz.id, { angeheftet: true }).instanz.angeheftet, true);
  wirft(() => d.instanzAnlegen({ dimensionId: 'd_w_1_nether', kategorie: 'Biomes', variante: 'Soul Sand Valley', x: 0, y: null, z: 0, quelle: 'screenshot' }, 'Max'),
    422, 'Biome kommen nur aus dem Welt-Import');
  // Biom-Orte aus der Zeit vor dem Welt-Import: fest, nicht anheftbar, löschbar
  const alt = altesBiom(d, 'd_w_1_nether', 'Soul Sand Valley');
  wirft(() => d.instanzAendern(alt, { x: 1, y: null, z: 1 }), 403, 'Biome kommen nur aus dem Welt-Import');
  wirft(() => d.instanzAnheften(alt, { angeheftet: true }), 403);
  d.instanzLoeschen(alt);
  wirft(() => d.instanzLoeschen(alt), 404);
});

/** Biom-Ort, wie ihn frühere Versionen per Screenshot angelegt haben (heute lehnt instanzPruefen das ab) */
function altesBiom(d, dimensionId, variante) {
  const typ = { id: d.neueId('t'), kategorie: 'Biomes', variante };
  const instanz = { id: d.neueId('i'), dimensionId, featureTypeId: typ.id, x: 0, y: null, z: 0, quelle: 'screenshot', angeheftet: false, von: 'Max', am: '2026-09-01T00:00:00.000Z' };
  d.inhalt.typen.push(typ);
  d.inhalt.instanzen.push(instanz);
  return instanz.id;
}

test('Biome: ein Import je Welt, Kacheln in eigener Datei', async () => {
  const o = ordner();
  const d = new Daten(o);
  d.weltAnlegen({ seed: '6889192652397090698' });
  d.weltAnlegen({ seed: '2' });
  assert.deepEqual(await d.biomeLesen('w_1'), { import: null, kacheln: [] });
  const leerKachel = Buffer.alloc(2048);
  leerKachel.writeUInt16LE(196, 0);   // Chunk 0,0 = Dappled Forest (195 + 1)
  const kacheln = [{ dim: 'overworld', kx: 0, kz: 0, daten: leerKachel.toString('base64') }, { dim: 'overworld', kx: -1, kz: 0, daten: Buffer.alloc(2048).toString('base64') }];
  const body = { import: { seed: '6889192652397090698', weltname: 'Meine Welt (1)', dateiname: 'Meine Welt.mcworld', spielversion: '1.26.51',
    chunks: { overworld: 30, nether: 0, end: 0 }, unbekannt: [] }, kacheln };

  const { import: imp } = await d.biomeSetzen('w_1', body, 'Max');
  assert.deepEqual([imp.weltId, imp.von, imp.seed, imp.chunks.overworld, typeof imp.importiertAm], ['w_1', 'Max', '6889192652397090698', 30, 'string']);
  let gelesen = await d.biomeLesen('w_1');
  assert.deepEqual(gelesen.kacheln, kacheln);
  assert.equal(Buffer.from(gelesen.kacheln[0].daten, 'base64').readUInt16LE(0) - 1, 195);
  // Kacheln stehen nicht in daten.json
  await d.speichern();
  assert.ok(!readFileSync(path.join(o, 'daten.json'), 'utf8').includes(kacheln[0].daten));
  assert.ok(existsSync(path.join(o, 'biome', 'w_1.json')));

  // Neuer Import ersetzt den alten vollständig
  const zweiter = await d.biomeSetzen('w_1', { ...body, kacheln: kacheln.slice(0, 1) }, 'Lena');
  assert.notEqual(zweiter.import.id, imp.id);
  gelesen = await d.biomeLesen('w_1');
  assert.deepEqual([gelesen.import.von, gelesen.kacheln.length], ['Lena', 1]);

  await assert.rejects(async () => d.biomeSetzen('w_2', body, 'Max'), (f) => f instanceof DatenFehler && f.status === 422 && f.message === 'Diese Welt hat einen anderen Seed');
  await assert.rejects(async () => d.biomeLesen('w_9'), (f) => f.status === 404);

  // Übersteht einen Neustart
  await d.speichern();
  const neu = new Daten(o);
  await neu.laden();
  assert.equal((await neu.biomeLesen('w_1')).kacheln.length, 1);
  await neu.biomeLoeschen('w_1');
  assert.deepEqual(await neu.biomeLesen('w_1'), { import: null, kacheln: [] });
  assert.ok(!existsSync(path.join(o, 'biome', 'w_1.json')));
  rmSync(o, { recursive: true, force: true });
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
  altesBiom(d, 'd_w_1_overworld', 'Cherry Grove');
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
