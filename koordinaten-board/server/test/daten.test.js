import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
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
  wirft(() => d.instanzAnlegen({ dimensionId: 'd_w_1_nether', kategorie: 'Biomes', variante: 'Soul Sand Valley', x: 0, y: null, z: 0, quelle: 'screenshot' }, 'Max'),
    422, 'Biome kommen nur aus dem Welt-Import');
  assert.equal(d.instanzAnheften(instanz.id, { angeheftet: true }).instanz.angeheftet, true);
  d.instanzLoeschen(instanz.id);
  wirft(() => d.instanzLoeschen(instanz.id), 404);
});

test('Welt-Import: je Welt eine Datei, ein neuer Import ersetzt den alten', async () => {
  const o = ordner();
  const d = new Daten(o);
  d.weltAnlegen({ seed: '42' });
  d.weltAnlegen({ seed: '7' });
  const daten = Buffer.alloc(2048, 1).toString('base64');
  const body = { import: { seed: '42', weltname: 'Realm', dateiname: 'Archiv.zip', chunks: { overworld: 2 } },
    kacheln: [{ dim: 'overworld', kx: 0, kz: 0, daten }, { dim: 'end', kx: 3, kz: -4, daten }] };
  assert.deepEqual(await d.biomeLesen('w_1'), { import: null, kacheln: [] });
  const { import: imp } = await d.biomeSetzen('w_1', body, 'Max');
  assert.deepEqual([imp.weltId, imp.von, imp.weltname, imp.chunks.end, typeof imp.importiertAm], ['w_1', 'Max', 'Realm', 0, 'string']);
  assert.ok(existsSync(path.join(o, 'biome', 'w_1.json')));
  assert.equal(JSON.parse(readFileSync(path.join(o, 'biome', 'w_1.json'), 'utf8')).kacheln.length, 2);
  await assert.rejects(d.biomeSetzen('w_2', body, 'Max'), (f) => f.status === 422 && f.message === 'Diese Welt hat einen anderen Seed');
  await assert.rejects(d.biomeSetzen('w_9', body, 'Max'), (f) => f.status === 404);
  await assert.rejects(d.biomeLesen('w_9'), (f) => f.status === 404);

  await d.biomeSetzen('w_1', { ...body, kacheln: body.kacheln.slice(1) }, 'Lena');
  await d.speichern();
  const nachNeustart = new Daten(o);
  await nachNeustart.laden();
  const neu = await nachNeustart.biomeLesen('w_1');
  assert.deepEqual([neu.import.von, neu.kacheln.map((k) => k.dim)], ['Lena', ['end']]);
  assert.equal((await d.biomeLesen('w_2')).import, null, 'andere Welt bleibt leer');
  await d.biomeLoeschen('w_1');
  assert.deepEqual(await d.biomeLesen('w_1'), { import: null, kacheln: [] });
  await d.biomeLoeschen('w_1');   // zweimal ist kein Fehler
  rmSync(o, { recursive: true, force: true });
});

test('Alte Biom-Punkte aus Screenshots werden beim Laden entfernt, vorher gesichert', async () => {
  const o = ordner();
  const alt = {
    zaehler: 5, welten: [{ id: 'w_1', seed: '1' }],
    typen: [{ id: 't_2', kategorie: 'Biomes', variante: 'Cherry Grove' }, { id: 't_3', kategorie: 'Village', variante: null }],
    instanzen: [
      { id: 'i_4', dimensionId: 'd_w_1_overworld', featureTypeId: 't_2', x: 0, y: null, z: 0 },
      { id: 'i_5', dimensionId: 'd_w_1_overworld', featureTypeId: 't_3', x: 10, y: null, z: 10 },
    ],
  };
  writeFileSync(path.join(o, 'daten.json'), JSON.stringify(alt));
  const d = new Daten(o);
  await d.laden();
  assert.deepEqual(d.inhalt.instanzen.map((i) => i.id), ['i_5']);
  assert.deepEqual(d.inhalt.typen.map((t) => t.id), ['t_3']);
  assert.deepEqual(JSON.parse(readFileSync(path.join(o, 'daten.vor-welt-import.json'), 'utf8')), alt);
  assert.deepEqual(JSON.parse(readFileSync(path.join(o, 'daten.json'), 'utf8')).instanzen.map((i) => i.id), ['i_5']);
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
  assert.equal(neu.anzeigenListe()[0].id, 'a_2');   // „Board“ beim ersten Laden
  assert.equal(neu.neueId('x'), 'x_3');   // Zähler läuft weiter
  rmSync(o, { recursive: true, force: true });
});

test('Anzeigen: „Board“ beim ersten Start, Schlüssel prüfen und neu erzeugen', async () => {
  const o = ordner();
  const d = new Daten(o);
  await d.laden();
  const [board] = d.anzeigenListe();
  assert.equal(board.name, 'Board');
  assert.match(board.schluessel, /^[\w-]{24}$/);
  assert.equal(d.anzeigeMitSchluessel(board.id, board.schluessel)?.id, board.id);
  assert.equal(d.anzeigeMitSchluessel(board.id, 'falsch'), null);
  assert.equal(d.anzeigeMitSchluessel('a_99', board.schluessel), null);
  assert.equal(d.anzeigeMitSchluessel(board.id, undefined), null);
  const neu = d.anzeigeSchluesselNeu(board.id);
  assert.equal(d.anzeigeMitSchluessel(board.id, board.schluessel), null, 'alter Schlüssel gilt nicht mehr');
  assert.equal(d.anzeigeMitSchluessel(board.id, neu.schluessel)?.id, board.id);
  const tablet = d.anzeigeAnlegen({ name: 'Tablet' });
  assert.notEqual(tablet.schluessel, neu.schluessel);
  assert.equal(d.anzeigeUmbenennen(tablet.id, { name: '  TV ' }).name, 'TV');
  wirft(() => d.anzeigeAnlegen({ name: '' }), 400);
  await d.speichern();
  const nachNeustart = new Daten(o);
  await nachNeustart.laden();
  assert.deepEqual(nachNeustart.anzeigenListe().map((a) => a.name), ['Board', 'TV'], 'kein zweites „Board“ nach dem Neustart');
  rmSync(o, { recursive: true, force: true });
});

