// Companion-API gegen einen echten Server-Prozess (leerer Datenordner, eigener Port)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir, networkInterfaces } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = 3297;
const BASIS = `http://127.0.0.1:${PORT}`;
const ORDNER = mkdtempSync(path.join(tmpdir(), 'kb-api-'));
let server;

async function starten() {
  server = spawn(process.execPath, ['src/server.js'], {
    cwd: path.join(path.dirname(fileURLToPath(import.meta.url)), '..'),
    env: { ...process.env, PORT: String(PORT), DATEN_ORDNER: ORDNER, RAUM_PIN: '4711' },
    stdio: 'ignore',
  });
  for (let i = 0; i < 50; i += 1) {
    try { if ((await fetch(`${BASIS}/api/server`)).ok) return; } catch { /* startet noch */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('Server startet nicht');
}
const beenden = () => new Promise((r) => { server.once('exit', r); server.kill('SIGTERM'); });

before(starten);
after(async () => { await beenden(); rmSync(ORDNER, { recursive: true, force: true }); });

const anfrage = async (methode, pfad, token, body) => {
  const res = await fetch(BASIS + pfad, {
    method: methode,
    headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, daten: await res.json() };
};
const beitreten = async (name) => (await anfrage('POST', '/api/beitreten', null, { pin: '4711', name })).daten.token;

test('ohne Anmeldung kein Zugriff', async () => {
  assert.deepEqual((await anfrage('GET', '/api/server')).daten, { name: 'koordinaten-board' });
  const r = await anfrage('GET', '/api/orte/welten');
  assert.equal(r.status, 401);
  assert.equal(r.daten.message, 'Nicht angemeldet');
});

test('Companion-Vertrag: Welten, Orte, Sammelobjekte, Portale, Banner, Rüstung', async () => {
  const max = await beitreten('Max');
  let r = await anfrage('POST', '/api/orte/welten', max, { seed: '6889192652397090698' });
  assert.equal(r.status, 201);
  const welt = r.daten.welt;
  r = await anfrage('POST', '/api/orte/instanzen', max, { dimensionId: `d_${welt.id}_overworld`, kategorie: 'Village', variante: null, x: 1040, y: 64, z: 310, quelle: 'manuell' });
  assert.equal(r.status, 201);
  const id = r.daten.instanz.id;
  r = await anfrage('POST', '/api/orte/instanzen', max, { dimensionId: `d_${welt.id}_overworld`, kategorie: 'Bastion', x: 1, y: null, z: 1, quelle: 'manuell' });
  assert.deepEqual([r.status, r.daten.message], [422, '„Bastion“ gibt es in der Oberwelt nicht']);
  assert.equal((await anfrage('PATCH', `/api/orte/instanzen/${id}`, max, { x: 1, y: null, z: 2 })).daten.instanz.z, 2);
  assert.equal((await anfrage('GET', `/api/orte/welten/${welt.id}`, max)).daten.instanzen.length, 1);
  // DELETE mit Content-Type, aber ohne Rumpf – so schickt es die Companion
  assert.deepEqual((await anfrage('DELETE', `/api/orte/instanzen/${id}`, max)).daten, { ok: true });

  const lena = await beitreten('Lena');
  assert.equal((await anfrage('PUT', `/api/sammelobjekte/welten/${welt.id}/rib`, lena, { gefunden: true })).daten.status.rib.von, 'Lena');
  r = await anfrage('POST', `/api/portale/welten/${welt.id}`, lena, { name: 'Basis', oberwelt: { x: 212, y: 71, z: -388 }, nether: { x: 26, y: 71, z: -49 } });
  assert.equal(r.status, 201);
  assert.equal((await anfrage('GET', `/api/portale/welten/${welt.id}`, max)).daten.verbindungen[0].von, 'Lena');
  r = await anfrage('POST', '/api/banner', max, { name: 'Wappen', basis: 'white', ebenen: [{ muster: 'cross', farbe: 'red' }] });
  assert.equal(r.status, 201);
  assert.equal((await anfrage('GET', '/api/banner', lena)).daten.liste[0].name, 'Wappen');
  assert.equal((await anfrage('PUT', '/api/banner/b_99', max, { name: 'x', basis: 'white', ebenen: [] })).status, 404);
  r = await anfrage('POST', '/api/ruestung', lena, { name: 'Amethyst', teile: { chestplate: { ruestung: 'diamond', muster: 'silence', material: 'amethyst', verzaubert: true } } });
  assert.equal(r.status, 201);
  const set = r.daten.set;
  assert.equal((await anfrage('GET', '/api/ruestung', max)).daten.sets[0].von, 'Lena');
  r = await anfrage('PUT', `/api/ruestung/${set.id}`, max, { name: 'Amethyst', teile: { helmet: { ruestung: 'turtle' }, boots: { ruestung: 'turtle' } } });
  assert.deepEqual([r.status, r.daten.message], [422, 'Schildkröte gibt es nur als Schildkrötenpanzer']);
  assert.deepEqual((await anfrage('DELETE', `/api/ruestung/${set.id}`, max)).daten, { ok: true });
  assert.equal((await anfrage('GET', '/api/ruestung', max)).daten.sets.length, 0);
  assert.equal((await anfrage('PUT', '/api/board/einstellungen', max, { aktiveWelt: 'w_99' })).status, 404);
});

test('Welt-Import: Biome hochladen (auch über 1 MB), lesen, ersetzen, löschen', async () => {
  const max = await beitreten('Max');
  const welt = (await anfrage('POST', '/api/orte/welten', max, { seed: '-4719278516927443210' })).daten.welt;
  const daten = Buffer.alloc(2048, 7).toString('base64');
  // 600 Kacheln ≈ 1,7 MB – mehr als die Standardgrenze von Fastify (1 MB)
  const kacheln = Array.from({ length: 600 }, (_, n) => ({ dim: 'overworld', kx: (n % 30) - 15, kz: Math.floor(n / 30) - 10, daten }));
  const body = { import: { seed: welt.seed, weltname: 'Realm', dateiname: 'Archiv.zip', spielversion: '1.26.50', chunks: { overworld: 9000 } }, kacheln };
  const lena = await beitreten('Lena');
  const ws = new WebSocket(`ws://127.0.0.1:${PORT}/ws?token=${encodeURIComponent(lena)}`);
  const meldungen = [];
  ws.onmessage = (e) => meldungen.push(JSON.parse(e.data));
  await new Promise((r) => { ws.onopen = r; });

  let r = await anfrage('PUT', `/api/welten/${welt.id}/biome`, max, body);
  assert.equal(r.status, 200, r.daten.message);
  assert.deepEqual([r.daten.import.weltId, r.daten.import.von, r.daten.import.weltname], [welt.id, 'Max', 'Realm']);
  r = await anfrage('GET', `/api/welten/${welt.id}/biome`, lena);
  assert.deepEqual([r.daten.import.dateiname, r.daten.kacheln.length, r.daten.kacheln[0].daten], ['Archiv.zip', 600, daten]);
  for (let i = 0; i < 20 && !meldungen.some((m) => m.bereich === 'biome'); i += 1) await new Promise((ok) => setTimeout(ok, 50));
  assert.deepEqual(meldungen.find((m) => m.bereich === 'biome'), { art: 'geaendert', bereich: 'biome', weltId: welt.id });

  r = await anfrage('PUT', `/api/welten/${welt.id}/biome`, max, { ...body, import: { ...body.import, seed: '1' } });
  assert.deepEqual([r.status, r.daten.message], [422, 'Diese Welt hat einen anderen Seed']);
  assert.equal((await anfrage('PUT', '/api/welten/w_99/biome', max, body)).status, 404);
  assert.equal((await anfrage('GET', `/api/welten/${welt.id}/biome`)).status, 401);
  assert.deepEqual((await anfrage('DELETE', `/api/welten/${welt.id}/biome`, max)).daten, { ok: true });
  assert.deepEqual((await anfrage('GET', `/api/welten/${welt.id}/biome`, max)).daten, { import: null, kacheln: [] });
  ws.close();
});

test('Welt-Import: Worker, Dekoder und Bibliothek werden als JavaScript ausgeliefert', async () => {
  for (const pfad of ['/biom-import.worker.js', '/biom-welt.js', '/biom-dekoder.js', '/biom-ids.js', '/vendor/mcbe-leveldb.js']) {
    const res = await fetch(BASIS + pfad);
    assert.equal(res.status, 200, pfad);
    assert.ok(res.headers.get('content-type').startsWith('application/javascript'), `${pfad}: ${res.headers.get('content-type')}`);
  }
});

// „Von außen“: über eine Netzwerkadresse dieses Rechners statt localhost – dann gilt die Anfrage nicht als lokal
const AUSSEN = Object.values(networkInterfaces()).flat().find((n) => n && n.family === 'IPv4' && !n.internal)?.address;

test('Anzeige-Link: von außen nur mit gültigem Schlüssel, neuer Schlüssel macht den alten ungültig', { skip: !AUSSEN && 'keine Netzwerkadresse' }, async () => {
  const max = await beitreten('Max');
  let r = await anfrage('GET', '/api/anzeigen', max);
  assert.equal(r.daten.anzeigen.length, 1, 'beim ersten Start gibt es die Anzeige „Board“');
  const board = r.daten.anzeigen[0];
  assert.equal(board.name, 'Board');
  assert.equal('schluessel' in board, false, 'Schlüssel nur im Link');
  const link = new URL(board.link);
  assert.equal(link.pathname, '/anzeige');
  const aussen = (pfad, query = '') => fetch(`http://${AUSSEN}:${PORT}${pfad}${query}`);

  // localhost darf immer, von außen nur mit Link
  assert.equal((await fetch(`${BASIS}/api/anzeige`)).status, 200);
  assert.equal((await aussen('/api/anzeige')).status, 403);
  const mitLink = await aussen('/api/anzeige', link.search);
  assert.equal(mitLink.status, 200);
  assert.deepEqual((await mitLink.json()).anzeige, { id: board.id, name: 'Board' });
  assert.equal((await aussen('/api/anzeige', `?anzeige=${board.id}&schluessel=falsch`)).status, 403);

  // WebSocket der Anzeige mit Link: offen, nach „Neuer Schlüssel“ getrennt
  const ws = new WebSocket(`ws://${AUSSEN}:${PORT}/ws${link.search}&rolle=anzeige`);
  const zu = new Promise((ok) => { ws.onclose = (e) => ok(e.code); });
  await new Promise((ok, nein) => { ws.onopen = ok; ws.onerror = nein; });
  const ohne = new WebSocket(`ws://${AUSSEN}:${PORT}/ws?rolle=anzeige`);
  assert.equal(await new Promise((ok) => { ohne.onclose = (e) => ok(e.code); }), 4003);

  r = await anfrage('POST', `/api/anzeigen/${board.id}/schluessel`, max);
  assert.notEqual(r.daten.anzeige.link, board.link);
  assert.equal(await zu, 4003, 'verbundene Anzeige mit altem Schlüssel wird getrennt');
  assert.equal((await aussen('/api/anzeige', link.search)).status, 403, 'alter Schlüssel → 403');
  assert.equal((await aussen('/api/anzeige', new URL(r.daten.anzeige.link).search)).status, 200, 'neuer Schlüssel → erlaubt');

  // Anlegen, umbenennen, QR-Code
  r = await anfrage('POST', '/api/anzeigen', max, { name: ' Tablet ' });
  assert.deepEqual([r.status, r.daten.anzeige.name], [201, 'Tablet']);
  const tablet = r.daten.anzeige;
  assert.equal((await anfrage('POST', '/api/anzeigen', max, { name: ' ' })).status, 400);
  assert.equal((await anfrage('PUT', `/api/anzeigen/${tablet.id}`, max, { name: 'Wohnzimmer-TV' })).daten.anzeige.name, 'Wohnzimmer-TV');
  assert.equal((await anfrage('PUT', '/api/anzeigen/a_99', max, { name: 'x' })).status, 404);
  assert.match((await anfrage('GET', `/api/anzeigen/${tablet.id}/qr`, max)).daten.svg, /^<svg[\s\S]*<\/svg>\s*$/);
  assert.equal((await aussen('/api/anzeige', new URL(tablet.link).search)).status, 200);
  assert.equal((await anfrage('GET', '/api/anzeigen')).status, 401, 'Anzeigen verwalten nur beigetretene Handys');
});

test('Rüstungs-Baukasten wird ausgeliefert (Texturen, Module, Manifest)', async () => {
  const manifest = await (await fetch(`${BASIS}/ruestungs-baukasten/manifest.json`)).json();
  assert.equal(manifest.teile.length, 4);
  for (const [pfad, typ] of [['fertig/items/iron_helmet__amethyst.png', 'image/png'], ['vorlagen/eye_armor_trim_smithing_template.png', 'image/png'],
    ['baukasten.js', 'application/javascript'], ['figur3d.js', 'application/javascript']]) {
    const res = await fetch(`${BASIS}/ruestungs-baukasten/${pfad}`);
    assert.equal(res.status, 200, pfad);
    assert.ok(res.headers.get('content-type').startsWith(typ), `${pfad}: ${res.headers.get('content-type')}`);
  }
});

test('Screenshot auslesen: Banner-Anleitung liefert banner statt Ort', { timeout: 60_000 }, async () => {
  const max = await beitreten('Max');
  const form = new FormData();
  const bild = readFileSync(fileURLToPath(new URL('../../../referenz/banner/rezept-beispiel.jpg', import.meta.url)));
  form.append('datei', new Blob([bild], { type: 'image/jpeg' }), 'rezept.jpg');
  const res = await fetch(`${BASIS}/api/orte/auslesen`, { method: 'POST', headers: { authorization: `Bearer ${max}` }, body: form });
  const d = await res.json();
  assert.equal(res.status, 200);
  assert.equal(d.erkannt, null);
  assert.equal(d.banner.basis, 'black');
  assert.deepEqual(d.banner.ebenen.map((e) => e.muster), ['border', 'rhombus', 'border', 'flower', 'square_top_left', 'square_bottom_right']);
});

test('Änderungen gehen live an alle, Daten überstehen einen Neustart', async () => {
  const max = await beitreten('Max');
  const ws = new WebSocket(`ws://127.0.0.1:${PORT}/ws?token=${encodeURIComponent(max)}`);
  const nachrichten = [];
  ws.onmessage = (e) => nachrichten.push(JSON.parse(e.data));
  await new Promise((r) => { ws.onopen = r; });
  const welt = (await anfrage('POST', '/api/orte/welten', max, { seed: '-42' })).daten.welt;
  await anfrage('PUT', '/api/board/einstellungen', max, { aktiveWelt: welt.id, titel: 'Neustart-Welt' });
  await anfrage('POST', '/api/orte/instanzen', max, { dimensionId: `d_${welt.id}_end`, kategorie: 'End City', x: 1300, y: 60, z: -820, quelle: 'manuell' });
  await new Promise((r) => setTimeout(r, 200));
  ws.close();
  assert.ok(nachrichten.some((n) => n.art === 'geaendert' && n.bereich === 'orte' && n.weltId === welt.id));
  const letzte = nachrichten.filter((n) => n.art === 'zustand').at(-1).zustand;
  assert.deepEqual(letzte.orte.map((o) => [o.name, o.dimension, o.typ]), [['End City', 'ende', 'End City']]);
  assert.equal(letzte.einstellungen.titel, 'Neustart-Welt');

  await beenden();
  await starten();
  const nachher = await anfrage('GET', `/api/orte/welten/${welt.id}`, max);
  assert.equal(nachher.daten.instanzen.length, 1);
  assert.equal((await anfrage('GET', '/api/board/einstellungen', max)).daten.aktiv, welt.id);
});