test('Widget-Layout je Anzeige: Form wird geprüft, Reihen meldet die Anzeige', () => {
  const d = new Daten(ordner());
  const a = d.anzeigeLokal();
  assert.equal(a.name, 'Board');
  assert.deepEqual(d.anzeigeLayout(a.id), { anzeige: { id: a.id, name: 'Board' }, reihen: null, layout: null, vollbild: null });

  const layout = { aktiverLayer: 'l2', layer: [
    { id: 'l1', name: ' Start ', instanzen: [{ id: 'w1', typ: 'portale.verbindungen', stufe: 'groß', x: 12, y: 0 }] },
    { id: 'l2', name: 'Sammeln', instanzen: [{ id: 'w2', typ: 'banner.banner', stufe: 'standard', x: 0, y: 3, quelle: 'b_1', extra: 1 }] },
  ] };
  const r = d.anzeigeLayoutSetzen(a.id, layout);
  assert.equal(r.layout.aktiverLayer, 'l2');
  assert.equal(r.layout.layer[0].name, 'Start');
  assert.deepEqual(r.layout.layer[1].instanzen[0], { id: 'w2', typ: 'banner.banner', stufe: 'standard', x: 0, y: 3, quelle: 'b_1' });
  assert.equal(d.anzeigeLayoutSetzen(a.id, { ...layout, aktiverLayer: 'weg' }).layout.aktiverLayer, 'l1', 'unbekannter Layer → erster');

  const mit = (instanz) => ({ layer: [{ id: 'l1', name: 'Start', instanzen: [instanz] }] });
  const w = { id: 'w1', typ: 'portale.verbindungen', stufe: 'standard', x: 0, y: 0 };
  wirft(() => d.anzeigeLayoutSetzen(a.id, {}), 422, 'Layer fehlen');
  wirft(() => d.anzeigeLayoutSetzen(a.id, { layer: [] }), 422, '1 bis 12 Layer');
  wirft(() => d.anzeigeLayoutSetzen(a.id, mit({ ...w, typ: 'portale' })), 422, 'Unbekannter Widget-Typ „portale“');
  wirft(() => d.anzeigeLayoutSetzen(a.id, mit({ ...w, x: 32 })), 422, 'x muss eine ganze Zahl von 0 bis 31 sein');
  wirft(() => d.anzeigeLayoutSetzen(a.id, mit({ ...w, y: 1.5 })), 422);
  wirft(() => d.anzeigeLayoutSetzen(a.id, { layer: [{ id: 'l1', name: 'A', instanzen: [w, w] }] }), 422, 'Widget-IDs doppelt');
  wirft(() => d.anzeigeLayoutSetzen('a_99', layout), 404);

  // Vollbild: nur ein Widget im aktiven Layer, endet, wenn es dort nicht mehr liegt
  d.anzeigeLayoutSetzen(a.id, layout);   // aktiv: l2 mit w2
  assert.equal(d.anzeigeVollbildSetzen(a.id, 'w2').vollbild, 'w2');
  wirft(() => d.anzeigeVollbildSetzen(a.id, 'w1'), 422, 'Dieses Widget liegt nicht im aktiven Layer der Anzeige');
  assert.equal(d.anzeigeLayoutSetzen(a.id, { ...layout, aktiverLayer: 'l1' }).vollbild, null, 'Layer gewechselt → Vollbild endet');
  assert.equal(d.anzeigeVollbildSetzen(a.id, 'w1').vollbild, 'w1');
  assert.equal(d.anzeigeVollbildSetzen(a.id, null).vollbild, null);

  assert.equal(d.anzeigeReihenSetzen(a.id, 18), true);
  assert.equal(d.anzeigeReihenSetzen(a.id, 18), false, 'unverändert');
  wirft(() => d.anzeigeReihenSetzen(a.id, 0), 400);
  const liste = d.anzeigenListe();
  assert.equal(liste[0].reihen, 18);
  assert.equal('layout' in liste[0] || 'vollbild' in liste[0], false, 'Liste ohne Layout');
});

test('Anzeige zeigt die aktive Welt', () => {
  const d = new Daten(ordner());
  d.weltAnlegen({ seed: '1' });
  d.weltAnlegen({ seed: '2' });
  d.instanzAnlegen({ dimensionId: 'd_w_1_nether', kategorie: 'Nether Fortress', variante: null, x: 180, y: 70, z: -95, quelle: 'manuell' }, 'Tim');
  d.instanzAnlegen({ dimensionId: 'd_w_1_overworld', kategorie: 'Eigene Orte', variante: 'Hauptbasis', x: 212, y: 71, z: -388, quelle: 'manuell' }, 'Max');
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
